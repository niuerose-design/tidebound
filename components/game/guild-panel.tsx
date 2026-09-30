'use client';
import type { PanelProps } from './panel-props';
import { useState } from 'react';
import { Flag, Users } from 'lucide-react';
import { guildLevelXp } from '@/game/data/guild';
import { Heading, Meter, format } from './shared';
import { guildLevelProgress } from '@/game/systems/guild';
const donateAmounts = [100, 500, 1000, 5000];
/** 길드는 이름·가입·명예 기부 기록만 다룹니다. 개인 성장 보너스·보상은 없습니다. */
export function Guild({ s, send, busy }: PanelProps) {
    const [name, setName] = useState(s.guild?.name || '심해개척단');
    const g = s.guild;
    const [shownGuild, setShownGuild] = useState(g?.name);
    if (g?.name && shownGuild !== g.name) { setShownGuild(g.name); setName(g.name); }
    if (!g?.name)
        return <>
        <Heading eyebrow="GUILD HALL" title="함께 남기는 항해의 기록" description="길드는 이름과 명예 기록을 남기는 공간입니다. 능력치나 보상은 주지 않습니다."/>
        <section className="panel guild-join-card">
        <Flag size={42}/>
        <div>
        <h2>길드를 창설하세요</h2>
        <p>창설 비용 1,000 G. 길드 이름·기부 기록은 환생 후에도 유지됩니다.</p>
        </div>
        <div className="guild-join-form">
        <input value={name} maxLength={16} onChange={e => setName(e.target.value)} aria-label="길드 이름"/>
        <button className="primary" disabled={busy || s.gold < 1000} onClick={() => send({ type: 'guildJoin', value: name })}>1,000 G로 창설</button>
        </div>
        </section>
    </>;
    const progress = guildLevelProgress(s);
    return <>
        <Heading eyebrow="GUILD HALL" title={g.name} description="기부는 명예로만 남습니다. 능력치·경험치·골드·드롭 보너스는 없습니다.">
    <span className="badge">명예 Lv. {g.level}</span>
    </Heading>
        <section className="panel guild-name-panel">
    <div>
    <h2>길드 이름</h2>
    <p>변경 비용 500 G.</p>
    </div>
    <div className="guild-name-form">
    <input value={name} maxLength={16} onChange={e => setName(e.target.value)} aria-label="길드 이름 변경"/>
    <button className="secondary" disabled={busy || s.gold < 500 || name.trim().length < 2 || name.trim() === g.name} onClick={() => send({ type: 'guildRename', value: name })}>이름 변경 · 500 G</button>
    </div>
    </section>
        <div className="guild-summary-grid">
    <div className="panel">
    <small>명예 경험치</small>
    <strong>{g.xp.toLocaleString()}<span> / {guildLevelXp(Math.max(1, g.level)).toLocaleString()}</span></strong>
    <Meter value={progress.current} max={progress.next} label={`명예 Lv.${g.level} · 다음 단계`}/>
    </div>
    <div className="panel">
    <small>누적 기부</small>
    <strong>{format(g.contribution)} G</strong>
    <p>환생과 무관하게 누적</p>
    </div>
    {(g.medals > 0 || g.raidBest > 0) && <div className="panel">
    <small>이전 기록</small>
    <strong>메달 {g.medals}</strong>
    <p>레이드 최고 {g.raidBest}단계 (종료된 콘텐츠)</p>
    </div>}
    </div>
        <section className="panel guild-donate">
    <div>
    <h2>명예 기부</h2>
    <p>기부한 골드는 길드 기록과 명예 경험치로만 남습니다. 돌려받을 수 없고 성장 보상은 없습니다.</p>
    </div>
    <div className="button-row">{donateAmounts.map(amount => <button key={amount} className="secondary" disabled={busy || s.gold < amount} onClick={() => send({ type: 'guildDonate', id: String(amount) })}>+{format(amount)} G</button>)}</div>
    </section>
        <div className="notice"><Users size={18}/> 길드 연구·임무·레이드는 v20.7에서 종료했습니다. 길드 이름·가입 정보·기부와 이전 기록은 보존됩니다.</div>
    </>;
}
