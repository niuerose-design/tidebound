/**
 * 시드 기반 결정론적 난수. 황금비 카운터에 lowbias32 해시(splitmix 계열)를 씌운 것으로,
 * 상태가 정수 하나라 스냅샷에 그대로 들어갑니다. 일정한 간격으로 뽑아도 값이 몰리지 않습니다(mulberry32는 간격 패턴에 약했음).
 */
export function nextRandom(state: number): { value: number; state: number } {
    const s = (state + 0x9E3779B9) >>> 0;
    let x = s;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    return { value: (x >>> 0) / 4294967296, state: s };
}
/** 0~99 정수 하나. 호출마다 상태가 바뀝니다. */
export function roll(ctx: { rng: number }): number {
    const r = nextRandom(ctx.rng);
    ctx.rng = r.state;
    return Math.floor(r.value * 100);
}
/** 문자열에서 시드를 만듭니다(세이브 이름 등). */
export function seedFrom(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
