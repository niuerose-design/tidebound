'use client';
import { displayTitle } from '@/game/data/titles';
import Image from 'next/image';
import { TutorialCard } from './guidance-panels';
import { tutorialActive } from './growth-goals';
import { tutorialEarly } from '@/game/systems/guidance';
import { DoorNotice } from './jobs/mystery-doors';
import { useEffect, useRef, useState } from 'react';
import { tipAt } from '@/game/data/tips';
import { eventLabel } from '@/game/data/events';
import { UPDATE_LOG } from '@/game/data/update-log';
import { FishArt } from './art';
import { MIMIC } from '@/game/data/mimic';
import { rebirthLevel, encounterTier } from '@/game/systems/meta';
const LOG_FOLD_KEY = 'tidebound.logFold';
import { BookOpen, Check, ChevronRight, ScrollText, Coins, Compass, Fish, Pause, Play, RefreshCw, Sparkles, Swords, Target, Waves } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heading, Meter, SkillIcon, SlotIcon, format, Num } from './shared';
import { STAGES, DUNGEONS, FISH, swarmHpMultiplier, swarmAttackMultiplier } from '@/game/data/world';
import { variantById } from '@/game/data/variants';
import { BALANCE, RARITIES } from '@/game/data/balance';
import { statDisplay, percent } from '@/game/data/progression';
import { skillById } from '@/game/data/skills';
import { apCapacity, apUsed, effectiveSkill, skillMastery } from '@/game/systems/progression';
import { hitChance, normalizeStats } from '@/game/systems/stats';
import { profile } from '@/game/data/encounters';
import { bookRevealed } from '@/game/systems/book';
import { BOOK_REVEAL } from '@/game/data/book-traits';
import { stats } from '@/game/systems/stats';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, SceneFx, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import { BattleLogLine, withTurnDividers } from './combat-log';
import type { State, Action, Log } from '@/game/types';
import { TideSelector } from './tide-selector';
import { SettingsDialog } from './settings-dialog';
import { SlotChips } from './slot-chips';
import { Player } from './player-column';
import { BattleRail } from './battle-rail';
import { MobileFisherStrip } from './mobile-fisher-strip';
/** 로그 탭별 종류: 전투 탭은 전투·시스템(회복·이동), 획득 탭은 보상·스킬 해금. */
const LOG_TABS: Record<string, Log['type'][]> = { battle: ['battle', 'system'], reward: ['reward', 'skill'] };
export function BattleView({ s, busy, send, setView, saved, settings, setSettings, name, setName, onSwitchSlot }: {
    onSwitchSlot?: (slot: number) => Promise<void>;
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
    const [filter, setFilter] = useState('battle');
    // v25.13 모바일: 캐릭터 열(상세·착용 장비)은 접어 두고 버튼으로 펼칩니다. 데스크톱에서는 늘 보입니다.
    const [fisherOpen, setFisherOpen] = useState(false);
    // 항해 일지 접기(이 기기에 기억). 접힌 동안에도 오른쪽 전투 기록은 그대로 흐릅니다.
    // v25.17 맨 위 한 줄: 부재중 정산 → 던전 진행 → 번갈아 나오는 안내.
    const [tip, setTip] = useState(0);
    useEffect(() => { const timer = window.setInterval(() => setTip(v => v + 1), 14000); return () => window.clearInterval(timer); }, []);
    const [logOpen, setLogOpen] = useState(true);
    useEffect(() => { const t = setTimeout(() => { try { if (localStorage.getItem(LOG_FOLD_KEY) === 'folded') setLogOpen(false); } catch { /* 저장소 없음 */ } }, 0); return () => clearTimeout(t); }, []);
    const st = STAGES.find(x => x.id === s.stage)!, d = DUNGEONS.find(x => x.id === s.dungeon?.id);
    const enemy = s.enemy;
    const playerStats = stats(s);
    const enemyStats = enemy ? normalizeStats(enemy.combatStats || { hp: enemy.maxHp, attack: enemy.attack, defense: enemy.defense, crit: 0 }) : null;
    const activeIds = s.skills.filter(id => skillById(id)?.type === 'active');
    const quickItems = s.inventory.slice(-6).reverse();
    // 획득 로그는 전투 탭에서 빼고, 가장 최근 획득 한 줄만 전투 탭 위에 띄웁니다.
    const latestReward = s.logs.findLast(l => l.type === 'reward' || l.type === 'skill');
    const { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name);
    // 회복 대기(필드 패배 후)·출정 준비(던전 입장 후) 남은 시간. 던전 화면의 준비 카운트다운과 같은 방식입니다.
    const recoverySeconds = Math.ceil(s.recovery * BALANCE.turnMs / 1000);
    const recoveryText = s.recovery > 0 ? d ? `출정 준비 · ${recoverySeconds}초 남음` : `회복 대기 · ${recoverySeconds}초 남음` : null;
    const noticeText = s.lastOffline ? `부재중 항해 정산 · ${Math.floor(s.lastOffline.seconds / 60)}분 동안 ${s.lastOffline.kills}마리 처치 · +${format(s.lastOffline.gold)} G${s.lastOffline.bottles?.count ? ` · 병 속의 편지 ${s.lastOffline.bottles.count}개(${[s.lastOffline.bottles.gold ? `+${format(s.lastOffline.bottles.gold)} G` : '', s.lastOffline.bottles.items ? `장비 ${s.lastOffline.bottles.items}개` : '', s.lastOffline.bottles.pearls ? `진주 +${s.lastOffline.bottles.pearls}` : ''].filter(Boolean).join(' · ')})` : ''}` : d ? `${d.name} ${s.dungeon!.wave + 1}번째 전투 · 보스 전까지 항로를 유지합니다.` : tipAt(tip);
    return <>
    <Heading eyebrow="THE ENDLESS VOYAGE" title="오늘도, 더 깊은 곳으로."><div className="battle-heading-tools"><button type="button" className="secondary small battle-updates-link" title="업데이트 내역 바로 보기" onClick={() => setView('updates')}><ScrollText size={14}/><span>업데이트 내역</span><small>v{UPDATE_LOG[0].version}</small></button><span className={`status-pill ${s.running ? 'active' : ''}`}>{s.running ? '자동 사냥 진행 중' : '항해 준비 완료'}</span><span className="save-status battle-save-status">{saved ? <Check size={13}/> : <RefreshCw size={13}/>}<span>{saved ? '저장됨' : '연결 중'}</span></span><SidebarTrigger className="mobile-menu battle-mobile-menu"/><SettingsDialog open={settings} onOpenChange={open => { setSettings(open); setName(s.name); }} s={s} busy={busy} send={send} name={name} setName={setName} onSwitchSlot={onSwitchSlot}/></div></Heading>
    <div className={`voyage-brief ${s.lastOffline ? 'has-offline' : ''}`}><Waves size={16}/><span>{noticeText}</span>{s.lastOffline && <button aria-label="부재중 정산 알림 닫기" className="voyage-brief-dismiss" onClick={() => send({ type: 'offlineDismiss' })}><Check size={14}/></button>}</div>
    <SlotChips s={s} busy={busy} onSwitch={onSwitchSlot}/>
    {s.event && <div className="event-banner" role="status"><Sparkles size={15}/><b>이벤트</b><span>{eventLabel(s.event)}</span></div>}
    <DoorNotice s={s} setView={setView}/>
    <div className="battle-hud" style={{ '--stage-tone': st.tone } as React.CSSProperties}>
    <button type="button" className="mobile-fisher-toggle" aria-expanded={fisherOpen} onClick={() => setFisherOpen(v => !v)}>{fisherOpen ? '나의 모험가 상세 접기' : '나의 모험가 상세 · 착용 장비 · 능력치 배분'}<ChevronRight size={14} className={fisherOpen ? 'open' : ''}/></button>
    <div className={`battle-character-column ${fisherOpen ? 'mobile-open' : ''}`}><Player s={s} busy={busy} send={send} setView={setView}/></div>
    <div className="battle-console">
    <MobileFisherStrip s={s} setView={setView}/>
    {tutorialActive(s) && <div className={tutorialEarly(s) ? 'battle-top-tutorial' : 'battle-mobile-tutorial'}><TutorialCard s={s} send={send} busy={busy} setView={setView}/></div>}
    <div className="session-metrics"><div><Fish/><span>누적 처치<strong><Num n={s.kills}/> <small>마리</small></strong></span></div><div><BookOpen/><span>발견한 몬스터<strong>{Object.keys(s.book).length} <small>/ {FISH.length}종</small></strong></span></div><div><Compass/><span>탐험 중인 지역<strong>{d ? '던전' : String(STAGES.indexOf(st) + 1).padStart(2, '0')} <small>{d ? `${s.dungeon!.wave + 1} / ${d.fish.length}` : '사냥터'}</small></strong></span></div><div className="session-currency gold"><Coins/><span>보유 골드<strong><Num n={s.gold}/> <small>G</small></strong></span></div><div className="session-currency pearl" title={`진주는 환생(Lv.${rebirthLevel(s)}부터) 후 ‘환생 · 분신 → 진주 연구’에서 영구 능력치·편의 연구를 사는 데 씁니다. 환생할 때 레벨·환생 횟수·깊은 항해에 따라 받고, 별빛 변종·도감·업적 보상으로도 모입니다. 환생해도 사라지지 않습니다.`}><Sparkles/><span>보유 진주 <small className="metric-hint">?</small><strong><Num n={s.pearls}/> <small>개</small></strong></span></div></div>
    <TideSelector s={s} send={send} busy={busy}/>
    <div className="battle-target-strip"><span><Target size={15}/> 집중 사냥</span><Tabs value={s.target || 'all'} onValueChange={id => send({ type: 'target', id })}><TabsList><TabsTrigger value="all" disabled={busy || !!s.dungeon}>무작위</TabsTrigger>{st.fish.map(id => { const f = FISH.find(x => x.id === id), need = f?.minTier || 0, locked = need > encounterTier(s); return <TabsTrigger value={id} key={id} disabled={busy || !!s.dungeon || locked} title={locked ? `해역 난이도 ${need}부터 나타나는 몬스터입니다. 지금 난이도 ${encounterTier(s)}.` : undefined}>{f?.name}{locked ? ` · 난이도 ${need}+` : ''}</TabsTrigger>; })}</TabsList></Tabs></div>
    <div className="battle-opponent-strip battle-fx-host"><CombatFxOverlay effect={combatFx} combo={fxCombo}/><div className="opponent-card player-opponent"><span className="eyebrow">MY CHARACTER</span><div className="combatant-name"><strong>{displayTitle(s) ? <small className="rebirth-title">{displayTitle(s)}</small> : null}{s.name}</strong><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label={`HP ${Math.ceil(s.hp)} / ${playerStats.hp}`}/><PlayerHitEffect effect={combatFx}/></div><small title={`명중 수치 ${statDisplay('accuracy', playerStats.accuracy || 0)} · 회피 수치 ${statDisplay('evasion', playerStats.evasion || 0)} · 실제 확률은 상대의 회피·명중과 속도 차이로 1~99.5% 범위에서 정해집니다.`}>속도 {playerStats.speed}{enemyStats ? ` · 명중률 ${percent(hitChance(playerStats, enemyStats), 0)} · 회피율 ${percent(1 - hitChance(enemyStats, playerStats), 0)}` : ' · 상대를 만나면 명중률·회피율 표시'}</small></div><div className="opponent-vs"><Swords size={17}/><strong>VS</strong><small>{s.running ? 'AUTO' : 'READY'}</small></div><div className="opponent-card enemy-opponent"><span className="eyebrow">{d?.id === 'abyss' ? `무릉도장 ${s.dungeon!.depth || s.abyssBest + 1}층 · ` : ''}{enemy?.boss ? 'BOSS ENCOUNTER' : enemy?.variant ? 'RARE VARIANT' : 'CURRENT TARGET'}{enemy?.swarm ? ` · 무리 ×${enemy.swarm}` : ''}</span><div className="combatant-name">{enemy ? <strong>{enemy.variant && enemy.variant !== 'swarm' ? <small className={`variant-badge variant-${enemy.variant}`} title={variantById(enemy.variant)?.desc}>{variantById(enemy.variant)?.mark} {variantById(enemy.variant)?.name}</small> : enemy.swarm ? <small className="variant-badge variant-swarm" title={variantById('swarm')?.desc}>≋ 무리 ×{enemy.swarm}</small> : null}{enemy.name}</strong> : recoveryText ? <strong className="recovery-countdown" aria-live="polite">{recoveryText}</strong> : <strong>다음 몬스터를 기다리는 중</strong>}{enemy && <StatusBadges effects={enemy.effects} stun={enemy.stun} recent={combatFx} target="enemy"/>}</div><div className="player-hp-anchor"><Meter value={enemy?.hp || 0} max={enemy?.maxHp || 1} label={enemy ? `HP ${Math.ceil(enemy.hp)} / ${enemy.maxHp}` : 'READY'} color="enemy"/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemy ? `${bookRevealed(s, enemy.id) ? profile(enemy.id).name : '미확인 개체'} · 속도 ${enemyStats?.speed || 0} · 명중률 ${percent(hitChance(enemyStats!, playerStats), 0)} · 회피율 ${percent(1 - hitChance(playerStats, enemyStats!), 0)}${!s.dungeon && s.tide ? ` · 해역 난이도 ${s.tide} 적용` : ''}${s.dungeon?.depth ? ` · 무릉도장 ${s.dungeon.depth}층` : ''}${enemy.swarm ? ` · 무리 체력 ×${swarmHpMultiplier(enemy.swarm)}${swarmAttackMultiplier(enemy.swarm) > 1 ? ` · 공격 ×${swarmAttackMultiplier(enemy.swarm)}` : ''}` : ''}` : st.description}</small>{enemy && <small className="enemy-hint">{bookRevealed(s, enemy.id) ? profile(enemy.id).hint : `도감 ${BOOK_REVEAL}회 처치 시 성향·대응법 공개 (${Math.min(s.book[enemy.id] || 0, BOOK_REVEAL)} / ${BOOK_REVEAL})`}</small>}</div></div>
    <section className={`battle-scene ${s.running ? 'running' : ''}`}><Image className="ocean-art" src="/ocean.webp" alt="청록빛 파도 사이로 솟아오르는 은빛 심해 몬스터" width={1536} height={1024} priority/><div className="scene-shade"/>{enemy && !s.recovery && <FishArt id={enemy.id} boss={!!enemy.boss} size={112} className={`scene-foe ${enemy.id === MIMIC.id ? 'kkami' : ''}`}/>}<KkamiArrival s={s}/><SceneFx effect={combatFx}/><div className="scene-top"><span className="scene-label"><Compass size={14}/><span className="scene-label-text">{d ? 'DUNGEON EXPEDITION' : st.subtitle}</span></span><div className="scene-actions"><button className={`scene-control ${s.running ? 'pause-button' : 'primary'}`} disabled={busy} onClick={() => send({ type: s.running ? 'pause' : 'start' })}>{s.running ? <Pause size={17}/> : <Play size={17}/>} {s.running ? '사냥 일시정지' : '자동 사냥 시작'}</button><button className="scene-link" onClick={() => setView(d ? 'dungeons' : 'stages')}>{d ? '던전 변경' : '사냥터 변경'} <ChevronRight size={15}/></button></div></div><div className="scene-copy"><span className="eyebrow">{d ? `${d.id === 'abyss' ? `${s.dungeon!.depth || s.abyssBest + 1}층 · ` : ''}${s.dungeon!.wave + 1} / ${d.fish.length} 전투` : `STAGE ${String(STAGES.indexOf(st) + 1).padStart(2, '0')} · Lv. ${st.level}+`}</span><h2>{d ? d.id === 'abyss' ? <>{d.name} <b className="abyss-floor">{s.dungeon!.depth || s.abyssBest + 1}층</b></> : d.name : st.name}</h2><p>{s.recovery ? `모험가가 체력을 회복하고 있습니다 · ${recoverySeconds}초 남음` : enemy ? `${enemy.boss ? 'BOSS · ' : ''}${enemy.name}(이)가 나타났습니다.` : s.running ? '물결 속에서 다음 몬스터를 기다립니다.' : st.description}</p></div></section>
    <section className="panel battle-skills"><div className="section-title"><h2>전투 스킬 <span className="micro">AP {apUsed(s)} / {apCapacity(s)} · 액티브 {activeIds.length}개</span></h2><button className="text-button" onClick={() => setView('skills')}>스킬 편성 <ChevronRight size={14}/></button></div><div className="battle-skill-row">{(activeIds.length ? activeIds : ['']).map(id => { const sk = skillById(id), effective = sk ? effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id), s.skillSpecializations?.[id], s.skillPractice[id] || 0) : null; return <button key={id || 'empty'} className={`battle-skill ${sk ? '' : 'vacant'}`} onClick={() => setView('skills')}><div className="skill-symbol">{sk ? <SkillIcon id={sk.id}/> : <span>+</span>}</div><div><strong>{sk?.name || '빈 스킬 슬롯'}</strong><small>{sk ? `${Math.round(effective!.chance * 100)}% 발동 · ${(s.cooldowns[id] || 0) > 0 ? `대기 ${s.cooldowns[id]}턴` : '사용 준비'}` : '스킬을 장착하세요'}</small></div></button>; })}</div></section>
    <section className={`panel log-panel ${logOpen ? '' : 'folded'}`}><div className="section-title"><h2>항해 일지 <span className="micro">BATTLE LOG</span></h2><button type="button" className="log-fold" aria-expanded={logOpen} onClick={() => setLogOpen(v => { const next = !v; try { localStorage.setItem(LOG_FOLD_KEY, next ? 'open' : 'folded'); } catch { /* 저장소 없음 */ } return next; })}>{logOpen ? '접기' : '펼치기'}<ChevronRight size={13} className={logOpen ? 'open' : ''}/></button><Tabs value={filter} onValueChange={setFilter}><TabsList className="log-tabs"><TabsTrigger value="battle">전투</TabsTrigger><TabsTrigger value="reward">획득</TabsTrigger><TabsTrigger value="all">전체</TabsTrigger><TabsTrigger value="equipment">장비</TabsTrigger></TabsList></Tabs></div>{latestReward && filter === 'battle' && <button type="button" className="log-reward-ticker" onClick={() => setFilter('reward')} title="획득 기록 보기"><Sparkles size={13}/><span>{latestReward.text}</span></button>}<div className="log-list" role="log" aria-label="최근 전투와 획득 기록">{filter === 'equipment' ? <div className="battle-item-row log-equipment-list">{quickItems.length ? quickItems.map(item => <button type="button" key={item.id} onClick={() => setView('inventory')}><span className="battle-item-icon" style={{ color: RARITIES[item.rarity].color }}><SlotIcon slot={item.slot} size={18}/></span><span><strong>{item.name}</strong><small>{RARITIES[item.rarity].name} · 위력 {item.power}</small></span></button>) : <p className="battle-item-empty">처치 보상으로 장비를 획득하면 여기에 표시됩니다.</p>}</div> : withTurnDividers(s.logs.filter(l => filter === 'all' || LOG_TABS[filter]?.includes(l.type)).slice(-18).reverse(), log => <div key={log.id} className={`log-line ${log.type}`}><span className="log-number">{String(log.id).padStart(3, '0')}</span>{log.event ? <BattleLogLine log={log} playerName={s.name}/> : <><span>{log.type === 'reward' ? <Sparkles size={13}/> : log.type === 'system' ? <Compass size={13}/> : <Swords size={13}/>}</span><p>{log.text}</p></>}</div>)}</div></section>
    </div>
    <BattleRail s={s} busy={busy} send={send} setView={setView}/>
    </div>
    </>;
}

