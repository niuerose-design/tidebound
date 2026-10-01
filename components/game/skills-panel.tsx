'use client';

import type { PanelProps } from './panel-props';
import { ConfirmButton } from './confirm-button';
import { thresholdRank, refinementBonusLabel } from '@/game/data/long-term';
import { useState } from 'react';
import { ArrowUp, Info, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Skill } from '@/game/types';
import { JOBS, jobById } from '@/game/data/classes';
import { SKILLS, skillById } from '@/game/data/skills';
import { BALANCE } from '@/game/data/balance';
import { skillRefinementTargets, apCapacity, apUsed, canUse, canInheritSkill, canSpendSkill, effectiveSkill, inherited, masteryMilestonesFor, maxSkillLevel, skillLevel, skillMastery, skillRankHint, validLoadout, skillUnlockReady, masteryGainBonus } from '@/game/systems/progression';
import { Heading, Meter, SkillIcon } from './shared';
import { masteryConditionText } from '@/game/systems/mastery';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { skillGrowthStages, skillEffectLines, skillBonusText, skillPercent } from '@/game/systems/skill-description';
import { DUNGEONS } from '@/game/data/world';
import { SPECIALIZATIONS, specializationFits } from '@/game/data/specializations';
import { ENEMY_SKILLS } from '@/game/data/encounters';



