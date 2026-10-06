/**
 * v27.43 제단 서버 처리. 규칙과 숫자는 game/data/altar.ts.
 * 부하 설계
 * - 공용 정보(제단 한 줄·게이지·이번 주 순위)는 인스턴스마다 15초 캐시. 화면을 여러 명이 열어도 15초에 질의 3번입니다.
 * - 내 기여·순위만 요청마다 읽습니다(질의 2번, 기여한 적 없으면 1번).
 * - 바치기는 계정당 3초에 한 번(메모리 속도 제한). 재화는 세이브 저장과 함께 빼고, 저장이 끝난 뒤 제단에 한 번만 더합니다.
 * - 모든 공용 값 갱신은 한 문장 UPDATE라 여러 인스턴스가 동시에 써도 틀어지지 않고, 신 소환·자리 차지는 조건부 UPDATE로 한 명만 성공합니다.
 * - 신과의 전투는 결투 엔진으로 서버에서 한 번 계산(최대 80턴)하고, 모험가마다 10분에 한 번만 도전할 수 있습니다.
 */
import type { State, Snapshot, DuelResult } from '../types';
import { db, type AltarRow, type AltarOfferRow, type AltarTotalRow, type AltarRaidRow } from './db';
import { ApiError } from './store';
import { refreshAltarEvents } from './events-config';
import { allow } from './throttle';
import { weekKey } from '../data/goals';
import { kstIso } from '../data/time';
import { addLog } from '../systems/state';
import { snapshot, power } from '../systems/stats';
import { duel, abyssBossSnapshot, divineFirstGod, raidBossSnapshot } from '../systems/duel';
import { josa, ALTAR, BLESSINGS, BLESSING_MAX_LEVEL, BLESSING_HIGH_FROM, blessingLevelMs, effectiveBlessingLevel, blessingDesc, GAUGE_IDS, gaugeCost, gaugeName, offeringPoints, tithe, RAID, RAIDS, raidById, isRaidGauge, type AltarGaugeId, type AltarInfo, type AltarRaidInfo, type AltarStatus, type Offering } from '../data/altar';

type Shared = { at: number; week: string; altar: AltarRow; gauges: Record<string, { points: number; until: number; level: number; high_until: number }>; board: AltarOfferRow[]; allTime: AltarTotalRow[]; raids: Record<string, AltarRaidRow> };
/** 진행 중인 축복의 단계(끝났으면 0). */
const liveLevel = (g: { until: number; level: number; high_until?: number } | undefined, now: number) => effectiveBlessingLevel(g, now);
/** v3.16 축복이 보이는 종료 시각: 4단계 이상이면 그 단계의 유지 시각(지나면 3단계로 이어짐). */
const liveUntil = (g: { until: number; level: number; high_until?: number } | undefined, now: number) => !g ? 0 : liveLevel(g, now) > BLESSING_HIGH_FROM ? Math.min(g.until, g.high_until || 0) : g.until;
let cache: Shared | null = null;
export const godAlive = (a: AltarRow, now: number) => a.god_state === 'alive' && a.god_until >= now;
const parseGod = (a: AltarRow): Snapshot | null => { try { return a.god ? JSON.parse(a.god) as Snapshot : null; } catch { return null; } };

/** 다음에 깨어날 신. 자리 주인이 있으면 그 모험가를 본뜨고(신격), 없으면 검은 마법사. */
export function nextGod(a: Pick<AltarRow, 'throne_snapshot' | 'throne_name'>): Snapshot {
    let holder: Snapshot | null = null;
    try { holder = a.throne_snapshot ? JSON.parse(a.throne_snapshot) as Snapshot : null; } catch { holder = null; }
    if (!holder) return divineFirstGod({ ...abyssBossSnapshot(ALTAR.firstGod.depth), name: ALTAR.firstGod.name });
    // v27.71 보정 없이 신을 격파하던 당시의 능력치·스킬·숙련을 그대로 씁니다. 주인보다 강하면 끌어내릴 수 있습니다.
    return { ...holder, name: `신이 된 ${a.throne_name}`, rating: 1000 };
}

