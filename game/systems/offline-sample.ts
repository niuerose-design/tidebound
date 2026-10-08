/**
 * v3.104 부재중 정산 표본 환산(서버 CPU 절약).
 * 긴 부재중 정산(6시간 = 10,800턴)을 턴마다 다 돌리면 잘 키운 캐릭터 한 명에 CPU가 수십 초 들었습니다.
 * 워밍업(OFFLINE_SAMPLE.warmup) 뒤 측정 구간(OFFLINE_SAMPLE.turns)까지만 실제로 돌리고, 남은 턴은 측정 구간에 얻은 양에 비례해 한꺼번에 더합니다.
 *   - 비례해 더하는 것: 경험치(레벨업 포함) · 골드 · 정수 · 세계석 · SP · 처치 수 · 계급 경험치 · 직업/스킬 숙련 · 도감 처치 수 · 사망 수 · 플레이 시간.
 *   - 장비: 측정 구간에 가방에 들어온 장비 수를 비례해 늘린 만큼, 가방 남은 칸까지는 분해 정수로, 넘치는 몫은 가방이 찼을 때처럼 골드(위력 × 3)로 줍니다.
 *     환생해도 남는 장비(칠흑 · 유물 · 계승)는 넣지 않습니다. 태초 천장은 드롭 수만큼 쌓되 다음 실제 드롭이 천장이 되도록 한 칸 남깁니다.
 *   - 희귀 출현(칠흑 보스 · 숙련의 까미 · 경험의 누리 · 별빛 개체)은 비례로 더하지 않고 실제로 계산합니다.
 *     측정 구간의 희귀 처치로 얻은 양은 비례에서 빼고, 측정 구간의 출현 판정 수(offline-tally.ts)를 비례해 남은 시간의 판정을 실제 확률(칠흑은 출현 천장 포함)로 굴린 뒤,
 *     나온 희귀 몬스터는 그 전투만 턴마다 돌립니다(보상 · 드롭 · 천장 · 도감 모두 원래 규칙). 그래서 로또 같은 큰 보상이 표본에 걸렸는지에 따라 몇 배로 흔들리지 않습니다.
 *   - 일일/주간 목표 · 모험 안내의 일회성 보상은 비례에서 뺍니다. 목표 · 업적 진행은 실제로 돈 구간만 셉니다(업적은 다음 턴에 지금 기록으로 다시 확인).
 * 표본 동안 사냥이 멈추거나 사냥터 · 직업 · 환생이 바뀌었으면(자동 환생 · 자동 따라가기 등), 또는 레벨이 2 이상 올랐으면 환산하지 않고 전처럼 남은 턴을 다 돌립니다.
 * 던전 · 랜덤게임 · 해커는 처음부터 환산하지 않습니다.
 */
import type { Enemy, State } from '../types';
import { BALANCE, xpNeeded } from '../data/balance';
import { PRIMAL_DROP_PITY, inventoryCap } from '../data/economy';
import { encounterTier, xpWall } from './meta';
import { isHacker } from './hacker';
import { dismantleEssence, keepsAcrossLives } from './equipment';
import { rankState } from '../data/rank';
import { gainLevels, spawn, specialChances, pickSpecial, type ForcedRare } from './encounter';
import { recordIncome } from './income';
import { oneTimeRewards, offlineTally, resetOfflineTally } from './offline-tally';
import { ONYX, onyxBossFor, onyxChance } from '../data/onyx';
import { STAGES } from '../data/world';
import { KING, isSpecialId } from '../data/king';
import { variantChances } from '../data/variants';

/**
 * warmup: 표본 앞에서 실제로 돌리되 비율 측정에서 빼는 턴 수(10분). 정산은 체력 · 마나가 가득 찬 채로 시작해 첫 사망이 평균보다 늦게 오므로,
 *   이만큼 지난 뒤부터 재야 버티는 힘이 모자란 사냥터의 사망 · 회복 대기가 비율에 제대로 들어갑니다.
 * turns: 그 뒤 실제로 돌리며 비율을 재는 턴 수(30분). 둘을 합친 것보다 정산할 턴이 적으면 환산 없이 다 돌립니다. Infinity면 환산하지 않습니다(분할 정산 시험용).
 */
