/**
 * v3.41 문의 공개 부분(docs/concept.md 10장). 화면이 가져가도 되는 것만 둡니다: 문 이름·설명, 한국 시간 도우미, 문 상태 조회 창구.
 * 문 조건(발견의 문 test)·윤회의 문 추첨은 서버 쪽 doors.ts에 있고, 불러올 때 setDoorSource로 여기에 연결합니다.
 * 화면은 서버가 보낸 카탈로그(catalog.ts applyCatalog)로 같은 창구를 채웁니다. 그래서 진행(progression)·환생(lifecycle) 계산은 어느 쪽에서든 같은 함수를 부릅니다.
 */
import type { State } from '../types';

export type DoorId = 'rebirth' | 'discovery';
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

export type DoorState = { door: DoorId; open: boolean } | null;
type DoorSource = {
    /** 지금 이 직업을 여는 문. 문이 없는 직업은 null, 닫혀 있으면 open:false. */
    doorFor: (s: Pick<State, 'rebirthDoor'> & Partial<State>, jobId: string) => DoorState;
    /** 윤회의 문 추첨(서버만). */
    drawRebirthDoor: (s: Pick<State, 'rebirthDoor' | 'unlockedJobs'>, rng: () => number) => string | undefined;
};
let source: DoorSource = { doorFor: () => null, drawRebirthDoor: () => undefined };
/** 서버의 doors.ts(전체 조건) 또는 화면의 카탈로그가 문 상태 창구를 채웁니다. */
export function setDoorSource(next: Partial<DoorSource>) { source = { ...source, ...next }; }
export const doorFor: DoorSource['doorFor'] = (s, jobId) => source.doorFor(s, jobId);
export const drawRebirthDoor: DoorSource['drawRebirthDoor'] = (s, rng) => source.drawRebirthDoor(s, rng);