/** 살아 있는 신이 없고 신 소환 게이지가 찼으면 깨웁니다. 소환이 다른 요청에 밀리면 게이지를 돌려놓습니다. */
async function trySummon(a: AltarRow, godPoints: number, now: number) {
    if (godAlive(a, now) || godPoints < ALTAR.godCost) return false;
    const database = db();
    if (!await database.spendAltarGauge('god', ALTAR.godCost)) return false;
    const god = nextGod(a);
    if (!await database.summonAltarGod(JSON.stringify(god), now + ALTAR.godLifetimeMs, now)) { await database.addAltarGauge('god', ALTAR.godCost); return false; }
    await announce(ALTAR_NEWS.godAwake(god.name), now);
    return true;
}
/** v3.22 월드보스는 보스마다 따로: 그 보스가 살아 있지 않고(격파 뒤에는 RAID.respawnMs가 지나야) 그 소환 게이지가 찼으면 나타납니다. 여러 보스가 동시에 있을 수 있습니다. */
export const raidAlive = (r: AltarRaidRow | undefined, now: number) => !!r && r.state === 'alive' && r.until >= now;
const raidWaiting = (r: AltarRaidRow | undefined, now: number) => !!r && r.state === 'slain' && now - r.slain_at < RAID.respawnMs;
async function trySummonRaid(raids: Record<string, AltarRaidRow>, gauges: Record<string, { points: number }>, now: number) {
    const database = db();
    for (const raid of RAIDS) {
        const r = raids[raid.id];
        if (raidAlive(r, now) || raidWaiting(r, now)) continue;
        if ((gauges[raid.id]?.points || 0) < raid.cost) continue;
        if (!await database.spendAltarGauge(raid.id, raid.cost)) continue;
        if (!await database.summonAltarRaid(raid.id, raid.stats.hp, now + raid.lifetimeHours * 3600_000, now, RAID.respawnMs)) { await database.addAltarGauge(raid.id, raid.cost); continue; }
        await announce(ALTAR_NEWS.raidAppear(raid.name, raid.lifetimeHours), now);
        return true;
    }
    return false;
}
/** 공용 정보(15초 캐시). 읽는 김에 밀려 있던 신 소환도 처리합니다. */
async function shared(now: number, force = false): Promise<Shared> {
    const week = weekKey(now);
    if (!force && cache && cache.week === week && now - cache.at < ALTAR.cacheMs) return cache;
    const database = db();
    const [altar, gauges, board, allTime, raidRows] = await Promise.all([database.getAltar(), database.listAltarGauges(), database.listAltarOffers(week, ALTAR.boardSize), database.listAltarOffersAllTime(ALTAR.boardSize), database.listAltarRaids()]);
    const raids = Object.fromEntries(raidRows.map(r => [r.id, r]));
    // v27.69 신의 자리 임기(ALTAR.throneTermMs)가 지나면 자리와 몫을 비웁니다. 다음에 깨어나는 신은 다시 처음 신입니다.
    if (altar.throne && now - altar.throne_since >= ALTAR.throneTermMs && await database.expireAltarThrone(now - ALTAR.throneTermMs)) {
        await announce(`${josa(altar.throne_name, '이가')} 신의 자리에서 내려왔습니다. 다음에 깨어나는 신은 ${ALTAR.firstGod.name}입니다.`, now);
        return shared(now, true);
    }
    const map = Object.fromEntries(gauges.map(g => [g.id, { points: g.points, until: g.until, level: g.level || 0, high_until: g.high_until || 0 }]));
    if (await trySummon(altar, map.god?.points || 0, now)) return shared(now, true);
    // v27.91 떠날 시각이 지난 월드보스는 보내고, 소환 게이지가 찼으면 새로 부릅니다.
    for (const r of raidRows) if (r.state === 'alive' && r.until < now && await database.expireAltarRaid(r.id, now)) { await announce(`월드보스 ${josa(raidById(r.id)?.name || r.id, '이가')} 떠났습니다.`, now); return shared(now, true); }
    if (await trySummonRaid(raids, map, now)) return shared(now, true);
    return cache = { at: now, week, altar, gauges: map, board, allTime, raids };
}
export const invalidateAltar = () => { cache = null; };
/**
 * v3.25 해킹 V 백도어: 게이지를 조금 채웁니다(기여 순위·합계에는 넣지 않음). 신·월드보스 게이지가 차면 바로 깨어나고,
 * 축복 게이지는 다음 바치기 때 단계가 오릅니다.
 */
export async function backdoorGauge(gauge: AltarGaugeId, points: number, now: number) {
    await db().addAltarGauge(gauge, points);
    invalidateAltar();
    await shared(now, true);
}

