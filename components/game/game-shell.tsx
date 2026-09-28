'use client';
import { GrowthGoals } from './growth-goals';
import { useEffect, useState } from 'react';
import { Anchor, ArrowRight, BookOpen, Check, ChevronRight, ClipboardList, Coins, Compass, Fish, Heart, HelpCircle, Lock, Map, Pause, Play, RefreshCw, Settings2, Shield, ShoppingBag, Sparkles, Swords, Target, Trophy, Users, Waves, Zap } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { useGame } from './use-game';
import { Heading, Meter, SkillIcon, SlotIcon, format } from './shared';
import { Stages, Dungeons, Inventory, Skills, Classes, Rebirth, Collection, Rankings } from './panels';
import { STAGES, DUNGEONS, FISH, SWARM_SIZES, SWARM_UNLOCK, swarmAttackMultiplier } from '@/game/data/world';
import { activeSwarm, swarmUnlocked } from '@/game/systems/meta';
import { xpNeeded, SLOTS, RARITIES } from '@/game/data/balance';
import { JOBS } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { Character } from './progression-panels';
import { Guild } from './guild-panel';
import { Guide } from './guide-panel';
import { UpdateLog } from './update-log-panel';
import { apCapacity, apUsed, effectiveSkill, skillMastery } from '@/game/systems/progression';
import { Shop, TideSelector } from './economy-panels';
import { hitChance, normalizeStats } from '@/game/systems/stats';
import { profile } from '@/game/data/encounters';
import { stats, power } from '@/game/systems/stats';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import type { State, Action } from '@/game/types';
const NAV = [{ label: '항해', items: [{ id: 'battle', name: '자동 낚시', Icon: Anchor }, { id: 'stages', name: '낚시터', Icon: Map }, { id: 'dungeons', name: '던전 탐험', Icon: Compass }] }, { label: '낚시꾼', items: [{ id: 'character', name: '능력치 · 빌드', Icon: Target }, { id: 'shop', name: '항구 상점', Icon: ShoppingBag }, { id: 'inventory', name: '장비 보관함', Icon: ShoppingBag }, { id: 'skills', name: '스킬', Icon: Zap }, { id: 'classes', name: '전직', Icon: Swords }, { id: 'rebirth', name: '환생', Icon: RefreshCw }] }, { label: '기록과 명예', items: [{ id: 'book', name: '물고기 도감', Icon: BookOpen }, { id: 'guild', name: '길드', Icon: Users }, { id: 'ranking', name: '랭킹 · 결투', Icon: Trophy }, { id: 'updates', name: '업데이트 내역', Icon: ClipboardList }, { id: 'help', name: '도움말', Icon: HelpCircle }] }];
function SettingsDialog({ open, onOpenChange, s, busy, send, name, setName }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    s: State | null;
    busy: boolean;
    send: (a: Action) => void;
    name: string;
    setName: (value: string) => void;
}) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
            <button className="icon-button" aria-label="설정과 도움말"><Settings2 size={19}/></button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>낚시꾼 설정</DialogTitle>
                <DialogDescription>이름을 바꾸고 항해 규칙을 확인하세요.</DialogDescription>
            </DialogHeader>
            <label className="field-label" htmlFor="player-name">낚시꾼 이름</label>
            <div className="button-row">
                <input id="player-name" className="name-input" value={name} maxLength={16} onChange={e => setName(e.target.value)}/>
                <button className="primary" disabled={busy || !s || name.trim().length < 2} onClick={() => { send({ type: 'rename', value: name }); onOpenChange(false); }}>변경</button>
            </div>
            <div className="help-copy">
                <h3>항해 안내</h3>
                <p>자동 낚시를 시작하면 턴제 전투가 반복됩니다. 패배해도 장비와 골드는 잃지 않고 잠시 회복한 뒤 다시 출항합니다.</p>
                <p>전직으로 기술을 얻고 AP 한도 안에서 장착합니다. 액티브는 편성 순서대로 조건·마나·쿨다운·확률을 판정하며, 모두 실패하면 기본 공격을 사용합니다.</p>
                <p>전직하면 전용 기술이 무료로 열립니다. 장착 승리로 계승·강화하거나, 해금한 스킬에 1 SP를 사용할 수 있습니다. 숙련과 SP는 같은 성장 단계를 엽니다.</p>
                <p>진행은 서버에 자동 저장됩니다. 자동 낚시를 켜 둔 채 나가면 최대 24시간의 부재중 전투를 다음 접속 때 정산합니다. 전직은 전투 중에도 현재 전투를 정리한 뒤 바로 적용됩니다.</p>
            </div>
        </DialogContent>
    </Dialog>;
}
function Navigation({ view, setView }: {
    view: string;
    setView: (s: string) => void;
}) {
    const { setOpenMobile } = useSidebar();
    return <Sidebar className="game-sidebar">
    <SidebarHeader>
    <div className="brand">
    <Anchor size={30}/>
    <div>
    <strong>TIDEBOUND</strong>
    <small>심연의 낚시꾼</small>
    </div>
    </div>
    </SidebarHeader>
    <SidebarContent>{NAV.map(group => <SidebarGroup key={group.label}>
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
        <SidebarMenu>{group.items.map(({ id, name, Icon }) => <SidebarMenuItem key={id}>
            <SidebarMenuButton isActive={view === id} onClick={() => { setView(id); setOpenMobile(false); }}>
            <Icon />
            <span>{name}</span>{view === id && <ChevronRight className="nav-arrow"/>}</SidebarMenuButton>
            </SidebarMenuItem>)}</SidebarMenu>
        </SidebarGroup>)}</SidebarContent>
    <SidebarFooter>
    <div className="sidebar-quote">
    <Waves size={22}/>
    <p>수면 아래,<br />다음 이야기가 기다립니다.</p>
    <small>THE ENDLESS VOYAGE · v20.4</small>
    </div>
    </SidebarFooter>
    </Sidebar>;
}
function Player({ s, setView }: {
    s: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    const a = stats(s);
    return <aside className="player-column">
    <div className="panel player-panel">
    <div className="section-title">
    <h2>나의 낚시꾼</h2>
    <span className="micro">CHARACTER</span>
    </div>
    <div className="player-avatar">
    <Anchor size={36}/>
    <span>{s.level}</span>
    </div>
    <div className="combatant-name character-name"><h3>{s.name}</h3><StatusBadges effects={s.effects} stun={s.playerStun}/></div>
    <p className="job-label">{JOBS.find(j => j.id === s.job)?.name} · 환생 {s.rebirths}회</p>
    <p className="guild-label"><Users size={14}/>{s.guild?.name ? `길드 · ${s.guild.name}` : '무소속'}</p>
    <div className="combat-power">
    <span>전투력</span>
    <strong>{format(power(a))}</strong>
    </div>
    <Meter value={s.hp} max={a.hp} label="체력"/>
    <Meter value={s.mana} max={a.mana} label="마나" color="mana"/>
    <Meter value={s.exp} max={xpNeeded(s.level)} label="경험치" color="gold"/>
    <div className="stat-grid">
    <div>
    <Swords />
    <span>물리 공격</span>
    <b>{a.attack}</b>
    </div>
    <div>
    <Shield />
    <span>물리 방어</span>
    <b>{a.defense}</b>
    </div>
    <div>
    <Heart />
    <span>최대 체력</span>
    <b>{a.hp}</b>
    </div>
    <div>
    <Target />
    <span>치명타</span>
    <b>{Math.round(a.crit * 100)}%</b>
    </div>
    <div>
    <Zap />
    <span>마법 공격</span>
    <b>{a.magic}</b>
    </div>
    <div>
    <Shield />
    <span>마법 방어</span>
    <b>{a.resist}</b>
    </div>
    </div>
    <button className="text-button build-link" onClick={() => setView('character')}>능력치 배분 · 남은 {s.statPoints}P <ChevronRight size={14}/>
    </button>
    <div className="section-title equipment-title">
    <h2>착용 장비</h2>
    <button aria-label="장비 보관함 열기" className="icon-button" onClick={() => setView('inventory')}>
    <ChevronRight size={17}/>
    </button>
    </div>
    <div className="mini-equipment">{Object.entries(SLOTS).map(([id, label]) => {
            const item = s.equipment[id];
            return <button key={id} onClick={() => setView('inventory')}>
            <div className="mini-slot" style={{ color: item ? RARITIES[item.rarity].color : undefined }}>
            <SlotIcon slot={id} size={19}/>
            </div>
            <span>
            <small>{label}</small>
            <strong style={{ color: item ? RARITIES[item.rarity].color : undefined }}>{item?.name || '빈 슬롯'}</strong>
            </span>
            </button>;
        })}</div>
    </div>
    <div className="panel next-goal">
    <div className="eyebrow">NEXT MILESTONE</div>
    <h3>{s.level < 10 ? '새로운 길을 찾아서' : s.job === 'fisher' ? '전직할 준비가 됐습니다' : s.level < 30 ? '한계를 넘어서는 항해' : '새로운 생을 향하여'}</h3>
    <p>{s.level < 10 ? '레벨 10과 기본 능력치 조건을 준비하세요.' : s.job === 'fisher' ? '첫 전직 후보의 조건을 비교해 보세요.' : s.level < 30 ? '레벨·능력치·선행 숙련을 채워 다음 전직을 준비하세요.' : '진주를 얻고 영구 능력을 강화하세요.'}</p>
    <button className="text-button" onClick={() => setView(s.job === 'fisher' ? 'classes' : 'rebirth')}>자세히 보기 <ArrowRight size={14}/>
    </button>
    </div>
    </aside>;
}
function BattleRail({ s, busy, send, setView }: {
    s: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    const battleLogs = s.logs.filter(log => log.type === 'battle').slice(-9).reverse();
    const dungeons = [...DUNGEONS].sort((a, b) => a.level - b.level);
    return <aside className="battle-utility-rail" aria-label="전투 보조 패널">
    <section className="panel battle-rail-panel battle-feed">
    <div className="section-title"><h2><Swords size={15}/> 전투 기록</h2><span className="micro">LIVE</span></div>
    <div className="battle-feed-list" role="log" aria-label="최근 전투 메시지">
    {battleLogs.length ? battleLogs.map(log => <p key={log.id}><span>{String(log.id).padStart(3, '0')}</span>{log.text}</p>) : <p className="battle-feed-empty">자동 낚시를 시작하면 전투 기록이 표시됩니다.</p>}
    </div>
    </section>
    <section className="panel battle-rail-panel battle-selector-panel">
    <div className="section-title"><h2><Map size={15}/> 낚시터</h2><button className="text-button" onClick={() => setView('stages')}>전체 지도 <ChevronRight size={13}/></button></div>
    <div className="battle-stage-list">{STAGES.map((stage, index) => {
        const locked = s.level < stage.level || s.rebirths < stage.rebirth;
        return <button type="button" key={stage.id} className={`battle-stage-button ${s.stage === stage.id && !s.dungeon ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'stage', id: stage.id })}>
        <span className="battle-stage-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{stage.name}</strong><small>Lv. {stage.level}{stage.rebirth ? ` · 환생 ${stage.rebirth}` : ''}</small></span>{locked ? <Lock size={13}/> : s.stage === stage.id && !s.dungeon ? <span className="battle-selected-dot"/> : null}
        </button>;
    })}</div>
    </section>
    <section className="panel battle-rail-panel battle-selector-panel">
    <div className="section-title"><h2><Compass size={15}/> 던전</h2><button className="text-button" onClick={() => setView('dungeons')}>탐험실 <ChevronRight size={13}/></button></div>
    <div className="battle-dungeon-list">{dungeons.map(dungeon => {
        const locked = s.level < dungeon.level || s.rebirths < dungeon.rebirth;
        const active = s.dungeon?.id === dungeon.id;
        return <button type="button" key={dungeon.id} className={`battle-dungeon-button ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || (!!s.dungeon && !active)} onClick={() => send({ type: 'dungeon', id: dungeon.id })}>
        <span><strong>{dungeon.name}</strong><small>Lv. {dungeon.level}{dungeon.rebirth ? ` · 환생 ${dungeon.rebirth}` : ''}</small></span>{locked ? <Lock size={13}/> : active ? <span className="battle-dungeon-wave">W{(s.dungeon?.wave || 0) + 1}</span> : <Swords size={13}/>} 
        </button>;
    })}</div>
    </section>
    <section className="panel battle-rail-panel battle-shortcuts">
    <div className="section-title"><h2><Zap size={15}/> 빠른 이동</h2></div>
    <div className="battle-shortcut-grid"><button type="button" onClick={() => setView('skills')}><Zap size={14}/>스킬 편성</button><button type="button" onClick={() => setView('inventory')}><ShoppingBag size={14}/>장비 보관함</button><button type="button" onClick={() => setView('book')}><BookOpen size={14}/>도감 연구</button><button type="button" onClick={() => setView('ranking')}><Trophy size={14}/>비동기 결투</button></div>
    </section>
    </aside>;
}
function BattleV2({ s, busy, send, setView, saved, settings, setSettings, name, setName }: {
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
    const combatFx = useCombatFx(s.logs, s.name);
    const noticeText = s.lastOffline ? `부재중 항해 정산 · ${Math.floor(s.lastOffline.seconds / 60)}분 동안 ${s.lastOffline.kills}마리 포획 · +${format(s.lastOffline.gold)} G` : d ? `${d.name} ${s.dungeon!.wave + 1}번째 전투 · 보스 전까지 항로를 유지합니다.` : `${st.name}에서 다음 입질을 기다립니다. 목표 어종을 고르면 원하는 기록을 더 빠르게 채울 수 있습니다.`;
    return <>
    <Heading eyebrow="THE ENDLESS VOYAGE" title="오늘도, 더 깊은 곳으로."><div className="battle-heading-tools"><span className={`status-pill ${s.running ? 'active' : ''}`}>{s.running ? '자동 낚시 진행 중' : '항해 준비 완료'}</span><span className="save-status battle-save-status">{saved ? <Check size={13}/> : <RefreshCw size={13}/>}<span>{saved ? '저장됨' : '연결 중'}</span></span><SidebarTrigger className="mobile-menu battle-mobile-menu"/><SettingsDialog open={settings} onOpenChange={open => { setSettings(open); setName(s.name); }} s={s} busy={busy} send={send} name={name} setName={setName}/></div></Heading>
    <div className={`voyage-brief ${s.lastOffline ? 'has-offline' : ''}`}><Waves size={16}/><span>{noticeText}</span>{s.lastOffline && <button aria-label="부재중 정산 알림 닫기" className="voyage-brief-dismiss" onClick={() => send({ type: 'offlineDismiss' })}><Check size={14}/></button>}</div>
    <div className="battle-hud" style={{ '--stage-tone': st.tone } as React.CSSProperties}>
    <div className="battle-character-column"><Player s={s} busy={busy} send={send} setView={setView}/></div>
    <div className="battle-console">
    <div className="session-metrics"><div><Fish/><span>누적 포획<strong>{format(s.kills)} <small>마리</small></strong></span></div><div><BookOpen/><span>발견한 물고기<strong>{Object.keys(s.book).length} <small>/ {FISH.length}종</small></strong></span></div><div><Compass/><span>탐험 중인 지역<strong>{d ? '던전' : `0${STAGES.indexOf(st) + 1}`} <small>{d ? `${s.dungeon!.wave + 1} / ${d.fish.length}` : '낚시터'}</small></strong></span></div><div className="session-currency gold"><Coins/><span>보유 골드<strong>{format(s.gold)} <small>G</small></strong></span></div><div className="session-currency pearl"><Sparkles/><span>보유 진주<strong>{format(s.pearls)} <small>개</small></strong></span></div></div>
    <TideSelector s={s} send={send} busy={busy}/>
    <div className="battle-target-strip"><span><Target size={15}/> 집중 사냥</span><Tabs value={s.target || 'all'} onValueChange={id => send({ type: 'target', id })}><TabsList><TabsTrigger value="all" disabled={busy || !!s.dungeon}>무작위</TabsTrigger>{st.fish.map(id => <TabsTrigger value={id} key={id} disabled={busy || !!s.dungeon}>{FISH.find(f => f.id === id)?.name}</TabsTrigger>)}</TabsList></Tabs>{s.target && !s.dungeon && <div className="swarm-picker" title="도감을 완성한 어종은 한 전투에서 여러 마리를 연달아 상대할 수 있습니다. 사이에 회복이 없고 규모에 따라 적 공격이 강해지며, 전멸해야 보상을 받습니다."><span>무리</span>{SWARM_SIZES.map(n => { const open = swarmUnlocked(s, s.target!, n); return <button key={n} className={swarmNow === n ? 'primary' : 'secondary'} disabled={busy || !open} title={open ? `×${n}` : `${FISH.find(f => f.id === s.target)?.name} ${SWARM_UNLOCK[n].toLocaleString()}마리 포획 시 해금`} onClick={() => send({ type: 'swarm', id: String(n) })}>×{n}</button>; })}</div>}</div>
    <div className="battle-opponent-strip"><div className="opponent-card player-opponent"><span className="eyebrow">MY FISHER</span><div className="combatant-name"><strong>{s.name}</strong><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label={`HP ${Math.ceil(s.hp)} / ${playerStats.hp}`}/><PlayerHitEffect effect={combatFx}/></div><small>속도 {playerStats.speed} · 명중 {Math.round((playerStats.accuracy || 0) * 100)}% · 회피 {Math.round((playerStats.evasion || 0) * 100)}%</small></div><div className="opponent-vs"><Swords size={17}/><strong>VS</strong><small>{s.running ? 'AUTO' : 'READY'}</small></div><div className="opponent-card enemy-opponent"><span className="eyebrow">{enemy?.boss ? 'BOSS ENCOUNTER' : 'CURRENT CATCH'}{enemy?.swarm ? ` · 무리 ×${enemy.swarm} · 남은 ${enemy.remaining}마리` : ''}</span><div className="combatant-name"><strong>{enemy?.name || '다음 입질을 기다리는 중'}</strong>{enemy && <StatusBadges effects={enemy.effects} stun={enemy.stun} recent={combatFx} target="enemy"/>}</div><div className="player-hp-anchor"><Meter value={enemy?.hp || 0} max={enemy?.maxHp || 1} label={enemy ? `HP ${Math.ceil(enemy.hp)} / ${enemy.maxHp}` : 'READY'} color="enemy"/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemy ? `${profile(enemy.id).name} · 속도 ${enemyStats?.speed || 0}${enemy.swarm ? ` · 무리 공격 ×${swarmAttackMultiplier(enemy.swarm).toFixed(2)}` : ''}` : st.description}</small></div></div>
    {enemy && <div className="matchup-strip">내 명중률 {Number((hitChance(playerStats, enemyStats!) * 100).toFixed(1))}% · 적 명중률 {Number((hitChance(enemyStats!, playerStats) * 100).toFixed(1))}% <span>명중−상대 회피·속도 보정 · 1~99.5% 범위</span></div>}
    <section className={`battle-scene ${s.running ? 'running' : ''}`}><img className="ocean-art" src="/ocean.webp" alt="청록빛 파도 사이로 솟아오르는 은빛 심해 물고기"/><div className="scene-shade"/><CombatFxOverlay effect={combatFx}/><div className="scene-top"><span className="scene-label"><Compass size={14}/>{d ? 'DUNGEON EXPEDITION' : st.subtitle}</span><div className="scene-actions"><button className={`scene-control ${s.running ? 'pause-button' : 'primary'}`} disabled={busy} onClick={() => send({ type: s.running ? 'pause' : 'start' })}>{s.running ? <Pause size={17}/> : <Play size={17}/>} {s.running ? '낚시 일시정지' : '자동 낚시 시작'}</button><button className="scene-link" onClick={() => setView(d ? 'dungeons' : 'stages')}>{d ? '던전 변경' : '낚시터 변경'} <ChevronRight size={15}/></button></div></div><div className="scene-copy"><span className="eyebrow">{d ? `${s.dungeon!.wave + 1} / ${d.fish.length} 전투` : `STAGE 0${STAGES.indexOf(st) + 1} · Lv. ${st.level}+`}</span><h2>{d?.name || st.name}</h2><p>{s.recovery ? '낚시꾼이 체력을 회복하고 있습니다.' : enemy ? `${enemy.boss ? 'BOSS · ' : ''}${enemy.name}에게 입질이 왔습니다.` : s.running ? '물결 속에서 다음 입질을 기다립니다.' : st.description}</p></div><div className="enemy-status"><div className="enemy-title"><span>{enemy ? <><Fish size={17}/>{enemy.name}</> : <><Waves size={17}/>입질을 기다리는 중</>}</span><small>{enemy ? `${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP` : 'READY TO CAST'}</small></div><small className="enemy-trait">{enemy ? profile(enemy.id).name + ' · ' + profile(enemy.id).hint : ''}</small><Meter value={enemy?.hp || 0} max={enemy?.maxHp || 1} color="enemy"/></div></section>
    <section className="panel battle-skills"><div className="section-title"><h2>전투 스킬 <span className="micro">AP {apUsed(s)} / {apCapacity(s)} · 액티브 {activeIds.length}개</span></h2><button className="text-button" onClick={() => setView('skills')}>스킬 편성 <ChevronRight size={14}/></button></div><div className="battle-skill-row">{(activeIds.length ? activeIds : ['']).map(id => { const sk = SKILLS.find(x => x.id === id), effective = sk ? effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id), s.skillSpecializations?.[id], s.skillPractice[id] || 0) : null; return <button key={id || 'empty'} className={`battle-skill ${sk ? '' : 'vacant'}`} onClick={() => setView('skills')}><div className="skill-symbol">{sk ? <SkillIcon id={sk.id}/> : <span>+</span>}</div><div><strong>{sk?.name || '빈 스킬 슬롯'}</strong><small>{sk ? `${Math.round(effective!.chance * 100)}% 발동 · ${(s.cooldowns[id] || 0) > 0 ? `대기 ${s.cooldowns[id]}턴` : '사용 준비'}` : '스킬을 장착하세요'}</small></div></button>; })}</div></section>
    <section className="panel log-panel"><div className="section-title"><h2>항해 일지 <span className="micro">BATTLE LOG</span></h2><Tabs value={filter} onValueChange={setFilter}><TabsList className="log-tabs"><TabsTrigger value="all">전체</TabsTrigger><TabsTrigger value="battle">전투</TabsTrigger><TabsTrigger value="reward">획득</TabsTrigger><TabsTrigger value="equipment">장비</TabsTrigger></TabsList></Tabs></div><div className="log-list" role="log" aria-label="최근 전투와 획득 기록">{filter === 'equipment' ? <div className="battle-item-row log-equipment-list">{quickItems.length ? quickItems.map(item => <button type="button" key={item.id} onClick={() => setView('inventory')}><span className="battle-item-icon" style={{ color: RARITIES[item.rarity].color }}><SlotIcon slot={item.slot} size={18}/></span><span><strong>{item.name}</strong><small>{RARITIES[item.rarity].name} · 위력 {item.power}</small></span></button>) : <p className="battle-item-empty">포획 보상으로 장비를 획득하면 여기에 표시됩니다.</p>}</div> : s.logs.filter(l => filter === 'all' || l.type === filter).slice(-18).reverse().map(log => <div key={log.id} className={`log-line ${log.type}`}><span className="log-number">{String(log.id).padStart(3, '0')}</span><span>{log.type === 'reward' ? <Sparkles size={13}/> : log.type === 'system' ? <Compass size={13}/> : <Swords size={13}/>}</span><p>{log.text}</p></div>)}</div></section>
    </div>
    <BattleRail s={s} busy={busy} send={send} setView={setView}/>
    </div>
    </>;
}
export default function GameShell() {
    const game = useGame();
    const { state: s, error, busy, saved, send } = game;
    const [view, setView] = useState('battle'), [name, setName] = useState(''), [settings, setSettings] = useState(false);
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [view]);
    useEffect(() => {
        if (view === 'ranking')
            void game.loadRanking();
    }, [view, game.loadRanking]);
    useEffect(() => {
        if (error && s)
            toast.error(error);
    }, [error, s]);
    const props = s ? { s, send, busy } : null;
    return <SidebarProvider style={{ '--sidebar-width': '222px' } as React.CSSProperties}>
    <Toaster theme="dark" position="bottom-right"/>
    <Navigation view={view} setView={setView}/>
    <div className="app-body">
    {view !== 'battle' && <header className="topbar">
    <div className="breadcrumb"><SidebarTrigger className="mobile-menu"/><span>항해 기록</span><ChevronRight size={13}/><strong>{NAV.flatMap(g => g.items).find(i => i.id === view)?.name}</strong></div>
    <div className="topbar-right"><span className="save-status">{saved ? <Check size={13}/> : <RefreshCw size={13}/>}<span>{saved ? '저장됨' : '연결 중'}</span></span><SettingsDialog open={settings} onOpenChange={open => { setSettings(open); setName(s?.name || ''); }} s={s} busy={busy} send={send} name={name} setName={setName}/></div>
    </header>}{!s ? <div className="loading-screen">
        <Anchor size={48}/>
        <h1>{error ? '항해를 준비하지 못했습니다' : '바다와 연결하고 있습니다'}</h1>
        <p>{error || '낚시꾼의 기록을 불러오는 중입니다.'}</p>
        <button className="primary" onClick={() => send({ type: 'sync' })}>다시 연결</button>{error.includes('로그인') && <a className="text-button" href="/signin-with-chatgpt?return_to=%2F" target="_top">ChatGPT로 로그인</a>}</div> : <>
        <div className={`workspace ${view === 'battle' ? 'battle-workspace' : ''}`}>
        <main className="main-content">{error && <div className="error-box">{error}<button className="text-button" onClick={() => send({ type: 'sync' })}>다시 시도</button>
            </div>}{view === 'guild' && <Guild {...props!}/>}{view === 'updates' && <UpdateLog/>}{view === 'help' && <Guide/>}{view === 'battle' && <GrowthGoals {...props!} setView={setView}/>}{view === 'battle' && <BattleV2 {...props!} saved={saved} settings={settings} setSettings={setSettings} name={name} setName={setName} setView={setView}/>}{view === 'character' && <Character {...props!}/>}{view === 'stages' && <Stages {...props!}/>}{view === 'dungeons' && <Dungeons {...props!}/>}{view === 'shop' && <Shop {...props!}/>}{view === 'inventory' && <Inventory {...props!}/>}{view === 'skills' && <Skills {...props!}/>}{view === 'classes' && <Classes {...props!}/>}{view === 'rebirth' && <Rebirth {...props!}/>}{view === 'book' && <Collection {...props!}/>}{view === 'ranking' && <Rankings {...props!} rows={game.rows} rankError={game.rankError} loadRanking={game.loadRanking} register={game.register} result={game.duel} setResult={game.setDuel}/>}</main></div>
        <footer className="app-footer">
        <span>TIDEBOUND <span className="muted">/</span> 심연의 낚시꾼</span>
        <span>행동력 없는 끝없는 항해 <Waves size={14}/>
        </span>
        </footer>
        </>}</div>
    </SidebarProvider>;
}
