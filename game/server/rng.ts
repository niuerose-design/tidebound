/**
 * v3.376 요청 단위 시드 난수(재설계 3단계, C안 준비). 같은 (모험가 · revision · lastTick · 서버 소금)이면 같은 난수열이라,
 * 저장 충돌 재시도 · 다른 인스턴스의 재계산 · 골든 테스트가 같은 결과를 냅니다. 소금(TIDEBOUND_RNG_SALT)은 화면이 모르는 값이라 드롭을 미리 알 수 없습니다.
 */
export const mulberry32 = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
/** FNV-1a 32비트. */
export function fnv1a(text: string): number { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
export function requestRng(id: string, revision: number, lastTick: number, salt = process.env.TIDEBOUND_RNG_SALT || 'tidebound'): () => number {
    return mulberry32(fnv1a(`${salt}|${id}|${revision}|${lastTick}`));
}