/** 제단 소식 문장(운영 페이지의 소식 테스트도 씁니다). */
export const ALTAR_NEWS = {
    godAwake: (name: string) => `제단에 ${josa(name, '이가')} 깨어났습니다! 가장 먼저 쓰러뜨린 모험가가 신의 자리에 앉습니다.`,
    raidAppear: (name: string, hours: number) => `월드보스 ${josa(name, '이가')} 나타났습니다! 모든 모험가의 피해가 하나의 체력에 쌓입니다. ${hours}시간 안에 함께 쓰러뜨리세요.`,
};
/** 제단 소식을 남깁니다(실패해도 본 처리는 그대로). v3.39 전체 채팅 대신 소식 채널. */
async function announce(text: string, now: number) {
    try { await db().postChat({ channel: 'news', account_id: 'system', name: '제단', text, created_at: now }); } catch { /* 소식은 부가 기능 */ }
}

export async function altarInfo(id: string, s: Pick<State, 'altar'> | null, now: number): Promise<AltarInfo> {
    const sh = await shared(now), database = db(), a = sh.altar;
    const [mine, total] = await Promise.all([database.getAltarOffer(sh.week, id), database.sumAltarOffers(id)]);
    const rank = mine && mine.points > 0 ? await database.countAltarAbove(sh.week, mine.points) + 1 : 0;
    const stored = parseGod(a), god = stored && divineFirstGod(stored), isThrone = !!a.throne && a.throne === id;
    return {
        week: sh.week,
        gauges: GAUGE_IDS.map(g => {
            const b = BLESSINGS.find(x => x.id === g), level = liveLevel(sh.gauges[g], now);
            if (isRaidGauge(g)) { const raid = raidById(g)!, waiting = raidWaiting(sh.raids[g], now); return { id: g, name: gaugeName(g), desc: `가득 차면 ${raid.name}(Lv.${raid.level})이 ${raid.lifetimeHours}시간 나타납니다`, points: sh.gauges[g]?.points || 0, cost: raid.cost, until: 0, level: 0, next: raidAlive(sh.raids[g], now) ? '이 보스가 떠나거나 쓰러진 뒤에 다시 소환됩니다' : waiting ? `격파 뒤 대기 중 · ${Math.ceil((RAID.respawnMs - (now - sh.raids[g]!.slain_at)) / 60000)}분 뒤 소환 가능` : '가득 차면 바로 나타납니다' }; }
            const mins = (lv: number) => { const m = blessingLevelMs(b!.hours, lv) / 60_000; return m >= 60 ? `${m / 60}시간` : `${m}분`; };
            const next = !b ? '가득 차면 신이 깨어납니다' : !level ? `채우면 1단계로 열림 · ${blessingDesc(b, 1)} · ${b.hours}시간` : level < BLESSING_MAX_LEVEL ? `채우면 ${level + 1}단계 · ${blessingDesc(b, level + 1)} · ${level + 1 > BLESSING_HIGH_FROM ? `${mins(level + 1)} 유지 뒤 3단계로 12시간` : `지금부터 ${b.hours}시간 유지`}` : `최고 단계 · 채우면 ${mins(level)} 다시 유지`;
            return { id: g, name: b ? b.name : '신 소환', desc: b ? blessingDesc(b, level || 1) : '가득 차면 신이 깨어납니다', points: sh.gauges[g]?.points || 0, cost: gaugeCost(g, level, level > 0), until: sh.gauges[g]?.until || 0, level, next };
        }),
        god: god && a.gen > 0 ? { gen: a.gen, alive: godAlive(a, now), name: god.name, level: god.level, power: power(god.stats), hp: god.stats.hp, attack: Math.max(god.stats.attack, god.stats.magic || 0), until: a.god_until, mine: isThrone && a.god_state === 'alive' } : null,
        throne: a.throne ? { id: isThrone ? id : '', name: a.throne_name, since: a.throne_since, mine: isThrone, power: power(nextGod(a).stats), hp: nextGod(a).stats.hp, ...(isThrone ? { tithe: { gold: a.tithe_gold, pearls: a.tithe_pearls, essence: a.tithe_essence } } : {}) } : null,
        totals: { gold: a.total_gold, pearls: a.total_pearls, essence: a.total_essence, points: a.total_points },
        board: sh.board.map((r, i) => ({ rank: i + 1, name: r.anonymous ? '익명의 모험가' : r.name, points: r.points, anonymous: !!r.anonymous, self: r.player_id === id })),
        allTime: sh.allTime.map((r, i) => ({ rank: i + 1, name: r.anonymous ? '익명의 모험가' : r.name, points: r.points, anonymous: !!r.anonymous, self: r.player_id === id })),
        total: { points: total.points, rank: total.points > 0 ? total.above + 1 : 0 },
        me: { points: mine?.points || 0, rank, anonymous: !!s?.altar?.anonymous, challengeAt: s?.altar?.challengeAt || 0, raidAt: s?.altar?.raidAt || 0, raidAtBy: s?.altar?.raidAtBy || {} },
        raids: (await Promise.all(RAIDS.map(r => raidInfo(sh.raids[r.id], id, now)))).filter((x): x is AltarRaidInfo => !!x),
    };
}
/** v27.91 월드보스 카드 정보: 공유 체력·남은 시간·참여자 수·피해 순위·내 기록. 보스가 없거나 떠났으면 null, 격파된 보스는 다음 보스가 올 때까지 결과로 남습니다. */
async function raidInfo(r: AltarRaidRow | undefined, id: string, now: number): Promise<AltarRaidInfo | null> {
    const raid = r && raidById(r.id);
    if (!r || !raid || r.gen <= 0 || r.state === 'none' || r.state === 'gone') return null;
    const database = db(), alive = raidAlive(r, now), slain = r.state === 'slain';
    if (!alive && !slain) return null;
    const [hits, participants, mine, slayerHit] = await Promise.all([database.listRaidHits(r.gen, RAID.boardSize), database.countRaidHits(r.gen), database.getRaidHit(r.gen, id), r.slayer ? database.getRaidHit(r.gen, r.slayer) : null]);
    const rank = mine ? await database.countRaidAbove(r.gen, mine.dealt) + 1 : 0;
    const snap = raidBossSnapshot(raid);
    return {
        id: raid.id, gen: r.gen, name: raid.name, level: raid.level, alive, slain, hp: Math.max(0, r.hp), hpMax: r.hp_max || raid.stats.hp, attack: raid.stats.attack, defense: raid.stats.defense, power: snap.power, until: r.until,
        participants, slayer: slayerHit?.name || '',
        board: hits.map((h, i) => ({ rank: i + 1, name: h.name, dealt: h.dealt, hits: h.hits, self: h.player_id === id })), me: { dealt: mine?.dealt || 0, hits: mine?.hits || 0, rank },
        reward: raid.reward, slayerBonus: raid.slayer,
    };
}
/**
 * v27.91 월드보스 도전. 남은 공유 체력을 가진 보스와 RAID.maxTurns 안에서 한 번 겨루고, 깎은 만큼을 서버 체력에서 뺍니다(한 문장 UPDATE라 동시 도전이 겹쳐도 틀어지지 않음).
 * 체력이 0이 되면 격파: 먼저 처리된 한 명만 마지막 일격이 되고, 축복이 열리며, 참여자 보상은 각자 다음 동기화 때 받습니다(syncAltarStatus).
 */
