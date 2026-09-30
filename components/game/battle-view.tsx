'use client';
import Image from 'next/image';
import { VoyageNotice } from './guidance-panels';
import { useState } from 'react';
import { BookOpen, Check, ChevronRight, Coins, Compass, Fish, Pause, Play, RefreshCw, Sparkles, Swords, Target, Waves } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heading, Meter, SkillIcon, SlotIcon, format, Num } from './shared';
import { STAGES, DUNGEONS, FISH, SWARM_SIZES, SWARM_UNLOCK, swarmHpMultiplier, swarmAttackMultiplier } from '@/game/data/world';
import { activeSwarm, swarmUnlocked } from '@/game/systems/meta';
import { BALANCE, RARITIES } from '@/game/data/balance';
import { statDisplay, percent } from '@/game/data/progression';
import { SKILLS } from '@/game/data/skills';
import { apCapacity, apUsed, effectiveSkill, skillMastery } from '@/game/systems/progression';
import { hitChance, normalizeStats } from '@/game/systems/stats';
import { profile } from '@/game/data/encounters';
import { stats } from '@/game/systems/stats';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import { BattleLogLine } from './combat-log';
import type { State, Action } from '@/game/types';
import { TideSelector } from './tide-selector';
import { SettingsDialog } from './settings-dialog';
import { Player } from './player-column';
import { BattleRail } from './battle-rail';
export function BattleView({ s, busy, send, setView, saved, settings, setSettings, name, setName, onLogout }: {
    onLogout: () => void;
    s: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
    saved: boolean;
    settings: boolean;
    setSettings: (open: boolean) => void;
    name: string;
    setName: (value: string) => void;
}) {
    const [filter, setFilter] = useState('all');
    const st = STAGES.find(x => x.id === s.stage)!, d = DUNGEONS.find(x => x.id === s.dungeon?.id);
    const enemy = s.enemy;
    const swarmNow = activeSwarm(s);
    const playerStats = stats(s);
    const enemyStats = enemy ? normalizeStats(enemy.combatStats || { hp: enemy.maxHp, attack: enemy.attack, defense: enemy.defense, crit: 0 }) : null;
    const activeIds = s.skills.filter(id => SKILLS.find(sk => sk.id === id)?.type === 'active');
    const quickItems = s.inventory.slice(-6).reverse();
    const { effects: combatFx, skipped: fxSkipped } = useCombatFx(s.logs, s.name);
    // 회복 대기(필드 패배 후)·출정 준비(던전 입장 후) 남은 시간. 던전 화면의 준비 카운트다운과 같은 방식입니다.
    const recoverySeconds = Math.ceil(s.recovery * BALANCE.turnMs / 1000);
    const recoveryText = s.recovery > 0 ? d ? `출정 준비 · ${recoverySeconds}초 남음` : `회복 대기 · ${recoverySeconds}초 남음` : null;
    const noticeText = s.lastOffline ? `부재중 항해 정산 · ${Math.floor(s.lastOffline.seconds / 60)}분 동안 ${s.lastOffline.kills}마리 포획 · +${format(s.lastOffline.gold)} G` : d ? `${d.name} ${s.dungeon!.wave + 1}번째 전투 · 보스 전까지 항로를 유지합니다.` : `${st.name}에서 다음 입질을 기다립니다. 목표 어종을 고르면 원하는 기록을 더 빠르게 채울 수 있습니다.`;
    return <>
    <Heading eyebrow="THE ENDLESS VOYAGE" title="오늘도, 더 깊은 곳으로."><div className="battle-heading-tools"><span className={`status-pill ${s.running ? 'active' : ''}`}>{s.running ? '자동 낚시 진행 중' : '항해 준비 완료'}</span><span className="save-status battle-save-status">{saved ? <Check size={13}/> : <RefreshCw size={13}/>}<span>{saved ? '저장됨' : '연결 중'}</span></span><SidebarTrigger className="mobile-menu battle-mobile-menu"/><SettingsDialog open={settings} onOpenChange={open => { setSettings(open); setName(s.name); }} s={s} busy={busy} send={send} name={name} setName={setName} onLogout={onLogout}/></div></Heading>
    <div className={`voyage-brief ${s.lastOffline ? 'has-offline' : ''}`}><Waves size={16}/><span>{noticeText}</span>{s.lastOffline && <button aria-label="부재중 정산 알림 닫기" className="voyage-brief-dismiss" onClick={() => send({ type: 'offlineDismiss' })}><Check size={14}/></button>}</div>
    <VoyageNotice s={s} setView={setView}/>
    <div className="battle-hud" style={{ '--stage-tone': st.tone } as React.CSSProperties}>
    <div className="battle-character-column"><Player s={s} busy={busy} send={send} setView={setView}/></div>
    <div className="battle-console">
    <div className="session-metrics"><div><Fish/><span>누적 포획<strong><Num n={s.kills}/> <small>마리</small></strong></span></div><div><BookOpen/><span>발견한 물고기<strong>{Object.keys(s.book).length} <small>/ {FISH.length}종</small></strong></span></div><div><Compass/><span>탐험 중인 지역<strong>{d ? '던전' : `0${STAGES.indexOf(st) + 1}`} <small>{d ? `${s.dungeon!.wave + 1} / ${d.fish.length}` : '낚시터'}</small></strong></span></div><div className="session-currency gold"><Coins/><span>보유 골드<strong><Num n={s.gold}/> <small>G</small></strong></span></div><div className="session-currency pearl"><Sparkles/><span>보유 진주<strong><Num n={s.pearls}/> <small>개</small></strong></span></div></div>
    <TideSelector s={s} send={send} busy={busy}/>
    <div className="battle-target-strip"><span><Target size={15}/> 집중 사냥</span><Tabs value={s.target || 'all'} onValueChange={id => send({ type: 'target', id })}><TabsList><TabsTrigger value="all" disabled={busy || !!s.dungeon}>무작위</TabsTrigger>{st.fish.map(id => <TabsTrigger value={id} key={id} disabled={busy || !!s.dungeon}>{FISH.find(f => f.id === id)?.name}</TabsTrigger>)}</TabsList></Tabs>{s.target && !s.dungeon && <div className="swarm-picker" title="도감을 완성한 어종은 무리 전체를 체력 ×N(×100은 98배, ×500은 490배)인 한 개체로 상대할 수 있습니다. 적 공격은 ×500에서만 490배이고 그 아래는 한 마리와 같으며, 처치하면 마리 수만큼 보상을 받습니다."><span>무리</span>{SWARM_SIZES.map(n => { const open = swarmUnlocked(s, s.target!, n); return <button key={n} className={swarmNow === n ? 'primary' : 'secondary'} disabled={busy || !open} title={open ? `×${n}` : `${FISH.find(f => f.id === s.target)?.name} ${SWARM_UNLOCK[n].toLocaleString()}마리 포획 시 해금`} onClick={() => send({ type: 'swarm', id: String(n) })}>×{n}</button>; })}</div>}</div>
    <div className="battle-opponent-strip"><div className="opponent-card player-opponent"><span className="eyebrow">MY FISHER</span><div className="combatant-name"><strong>{s.name}</strong><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label={`HP ${Math.ceil(s.hp)} / ${playerStats.hp}`}/><PlayerHitEffect effect={combatFx}/></div><small>속도 {playerStats.speed} · 명중 수치 {statDisplay('accuracy', playerStats.accuracy || 0)} · 회피 수치 {statDisplay('evasion', playerStats.evasion || 0)}</small></div><div className="opponent-vs"><Swords size={17}/><strong>VS</strong><small>{s.running ? 'AUTO' : 'READY'}</small></div><div className="opponent-card enemy-opponent"><span className="eyebrow">{enemy?.boss ? 'BOSS ENCOUNTER' : 'CURRENT CATCH'}{enemy?.swarm ? ` · 무리 ×${enemy.swarm}` : ''}</span><div className="combatant-name">{enemy ? <strong>{enemy.name}</strong> : recoveryText ? <strong className="recovery-countdown" aria-live="polite">{recoveryText}</strong> : <strong>다음 입질을 기다리는 중</strong>}{enemy && <StatusBadges effects={enemy.effects} stun={enemy.stun} recent={combatFx} target="enemy"/>}</div><div className="player-hp-anchor"><Meter value={enemy?.hp || 0} max={enemy?.maxHp || 1} label={enemy ? `HP ${Math.ceil(enemy.hp)} / ${enemy.maxHp}` : 'READY'} color="enemy"/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemy ? `${profile(enemy.id).name} · 속도 ${enemyStats?.speed || 0}${!s.dungeon && s.tide ? ` · 해역 난이도 ${s.tide} 적용` : ''}${s.dungeon?.depth ? ` · 심연 ${s.dungeon.depth}층` : ''}${enemy.swarm ? ` · 무리 체력 ×${swarmHpMultiplier(enemy.swarm)}${swarmAttackMultiplier(enemy.swarm) > 1 ? ` · 공격 ×${swarmAttackMultiplier(enemy.swarm)}` : ''}` : ''}` : st.description}</small></div></div>
    {enemy && <div className="matchup-strip">내 명중률 {percent(hitChance(playerStats, enemyStats!))} · 적 명중률 {percent(hitChance(enemyStats!, playerStats))} <span>명중−상대 회피·속도 보정 · 1~99.5% 범위</span></div>}
    <section className={`battle-scene ${s.running ? 'running' : ''}`}><Image className="ocean-art" src="/ocean.webp" alt="청록빛 파도 사이로 솟아오르는 은빛 심해 물고기" width={1536} height={1024} priority/><div className="scene-shade"/><CombatFxOverlay effect={combatFx} skipped={fxSkipped}/><div className="scene-top"><span className="scene-label"><Compass size={14}/>{d ? 'DUNGEON EXPEDITION' : st.subtitle}</span><div className="scene-actions"><button className={`scene-control ${s.running ? 'pause-button' : 'primary'}`} disabled={busy} onClick={() => send({ type: s.running ? 'pause' : 'start' })}>{s.running ? <Pause size={17}/> : <Play size={17}/>} {s.running ? '낚시 일시정지' : '자동 낚시 시작'}</button><button className="scene-link" onClick={() => setView(d ? 'dungeons' : 'stages')}>{d ? '던전 변경' : '낚시터 변경'} <ChevronRight size={15}/></button></div></div><div className="scene-copy"><span className="eyebrow">{d ? `${s.dungeon!.wave + 1} / ${d.fish.length} 전투` : `STAGE 0${STAGES.indexOf(st) + 1} · Lv. ${st.level}+`}</span><h2>{d?.name || st.name}</h2><p>{s.recovery ? `낚시꾼이 체력을 회복하고 있습니다 · ${recoverySeconds}초 남음` : enemy ? `${enemy.boss ? 'BOSS · ' : ''}${enemy.name}에게 입질이 왔습니다.` : s.running ? '물결 속에서 다음 입질을 기다립니다.' : st.description}</p></div><div className="enemy-status"><div className="enemy-title"><span>{enemy ? <><Fish size={17}/>{enemy.name}</> : <><Waves size={17}/>입질을 기다리는 중</>}</span><small>{enemy ? `${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP` : 'READY TO CAST'}</small></div><small className="enemy-trait">{enemy ? profile(enemy.id).name + ' · ' + profile(enemy.id).hint : ''}</small><Meter value={enemy?.hp || 0} max={enemy?.maxHp || 1} color="enemy"/></div></section>
    <section className="panel battle-skills"><div className="section-title"><h2>전투 스킬 <span className="micro">AP {apUsed(s)} / {apCapacity(s)} · 액티브 {activeIds.length}개</span></h2><button className="text-button" onClick={() => setView('skills')}>스킬 편성 <ChevronRight size={14}/></button></div><div className="battle-skill-row">{(activeIds.length ? activeIds : ['']).map(id => { const sk = SKILLS.find(x => x.id === id), effective = sk ? effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id), s.skillSpecializations?.[id], s.skillPractice[id] || 0) : null; return <button key={id || 'empty'} className={`battle-skill ${sk ? '' : 'vacant'}`} onClick={() => setView('skills')}><div className="skill-symbol">{sk ? <SkillIcon id={sk.id}/> : <span>+</span>}</div><div><strong>{sk?.name || '빈 스킬 슬롯'}</strong><small>{sk ? `${Math.round(effective!.chance * 100)}% 발동 · ${(s.cooldowns[id] || 0) > 0 ? `대기 ${s.cooldowns[id]}턴` : '사용 준비'}` : '스킬을 장착하세요'}</small></div></button>; })}</div></section>
    <section className="panel log-panel"><div className="section-title"><h2>항해 일지 <span className="micro">BATTLE LOG</span></h2><Tabs value={filter} onValueChange={setFilter}><TabsList className="log-tabs"><TabsTrigger value="all">전체</TabsTrigger><TabsTrigger value="battle">전투</TabsTrigger><TabsTrigger value="reward">획득</TabsTrigger><TabsTrigger value="equipment">장비</TabsTrigger></TabsList></Tabs></div><div className="log-list" role="log" aria-label="최근 전투와 획득 기록">{filter === 'equipment' ? <div className="battle-item-row log-equipment-list">{quickItems.length ? quickItems.map(item => <button type="button" key={item.id} onClick={() => setView('inventory')}><span className="battle-item-icon" style={{ color: RARITIES[item.rarity].color }}><SlotIcon slot={item.slot} size={18}/></span><span><strong>{item.name}</strong><small>{RARITIES[item.rarity].name} · 위력 {item.power}</small></span></button>) : <p className="battle-item-empty">포획 보상으로 장비를 획득하면 여기에 표시됩니다.</p>}</div> : s.logs.filter(l => filter === 'all' || l.type === filter).slice(-18).reverse().map(log => <div key={log.id} className={`log-line ${log.type}`}><span className="log-number">{String(log.id).padStart(3, '0')}</span>{log.event ? <BattleLogLine log={log}/> : <><span>{log.type === 'reward' ? <Sparkles size={13}/> : log.type === 'system' ? <Compass size={13}/> : <Swords size={13}/>}</span><p>{log.text}</p></>}</div>)}</div></section>
    </div>
    <BattleRail s={s} busy={busy} send={send} setView={setView}/>
    </div>
    </>;
}