export const OFFLINE_SAMPLE = { warmup: 300, turns: 900 };
/** 측정 구간에 이보다 많이 레벨이 오르면 환산하지 않습니다(아래 sampleStable). */
export const OFFLINE_SAMPLE_MAX_LEVELS = 1;

/** 비례로 늘리는 누적 값. */
type Counters = {
    level: number; exp: number; gold: number; essence: number; pearls: number; sp: number; kills: number; deaths: number; rankExp: number;
    jobMastery: Record<string, number>; skillPractice: Record<string, number>; book: Record<string, number>;
};
type Gains = Omit<Counters, 'level'>;
type Mark = Counters & { rebirths: number; job: string; stage: string; pity: number; items: Set<string> };

const counters = (s: State): Counters => ({
    level: s.level, exp: s.exp, gold: s.gold, essence: s.essence || 0, pearls: s.pearls, sp: s.sp, kills: s.kills, deaths: s.deaths, rankExp: rankState(s).exp,
    jobMastery: { ...s.jobMastery }, skillPractice: { ...s.skillPractice }, book: { ...s.book },
});
const emptyGains = (): Gains => ({ exp: 0, gold: 0, essence: 0, pearls: 0, sp: 0, kills: 0, deaths: 0, rankExp: 0, jobMastery: {}, skillPractice: {}, book: {} });
/** before 이후 얻은 경험치(레벨업으로 쓴 몫 포함). 환생이 같으므로 레벨 곡선도 같습니다. */
function expGained(s: State, before: Pick<Counters, 'level' | 'exp'>) {
    const wall = xpWall(s);
    let total = s.exp - before.exp;
    for (let level = before.level; level < s.level; level++) total += xpNeeded(level, s.rebirths, wall);
    return total;
}
const mapDiff = (now: Record<string, number>, before: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const [id, v] of Object.entries(now)) { const d = v - (before[id] || 0); if (d) out[id] = d; }
    return out;
};
function gainsSince(s: State, c: Counters): Gains {
    return {
        exp: expGained(s, c), gold: s.gold - c.gold, essence: (s.essence || 0) - c.essence, pearls: s.pearls - c.pearls, sp: s.sp - c.sp, kills: s.kills - c.kills,
        deaths: s.deaths - c.deaths, rankExp: rankState(s).exp - c.rankExp,
        jobMastery: mapDiff(s.jobMastery, c.jobMastery), skillPractice: mapDiff(s.skillPractice, c.skillPractice), book: mapDiff(s.book, c.book),
    };
}
/** into에 g를 sign배 더합니다(맵은 id별로). */
function addGains(into: Gains, g: Gains, sign = 1) {
    for (const k of ['exp', 'gold', 'essence', 'pearls', 'sp', 'kills', 'deaths', 'rankExp'] as const) into[k] += sign * g[k];
    for (const k of ['jobMastery', 'skillPractice', 'book'] as const) for (const [id, n] of Object.entries(g[k])) into[k][id] = (into[k][id] || 0) + sign * n;
}

/** 측정 구간의 희귀 처치로 얻은 양(비례에서 뺌). markOffline이 비웁니다. */
let rareGains: Gains = emptyGains();
/** 비례에서 빼고 남은 시간에 따로 굴리는 희귀 몬스터. */
export const isOfflineRare = (e: Pick<Enemy, 'id' | 'onyx' | 'variant'>) => !!e.onyx || isSpecialId(e.id) || e.variant === 'starlit';
/** 부재중 정산 중 희귀 몬스터 처치 직전에 부릅니다(turn.ts). 돌려받은 값을 처치 뒤 noteOfflineRare에 넘깁니다. */
export const markOfflineRare = (s: State) => (s.catchingUp && s.enemy && isOfflineRare(s.enemy) ? counters(s) : null);
export function noteOfflineRare(s: State, before: Counters | null) { if (before) addGains(rareGains, gainsSince(s, before)); }