export function makeRaid(id: string, raidId: string) {
    let outcome: { result: DuelResult; dealt: number; remaining: number; slain: boolean; slayer: boolean; name: string; gen: number } | null = null;
    return async (s: State, now: number) => {
        // v3.22 도전 간격은 보스마다 따로입니다(예전 세이브의 raidAt은 그때 떠 있던 보스에만 걸림).
        const last = s.altar?.raidAtBy?.[raidId] ?? 0;
        if (!outcome) {
            const r = (await shared(now, true)).raids[raidId], raid = raidById(raidId);
            if (!r || !raid || !raidAlive(r, now)) throw new ApiError('그 월드보스는 지금 나타나 있지 않습니다.');
            if (now - last < RAID.cooldownMs) throw new ApiError(`월드보스에게는 ${Math.ceil((RAID.cooldownMs - (now - last)) / 60000)}분 뒤에 다시 도전할 수 있습니다.`);
            const me = snapshot(s), boss = raidBossSnapshot(raid, r.hp), result = duel(me, boss, true, Math.random, RAID.maxTurns);
            const dealt = Math.max(0, Math.min(boss.stats.hp, boss.stats.hp - Math.max(0, result.opponentHp)));
            const database = db(), remaining = await database.hitAltarRaid(raidId, r.gen, dealt);
            if (remaining === null) throw new ApiError('월드보스가 방금 떠났거나 쓰러졌습니다.');
            await database.bumpRaidHit(r.gen, id, s.name, dealt, now);
            const slain = remaining <= 0; let slayer = false;
            if (slain) {
                slayer = await database.slayAltarRaid(raidId, r.gen, id, s.name, now);
                if (slayer) {
                    // 격파 축복: 보스가 정한 축복을 1단계로 blessingHours만큼 엽니다(진행 중이면 시간만 늘어남).
                    for (const b of raid.blessings) { await database.addAltarGauge(b, 0); await database.extendAltarGauge(b, now, raid.blessingHours * 3600_000, ALTAR.blessingCapMs); }
                    await refreshAltarEvents(now);
                    await announce(`✦ ${josa(s.name, '이가')} 월드보스 ${josa(raid.name, '을를')} 쓰러뜨렸습니다! 함께 싸운 모험가 모두 보상을 받고, ${raid.blessings.map(gaugeName).join('·')}이 ${raid.blessingHours}시간 열립니다.`, now);
                }
            }
            invalidateAltar();
            outcome = { result, dealt, remaining, slain, slayer, name: raid.name, gen: r.gen };
        }
        const { result, dealt, remaining, slain, slayer, name } = outcome;
        s.altar = { ...s.altar, raidAt: now, raidAtBy: { ...s.altar?.raidAtBy, [raidId]: now }, raidHits: (s.altar?.raidHits || 0) + 1, raidDealt: (s.altar?.raidDealt || 0) + dealt };
        addLog(s, slain ? slayer ? `✦ 월드보스 ${josa(name, '을를')} 쓰러뜨렸습니다! 마지막 일격 보너스는 다음 동기화 때 들어옵니다.` : `월드보스 ${josa(name, '이가')} 쓰러졌습니다 · 내 피해 ${dealt.toLocaleString()} · 보상은 다음 동기화 때` : `월드보스 ${name}에게 ${dealt.toLocaleString()} 피해 · 남은 체력 ${remaining.toLocaleString()} (${result.turns}턴)`, slain ? 'reward' : 'system');
        return { winner: result.winner, turns: result.turns, logs: result.logs.slice(-40), claimed: false, dealt, remaining, slain, slayer };
    };
}

