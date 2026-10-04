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
import { db, type AltarRow, type AltarOfferRow } from './db';
import { ApiError } from './store';
import { refreshAltarEvents } from './events-config';
import { allow } from './throttle';
import { weekKey } from '../data/goals';
import { addLog } from '../systems/state';
import { snapshot, power } from '../systems/stats';
import { duel, bossSnapshot } from '../systems/duel';
import { josa, ALTAR, BLESSINGS, GAUGE_IDS, gaugeCost, offeringPoints, tithe, type AltarGaugeId, type AltarInfo, type Offering } from '../data/altar';

type Shared = { at: number; week: string; altar: AltarRow; gauges: Record<string, { points: number; until: number }>; board: AltarOfferRow[] };
let cache: Shared | null = null;
export const godAlive = (a: AltarRow, now: number) => a.god_state === 'alive' && a.god_until >= now;
const parseGod = (a: AltarRow): Snapshot | null => { try { return a.god ? JSON.parse(a.god) as Snapshot : null; } catch { return null; } };

/** 다음에 깨어날 신. 자리 주인이 있으면 그 모험가를 본뜨고(신격), 없으면 검은 마법사. */
export function nextGod(a: Pick<AltarRow, 'throne_snapshot' | 'throne_name'>): Snapshot {
    let holder: Snapshot | null = null;
    try { holder = a.throne_snapshot ? JSON.parse(a.throne_snapshot) as Snapshot : null; } catch { holder = null; }
    const base = holder || bossSnapshot(ALTAR.firstGod.base)!, m = holder ? ALTAR.godhood : ALTAR.firstGod;
    const stats = { ...base.stats, hp: Math.round(base.stats.hp * m.hp), attack: Math.round(base.stats.attack * m.attack), ...(base.stats.magic ? { magic: Math.round(base.stats.magic * m.attack) } : {}) };
    return { ...base, name: holder ? `신이 된 ${a.throne_name}` : ALTAR.firstGod.name, stats, power: power(stats), rating: 1000 };
}

/** 살아 있는 신이 없고 신 소환 게이지가 찼으면 깨웁니다. 소환이 다른 요청에 밀리면 게이지를 돌려놓습니다. */
async function trySummon(a: AltarRow, godPoints: number, now: number) {
    if (godAlive(a, now) || godPoints < ALTAR.godCost) return false;
    const database = db();
    if (!await database.spendAltarGauge('god', ALTAR.godCost)) return false;
    const god = nextGod(a);
    if (!await database.summonAltarGod(JSON.stringify(god), now + ALTAR.godLifetimeMs, now)) { await database.addAltarGauge('god', ALTAR.godCost); return false; }
    await announce(`제단에 ${josa(god.name, '이가')} 깨어났습니다! 가장 먼저 쓰러뜨린 모험가가 신의 자리에 앉습니다.`, now);
    return true;
}
/** 공용 정보(15초 캐시). 읽는 김에 밀려 있던 신 소환도 처리합니다. */
async function shared(now: number, force = false): Promise<Shared> {
    const week = weekKey(now);
    if (!force && cache && cache.week === week && now - cache.at < ALTAR.cacheMs) return cache;
    const database = db();
    const [altar, gauges, board] = await Promise.all([database.getAltar(), database.listAltarGauges(), database.listAltarOffers(week, ALTAR.boardSize)]);
    const map = Object.fromEntries(gauges.map(g => [g.id, { points: g.points, until: g.until }]));
    if (await trySummon(altar, map.god?.points || 0, now)) return shared(now, true);
    return cache = { at: now, week, altar, gauges: map, board };
}
export const invalidateAltar = () => { cache = null; };

/** 전체 채팅에 제단 소식을 남깁니다(실패해도 본 처리는 그대로). */
async function announce(text: string, now: number) {
    try { await db().postChat({ channel: 'global', account_id: 'system', name: '제단', text, created_at: now }); } catch { /* 채팅은 부가 기능 */ }
}

