/**
 * 원정대(오토배틀러) 2단계: 판 상태(State.expedition)와 행동. 8라운드 PvE · 고스트. 5단계부터 횟수 제한 없음, 보상은 승리마다 세계석(완주 보너스).
 * value 규칙 — expeditionBuy: 상점 칸 번호 · expeditionSell: 'bench:i' | 'board:i' · expeditionPlace: 'bench:i:front' | 'bench:i:back' | 'board:i'(벤치로).
 */
import { EXPEDITION, pearlText, roundXpFor, isBossRound, actOf, unitById, sellPrice, itemById, ITEM_HOLD, BOX_ITEMS, BOX_CHOICES, comboOf, EMBLEMS, EMBLEM_ROUND, TIER2_ROUND, ITEMS, seasonPearls, type SeasonSettlement,
    AUGMENTS, AUGMENT_ROUNDS, augmentById, augmentMods, augmentName, weeklyRule, weeklyRuleById, masteryPerks, masteryXpFor, masteryRunXp, MASTERY_MAX, MASTERY_PERKS, mergeMods, type RunMods,
    pickQuests, questById, compKey, COMP_KEYS_MAX, type QuestKey, ABYSS, isAbyssRound, FEATS, DIFFICULTIES, difficultyOf, difficultyUnlocked, combatMods, waveMods, STARTER_GHOST,
    lockedBossUnits, CORE_SHARD, shardChance, shardCoreFor, 
    activeSet, setById, setUnits, renownMods, combatRenown, SET_MASTERY, setMasteryXpFor, RENOWN, renownRewardMult, LEAGUE, leagueTierName, type LeagueSettlement, GHOST_GUARD, boardValue, encodeBoard, decodeBoard, themeById, UNIT_SKINS, setMasteryBest, skinById, skinUnlocked, cleanShareText, SHARE_MEMO_MAX } from '../../data/expedition';
import { grantBossCore } from '../boss-loot';
import { BOSS_CORES } from '../../data/boss-core';
import { weekKey, dayKey } from '../../data/time';
import { rollShop, rollWave, battle, frontRole, activeTraits, WAVE_BUDGET, starterBoard, starterGhostById } from '../expedition';
import { addLog } from '../state';
import type { State, ExpeditionRun, ExpeditionPlaced, ExpeditionBench, ExpeditionStats, ExpeditionGhost } from '../../types';
import type { ActionHandlers } from './types';