/** 표본 환산을 해도 되는 상태(사냥터 자동 사냥 중). */
export const canSampleOffline = (s: State) => s.running && !s.dungeon && !isHacker(s);

export function markOffline(s: State): Mark {
    resetOfflineTally();
    rareGains = emptyGains();
    return { ...counters(s), rebirths: s.rebirths, job: s.job, stage: s.stage, pity: s.primalDropPity || 0, items: new Set(s.inventory.map(i => i.id)) };
}

/**
 * 표본 뒤에도 같은 조건으로 사냥 중인지(아니면 남은 턴은 다 돌립니다).
 * 측정 구간에 레벨이 2 이상 올랐으면 성장이 빨라 표본 비율이 뒤를 대표하지 못하므로(막 시작한 캐릭터 등) 환산하지 않습니다. 이런 캐릭터는 턴이 가벼워 다 돌려도 부담이 작습니다.
 */
export const sampleStable = (s: State, m: Mark) => canSampleOffline(s) && s.stage === m.stage && s.job === m.job && s.rebirths === m.rebirths && s.level - m.level <= OFFLINE_SAMPLE_MAX_LEVELS;

/**
 * 측정 구간(turns턴)에 늘어난 양에서 희귀 처치 · 일회성 보상을 뺀 만큼을 remaining턴만큼 비례해 더합니다. 줄어든 값(소비 · 사망 손실 등)은 더하지 않습니다.
 * 그다음 남은 시간의 희귀 출현 판정을 굴리고, 나온 희귀 몬스터는 step(턴 하나 진행)으로 실제로 싸웁니다.
 */
export function extrapolateOffline(s: State, m: Mark, turns: number, remaining: number, rng: () => number, step: () => void) {
    const k = remaining / turns, grow = (gain: number) => Math.round(Math.max(0, gain) * k);
    const g = gainsSince(s, m);
    addGains(g, rareGains, -1);
    g.pearls -= oneTimeRewards.pearls; g.sp -= oneTimeRewards.sp; g.essence -= oneTimeRewards.essence;
    // 측정 구간에 가방에 들어온 새 장비: 늘린 수만큼 가방 남은 칸까지는 분해 정수, 넘치는 몫은 골드(가방이 찼을 때의 자동 판매와 같은 값).
    const fresh = s.inventory.filter(i => !m.items.has(i.id) && !keepsAcrossLives(i)), items = grow(fresh.length), room = Math.max(0, inventoryCap() - s.inventory.length);
    const avg = (f: (i: State['inventory'][number]) => number) => fresh.length ? fresh.reduce((n, i) => n + f(i), 0) / fresh.length : 0;
    const itemEssence = Math.round(avg(i => dismantleEssence(i, s)) * Math.min(items, room)), itemGold = Math.round(avg(i => i.power * 3) * Math.max(0, items - room));
    const exp = grow(g.exp), gold = grow(g.gold) + itemGold, kills = grow(g.kills);
    s.essence = (s.essence || 0) + grow(g.essence) + itemEssence;
    s.pearls += grow(g.pearls);
    s.sp += grow(g.sp);
    s.gold += gold;
    recordIncome(s, gold);
    s.kills += kills;
    s.deaths += grow(g.deaths);
    { const rk = rankState(s); rk.exp += grow(g.rankExp); s.rank = rk; }
    const apply = (target: Record<string, number>, gains: Record<string, number>) => { for (const [id, d] of Object.entries(gains)) { const n = grow(d); if (n > 0) target[id] = (target[id] || 0) + n; } };
    apply(s.jobMastery, g.jobMastery); apply(s.skillPractice, g.skillPractice); apply(s.book, g.book);
    // 태초 천장: 측정 구간의 드롭 수(천장 카운터 증가분)를 비례해 쌓되, 다음 실제 드롭이 천장이 되도록 한 칸은 남깁니다.
    const pityGain = (s.primalDropPity || 0) >= m.pity ? (s.primalDropPity || 0) - m.pity : 0;
    if (pityGain > 0) s.primalDropPity = Math.min(PRIMAL_DROP_PITY - 1, (s.primalDropPity || 0) + grow(pityGain));
    s.exp += exp;
    gainLevels(s);
    const rare = rareFights(s, { onyx: grow(offlineTally.onyxRolls), special: grow(offlineTally.specialRolls), variant: grow(offlineTally.variantRolls) }, rng, step);
    // 희귀 전투로 실제로 돈 턴은 tickTurn이 플레이 시간에 이미 더했습니다.
    s.playMs = (s.playMs || 0) + Math.max(0, remaining - rare.turns) * BALANCE.turnMs;
    return { exp, gold, kills, rare };
}