export async function altarInfo(id: string, s: Pick<State, 'altar'> | null, now: number): Promise<AltarInfo> {
    const sh = await shared(now), database = db(), a = sh.altar;
    const mine = await database.getAltarOffer(sh.week, id);
    const rank = mine && mine.points > 0 ? await database.countAltarAbove(sh.week, mine.points) + 1 : 0;
    const god = parseGod(a), isThrone = !!a.throne && a.throne === id;
    return {
        week: sh.week,
        gauges: GAUGE_IDS.map(g => {
            const b = BLESSINGS.find(x => x.id === g);
            return { id: g, name: b ? b.name : '신 소환', desc: b ? `${b.desc} · ${b.hours}시간` : '가득 차면 신이 깨어납니다', points: sh.gauges[g]?.points || 0, cost: gaugeCost(g), until: sh.gauges[g]?.until || 0 };
        }),
        god: god && a.gen > 0 ? { gen: a.gen, alive: godAlive(a, now), name: god.name, level: god.level, power: god.power, until: a.god_until, mine: isThrone && a.god_state === 'alive' } : null,
        throne: a.throne ? { id: isThrone ? id : '', name: a.throne_name, since: a.throne_since, mine: isThrone, ...(isThrone ? { tithe: { gold: a.tithe_gold, pearls: a.tithe_pearls, essence: a.tithe_essence } } : {}) } : null,
        totals: { gold: a.total_gold, pearls: a.total_pearls, essence: a.total_essence, points: a.total_points },
        board: sh.board.map((r, i) => ({ rank: i + 1, name: r.anonymous ? '익명의 모험가' : r.name, points: r.points, anonymous: !!r.anonymous, self: r.player_id === id })),
        me: { points: mine?.points || 0, rank, anonymous: !!s?.altar?.anonymous, challengeAt: s?.altar?.challengeAt || 0 },
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
    s.altar = { ...s.altar, anonymous };
    const parts = [o.gold ? `${o.gold.toLocaleString()} G` : '', o.pearls ? `세계석 ${o.pearls.toLocaleString()}` : '', o.essence ? `정수 ${o.essence.toLocaleString()}` : ''].filter(Boolean).join(' · ');
    addLog(s, `제단에 공물을 바쳤습니다 · ${parts} · 기여도 +${points.toLocaleString()} (${gauge === 'god' ? '신 소환' : BLESSINGS.find(b => b.id === gauge)!.name})`, 'system');
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
        // 한 번에 여러 칸을 채웠어도 최대 몇 번만(축복 시간 상한이 있음).
        let opened = 0, until = 0;
        for (let i = 0; i < 12 && await database.spendAltarGauge(b.id, b.cost); i++) { opened++; until = await database.extendAltarGauge(b.id, now, b.hours * 3600_000, ALTAR.blessingCapMs); }
        if (opened) { await refreshAltarEvents(now); await announce(`${name}의 공물로 ${josa(b.name, '이가')} 열렸습니다! ${b.desc} · ${new Date(until + 9 * 3600_000).toISOString().slice(11, 16)}까지`, now); }
    }
    invalidateAltar();
    await shared(now, true); // 신 소환 게이지가 찼으면 여기서 깨어납니다.
}

/** 신에게 도전. 결과는 한 번만 계산해 저장 충돌로 다시 돌아도 같은 결과를 적습니다. */
export function makeChallenge(id: string) {
    let outcome: { result: DuelResult; claimed: boolean; gen: number; god: string } | null = null;
    return async (s: State, now: number) => {
        const last = s.altar?.challengeAt || 0;
        if (!outcome) {
            const a = (await shared(now, true)).altar, god = parseGod(a);
            if (!god || !godAlive(a, now)) throw new ApiError('지금 깨어 있는 신이 없습니다.');
            if (a.throne === id) throw new ApiError('신의 자리에 앉아 있는 동안에는 도전할 수 없습니다.');
            if (now - last < ALTAR.challengeCooldownMs) throw new ApiError(`신에게는 ${Math.ceil((ALTAR.challengeCooldownMs - (now - last)) / 60000)}분 뒤에 다시 도전할 수 있습니다.`);
            const me = snapshot(s), result = duel(me, god, true);
            const claimed = result.winner === 'player' && await db().claimAltarThrone(a.gen, id, s.name, JSON.stringify(me), now);
            outcome = { result, claimed, gen: a.gen, god: god.name };
            if (claimed) { invalidateAltar(); await announce(`${josa(s.name, '이가')} ${josa(god.name, '을를')} 쓰러뜨리고 신의 자리에 앉았습니다!`, now); }
        }
        s.altar = { ...s.altar, challengeAt: now };
        const { result, claimed, god } = outcome;
        addLog(s, result.winner === 'player'
            ? claimed ? `✦ ${josa(god, '을를')} 쓰러뜨렸습니다! 이제 당신이 신의 자리에 앉습니다. 다른 모험가가 바치는 재화의 ${ALTAR.titheRate * 100}%가 쌓입니다.` : `${josa(god, '을를')} 쓰러뜨렸지만 한발 늦었습니다. 다른 모험가가 먼저 신의 자리에 앉았습니다.`
            : `${god}에게 도전했지만 ${result.winner === 'draw' ? `${result.turns}턴 안에 쓰러뜨리지 못했습니다` : '쓰러졌습니다'}.`, result.winner === 'player' ? 'reward' : 'system');
        return { winner: result.winner, turns: result.turns, logs: result.logs.slice(-40), claimed };
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