function SkillCard({ sk, s, send, busy, detailed }: PanelProps & { sk: Skill; detailed: boolean }) {
    const rank = s.learned[sk.id] || 0, acquired = rank > 0;
    const practice = s.skillPractice[sk.id] || 0, mastery = skillMastery(s, sk.id);
    const level = skillLevel(sk, rank || 1, mastery), max = maxSkillLevel(sk), milestones = masteryMilestonesFor(sk);
    const nextMastery = milestones[mastery], nextGrowth = milestones[level];
    const effective = effectiveSkill(sk, rank || 1, mastery, s.skillSpecializations?.[sk.id], s.skillPractice[sk.id] || 0), cost = effective.cost ?? 2;
    const equipped = s.skills.includes(sk.id), usable = canUse(s, sk.id), isInherited = inherited(s, sk.id);
    const paidInheritance = !!s.skillInheritances[sk.id];
    const unlockText = !skillUnlockReady(s, sk) ? `직업 숙련 ${sk.unlockJobMastery!.toLocaleString()} 필요` : sk.job !== s.job ? '전직 필요' : s.rebirths < (sk.rebirth || 0) ? `환생 ${sk.rebirth}회 필요` : `Lv.${sk.level}에 자동 해금`;
    const inheritanceText = !acquired ? unlockText : !sk.job ? '공용' : isInherited ? (mastery > 0 ? '숙련 계승' : 'SP 계승') : sk.job === s.job ? '현재 직업 전용' : '계승 필요';
    const hint = skillRankHint(sk, rank || 1, mastery, s.skillSpecializations?.[sk.id], s.skillPractice[sk.id] || 0);
    const effects = skillEffectLines(effective, level);
    // 능력치 보너스는 아래 칩으로 보여주므로, 간단히 보기 설명에는 칩으로 나타낼 수 없는 효과(회복·숙련 보너스·최대 성장 보상 등)만 씁니다.
    const bonusLines = new Set(Object.entries(effective.bonus || {}).map(([key, n]) => skillBonusText(key, n as number)));
    const passiveEffects = effects.filter(line => !bonusLines.has(line));
    const growth = skillGrowthStages(sk);
    const refinement = skillRefinementTargets(sk), refined = thresholdRank(practice, refinement);
    const equipAllowed = validLoadout(s, equipped ? s.skills.filter(id => id !== sk.id) : [...s.skills, sk.id]);
    return <article className={`panel skill-card ${equipped ? 'chosen' : ''} ${!acquired ? 'locked' : ''} ${detailed ? 'expanded' : 'compact'}`} title={detailed ? undefined : `${effects.join(" · ")}\n다음 강화: ${hint}`}>
        <div className="skill-title"><div className="icon-box"><SkillIcon id={sk.id}/></div><div><h3>{sk.name}</h3><small>{jobById(sk.job)?.name || '공용'} · 캐릭터 Lv.{sk.level}{sk.rebirth ? ` · 환생 ${sk.rebirth}회` : ''}</small></div></div>
        {!detailed && <span className={`skill-status-badge ${equipped && usable ? 'on' : !acquired || !usable ? 'off' : ''}`}>{equipped ? (usable ? '장착 중' : '장착 · 사용 불가') : !acquired ? '미습득' : !usable ? '계승 필요' : '사용 가능'}</span>}
        {detailed && <div className="skill-state-row" aria-label="스킬 상태"><span className={acquired ? 'on' : 'off'}><small>습득</small>{acquired ? '습득' : '미습득'}</span><span className={!sk.job || isInherited ? 'on' : 'off'}><small>다른 직업</small>{!sk.job ? '공용 · 모든 직업' : isInherited ? '계승 완료 · 사용 가능' : '계승 필요'}</span><span className={equipped ? (usable ? 'on' : 'warn') : 'off'}><small>장착</small>{equipped ? (usable ? '장착 중' : '장착 · 지금은 사용 불가') : '미장착'}</span></div>}
        {detailed && <div className="skill-level-line"><strong>{acquired ? `성장 Lv.${level}` : '미해금'} <small>/ 최대 {max}{acquired ? ` · SP Lv.${Math.min(max, Math.max(0, rank - 1))} · 숙련 Lv.${Math.min(max, mastery)} 중 높은 값` : ''}</small></strong>{!acquired && <span>{inheritanceText}</span>}<TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="info-trigger" aria-label={`${sk.name} 현재 효과와 다음 강화`}><Info size={16}/></button></TooltipTrigger><TooltipContent className="game-tooltip"><strong>성장 Lv.{level} / {max}</strong><p>{effects.join(' · ')}</p><p>다음 강화: {hint}</p></TooltipContent></Tooltip></TooltipProvider></div>}
        {!detailed && <><p className="skill-current-description">{sk.type === 'active' ? effects.slice(0, 2).join(' · ') : sk.id === 'boneLegacy' ? '처음에는 생존력이 낮아지지만, 성장하면 체력·방어와 장착 AP 여유를 얻습니다.' : passiveEffects.join(' · ') || '장착한 동안 아래 능력치가 적용됩니다.'}</p></>}{sk.id === 'rareSense' && <p className="skill-specific-note">물고기 출현률과 장비 등급 확률은 바뀌지 않습니다.</p>}
        {sk.unlockJobMastery && (detailed || !acquired) && <div className="skill-unlock-note">최초 해금: {jobById(sk.job)?.name} 숙련도 <b>{(s.jobMastery[sk.job!] || 0).toLocaleString()} / {sk.unlockJobMastery.toLocaleString()}</b><small>해금 전에는 SP로 구매·계승할 수 없습니다.</small></div>}
        {detailed && (sk.sourceEnemySkill && <div className="skill-origin">몬스터 원형: {ENEMY_SKILLS.find(x => x.id === sk.sourceEnemySkill)?.name}</div>)}
        {detailed && sk.masteryGain && <div className="skill-unlock-note"><b>대상 승리 시 숙련 ×{1 + masteryGainBonus(sk, level)}</b><span>{masteryConditionText(sk)}</span><small>현재 직업·장착 스킬에 적용 · 가장 높은 보너스 하나만 · 최대 ×10</small></div>}
        {detailed && <Meter value={Math.min(practice, nextMastery || milestones[max - 1])} max={nextMastery || milestones[max - 1]} label={level >= max ? '실전 숙련 · 최대 성장 완료' : `실전 숙련 · Lv.${level + 1}까지 ${Math.max(0, nextGrowth - practice).toLocaleString()} 남음 (또는 1 SP)`}/>}
        {!detailed && <div className="skill-brief-stats"><span>{sk.type === 'active' ? '액티브' : '패시브'}</span><span className={cost < 0 ? 'ap-gain' : ''}>장착 AP {cost}{cost < 0 ? ` · 여유 +${-cost}` : ''}</span>{sk.type === 'active' && <><span>발동 {skillPercent(effective.chance)}</span><span>마나 {effective.manaCost ?? 0}</span></>}{sk.type === 'passive' && Object.entries(effective.bonus || {}).map(([key, n]) => <span className={n < 0 ? 'negative' : ''} key={key}>{skillBonusText(key, n)}</span>)}</div>}
        {!detailed && <div className="skill-compact-growth"><span>{acquired ? `성장 Lv.${level} / ${max}` : unlockText}</span><span>{nextMastery ? `숙련 ${practice.toLocaleString()} / ${nextMastery.toLocaleString()}` : '숙련 완료'}</span></div>}
        {!detailed && acquired && <Meter value={Math.min(practice, nextMastery || milestones[max - 1])} max={nextMastery || milestones[max - 1]}/>}
        {detailed && <>
            {sk.condition && <div className="condition-label">{sk.condition === 'wounded' ? '내 체력 70% 이하에서 발동 판정' : '상대 체력 60% 이상에서 발동 판정'}</div>}
            <div className="skill-stage-table-wrap" tabIndex={0} role="region" aria-label={`${sk.name} 단계별 실제 효과`}><table className="skill-stage-table skill-growth-table"><caption>기본 성장 효과 <small>특화 적용 전 · 필요 숙련은 누적 수치 · 기본 Lv.0부터 사용</small></caption><thead><tr><th>성장</th><th>필요 숙련</th><th>AP</th>{sk.type === 'active' && <><th>발동</th><th>마나</th><th>대기</th></>}<th>실제 효과</th></tr></thead><tbody>{growth.map(row => <tr key={row.level} className={level === row.level && acquired ? 'current' : ''}><th>Lv.{row.level}{level === row.level && acquired && <small>현재</small>}</th><td>{row.practice ? row.practice.toLocaleString() : '기본 해금'}</td><td className={(row.effective.cost || 0) < 0 ? 'ap-gain' : ''}>{row.effective.cost}</td>{sk.type === 'active' && <><td>{skillPercent(row.effective.chance)}</td><td>{row.effective.manaCost}</td><td>{row.effective.cooldown}턴</td></>}<td className="skill-stage-effects">{row.effects.map((text, i) => <span key={i}>{text}</span>)}</td></tr>)}</tbody></table></div>
            <p className="footnote">{sk.type === 'active' ? '피해식은 상대 방어·치명타·약화 적용 전입니다. 추가 공격은 각각 명중과 치명타를 판정합니다.' : '능력치 증가량은 직업·연구 배율 적용 전입니다. 조건부 숙련 보너스는 가장 높은 하나만 적용됩니다.'} {!sk.job ? '공용 기술은 계승 없이 사용할 수 있습니다.' : `무료 계승: 누적 숙련 ${milestones[0].toLocaleString()}. SP 계승은 숙련도를 올리지 않습니다.`} 숙련·SP 중 높은 성장 레벨만 적용하며, 다른 직업의 전직 선행조건에는 실전 숙련만 인정됩니다.</p>
        </>}
        {acquired && sk.type === 'active' && <details className="skill-specialization"><summary>스킬 특화 · {SPECIALIZATIONS.find(x=>x.id===s.skillSpecializations?.[sk.id], s.skillPractice[sk.id] || 0)?.name || '기본형'}</summary>
            <p>실전 숙련 1단계부터 하나를 선택합니다. SP 강화로는 특화가 열리지 않습니다. 낚시 중단·던전 귀환 후 무료 변경.</p>
            <button className="secondary" disabled={busy || s.running || !!s.dungeon || !usable || !s.skillSpecializations?.[sk.id]} onClick={()=>send({type:'specialize',id:sk.id,value:'none'})}>기본형으로 복귀</button>
            {SPECIALIZATIONS.filter(x=>specializationFits(sk,x)).map(spec=>{const locked=mastery<1||!!(spec.dungeon&&!s.bossResearchClaims?.[spec.dungeon]);return <div className="specialization-option" key={spec.id}><strong>{spec.name}{s.skillSpecializations?.[sk.id]===spec.id?' · 선택 중':''}</strong><p>{spec.description}</p>{spec.dungeon&&<small>{DUNGEONS.find(x=>x.id===spec.dungeon)?.name} {s.bossResearchClaims?.[spec.dungeon] ? '연구 완료' : '연구 보상 필요'}</small>}<button className="secondary" disabled={busy||s.running||!!s.dungeon||!usable||locked||s.skillSpecializations?.[sk.id]===spec.id} onClick={()=>send({type:'specialize',id:sk.id,value:spec.id})}>{mastery<1?'실전 숙련 1단계 필요':locked?'보스 연구 필요':'이 특화 선택'}</button></div>})}
        </details>}
        {acquired && refinement.length > 0 && <details className="skill-specialization"><summary>장기 연마 · {refined} / {refinement.length}단계 · 누적 {refinementBonusLabel(refined)}</summary><p>기본 숙련을 마친 뒤에도 실전 수련이 이어집니다. 단계마다 직접 피해 배율·양수 패시브 수치 {refinementBonusLabel()}씩(합산, 최대 {refinementBonusLabel(refinement.length)}). SP로 건너뛸 수 없고, AP·발동률·숙련 배수는 늘지 않습니다.</p><p>{refined < refinement.length ? `다음 ${refined+1}단계 ${refinement[refined].toLocaleString()} · 남은 숙련 ${(refinement[refined]-practice).toLocaleString()}` : '모든 연마 단계를 달성했습니다.'} · 최종 {refinement.at(-1)!.toLocaleString()}</p><Meter value={Math.min(practice,refinement[refined] || refinement.at(-1)!)} max={refinement[refined] || refinement.at(-1)!} label={refined===refinement.length?'연마 완료':'다음 연마까지'}/></details>}
        {detailed && <button className="text-button" disabled={busy} onClick={()=>send({type:'growthGoal',id:sk.id,value:'skill'})}>다음 실전 숙련을 장기 목표로</button>}
        <div className="skill-actions skill-actions-v2">
            {sk.job && acquired && !isInherited && <ConfirmButton label="계승 · 1 SP" description={`${sk.name}을 다른 직업에서도 사용할 수 있게 합니다. 성장 레벨과 숙련도는 변하지 않습니다. 숙련도 ${milestones[0].toLocaleString()}을 쌓으면 SP 없이도 계승됩니다.`} disabled={busy || !canInheritSkill(s, sk.id) || s.sp < 1} onConfirm={() => send({ type: 'inheritSkill', id: sk.id })}/>}
            {acquired && <ConfirmButton label={level >= max ? '최대 레벨' : '강화 · 1 SP'} description={`${sk.name} 성장 Lv.${level} → Lv.${level + 1}. ${hint} 숙련은 계속 쌓이며 SP와 효과가 중첩되지는 않습니다. 이 강화만으로 계승되지는 않습니다.`} disabled={busy || !canSpendSkill(s, sk.id) || s.sp < 1} onConfirm={() => send({ type: 'learn', id: sk.id })}/>}
            <button className={equipped ? 'secondary' : 'primary'} disabled={busy || !usable || !equipAllowed} title={equipped && !equipAllowed ? 'AP를 지원하는 스킬입니다. 다른 기술을 먼저 해제하세요.' : undefined} onClick={() => send({ type: 'skill', id: sk.id })}>{equipped ? '장착 해제' : !acquired ? unlockText : !usable ? '계승·레벨 조건 필요' : '장착'}</button>
        </div>
        {paidInheritance && mastery > 0 && detailed && <small className="footnote">실전 숙련으로 무료 계승도 완료했습니다. SP 투자 환급 시 숙련 계승은 유지됩니다.</small>}
    </article>;
}