const run = (s: State): ExpeditionRun => { const r = s.expedition; if (!r || r.done) throw Error('진행 중인 원정이 없습니다.'); return r; };
const slotsOf = (r: ExpeditionRun) => EXPEDITION.boardSlots[Math.min(EXPEDITION.boardSlots.length - 1, r.level)];
/** v3.432 원정대 세계석 지급: 보상이 1/10(소수)이 되어 모자란 부분을 expeditionPearlCarry에 모았다가 1이 될 때마다 줍니다. 돌려주는 값은 실제로 준 정수. */
export function grantPearls(s: State, amount: number) {
    const total = (s.expeditionPearlCarry || 0) + Math.max(0, amount), whole = Math.floor(total + 1e-9);
    s.expeditionPearlCarry = Math.round((total - whole) * 1000) / 1000; if (whole) s.pearls = (s.pearls || 0) + whole;
    return whole;
}
/** 5단계: 보상 세계석 = 승수 × pearlsPerWin + (완주면 clearPearls). 환생 배율 없음. */
/** 판 경험치를 더하고 레벨을 올립니다(최대 8, 최대 레벨이면 쌓지 않음). */
function addRunXp(r: ExpeditionRun, n: number) {
    if (r.level >= 8) return;
    r.xp += n;
    while (r.level < 8 && r.xp >= EXPEDITION.xpToLevel[r.level]) { r.xp -= EXPEDITION.xpToLevel[r.level]; r.level++; }
}
export const expeditionReward = (wins: number, cleared: boolean) => wins * EXPEDITION.pearlsPerWin + (cleared ? EXPEDITION.clearPearls : 0);
/** 같은 유닛 · 같은 ★이 3개 모이면 한 단계 올립니다(보드에 있던 자리는 유지, 나머지는 사라짐). 더 합칠 것이 없을 때까지. */
/** 9단계 시즌 정산 검증: 서버가 만든 값만 믿되 모양은 확인합니다. 세계석은 순위에서 다시 계산(값 위조 방지). */
export function parseSettlement(value: unknown): SeasonSettlement | null {
    if (typeof value !== 'string' || !value) return null;
    try {
        const raw = JSON.parse(value) as Partial<SeasonSettlement> & { season?: unknown; league?: unknown };
        // 21단계부터 value는 { season, league } 묶음. 옛 모양(정산 객체 그대로)도 받습니다.
        const v = (raw && typeof raw.season === 'object' ? raw.season : raw) as Partial<SeasonSettlement> | null;
        if (!v || !/^\d{4}-\d{2}$/.test(String(v.season)) || !Number.isInteger(v.rank) || !Number.isInteger(v.total)) return null;
        const rank = Math.max(0, v.rank!), wins = Math.max(0, Math.floor(Number(v.wins) || 0));
        return { season: v.season!, rank, total: Math.max(rank, v.total!), wins, pearls: seasonPearls(rank) };
    } catch { return null; }
}
/** 21단계 주간 리그 정산(서버가 만든 값): 모양만 확인하고 세계석 · 다음 등급은 순위에서 다시 계산합니다. */
export function parseLeagueSettlement(value: unknown): LeagueSettlement | null {
    if (typeof value !== 'string' || !value) return null;
    try {
        const raw = JSON.parse(value) as { league?: Partial<LeagueSettlement> };
        const v = raw?.league; if (!v || !/^\d{4}-W\d{2}$/.test(String(v.week)) || !Number.isInteger(v.rank) || !Number.isInteger(v.tier) || !Number.isInteger(v.size)) return null;
        const tier = Math.max(1, Math.min(LEAGUE.tiers.length, v.tier!)), rank = Math.max(1, v.rank!), size = Math.max(rank, v.size!);
        const nextTier = rank <= LEAGUE.promote && tier < LEAGUE.tiers.length ? tier + 1 : rank > size - LEAGUE.demote && size >= LEAGUE.demoteMin && tier > 1 ? tier - 1 : tier;
        return { week: v.week!, tier, rank, size, score: Math.max(0, Math.floor(Number(v.score) || 0)), pearls: LEAGUE.rewards[rank - 1] ?? LEAGUE.rewards[LEAGUE.rewards.length - 1], nextTier };
    } catch { return null; }
}
/** 8단계 문장 고르기: 보드에서 다음 단계까지 가장 가까운(아직 최대가 아닌) 시너지의 문장. 같은 거리면 머릿수가 많은 쪽, 그래도 같으면 무작위, 시너지가 없으면 아무 문장. */
export function pickEmblem(r: ExpeditionRun, rng: () => number): string {
    const cands = activeTraits(r.board).filter(t => t.trait.kind !== 'special' && t.tier < t.trait.tiers.length).map(t => ({ id: `emblem_${t.trait.id}`, gap: t.trait.tiers[t.tier].count - t.count, count: t.count })).filter(x => itemById(x.id));
    if (!cands.length) { const all = EMBLEMS(); return all[Math.floor(rng() * all.length)].id; }
    // 거리가 같으면 이미 더 많이 모은(투자한) 시너지를 우선, 그래도 같으면 무작위.
    const best = Math.min(...cands.map(x => x.gap)), near = cands.filter(x => x.gap === best), most = Math.max(...near.map(x => x.count)), top = near.filter(x => x.count === most);
    return top[Math.floor(rng() * top.length)].id;
}
export function mergeStars(r: ExpeditionRun, onStar3?: () => void) {
    for (let guard = 0; guard < 20; guard++) {
        let merged = false;
        for (const star of [1, 2] as const) {
            const units = new Set([...r.board, ...r.bench].filter(x => x.star === star).map(x => x.unit));
            for (const unit of units) {
                const onBoard = r.board.map((x, i) => [x, i] as const).filter(([x]) => x.unit === unit && x.star === star), onBench = r.bench.map((x, i) => [x, i] as const).filter(([x]) => x.unit === unit && x.star === star);
                if (onBoard.length + onBench.length < 3) continue;
                const next = (star + 1) as 2 | 3; if (next === 3) onStar3?.(); let left = 3;
                // 벤치부터 지우고, 보드에 있으면 첫 자리를 승급시킵니다.
                const benchDrop = onBench.slice(0, left).map(([, i]) => i); left -= benchDrop.length;
                const boardDrop = onBoard.slice(0, left).map(([, i]) => i);
                // 6단계: 승급한 유닛은 보드 첫 자리(없으면 벤치 첫 장)의 아이템을 물려받고, 나머지 아이템은 가진 칸으로 돌아갑니다.
                const keep = boardDrop.length ? r.board[boardDrop[0]].item : r.bench[benchDrop[0]]?.item;
                const spare = [...boardDrop.slice(boardDrop.length ? 1 : 0).map(i => r.board[i].item), ...benchDrop.slice(boardDrop.length ? 0 : 1).map(i => r.bench[i].item)].filter((x): x is string => !!x);
                r.bench = r.bench.filter((_, i) => !benchDrop.includes(i));
                if (boardDrop.length) { r.board[boardDrop[0]] = { ...r.board[boardDrop[0]], star: next, ...(keep ? { item: keep } : {}) }; r.board = r.board.filter((_, i) => !boardDrop.slice(1).includes(i)); }
                else r.bench.push({ unit, star: next, ...(keep ? { item: keep } : {}) });
                if (spare.length) (r.items ??= []).push(...spare);
                merged = true;
            }
        }
        if (!merged) return;
    }
}
/** 11단계: 이 판의 보정(주간 규칙 + 고른 증강 + 시작 때 숙련 특전). 화면도 같은 함수를 씁니다. */
export function runMods(r: Pick<ExpeditionRun, 'rule' | 'augments' | 'mastery' | 'renown'>): RunMods {
    return mergeMods([weeklyRuleById(r.rule)?.mods, ...(r.augments || []).map(augmentMods), ...masteryPerks(r.mastery || 1).map(p => p.mods), renownMods(r.renown)]);
}
export const benchCap = (r: ExpeditionRun) => EXPEDITION.bench + (runMods(r).benchPlus || 0);
/** 연승 · 연패 보너스 골드: 2연속 +1, 3연속 +2, 4연속 이상 +3. v3.436 연패에도 같은 값(이기든 지든 흐름을 이어 가면 수입이 늘어남). */
export const streakGold = (n: number) => Math.min(3, Math.max(0, n - 1));
const income = (r: ExpeditionRun) => { const m = runMods(r); return EXPEDITION.baseGold + (m.goldPlus || 0) + Math.min(EXPEDITION.interestMax + (m.interestPlus || 0), Math.floor(r.gold / EXPEDITION.interestPer)) + streakGold(Math.max(r.streak, r.lossStreak || 0)); };
/** 11단계 증강 선택지: 라운드 등급(2 → 1 · 5 → 2 · 8 → 3)의 증강 가운데 아직 안 고른 것 3개(+숙련 특전). 동적 ‘문양’은 보드에서 다음 단계에 가장 가까운 시너지로 구체화하고, 맞는 시너지가 없으면 뺍니다. */
export function rollAugments(r: ExpeditionRun, rng: () => number): string[] {
    const tier = (isAbyssRound(r.round) ? 3 : AUGMENT_ROUNDS.indexOf(r.round) + 1) as 1 | 2 | 3, taken = new Set((r.augments || []).map(id => id.split(':')[0]));
    const pool = AUGMENTS.filter(a => a.tier === tier && !taken.has(a.id) && (!a.set || a.set === setById(r.set).id)).map(a => {
        if (a.dynamic !== 'trait') return a.id;
        const cands = activeTraits(r.board).filter(t => t.trait.kind !== 'special' && t.tier < t.trait.tiers.length).sort((x, y) => (x.trait.tiers[x.tier].count - x.count) - (y.trait.tiers[y.tier].count - y.count) || y.count - x.count);
        return cands.length ? `${a.id}:${cands[0].trait.id}` : '';
    }).filter(Boolean);
    const n = 3 + (runMods(r).augmentPlus || 0), out: string[] = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
}
/** 13단계 과제: 날짜 · 주가 바뀌면 새로 뽑습니다(진행 중이던 것은 사라짐). */
export function ensureQuests(s: State, now: number) {
    const day = dayKey(now), week = weekKey(now), q = s.expeditionQuests ??= { day: '', week: '', daily: [], weekly: [] };
    if (q.day !== day) { q.day = day; q.daily = pickQuests('daily', day).map(id => ({ id, n: 0 })); }
    if (q.week !== week) { q.week = week; q.weekly = pickQuests('weekly', week).map(id => ({ id, n: 0 })); }
    return q;
}
/** 과제 진행: 같은 키의 일일 · 주간 과제가 함께 오르고, 목표에 닿으면 바로 세계석 · 숙련 경험치를 줍니다. */
export function questProgress(s: State, now: number, key: QuestKey, n = 1) {
    const q = ensureQuests(s, now);
    for (const st of [...q.daily, ...q.weekly]) {
        const def = questById(st.id); if (!def || def.key !== key || st.done) continue;
        st.n = Math.min(def.target, st.n + n);
        if (st.n >= def.target) { st.done = true; grantPearls(s, def.pearls); addMasteryXp(s, def.xp); addLog(s, `원정 과제 완료 · ${def.name} · 세계석 +${pearlText(def.pearls)} · 숙련 +${def.xp}`, 'reward'); }
    }
}
/** 20단계 세트 숙련: 영구 숙련과 같은 경험치를 받고 세트마다 따로 쌓입니다(v3.430: 세트가 다시 돌아오면 이어서). 5 · 10 · 15 · 20에 세계석, 20이면 세트 완성 기록(칭호). */
export function addSetMasteryXp(s: State, xp: number, setId: string) {
    let m = s.expeditionSetMastery;
    // v3.430 세트가 바뀌면 지금 숙련을 보관하고, 그 세트의 보관본이 있으면 이어서(없으면 처음부터).
    if (!m || m.set !== setId) { const kept = s.expeditionSetMasteries ??= {}; if (m) kept[m.set] = { level: m.level, xp: m.xp, claimed: m.claimed }; const back = kept[setId]; delete kept[setId]; m = s.expeditionSetMastery = { set: setId, level: back?.level || 1, xp: back?.xp || 0, claimed: back?.claimed || [] }; }
    if (m.level >= SET_MASTERY.max) return;
    m.xp += xp; const before = m.level;
    while (m.level < SET_MASTERY.max && m.xp >= setMasteryXpFor(m.level)) { m.xp -= setMasteryXpFor(m.level); m.level++; }
    if (m.level >= SET_MASTERY.max) m.xp = 0;
    if (m.level > before) {
        let pearls = 0; for (const [lv, p] of Object.entries(SET_MASTERY.rewards)) { const n = Number(lv); if (n > before && n <= m.level && !m.claimed.includes(n)) { m.claimed.push(n); pearls += p; } }
        if (pearls) grantPearls(s, pearls);
        const set = setById(setId);
        if (m.level >= SET_MASTERY.max) (s.expeditionSetDone ??= {})[setId] = (s.expeditionSetDone[setId] || 0) + 1;
        const skinsBefore = setMasteryBest({ ...s, expeditionSetMastery: { level: before } }); s.expeditionSetBest = Math.max(s.expeditionSetBest || 0, m.level);
        const newSkins = UNIT_SKINS.filter(k => k.level > skinsBefore && k.level <= setMasteryBest(s));
        addLog(s, `${set.icon} ${set.name} 세트 숙련 ${m.level}${pearls ? ` · 세계석 +${pearlText(pearls)}` : ''}${m.level >= SET_MASTERY.max ? ' · 세트 완성!' : ''}${newSkins.length ? ` · 유닛 피부 ${newSkins.map(k => `${k.icon} ${k.name}`).join(' · ')} 해금` : ''}`, 'reward');
    }
}
function addMasteryXp(s: State, xp: number, setId?: string) {
    migrateMastery(s);
    addSetMasteryXp(s, xp, setId || s.expedition?.set || activeSet(Date.now()).id);
    const m = s.expeditionMastery ??= { level: 1, xp: 0, total: 0 }, renown = s.expeditionRenown || 0; m.xp += xp; m.total += xp; const before = m.level, prevPeak = m.peak || 0;
    while (m.level < MASTERY_MAX && m.xp >= masteryXpFor(m.level, renown)) { m.xp -= masteryXpFor(m.level, renown); m.level++; }
    m.peak = Math.max(m.peak || 0, m.level);
    if (m.level >= MASTERY_MAX) m.xp = 0;
    if (m.level > before) { const perks = MASTERY_PERKS.filter(p => p.level > Math.max(before, prevPeak) && p.level <= m.level), big = perks.filter(p => !p.minor), small = perks.length - big.length; addLog(s, `원정 숙련 ${m.level} 달성${big.length ? ` · 특전: ${big.map(p => `${p.name}(${p.desc})`).join(', ')}` : ''}${small ? ` · 체력 · 공격력 특전 +${small}` : ''}`, 'reward'); }
}
/** v3.432 숙련 최대 50 → 1000: 전에 명성을 올린 모험가는 명성마다 숙련 50을 찍었으므로 한 번만 49레벨씩 돌려줍니다. */
export function migrateMastery(s: State) {
    if (s.expeditionMasteryV2 || !(s.expeditionRenown! > 0)) { s.expeditionMasteryV2 = true; return; }
    const m = s.expeditionMastery ??= { level: 1, xp: 0, total: 0 }; m.level = Math.min(MASTERY_MAX, m.level + 49 * s.expeditionRenown!); m.peak = Math.max(m.peak || 0, m.level); s.expeditionMasteryV2 = true;
    addLog(s, `원정 숙련 최대가 ${MASTERY_MAX}으로 늘었습니다 · 지난 명성 ${s.expeditionRenown}번만큼 숙련 +${49 * s.expeditionRenown!} → ${m.level}`, 'reward');
}
/** 11단계 숙련: 판이 끝날 때 경험치를 주고 레벨을 올립니다. 올라간 레벨의 특전을 로그로 알립니다. */
function gainMastery(s: State, r: ExpeditionRun, cleared: boolean) {
    const xp = Math.round(masteryRunXp(r.wins, r.acts || 0, cleared) * difficultyOf(r.difficulty).reward); addMasteryXp(s, xp); return xp;
}
const statsOf = (s: State): ExpeditionStats => s.expeditionStats ??= { runs: 0, clears: 0, wins: 0, roundPlays: Array(EXPEDITION.rounds + 1).fill(0), roundWins: Array(EXPEDITION.rounds + 1).fill(0), units: {}, ghostFights: 0, ghostWins: 0 };
/** 3단계: 서버가 a.value에 실어 보낸 라운드별 고스트(다른 플레이어 보드)에서 이 라운드 것을 읽습니다. 모양이 맞지 않으면 무시. */
export function parseGhost(value: string | undefined, round: number, seen?: Record<string, number>): ExpeditionGhost | null {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value) as Record<string, ExpeditionGhost | ExpeditionGhost[] | number>;
        const pool = typeof parsed.pool === 'number' ? Math.max(0, Math.floor(parsed.pool)) : undefined;
        // 22단계: 라운드마다 후보가 여럿이면 이 판에서 가장 적게 만난 계정을 고릅니다(같은 상대 반복 완화).
        const raw = parsed[round], list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as ExpeditionGhost[];
        const g = [...list].sort((x, y) => (seen?.[x.account || x.name] || 0) - (seen?.[y.account || y.name] || 0))[0];
        if (!g || typeof g.name !== 'string' || !Array.isArray(g.board) || !g.board.length || g.board.length > 8) return null;
        if (!g.board.every(p => p && unitById(p.unit) && [1, 2, 3].includes(p.star) && (p.row === 'front' || p.row === 'back') && (p.item === undefined || itemById(p.item)))) return null;
        const wins = Number.isInteger(g.wins) && g.wins! >= 0 && g.wins! <= EXPEDITION.rounds + ABYSS.max ? g.wins : 0;
        // 17단계: 상대의 전투 보정(서버가 스냅샷의 증강 · 규칙 · 숙련으로 계산). 범위를 잘라 받고, 증강 id는 표시용으로 아는 것만.
        const mods = g.mods && typeof g.mods === 'object' ? combatMods(g.mods) : undefined;
        const augments = Array.isArray(g.augments) ? g.augments.filter(id => typeof id === 'string' && augmentById(id)).slice(0, 8) : [];
        return { name: g.name.slice(0, 16), board: g.board.map(p => ({ unit: p.unit, star: p.star, row: p.row, ...(p.item ? { item: p.item } : {}) })), wins, ...(mods ? { mods } : {}), ...(augments.length ? { augments } : {}), ...(typeof g.account === 'string' ? { account: g.account.slice(0, 64) } : {}), ...(pool !== undefined ? { pool } : {}) };
    } catch { return null; }
}
/** 19단계 보스 코어 조각: 보스를 이기면 확률로 조각, per개가 모이면 본편 보스 코어로(획득 · 각성). 돌려주는 값은 떨어진 코어 id. */
export function rollShard(s: State, r: ExpeditionRun, bossUnit: string, abyss: boolean, rng: () => number): string | null {
    if (rng() >= shardChance(r.difficulty || 1, abyss)) return null;
    const core = shardCoreFor(bossUnit, rng), shards = s.expeditionShards ??= {};
    shards[core] = (shards[core] || 0) + 1;
    const name = BOSS_CORES[core]?.name || core;
    if (shards[core] >= CORE_SHARD.per) { shards[core] -= CORE_SHARD.per; grantBossCore(s, core, rng, '원정대 조각 10개'); }
    else addLog(s, `원정대 · 보스 코어 조각 · ${name} ${shards[core]}/${CORE_SHARD.per}`, 'reward');
    return core;
}
// v3.432: 19단계 도감 연결(동 · 은 · 금마다 본편 처치 수)은 도감 성장(codexGrowth: 그 유닛의 체력 · 공격력)으로 바꿨습니다. 이미 받은 처치 수는 그대로입니다.
/** 22단계 고스트 보호: 상대 보드 가치가 그 라운드 웨이브 예산(난이도 반영) × capMult를 넘으면 ★을 낮추고, 그래도 넘으면 가치가 낮은 유닛부터 뺍니다(최소 1명). 바뀌었으면 scaled. */
export function capGhostBoard(board: ExpeditionPlaced[], round: number, difficulty = 1): { board: ExpeditionPlaced[]; scaled: boolean } {
    const cap = Math.round(WAVE_BUDGET[Math.min(WAVE_BUDGET.length - 1, round)] * difficultyOf(difficulty).budget * GHOST_GUARD.capMult);
    const out = board.map(p => ({ ...p })); let scaled = false;
    const value = (p: ExpeditionPlaced) => (unitById(p.unit)?.cost || 0) * (p.star === 3 ? 4 : p.star === 2 ? 2 : 1);
    while (boardValue(out) > cap) {
        const starred = out.filter(p => p.star > 1).sort((a, b) => value(b) - value(a))[0];
        if (starred) { starred.star = (starred.star - 1) as 1 | 2; scaled = true; continue; }
        if (out.length <= 1) break;
        const weakest = [...out].sort((a, b) => value(a) - value(b))[0]; out.splice(out.indexOf(weakest), 1); scaled = true;
    }
    return { board: out, scaled };
}
/** 15단계 도전 기록: 완주 판의 12라운드 보드와 흐름으로 판정합니다. */
export function featsOf(r: ExpeditionRun): string[] {
    const out: string[] = [];
    if (!r.cleared) return out;
    const board = r.history?.[EXPEDITION.rounds] || [];
    if ((r.losses || 0) === 0 && r.wins >= EXPEDITION.rounds) out.push('flawless');
    if (board.length && board.every(p => !p.item)) out.push('noItem');
    if (board.length && new Set(board.map(p => unitById(p.unit)?.origin)).size === 1) out.push('oneOrigin');
    if (board.length && board.every(p => (unitById(p.unit)?.cost || 9) <= 2)) out.push('cheap');
    if ((r.abyss || 0) >= 10) out.push('abyss10');
    if ((r.abyss || 0) >= 20) out.push('abyss20');
    // v3.416 확장 도전.
    if ((r.abyss || 0) >= 30) out.push('abyss30');
    if ((r.abyss || 0) >= ABYSS.max) out.push('abyss40');
    if ((r.difficulty || 1) >= 6 && out.includes('flawless')) out.push('hardFlawless');
    if ((r.difficulty || 1) >= DIFFICULTIES.length) out.push('apexClear');
    return out;
}
/** 판을 마칠 때 받는 세계석(소수 첫째 자리): 승리 · 완주 · 막 보스 · 심연 보너스 × 난이도 배율 × 명성 배율. v3.435 포기 확인 창 미리보기도 같은 값을 씁니다. */
export function runReward(s: Pick<State, 'expeditionRenown'>, r: ExpeditionRun, cleared: boolean) {
    const actPearls = EXPEDITION.actPearls * (runMods(r).actMult || 1), abyssBonus = Math.floor((r.abyss || 0) / ABYSS.bonusEvery) * ABYSS.bonus;
    return Math.round((expeditionReward(r.wins, cleared) + (r.acts || 0) * actPearls + abyssBonus) * difficultyOf(r.difficulty).reward * renownRewardMult(s.expeditionRenown) * 10) / 10;
}
function finish(s: State, r: ExpeditionRun, now: number, why: string) {
    r.done = true; delete r.box; delete r.abyssChoice; delete r.augmentOffer;
    const st = statsOf(s); st.runs++; st.wins += r.wins;
    const cleared = !!r.cleared || r.round > EXPEDITION.rounds || (r.round === EXPEDITION.rounds && r.last?.won && r.hp > 0);
    if (cleared) { st.clears++; r.cleared = true; }
    const actMult = runMods(r).actMult || 1, actPearls = EXPEDITION.actPearls * actMult; // v3.432: 반올림하면 .2 × 배율이 0이 되므로 그대로(전체 보상에서 소수 첫째 자리로 반올림).
    const abyss = r.abyss || 0, abyssBonus = Math.floor(abyss / ABYSS.bonusEvery) * ABYSS.bonus;
    const diff = difficultyOf(r.difficulty);
    // v3.432 보상이 1/10이라 소수 첫째 자리까지(지급은 grantPearls가 모아서 정수로).
    const reward = runReward(s, r, !!cleared);
    r.reward = reward; grantPearls(s, reward);
    if (cleared) (s.expeditionDiffClears ??= {})[diff.level] = (s.expeditionDiffClears[diff.level] || 0) + 1;
    { const best = (s.expeditionDiffBest ??= {})[diff.level] || { wins: 0, abyss: 0 }; best.wins = Math.max(best.wins, r.wins); best.abyss = Math.max(best.abyss, abyss); s.expeditionDiffBest[diff.level] = best; }
    delete s.expeditionDay; s.expeditionBest = Math.max(s.expeditionBest || 0, r.wins);
    if (abyss) s.expeditionAbyssBest = Math.max(s.expeditionAbyssBest || 0, abyss);
    const mxp = gainMastery(s, r, !!cleared);
    questProgress(s, now, 'runs'); if (cleared) questProgress(s, now, 'clears');
    // 15단계: 도전 기록 · 최근 판 요약.
    const feats = featsOf(r); for (const id of feats) (s.expeditionFeats ??= {})[id] = (s.expeditionFeats[id] || 0) + 1;
    const reached = Math.min(r.round, EXPEDITION.rounds + abyss + (r.last?.won === false && isAbyssRound(r.round) ? 1 : 0));
    const code = r.board.length ? encodeBoard(r.board, { set: r.set, augments: r.augments, round: Math.min(reached, EXPEDITION.rounds + ABYSS.max), wins: r.wins, author: s.name, memo: s.expeditionShareMemo }) : '';
    (s.expeditionRecent ??= []).unshift({ at: now, round: Math.min(reached, EXPEDITION.rounds + ABYSS.max), wins: r.wins, cleared: !!cleared, abyss, reward, why, ...(diff.level > 1 ? { difficulty: diff.level } : {}), ...(code ? { code } : {}) }); s.expeditionRecent.splice(8);
    addLog(s, `원정대 ${why}${diff.level > 1 ? ` · ${diff.icon} ${diff.name}(보상 ×${diff.reward})` : ''} · ${r.wins}승 · 세계석 +${pearlText(reward)}${cleared ? ` (완주 +${pearlText(EXPEDITION.clearPearls)})` : ''}${r.acts ? ` (막 보스 ${r.acts} × ${pearlText(actPearls)})` : ''}${abyss ? ` (심연 ${abyss}라운드${abyssBonus ? ` · 보너스 +${pearlText(abyssBonus)}` : ''})` : ''} · 숙련 +${mxp}${feats.length ? ` · 도전 기록: ${feats.map(id => FEATS.find(f => f.id === id)?.name || id).join(', ')}` : ''}`, 'reward');
}

