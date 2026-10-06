/**
 * v3.55 골드 수입 기록: 사냥(턴 처리) 중 늘어난 골드를 플레이 시간 1시간 칸(playMs 기준)에 쌓습니다. 최근 INCOME_HOURS칸만 남깁니다.
 * 부재중 정산도 같은 턴 처리라 함께 셉니다. 판매·환불처럼 턴 밖에서 생긴 골드는 넣지 않습니다(운영 페이지의 ‘사냥 골드 수입’).
 */
import type { State } from '../types';

export const INCOME_HOURS = 24;
const HOUR = 3600_000;
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
 * 시간당 골드: 다 채운 최근 칸(지금 칸 제외) 최대 3칸의 평균. 다 채운 칸이 없으면 지금 칸을 경과 시간으로 나눠 추정합니다.
 * 플레이 시간 기준이라 쉬는 동안은 세지 않습니다.
 */
export function incomeRate(s: Pick<State, 'goldLog' | 'playMs'>) {
    const log = s.goldLog || [], now = Math.floor((s.playMs || 0) / HOUR);
    const done = log.filter(b => b.h < now).slice(-3);
    if (done.length) return { perHour: Math.round(done.reduce((a, b) => a + b.g, 0) / done.length), hours: done.length, estimated: false };
    const cur = log.find(b => b.h === now), part = ((s.playMs || 0) % HOUR) / HOUR;
    return { perHour: cur && part > .05 ? Math.round(cur.g / part) : 0, hours: 0, estimated: true };
}