const count = (v: unknown, max: number) => { const n = Math.floor(Number(v || 0)); if (!Number.isFinite(n) || n < 0 || n > max) throw new ApiError('수량을 확인하세요.'); return n; };
/** 요청 본문 → 바칠 재화·게이지·익명 여부. 계정당 3초 간격도 여기서 막습니다. */
export function parseOffering(account: string, body: Record<string, unknown>, now: number) {
    const o: Offering = { gold: count(body.gold, ALTAR.maxGold), pearls: count(body.pearls, ALTAR.maxPearls), essence: count(body.essence, ALTAR.maxEssence) };
    const gauge = String(body.gauge || '') as AltarGaugeId;
    if (!GAUGE_IDS.includes(gauge)) throw new ApiError('어느 게이지에 바칠지 고르세요.');
    const points = offeringPoints(o);
    if (points < ALTAR.minPoints) throw new ApiError(`기여도가 1 이상이 되도록 바치세요(골드 ${ALTAR.goldPerPoint.toLocaleString()} = 1).`);
    if (!allow(`altar:${account}`, 1, ALTAR.offerCooldownMs, now)) throw new ApiError('잠시 뒤에 다시 바치세요.', 429);
    return { o, gauge, points, anonymous: body.anonymous === true };
}
/** 세이브에서 재화를 뺍니다. 저장 충돌로 다시 돌면 새로 읽은 세이브에 다시 적용됩니다. */
export function applyOffering(s: State, o: Offering, points: number, gauge: AltarGaugeId, anonymous: boolean) {
    if (s.gold < o.gold) throw new ApiError('골드가 부족합니다.');
    if (s.pearls < o.pearls) throw new ApiError('세계석이 부족합니다.');
    if ((s.essence || 0) < o.essence) throw new ApiError('정수가 부족합니다.');
    s.gold -= o.gold; s.pearls -= o.pearls; s.essence = (s.essence || 0) - o.essence;
    s.altar = { ...s.altar, anonymous, offers: (s.altar?.offers || 0) + 1 };
    const parts = [o.gold ? `${o.gold.toLocaleString()} G` : '', o.pearls ? `세계석 ${o.pearls.toLocaleString()}` : '', o.essence ? `정수 ${o.essence.toLocaleString()}` : ''].filter(Boolean).join(' · ');
    // v3.15 월드보스 게이지(발록·자쿰·혼테일)는 축복 목록에 없어 여기서 예외가 나며 503이 됐습니다 → gaugeName으로 통일.
    addLog(s, `제단에 공물을 바쳤습니다 · ${parts} · 기여도 +${points.toLocaleString()} (${gaugeName(gauge)})`, 'system');
}
/** 저장이 끝난 뒤 한 번: 기여·합계·게이지를 더하고, 가득 찬 게이지를 처리합니다. */
export async function commitOffering(account: string, id: string, name: string, o: Offering, points: number, gauge: AltarGaugeId, anonymous: boolean, now: number) {
    const database = db(), week = weekKey(now);
    await Promise.all([
        database.bumpAltarOffer({ week, player_id: id, account_id: account, name, anonymous: anonymous ? 1 : 0, updated_at: now }, { ...o, points }),
        database.addAltar(id, { ...o, points }, tithe(o)),
        database.addAltarGauge(gauge, points),
    ]);
    const b = BLESSINGS.find(x => x.id === gauge);
    if (b) {
        // v27.48 한 칸 찰 때마다: 닫혀 있으면 1단계로 열고, 진행 중이면 단계 +1(최대 3)·시간 +1시간. 비용은 단계마다 ×1.5.
        let opened = 0, until = 0, level = 0, wasLive = false, before = 0;
        for (let i = 0; i < 12; i++) {
            const g = (await database.listAltarGauges()).find(x => x.id === b.id), live = effectiveBlessingLevel(g, now);
            if (i === 0) { wasLive = live > 0; before = live; }
            // v3.16 다음 단계가 4 이상이면 전체 시간은 늘지 않고 그 단계의 짧은 유지 시간만 새로 셉니다.
            const target = Math.min(live + 1, BLESSING_MAX_LEVEL), high = target > BLESSING_HIGH_FROM;
            const r = await database.levelAltarBlessing(b.id, gaugeCost(b.id, live, live > 0), live, now, high ? 0 : b.hours * 3600_000, ALTAR.blessingCapMs, BLESSING_MAX_LEVEL, high ? blessingLevelMs(b.hours, target) : 0, BLESSING_HIGH_FROM);
            if (!r) break;
            opened++; until = r.until; level = r.level;
        }
        if (opened) { await refreshAltarEvents(now); await announce(`${name}의 공물로 ${josa(b.name, '이가')} ${!wasLive ? `열렸습니다${level > 1 ? `(${level}단계)` : ''}` : level > before ? `${level}단계가 되었습니다` : (level > BLESSING_HIGH_FROM ? `${level}단계가 ${Math.round(blessingLevelMs(b.hours, level) / 60_000)}분 다시 유지됩니다` : `${level}단계로 ${opened}시간 연장되었습니다`)}! ${blessingDesc(b, level)} · ${kstIso(until).slice(11, 16)}까지`, now); }
    }
    invalidateAltar();
    await shared(now, true); // 신 소환 게이지가 찼으면 여기서 깨어납니다.
}

