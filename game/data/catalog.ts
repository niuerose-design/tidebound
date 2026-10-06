/**
 * v3.40 정보 비공개(docs/concept.md 10장): 서버가 모험가마다 만들어 화면에 보내는 카탈로그.
 * 화면은 비밀 표(히든 직업 조건·드롭 테이블·확률·스킬 전체 계보)를 직접 읽지 않고 이 카탈로그만 쓰도록 단계마다 옮겨 갑니다.
 * v3.41 2단계: 문 상태(조건은 서버가 판정)와 드러난 비밀 직업 목록. applyCatalog가 화면 쪽 문 창구(door-info)를 채웁니다.
 */
import { setDoorSource, type DoorId } from './door-info';

export type CatalogDoors = {
    states: Record<string, { door: DoorId; open: boolean }>;
    rebirth: { job?: string; note: string };
    discovery: { job: string; hint: string; open: boolean; entered: boolean; forced: boolean }[];
    unentered: { door: DoorId; job: string }[];
};
export type Catalog = {
    /** 비공개 스위치. false(오픈 베타)면 화면은 지금처럼 전체 정보를 보여 줍니다. */
    secret: boolean;
    /** v3.41 문 상태(서버 판정). */
    doors?: CatalogDoors;
    /** v3.41 이 모험가에게 드러난 비밀 직업 id(실루엣을 벗은 직업). */
    revealed?: string[];
};
export const OPEN_CATALOG: Catalog = { secret: false };

let current: Catalog = OPEN_CATALOG, revealed = new Set<string>();
/** 화면: 서버가 보낸 카탈로그를 적용합니다(문 창구 채우기 · 공개 목록). */
export function applyCatalog(c: Catalog) {
    current = c; revealed = new Set(c.revealed || []);
    const states = c.doors?.states || {};
    // 브라우저에서만 문 창구를 카탈로그로 바꿉니다(서버·테스트는 doors.ts의 실제 판정을 그대로 씀).
    if (typeof window !== 'undefined') setDoorSource({ doorFor: (_s, jobId) => states[jobId] ?? null });
}
export const catalogNow = () => current;
/** 화면: 이 비밀 직업이 드러났는지(카탈로그 기준). */
export const catalogRevealed = (jobId: string) => revealed.has(jobId);