/**
 * 남은 시간의 희귀 출현 판정을 원래 확률로 굴리고(칠흑은 출현 천장 onyxSeen 포함), 나온 몬스터와 끝날 때까지(처치 · 떠남 · 쓰러짐) 실제로 싸웁니다.
 * 확률은 판정 묶음을 시작할 때 한 번 계산합니다(남은 시간 동안 같은 사냥터 · 같은 조건).
 */
function rareFights(s: State, rolls: { onyx: number; special: number; variant: number }, rng: () => number, step: () => void) {
    const region = STAGES.find(st => st.id === s.stage)?.region, onyxBoss = region ? onyxBossFor(region) : undefined;
    const found: ForcedRare[] = [];
    if (onyxBoss && region) {
        s.onyxSeen ??= {};
        for (let i = 0; i < rolls.onyx; i++) {
            const seen = s.onyxSeen[region] || 0;
            if (rng() < onyxChance(encounterTier(s), seen)) { s.onyxSeen[region] = 0; found.push('onyx'); }
            else s.onyxSeen[region] = seen + 1;
        }
    }
    if (rolls.special > 0) {
        const chances = specialChances(s);
        for (let i = 0; i < rolls.special; i++) { const kind = pickSpecial(rng(), chances); if (kind) found.push(kind); }
    }
    if (rolls.variant > 0) {
        const p = variantChances(s).starlit || 0;
        if (p > 0) for (let i = 0; i < rolls.variant; i++) if (rng() < p) found.push('starlit');
    }
    let turns = 0;
    if (!found.length) return { found, turns };
    const resume = s.enemy;
    for (const kind of found) {
        if (!s.running || s.dungeon) break;
        // 쓰러져 회복 대기 중이면 회복을 마저 돌립니다(희귀 몬스터를 그냥 기다려 주지 않음).
        for (let t = 0; t < 200 && s.recovery > 0 && s.running; t++) { step(); turns++; }
        s.enemy = null; s.effects = {}; s.playerStun = 0;
        // 칠흑의 출현 천장은 위에서 이미 정리했으므로, 강제 등장이 onyxSeen을 0으로 두는 것과 같습니다.
        spawn(s, rng, kind);
        const foe = s.enemy;
        // 칠흑 보스는 ONYX.turns턴, 대왕은 KING.turns턴 뒤 떠나고, 다른 희귀 몬스터도 교착 안전장치로 끝납니다(여유를 둔 상한).
        for (let t = 0; t < Math.max(ONYX.turns, KING.turns) + 120 && s.enemy === foe && s.running; t++) { step(); turns++; }
        if (s.enemy === foe) s.enemy = null;
    }
    // 싸우던 몬스터로 돌아갑니다. 무리는 싸운 턴 수로 숙련 · 계급을 세므로, 희귀 전투로 흐른 턴만큼 등장 턴을 미룹니다.
    if (!s.enemy && resume && !isOfflineRare(resume)) { if (resume.born !== undefined) resume.born += turns; s.enemy = resume; }
    return { found, turns };
}
