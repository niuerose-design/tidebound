/**
 * 전기 입체 보기 스프라이트(블렌더로 미리 렌더한 webp, tools/tactics-art/render.py).
 * public/art/tactics/manifest.json 을 한 번 읽어 그림을 모두 불러오고, 다 되면 구독자에게 알립니다.
 * 그림이 없거나 못 불러오면 캔버스가 절차적 그림(map-canvas.tsx)으로 그립니다. 엔진 · 저장과는 무관합니다.
 */
export interface SpriteSet {
    /** 렌더 프레임 크기(px)와 마름모 가로(px). 캔버스는 tw / diamond 배율로 그립니다. */
    frame: [number, number]; diamond: number;
    /** 프레임 안에서 칸 바닥 중심의 픽셀 좌표. */
    anchor: [number, number];
    /** 지형 글자(다리는 '=h' · '=v') → 그림. */
    tiles: Map<string, HTMLImageElement>;
    /** `${classId}:${side}` → 그림. */
    units: Map<string, HTMLImageElement>;
}
interface Manifest { frame: [number, number]; diamond: number; anchor: [number, number]; tiles: Record<string, string>; units: Record<string, string> }
const BASE = '/art/tactics/';
let current: SpriteSet | null = null;
let started = false;
const listeners = new Set<() => void>();
/** 불러온 스프라이트(아직이면 null). 처음 부르면 불러오기를 시작합니다. */
export function getSprites(): SpriteSet | null {
    if (!started && typeof window !== 'undefined') { started = true; void load(); }
    return current;
}
/** 스프라이트가 준비되면 한 번 부릅니다(이미 준비됐으면 바로). 해제 함수를 돌려줍니다. */
export function onSpritesReady(cb: () => void): () => void {
    if (current) { cb(); return () => undefined; }
    listeners.add(cb); getSprites();
    return () => { listeners.delete(cb); };
}
const loadImage = (src: string) => new Promise<HTMLImageElement | null>(res => { const img = new Image(); img.decoding = 'async'; img.onload = () => res(img); img.onerror = () => res(null); img.src = src; });
async function load() {
    try {
        const r = await fetch(`${BASE}manifest.json`); if (!r.ok) return;
        const m = await r.json() as Manifest;
        const tiles = new Map<string, HTMLImageElement>(), units = new Map<string, HTMLImageElement>();
        await Promise.all([
            ...Object.entries(m.tiles).map(async ([k, f]) => { const img = await loadImage(BASE + f); if (img) tiles.set(k, img); }),
            ...Object.entries(m.units).map(async ([k, f]) => { const img = await loadImage(BASE + f); if (img) units.set(k, img); }),
        ]);
        if (!tiles.size) return;
        current = { frame: m.frame, diamond: m.diamond, anchor: m.anchor, tiles, units };
        for (const cb of listeners) cb(); listeners.clear();
    } catch { /* 네트워크 실패: 절차적 그림으로 계속 */ }
}
