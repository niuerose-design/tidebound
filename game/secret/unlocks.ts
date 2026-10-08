/**
 * v3.62 숨은 전직(docs/concept.md 11.7): 문 시스템(윤회의 문·발견의 문)을 없애고, 히든 직업마다 플레이 기록 조건을 직업 조건으로 둡니다.
 * 조건을 처음 만족하면 그 직업이 드러나고(실루엣 → 공개) 다른 조건을 채우면 일반 전직처럼 들어갑니다. 한 번 만족한 조건은 계속 만족한 것으로 봅니다.
 * 기록은 옛 필드 doorsOpened에 그대로 남깁니다(세이브 호환, 이름만 옛것). 한 번 들어간 직업(unlockedJobs)은 조건이 없습니다.
 * v3.64 1차 단독 히든 6개를 지우고(맨손·안개·역풍·해돋이·한낮·밤왜가리), 도감 독자·청빈 수도승·칠전팔기는 공개 계보의 숨은 2차로 옮겼습니다(조건 = 기록 + 부모 1차 숙련).
 * 옛 윤회의 문 직업(윤회의 나그네·아델 2차)은 자체 조건(환생 1회 · 능력치 · 선행 직업)만 남았습니다.
 * 서버 전용: 조건이 비밀이라 화면은 이 파일을 가져가지 않습니다. 화면은 카탈로그(unlocks)로 만족 여부만 받습니다(unlock-info.ts 창구).
 */
// 서버 전용 표식: 화면(클라이언트) 번들이 이 파일을 가져가면 빌드가 실패합니다(docs/concept.md 10.2-1).
import 'server-only';
import type { State } from '../types';
import { MONSTERS } from '../data/world';
import { masteredJobCount } from '../systems/progression';
import { setUnlockSource } from '../data/unlock-info';

const bossCatches = (s: State) => MONSTERS.filter(f => f.boss).reduce((a, f) => a + (s.book?.[f.id] || 0), 0);
const HOUR = 3600_000;

/** 숨은 조건. 정확한 조건 문장은 해커 정보 해킹 조각(leaks.ts UNLOCK_CONDITIONS)에만 있습니다. */
export type HiddenUnlock = { job: string; test: (s: State) => boolean };
export const HIDDEN_UNLOCKS: HiddenUnlock[] = ([
    { job: 'undead', test: s => (s.deaths || 0) >= 10 },
    { job: 'clockmaker', test: s => (s.playMs || 0) >= 10 * HOUR },
    { job: 'krakenkin', test: s => bossCatches(s) >= 10 },
    { job: 'poorMonk', test: s => s.level >= 15 && (s.gold || 0) < 100 },
    { job: 'journeyman', test: s => masteredJobCount(s) >= 3 },
] as HiddenUnlock[]);
/** 숨은 조건이 있는 직업. */
export const UNLOCK_JOBS = HIDDEN_UNLOCKS.map(u => u.job);

/** 이 직업의 숨은 조건을 만족했는지. 숨은 조건이 없는 직업은 null. 한 번 만족해 기록된 조건(doorsOpened)은 계속 만족입니다. */
export function unlockMet(s: Partial<State>, jobId: string): boolean | null {
    const u = HIDDEN_UNLOCKS.find(x => x.job === jobId);
    return u ? !!s.doorsOpened?.includes(jobId) || u.test(s as State) : null;
}
/** 지금 만족한 숨은 조건을 기록합니다(이후 상시 만족). 정산 때 호출. 새로 만족한 직업 id를 돌려줍니다. */
export function recordUnlocks(s: State) {
    const fresh: string[] = [];
    for (const u of HIDDEN_UNLOCKS) if (!s.doorsOpened?.includes(u.job) && u.test(s)) { (s.doorsOpened ??= []).push(u.job); fresh.push(u.job); }
    return fresh;
}
/** 화면에 보낼 숨은 조건 만족 여부(카탈로그). */
export const unlockStates = (s: State) => Object.fromEntries(UNLOCK_JOBS.map(id => [id, !!unlockMet(s, id)]));

// 진행 계산(progression·reveal)이 unlock-info 창구로 이 판정을 씁니다(서버).
setUnlockSource(unlockMet);
