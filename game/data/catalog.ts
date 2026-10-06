/**
 * v3.40 정보 비공개(docs/concept.md 10장): 서버가 모험가마다 만들어 화면에 보내는 카탈로그.
 * 화면은 비밀 표(히든 직업 조건·드롭 테이블·확률·스킬 전체 계보)를 직접 읽지 않고 이 카탈로그만 쓰도록 단계마다 옮겨 갑니다.
 * 1단계: 비공개 스위치 상태만 싣습니다. 2단계부터 알아낸 직업·문·스킬과 보여 줄 수치가 들어옵니다.
 */
export type Catalog = {
    /** 비공개 스위치. false(오픈 베타)면 화면은 지금처럼 전체 정보를 보여 줍니다. */
    secret: boolean;
};
export const OPEN_CATALOG: Catalog = { secret: false };
