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
import { jobById } from '../data/classes';
import type { Enemy, State } from '../types';
import { BALANCE, xpNeeded } from '../data/balance';
import { PRIMAL_DROP_PITY, inventoryCap } from '../data/economy';
import { encounterTier, xpWall } from './meta';
import { isHacker } from './hacker';
import { dismantleEssence, keepsAcrossLives } from './equipment';
import { rankState } from '../data/rank';
import { gainLevels, spawn, specialChances, pickSpecial, noteExtreme, type ForcedRare } from './encounter';
import { extremeStage } from './progression';
import { recordIncome, recordExpIncome, recordMasteryIncome } from './income';
import { oneTimeRewards, offlineTally, resetOfflineTally } from './offline-tally';
import { ONYX, onyxBossFor, onyxChance } from '../data/onyx';
import { stageById } from '../data/world';
import { KING, isSpecialId } from '../data/king';
import { variantChances } from '../data/variants';
import { addLog } from './state';
import { FUEL } from '../data/otherworld';

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
type Mark = Counters & { rebirths: number; job: string; stage: string; pity: number; items: Set<string>; fuel: number; fuelBought: number; essenceSpent: number; devoured: number };

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
    return { ...counters(s), rebirths: s.rebirths, job: s.job, stage: s.stage, pity: s.primalDropPity || 0, items: new Set(s.inventory.map(i => i.id)), essenceSpent: s.essenceSpent || 0, devoured: devouredTotal(s), fuel: s.fuel || 0, fuelBought: s.fuelBought || 0 };
}

/**
 * 표본 뒤에도 같은 조건으로 사냥 중인지(아니면 남은 턴은 다 돌립니다).
 * 측정 구간에 레벨이 2 이상 올랐으면 성장이 빨라 표본 비율이 뒤를 대표하지 못하므로(막 시작한 캐릭터 등) 환산하지 않습니다. 이런 캐릭터는 턴이 가벼워 다 돌려도 부담이 작습니다.
 */
export const sampleStable = (s: State, m: Mark) => canSampleOffline(s) && s.stage === m.stage && s.job === m.job && s.rebirths === m.rebirths && s.level - m.level <= OFFLINE_SAMPLE_MAX_LEVELS;
/** v3.231 이계 연료: 측정 구간에 태운 연료(충전분 포함). */
/** v3.246 정수 포식으로 오른 기본 능력치 합. */
const devouredTotal = (s: State) => Object.values(s.devoured || {}).reduce((a, b) => a + (b || 0), 0);
const DEVOUR_KEYS = ['str', 'dex', 'int', 'vit', 'wis', 'luk'] as const;
const fuelDrained = (s: State, m: Mark) => (m.fuel - (s.fuel || 0)) + ((s.fuelBought || 0) - m.fuelBought) * FUEL.perPearl;
/**
 * v3.231 남은 정산 동안 태울 연료를 지금 연료 + 자동 충전으로 감당할 수 있는지. 못 하면 환산하지 않고 남은 턴을 다 돌립니다
 * (연료가 떨어진 뒤의 절전 모드를 실제로 계산해야 하므로). 감당하면 환산 때 그만큼 연료 · 세계석을 뺍니다(extrapolateOffline).
 */
export function fuelCovers(s: State, m: Mark, turns: number, remaining: number) {
    if (!jobById(s.job)?.fuelJob) return true;
    const need = fuelDrained(s, m) * remaining / Math.max(1, turns), spare = s.fuelAuto === undefined ? 0 : Math.max(0, (s.pearls || 0) - s.fuelAuto) * FUEL.perPearl;
    return need <= (s.fuel || 0) + spare;
}

/**
 * 측정 구간(turns턴)에 늘어난 양에서 희귀 처치 · 일회성 보상을 뺀 만큼을 remaining턴만큼 비례해 더합니다. 줄어든 값(소비 · 사망 손실 등)은 더하지 않습니다.
 * 그다음 남은 시간의 희귀 출현 판정을 굴리고, 나온 희귀 몬스터는 step(턴 하나 진행)으로 실제로 싸웁니다.
 */
