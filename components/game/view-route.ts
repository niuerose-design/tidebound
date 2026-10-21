/**
 * v3.381 화면 주소(재설계 4단계, 브리프 6.3 "모든 화면은 URL을 가진다"의 첫 단계): 메뉴 화면(view)을 주소의 해시(#settings)로 적습니다.
 * 새로고침 · 뒤로가기 · 공유가 됩니다. 자동 사냥(battle)은 해시 없음. 모르는 해시는 자동 사냥으로.
 * App Router 라우트 분리는 셸 교체 뒤로 미룹니다(docs/redesign-analysis.md 6절 4).
 */
export const DEFAULT_VIEW = 'battle';
/** 해시 → 화면 id. 목록에 없으면 기본 화면. */
export function viewFromHash(hash: string, valid: ReadonlySet<string>): string {
    const v = decodeURIComponent((hash || '').replace(/^#\/?/, '')).trim();
    return v && valid.has(v) ? v : DEFAULT_VIEW;
}
/** 화면 id → 해시('' 는 기본 화면). */
export const hashForView = (view: string) => view === DEFAULT_VIEW ? '' : `#${view}`;
