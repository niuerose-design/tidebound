'use client';
import { useState } from 'react';
import { DoorClosed, DoorOpen, X } from 'lucide-react';
import type { State } from '@/game/types';
import { jobById } from '@/game/data/classes';
import { DOORS, kst } from '@/game/data/door-info';
import { catalogNow } from '@/game/data/catalog';
import { serverNow, jobRevealed } from './job-status';

const jobOf = (id?: string) => jobById(id);
const doorName = (id: string) => DOORS.find(d => d.id === id)!;
/** v3.44 문 정보는 서버가 판정해 카탈로그로 보냅니다(발견의 문 조건은 비밀). 받기 전에는 빈 값. */
const doorsOf = () => catalogNow().doors ?? { states: {}, rebirth: { note: '환생하면 한 직업의 문이 열립니다.' }, discovery: [], unentered: [] };

/** ??? 탭 윗줄: 윤회의 문 카드 하나와 발견의 문 목록. 열린 문의 직업을 누르면 상세를 엽니다. */
export function DoorRow({ s, selectedId, onSelect }: { s: State; selectedId?: string; onSelect: (id: string) => void }) {
    const doors = doorsOf(), rebirth = doors.rebirth, rJob = jobOf(rebirth.job), rRevealed = !!rJob && jobRevealed(s, rJob);
    const found = doors.discovery.map(d => ({ d, ...d })), openCount = found.filter(x => x.open).length;
    return <div className="door-row">
        <button type="button" className={`panel door-card ${rebirth.job ? 'open' : 'closed'} ${rebirth.job && rebirth.job === selectedId ? 'selected' : ''}`} disabled={!rebirth.job} onClick={() => rebirth.job && onSelect(rebirth.job)}>
            <span className="door-icon">{rebirth.job ? <DoorOpen size={22}/> : <DoorClosed size={22}/>}</span>
            <strong>{DOORS[0].name}</strong>
            <span className="door-job">{rebirth.job ? rRevealed ? rJob!.name : '???' : '문 닫힘'}{rebirth.job && s.unlockedJobs.includes(rebirth.job) ? ' · 입장한 적 있음' : ''}</span>
            {rebirth.job && !rRevealed && rJob?.hint && <small className="door-hint">{rJob.hint}</small>}
            <small>{rebirth.note}</small>
        </button>
        <section className="panel door-card discovery-list">
            <span className="door-icon">{openCount ? <DoorOpen size={22}/> : <DoorClosed size={22}/>}</span>
            <strong>{DOORS[1].name} <small>{openCount} / {found.length} 열림</small></strong>
            <small>{DOORS[1].summary} 조건은 플레이 기록으로만 셉니다.</small>
            <ul className="discovery-doors">{found.map(({ d, open, entered, forced }) => { const j = jobOf(d.job), revealed = !!j && jobRevealed(s, j); return <li key={d.job} className={open ? 'open' : 'closed'}>
                <button type="button" disabled={!open} className={d.job === selectedId ? 'selected' : ''} onClick={() => onSelect(d.job)}>
                    <b>{open && revealed ? j!.name : '???'}</b><i>{d.hint}</i><em>{entered ? '입장한 적 있음' : forced ? '운영 이벤트로 열림' : open ? '열림' : '닫힘'}</em>
                </button>
            </li>; })}</ul>
        </section>
    </div>;
}

/** 지금 열려 있고 아직 들어가지 않은 문의 직업들(??? 탭 점·전투 화면 알림·빠른 찾기). 운영자가 연 윤회의 문 직업도 모두 넣습니다. v3.44 서버가 판정. */
export function openUnenteredDoors(s: State) {
    void s;
    return doorsOf().unentered.map(d => ({ door: doorName(d.door), job: d.job }));
}

const NOTICE_KEY = 'tidebound:door-notice';
const readSeen = () => { try { return localStorage.getItem(NOTICE_KEY) || ''; } catch { return ''; } };

/** 전투 화면 짧은 알림: 들어가지 않은 문이 새로 열리면 한 줄로 알립니다. 닫으면 같은 날 같은 문은 다시 띄우지 않습니다(이 브라우저만). */
export function DoorNotice({ s, setView }: { s: State; setView: (view: string) => void }) {
    const [seen, setSeen] = useState(readSeen);
    const open = openUnenteredDoors(s);
    const key = open.map(d => `${d.door.id}:${d.job}`).join(',') + `@${kst(serverNow(s)).date}`;
    // v25.9 전직이 열리는 Lv.10 전(첫 생)에는 문 알림을 띄우지 않습니다.
    if (!open.length || seen === key || (s.level < 10 && !s.rebirths)) return null;
    const dismiss = () => { setSeen(key); try { localStorage.setItem(NOTICE_KEY, key); } catch {} };
    return <div className="door-notice" role="status">
        <button type="button" className="door-notice-open" onClick={() => setView('classes')}><DoorOpen size={14}/><b>문이 열렸습니다</b><span>{[...new Set(open.map(d => d.door.name))].join(' · ')} {open.length}개 — 직업 화면 ??? 탭에서 확인하세요.</span></button>
        <button type="button" className="door-notice-dismiss" aria-label="문 알림 닫기" onClick={dismiss}><X size={14}/></button>
    </div>;
}
