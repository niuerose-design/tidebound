'use client';
import { ChevronRight, Leaf } from 'lucide-react';
import { xpNeeded } from '@/game/data/balance';
import { jobById } from '@/game/data/classes';
import { power, stats } from '@/game/systems/stats';
import { format } from './shared';
import type { State } from '@/game/types';

/** 모바일 전용 요약: 레벨·직업·전투력과 경험치·체력·마나를 화면 맨 위에 한 줄로 보여 줍니다. 누르면 능력치 화면으로 갑니다. */
export function MobileFisherStrip({ s, setView }: { s: State; setView: (v: string) => void }) {
    const a = stats(s), need = xpNeeded(s.level), exp = Math.min(1, s.exp / Math.max(1, need));
    const bar = (value: number, max: number) => `${Math.max(0, Math.min(100, value / Math.max(1, max) * 100))}%`;
    return <button type="button" className="mobile-fisher-strip" onClick={() => setView('character')} aria-label="나의 모험가 능력치 보기">
        <span className="mobile-fisher-badge"><Leaf size={15}/><b>Lv.{s.level}</b></span>
        <span className="mobile-fisher-main">
            <span className="mobile-fisher-head"><strong>{s.name}</strong><small>{jobById(s.job)?.name} · 환생 {s.rebirths}회</small><em>전투력 {format(power(a))}</em></span>
            <span className="mobile-fisher-bar exp" aria-label={`경험치 ${Math.floor(exp * 100)}%`}><i style={{ width: bar(s.exp, need) }}/><small>EXP {(exp * 100).toFixed(1)}% · {format(s.exp)} / {format(need)}</small></span>
            <span className="mobile-fisher-mini"><span className="mobile-fisher-bar hp"><i style={{ width: bar(s.hp, a.hp) }}/><small>HP {format(Math.ceil(s.hp))}</small></span><span className="mobile-fisher-bar mana"><i style={{ width: bar(s.mana, a.mana) }}/><small>MP {format(Math.floor(s.mana))}</small></span></span>
        </span>
        <ChevronRight size={16} className="mobile-fisher-chevron"/>
    </button>;
}