export function Skills({ s, send, busy }: PanelProps) {
    const [scope, setScope] = useState('current'), [filter, setFilter] = useState('all'), [view, setView] = useState('simple');
    const currentJob = jobById(s.job) || JOBS[0], used = apUsed(s), cap = apCapacity(s);
    const list = SKILLS.filter(sk => {
        const acquired = (s.learned[sk.id] || 0) > 0;
        if (scope === 'current' && sk.job !== s.job && !(s.job === 'fisher' && !sk.job)) return false;
        if (scope === 'common' && sk.job) return false;
        if (scope === 'owned' && !acquired) return false;
        return filter === 'unlearned' ? !acquired : filter === 'usable' ? canUse(s, sk.id) : true;
    });
    return <>
        <Heading eyebrow="SKILL LABORATORY" title="직업을 거쳐, 나만의 편성으로" description="전직 스킬은 무료로 사용합니다. 장착 후 승리로 계승·강화하거나, 얻어 둔 스킬에 1 SP를 투자하세요.">
            <ConfirmButton label="SP 투자 환급" description="사용한 SP만 환급합니다. 해금한 스킬·실전 숙련은 남고, SP로만 얻은 계승과 강화는 취소됩니다. 현재 편성이 AP를 넘으면 일부 스킬이 해제됩니다." disabled={busy || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetSkills' })}/>
        </Heading>
        <div className="skill-resource-grid"><div className="panel"><small>장착 AP</small><strong>{used}<span> / {cap}</span></strong><Meter value={Math.max(0, used)} max={cap}/><p>음수 AP 스킬은 편성 여유를 늘립니다.</p></div><div className="panel"><small>보유 SP</small><strong>{s.sp}</strong><p>보스 첫 정복 연구·종별 {BALANCE.bookMilestones.at(-1)!.toLocaleString()}회 연구 · 레벨업 지급 없음</p></div><div className="panel"><small>계승한 직업 스킬</small><strong>{SKILLS.filter(sk => sk.job && (s.learned[sk.id] || 0) > 0 && inherited(s, sk.id)).length}</strong><p>숙련 계승과 SP 계승을 함께 셉니다.</p></div></div>
        <details className="mastery-stack-note panel"><summary><Sparkles size={16}/> 스킬 성장 규칙</summary><span>전직으로 <b>기본 Lv.0</b> 해금 → 장착 후 승리로 Lv.1부터 성장·무료 계승. SP 계승과 강화는 <b>각 1 SP</b>이며, 해금한 기술에만 사용합니다. 숙련 강화와 SP 강화는 같은 성장 단계를 열고 효과를 중복해서 더하지 않습니다.</span></details>
        <section className="panel loadout"><div className="section-title"><h2>현재 편성</h2><span>개수 제한 없음 · 총 AP만 제한</span></div><div className="loadout-columns">{(['active', 'passive'] as const).map(type => {
            const ids = s.skills.filter(id => skillById(id)?.type === type);
            return <div className={`loadout-column loadout-${type}`} key={type}><h3>{type === 'active' ? '액티브' : '패시브'}<small>{type === 'active' ? '위에서부터 먼저 판정 · 처음 성공한 하나만 사용' : '장착 효과 · 순서 무관'}</small></h3>
                <ol className="loadout-row">{ids.map((id, i) => {
                    const sk = skillById(id)!;
                    const rank = s.learned[id] || 1, mastery = skillMastery(s, id), fx = effectiveSkill(sk, rank, mastery, s.skillSpecializations?.[id], s.skillPractice[id] || 0);
                    return <li className="loadout-skill" key={id}>{type === 'active' && <span className="loadout-order" aria-label={`판정 ${i + 1}순위`}>{i + 1}</span>}<SkillIcon id={id}/><div><strong>{sk.name} · Lv.{skillLevel(sk, rank, mastery)}</strong><small>AP {fx.cost}{type === 'active' ? ` · 발동 ${Math.round((fx.chance || 0) * 100)}%` : ''}</small></div>{type === 'active' && i > 0 && <button className="icon-button" aria-label={`${sk.name} 우선순위 올리기`} disabled={busy} onClick={() => send({ type: 'skillUp', id })}><ArrowUp size={16}/></button>}<button className="text-button" disabled={busy || !validLoadout(s, s.skills.filter(x => x !== id))} onClick={() => send({ type: 'skill', id })}>해제</button></li>;
                })}</ol>
                {!ids.length && <p className="loadout-empty">{type === 'active' ? '액티브가 없으면 기본 공격만 합니다.' : '장착한 패시브가 없습니다.'}</p>}
            </div>;
        })}</div><div className="preset-row">{['1', '2', '3'].map(id => <div key={id}><span>편성 {id}<small>{s.presets[id] ? `${s.presets[id].skills.length}개 스킬` : '저장 없음'}</small></span><button className="text-button" disabled={busy} onClick={() => send({ type: 'savePreset', id })}>저장</button><button className="text-button" disabled={busy || !s.presets[id]} onClick={() => send({ type: 'loadPreset', id })}>불러오기</button></div>)}</div></section>
        <div className="skill-view-toolbar"><Tabs value={scope} onValueChange={setScope}><TabsList className="game-tabs"><TabsTrigger value="current">{currentJob.name} 전용</TabsTrigger><TabsTrigger value="owned">해금한 스킬</TabsTrigger><TabsTrigger value="common">공용</TabsTrigger><TabsTrigger value="all">전체 계보</TabsTrigger></TabsList></Tabs><div className="skill-view-toggle" role="group" aria-label="스킬 보기 방식"><button className={view === 'simple' ? 'active' : ''} aria-pressed={view === 'simple'} onClick={() => setView('simple')}>간단히 보기</button><button className={view === 'detail' ? 'active' : ''} aria-pressed={view === 'detail'} onClick={() => setView('detail')}>자세히 보기</button></div></div>
        <Tabs value={filter} onValueChange={setFilter}><TabsList className="game-tabs"><TabsTrigger value="all">모두</TabsTrigger><TabsTrigger value="usable">사용 가능</TabsTrigger><TabsTrigger value="unlearned">미해금</TabsTrigger></TabsList></Tabs>
        {(['active', 'passive'] as const).map(type => <section className="skill-family" key={type}><div className="section-title"><h2>{type === 'active' ? '액티브 · 확률 발동' : '패시브 · 장착 효과'}</h2><span>{list.filter(sk => sk.type === type).length}종</span></div><div className={`skill-grid ${view === 'detail' ? 'skill-grid-detailed' : ''}`}>{list.filter(sk => sk.type === type).map(sk => <SkillCard key={sk.id} sk={sk} s={s} send={send} busy={busy} detailed={view === 'detail'}/>)}</div>{!list.some(sk => sk.type === type) && <div className="notice">이 범위에 해당하는 스킬이 없습니다.</div>}</section>)}
        <p className="footnote">액티브는 편성 순서대로 판정해 처음 성공한 하나만 사용합니다. 모두 실패하면 기본 공격합니다. 숙련은 장착하고 승리할 때 기본 1씩, 조건부 패시브가 있으면 최대 10씩 증가하며, 환생과 전직 후에도 보존됩니다. SP 강화·계승은 직업 전직에 필요한 실전 숙련도를 대신하지 않습니다.</p>
    </>;
}
