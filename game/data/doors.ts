/**
 * ??? 계열의 문. 문마다 ??? 계보의 첫 직업을 엽니다. 한 번 들어간 직업(unlockedJobs)은 문 조건이 없습니다.
 * 시간 판정은 항상 서버가 넘긴 시각(요청 시각)으로 합니다. 목록에 없는 직업 id는 무시합니다.
 * 새 ??? 직업은 support-rework.ts에 만들고 이 목록에 추가합니다.
 */
import type { State } from '../types';
import { JOBS } from './classes';
import { FISH } from './world';
import { masteredJobCount } from '../systems/progression';

export type DoorId = 'rebirth' | 'time' | 'discovery' | 'visitor';
export type TimeSlot = { id: string; name: string; from: number; to: number; jobs: string[] };

const known = (ids: string[]) => ids.filter(id => JOBS.some(j => j.id === id));

/** 윤회의 문: 환생할 때 한 직업을 골라 다음 생 동안 엽니다. */
export const REBIRTH_DOOR_JOBS = known(['rebirthFisher', 'voidcaller']);
/** 시간의 문: 한국 시간(UTC+9) 6시간 슬롯. 비어 있는 슬롯은 문이 닫힙니다. */
export const TIME_SLOTS: TimeSlot[] = [
    { id: 'dawn', name: '새벽', from: 0, to: 6, jobs: known(['undead', 'clockmaker']) },
    { id: 'morning', name: '아침', from: 6, to: 12, jobs: known(['headwindSailor', 'sunriseAngler', 'clockmaker']) },
    { id: 'day', name: '낮', from: 12, to: 18, jobs: known(['barehandFisher', 'noonDiver', 'clockmaker']) },
    { id: 'night', name: '밤', from: 18, to: 24, jobs: known(['mistSwordsman', 'nightHeron', 'clockmaker']) },
];
const codexCount = (s: State) => FISH.filter(f => (s.book?.[f.id] || 0) > 0).length + Object.keys(s.itemBook || {}).length;
/** 발견의 문: 조건을 만족하는 동안 열리는 직업. 한 번 전직하면(unlockedJobs) 조건이 없습니다. */
type DiscoveryDoor = { job: string; hint: string; test: (s: State) => boolean };
export const DISCOVERY_DOORS: DiscoveryDoor[] = ([
    { job: 'poorMonk', hint: '어느 정도 성장했는데도 주머니가 거의 비어 있을 때.', test: s => s.level >= 15 && (s.gold || 0) < 100 },
    { job: 'codexReader', hint: '도감에 기록이 서른 개 넘게 쌓였을 때.', test: s => codexCount(s) >= 30 },
    { job: 'fallenAngler', hint: '서른 번쯤 쓰러져 본 낚시꾼에게.', test: s => (s.deaths || 0) >= 30 },
    { job: 'journeyman', hint: '직업 셋을 끝까지 숙달한 낚시꾼에게.', test: s => masteredJobCount(s) >= 3 },
] as DiscoveryDoor[]).filter(d => JOBS.some(j => j.id === d.job));
/** 방문자의 문: 하루 1~2번, 한 번에 2시간 머무는 방문자. */
export const VISITOR_JOBS = known(['krakenkin']);
export const VISIT_HOURS = 2;

export const DOORS: { id: DoorId; name: string; summary: string }[] = [
    { id: 'rebirth', name: '윤회의 문', summary: '환생할 때마다 하나의 직업이 이번 생 동안 문을 엽니다.' },
    { id: 'time', name: '시간의 문', summary: '한국 시간 6시간마다 다른 직업이 문 앞에 섭니다.' },
    { id: 'discovery', name: '발견의 문', summary: '숨은 조건을 처음 만족하면 열립니다.' },
    { id: 'visitor', name: '방문자의 문', summary: '하루 한두 번, 두 시간 동안 누군가 찾아옵니다.' },
];