/** 신에게 도전. 결과는 한 번만 계산해 저장 충돌로 다시 돌아도 같은 결과를 적습니다. */
export function makeChallenge(id: string) {
    let outcome: { result: DuelResult; claimed: boolean; gen: number; god: string; dealt: number } | null = null;
    return async (s: State, now: number) => {
        const last = s.altar?.challengeAt || 0;
        if (!outcome) {
            const a = (await shared(now, true)).altar, stored = parseGod(a), god = stored && divineFirstGod(stored);
            if (!god || !godAlive(a, now)) throw new ApiError('지금 깨어 있는 신이 없습니다.');
            if (a.throne === id) throw new ApiError('신의 자리에 앉아 있는 동안에는 도전할 수 없습니다.');
            if (now - last < ALTAR.challengeCooldownMs) throw new ApiError(`신에게는 ${Math.ceil((ALTAR.challengeCooldownMs - (now - last)) / 60000)}분 뒤에 다시 도전할 수 있습니다.`);
            const me = snapshot(s), result = duel(me, god, true, Math.random, ALTAR.godMaxTurns);
            const claimed = result.winner === 'player' && await db().claimAltarThrone(a.gen, id, s.name, JSON.stringify(me), now);
            outcome = { result, claimed, gen: a.gen, god: god.name, dealt: Math.max(0, Math.min(1, 1 - result.opponentHp / Math.max(1, god.stats.hp))) };
            if (claimed) { invalidateAltar(); await announce(`${josa(s.name, '이가')} ${josa(god.name, '을를')} 쓰러뜨리고 신의 자리에 앉았습니다!`, now); }
        }
        const { result, claimed, god, dealt } = outcome;
        s.altar = { ...s.altar, challengeAt: now, tries: (s.altar?.tries || 0) + 1, wins: (s.altar?.wins || 0) + (result.winner === 'player' ? 1 : 0), best: Math.max(s.altar?.best || 0, dealt) };
        addLog(s, result.winner === 'player'
            ? claimed ? `✦ ${josa(god, '을를')} 쓰러뜨렸습니다! 이제 당신이 신의 자리에 앉습니다. 다른 모험가가 바치는 재화의 ${ALTAR.titheRate * 100}%가 쌓입니다.` : `${josa(god, '을를')} 쓰러뜨렸지만 한발 늦었습니다. 다른 모험가가 먼저 신의 자리에 앉았습니다.`
            : `${god}에게 도전했지만 ${result.winner === 'draw' ? `${result.turns}턴 안에 쓰러뜨리지 못했습니다` : '쓰러졌습니다'}.`, result.winner === 'player' ? 'reward' : 'system');
        return { winner: result.winner, turns: result.turns, logs: result.logs.slice(-40), claimed };
    };
}
/**
 * v27.70 탄핵: 신의 자리 주인을 본뜬 신(nextGod, 신격 포함)과 겨뤄 이기면 주인이 자리에서 내려옵니다(자리는 비고, 도전자가 앉지는 않음).
 * 깨어 있는 신이 있을 때는 그 신에게 도전하면 되므로 막습니다. 도전 간격은 신 도전과 같습니다.
 */
