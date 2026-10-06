/**
 * v3.29 해커 조직(docs/concept.md 9.10). 해커 계열끼리 꾸리는 조직입니다. 서버의 crews 테이블에 조직 하나가 JSON 한 행으로 삽니다.
 * 이번 단계(4-a): 창설·가입(초대 코드)·탈퇴·위임·강퇴·코드 재발급, 비트 공동 금고와 조직 등급. 합동 작전·모듈·순위는 다음 단계.
 * 아래는 서버와 화면이 함께 쓰는 순수 규칙입니다.
 */
import { HACKER_ID, WHITE_HACKER_ID, BLACK_HACKER_ID } from './hacker';

export const CREW = {
    /** 창설 비트(해킹 I 해금 필요). */
    createBits: 500,
    nameMin: 2, nameMax: 12, codeLength: 6,
    /** 정원: 5명 + 조직 등급 2마다 1명, 최대 10명(crews 한 행에 담는 상한). */
    capacity: (grade: number) => Math.min(10, 5 + Math.floor(grade / 2)),
    /** 조직 등급 g → g+1에 필요한 조직 경험치(금고 비트 1 = 1). 최대 20. */
    gradeNeed: (grade: number) => Math.round(2000 * grade ** 1.3),
    maxGrade: 20,
    /** 하루에 금고에 넣을 수 있는 비트 = 권한 등급 × 50. */
    depositPerDay: (hackerGrade: number) => Math.max(1, hackerGrade) * 50,
    /** 조직장이 이만큼 활동(조직에 쓰기)이 없으면 금고 기여가 가장 많은 조직원에게 자동 위임. */
    leaderIdleDays: 14,
    /** 해커 계열이 아닌 채로 이만큼 지나면 자동 탈퇴. */
    leaveDays: 30,
    /** 소속 캐시를 다시 읽는 간격(동기화), 조직원의 마지막 활동을 다시 적는 간격. */
    refreshMs: 10 * 60_000, seenMs: 86400_000,
} as const;

/** 성향: 창설 때 정하고 바꿀 수 없습니다. 회색은 해커 계열 누구나, 화이트·블랙은 해커와 그 2차만. */
export type CrewSide = 'gray' | 'white' | 'black';
export const CREW_SIDES: { id: CrewSide; name: string; jobs: string[] }[] = [
    { id: 'gray', name: '회색', jobs: [HACKER_ID, WHITE_HACKER_ID, BLACK_HACKER_ID] },
    { id: 'white', name: '화이트', jobs: [HACKER_ID, WHITE_HACKER_ID] },
    { id: 'black', name: '블랙', jobs: [HACKER_ID, BLACK_HACKER_ID] },
];
export const crewSide = (id: string) => CREW_SIDES.find(x => x.id === id);
export const sideAllows = (side: string, job: string) => !!crewSide(side)?.jobs.includes(job);

/** crews.data에 담기는 조직 한 개. members는 모험가 id → 조직원 정보. */
export type CrewMember = { name: string; joined: number; seen: number; deposited: number; /** 해커 계열이 아니게 된 시각(돌아오면 지움). */ offSince?: number };
export type CrewData = { name: string; side: CrewSide; leader: string; created: number; vault: number; exp: number; members: Record<string, CrewMember> };

/** 조직 경험치로 등급을 계산합니다(1부터). */
export function crewGrade(exp: number) {
    let g = 1, left = exp;
    while (g < CREW.maxGrade && left >= CREW.gradeNeed(g)) { left -= CREW.gradeNeed(g); g++; }
    return g;
}
/** 지금 등급 안에서 쌓인 경험치와 다음 등급까지 필요한 양. */
export function crewGradeProgress(exp: number) {
    const grade = crewGrade(exp);
    let base = 0;
    for (let g = 1; g < grade; g++) base += CREW.gradeNeed(g);
    return { grade, into: exp - base, need: grade >= CREW.maxGrade ? 0 : CREW.gradeNeed(grade) };
}
/** 초대 코드 글자(헷갈리는 0·O·1·I 제외). */
export const CREW_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normalizeCrewCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CREW.codeLength);
/** 조직 이름: 제어 문자·꺾쇠·대괄호 제외, 공백 정리. */
export const cleanCrewName = (name: unknown) => String(name ?? '').replace(/[\u0000-\u001f\u007f<>[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CREW.nameMax);
