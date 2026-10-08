/** 한국 시간 도우미와 일 · 주 · 월 키. 서버 · 클라이언트가 같은 값을 보도록 모두 한국 시간 기준입니다. */
export const HOUR = 3600_000, DAY = 86400_000;
/** 한국 시간(UTC+9) 오프셋. kstIso(t)는 그 시각의 한국 시간을 ISO 문자열로(끝의 Z는 무시하고 앞부분만 잘라 씁니다). */
export const KST = 9 * HOUR;
export const kstIso = (t: number) => new Date(t + KST).toISOString();
/** 한국 시간 기준 시(0~23)와 날짜 키(YYYY-MM-DD). */
export function kst(now: number) {
    const d = new Date(now + KST);
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), date: d.toISOString().slice(0, 10), dayStart: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KST };
}

/** 한국 시간 기준 날짜 키(YYYY-MM-DD)와 ISO 주 키(YYYY-Www). */
export const dayKey = (now: number) => kst(now).date;
export function weekKey(now: number) {
    const d = new Date(kst(now).date + 'T00:00:00Z');
    const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3);
    const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d.getTime() - first.getTime()) / DAY - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
/** v3.106 다음 초기화 시각(밀리초): 일일은 다음 한국 시간 자정, 주간은 다음 월요일 0시(한국 시간). */
export const nextDailyReset = (now: number) => kst(now).dayStart + DAY;
export const nextWeeklyReset = (now: number) => { const start = kst(now).dayStart, weekday = (new Date(start + KST).getUTCDay() + 6) % 7; return start + (7 - weekday) * DAY; };
/** 주 키를 랭킹 시즌 정수로(예: 2026-W40 → 202640). */
export const weekSeason = (key: string) => Number(key.replace('-W', ''));
/** 한국 시간 기준 월 키(YYYY-MM)와 월간 랭킹 시즌 정수(10,000,000 + YYYYMM). */
export const monthKey = (now: number) => kst(now).date.slice(0, 7);
export const monthSeason = (key: string) => 10_000_000 + Number(key.replace('-', ''));
export const previousMonthKey = (key: string) => { const [y, m] = key.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
