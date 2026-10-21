/**
 * 원정대(오토배틀러) 2단계: 판 상태(State.expedition)와 행동. 8라운드 PvE · 고스트. 5단계부터 횟수 제한 없음, 보상은 승리마다 세계석(완주 보너스).
 * value 규칙 — expeditionBuy: 상점 칸 번호 · expeditionSell: 'bench:i' | 'board:i' · expeditionPlace: 'bench:i:front' | 'bench:i:back' | 'board:i'(벤치로).
 */
import { EXPEDITION, isBossRound, actOf, unitById, sellPrice, itemById, ITEM_HOLD, BOX_ITEMS, BOX_CHOICES, comboOf, EMBLEMS, EMBLEM_ROUND, TIER2_ROUND, ITEMS, seasonPearls, type SeasonSettlement,
    AUGMENTS, AUGMENT_ROUNDS, augmentById, augmentMods, augmentName, weeklyRule, weeklyRuleById, masteryPerks, masteryXpFor, masteryRunXp, MASTERY_MAX, MASTERY_PERKS, mergeMods, type RunMods,
    pickQuests, questById, compKey, COMP_KEYS_MAX, type QuestKey, ABYSS, isAbyssRound, FEATS, DIFFICULTIES, difficultyOf, difficultyUnlocked, combatMods,
    lockedBossUnits, CORE_SHARD, shardChance, shardCoreFor, CODEX_LINK_KILLS, CODEX_TIERS, codexTier,
    activeSet, setById, setUnits, SET_MASTERY, setMasteryXpFor } from '../../data/expedition';
import { grantBossCore } from '../boss-loot';
import { BOSS_CORES } from '../../data/boss-core';
import { weekKey, dayKey } from '../../data/time';
import { rollShop, rollWave, battle, frontRole, activeTraits } from '../expedition';
import { addLog } from '../state';
import type { State, ExpeditionRun, ExpeditionPlaced, ExpeditionBench, ExpeditionStats, ExpeditionGhost } from '../../types';
import type { ActionHandlers } from './types';

