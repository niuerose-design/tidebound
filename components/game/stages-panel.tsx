'use client';
import { RegionProgress } from './book-research';
import { ArrowUpRight, Lock, Waves } from 'lucide-react';
import { STAGES, closedIn, CLOSED_NOTE } from '@/game/data/world';
import { mimicStageMultiplier } from '@/game/data/mimic';
import { Heading } from './shared';
import type { PanelProps } from './panel-props';
import { TideSelector } from './tide-selector';
export function Stages({ s, send, busy }: PanelProps) {
    // 사냥터와 던전은 동시에 돌지 않습니다. 던전 탐험 중에는 현재 사냥터 표시를 지우고 이동을 막습니다(전투 레일과 같은 규칙).
    const inDungeon = !!s.dungeon;
    return <>
    <Heading eyebrow="WORLD MAP" title="사냥터" description="더 깊은 바다, 더 강한 몬스터. 오늘의 항해를 선택하세요."/>
    <TideSelector s={s} send={send} busy={busy}/>
    {inDungeon && <p className="footnote">던전 탐험 중에는 사냥이 멈춰 있고 사냥터를 바꿀 수 없습니다. 던전에서 귀환하거나 반복이 끝나면 사냥터로 돌아옵니다.</p>}
    {/* v27.34 지역(헤네시스 등)별로 묶어 보여 줍니다. 번호는 전체 순서 그대로입니다. */}
    {[...new Set(STAGES.map(st => st.region))].map(region => <section className="stage-region" key={region}>
    <h2 className="stage-region-title">{region}</h2>
    <div className="stage-grid">{STAGES.map((st, i) => st.region !== region ? null : (() => {
                const closed = closedIn(s, 'stages', st.id), locked = closed || s.level < st.level || s.rebirths < st.rebirth;
                const current = s.stage === st.id && !inDungeon;
                return <button key={st.id} className={`stage-card ${current ? 'selected' : ''}`} disabled={busy || locked || inDungeon} onClick={() => send({ type: 'stage', id: st.id })} style={{ '--stage-color': st.tone } as React.CSSProperties}>
                <div className="stage-top">
                <span className="stage-num">{String(i + 1).padStart(2, '0')}</span>{locked ? <Lock size={20}/> : current ? <span className="badge">현재 사냥터</span> : <ArrowUpRight />}</div>
                <Waves className="stage-wave" size={48}/>
                <div className="eyebrow">{closed ? CLOSED_NOTE : st.subtitle}</div>
                <h2>{st.place}</h2>
                <p>{st.description}</p>
                <div className="stage-footer">
                <span>Lv. {st.level}+{st.rebirth ? ` · 환생 ${st.rebirth}회` : ''}</span>
                <span>{st.fish.length}종 서식 · 까미 ×{mimicStageMultiplier(i).toFixed(2)}</span>
                </div>
                <RegionProgress s={s} id={st.id}/>
                </button>;
        })())}</div>
    </section>)}
    </>;
}
