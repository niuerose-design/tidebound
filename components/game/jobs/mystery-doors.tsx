'use client';
import { useState } from 'react';
import { DoorClosed, DoorOpen, X } from 'lucide-react';
import type { State } from '@/game/types';
import { jobById } from '@/game/data/classes';
import { DOORS, REBIRTH_DOOR_JOBS, timeSlot, currentVisit, visitorSchedule, kst, DISCOVERY_DOORS, type DoorId } from '@/game/data/doors';
import { serverNow, jobRevealed } from './job-status';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const jobOf = (id?: string) => jobById(id);

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
        const st = doorState(s, door.id), open = !!st.job, entered = !!st.job && s.unlockedJobs.includes(st.job), job = jobOf(st.job), revealed = !!job && jobRevealed(s, job);
        return <button type="button" key={door.id} className={`panel door-card ${open ? 'open' : 'closed'} ${st.job && st.job === selectedId ? 'selected' : ''}`} disabled={!open} onClick={() => st.job && onSelect(st.job)}>
            <span className="door-icon">{open ? <DoorOpen size={22}/> : <DoorClosed size={22}/>}</span>
            <strong>{door.name}</strong>
            <span className="door-job">{open ? revealed ? job!.name : '???' : '문 닫힘'}{entered ? ' · 입장한 적 있음' : ''}</span>
            {open && !revealed && job?.hint && <small className="door-hint">{job.hint}</small>}
            <small>{st.note}</small>
        </button>;
    })}</div>;
}

/** 지금 열려 있고 아직 들어가지 않은 문의 직업들(??? 탭 점·전투 화면 알림·빠른 찾기). */
export function openUnenteredDoors(s: State) {
    return DOORS.map(d => ({ door: d, job: doorState(s, d.id).job })).filter((x): x is { door: typeof x.door; job: string } => !!x.job && !s.unlockedJobs.includes(x.job));
}

const NOTICE_KEY = 'tidebound:door-notice';
const readSeen = () => { try { return localStorage.getItem(NOTICE_KEY) || ''; } catch { return ''; } };

/** 전투 화면 짧은 알림: 들어가지 않은 문이 새로 열리면 한 줄로 알립니다. 닫으면 같은 날 같은 문은 다시 띄우지 않습니다(이 브라우저만). */
export function DoorNotice({ s, setView }: { s: State; setView: (view: string) => void }) {
    const [seen, setSeen] = useState(readSeen);
    const open = openUnenteredDoors(s);
    const key = open.map(d => `${d.door.id}:${d.job}`).join(',') + `@${kst(serverNow(s)).date}`;
    if (!open.length || seen === key) return null;
    const dismiss = () => { setSeen(key); try { localStorage.setItem(NOTICE_KEY, key); } catch {} };
    return <div className="door-notice" role="status">
        <button type="button" className="door-notice-open" onClick={() => setView('classes')}><DoorOpen size={14}/><b>문이 열렸습니다</b><span>{open.map(d => d.door.name).join(' · ')} — 직업 화면 ??? 탭에서 확인하세요.</span></button>
        <button type="button" className="door-notice-dismiss" aria-label="문 알림 닫기" onClick={dismiss}><X size={14}/></button>
    </div>;
}
