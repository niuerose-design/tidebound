/**
 * ??? 계열의 문. 문마다 ??? 계보의 첫 직업을 엽니다. 한 번 들어간 직업(unlockedJobs)은 문 조건이 없습니다.
 * v25.23 한 번 열린 것을 본 문(doorsOpened)은 그 뒤로 계속 열려 있습니다. 목록에 없는 직업 id는 무시합니다.
 * v27.12 문은 윤회의 문(환생마다 추첨)과 발견의 문(플레이 기록 조건) 둘뿐입니다.
 * v27.70 운영 페이지에서 문을 직접 열 수 있습니다(settings.doors). 서버가 setOpenDoors로 채우고 동기화 때 State.openDoors에 적어 화면도 봅니다.
 *   운영자가 연 문은 열려 있는 동안만 열리고(doorsOpened에 기록하지 않음) 닫으면 다시 조건을 봅니다. 그 사이 들어간 직업은 unlockedJobs라 그대로 남습니다.
 * 새 ??? 직업은 support-rework.ts에 만들고 이 목록에 추가합니다.
 */
import type { State } from '../types';
import { JOBS } from './classes';
import { FISH } from './world';
import { masteredJobCount } from '../systems/progression';

export type DoorId = 'rebirth' | 'discovery';

const known = (ids: string[]) => ids.filter(id => JOBS.some(j => j.id === id));

/** 윤회의 문: 환생할 때 한 직업을 골라 다음 생 동안 엽니다. */
export const REBIRTH_DOOR_JOBS = known(['rebirthFisher', 'voidcaller']);
const codexCount = (s: State) => FISH.filter(f => (s.book?.[f.id] || 0) > 0).length + Object.keys(s.itemBook || {}).length;
const speciesCount = (s: State) => FISH.filter(f => (s.book?.[f.id] || 0) > 0).length;
const bossCatches = (s: State) => FISH.filter(f => f.boss).reduce((a, f) => a + (s.book?.[f.id] || 0), 0);
const dungeonClears = (s: State) => Object.values(s.clears || {}).reduce((a, n) => a + n, 0);
const HOUR = 3600_000;
/**
 * 발견의 문: 숨은 조건을 처음 만족하면 열리고(recordOpenDoors가 doorsOpened에 기록), 그 뒤로 계속 열려 있습니다. 한 번 전직하면(unlockedJobs) 조건이 없습니다.
 * v27.12 시간의 문·방문자의 문을 없애고 그 직업들도 여기로 옮겼습니다. 접속 시간대가 아니라 플레이 기록으로 엽니다.
 */
export type DiscoveryDoor = { job: string; hint: string; test: (s: State) => boolean };
export const DISCOVERY_DOORS: DiscoveryDoor[] = ([
    { job: 'undead', hint: '열 번 쓰러져 본 모험가에게 죽음이 말을 겁니다.', test: s => (s.deaths || 0) >= 10 },
    { job: 'clockmaker', hint: '사냥터에서 열 시간을 보낸 뒤, 시계 소리가 들립니다.', test: s => (s.playMs || 0) >= 10 * HOUR },
    { job: 'headwindSailor', hint: '다섯 번째 사냥터까지 거슬러 올라간 모험가에게.', test: s => (s.bestStage || 0) >= 4 },
    { job: 'sunriseAngler', hint: '열다섯 종의 몬스터를 처음 만난 아침에.', test: s => speciesCount(s) >= 15 },
    { job: 'barehandFisher', hint: '무기 없이 열다섯 레벨을 넘긴 모험가에게.', test: s => s.level >= 15 && !s.equipment?.rod },
    { job: 'noonDiver', hint: '던전 다섯 번을 끝까지 잠수한 자에게.', test: s => dungeonClears(s) >= 5 },
    { job: 'mistSwordsman', hint: '결투에서 세 번 이긴 뒤 안개가 걷힙니다.', test: s => (s.wins || 0) >= 3 },
    { job: 'nightHeron', hint: '오백 마리를 낚고도 물가를 떠나지 않은 자에게.', test: s => (s.kills || 0) >= 500 },
    { job: 'krakenkin', hint: '보스 열 마리의 피를 묻힌 모험가에게 혈족이 찾아옵니다.', test: s => bossCatches(s) >= 10 },
    { job: 'poorMonk', hint: '어느 정도 성장했는데도 주머니가 거의 비어 있을 때.', test: s => s.level >= 15 && (s.gold || 0) < 100 },
    { job: 'codexReader', hint: '도감에 기록이 서른 개 넘게 쌓였을 때.', test: s => codexCount(s) >= 30 },
    { job: 'fallenAngler', hint: '서른 번쯤 쓰러져 본 모험가에게.', test: s => (s.deaths || 0) >= 30 },
    { job: 'journeyman', hint: '직업 셋을 끝까지 숙달한 모험가에게.', test: s => masteredJobCount(s) >= 3 },
] as DiscoveryDoor[]).filter(d => JOBS.some(j => j.id === d.job));

