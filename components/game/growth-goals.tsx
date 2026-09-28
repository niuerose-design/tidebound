'use client';
import type { Action, State } from '@/game/types';
import { JOBS } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { DUNGEONS } from '@/game/data/world';
import { BOSS_RESEARCH, SPECIALIZATIONS } from '@/game/data/specializations';
import { skillPracticeTargets, canUse, jobRequirements, masteryMilestonesFor } from '@/game/systems/progression';
import { Meter } from './shared';

type Props = { s: State; send: (a: Action) => void; busy: boolean; setView?: (view: string) => void };
export function GrowthGoals({ s, send, busy, setView }: Props) {
    const goal = s.growthGoal;
    const skill = goal?.kind === 'skill' ? SKILLS.find(x => x.id === goal.id) : undefined;
    const job = goal?.kind === 'job' ? JOBS.find(x => x.id === goal.id) : undefined;
    const dungeon = goal?.kind === 'dungeon' ? DUNGEONS.find(x => x.id === goal.id) : undefined;
    const nextDungeon = [...DUNGEONS].sort((a,b)=>a.level-b.level).find(x=>!s.bossResearchClaims?.[x.id]);
    const nextSkill = SKILLS.find(x=>x.job===s.job && canUse(s,x.id) && (s.skillPractice[x.id] || 0)<skillPracticeTargets(x).at(-1)!) || SKILLS.find(x=>canUse(s,x.id)&&(s.skillPractice[x.id] || 0)<skillPracticeTargets(x).at(-1)!);
    const nextJob = JOBS.find(x=>x.parent===s.job&&!s.unlockedJobs.includes(x.id)) || JOBS.find(x=>x.tier===1&&!x.rebirth&&!s.unlockedJobs.includes(x.id));
    let title = '', detail = '', value = 0, max = 1, done = false, view = 'skills';
    if(skill){
        const stage = goal?.target || 1, base = masteryMilestonesFor(skill), all = skillPracticeTargets(skill); max = all[stage-1] || all.at(-1)!;
        value = s.skillPractice[skill.id] || 0; done = value>=max; title = `${skill.name} · ${stage>base.length?'장기 연마':'실전 숙련'} ${stage>base.length?stage-base.length:stage}단계`;
        detail = `${Math.min(value,max).toLocaleString()} / ${max.toLocaleString()} · ${stage===1 ? '무료 계승'+(skill.type==='active'?'·특화 선택':'') : stage>base.length?'직접 피해·양수 패시브 +4%':'스킬 성장·상위 전직 준비'}${!s.learned[skill.id] ? ' · 먼저 전용 직업에서 해금하세요.' : !canUse(s,skill.id) ? ' · 현재 사용 조건을 확인하세요.' : !s.skills.includes(skill.id) ? ' · 숙련하려면 장착하세요.' : ''}`;
    }
    if(job){const req=jobRequirements(s,job);done=s.unlockedJobs.includes(job.id);max=req.length;value=req.filter(x=>x.met).length;title=`${job.name} 전직`;detail=done?'해금 완료 · 다음 기술을 목표로 정해 보세요.':req.filter(x=>!x.met).map(x=>x.label).join(' · ')||'조건 충족 · 전직 화면에서 선택하세요.';view='classes';}
    if(dungeon){done=!!s.bossResearchClaims?.[dungeon.id];max=2;value=done?2:s.clears[dungeon.id]?1:0;title=`${dungeon.name} 연구`;const r=BOSS_RESEARCH[dungeon.id];detail=`첫 정복 → SP ${r?.sp || 0}${r?.specialization?' · '+SPECIALIZATIONS.find(x=>x.id===r.specialization)?.name+' 특화':''} · Lv.${dungeon.level}${dungeon.rebirth?' / 환생 '+dungeon.rebirth+'회':''}`;view='dungeons';}
    const suggestions = <div className="growth-suggestions">
        {nextSkill&&<button className="secondary" disabled={busy} onClick={()=>send({type:'growthGoal',id:nextSkill.id,value:'skill'})}>숙련 · {nextSkill.name}</button>}
        {nextJob&&<button className="secondary" disabled={busy} onClick={()=>send({type:'growthGoal',id:nextJob.id,value:'job'})}>전직 · {nextJob.name}</button>}
        {nextDungeon&&<button className="secondary" disabled={busy} onClick={()=>send({type:'growthGoal',id:nextDungeon.id,value:'dungeon'})}>도전 · {nextDungeon.name}</button>}
    </div>;
    return <section className="panel growth-goals" aria-label="이번 항해의 성장 목표">
        <div className="section-title"><h2>이번 항해의 목표</h2>{goal&&<button className="text-button" disabled={busy} onClick={()=>send({type:'growthGoal',id:'none'})}>목표 해제</button>}</div>
        {title?<><strong>{done?'달성 · ':''}{title}</strong><p>{detail}</p><Meter value={Math.min(value,max)} max={max}/>{setView&&<button className="text-button" onClick={()=>setView(view)}>{done?'다음 목표 고르기':'목표 화면 열기'} →</button>}<details><summary>다른 목표 보기</summary>{suggestions}</details></>:<><p>경험치로 다음 전직·환생을 준비하거나, 익숙한 낚시터에서 계승할 기술을 숙련하세요.</p>{suggestions}</>}
        <small>목표·실전 숙련·특화·보스 연구는 환생 후에도 유지됩니다.</small>
    </section>;
}
