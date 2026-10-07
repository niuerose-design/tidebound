/**
 * v3.104 부재중 정산 표본 환산(서버 CPU 절약).
 * 긴 부재중 정산(6시간 = 10,800턴)을 턴마다 다 돌리면 잘 키운 캐릭터 한 명에 CPU가 수십 초 들었습니다.
 * 앞의 OFFLINE_SAMPLE_TURNS턴만 실제로 돌리고, 남은 턴은 그동안 얻은 양에 비례해 한꺼번에 더합니다.
 *   - 비례해 더하는 것: 경험치(레벨업 포함) · 골드 · 정수 · 세계석 · SP · 처치 수 · 계급 경험치 · 직업/스킬 숙련 · 도감 처치 수 · 사망 수 · 플레이 시간.
 *   - 장비: 표본에서 가방에 들어온 장비 수를 비례해 늘린 만큼, 가방 남은 칸까지는 분해 정수로, 넘치는 몫은 가방이 찼을 때처럼 골드(위력 × 3)로 줍니다.
 *     태초 천장은 드롭 수만큼 쌓되 다음 실제 드롭이 천장이 되도록 한 칸 남깁니다.
 *   - 일일/주간 목표 · 모험 안내의 일회성 보상(one-time-rewards.ts)은 비례에서 뺍니다. 목표 · 업적 진행은 표본 구간만 셉니다(업적은 다음 턴에 지금 기록으로 다시 확인).
 * 표본 동안 사냥이 멈추거나 사냥터 · 직업 · 환생이 바뀌었으면(자동 환생 · 자동 따라가기 등) 환산하지 않고 전처럼 남은 턴을 다 돌립니다.
 * 던전 · 랜덤게임 · 해커는 처음부터 환산하지 않습니다.
 */
import type { State } from '../types';
import { BALANCE, xpNeeded } from '../data/balance';
import { PRIMAL_DROP_PITY } from '../data/economy';
import { xpWall } from './meta';
import { isHacker } from './hacker';
import { dismantleEssence } from './equipment';
import { rankState } from '../data/rank';
import { gainLevels } from './encounter';
import { recordIncome } from './income';
import { inventoryCap } from '../data/economy';
import { oneTimeRewards, resetOneTimeRewards } from './one-time-rewards';

/** turns: 실제로 돌리는 앞쪽 턴 수(30분). 남은 턴이 이보다 적으면 환산 없이 다 돌립니다. Infinity면 환산하지 않습니다(분할 정산 시험용). */
export const OFFLINE_SAMPLE = { turns: 900 };

type Mark = {
    level: number; exp: number; rebirths: number; job: string; stage: string; gold: number; essence: number; pearls: number; sp: number;
    kills: number; deaths: number; rankExp: number; pity: number; items: Set<string>;
    jobMastery: Record<string, number>; skillPractice: Record<string, number>; book: Record<string, number>;
};

/** 표본 환산을 해도 되는 상태(사냥터 자동 사냥 중). */
export const canSampleOffline = (s: State) => s.running && !s.dungeon && !isHacker(s);

export function markOffline(s: State): Mark {
    resetOneTimeRewards();
    return {
        level: s.level, exp: s.exp, rebirths: s.rebirths, job: s.job, stage: s.stage, gold: s.gold, essence: s.essence || 0, pearls: s.pearls, sp: s.sp,
        kills: s.kills, deaths: s.deaths, rankExp: rankState(s).exp, pity: s.primalDropPity || 0, items: new Set(s.inventory.map(i => i.id)),
        jobMastery: { ...s.jobMastery }, skillPractice: { ...s.skillPractice }, book: { ...s.book },
    };
}

/** 표본 뒤에도 같은 조건으로 사냥 중인지(아니면 남은 턴은 다 돌립니다). */
export const sampleStable = (s: State, m: Mark) => canSampleOffline(s) && s.stage === m.stage && s.job === m.job && s.rebirths === m.rebirths;

/** 표본 동안 얻은 경험치(레벨업으로 쓴 몫 포함). 환생이 같으므로 레벨 곡선도 같습니다. */
function expGained(s: State, m: Mark) {
    const wall = xpWall(s);
    let total = s.exp - m.exp;
    for (let level = m.level; level < s.level; level++) total += xpNeeded(level, s.rebirths, wall);
    return Math.max(0, total);
}

/** 표본(turns턴) 동안 늘어난 양을 remaining턴만큼 비례해 더합니다. 줄어든 값(소비 · 사망 손실 등)은 더하지 않습니다. */
export function extrapolateOffline(s: State, m: Mark, turns: number, remaining: number) {
    const k = remaining / turns, grow = (gain: number) => Math.round(Math.max(0, gain) * k);
    const diff = (now: Record<string, number>, before: Record<string, number>, apply: (id: string, n: number) => void) => {
        for (const [id, v] of Object.entries(now)) { const n = grow(v - (before[id] || 0)); if (n > 0) apply(id, n); }
    };
    const once = oneTimeRewards;
    // 표본에서 가방에 들어온 새 장비: 늘린 수만큼 가방 남은 칸까지는 분해 정수, 넘치는 몫은 골드(가방이 찼을 때의 자동 판매와 같은 값).
    const fresh = s.inventory.filter(i => !m.items.has(i.id)), items = grow(fresh.length), room = Math.max(0, inventoryCap(s) - s.inventory.length);
    const avg = (f: (i: State['inventory'][number]) => number) => fresh.length ? fresh.reduce((n, i) => n + f(i), 0) / fresh.length : 0;
    const itemEssence = Math.round(avg(i => dismantleEssence(i, s)) * Math.min(items, room)), itemGold = Math.round(avg(i => i.power * 3) * Math.max(0, items - room));
    const exp = grow(expGained(s, m)), gold = grow(s.gold - m.gold) + itemGold, kills = grow(s.kills - m.kills);
    s.essence = (s.essence || 0) + grow((s.essence || 0) - m.essence - once.essence) + itemEssence;
    s.pearls += grow(s.pearls - m.pearls - once.pearls);
    s.sp += grow(s.sp - m.sp - once.sp);
    s.gold += gold;
    recordIncome(s, gold);
    s.kills += kills;
    s.deaths += grow(s.deaths - m.deaths);
    { const rk = rankState(s); rk.exp += grow(rk.exp - m.rankExp); s.rank = rk; }
    diff(s.jobMastery, m.jobMastery, (id, n) => { s.jobMastery[id] = (s.jobMastery[id] || 0) + n; });
    diff(s.skillPractice, m.skillPractice, (id, n) => { s.skillPractice[id] = (s.skillPractice[id] || 0) + n; });
    diff(s.book, m.book, (id, n) => { s.book[id] = (s.book[id] || 0) + n; });
    // 태초 천장: 표본의 드롭 수(천장 카운터 증가분)를 비례해 쌓되, 다음 실제 드롭이 천장이 되도록 한 칸은 남깁니다.
    const pityGain = (s.primalDropPity || 0) >= m.pity ? (s.primalDropPity || 0) - m.pity : 0;
    if (pityGain > 0) s.primalDropPity = Math.min(PRIMAL_DROP_PITY - 1, (s.primalDropPity || 0) + grow(pityGain));
    s.playMs = (s.playMs || 0) + remaining * BALANCE.turnMs;
    s.exp += exp;
    gainLevels(s);
    return { exp, gold, kills };
}