export function extrapolateOffline(s: State, m: Mark, turns: number, remaining: number, rng: () => number, step: () => void) {
    const k = remaining / turns, grow = (gain: number) => Math.round(Math.max(0, gain) * k);
    const g = gainsSince(s, m);
    addGains(g, rareGains, -1);
    g.pearls -= oneTimeRewards.pearls; g.sp -= oneTimeRewards.sp; g.essence -= oneTimeRewards.essence;
    // v3.231 이계 연료: 측정 구간의 충전(세계석 지출)은 세계석 수입에서 빼지 않고, 남은 정산만큼 비례해 태웁니다(모자라면 자동 충전, fuelCovers가 감당할 때만 여기로 옴).
    const fuelJob = !!jobById(s.job)?.fuelJob, bought = fuelJob ? (s.fuelBought || 0) - m.fuelBought : 0;
    g.pearls += bought;
    if (fuelJob) {
        const drain = Math.round(fuelDrained(s, m) * k), short = Math.max(0, drain - (s.fuel || 0)), buy = Math.ceil(short / FUEL.perPearl);
        s.fuel = Math.max(0, (s.fuel || 0) + buy * FUEL.perPearl - drain);
        s.pearls -= buy;
        s.fuelBought = (s.fuelBought || 0) + buy;
    }
    // v3.246 정수 포식자: 측정 구간에 쓴 정수는 정수 수입에서 빼지 않고(총수입으로 비례), 남은 정산만큼 비례해 씁니다. 정수가 모자라면 쓴 비율만큼만 포식(능력치)도 비례합니다.
    const essenceSpent = (s.essenceSpent || 0) - m.essenceSpent;
    g.essence += essenceSpent;
    let devourShare = 1;
    if (essenceSpent > 0) {
        const want = Math.round(essenceSpent * k), have = (s.essence || 0) + grow(g.essence), spend = Math.min(want, have);
        devourShare = want ? spend / want : 1;
        s.essence = (s.essence || 0) - spend;
        s.essenceSpent = (s.essenceSpent || 0) + spend;
    }
    const devourGain = Math.floor(grow(devouredTotal(s) - m.devoured) * devourShare);
    for (let i = 0; i < devourGain; i++) { const key = DEVOUR_KEYS[Math.floor(rng() * DEVOUR_KEYS.length)]; s.devoured ??= {}; s.devoured[key] = (s.devoured[key] || 0) + 1; }
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
    recordExpIncome(s, exp);
    s.kills += kills;
    s.deaths += grow(g.deaths);
    { const rk = rankState(s); rk.exp += grow(g.rankExp); s.rank = rk; }
    const apply = (target: Record<string, number>, gains: Record<string, number>) => { for (const [id, d] of Object.entries(gains)) { const n = grow(d); if (n > 0) target[id] = (target[id] || 0) + n; } };
    // v3.211 부재중 정산으로 오른 극한 단계도 알립니다(전용 연출 해금 포함).
    const extremeBefore = Object.fromEntries(Object.keys(g.skillPractice).map(id => [id, extremeStage(s, id)]));
    apply(s.jobMastery, g.jobMastery); apply(s.skillPractice, g.skillPractice); apply(s.book, g.book);
    for (const [id, before] of Object.entries(extremeBefore)) noteExtreme(s, id, before);
    recordMasteryIncome(s, grow(g.jobMastery[s.job] || 0));
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
    const region = stageById(s.stage)?.region, onyxBoss = region ? onyxBossFor(region) : undefined;
    const found: ForcedRare[] = [];
    if (onyxBoss && region) {
        s.onyxSeen ??= {};
        for (let i = 0; i < rolls.onyx; i++) {
            const seen = s.onyxSeen[region] || 0;
            if (rng() < onyxChance(encounterTier(s), seen, jobById(s.job)?.onyxFind || 0)) { s.onyxSeen[region] = 0; found.push('onyx'); }
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
    // v3.289 까미 · 누리 · 슬라임(대왕 포함)은 남은 시간의 판정을 한꺼번에 굴려 연달아 싸우므로, 그 전투 · 보상 줄은 한 줄로 묶습니다(보상은 그대로).
    // 레벨업 · 숙련 단계 같은 시스템 · 스킬 줄과 칠흑 · 별빛 전투 줄은 그대로 남깁니다.
    const batch = { count: {} as Record<string, number>, missed: 0, mastery: 0, essence: 0, exp: 0 };
    for (const kind of found) {
        const special = kind !== 'onyx' && kind !== 'starlit', logStart = s.logId, m0 = s.jobMastery[s.job] || 0, e0 = s.essence || 0, lv0 = s.level, x0 = s.exp, booked = () => Object.values(s.book).reduce((a, b) => a + b, 0), b0 = booked();
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
        if (!special) continue;
        s.logs = s.logs.filter(l => l.id <= logStart || (l.type !== 'battle' && l.type !== 'reward'));
        // 도감 처치 수가 늘었으면 잡은 것, 아니면 놓친 것(떠남 · 쓰러짐)입니다.
        if (booked() > b0) batch.count[kind] = (batch.count[kind] || 0) + 1; else batch.missed++;
        batch.mastery += Math.max(0, (s.jobMastery[s.job] || 0) - m0); batch.essence += Math.max(0, (s.essence || 0) - e0);
        let gained = s.exp - x0; for (let lv = lv0; lv < s.level; lv++) gained += xpNeeded(lv, s.rebirths, xpWall(s));
        batch.exp += Math.max(0, gained);
    }
    const n = (k: string) => batch.count[k] || 0, parts = [
        n('mimic') + n('kingMimic') ? `숙련의 까미 ${n('mimic') + n('kingMimic')}마리${n('kingMimic') ? `(대왕 ${n('kingMimic')})` : ''}` : '',
        n('nuri') + n('kingNuri') ? `경험의 누리 ${n('nuri') + n('kingNuri')}마리${n('kingNuri') ? `(대왕 ${n('kingNuri')})` : ''}` : '',
        n('slime') + n('kingSlime') ? `정수의 슬라임 ${n('slime') + n('kingSlime')}마리${n('kingSlime') ? `(대왕 ${n('kingSlime')})` : ''}` : '',
    ].filter(Boolean), gains = [batch.mastery ? `숙련 +${batch.mastery.toLocaleString()}` : '', batch.exp ? `경험치 +${batch.exp.toLocaleString()}` : '', batch.essence ? `정수 +${batch.essence.toLocaleString()}` : ''].filter(Boolean);
    if (parts.length || batch.missed) addLog(s, `✦ 부재중 특별 몬스터 · ${parts.length ? `${parts.join(' · ')} 처치` : '처치 없음'}${gains.length ? ` · ${gains.join(' · ')}` : ''}${batch.missed ? ` · 놓침 ${batch.missed}` : ''}`, 'reward');
    // 싸우던 몬스터로 돌아갑니다. 무리는 싸운 턴 수로 숙련 · 계급을 세므로, 희귀 전투로 흐른 턴만큼 등장 턴을 미룹니다.
    if (!s.enemy && resume && !isOfflineRare(resume)) { if (resume.born !== undefined) resume.born += turns; s.enemy = resume; }
    return { found, turns };
}