const KST = 9 * 3600_000;
/** 한국 시간 기준 시(0~23)와 날짜 키(YYYY-MM-DD). */
export function kst(now: number) {
    const d = new Date(now + KST);
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), date: d.toISOString().slice(0, 10), dayStart: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KST };
}
/** 지금 시간의 문 슬롯. */
export const timeSlot = (now: number) => TIME_SLOTS.find(t => kst(now).hour >= t.from && kst(now).hour < t.to)!;

/** FNV-1a 32비트 해시. 날짜 문자열 → 모두에게 같은 방문 일정. */
function hash(text: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
}
/**
 * 방문자의 문 일정(순수 함수, DB 없음). 날짜(KST)마다 1~2번, 한 번에 2시간.
 * 반환: 시작·끝 시(KST, 끝은 제외)와 찾아오는 직업. 두 방문은 겹치지 않습니다.
 */
export function visitorSchedule(date: string) {
    if (!VISITOR_JOBS.length) return [];
    const h = hash(date), count = 1 + (h & 1), visits: { from: number; to: number; job: string }[] = [];
    let seed = h;
    for (let i = 0; i < count; i++) {
        seed = hash(`${date}:${i}:${seed}`);
        let from = seed % (24 - VISIT_HOURS + 1);
        // 겹치면 뒤로 밀고, 자리가 없으면 앞으로 찾습니다.
        for (let tries = 0; tries < 24 && visits.some(v => from < v.to && v.from < from + VISIT_HOURS); tries++) from = (from + VISIT_HOURS) % (24 - VISIT_HOURS + 1);
        if (visits.some(v => from < v.to && v.from < from + VISIT_HOURS)) continue;
        visits.push({ from, to: from + VISIT_HOURS, job: VISITOR_JOBS[seed % VISITOR_JOBS.length] });
    }
    return visits.sort((a, b) => a.from - b.from);
}
/** 지금 머무는 방문자(없으면 null). */
export function currentVisit(now: number) {
    const t = kst(now);
    return visitorSchedule(t.date).find(v => t.hour >= v.from && t.hour < v.to) || null;
}

/** 지금 이 직업을 여는 문. 문 목록에 없는 직업은 null(문 조건 없음), 목록에 있지만 닫혀 있으면 open:false. */
export function doorFor(s: Pick<State, 'rebirthDoor'> & Partial<State>, jobId: string, now: number): { door: DoorId; open: boolean } | null {
    if (REBIRTH_DOOR_JOBS.includes(jobId)) return { door: 'rebirth', open: s.rebirthDoor === jobId };
    if (TIME_SLOTS.some(t => t.jobs.includes(jobId))) return { door: 'time', open: timeSlot(now).jobs.includes(jobId) };
    const discovery = DISCOVERY_DOORS.find(d => d.job === jobId);
    if (discovery) return { door: 'discovery', open: discovery.test(s as State) };
    if (VISITOR_JOBS.includes(jobId)) return { door: 'visitor', open: currentVisit(now)?.job === jobId };
    return null;
}

/**
 * 윤회의 문 추첨: 직전 값은 빼고, 아직 들어가지 않은 직업을 우선합니다. 후보가 없으면 난수를 쓰지 않습니다.
 * 결과는 State에 저장되므로 새로고침해도 바뀌지 않습니다.
 */
export function drawRebirthDoor(s: Pick<State, 'rebirthDoor' | 'unlockedJobs'>, rng: () => number) {
    let pool = REBIRTH_DOOR_JOBS.filter(id => id !== s.rebirthDoor);
    if (!pool.length) return s.rebirthDoor && REBIRTH_DOOR_JOBS.includes(s.rebirthDoor) ? s.rebirthDoor : undefined;
    const fresh = pool.filter(id => !s.unlockedJobs.includes(id));
    if (fresh.length) pool = fresh;
    return pool.length === 1 ? pool[0] : pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