export function makeImpeach(id: string) {
    let outcome: { result: DuelResult; impeached: boolean; holder: string; dealt: number } | null = null;
    return async (s: State, now: number) => {
        const last = s.altar?.challengeAt || 0;
        if (!outcome) {
            const a = (await shared(now, true)).altar;
            if (!a.throne) throw new ApiError('신의 자리가 비어 있습니다.');
            if (a.throne === id) throw new ApiError('자신을 탄핵할 수는 없습니다.');
            if (godAlive(a, now)) throw new ApiError('깨어 있는 신이 있습니다. 신에게 도전하세요.');
            if (now - last < ALTAR.challengeCooldownMs) throw new ApiError(`${Math.ceil((ALTAR.challengeCooldownMs - (now - last)) / 60000)}분 뒤에 다시 도전할 수 있습니다.`);
            const me = snapshot(s), god = nextGod(a), result = duel(me, god, true, Math.random, ALTAR.godMaxTurns);
            const impeached = result.winner === 'player' && await db().vacateAltarThrone(a.throne);
            outcome = { result, impeached, holder: a.throne_name, dealt: Math.max(0, Math.min(1, 1 - result.opponentHp / Math.max(1, god.stats.hp))) };
            if (impeached) { invalidateAltar(); await announce(`${josa(s.name, '이가')} ${josa(a.throne_name, '을를')} 탄핵했습니다! 신의 자리가 비었습니다. 다음에 깨어나는 신은 ${ALTAR.firstGod.name}입니다.`, now); }
        }
        const { result, impeached, holder, dealt } = outcome;
        s.altar = { ...s.altar, challengeAt: now, tries: (s.altar?.tries || 0) + 1, wins: (s.altar?.wins || 0) + (result.winner === 'player' ? 1 : 0), best: Math.max(s.altar?.best || 0, dealt) };
        addLog(s, result.winner === 'player'
            ? impeached ? `✦ ${josa(holder, '을를')} 탄핵했습니다! 신의 자리가 비었습니다. 다시 앉으려면 신을 소환해 쓰러뜨려야 합니다.` : `신이 된 ${josa(holder, '을를')} 이겼지만 자리가 이미 바뀌어 있었습니다.`
            : `신이 된 ${holder}에게 도전했지만 ${result.winner === 'draw' ? `${result.turns}턴 안에 쓰러뜨리지 못했습니다` : '쓰러졌습니다'}.`, result.winner === 'player' ? 'reward' : 'system');
        return { winner: result.winner, turns: result.turns, logs: result.logs.slice(-40), claimed: false, impeached };
    };
}
/** 신의 몫 거두기. DB에서는 한 번만 꺼내고, 저장 충돌로 다시 돌면 같은 양을 새 세이브에 넣습니다. */
export function makeHarvest(id: string) {
    let taken: Offering | null = null;
    return async (s: State) => {
        taken ??= await db().takeAltarTithe(id);
        if (!taken) throw new ApiError('신의 자리에 앉은 모험가만 거둘 수 있습니다.');
        if (!taken.gold && !taken.pearls && !taken.essence) throw new ApiError('아직 쌓인 몫이 없습니다.');
        s.gold += taken.gold; s.pearls += taken.pearls; s.essence = (s.essence || 0) + taken.essence;
        addLog(s, `신의 몫을 거뒀습니다 · ${taken.gold.toLocaleString()} G · 세계석 ${taken.pearls.toLocaleString()} · 정수 ${taken.essence.toLocaleString()}`, 'reward');
        invalidateAltar();
        return taken;
    };
}

