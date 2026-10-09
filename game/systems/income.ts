/**
 * v3.58 골드 수입 기록: 사냥(턴 처리) 중 늘어난 골드를 플레이 시간 1시간 칸(playMs 기준)에 쌓습니다. 최근 INCOME_HOURS칸만 남깁니다.
 * 부재중 정산도 같은 턴 처리라 함께 셉니다. 판매·환불처럼 턴 밖에서 생긴 골드는 넣지 않습니다(운영 페이지의 ‘사냥 골드 수입’).
 */
import type { State } from '../types';
import { HOUR } from '../data/time';

export const INCOME_HOURS = 24;
export type IncomeBucket = { h: number; g: number };
export const playHour = (s: Pick<State, 'playMs'>) => Math.floor((s.playMs || 0) / HOUR);

/** 이번 턴에 늘어난 골드를 지금 플레이 시간 칸에 더합니다. 0 이하면 아무것도 하지 않습니다. */
export function recordIncome(s: State, gold: number) {
    if (!(gold > 0) || !Number.isFinite(gold)) return;
    const h = playHour(s), log = (s.goldLog ??= []), last = log[log.length - 1];
    if (last && last.h === h) last.g += gold;
    else { log.push({ h, g: gold }); if (log.length > INCOME_HOURS) log.splice(0, log.length - INCOME_HOURS); }
    s.goldEarned = (s.goldEarned || 0) + gold;
}

/**
 * 시간당 골드(v3.207 log를 넘기면 경험치 · 숙련 기록도 같은 방식): 다 채운 최근 칸(지금 칸 제외) 최대 3칸의 평균. 다 채운 칸이 없으면 지금 칸을 경과 시간으로 나눠 추정합니다.
 * 플레이 시간 기준이라 쉬는 동안은 세지 않습니다.
 */
export function incomeRate(s: Pick<State, 'goldLog' | 'playMs'>, log: IncomeBucket[] = s.goldLog || []) {
    const now = Math.floor((s.playMs || 0) / HOUR);
    const done = log.filter(b => b.h < now).slice(-3);
    if (done.length) return { perHour: Math.round(done.reduce((a, b) => a + b.g, 0) / done.length), hours: done.length, estimated: false };
    const cur = log.find(b => b.h === now), part = ((s.playMs || 0) % HOUR) / HOUR;
    return { perHour: cur && part > .05 ? Math.round(cur.g / part) : 0, hours: 0, estimated: true };
}

/**
 * v3.201 처치 경험치 수입 기록(주화 상점 성장권 기준): 일반 처치 경험치를 플레이 시간 1시간 칸에 쌓습니다(누리 보너스 제외, 부재중 정산 포함).
 * 레벨이 낮아지는 환생에서는 지난 생의 기록이 맞지 않아 지웁니다(lifecycle의 환생 유지 목록에 넣지 않음).
 */
export function recordExpIncome(s: State, exp: number) {
    if (!(exp > 0) || !Number.isFinite(exp)) return;
    const h = playHour(s), log = (s.expLog ??= []), last = log[log.length - 1];
    if (last && last.h === h) last.g += exp;
    else { log.push({ h, g: exp }); if (log.length > INCOME_HOURS) log.splice(0, log.length - INCOME_HOURS); }
    s.expEarned = (s.expEarned || 0) + exp;
}
/**
 * v3.207 처치 숙련 수입 기록(운영 페이지 통계): 처치마다 현재 직업에 쌓인 숙련(까미 당첨 · 승천 배율 포함, 부재중 정산 포함)을 goldLog와 같은 칸에 쌓습니다.
 * goldLog처럼 환생해도 남습니다.
 */
export function recordMasteryIncome(s: State, mastery: number) {
    if (!(mastery > 0) || !Number.isFinite(mastery)) return;
    const h = playHour(s), log = (s.masteryLog ??= []), last = log[log.length - 1];
    if (last && last.h === h) last.g += mastery;
    else { log.push({ h, g: mastery }); if (log.length > INCOME_HOURS) log.splice(0, log.length - INCOME_HOURS); }
    s.masteryEarned = (s.masteryEarned || 0) + mastery;
}
/**
 * v3.201 최근 24시간 중 가장 많이 번 1시간(다 채운 칸). 다 채운 칸이 없으면 지금 칸을 경과 시간으로 나눠 추정합니다.
 * 던전(처치 보상 없음)에 오래 있던 유저도 직전 사냥 수준으로 받도록 평균이 아니라 최댓값을 씁니다.
 */
export function bestHourly(log: IncomeBucket[] | undefined, playMs = 0) {
    const now = Math.floor(playMs / HOUR), done = (log || []).filter(b => b.h < now && b.h >= now - INCOME_HOURS);
    if (done.length) return Math.max(...done.map(b => b.g));
    const cur = (log || []).find(b => b.h === now), part = (playMs % HOUR) / HOUR;
    return cur && part > .05 ? Math.round(cur.g / part) : 0;
}
