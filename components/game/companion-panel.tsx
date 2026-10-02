'use client';
import { Copy, Pause, Play } from 'lucide-react';
import type { PanelProps } from './panel-props';
import { Heading, SkillIcon, format } from './shared';
import { JOBS, jobById } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { STAGES } from '@/game/data/world';
import { RESEARCH, researchCost } from '@/game/data/economy';
import { apCapacity, apUsed, canUse, effectiveSkill, skillMastery } from '@/game/systems/progression';
import { companionUnlocked, companionState, companionStageOpen, companionSummary, companionMasteryScale, companionName } from '@/game/systems/companion';

/** v25.6 분신 낚시꾼: 직업·낚시터·스킬만 따로 고르고, 본체가 멈춰 있어도 숙련과 골드 일부를 쌓습니다. */
export function CompanionPanel({ s, send, busy }: PanelProps) {
    const unlocked = companionUnlocked(s), c = s.companion, research = RESEARCH.find(r => r.id === 'companion')!;
    const cs = companionState(s, c ?? { job: 'fisher', stage: 'brook', skills: [], running: false, carry: 0, masteryCarry: 0, kills: 0, gold: 0, mastery: 0 });
    const pool = SKILLS.filter(sk => canUse({ ...cs, skills: [] }, sk.id)), used = apUsed(cs), cap = apCapacity(cs), summary = companionSummary(s);
    const toggleSkill = (id: string) => send({ type: 'companion', id: 'skills', value: (c?.skills.includes(id) ? c.skills.filter(x => x !== id) : [...(c?.skills || []), id]).join(',') });
    return <>
        <Heading eyebrow="SECOND ROD" title="분신 낚시꾼" description="두 번째 낚싯대. 본체와 같은 계정 성장(레벨·능력치·환생·연구·업적·장비)을 그대로 쓰고 직업·스킬·낚시터만 따로 고릅니다. 경험치·드롭·사망 없이 직업·장착 스킬 숙련과 골드 25%를 쌓습니다."/>
        {!unlocked ? <section className="panel notice companion-locked"><Copy size={18}/><div><strong>두 번째 낚싯대 연구가 필요합니다.</strong><p>환생 화면 → 진주 연구 → 유틸 탭에서 ‘{research.name}’을 연구하세요(환생 {research.rebirth}회, {researchCost('companion', 0)}진주). 2단계는 분신 숙련 ×1.5.</p></div></section> : <>
        <section className="panel companion-status">
            <div className="section-title"><h2><Copy size={16}/> {companionName(s)}</h2><button className={c?.running ? 'secondary' : 'primary'} disabled={busy || !c} onClick={() => send({ type: 'companion', id: 'toggle', value: c?.running ? 'off' : 'on' })}>{c?.running ? <><Pause size={15}/> 멈추기</> : <><Play size={15}/> 사냥 시작</>}</button></div>
            {c ? <div className="companion-grid">
                <div><small>직업</small><strong>{jobById(c.job)?.name}</strong></div>
                <div><small>낚시터</small><strong>{STAGES.find(st => st.id === c.stage)?.name}</strong></div>
                <div><small>상태</small><strong>{c.running ? (summary ? '사냥 중' : '측정 중…') : '대기'}</strong></div>
                <div><small>모의전 승률</small><strong>{summary ? `${Math.round(summary.win * 100)}%` : '-'}</strong></div>
                <div><small>시간당 처치</small><strong>{summary ? format(Math.round(summary.killsPerHour)) : '-'}</strong></div>
                <div><small>시간당 숙련</small><strong>{summary ? format(Math.round(summary.masteryPerHour)) : '-'}<small> ×{companionMasteryScale(s)}</small></strong></div>
                <div><small>시간당 골드</small><strong>{summary ? format(Math.round(summary.goldPerHour)) : '-'}</strong></div>
                <div><small>누적</small><strong>{format(c.kills)}마리 · 숙련 {format(c.mastery)} · {format(c.gold)} G</strong></div>
            </div> : <p className="footnote">아래에서 직업과 낚시터를 고르면 분신이 생깁니다.</p>}
            <p className="footnote">처치율은 편성이 바뀌거나 3,000턴마다 고정 난수 모의전 6판으로 다시 잽니다. 승률이 낮으면 패배마다 회복 대기 {3}턴이 더해져 느려집니다. 해역 난이도·서약(거친 바다)은 본체 설정을 따릅니다.</p>
        </section>
        <div className="companion-columns">
            <section className="panel"><div className="section-title"><h2>직업</h2><span>전직해 본 직업</span></div>
                <select value={c?.job || ''} disabled={busy} aria-label="분신 직업" onChange={e => send({ type: 'companion', id: 'job', value: e.target.value })}><option value="" disabled>직업 선택</option>{JOBS.filter(j => s.unlockedJobs.includes(j.id)).map(j => <option key={j.id} value={j.id}>{j.name}{j.id === s.job ? ' (본체와 같음)' : ''}</option>)}</select>
                <p className="footnote">직업 숙련은 계정 공유라 본체가 다른 직업을 숙련하는 동안 분신이 또 하나를 숙달할 수 있습니다.</p>
            </section>
            <section className="panel"><div className="section-title"><h2>낚시터</h2><span>레벨·환생 조건을 채운 곳</span></div>
                <select value={c?.stage || ''} disabled={busy} aria-label="분신 낚시터" onChange={e => send({ type: 'companion', id: 'stage', value: e.target.value })}><option value="" disabled>낚시터 선택</option>{STAGES.filter(st => companionStageOpen(s, st.id)).map(st => <option key={st.id} value={st.id}>{st.name} · Lv.{st.level}+</option>)}</select>
                <p className="footnote">강한 곳일수록 숙련·골드는 많지만 승률이 떨어집니다. 모의전 승률 80% 이상을 권합니다.</p>
            </section>
        </div>
        {c && <section className="panel"><div className="section-title"><h2>분신 스킬 편성</h2><span>AP {used} / {cap} · 본체 편성과 별개</span></div>
            <div className="companion-skills">{pool.map(sk => { const on = c.skills.includes(sk.id), fx = effectiveSkill(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id), s.skillSpecializations?.[sk.id], s.skillPractice[sk.id] || 0); return <button type="button" key={sk.id} className={`companion-skill ${on ? 'on' : ''}`} aria-pressed={on} disabled={busy} onClick={() => toggleSkill(sk.id)}><SkillIcon id={sk.id}/><span><strong>{sk.name}</strong><small>{sk.type === 'active' ? '액티브' : '패시브'} · AP {fx.cost}{sk.type === 'active' ? ` · 발동 ${Math.round((fx.chance || 0) * 100)}%` : ''}</small></span></button>; })}</div>
            {!pool.length && <p className="footnote">이 직업으로 쓸 수 있는 스킬이 없습니다. 본체에서 계승하거나 전용 스킬이 있는 직업을 고르세요.</p>}
        </section>}
        </>}
    </>;
}