export const expeditionActions: ActionHandlers = {
    /** 9단계: value는 서버가 넣는 지난 시즌 정산(JSON). 같은 시즌은 한 번만 받습니다. 화면이 보낸 값은 서버가 덮어씁니다. */
    expeditionStart(s, { a, now, rng }) {
        migrateMastery(s);
        if (s.expedition && !s.expedition.done) throw Error('이미 원정이 진행 중입니다.');
        ensureQuests(s, now);
        const league = parseLeagueSettlement(a.value);
        if (league && s.expeditionLeague?.claimed !== league.week) {
            const L = s.expeditionLeague ??= { tier: 1 };
            L.claimed = league.week; L.last = league; L.tier = league.nextTier; L.best = Math.max(L.best || 0, league.nextTier); grantPearls(s, league.pearls);
            addLog(s, `원정 주간 리그 ${league.week} 정산 · ${leagueTierName(league.tier)} ${league.rank}위/${league.size}명 · 세계석 +${pearlText(league.pearls)}${league.nextTier > league.tier ? ` · ${leagueTierName(league.nextTier)}로 승급!` : league.nextTier < league.tier ? ` · ${leagueTierName(league.nextTier)}로 강등` : ''}`, 'reward');
        }
        const settle = parseSettlement(a.value);
        if (settle && s.expeditionSeasonClaimed !== settle.season) {
            if (settle.rank) s.expeditionSeasonBest = s.expeditionSeasonBest ? Math.min(s.expeditionSeasonBest, settle.rank) : settle.rank;
            s.expeditionSeasonClaimed = settle.season; s.expeditionSeasonLast = settle; grantPearls(s, settle.pearls);
            addLog(s, `원정대 ${settle.season} 시즌 정산 · ${settle.rank ? `${settle.rank}위` : '순위 밖'}(${settle.total}명 중) · 최고 ${settle.wins}승 · 세계석 +${pearlText(settle.pearls)}`, 'reward');
        }
        // 16단계: 난이도는 a.id(‘1’~‘5’). 열리지 않은 단계는 거부.
        const difficulty = Math.max(1, Math.min(DIFFICULTIES.length, Math.floor(Number(a.id) || 1)));
        if (difficulty > difficultyUnlocked(s.expeditionDiffClears)) throw Error(`난이도 ${difficultyOf(difficulty).name}은(는) 아래 단계를 완주해야 열립니다.`);
        // v3.432 특전은 지금까지 오른 가장 높은 숙련(peak) 기준 — 명성으로 1로 돌아가도 특전은 그대로(화면 안내와 같게).
        const mastery = Math.max(s.expeditionMastery?.level || 1, s.expeditionMastery?.peak || 0), rule = weeklyRule(weekKey(now));
        const set = activeSet(now);
        const r: ExpeditionRun = { round: 1, gold: 0, level: 2, xp: 0, hp: EXPEDITION.hp, wins: 0, streak: 0, board: [], bench: [], shop: [], startedAt: Math.max(now, (s.expedition?.startedAt || 0) + 1), augments: [], rule: rule.id, mastery, set: set.id, ...(combatRenown(s) ? { renown: combatRenown(s) } : {}), ...(difficulty > 1 ? { difficulty } : {}) };
        r.gold = income(r) + masteryPerks(mastery).reduce((n, p) => n + (p.startGold || 0), 0); r.shop = rollShop(r.level, rng, EXPEDITION.shopSize, undefined, lockedBossUnits(s.book), setUnits(r.set));
        s.expedition = r;
        addLog(s, `원정대 출발 · 1라운드 · ${set.icon} ${set.name} 세트${difficulty > 1 ? ` · 난이도 ${difficultyOf(difficulty).icon} ${difficultyOf(difficulty).name}` : ''} · 이번 주 규칙: ${rule.name}(${rule.desc})`, 'system');
    },
    expeditionBuy(s, { a, now }) {
        const r = run(s), i = Number(a.value), id = r.shop[i];
        if (!Number.isInteger(i) || !id) throw Error('살 유닛을 고르세요.');
        const def = unitById(id)!;
        if (r.gold < def.cost) throw Error(`골드가 부족합니다(비용 ${def.cost}).`);
        // v3.435 벤치가 가득해도 같은 유닛 ★1이 이미 2장 있으면(사자마자 ★2로 합쳐져 칸이 늘지 않음) 살 수 있습니다.
        const completesMerge = [...r.board, ...r.bench].filter(x => x.unit === id && x.star === 1).length >= 2;
        if (r.bench.length >= benchCap(r) && !completesMerge) throw Error('벤치가 가득 찼습니다. 배치하거나 팔아서 자리를 비우세요.');
        r.gold -= def.cost; r.shop[i] = null; r.bench.push({ unit: id, star: 1 }); mergeStars(r, () => questProgress(s, now, 'star3'));
    },
    expeditionSell(s, { a }) {
        const r = run(s), [where, iText] = String(a.value || '').split(':'), i = Number(iText);
        const list: (ExpeditionPlaced | ExpeditionBench)[] = where === 'board' ? r.board : where === 'bench' ? r.bench : [];
        const x = list[i]; if (!x) throw Error('팔 유닛을 고르세요.');
        // v3.435 판 아이템은 돌아오므로 가진 칸(ITEM_HOLD)이 가득하면 팔 수 없습니다(해제와 같은 규칙, 전에는 5/4처럼 한도를 넘었음).
        if (x.item && (r.items?.length || 0) >= ITEM_HOLD) throw Error(`아이템 칸이 가득 차(${ITEM_HOLD}개) 아이템을 낀 유닛은 팔 수 없습니다. 아이템을 장착 · 조합해 칸을 비우거나, 먼저 다른 유닛에 옮겨 끼우세요.`);
        r.gold += sellPrice(unitById(x.unit)!.cost, x.star);
        if (x.item) (r.items ??= []).push(x.item);
        if (where === 'board') r.board.splice(i, 1); else r.bench.splice(i, 1);
    },
    expeditionReroll(s, { rng }) {
        const r = run(s), cost = runMods(r).rerollCost ?? EXPEDITION.reroll; if (r.gold < cost) throw Error('골드가 부족합니다.');
        r.gold -= cost; r.shop = rollShop(r.level, rng, EXPEDITION.shopSize, r.round >= EXPEDITION.synergySlotRound ? r.board : undefined, lockedBossUnits(s.book), setUnits(r.set));
    },
    expeditionXp(s) {
        const r = run(s); if (r.level >= 8) throw Error('최대 레벨입니다.'); if (r.gold < EXPEDITION.xp) throw Error('골드가 부족합니다.');
        r.gold -= EXPEDITION.xp; addRunXp(r, EXPEDITION.xpBuy + (runMods(r).xpPlus || 0));
    },
    expeditionPlace(s, { a }) {
        const r = run(s), [where, iText, rowText] = String(a.value || '').split(':'), i = Number(iText);
        if (where === 'bench') {
            const x = r.bench[i]; if (!x) throw Error('배치할 유닛을 고르세요.');
            const row = rowText === 'front' || rowText === 'back' ? rowText : frontRole(unitById(x.unit)!) ? 'front' : 'back';
            if (r.board.length >= slotsOf(r)) throw Error(`배치는 ${slotsOf(r)}명까지입니다(판 레벨 ${r.level}).`);
            if (r.board.filter(b => b.row === row).length >= (row === 'front' ? EXPEDITION.boardFront : EXPEDITION.boardBack)) throw Error(`${row === 'front' ? '앞줄' : '뒷줄'}이 가득 찼습니다.`);
            r.bench.splice(i, 1); r.board.push({ unit: x.unit, star: x.star, row, ...(x.item ? { item: x.item } : {}) });
        } else if (where === 'board') {
            const x = r.board[i]; if (!x) throw Error('내릴 유닛을 고르세요.');
            if (rowText === 'front' || rowText === 'back') { if (x.row === rowText) return; if (r.board.filter(b => b.row === rowText).length >= 4) throw Error('그 줄이 가득 찼습니다.'); x.row = rowText; return; }
            if (r.bench.length >= benchCap(r)) throw Error('벤치가 가득 찼습니다.');
            r.board.splice(i, 1); r.bench.push({ unit: x.unit, star: x.star, ...(x.item ? { item: x.item } : {}) });
        } else throw Error('배치 명령이 잘못되었습니다.');
    },
    /** value: 서버가 넣는 라운드별 고스트 JSON(없으면 웨이브). 2라운드부터 이 라운드 고스트가 있으면 ghostChance로 고스트와 싸웁니다. */
    expeditionFight(s, { a, now, rng }) {
        const r = run(s);
        if (!r.board.length) throw Error('유닛을 한 명 이상 배치하세요.');
        if (r.abyssChoice) throw Error('완주했습니다. 심연으로 계속 갈지, 보상을 받고 마칠지 고르세요.');
        if (r.box?.length) throw Error('상자에서 아이템을 고르거나 건너뛴 뒤 전투하세요.');
        if (r.augmentOffer?.length) throw Error('증강을 하나 고른 뒤 전투하세요.');
        const mods = runMods(r);
        // 10단계: 막 보스 라운드(4 · 8 · 12)는 고스트 없이 보스 웨이브.
        // 22단계 고스트 보호: 후보가 적으면 확률을 낮추고, 같은 상대는 한 판에 2번까지, 보드가 라운드 기준보다 세면 ★을 낮춥니다.
        const boss = isBossRound(r.round), abyss = isAbyssRound(r.round), ghost = r.round >= 2 && !boss && !abyss ? parseGhost(a.value, r.round, r.ghostSeen) : null;
        const ghostKey = ghost ? ghost.account || ghost.name : '', seenCount = ghostKey ? (r.ghostSeen?.[ghostKey] || 0) : 0;
        const poolScale = ghost?.pool !== undefined ? Math.max(GHOST_GUARD.poolMinChance, Math.min(1, ghost.pool / GHOST_GUARD.poolFull)) : 1;
        const useGhost = !!ghost && seenCount < GHOST_GUARD.maxSameRun && rng() < (mods.ghostChance ?? EXPEDITION.ghostChance) * poolScale;
        // v3.423 연습 원정대: 보낸 보드 대신 여기서 다시 만듭니다(난이도 예산 배율 · 적 보정을 웨이브와 똑같이 받고, 보드를 바꿔 보낼 수 없음).
        const starter = useGhost && ghost!.account?.startsWith(STARTER_GHOST.accountPrefix) ? starterGhostById(ghost!.account.slice(STARTER_GHOST.accountPrefix.length)) : undefined;
        if (starter) { ghost!.board = starterBoard({ ...starter, power: starter.power * difficultyOf(r.difficulty).budget }, r.round); delete ghost!.mods; }
        const capped = useGhost ? (starter ? { board: ghost!.board, scaled: false } : capGhostBoard(ghost!.board, r.round, r.difficulty || 1)) : null;
        if (useGhost) (r.ghostSeen ??= {})[ghostKey] = seenCount + 1;
        const wave = useGhost ? capped!.board : rollWave(r.round, rng, r.difficulty || 1, setUnits(r.set)), result = battle(r.board, wave, rng, Math.min(EXPEDITION.maxTurns, mods.maxTurns ?? EXPEDITION.maxTurns), { ...mods, codex: s.expeditionStats?.unitWins }, boss, useGhost && !starter ? ghost!.mods : waveMods(r.round, r.difficulty || 1));
        const won = result.winner === 'a', survivors = result.winner === 'a' ? 0 : Math.round(wave.length * (1 - result.hpLeft.b));
        r.last = { won, turns: result.turns, hpLeft: [Math.round(result.hpLeft.a * 100), Math.round(result.hpLeft.b * 100)], log: result.log.slice(-30), ...(useGhost ? { opponent: ghost!.name, ...(ghost!.augments?.length ? { foeAugments: ghost!.augments } : {}), ...(capped?.scaled ? { scaled: true } : {}) } : {}), foe: wave.map(p => ({ ...p })), frames: result.frames, ...(result.truncated ? { truncated: true } : {}) };
        (r.history ??= {})[r.round] = r.board.map(p => ({ ...p }));
        if (r.augments?.length) (r.augHistory ??= {})[r.round] = [...r.augments];
        const st = statsOf(s); st.roundPlays[r.round] = (st.roundPlays[r.round] || 0) + 1; if (won) st.roundWins[r.round] = (st.roundWins[r.round] || 0) + 1;
        for (const p of r.board) { st.units[p.unit] = (st.units[p.unit] || 0) + 1; if (won) (st.unitWins ??= {})[p.unit] = (st.unitWins[p.unit] || 0) + 1; }
        // 13단계 조합 집계(관리자): 켜진 시너지 조합 키별 전투 · 승. 키가 40개를 넘으면 가장 적게 쓴 키를 버립니다.
        { const active = activeTraits(r.board, mods), key = compKey(active); const comps = st.comps ??= {}, cw = st.compWins ??= {}; comps[key] = (comps[key] || 0) + 1; if (won) cw[key] = (cw[key] || 0) + 1;
          const keys = Object.keys(comps).filter(k => k !== key); if (keys.length >= COMP_KEYS_MAX) { const drop = keys.sort((x, y) => comps[x] - comps[y])[0]; delete comps[drop]; delete cw[drop]; }
          if (won) { questProgress(s, now, 'wins'); if (boss) questProgress(s, now, 'bossWins'); if (useGhost) questProgress(s, now, 'ghostWins'); if (active.some(t => t.tier >= 1 && t.trait.tiers[t.tier - 1].count >= 4)) questProgress(s, now, 'synergy4'); } }
        if (useGhost) { st.ghostFights++; if (won) { st.ghostWins++; if (!starter) r.ghostPoints = (r.ghostPoints || 0) + EXPEDITION.ghostPointPerWin * Math.max(1, ghost!.wins || 0); } } // 연습 원정대는 시즌 고스트 점수 없음
        // 6단계 상자 → 7단계 선택지: 이기면 서로 다른 기본 아이템 3개를 내밀고 하나를 고릅니다(가진 칸이 차 있으면 상자 없음).
        let box: string[] | undefined;
        if (won && boss && !abyss) r.acts = (r.acts || 0) + 1;
        if (won && boss && wave[0]) rollShard(s, r, wave[0].unit, abyss, rng);
        if (won && abyss) r.abyss = (r.abyss || 0) + 1;
        if (!won) r.losses = (r.losses || 0) + 1;
        if (won) { r.wins++; r.streak++; delete r.lossStreak; if ((r.items?.length || 0) < ITEM_HOLD) { const pool = [...BOX_ITEMS(setById(r.set).id)], choices = BOX_CHOICES + (mods.boxPlus || 0), emblem = r.round >= EMBLEM_ROUND || !!mods.emblemEvery; box = []; if (r.round >= TIER2_ROUND) { const top = ITEMS.filter(x => x.tier === 2); box.push(top[Math.floor(rng() * top.length)].id); } while (box.length < choices - (emblem ? 1 : 0) && pool.length) box.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id); if (emblem) box.push(pickEmblem(r, rng)); r.box = box; } } else { r.streak = 0; r.lossStreak = (r.lossStreak || 0) + 1; r.hp = Math.max(0, r.hp - Math.round((EXPEDITION.lossBase + r.round * EXPEDITION.lossPerRound + Math.max(0, wave.length - survivors) * EXPEDITION.lossPerUnit) * (difficultyOf(r.difficulty).loss || 1))); }
        addLog(s, `원정대 ${abyss ? `심연 ${r.round - EXPEDITION.rounds}` : r.round}라운드${boss ? (abyss ? '(심연 보스)' : `(${actOf(r.round)}막 보스)`) : ''} ${won ? '승리' : '패배'}${useGhost ? ` · 상대 ${ghost!.name}` : ''} · ${result.turns}턴 · 남은 체력 ${r.hp}${box ? ` · 상자: ${box.map(id => itemById(id)!.name).join(' / ')} 중 하나` : ''}`, won ? 'reward' : 'battle');
        if (r.hp <= 0) { finish(s, r, now, abyss ? `심연 ${r.round - EXPEDITION.rounds}라운드에서 탈락` : `${r.round}라운드에서 탈락`); return; }
        // 15단계: 12라운드를 이기면 완주. 바로 끝내지 않고 ‘심연으로 계속 / 보상 받고 마치기’를 고르게 합니다(패배로 12라운드를 넘기면 그냥 종료).
        if (r.round === EXPEDITION.rounds) { if (won) { r.cleared = true; r.abyssChoice = true; r.round++; addLog(s, `원정대 완주 · 심연으로 계속 갈 수 있습니다(라운드마다 더 세지고 고스트 없음 · ${ABYSS.bonusEvery}라운드마다 세계석 +${ABYSS.bonus})`, 'reward'); return; } r.round++; finish(s, r, now, '완주'); return; }
        if (abyss && (r.abyss || 0) >= ABYSS.max) { r.round++; finish(s, r, now, '심연 끝'); return; }
        // v3.426 라운드 경험치: 승패와 상관없이 전투를 마치면 받고, 다음 상점은 오른 레벨로 굴립니다.
        if (r.level < 8) { const gained = roundXpFor(r.round); addRunXp(r, gained); r.last.xp = gained; }
        r.round++; r.gold += income(r); r.shop = rollShop(r.level, rng, EXPEDITION.shopSize, r.round >= EXPEDITION.synergySlotRound ? r.board : undefined, lockedBossUnits(s.book), setUnits(r.set));
        if (r.round === 9) questProgress(s, now, 'reach8');
        // 11단계: 2 · 5 · 8라운드 시작 때 증강 선택지. 15단계: 심연에서는 14 · 18 · 22…(4라운드마다) 3등급.
        if (AUGMENT_ROUNDS.includes(r.round) || (isAbyssRound(r.round) && (r.round - EXPEDITION.rounds) % EXPEDITION.actLength === 2)) { const offer = rollAugments(r, rng); if (offer.length) r.augmentOffer = offer; }
    },
    /** 11단계 증강 고르기: value = 선택지 번호. 고르기 전에는 전투할 수 없습니다(건너뛰기 없음). */
    expeditionPickAugment(s, { a, now }) {
        const r = run(s), k = Number(a.value), id = r.augmentOffer?.[k];
        if (!r.augmentOffer?.length) throw Error('고를 증강이 없습니다.');
        if (!id || !augmentById(id)) throw Error('증강을 고르세요.');
        (r.augments ??= []).push(id); delete r.augmentOffer; questProgress(s, now, 'augments');
        const def = augmentById(id)!; if (def.heal) r.hp = Math.min(EXPEDITION.hp, r.hp + def.heal);
        addLog(s, `원정대 증강 · ${augmentName(id)}`, 'reward');
    },
    /** 7단계 상자 고르기: value = 선택지 번호. 건너뛰면 상자가 사라집니다. */
    expeditionPickBox(s, { a, now }) {
        const r = run(s), k = Number(a.value), id = r.box?.[k];
        if (!r.box?.length) throw Error('고를 상자가 없습니다.');
        if (!id || !itemById(id)) throw Error('고를 아이템을 고르세요.');
        if ((r.items?.length || 0) >= ITEM_HOLD) throw Error(`아이템은 ${ITEM_HOLD}개까지 들고 있을 수 있습니다. 장착하거나 조합한 뒤 고르세요.`);
        (r.items ??= []).push(id); delete r.box; if (itemById(id)?.tier === 'emblem') questProgress(s, now, 'emblems');
    },
    expeditionSkipBox(s) { const r = run(s); if (!r.box?.length) throw Error('고를 상자가 없습니다.'); delete r.box; },
    /** 7단계 조합: value 'a:b'(가진 아이템 번호 둘). 조합표에 있는 짝만 합쳐지고, 결과는 가진 칸에 들어갑니다. */
    expeditionCombine(s, { a, now }) {
        const r = run(s), [x, y] = String(a.value || '').split(':').map(Number);
        const items = r.items || [], ia = items[x], ib = items[y];
        if (!Number.isInteger(x) || !Number.isInteger(y) || x === y || !ia || !ib) throw Error('합칠 아이템 둘을 고르세요.');
        const out = comboOf(ia, ib); if (!out) throw Error('이 둘은 합칠 수 없습니다. 조합표를 확인하세요.');
        r.items = items.filter((_, i) => i !== x && i !== y); r.items.push(out.id); questProgress(s, now, 'combines');
        addLog(s, `원정대 조합 · ${itemById(ia)!.name} + ${itemById(ib)!.name} → ${out.name}`, 'reward');
    },
    /** 6단계 장착: value 'bench:i:k' | 'board:i:k'(k = 가진 아이템 번호). 이미 낀 아이템은 가진 칸으로 돌아옵니다. */
    expeditionEquip(s, { a }) {
        const r = run(s), [where, iText, kText] = String(a.value || '').split(':'), i = Number(iText), k = Number(kText);
        const list: (ExpeditionPlaced | ExpeditionBench)[] = where === 'board' ? r.board : where === 'bench' ? r.bench : [];
        const x = list[i], id = r.items?.[k];
        if (!x) throw Error('장착할 유닛을 고르세요.'); if (!id || !itemById(id)) throw Error('장착할 아이템을 고르세요.');
        r.items!.splice(k, 1);
        if (x.item) r.items!.push(x.item);
        x.item = id;
    },
    /** 6단계 해제: value 'bench:i' | 'board:i'. */
    expeditionUnequip(s, { a }) {
        const r = run(s), [where, iText] = String(a.value || '').split(':'), i = Number(iText);
        const list: (ExpeditionPlaced | ExpeditionBench)[] = where === 'board' ? r.board : where === 'bench' ? r.bench : [];
        const x = list[i]; if (!x?.item) throw Error('해제할 아이템이 없습니다.');
        if ((r.items?.length || 0) >= ITEM_HOLD) throw Error(`아이템은 ${ITEM_HOLD}개까지 들고 있을 수 있습니다.`);
        (r.items ??= []).push(x.item); delete x.item;
    },
    expeditionQuit(s, { now }) { const r = run(s); finish(s, r, now, r.cleared ? (r.abyss ? `심연 ${r.abyss}라운드 뒤 마침` : '완주 뒤 마침') : `${r.round}라운드에서 포기`); },
    /** 21단계 원정 명성: 숙련 50(최대)이고 진행 중인 판이 없을 때. 숙련을 1로 되돌리고 명성 +1(다음 주기 경험치 요구 +20%, 세계석 보상 +2%). */
    /** 23단계: 공유 코드를 목표 보드로 삼기(빈 값이면 해제). 상점에 ‘목표’ 표시가 붙고 모은 수를 보여 줍니다. */
    expeditionSetTarget(s, { a }) {
        const code = String(a.value || '').trim();
        if (!code) { delete s.expeditionTarget; return; }
        const shared = decodeBoard(code);
        if (!shared) throw new Error('알 수 없는 공유 코드입니다. TB1.로 시작하는 코드를 붙여 넣어 주세요.');
        s.expeditionTarget = { code: encodeBoard(shared.units, { set: shared.set, augments: shared.augments, round: shared.round, wins: shared.wins, author: shared.author, memo: shared.memo }), units: shared.units, ...(shared.set ? { set: shared.set } : {}), ...(shared.augments.length ? { augments: shared.augments } : {}), ...(shared.wins ? { wins: shared.wins } : {}), ...(shared.round ? { round: shared.round } : {}), ...(shared.author ? { author: shared.author } : {}), ...(shared.memo ? { memo: shared.memo } : {}) };
        addLog(s, `🎯 목표 보드를 정했습니다 · ${shared.units.map(u => `${unitById(u.unit)?.name || u.unit}${u.star > 1 ? `★${u.star}` : ''}`).join(' · ')}`, 'system');
    },
    /** 23단계(3): 내 공유 코드에 붙는 한 줄 메모(40자). 빈 값이면 지움. */
    expeditionShareMemo(s, { a }) {
        const memo = cleanShareText(a.value, SHARE_MEMO_MAX);
        if (memo) s.expeditionShareMemo = memo; else delete s.expeditionShareMemo;
    },
    /** 23단계: 보드 테마 고르기(해금된 것만). */
    expeditionTheme(s, { a }) {
        const t = themeById(String(a.value || ''));
        if (t.id !== String(a.value || '')) throw new Error('없는 테마입니다.');
        if (!t.unlocked(s)) throw new Error(`${t.name} 테마는 아직 잠겨 있습니다: ${t.how}`);
        s.expeditionTheme = t.id === 'default' ? undefined : t.id;
        if (!s.expeditionTheme) delete s.expeditionTheme;
    },
    /** 23단계(2): 유닛 피부 고르기(세트 숙련으로 해금된 것만). */
    expeditionSkin(s, { a }) {
        const k = skinById(String(a.value || ''));
        if (k.id !== String(a.value || '')) throw new Error('없는 피부입니다.');
        if (!skinUnlocked(k, s)) throw new Error(`${k.name} 피부는 아직 잠겨 있습니다: ${k.how}`);
        if (k.id === 'default') delete s.expeditionSkin; else s.expeditionSkin = k.id;
    },
    expeditionRenown(s) {
        if (s.expedition && !s.expedition.done) throw Error('진행 중인 원정을 마친 뒤 올릴 수 있습니다.');
        const m = s.expeditionMastery; if (!m || m.level < MASTERY_MAX) throw Error(`원정 숙련 ${MASTERY_MAX}이 되어야 명성을 올릴 수 있습니다.`);
        s.expeditionRenown = (s.expeditionRenown || 0) + 1; m.peak = Math.max(m.peak || 0, m.level); m.level = 1; m.xp = 0;
        addLog(s, `✨ 원정 명성 ${s.expeditionRenown} · 숙련이 1로 돌아가고 다음 주기 경험치 요구 +${Math.round(RENOWN.xpGrowth * 100 * s.expeditionRenown)}%, 세계석 보상 +${Math.round(RENOWN.rewardPer * 100 * Math.min(RENOWN.rewardCap, s.expeditionRenown))}%`, 'reward');
    },
    /** 15단계: 완주 뒤 심연으로 계속(13라운드 시작: 수입 · 상점). */
    expeditionAbyss(s, { rng }) {
        const r = run(s); if (!r.abyssChoice) throw Error('지금은 심연으로 갈 수 없습니다.');
        delete r.abyssChoice; r.gold += income(r); r.shop = rollShop(r.level, rng, EXPEDITION.shopSize, r.board, lockedBossUnits(s.book), setUnits(r.set));
        addLog(s, '원정대 심연 진입 · 13라운드', 'system');
    },
    /** 15단계: 완주 뒤 보상 받고 마치기. */
    expeditionFinish(s, { now }) { const r = run(s); if (!r.abyssChoice) throw Error('완주 선택 중이 아닙니다.'); finish(s, r, now, '완주'); },
    /** 끝난 판을 치웁니다(화면 정리). */
    expeditionClear(s) { if (s.expedition?.done) delete s.expedition; },
};
