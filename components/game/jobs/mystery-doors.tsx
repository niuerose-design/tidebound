'use client';
import { DoorClosed, DoorOpen } from 'lucide-react';
import type { State } from '@/game/types';
import { JOBS } from '@/game/data/classes';
import { DOORS, REBIRTH_DOOR_JOBS, timeSlot, currentVisit, visitorSchedule, kst, DISCOVERY_DOORS, type DoorId } from '@/game/data/doors';
import { serverNow } from './job-status';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const jobName = (id?: string) => JOBS.find(j => j.id === id)?.name;

/** 문 하나의 지금 상태: 열려 있는 직업(없으면 닫힘)과 안내 문구. 시각은 마지막 서버 시각 기준. */
export function doorState(s: State, id: DoorId) {
    const now = serverNow(s);
    if (id === 'rebirth') {
        const job = s.rebirthDoor && REBIRTH_DOOR_JOBS.includes(s.rebirthDoor) ? s.rebirthDoor : undefined;
        return { job, note: job ? '이번 생 동안 열려 있습니다.' : '환생하면 한 직업의 문이 열립니다.' };
    }
    if (id === 'time') {
        const slot = timeSlot(now), job = slot.jobs[0];
        return { job, note: `${slot.name} ${hh(slot.from)}–${hh(slot.to)} (한국 시간)${job ? '' : ' · 고요한 시간 · 문 닫힘'}` };
    }
    if (id === 'visitor') {
        const visit = currentVisit(now), today = visitorSchedule(kst(now).date);
        return { job: visit?.job, note: `오늘 방문 ${today.map(v => `${hh(v.from)}–${hh(v.to)}`).join(', ') || '없음'} (한국 시간)${visit ? '' : ' · 지금은 아무도 없습니다'}` };
    }
    const found = DISCOVERY_DOORS.find(d => d.test(s));
    return { job: found?.job, note: DISCOVERY_DOORS.length ? '숨은 조건을 처음 만족하면 열립니다.' : '??? · 준비 중' };
}

/** ??? 탭 윗줄: 문 카드 4장. 문마다 직업 하나. 열린 문의 직업을 누르면 상세를 엽니다. */
export function DoorRow({ s, selectedId, onSelect }: { s: State; selectedId?: string; onSelect: (id: string) => void }) {
    return <div className="door-row">{DOORS.map(door => {
        const st = doorState(s, door.id), open = !!st.job, entered = !!st.job && s.unlockedJobs.includes(st.job);
        return <button type="button" key={door.id} className={`panel door-card ${open ? 'open' : 'closed'} ${st.job && st.job === selectedId ? 'selected' : ''}`} disabled={!open} onClick={() => st.job && onSelect(st.job)}>
            <span className="door-icon">{open ? <DoorOpen size={22}/> : <DoorClosed size={22}/>}</span>
            <strong>{door.name}</strong>
            <span className="door-job">{open ? jobName(st.job) : '문 닫힘'}{entered ? ' · 입장한 적 있음' : ''}</span>
            <small>{st.note}</small>
        </button>;
    })}</div>;
}
