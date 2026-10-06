/** 한국 시간 도우미. v3.62 문(door-info.ts)이 없어지며 여기로 옮겼습니다. */
/** 한국 시간(UTC+9) 오프셋. kstIso(t)는 그 시각의 한국 시간을 ISO 문자열로(끝의 Z는 무시하고 앞부분만 잘라 씁니다). */
export const KST = 9 * 3600_000;
export const kstIso = (t: number) => new Date(t + KST).toISOString();
/** 한국 시간 기준 시(0~23)와 날짜 키(YYYY-MM-DD). */
export function kst(now: number) {
    const d = new Date(now + KST);
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), date: d.toISOString().slice(0, 10), dayStart: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KST };
}
