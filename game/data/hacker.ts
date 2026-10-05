/**
 * v3.18 해커 직업군 1단계(docs/concept.md 9장). 싸우는 대신 서버를 건드리며 자라는 제약 직업입니다.
 * - 해커로 있는 동안 전투(사냥·던전)를 하지 않습니다. 자동 사냥은 브루트포스(방치)로 바뀌어 비트·권한 경험치만 쌓습니다.
 * - 전용 재화 비트(bit)와 전용 성장 권한 등급. 일반 → 해커(SP·세계석 → 비트)는 허용, 해커 → 일반은 막습니다.
 * - 침투 작전: 서버가 낸 자물쇠 퍼즐을 한 칸씩 뚫는 로그라이트. 정답은 서버 키로만 만들 수 있어 세이브에 남지 않습니다.
 * - 해킹 I: 방송 탈취 · 크래킹(서버 공유 설정 hacks, 30초 캐시). 애드가드: 순위표 이름·정보 숨김.
 */
import type { Skill } from '../types';

export const HACKER_ID = 'hacker';
export const ADGUARD_ID = 'adGuard';

export const HACKER = {
    /** SP·세계석 1개를 태울 때 얻는 비트(되돌릴 수 없음). */
    convert: { sp: 40, pearls: 4 },
    /** 권한 등급 g → g+1에 필요한 권한 경험치: base × g^power. */
    grade: { base: 120, power: 1.5, max: 99 },
    /** 브루트포스(방치): 틱(2초)마다. 오프라인 정산에도 같은 값. */
    brute: { bits: .02, exp: .05 },
    /** 침투 작전. */
    infil: {
        entriesPerDay: 3,
        /** 깊이 d 노드를 뚫으면 쌓이는 보상(뽑아 나가면 전부, 추적되면 traceKeep만). */
        reward: (depth: number) => ({ bits: 4 + 3 * depth, exp: 10 + 6 * depth }),
        traceKeep: .5,
        /** 노드 종류: 홀수 깊이는 방화벽(숫자 자물쇠), 짝수 깊이는 포트 스캔. */
        lock: (depth: number) => ({ digits: depth <= 3 ? 3 : depth <= 8 ? 4 : 5, tries: depth <= 3 ? 7 : depth <= 8 ? 8 : 10 }),
        port: (depth: number) => { const range = depth <= 4 ? 64 : depth <= 10 ? 256 : 1024; return { range, tries: Math.ceil(Math.log2(range)) + (depth <= 4 ? 2 : depth <= 10 ? 1 : 0) }; },
    },
    /** 해킹 단계(I~X): 단계마다 필요한 권한 등급과 비트. 1단계 구현은 I만 엽니다. */
    tiers: [{ grade: 1, bits: 150 }] as { grade: number; bits: number }[],
    /** 해킹 실행: 하루 횟수·지속·비용. n = 해킹 단계. */
    broadcast: { maxLength: 40, minutes: (n: number) => 30 + 3 * (n - 1), perDay: (n: number) => 1 + Math.floor(n / 3), bits: 20, exp: 40 },
    crack: { minutes: 60, perDay: (n: number) => 1 + Math.floor(n / 4), bits: 15, exp: 30 },
} as const;

/** 권한 등급 g에서 다음 등급까지 필요한 경험치. */
export const gradeNeed = (grade: number) => Math.round(HACKER.grade.base * Math.max(1, grade) ** HACKER.grade.power);

/** 애드가드 2단계에서 고를 수 있는 공개 항목. */
export const PRIVACY_FIELDS = ['job', 'level', 'gear', 'skills', 'title', 'guild'] as const;
export type PrivacyField = typeof PRIVACY_FIELDS[number];
export const PRIVACY_LABELS: Record<PrivacyField, string> = { job: '직업', level: '레벨', gear: '장비', skills: '장착 스킬', title: '칭호', guild: '길드' };

/** 해커(1차, ??? 계열 독립 직업). 능력치 보정은 없고 규칙으로 막습니다: 전투(사냥·던전·결투·월드보스·신 도전) 불가, 능력치 투자·다른 스킬 장착 불가. */
export const HACKER_JOBS = [
    { id: HACKER_ID, name: '해커', title: '게임의 헛점을 파고든다', desc: '전투 능력은 전무합니다. 사냥·던전·결투·월드보스·신 도전에 참여할 수 없고, 능력치 투자와 해커 전용이 아닌 스킬 장착이 막히며, 해커로 있는 동안 레벨·경험치가 멈춥니다. 대신 침투 작전으로 비트와 권한을 쌓고, 서버의 방송을 탈취하고 다른 모험가의 숨김을 깨뜨립니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 30, rebirth: 3, mastery: 0, requires: {}, role: '해킹·서버', tree: 'mystery' as const, lineage: 'mystery-independent', hidden: true, hint: '세 번의 윤회를 넘긴 자에게 서버의 틈이 보입니다.', masteryTarget: 3000, masteryBoost: 0 },
];

/** 애드가드: 해커 전용 패시브(계승 가능). 1단계 이름 숨김, 2단계 공개 항목 선택. 숙련은 해커 활동(침투·브루트포스·해킹)으로 오릅니다. */
export const HACKER_SKILLS: Skill[] = [
    { id: ADGUARD_ID, name: '애드가드', desc: '숙련 1단계: 랭킹·무릉도장 기록판에서 이름을 ???로 숨깁니다. 숙련 2단계: 직업·레벨·장비·장착 스킬·칭호·길드 중 공개할 항목을 고릅니다. 크래킹을 당하면 1시간 동안 풀립니다.', type: 'passive', level: 30, job: HACKER_ID, chance: 0, cooldown: 0, multiplier: 0, cost: 5, bonus: {}, masteryMilestones: [250, 1200, 4500, 14000] } as Skill,
];
