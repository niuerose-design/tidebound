/**
 * 가벼운 속도 제한(인스턴스 메모리). 서버리스라 인스턴스마다 따로 세지만, 한 IP가 짧은 시간에 가입·로그인을 퍼붓는 것을 막는 데는 충분합니다.
 * 창(window) 안에서 limit번을 넘으면 false. 오래된 키는 호출 때마다 조금씩 정리합니다.
 */
const hits = new Map<string, number[]>();
export function allow(key: string, limit: number, windowMs: number, now = Date.now()) {
    const list = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (list.length >= limit) { hits.set(key, list); return false; }
    list.push(now); hits.set(key, list);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
    return true;
}
export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
