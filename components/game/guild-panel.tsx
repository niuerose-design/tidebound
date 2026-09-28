'use client';
import { useEffect, useState } from 'react';
import { Gift, Flag, Swords, Users, Zap } from 'lucide-react';
import type { Action, State } from '@/game/types';
import { GUILD_MISSIONS, GUILD_RESEARCH, guildLevelXp, guildResearchCost } from '@/game/data/guild';
import { Heading, Meter, format } from './shared';
import { stats, power, goldMultiplier, dropRate } from '@/game/systems/stats';
import { guildLevelProgress } from '@/game/systems/guild';
type Props = {
    s: State;
    send: (a: Action) => void;
    busy: boolean;
};
const donateAmounts = [100, 500, 1000, 5000];
export function Guild({ s, send, busy }: Props) {
    const [name, setName] = useState(s.guild?.name || '심해개척단');
    const g = s.guild;
    const a = stats(s);
    useEffect(() => {
        if (g?.name)
            setName(g.name);
    }, [g?.name]);
    if (!g?.name)
        return <>
        <Heading eyebrow="GUILD HALL" title="함께 쌓는 항해의 기록" description="길드 금고에 골드를 모아 연구하고, 개인 기여도와 레이드 기록으로 다음 환생을 준비하세요."/>
        <section className="panel guild-join-card">
        <Flag size={42}/>
        <div>
        <h2>첫 길드를 창설하세요</h2>
        <p>창설 비용 1,000 G · 아래에서 이름을 정해 창설합니다. 길드 연구와 레이드가 즉시 열리고, 길드 기록은 환생 후에도 유지됩니다.</p>
        </div>
        <div className="guild-join-form">
        <input value={name} maxLength={16} onChange={e => setName(e.target.value)} aria-label="길드 이름"/>
        <button className="primary" disabled={busy || s.gold < 1000} onClick={() => send({ type: 'guildJoin', value: name })}>1,000 G로 창설</button>
        </div>
        </section>
        <div className="notice">길드는 현재 계정의 항해 기록을 중심으로 진행되는 개인 길드 콘텐츠입니다. 협동 보상 구조를 먼저 즐기고, 이후 실제 유저 길드 매칭으로 확장할 수 있습니다.</div>
    </>;
    const progress = guildLevelProgress(s);
    const raidCooldown = Math.max(0, 60 * 60 * 1000 - (Date.now() - g.lastRaid));
    return <>
        <Heading eyebrow="GUILD HALL" title={g.name} description="기부로 금고와 길드 레벨을 키우고, 연구·임무·레이드로 항해 전체를 강화하세요.">
    <span className="badge">길드 Lv. {g.level}</span>
    </Heading>
        <section className="panel guild-name-panel">
    <div>
    <h2>길드 이름</h2>
    <p>창설할 때 입력한 이름을 여기서도 변경할 수 있습니다. 변경 비용 500 G.</p>
    </div>
    <div className="guild-name-form">
    <input value={name} maxLength={16} onChange={e => setName(e.target.value)} aria-label="길드 이름 변경"/>
    <button className="secondary" disabled={busy || s.gold < 500 || name.trim().length < 2 || name.trim() === g.name} onClick={() => send({ type: 'guildRename', value: name })}>이름 변경 · 500 G</button>
    </div>
    </section>
        <div className="guild-summary-grid">
    <div className="panel">
    <small>길드 경험치</small>
    <strong>{g.xp.toLocaleString()}<span> / {guildLevelXp(g.level).toLocaleString()}</span>
    </strong>
    <Meter value={progress.current} max={progress.next} label={`Lv.${g.level} · 다음 레벨`}/>
    </div>
    <div className="panel">
    <small>길드 금고</small>
    <strong>{format(g.treasury)} G</strong>
    <p>연구·레이드 입장 비용으로 사용</p>
    </div>
    <div className="panel">
    <small>내 공헌도</small>
    <strong>{format(g.contribution)}</strong>
    <p>환생과 무관하게 누적</p>
    </div>
    <div className="panel">
    <small>길드 메달</small>
    <strong>{g.medals}</strong>
    <p>임무·레이드·레벨업 보상</p>
    </div>
    </div>
        <section className="panel guild-donate">
    <div>
    <h2>길드 금고에 기부</h2>
    <p>기부액의 10%가 길드 경험치가 됩니다. 길드 연구와 레이드에 다시 사용됩니다.</p>
    </div>
    <div className="button-row">{donateAmounts.map(amount => <button key={amount} className="secondary" disabled={busy || s.gold < amount} onClick={() => send({ type: 'guildDonate', id: String(amount) })}>+{format(amount)} G</button>)}</div>
    </section>
        <div className="section-title">
    <h2>길드 연구</h2>
    <span>현재 전투력 {format(power(a))} · 골드 ×{goldMultiplier(s).toFixed(2)} · 드롭 {(dropRate(s) * 100).toFixed(1)}%</span>
    </div>
    <div className="guild-research-grid">{GUILD_RESEARCH.map(r => {
            const rank = g.research[r.id] || 0, cost = guildResearchCost(r.id, rank);
            return <article className="panel guild-research-card" key={r.id}>
            <Zap size={24}/>
            <h3>{r.name}</h3>
            <p>{r.desc}</p>
            <Meter value={rank} max={r.max} label={`${rank} / ${r.max} 단계`}/>
            <button className="primary" disabled={busy || rank >= r.max || g.treasury < cost} onClick={() => send({ type: 'guildResearch', id: r.id })}>{rank >= r.max ? '연구 완료' : `금고 ${format(cost)} G`}</button>
            </article>;
        })}</div>
        <div className="section-title">
    <h2>길드 임무</h2>
    <span>완료 보상은 길드 메달과 경험치</span>
    </div>
    <div className="guild-mission-grid">{GUILD_MISSIONS.map(m => {
            const value = m.id === 'kills' ? g.missionKills : g.missionDungeons, claimed = g.missionClaimed[m.id];
            return <article className="panel guild-mission-card" key={m.id}>
            <Gift size={24}/>
            <h3>{m.name}</h3>
            <p>{m.desc}</p>
            <Meter value={Math.min(value, m.goal)} max={m.goal} label={`${Math.min(value, m.goal)} / ${m.goal}`}/>
            <button className={claimed ? 'secondary' : 'gold-button'} disabled={busy || claimed || value < m.goal} onClick={() => send({ type: 'guildClaim', id: m.id })}>{claimed ? '보상 수령 완료' : `메달 +${m.reward} 받기`}</button>
            </article>;
        })}</div>
        <section className="panel guild-raid">
    <div>
    <h2>
    <Swords size={22}/> 길드 레이드 · {g.raidTier}단계</h2>
    <p>입장료는 길드 금고에서 차감됩니다. 현재 전투력과 길드 레벨을 합산해 한 번의 공격으로 보스를 판정합니다.</p>
    <small>최고 정복 단계 {g.raidBest} · 다음 입장료 {format(1000 + g.raidTier * 500)} G · {raidCooldown ? `${Math.ceil(raidCooldown / 60000)}분 후 재충전` : '입장 가능'}</small>
    </div>
    <button className="gold-button" disabled={busy || !!raidCooldown} onClick={() => send({ type: 'guildRaid' })}>레이드 입장</button>
    </section>
        <div className="notice">
    <Users size={18}/> 길드 연구는 물리·마법 공격, 체력, 골드, 장비 드롭 확률에 실제로 적용됩니다. 길드 이름·금고·연구·메달·레이드 최고 기록은 환생해도 보존됩니다.</div>
    </>;
}