/** v27.23 숙련의 까미가 나타나면 3초 동안 금빛 연출을 띄웁니다. 같은 까미에는 한 번만. */
function KkamiArrival({ s }: { s: State }) {
    const [show, setShow] = useState(false);
    const seen = useRef('');
    const key = s.enemy?.id === MIMIC.id ? `${s.enemy.maxHp}:${s.kills}` : '';
    useEffect(() => {
        if (!key || seen.current === key) return;
        seen.current = key;
        setShow(true);
        const timer = window.setTimeout(() => setShow(false), 3200);
        return () => window.clearTimeout(timer);
    }, [key]);
    if (!show) return null;
    return <div className="scene-fx-layer" aria-hidden="true"><div className="scene-fx scene-fx-kkami">
        <i className="scene-fx-dark"/><i className="scene-fx-flash"/>
        {['✦', '◉', '✦', '◉', '✦', '◉', '✦', '◉'].map((g, i) => <b key={i} className="scene-fx-kkami-coin" style={{ '--i': i } as React.CSSProperties}>{g}</b>)}
        <strong className="scene-fx-kkami-title">✦ 숙련의 까미 등장!</strong>
        <span className="scene-fx-kkami-sub">잡으면 직업·스킬 숙련 로또</span>
    </div></div>;
}
