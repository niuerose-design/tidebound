'use client';
import { RegionProgress } from './book-research';
import { ArrowUpRight, Lock, Waves } from 'lucide-react';
import { STAGES } from '@/game/data/world';
import { Heading } from './shared';
import type { PanelProps } from './panel-props';
import { TideSelector } from './tide-selector';
export function Stages({ s, send, busy }: PanelProps) {
    return <>
    <Heading eyebrow="WORLD MAP" title="낚시터" description="더 깊은 바다, 더 강한 물고기. 오늘의 항해를 선택하세요."/>
    <TideSelector s={s} send={send} busy={busy}/>
    <div className="stage-grid">{STAGES.map((st, i) => {
            const locked = s.level < st.level || s.rebirths < st.rebirth;
            return <button key={st.id} className={`stage-card ${s.stage === st.id ? 'selected' : ''}`} disabled={busy || locked} onClick={() => send({ type: 'stage', id: st.id })} style={{ '--stage-color': st.tone } as React.CSSProperties}>
            <div className="stage-top">
            <span className="stage-num">0{i + 1}</span>{locked ? <Lock size={20}/> : s.stage === st.id ? <span className="badge">현재 낚시터</span> : <ArrowUpRight />}</div>
            <Waves className="stage-wave" size={48}/>
            <div className="eyebrow">{st.subtitle}</div>
            <h2>{st.name}</h2>
            <p>{st.description}</p>
            <div className="stage-footer">
            <span>Lv. {st.level}+{st.rebirth ? ` · 환생 ${st.rebirth}회` : ''}</span>
            <span>{st.fish.length}종 서식</span>
            </div>
            <RegionProgress s={s} id={st.id}/>
            </button>;
        })}</div>
    </>;
}