const run = (s: State): ExpeditionRun => { const r = s.expedition; if (!r || r.done) throw Error('진행 중인 원정이 없습니다.'); return r; };
const slotsOf = (r: ExpeditionRun) => EXPEDITION.boardSlots[Math.min(EXPEDITION.boardSlots.length - 1, r.level)];
/** 5단계: 보상 세계석 = 승수 × pearlsPerWin + (완주면 clearPearls). 환생 배율 없음. */
export const expeditionReward = (wins: number, cleared: boolean) => wins * EXPEDITION.pearlsPerWin + (cleared ? EXPEDITION.clearPearls : 0);
/** 같은 유닛 · 같은 ★이 3개 모이면 한 단계 올립니다(보드에 있던 자리는 유지, 나머지는 사라짐). 더 합칠 것이 없을 때까지. */
/** 9단계 시즌 정산 검증: 서버가 만든 값만 믿되 모양은 확인합니다. 세계석은 순위에서 다시 계산(값 위조 방지). */
export function parseSettlement(value: unknown): SeasonSettlement | null {
    if (typeof value !== 'string' || !value) return null;
    try {
        const v = JSON.parse(value) as Partial<SeasonSettlement>;
        if (!/^\d{4}-\d{2}$/.test(String(v.season)) || !Number.isInteger(v.rank) || !Number.isInteger(v.total)) return null;
        const rank = Math.max(0, v.rank!), wins = Math.max(0, Math.floor(Number(v.wins) || 0));
        return { season: v.season!, rank, total: Math.max(rank, v.total!), wins, pearls: seasonPearls(rank) };
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
export function runMods(r: Pick<ExpeditionRun, 'rule' | 'augments' | 'mastery'>): RunMods {
    return mergeMods([weeklyRuleById(r.rule)?.mods, ...(r.augments || []).map(augmentMods), ...masteryPerks(r.mastery || 1).map(p => p.mods)]);
}
export const benchCap = (r: ExpeditionRun) => EXPEDITION.bench + (runMods(r).benchPlus || 0);
const income = (r: ExpeditionRun) => { const m = runMods(r); return EXPEDITION.baseGold + (m.goldPlus || 0) + Math.min(EXPEDITION.interestMax + (m.interestPlus || 0), Math.floor(r.gold / EXPEDITION.interestPer)) + Math.min(3, Math.max(0, r.streak - 1)); };
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
        if (st.n >= def.target) { st.done = true; s.pearls = (s.pearls || 0) + def.pearls; addMasteryXp(s, def.xp); addLog(s, `원정 과제 완료 · ${def.name} · 세계석 +${def.pearls} · 숙련 +${def.xp}`, 'reward'); }
    }
}
/** 20단계 세트 숙련: 영구 숙련과 같은 경험치를 받되 세트가 바뀌면 처음부터. 5 · 10 · 15 · 20에 세계석, 20이면 세트 완성 기록(칭호). */
export function addSetMasteryXp(s: State, xp: number, setId: string) {
    let m = s.expeditionSetMastery;
    if (!m || m.set !== setId) m = s.expeditionSetMastery = { set: setId, level: 1, xp: 0, claimed: [] };
    if (m.level >= SET_MASTERY.max) return;
    m.xp += xp; const before = m.level;
    while (m.level < SET_MASTERY.max && m.xp >= setMasteryXpFor(m.level)) { m.xp -= setMasteryXpFor(m.level); m.level++; }
    if (m.level >= SET_MASTERY.max) m.xp = 0;
    if (m.level > before) {
        let pearls = 0; for (const [lv, p] of Object.entries(SET_MASTERY.rewards)) { const n = Number(lv); if (n > before && n <= m.level && !m.claimed.includes(n)) { m.claimed.push(n); pearls += p; } }
        if (pearls) s.pearls = (s.pearls || 0) + pearls;
        const set = setById(setId);
        if (m.level >= SET_MASTERY.max) (s.expeditionSetDone ??= {})[setId] = (s.expeditionSetDone[setId] || 0) + 1;
        addLog(s, `${set.icon} ${set.name} 세트 숙련 ${m.level}${pearls ? ` · 세계석 +${pearls}` : ''}${m.level >= SET_MASTERY.max ? ' · 세트 완성!' : ''}`, 'reward');
    }
}
function addMasteryXp(s: State, xp: number, setId?: string) {
    addSetMasteryXp(s, xp, setId || s.expedition?.set || activeSet(Date.now()).id);
    const m = s.expeditionMastery ??= { level: 1, xp: 0, total: 0 }; m.xp += xp; m.total += xp; const before = m.level;
    while (m.level < MASTERY_MAX && m.xp >= masteryXpFor(m.level)) { m.xp -= masteryXpFor(m.level); m.level++; }
    if (m.level >= MASTERY_MAX) m.xp = 0;
    if (m.level > before) { const perks = MASTERY_PERKS.filter(p => p.level > before && p.level <= m.level); addLog(s, `원정 숙련 ${m.level} 달성${perks.length ? ` · 특전: ${perks.map(p => `${p.name}(${p.desc})`).join(', ')}` : ''}`, 'reward'); }
}
/** 11단계 숙련: 판이 끝날 때 경험치를 주고 레벨을 올립니다. 올라간 레벨의 특전을 로그로 알립니다. */
function gainMastery(s: State, r: ExpeditionRun, cleared: boolean) {
    const xp = Math.round(masteryRunXp(r.wins, r.acts || 0, cleared) * difficultyOf(r.difficulty).reward); addMasteryXp(s, xp); return xp;
}
const statsOf = (s: State): ExpeditionStats => s.expeditionStats ??= { runs: 0, clears: 0, wins: 0, roundPlays: Array(EXPEDITION.rounds + 1).fill(0), roundWins: Array(EXPEDITION.rounds + 1).fill(0), units: {}, ghostFights: 0, ghostWins: 0 };
/** 3단계: 서버가 a.value에 실어 보낸 라운드별 고스트(다른 플레이어 보드)에서 이 라운드 것을 읽습니다. 모양이 맞지 않으면 무시. */
export function parseGhost(value: string | undefined, round: number): ExpeditionGhost | null {
    if (!value) return null;
    try {
        const g = (JSON.parse(value) as Record<number, ExpeditionGhost>)?.[round];
        if (!g || typeof g.name !== 'string' || !Array.isArray(g.board) || !g.board.length || g.board.length > 8) return null;
        if (!g.board.every(p => p && unitById(p.unit) && [1, 2, 3].includes(p.star) && (p.row === 'front' || p.row === 'back') && (p.item === undefined || itemById(p.item)))) return null;
        const wins = Number.isInteger(g.wins) && g.wins! >= 0 && g.wins! <= EXPEDITION.rounds + ABYSS.max ? g.wins : 0;
        // 17단계: 상대의 전투 보정(서버가 스냅샷의 증강 · 규칙 · 숙련으로 계산). 범위를 잘라 받고, 증강 id는 표시용으로 아는 것만.
        const mods = g.mods && typeof g.mods === 'object' ? combatMods(g.mods) : undefined;
        const augments = Array.isArray(g.augments) ? g.augments.filter(id => typeof id === 'string' && augmentById(id)).slice(0, 8) : [];
        return { name: g.name.slice(0, 16), board: g.board.map(p => ({ unit: p.unit, star: p.star, row: p.row, ...(p.item ? { item: p.item } : {}) })), wins, ...(mods ? { mods } : {}), ...(augments.length ? { augments } : {}) };
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
/** 19단계 도감 연결: 유닛 도감이 동 · 은 · 금에 닿으면 그 유닛의 본편 몬스터 처치 수를 더합니다(한 단계에 한 번). */
export function linkCodex(s: State, unitId: string) {
    const def = unitById(unitId); if (!def) return 0;
    const tier = codexTier(s.expeditionStats?.unitWins?.[unitId] || 0), given = (s.expeditionCodexLinked ??= {})[unitId] || 0;
    let added = 0;
    for (let t = given + 1; t <= tier; t++) added += CODEX_LINK_KILLS[t - 1] || 0;
    if (!added) return 0;
    s.expeditionCodexLinked[unitId] = tier; s.book[def.monster] = (s.book[def.monster] || 0) + added;
    addLog(s, `원정 도감 ${CODEX_TIERS[tier - 1].name} · ${def.name} → 본편 도감 ${def.name} 처치 +${added}(연구가 빨라집니다)`, 'reward');
    return added;
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
    if ((r.abyss || 0) >= ABYSS.max) out.push('abyss20');
    return out;
}
function finish(s: State, r: ExpeditionRun, now: number, why: string) {
    r.done = true; delete r.box; delete r.abyssChoice; delete r.augmentOffer;
    const st = statsOf(s); st.runs++; st.wins += r.wins;
    const cleared = !!r.cleared || r.round > EXPEDITION.rounds || (r.round === EXPEDITION.rounds && r.last?.won && r.hp > 0);
    if (cleared) { st.clears++; r.cleared = true; }
    const actMult = runMods(r).actMult || 1, actPearls = Math.round(EXPEDITION.actPearls * actMult);
    const abyss = r.abyss || 0, abyssBonus = Math.floor(abyss / ABYSS.bonusEvery) * ABYSS.bonus;
    const diff = difficultyOf(r.difficulty);
    const reward = Math.round((expeditionReward(r.wins, !!cleared) + (r.acts || 0) * actPearls + abyssBonus) * diff.reward);
    r.reward = reward; s.pearls = (s.pearls || 0) + reward;
    if (cleared) (s.expeditionDiffClears ??= {})[diff.level] = (s.expeditionDiffClears[diff.level] || 0) + 1;
    { const best = (s.expeditionDiffBest ??= {})[diff.level] || { wins: 0, abyss: 0 }; best.wins = Math.max(best.wins, r.wins); best.abyss = Math.max(best.abyss, abyss); s.expeditionDiffBest[diff.level] = best; }
    delete s.expeditionDay; s.expeditionBest = Math.max(s.expeditionBest || 0, r.wins);
    if (abyss) s.expeditionAbyssBest = Math.max(s.expeditionAbyssBest || 0, abyss);
    const mxp = gainMastery(s, r, !!cleared);
    questProgress(s, now, 'runs'); if (cleared) questProgress(s, now, 'clears');
    // 15단계: 도전 기록 · 최근 판 요약.
    const feats = featsOf(r); for (const id of feats) (s.expeditionFeats ??= {})[id] = (s.expeditionFeats[id] || 0) + 1;
    const reached = Math.min(r.round, EXPEDITION.rounds + abyss + (r.last?.won === false && isAbyssRound(r.round) ? 1 : 0));
    (s.expeditionRecent ??= []).unshift({ at: now, round: Math.min(reached, EXPEDITION.rounds + ABYSS.max), wins: r.wins, cleared: !!cleared, abyss, reward, why, ...(diff.level > 1 ? { difficulty: diff.level } : {}) }); s.expeditionRecent.splice(8);
    addLog(s, `원정대 ${why}${diff.level > 1 ? ` · ${diff.icon} ${diff.name}(보상 ×${diff.reward})` : ''} · ${r.wins}승 · 세계석 +${reward}${cleared ? ` (완주 +${EXPEDITION.clearPearls})` : ''}${r.acts ? ` (막 보스 ${r.acts} × ${actPearls})` : ''}${abyss ? ` (심연 ${abyss}라운드${abyssBonus ? ` · 보너스 +${abyssBonus}` : ''})` : ''} · 숙련 +${mxp}${feats.length ? ` · 도전 기록: ${feats.map(id => FEATS.find(f => f.id === id)?.name || id).join(', ')}` : ''}`, 'reward');
}

export const expeditionActions: ActionHandlers = {
    /** 9단계: value는 서버가 넣는 지난 시즌 정산(JSON). 같은 시즌은 한 번만 받습니다. 화면이 보낸 값은 서버가 덮어씁니다. */
    expeditionStart(s, { a, now, rng }) {
        if (s.expedition && !s.expedition.done) throw Error('이미 원정이 진행 중입니다.');
        ensureQuests(s, now);
        const settle = parseSettlement(a.value);
        if (settle && s.expeditionSeasonClaimed !== settle.season) {
            if (settle.rank) s.expeditionSeasonBest = s.expeditionSeasonBest ? Math.min(s.expeditionSeasonBest, settle.rank) : settle.rank;
            s.expeditionSeasonClaimed = settle.season; s.expeditionSeasonLast = settle; s.pearls = (s.pearls || 0) + settle.pearls;
            addLog(s, `원정대 ${settle.season} 시즌 정산 · ${settle.rank ? `${settle.rank}위` : '순위 밖'}(${settle.total}명 중) · 최고 ${settle.wins}승 · 세계석 +${settle.pearls}`, 'reward');
        }
        // 16단계: 난이도는 a.id(‘1’~‘5’). 열리지 않은 단계는 거부.
        const difficulty = Math.max(1, Math.min(DIFFICULTIES.length, Math.floor(Number(a.id) || 1)));
        if (difficulty > difficultyUnlocked(s.expeditionDiffClears)) throw Error(`난이도 ${difficultyOf(difficulty).name}은(는) 아래 단계를 완주해야 열립니다.`);
        const mastery = s.expeditionMastery?.level || 1, rule = weeklyRule(weekKey(now));
        const set = activeSet(now);
        const r: ExpeditionRun = { round: 1, gold: 0, level: 2, xp: 0, hp: EXPEDITION.hp, wins: 0, streak: 0, board: [], bench: [], shop: [], startedAt: Math.max(now, (s.expedition?.startedAt || 0) + 1), augments: [], rule: rule.id, mastery, set: set.id, ...(difficulty > 1 ? { difficulty } : {}) };
        r.gold = income(r) + masteryPerks(mastery).reduce((n, p) => n + (p.startGold || 0), 0); r.shop = rollShop(r.level, rng, EXPEDITION.shopSize, undefined, lockedBossUnits(s.book), setUnits(r.set));
        s.expedition = r;
        addLog(s, `원정대 출발 · 1라운드 · ${set.icon} ${set.name} 세트${difficulty > 1 ? ` · 난이도 ${difficultyOf(difficulty).icon} ${difficultyOf(difficulty).name}` : ''} · 이번 주 규칙: ${rule.name}(${rule.desc})`, 'system');
    },
    expeditionBuy(s, { a, now }) {
        const r = run(s), i = Number(a.value), id = r.shop[i];
        if (!Number.isInteger(i) || !id) throw Error('살 유닛을 고르세요.');
        const def = unitById(id)!;
        if (r.gold < def.cost) throw Error(`골드가 부족합니다(비용 ${def.cost}).`);
        if (r.bench.length >= benchCap(r)) throw Error('벤치가 가득 찼습니다. 배치하거나 팔아서 자리를 비우세요.');
        r.gold -= def.cost; r.shop[i] = null; r.bench.push({ unit: id, star: 1 }); mergeStars(r, () => questProgress(s, now, 'star3'));
    },
    expeditionSell(s, { a }) {
        const r = run(s), [where, iText] = String(a.value || '').split(':'), i = Number(iText);
        const list: (ExpeditionPlaced | ExpeditionBench)[] = where === 'board' ? r.board : where === 'bench' ? r.bench : [];
        const x = list[i]; if (!x) throw Error('팔 유닛을 고르세요.');
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
        r.gold -= EXPEDITION.xp; r.xp += EXPEDITION.xp + (runMods(r).xpPlus || 0);
        while (r.level < 8 && r.xp >= EXPEDITION.xpToLevel[r.level]) { r.xp -= EXPEDITION.xpToLevel[r.level]; r.level++; }
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
        const boss = isBossRound(r.round), abyss = isAbyssRound(r.round), ghost = r.round >= 2 && !boss && !abyss ? parseGhost(a.value, r.round) : null, useGhost = !!ghost && rng() < (mods.ghostChance ?? EXPEDITION.ghostChance);
        const wave = useGhost ? ghost!.board : rollWave(r.round, rng, r.difficulty || 1, setUnits(r.set)), result = battle(r.board, wave, rng, Math.min(EXPEDITION.maxTurns, mods.maxTurns ?? EXPEDITION.maxTurns), mods, boss, useGhost ? ghost!.mods : undefined);
        const won = result.winner === 'a', survivors = result.winner === 'a' ? 0 : Math.round(wave.length * (1 - result.hpLeft.b));
        r.last = { won, turns: result.turns, hpLeft: [Math.round(result.hpLeft.a * 100), Math.round(result.hpLeft.b * 100)], log: result.log.slice(-30), ...(useGhost ? { opponent: ghost!.name, ...(ghost!.augments?.length ? { foeAugments: ghost!.augments } : {}) } : {}), foe: wave.map(p => ({ ...p })), frames: result.frames, ...(result.truncated ? { truncated: true } : {}) };
        (r.history ??= {})[r.round] = r.board.map(p => ({ ...p }));
        if (r.augments?.length) (r.augHistory ??= {})[r.round] = [...r.augments];
        const st = statsOf(s); st.roundPlays[r.round] = (st.roundPlays[r.round] || 0) + 1; if (won) st.roundWins[r.round] = (st.roundWins[r.round] || 0) + 1;
        for (const p of r.board) { st.units[p.unit] = (st.units[p.unit] || 0) + 1; if (won) { (st.unitWins ??= {})[p.unit] = (st.unitWins[p.unit] || 0) + 1; linkCodex(s, p.unit); } }
        // 13단계 조합 집계(관리자): 켜진 시너지 조합 키별 전투 · 승. 키가 40개를 넘으면 가장 적게 쓴 키를 버립니다.
        { const active = activeTraits(r.board, mods), key = compKey(active); const comps = st.comps ??= {}, cw = st.compWins ??= {}; comps[key] = (comps[key] || 0) + 1; if (won) cw[key] = (cw[key] || 0) + 1;
          const keys = Object.keys(comps).filter(k => k !== key); if (keys.length >= COMP_KEYS_MAX) { const drop = keys.sort((x, y) => comps[x] - comps[y])[0]; delete comps[drop]; delete cw[drop]; }
          if (won) { questProgress(s, now, 'wins'); if (boss) questProgress(s, now, 'bossWins'); if (useGhost) questProgress(s, now, 'ghostWins'); if (active.some(t => t.tier >= 1 && t.trait.tiers[t.tier - 1].count >= 4)) questProgress(s, now, 'synergy4'); } }
        if (useGhost) { st.ghostFights++; if (won) { st.ghostWins++; r.ghostPoints = (r.ghostPoints || 0) + EXPEDITION.ghostPointPerWin * Math.max(1, ghost!.wins || 0); } }
        // 6단계 상자 → 7단계 선택지: 이기면 서로 다른 기본 아이템 3개를 내밀고 하나를 고릅니다(가진 칸이 차 있으면 상자 없음).
        let box: string[] | undefined;
        if (won && boss && !abyss) r.acts = (r.acts || 0) + 1;
        if (won && boss && wave[0]) rollShard(s, r, wave[0].unit, abyss, rng);
        if (won && abyss) r.abyss = (r.abyss || 0) + 1;
        if (!won) r.losses = (r.losses || 0) + 1;
        if (won) { r.wins++; r.streak++; if ((r.items?.length || 0) < ITEM_HOLD) { const pool = [...BOX_ITEMS(setById(r.set).id)], choices = BOX_CHOICES + (mods.boxPlus || 0), emblem = r.round >= EMBLEM_ROUND || !!mods.emblemEvery; box = []; if (r.round >= TIER2_ROUND) { const top = ITEMS.filter(x => x.tier === 2); box.push(top[Math.floor(rng() * top.length)].id); } while (box.length < choices - (emblem ? 1 : 0) && pool.length) box.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id); if (emblem) box.push(pickEmblem(r, rng)); r.box = box; } } else { r.streak = 0; r.hp = Math.max(0, r.hp - (EXPEDITION.lossBase + r.round * EXPEDITION.lossPerRound + Math.max(0, wave.length - survivors) * EXPEDITION.lossPerUnit)); }
        addLog(s, `원정대 ${abyss ? `심연 ${r.round - EXPEDITION.rounds}` : r.round}라운드${boss ? (abyss ? '(심연 보스)' : `(${actOf(r.round)}막 보스)`) : ''} ${won ? '승리' : '패배'}${useGhost ? ` · 상대 ${ghost!.name}` : ''} · ${result.turns}턴 · 남은 체력 ${r.hp}${box ? ` · 상자: ${box.map(id => itemById(id)!.name).join(' / ')} 중 하나` : ''}`, won ? 'reward' : 'battle');
        if (r.hp <= 0) { finish(s, r, now, abyss ? `심연 ${r.round - EXPEDITION.rounds}라운드에서 탈락` : `${r.round}라운드에서 탈락`); return; }
        // 15단계: 12라운드를 이기면 완주. 바로 끝내지 않고 ‘심연으로 계속 / 보상 받고 마치기’를 고르게 합니다(패배로 12라운드를 넘기면 그냥 종료).
        if (r.round === EXPEDITION.rounds) { if (won) { r.cleared = true; r.abyssChoice = true; r.round++; addLog(s, `원정대 완주 · 심연으로 계속 갈 수 있습니다(라운드마다 더 세지고 고스트 없음 · ${ABYSS.bonusEvery}라운드마다 세계석 +${ABYSS.bonus})`, 'reward'); return; } r.round++; finish(s, r, now, '완주'); return; }
        if (abyss && (r.abyss || 0) >= ABYSS.max) { r.round++; finish(s, r, now, '심연 끝'); return; }
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