export const DOORS: { id: DoorId; name: string; summary: string }[] = [
    { id: 'rebirth', name: '윤회의 문', summary: '환생할 때마다 하나의 직업이 이번 생 동안 문을 엽니다.' },
    { id: 'discovery', name: '발견의 문', summary: '숨은 조건을 처음 만족하면 열리고, 그 뒤로 계속 열려 있습니다.' },
];

const KST = 9 * 3600_000;
/** 한국 시간 기준 시(0~23)와 날짜 키(YYYY-MM-DD). */
export function kst(now: number) {
    const d = new Date(now + KST);
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), date: d.toISOString().slice(0, 10), dayStart: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KST };
}

/** 문이 열리는 모든 ??? 직업. */
export const DOOR_JOBS = [...REBIRTH_DOOR_JOBS, ...DISCOVERY_DOORS.map(d => d.job)];
/**
 * v27.70 운영 페이지에서 연 문(직업 id). 서버가 DB 설정(settings.doors)을 읽어 setOpenDoors로 채우고, 동기화 때 openDoorsSnapshot을 State.openDoors에 적습니다.
 * 서버 판정·화면 모두 State.openDoors를 봅니다(닫힌 사냥터의 State.closed와 같은 방식). 테스트·클라이언트는 비어 있습니다.
 */
const FORCED_OPEN = new Set<string>();
export function setOpenDoors(ids: string[]) { FORCED_OPEN.clear(); for (const id of ids) if (DOOR_JOBS.includes(id)) FORCED_OPEN.add(id); }
/** State.openDoors에 적을 지금 운영자가 연 문. 없으면 null. */
export const openDoorsSnapshot = () => FORCED_OPEN.size ? DOOR_JOBS.filter(id => FORCED_OPEN.has(id)) : null;
/** 운영자가 연 문인지(동기화 때 받은 State.openDoors 기준). */
export const doorForcedOpen = (s: Partial<State>, jobId: string) => !!s.openDoors?.includes(jobId);

/** 조건으로 열리는 문 상태. 운영자가 연 문은 보지 않습니다(recordOpenDoors가 영구 기록하지 않도록). */
function naturalDoor(s: Pick<State, 'rebirthDoor'> & Partial<State>, jobId: string): { door: DoorId; open: boolean } | null {
    const seen = !!s.doorsOpened?.includes(jobId);
    if (REBIRTH_DOOR_JOBS.includes(jobId)) return { door: 'rebirth', open: seen || s.rebirthDoor === jobId };
    const discovery = DISCOVERY_DOORS.find(d => d.job === jobId);
    if (discovery) return { door: 'discovery', open: seen || discovery.test(s as State) };
    return null;
}
/** 지금 이 직업을 여는 문. 문 목록에 없는 직업은 null(문 조건 없음), 목록에 있지만 닫혀 있으면 open:false. 운영자가 연 문(State.openDoors)은 열림. */
export function doorFor(s: Pick<State, 'rebirthDoor'> & Partial<State>, jobId: string): { door: DoorId; open: boolean } | null {
    const door = naturalDoor(s, jobId);
    return door && !door.open && doorForcedOpen(s, jobId) ? { ...door, open: true } : door;
}
/** 조건으로 열려 있는 문을 doorsOpened에 기록합니다(이후 상시 개방). 운영자가 연 문은 기록하지 않습니다. 동기화·정산 때 호출. 새로 열린 직업 id를 돌려줍니다. */
export function recordOpenDoors(s: State) {
    const fresh: string[] = [];
    for (const jobId of DOOR_JOBS) {
        if (s.doorsOpened?.includes(jobId)) continue;
        if (naturalDoor(s, jobId)?.open) { (s.doorsOpened ??= []).push(jobId); fresh.push(jobId); }
    }
    return fresh;
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
