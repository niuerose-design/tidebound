'use client';
import { useState } from 'react';
import { Flame, Swords, X } from 'lucide-react';
import type { State } from '@/game/types';
import { serverNow } from './jobs/job-status';
import { josa } from '@/game/data/altar';

const NOTICE_KEY = 'tidebound:altar-notice';
const readSeen = () => { try { return localStorage.getItem(NOTICE_KEY) || ''; } catch { return ''; } };
const left = (ms: number) => { const m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };

/**
 * v27.44 전투 화면 제단 알림(문 알림과 같은 한 줄). v3.18 축복은 이름(단계)과 남은 시간만, 월드보스는 아래 별도 줄로 분리(각각 따로 닫음).
 * 누르면 제단 화면으로 갑니다. 닫으면 축복·신·자리 주인이 바뀔 때까지 다시 띄우지 않습니다(이 브라우저만).
 */
export function AltarNotice({ s, setView }: { s: State; setView: (view: string) => void }) {
    const [seen, setSeen] = useState(readSeen);
    const a = s.altarStatus;
    if (!a) return null;
    const now = serverNow(s), filling = a.gauges.filter(g => g.pct > 0 && !/^(balrog|zakum|horntail)$/.test(g.id)).sort((x, y) => y.pct - x.pct).slice(0, 2);
    // v3.18 제단 줄은 축복 이름(단계 포함)과 남은 시간만, 신·신의 자리는 짧게. 월드보스는 아래 별도 줄.
    const altarKey = `${a.blessings.map(b => `${b.id}:${b.until}`).join(',')}|${a.god?.gen || 0}|${a.throne}`, raidKey = `raid:${a.raid?.gen || 0}:${a.raid?.until || 0}`;
    const [seenAltar, seenRaid] = seen.split('||');
    const altarParts = [
        ...a.blessings.map(b => `${b.name} · ${left(b.until - now)} 남음`),
        a.god ? `${josa(a.god.name, '이가')} 깨어남 · ${left(a.god.until - now)} 뒤 떠남` : '',
        !a.blessings.length && !a.god ? filling.map(g => `${g.name} ${g.pct}%`).join(' · ') : '',
        a.throne ? `신의 자리 · ${a.throne}` : '',
    ].filter(Boolean);
    const showAltar = altarParts.length > 0 && seenAltar !== altarKey, showRaid = !!a.raid && seenRaid !== raidKey;
    if (!showAltar && !showRaid) return null;
    const save = (next: string) => { setSeen(next); try { localStorage.setItem(NOTICE_KEY, next); } catch { /* 저장소 없음 */ } };
    const dismissAltar = () => save(`${altarKey}||${seenRaid || ''}`), dismissRaid = () => save(`${seenAltar || ''}||${raidKey}`);
    return <>
        {showAltar && <div className={`altar-notice ${a.blessings.length || a.god ? 'live' : ''}`} role="status">
            <button type="button" className="altar-notice-open" onClick={() => setView('altar')}><Flame size={14}/><b>제단</b><span>{altarParts.join(' · ')}</span></button>
            <button type="button" className="altar-notice-dismiss" aria-label="제단 알림 닫기" onClick={dismissAltar}><X size={14}/></button>
        </div>}
        {showRaid && a.raid && <div className="altar-notice live raid-notice" role="status">
            <button type="button" className="altar-notice-open" onClick={() => setView('altar')}><Swords size={14}/><b>월드보스</b><span>{a.raid.name} · 체력 {Math.round(a.raid.pct * 100)}% · {left(a.raid.until - now)} 뒤 떠남</span></button>
            <button type="button" className="altar-notice-dismiss" aria-label="월드보스 알림 닫기" onClick={dismissRaid}><X size={14}/></button>
        </div>}
    </>;
}
