'use client';
import { useState } from 'react';
import { Flame, X } from 'lucide-react';
import type { State } from '@/game/types';
import { serverNow } from './jobs/job-status';
import { josa } from '@/game/data/altar';

const NOTICE_KEY = 'tidebound:altar-notice';
const readSeen = () => { try { return localStorage.getItem(NOTICE_KEY) || ''; } catch { return ''; } };
const left = (ms: number) => { const m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };

/**
 * v27.44 전투 화면 제단 알림(문 알림과 같은 한 줄). 열린 축복과 남은 시간, 깨어난 신, 신의 자리 주인, 게이지 진행률을 보여 줍니다.
 * 누르면 제단 화면으로 갑니다. 닫으면 축복·신·자리 주인이 바뀔 때까지 다시 띄우지 않습니다(이 브라우저만).
 */
export function AltarNotice({ s, setView }: { s: State; setView: (view: string) => void }) {
    const [seen, setSeen] = useState(readSeen);
    const a = s.altarStatus;
    if (!a) return null;
    const now = serverNow(s), filling = a.gauges.filter(g => g.pct > 0).sort((x, y) => y.pct - x.pct).slice(0, 2);
    if (!a.blessings.length && !a.god && !a.raid && !a.throne && !filling.length) return null;
    const key = `${a.blessings.map(b => `${b.id}:${b.until}`).join(',')}|${a.god?.gen || 0}|${a.throne}|r${a.raid?.gen || 0}`;
    if (seen === key) return null;
    const parts = [
        ...a.blessings.map(b => `${b.name} 진행 중(${b.desc}) · ${left(b.until - now)} 남음`),
        a.god ? `${josa(a.god.name, '이가')} 깨어나 있습니다 · ${left(a.god.until - now)} 뒤 떠남` : '',
        a.raid ? `월드보스 ${a.raid.name} 체력 ${Math.round(a.raid.pct * 100)}% · ${left(a.raid.until - now)} 뒤 떠남` : '',
        !a.blessings.length && !a.god && !a.raid ? filling.map(g => `${g.name} ${g.pct}%`).join(' · ') : '',
        a.throne ? `신의 자리 · ${a.throne}` : '',
    ].filter(Boolean);
    const dismiss = () => { setSeen(key); try { localStorage.setItem(NOTICE_KEY, key); } catch { /* 저장소 없음 */ } };
    return <div className={`altar-notice ${a.blessings.length || a.god || a.raid ? 'live' : ''}`} role="status">
        <button type="button" className="altar-notice-open" onClick={() => setView('altar')}><Flame size={14}/><b>제단</b><span>{parts.join(' · ')}</span></button>
        <button type="button" className="altar-notice-dismiss" aria-label="제단 알림 닫기" onClick={dismiss}><X size={14}/></button>
    </div>;
}
