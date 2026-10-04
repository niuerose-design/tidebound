/** v25.6 업적·일일/주간 모험 목표·주간 심연 기록. 난수를 쓰지 않고 저장 상태만 바꿉니다. */
import type { State } from '../types';
import { ACHIEVEMENTS, achievementById } from '../data/achievements';
import { makeGoals, rerollGoal, dayKey, weekKey, DAILY_ALL_BONUS, WEEKLY_ALL_BONUS, goalText, type Goal, type GoalBoard, type GoalKind } from '../data/goals';

/** 새로 달성한 업적을 해금합니다. 보상은 기록 화면에서 받습니다(claimAchievement). 기록이 없던 세이브는 이미 달성한 업적을 조용히 채웁니다. */
export function syncAchievements(s: State, log: (text: string) => void) {
    const first = !s.achievements;
    s.achievements ??= {};
    const got: string[] = [];
    for (const a of ACHIEVEMENTS) {
        if (s.achievements[a.id] !== undefined || a.progress(s) < a.target) continue;
        s.achievements[a.id] = s.turn;
        got.push(a.title);
    }
    if (!got.length) return;
    if (first) log(`업적 ${got.length}개 달성 · 모험 기록 화면에서 보상을 받으세요.`);
    else for (const title of got) log(`업적 달성 · ${title} · 기록 화면에서 보상 받기`);
}
/** 해금했지만 아직 받지 않은 업적. */
export const unclaimedAchievements = (s: Pick<State, 'achievements' | 'achievementClaims'>) => Object.keys(s.achievements || {}).filter(id => !s.achievementClaims?.[id] && achievementById(id));
/** 보상 받기: id 하나 또는 'all'. 세계석·SP는 여기서 더하고, 영구 AP·배율은 받은 업적만 셉니다. */
export function claimAchievements(s: State, id: string) {
    const ids = id === 'all' ? unclaimedAchievements(s) : unclaimedAchievements(s).filter(x => x === id);
    if (!ids.length) throw Error('받을 업적 보상이 없습니다.');
    s.achievementClaims ??= {};
    let pearls = 0, sp = 0;
    for (const x of ids) { const a = achievementById(x)!; s.achievementClaims[x] = true; pearls += a.reward.pearls || 0; sp += a.reward.sp || 0; }
    s.pearls += pearls; s.sp += sp;
    return { count: ids.length, pearls, sp };
}

const board = (s: State, weekly: boolean, now: number): GoalBoard => {
    const key = weekly ? weekKey(now) : dayKey(now);
    const current = weekly ? s.weekly : s.daily;
    if (current?.key === key) return current;
    const fresh = { key, goals: makeGoals(s, key, weekly) };
    if (weekly) s.weekly = fresh; else s.daily = fresh;
    return fresh;
};
/** 한국 시간 자정·월요일에 새 목표판을 깝니다. 지난 판의 미완료 목표는 사라집니다. */
export function syncGoals(s: State, now: number) { board(s, false, now); board(s, true, now); }

function advanceBoard(s: State, b: GoalBoard, weekly: boolean, kind: GoalKind, subject: string | undefined, n: number, log: (text: string) => void) {
    for (const g of b.goals) {
        if (g.claimed || g.kind !== kind || (g.subject && g.subject !== subject)) continue;
        g.progress = Math.min(g.target, g.progress + n);
        if (g.progress < g.target) continue;
        g.claimed = true;
        s.pearls += g.pearls; if (g.essence) s.essence = (s.essence || 0) + g.essence;
        log(`${weekly ? '주간' : '오늘의'} 목표 달성 · ${goalText(g)} · 세계석 +${g.pearls}${g.essence ? ` · 정수 +${g.essence}` : ''}`);
    }
    if (!b.bonus && b.goals.every(g => g.claimed || g.optional)) {
        b.bonus = true; const bonus = weekly ? WEEKLY_ALL_BONUS : DAILY_ALL_BONUS; s.pearls += bonus;
        log(`${weekly ? '주간' : '오늘의'} 목표 모두 달성 · 보너스 세계석 +${bonus}`);
    }
}
/** 처치·정복 때 호출: kind와 대상 id로 일일·주간 목표를 함께 올립니다. */
export function recordGoal(s: State, kind: GoalKind, subject: string | undefined, n: number, log: (text: string) => void) {
    if (kind === 'catch' || kind === 'boss' || kind === 'dungeon') bumpGuildStat(s, kind === 'catch' ? 'catches' : kind === 'boss' ? 'bosses' : 'clears', n, s.lastTick);
    if (!s.daily || !s.weekly) return;
    advanceBoard(s, s.daily, false, kind, subject, n, log);
    advanceBoard(s, s.weekly, true, kind, subject, n, log);
}
/** v27.81 목표 다시 뽑기. id는 'daily:<목표 id>' 또는 'weekly:<목표 id>'. 판을 먼저 오늘 날짜로 맞춥니다. */
export function rerollBoardGoal(s: State, id: string, now: number) {
    const [which, goalId] = id.split(':', 2);
    if (which !== 'daily' && which !== 'weekly') throw Error('목표판을 확인하세요.');
    syncGoals(s, now);
    const weekly = which === 'weekly', b = board(s, weekly, now);
    return { weekly, goal: rerollGoal(s, b, goalId || '', dayKey(now), weekly) };
}
export const goalSummary = (b?: GoalBoard) => b ? { done: b.goals.filter(g => g.claimed).length, total: b.goals.length } : { done: 0, total: 0 };
export type { Goal, GoalBoard };

/** 주간 심연 기록: 이번 주 가장 깊은 층. dirty는 서버가 랭킹에 올릴 때까지 남습니다. */
export function recordAbyssDepth(s: State, depth: number, now: number) {
    const key = weekKey(now);
    if (!s.abyssWeek || s.abyssWeek.key !== key) s.abyssWeek = { key, best: 0 };
    if (depth > s.abyssWeek.best) { s.abyssWeek.best = depth; s.abyssWeek.dirty = true; }
    const g = guildStatsFor(s, now); if (depth > g.abyss) g.abyss = depth;
}
/** v25.11 이번 주 길드 기여 기록. 길드 소속 여부와 무관하게 세고(가볍습니다), 서버가 소속일 때만 올립니다. 주가 바뀌면 처음부터. */
export function guildStatsFor(s: State, now: number) {
    const key = weekKey(now);
    if (!s.guildStats || s.guildStats.key !== key) s.guildStats = { key, catches: 0, clears: 0, bosses: 0, abyss: 0, sentCatches: 0, sentClears: 0, sentBosses: 0, sentAbyss: 0, sentAt: 0 };
    return s.guildStats;
}
function bumpGuildStat(s: State, kind: 'catches' | 'clears' | 'bosses', n: number, now: number) { guildStatsFor(s, now)[kind] += n; }
/** 지난주 순위 보상(세계석). 1위 30 · 2위 20 · 3위 15 · 10위 안 8 · 50위 안 3 · 참가 1. */
export const abyssWeeklyPearls = (rank: number) => rank <= 1 ? 30 : rank === 2 ? 20 : rank === 3 ? 15 : rank <= 10 ? 8 : rank <= 50 ? 3 : 1;