/** 동기화 때 한 번: 제단 진행 요약을 세이브에 적습니다. 공용 캐시를 쓰므로 15초에 한 번만 DB를 읽고, 실패해도 동기화는 그대로 진행합니다. */
export async function syncAltarStatus(s: State, now: number, id = '') {
    try {
        const sh = await shared(now), a = sh.altar, god = parseGod(a);
        const status: AltarStatus = {
            blessings: BLESSINGS.filter(b => liveLevel(sh.gauges[b.id], now) > 0).map(b => { const level = liveLevel(sh.gauges[b.id], now); return { id: b.id, name: `${b.name} ${level}단계`, desc: blessingDesc(b, level), until: liveUntil(sh.gauges[b.id], now), level }; }),
            god: god && godAlive(a, now) ? { gen: a.gen, name: god.name, until: a.god_until } : null,
            raids: RAIDS.filter(r => raidAlive(sh.raids[r.id], now)).map(r => { const x = sh.raids[r.id]; return { id: r.id, gen: x.gen, name: r.name, until: x.until, pct: x.hp_max ? Math.max(0, Math.min(1, x.hp / x.hp_max)) : 0 }; }),
            throne: a.throne_name,
            gauges: GAUGE_IDS.map(g => { const level = liveLevel(sh.gauges[g], now); return { id: g, name: gaugeName(g), pct: Math.min(100, Math.floor((sh.gauges[g]?.points || 0) / gaugeCost(g, level, level > 0) * 100)) }; }),
        };
        s.altarStatus = status;
        if (id) for (const r of Object.values(sh.raids)) await claimRaidReward(s, r, id);
    }
    catch (e) { if (process.env.TIDEBOUND_DEBUG) console.error('altar status', e); /* 제단은 부가 정보 */ }
}
/**
 * v27.91 격파된 월드보스의 참여 보상. 세대 번호를 세이브에 적어 두어 한 세대에 한 번만, 참여 여부는 그때 한 번만 조회합니다(참여하지 않았어도 세대는 적어 다시 묻지 않음).
 */
async function claimRaidReward(s: State, r: AltarRaidRow, id: string) {
    // v3.22 보스마다 정산한 세대를 따로 적습니다. 세대 번호는 모든 보스가 함께 쓰는 순번이라 예전 세이브의 raidClaimed(한 칸)보다 큰 세대만 새 보스입니다.
    const claimed = s.altar?.raidClaimedBy?.[r.id] ?? s.altar?.raidClaimed ?? 0;
    if (r.state !== 'slain' || r.gen <= 0 || claimed >= r.gen) return;
    const raid = raidById(r.id);
    s.altar = { ...s.altar, raidClaimedBy: { ...s.altar?.raidClaimedBy, [r.id]: r.gen } };
    if (!raid) return;
    const hit = await db().getRaidHit(r.gen, id);
    if (!hit || hit.dealt <= 0) return;
    const slayer = r.slayer === id;
    const gold = raid.reward.gold, pearls = raid.reward.pearls + (slayer ? raid.slayer.pearls : 0), sp = raid.reward.sp + (slayer ? raid.slayer.sp : 0);
    s.gold += gold; s.pearls += pearls; s.sp += sp;
    addLog(s, `월드보스 ${raid.name} 격파 보상${slayer ? '(마지막 일격 보너스 포함)' : ''} · ${gold.toLocaleString()} G · 세계석 +${pearls}${sp ? ` · SP +${sp}` : ''} · 내 피해 ${hit.dealt.toLocaleString()}`, 'reward');
}
