'use client';
import { useState } from 'react';
import { DoorClosed, DoorOpen, X } from 'lucide-react';
import type { State } from '@/game/types';
import { jobById } from '@/game/data/classes';
import { DOORS, REBIRTH_DOOR_JOBS, TIME_SLOTS, timeSlot, currentVisit, visitorSchedule, kst, DISCOVERY_DOORS, VISITOR_JOBS, type DoorId } from '@/game/data/doors';
import { serverNow, jobRevealed } from './job-status';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
/** 한국 시간 기준 toHour 정각까지 남은 분(toHour가 24를 넘으면 내일). */
const minutesUntil = (now: number, toHour: number) => { const t = kst(now); return Math.max(1, toHour * 60 - (t.hour * 60 + t.minute)); };
const fmt = (m: number) => m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60 ? `${m % 60}분` : ''}`.trim() : `${m}분`;
const jobOf = (id?: string) => jobById(id);

/** 문 하나의 지금 상태: 열려 있는 직업(없으면 닫힘)과 안내 문구. 시각은 마지막 서버 시각 기준. */
const KEPT_NOTE = '한 번 열린 문 · 계속 열려 있습니다.';
export function doorState(s: State, id: DoorId) {
    const now = serverNow(s);
    // v25.23 한 번 열린 문은 계속 열려 있습니다: 지금 조건이 닫혀 있어도 기록된 직업(아직 안 들어간 쪽 우선)을 보여 줍니다.
    const kept = (jobs: string[]) => jobs.find(j => s.doorsOpened?.includes(j) && !s.unlockedJobs.includes(j)) ?? jobs.find(j => s.doorsOpened?.includes(j));
    if (id === 'rebirth') {
        const current = s.rebirthDoor && REBIRTH_DOOR_JOBS.includes(s.rebirthDoor) ? s.rebirthDoor : undefined, job = current ?? kept(REBIRTH_DOOR_JOBS);
        return { job, note: current ? '이번 생 동안 열려 있습니다.' : job ? KEPT_NOTE : '환생하면 한 직업의 문이 열립니다.' };
    }
    if (id === 'time') {
        const slot = timeSlot(now), current = slot.jobs[0], job = current ?? kept(TIME_SLOTS.flatMap(t => t.jobs));
        // 카운트다운: 열려 있으면 닫힐 때까지, 닫혀 있으면 다음 열리는 시간대까지(없으면 내일 첫 시간대).
        const next = TIME_SLOTS.find(t => t.from >= slot.to && t.jobs.length) || TIME_SLOTS.find(t => t.jobs.length);
        const countdown = job ? `닫힐 때까지 ${fmt(minutesUntil(now, slot.to))}` : next ? `열릴 때까지 ${fmt(minutesUntil(now, next.from >= slot.to ? next.from : 24 + next.from))}` : '';
        return { job, note: current ? `${slot.name} ${hh(slot.from)}–${hh(slot.to)} (한국 시간)` : job ? KEPT_NOTE : `${slot.name} ${hh(slot.from)}–${hh(slot.to)} (한국 시간) · 고요한 시간 · 문 닫힘`, countdown: current || !job ? countdown : '' };
    }
    if (id === 'visitor') {
        const visit = currentVisit(now), today = visitorSchedule(kst(now).date), upcoming = today.find(v => v.from > kst(now).hour);
        const countdown = visit ? `떠날 때까지 ${fmt(minutesUntil(now, visit.to))}` : upcoming ? `다음 방문까지 ${fmt(minutesUntil(now, upcoming.from))}` : today.length ? '오늘 방문은 끝났습니다' : '';
        const job = visit?.job ?? kept(VISITOR_JOBS);
        return { job, countdown: visit || !job ? countdown : '', note: visit ? `오늘 방문 ${today.map(v => `${hh(v.from)}–${hh(v.to)}`).join(', ')} (한국 시간)` : job ? KEPT_NOTE : `오늘 방문 ${today.map(v => `${hh(v.from)}–${hh(v.to)}`).join(', ') || '없음'} (한국 시간) · 지금은 아무도 없습니다` };
    }
    const found = DISCOVERY_DOORS.find(d => d.test(s)), job = found?.job ?? kept(DISCOVERY_DOORS.map(d => d.job));
    return { job, note: found ? '숨은 조건을 만족했습니다. 이제 계속 열려 있습니다.' : job ? KEPT_NOTE : DISCOVERY_DOORS.length ? '숨은 조건을 처음 만족하면 열리고, 그 뒤로 계속 열려 있습니다.' : '??? · 준비 중' };
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
            {'countdown' in st && st.countdown && <small className="door-countdown">{st.countdown}</small>}
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
    // v25.9 전직이 열리는 Lv.10 전(첫 생)에는 문 알림을 띄우지 않습니다.
    if (s.hideDoorNotice || !open.length || seen === key || (s.level < 10 && !s.rebirths)) return null;
    const dismiss = () => { setSeen(key); try { localStorage.setItem(NOTICE_KEY, key); } catch {} };
    return <div className="door-notice" role="status">
        <button type="button" className="door-notice-open" onClick={() => setView('classes')}><DoorOpen size={14}/><b>문이 열렸습니다</b><span>{open.map(d => d.door.name).join(' · ')} — 직업 화면 ??? 탭에서 확인하세요.</span></button>
        <button type="button" className="door-notice-dismiss" aria-label="문 알림 닫기" onClick={dismiss}><X size={14}/></button>
    </div>;
}
