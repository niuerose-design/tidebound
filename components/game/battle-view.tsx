'use client';
import { displayTitle } from '@/game/data/titles';
import { FUEL } from '@/game/data/otherworld';
import { jobById } from '@/game/data/classes';
import { TutorialCard } from './guidance-panels';
import { tutorialActive } from '@/game/systems/guidance';
import { AltarNotice } from './altar-notice';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { tipAt } from '@/game/data/tips';
import { eventLabel } from '@/game/data/events';
import { UPDATE_LOG } from '@/game/data/update-log';
import { MonsterArt, SceneBackdrop } from './art';
import { cachedStats, useReplayView, type FrameStore } from './use-game';
import { LiveRatesCard } from './live-rates-card';
import { EXP_NURI } from '@/game/data/exp-nuri';
import { isSpecialId } from '@/game/data/king';
import { WHISTLE, WHISTLE_TARGETS, whistleOk, whistleTarget } from '@/game/data/whistle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rebirthLevel, encounterTier, tideLimit } from '@/game/systems/meta';
import { BookOpen, Check, ChevronRight, ScrollText, Coins, Compass, Fish, Pause, Play, RefreshCw, Sparkles, Swords, Target, Leaf, Gem, Megaphone } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heading, Meter, SkillIcon, format, Num } from './shared';
import { STAGES, MONSTERS, swarmHpMultiplier, swarmAttackMultiplier, monsterById, stageById, dungeonById } from '@/game/data/world';
import { variantById } from '@/game/data/variants';
import { BALANCE } from '@/game/data/balance';
import { statDisplay, percent } from '@/game/data/progression';
import { skillById } from '@/game/data/skills';
import { apCapacity, apUsed, effectiveSkill, skillMastery } from '@/game/systems/progression';
import { hitChance, normalizeStats } from '@/game/systems/stats';
import { profile } from '@/game/data/encounters';
import { bookRevealed } from '@/game/systems/book';
import { BOOK_REVEAL } from '@/game/data/book-traits';
import { useSkillFx } from './skill-fx-setting';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, SceneFx, FoeCleave, BarCleave, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import type { State, Action, CombatStats } from '@/game/types';
import { TideSelector } from './tide-selector';
import { SettingsDialog } from './settings-dialog';
import { SlotChips } from './slot-chips';
import { NoticeStack } from './notice-stack';
import { Player } from './player-column';
import { BattleRail } from './battle-rail';
import { MobilePlayerStrip } from './mobile-player-strip';
import { useNotices } from './notice-settings';
import { isHackerJob } from '@/game/data/hacker';
import { dayKey } from '@/game/data/time';

type Send = (a: Action) => void;
type SetView = (v: string) => void;
/**
 * 전투 화면. 재생 프레임(턴마다 여러 번)은 이 컴포넌트와 체력 · 마나 · 상대 · 기록을 보여 주는 자식만 다시 그립니다.
 * 동기화 때만 바뀌는 구간(머리글 · 알림 · 지표 · 집중 사냥 · 전투 스킬)은 base를 받는 memo 컴포넌트라 프레임 · 연출 갱신에 다시 그리지 않고,
 * 스킬 연출 상태(useCombatFx)는 BattleArena 안에만 있어 타격마다 상대 카드 · 장면만 다시 그립니다.
 */
export function BattleView({ s: base, frames, busy, send, setView, saved, settings, setSettings, name, setName, onSwitchSlot }: {
    onSwitchSlot?: (slot: number) => Promise<void>;
    s: State;
    frames: FrameStore;
    busy: boolean;
    send: Send;
    setView: SetView;
    saved: boolean;
    settings: boolean;
    setSettings: (open: boolean) => void;
    name: string;
    setName: (value: string) => void;
}) {
    // v27.62 재생 프레임은 전투 화면만 구독합니다(다른 화면은 동기화 때만 다시 그림).
    const s = useReplayView(base, frames);
    // v25.13 모바일: 캐릭터 열(상세·착용 장비)은 접어 두고 버튼으로 펼칩니다. 데스크톱에서는 늘 보입니다.
    const [playerOpen, setPlayerOpen] = useState(false);
    const st = stageById(s.stage)!;
    // v3.91 능력치는 동기화 상태(base)로 한 번만 계산합니다. 재생 프레임은 체력·마나·적·상태이상·기록만 바꾸고 능력치에는 영향이 없습니다.
    const playerStats = useMemo(() => cachedStats(base), [base]);
    // v3.19 알림·카드 켜기/끄기(설정 → 화면 알림). 꺼도 진행은 그대로입니다.
    const show = useNotices();
    return <>
    <BattleHeading base={base} saved={saved} settings={settings} setSettings={setSettings} name={name} setName={setName} busy={busy} send={send} setView={setView} onSwitchSlot={onSwitchSlot}/>
    <BattleNotices base={base} send={send} setView={setView}/>
    {show('slots') && <SlotChips s={base} busy={busy} onSwitch={onSwitchSlot}/>}
    <div className="battle-hud" style={{ '--stage-tone': st.tone } as React.CSSProperties}>
    <button type="button" className="mobile-player-toggle" aria-expanded={playerOpen} onClick={() => setPlayerOpen(v => !v)}>{playerOpen ? '나의 모험가 상세 접기' : '나의 모험가 상세 · 착용 장비 · 능력치 배분'}<ChevronRight size={14} className={playerOpen ? 'open' : ''}/></button>
    <div className={`battle-character-column ${playerOpen ? 'mobile-open' : ''}`}><Player s={s} a={playerStats} setView={setView}/></div>
    <div className="battle-console">
    <MobilePlayerStrip s={s} a={playerStats} setView={setView}/>
    {tutorialActive(base) && <div className="battle-top-tutorial"><TutorialCard s={base} send={send} busy={busy} setView={setView}/></div>}
    <SessionMetrics base={base}/>
    {show('liveRates') && <LiveRatesCard s={base} compact/>}
    {tideLimit(base) ? <TideSelector s={base} send={send} busy={busy} extra={<TargetStrip base={base} busy={busy} send={send} inline/>}/> : <TargetStrip base={base} busy={busy} send={send}/>}
    <BattleArena s={s} playerStats={playerStats} busy={busy} send={send} setView={setView}/>
    <BattleSkills base={base} setView={setView}/>
    </div>
    <BattleRail s={s} base={base} busy={busy} send={send} setView={setView}/>
    </div>
    </>;
}

/** 도구 줄(업데이트 내역 · 저장 상태 · 설정). 동기화 상태만 봅니다. v3.218 제목 문구(오늘도, 더 깊은 곳으로.)는 없애고 도구만 얇은 한 줄로 둡니다. */
const BattleHeading = memo(function BattleHeading({ base, saved, settings, setSettings, name, setName, busy, send, setView, onSwitchSlot }: {
    base: State; saved: boolean; settings: boolean; setSettings: (open: boolean) => void; name: string; setName: (value: string) => void; busy: boolean; send: Send; setView: SetView; onSwitchSlot?: (slot: number) => Promise<void>;
}) {
    return <Heading eyebrow="THE ENDLESS ADVENTURE"><div className="battle-heading-tools"><button type="button" className="secondary small battle-updates-link" title="업데이트 내역 바로 보기" onClick={() => setView('updates')}><ScrollText size={14}/><span>업데이트 내역</span><small>v{UPDATE_LOG[0].version}</small></button><span className="save-status battle-save-status">{saved ? <Check size={13}/> : <RefreshCw size={13}/>}<span>{saved ? '저장됨' : '연결 중'}</span></span><SidebarTrigger className="mobile-menu battle-mobile-menu"/><SettingsDialog open={settings} onOpenChange={open => { setSettings(open); setName(base.name); }} s={base} busy={busy} send={send} name={name} setName={setName} onSwitchSlot={onSwitchSlot}/></div></Heading>;
});

/** v27.88 알림은 한 묶음: 부재중 정산이 있으면 맨 앞, 그다음 이벤트 → 제단 → 안내 팁. 모바일에서는 첫 줄만 보이고 나머지는 펼칩니다. */
const BattleNotices = memo(function BattleNotices({ base: s, send, setView }: { base: State; send: Send; setView: SetView }) {
    const show = useNotices();
    /** v27.44 제단 축복이 섞이면 축복을 뺀 이벤트만 배너에(축복은 제단 알림 줄). */
    const banner = s.event && s.event.banner !== undefined ? s.event.banner : s.event;
    // v25.17 맨 위 한 줄: 부재중 정산 → 던전 진행 → 번갈아 나오는 안내.
    const [tip, setTip] = useState(0);
    useEffect(() => { const timer = window.setInterval(() => setTip(v => v + 1), 14000); return () => window.clearInterval(timer); }, []);
    return <NoticeStack>
    {s.lastOffline && show('offline') && <div className="voyage-brief has-offline"><Leaf size={16}/><span>부재중 사냥 정산 · {Math.floor(s.lastOffline.seconds / 60)}분 동안 {s.lastOffline.kills}마리 처치 · +{format(s.lastOffline.gold)} G</span><button aria-label="부재중 정산 알림 닫기" className="voyage-brief-dismiss" onClick={() => send({ type: 'offlineDismiss' })}><Check size={14}/></button></div>}
    {banner && show('event') && <div className="event-banner" role="status"><Sparkles size={15}/><b>이벤트</b><span>{eventLabel(banner)}</span></div>}
    {isHackerJob(s.job) && show('hacker') && <div className="event-banner hack-banner" role="status"><Sparkles size={15}/><b>해커</b><span>{s.running ? '브루트포스 실행 중 · 사냥 대신 비트·권한 경험치를 쌓습니다.' : '해커는 사냥하지 않습니다. 시작하면 브루트포스가 돌아갑니다.'} 침투 작전·해킹은 ‘해킹’ 메뉴에서.</span></div>}
    {/* v3.18 해커의 방송 탈취: 서명이 고정된 문구를 이벤트 배너 자리에 띄웁니다. */}
    {s.hackFeed?.broadcast && show('hacker') && <div className="event-banner hack-banner" role="status"><Sparkles size={15}/><b>[해커 {s.hackFeed.broadcast.by}]</b><span>{s.hackFeed.broadcast.text}</span></div>}
    {s.hackFeed?.root && show('hacker') && <div className="event-banner hack-banner root-banner" role="status"><Sparkles size={15}/><b>ROOT ACCESS</b><span>[해커 {s.hackFeed.root.by}]이(가) 서버의 루트 권한을 얻었습니다.</span></div>}
    {jobById(s.job)?.fuelJob && <FuelBanner s={s} send={send}/>}
    {show('altar') && <AltarNotice s={s} setView={setView}/>}
    {!s.lastOffline && show('tip') && <div className="voyage-brief"><Leaf size={16}/><span>{tipAt(tip)}</span></div>}
    </NoticeStack>;
});

/** v3.231 이계 연료: 남은 연료 · 절전 표시 · 세계석 충전 버튼 · 자동 충전(세계석 1,000개는 남김) 켜기/끄기. */
function FuelBanner({ s, send }: { s: State; send: Send }) {
    const fuel = s.fuel || 0, empty = fuel <= 0, auto = s.fuelAuto !== undefined;
    return <div className={`event-banner fuel-banner ${empty ? 'hack-banner' : ''}`} role="status"><Gem size={15}/><b>이계 연료</b>
        <span>{empty ? '절전 모드 · 이계 액티브가 나가지 않고 두 공격이 크게 줄었습니다.' : `${format(fuel)} / ${format(FUEL.cap)} (세계석 1 = 연료 ${FUEL.perPearl})`}</span>
        {[10, 100, 1000].map(n => <button key={n} type="button" className="secondary small" disabled={(s.pearls || 0) < 1 || fuel >= FUEL.cap} onClick={() => send({ type: 'fuelCharge', value: String(n) })}>세계석 {format(n)}</button>)}
        <button type="button" className="secondary small" onClick={() => send({ type: 'fuelAuto', value: auto ? '' : '1000' })}>{auto ? `자동 충전 끄기(${format(s.fuelAuto!)} 남김)` : '자동 충전 켜기'}</button>
    </div>;
}

/** 누적 처치 · 도감 · 보유 재화 한 줄. */
const SessionMetrics = memo(function SessionMetrics({ base: s }: { base: State }) {
    return <div className="session-metrics"><div><Fish/><span>누적 처치<strong><Num n={s.kills}/> <small>마리</small></strong></span></div><div><BookOpen/><span>발견한 몬스터<strong>{Object.keys(s.book).length} <small>/ {MONSTERS.length}종</small></strong></span></div><div className="session-currency gold"><Coins/><span>보유 골드<strong><Num n={s.gold}/> <small>G</small></strong></span></div><div className="session-currency pearl" title={`세계석은 환생(Lv.${rebirthLevel(s)}부터) 후 ‘환생 · 분신 → 세계석 연구’에서 영구 능력치·편의 연구를 사는 데 씁니다. 환생할 때 레벨·환생 횟수에 따라 받고, 별빛 변종·도감·업적 보상으로도 모입니다. 환생해도 사라지지 않습니다.`}><Sparkles/><span>보유 세계석 <small className="metric-hint">?</small><strong><Num n={s.pearls}/> <small>개</small></strong></span></div><div className="session-currency essence" title="정수는 장비 분해 · 무리 전리품 · 높은 사냥터 난이도 등에서 모입니다. 옵션 재설정 · 재련, 저격 뽑기, 원시 각성에 씁니다. 환생해도 사라지지 않습니다."><Gem/><span>보유 정수 <small className="metric-hint">?</small><strong><Num n={s.essence || 0}/> <small>개</small></strong></span></div></div>;
});

/** 집중 사냥 대상 고르기(사냥터의 몬스터 탭). v3.218 사냥터 난이도 카드 안에 한 줄로 들어갑니다(inline). 난이도가 없는 첫 생에는 따로 한 줄. */
const TargetStrip = memo(function TargetStrip({ base: s, busy, send, inline = false }: { base: State; busy: boolean; send: Send; inline?: boolean }) {
    const st = stageById(s.stage)!, tier = encounterTier(s);
    return <div className={`battle-target-strip ${inline ? 'inline' : ''}`}><span><Target size={15}/> 집중 사냥</span><Tabs value={s.target || 'all'} onValueChange={id => send({ type: 'target', id })}><TabsList><TabsTrigger value="all" disabled={busy || !!s.dungeon}>무작위</TabsTrigger>{st.monsters.map(id => { const f = monsterById(id), need = f?.minTier || 0, locked = need > tier; return <TabsTrigger value={id} key={id} disabled={busy || !!s.dungeon || locked} title={locked ? `사냥터 난이도 ${need}부터 나타나는 몬스터입니다. 지금 난이도 ${tier}.` : undefined}>{f?.name}{locked ? ` · 난이도 ${need}+` : ''}</TabsTrigger>; })}</TabsList></Tabs></div>;
});

/** 장착한 액티브 스킬 줄(AP · 발동률 · 대기). 대기 턴은 동기화마다 갱신됩니다. */
const BattleSkills = memo(function BattleSkills({ base: s, setView }: { base: State; setView: SetView }) {
    const activeIds = s.skills.filter(id => skillById(id)?.type === 'active');
    return <section className="panel battle-skills"><div className="section-title"><h2>전투 스킬 <span className="micro">AP {apUsed(s)} / {apCapacity(s)} · 액티브 {activeIds.length}개</span></h2><button className="text-button" onClick={() => setView('skills')}>스킬 편성 <ChevronRight size={14}/></button></div><div className="battle-skill-row">{(activeIds.length ? activeIds : ['']).map(id => { const sk = skillById(id), effective = sk ? effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id)) : null; return <button key={id || 'empty'} className={`battle-skill ${sk ? '' : 'vacant'}`} onClick={() => setView('skills')}><div className="skill-symbol">{sk ? <SkillIcon id={sk.id}/> : <span>+</span>}</div><div><strong>{sk?.name || '빈 스킬 슬롯'}</strong><small>{sk ? (() => { const wait = sk.awaken && s.cooldowns[id] === undefined ? sk.awaken.start : s.cooldowns[id] || 0; return `${sk.awaken ? '각성 · ' : ''}${Math.round(effective!.chance * 100)}% 발동 · ${wait > 0 ? `대기 ${wait}턴` : '사용 준비'}`; })() : '스킬을 장착하세요'}</small></div></button>; })}</div></section>;
});

/** 상대 카드와 사냥터 장면. 스킬 연출 상태는 여기에만 있어 타격 연출이 바뀔 때 이 안만 다시 그립니다. */
function BattleArena({ s, playerStats, busy, send, setView }: { s: State; playerStats: CombatStats; busy: boolean; send: Send; setView: SetView }) {
    const st = stageById(s.stage)!, d = dungeonById(s.dungeon?.id);
    const enemy = s.enemy;
    const enemyStats = enemy ? normalizeStats(enemy.combatStats || { hp: enemy.maxHp, attack: enemy.attack, defense: enemy.defense, crit: 0 }) : null;
    const skillFx = useSkillFx(), { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name, skillFx);
    // 회복 대기(필드 패배 후)·출정 준비(던전 입장 후) 남은 시간. 던전 화면의 준비 카운트다운과 같은 방식입니다.
    const recoverySeconds = Math.ceil(s.recovery * BALANCE.turnMs / 1000);
    const recoveryText = s.recovery > 0 ? d ? `출정 준비 · ${recoverySeconds}초 남음` : `회복 대기 · ${recoverySeconds}초 남음` : null;
    return <>
    <div className="battle-opponent-strip battle-fx-host"><CombatFxOverlay effect={combatFx} combo={fxCombo}/><div className="opponent-card player-opponent"><span className="eyebrow">MY CHARACTER</span><div className="combatant-name"><strong>{displayTitle(s) ? <small className="rebirth-title">{displayTitle(s)}</small> : null}{s.name}</strong><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label={`HP ${Math.ceil(s.hp)} / ${playerStats.hp}`}/><PlayerHitEffect effect={combatFx}/></div><small title={`명중 수치 ${statDisplay('accuracy', playerStats.accuracy || 0)} · 회피 수치 ${statDisplay('evasion', playerStats.evasion || 0)} · 실제 확률은 상대의 회피·명중과 속도 차이로 1~99.5% 범위에서 정해집니다.`}>속도 {playerStats.speed}{enemyStats ? ` · 명중률 ${percent(hitChance(playerStats, enemyStats), 0)} · 회피율 ${percent(1 - hitChance(enemyStats, playerStats), 0)}` : ' · 상대를 만나면 명중률·회피율 표시'}</small></div><div className="opponent-vs"><Swords size={17}/><strong>VS</strong></div><div className="opponent-card enemy-opponent"><span className="eyebrow">{enemy?.boss ? 'BOSS ENCOUNTER' : enemy?.variant ? 'RARE VARIANT' : 'CURRENT TARGET'}{enemy?.swarm ? ` · 무리 ×${enemy.swarm}` : ''}</span><div className="combatant-name">{enemy ? <strong>{enemy.variant && enemy.variant !== 'swarm' ? <small className={`variant-badge variant-${enemy.variant}`} title={variantById(enemy.variant)?.desc}>{variantById(enemy.variant)?.mark} {variantById(enemy.variant)?.name}</small> : enemy.swarm ? <small className="variant-badge variant-swarm" title={variantById('swarm')?.desc}>≋ 무리 ×{enemy.swarm}</small> : null}{enemy.name}</strong> : recoveryText ? <strong className="recovery-countdown" aria-live="polite">{recoveryText}</strong> : <strong>다음 몬스터를 기다리는 중</strong>}{enemy && <StatusBadges effects={enemy.effects} stun={enemy.stun} recent={combatFx} target="enemy"/>}</div><div className="player-hp-anchor"><Meter value={enemy?.hp || 0} max={enemy?.maxHp || 1} label={enemy ? `HP ${Math.ceil(enemy.hp)} / ${enemy.maxHp}` : 'READY'} color="enemy"/><BarCleave effect={combatFx} value={enemy?.hp || 0} max={enemy?.maxHp || 1} label={enemy ? `HP ${Math.ceil(enemy.hp).toLocaleString()} / ${enemy.maxHp.toLocaleString()}` : undefined}/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemy ? `${bookRevealed(s, enemy.id) ? profile(enemy.id).name : '미확인 개체'} · 속도 ${enemyStats?.speed || 0}${!s.dungeon && s.tide ? ` · 사냥터 난이도 ${s.tide} 적용` : ''}${enemy.swarm ? ` · 무리 체력 ×${swarmHpMultiplier(enemy.swarm)}${swarmAttackMultiplier(enemy.swarm) > 1 ? ` · 공격 ×${swarmAttackMultiplier(enemy.swarm)}` : ''}` : ''}` : st.description}</small><small className="enemy-hint" aria-hidden={!enemy}>{enemy ? bookRevealed(s, enemy.id) ? profile(enemy.id).hint : `도감 ${BOOK_REVEAL}회 처치 시 성향·대응법 공개 (${Math.min(s.book[enemy.id] || 0, BOOK_REVEAL)} / ${BOOK_REVEAL})` : ' '}</small></div></div>
    <section className={`battle-scene ${s.running ? 'running' : ''}`}><SceneBackdrop/><div className="scene-shade"/>{enemy && !s.recovery && <MonsterArt id={enemy.id} boss={!!enemy.boss} size={128} className={`scene-foe ${isSpecialId(enemy.id) ? 'kkami' : ''}`}/>}<KkamiArrival s={s}/><KkamiKill s={s}/><FoeCleave effect={combatFx} enemy={enemy}/><SceneFx effect={combatFx} boss={!!enemy?.boss} pnl={s.marketPnl || 0}/><div className="scene-top"><span className="scene-label"><Compass size={14}/><span className="scene-label-text">{d ? 'DUNGEON EXPEDITION' : st.subtitle}</span></span><div className="scene-actions"><button className={`scene-control ${s.running ? 'pause-button' : 'primary'}`} disabled={busy} onClick={() => send({ type: s.running ? 'pause' : 'start' })}>{s.running ? <Pause size={17}/> : <Play size={17}/>} {s.running ? '사냥 일시정지' : '자동 사냥 시작'}</button><button className="scene-link" onClick={() => setView(d ? 'dungeons' : 'stages')}>{d ? '던전 변경' : '사냥터 변경'} <ChevronRight size={15}/></button></div></div><div className="scene-copy"><span className="eyebrow">{d ? `${d.id === 'abyss' ? `${s.dungeon!.depth || s.abyssBest + 1}층 · ` : ''}${s.dungeon!.wave + 1} / ${d.monsters.length} 전투` : `STAGE ${String(STAGES.indexOf(st) + 1).padStart(2, '0')} · Lv. ${st.level}+`}</span><h2>{d ? d.id === 'abyss' ? <>{d.name} <b className="abyss-floor">{s.dungeon!.depth || s.abyssBest + 1}층</b></> : d.name : st.name}</h2><p>{s.recovery ? d ? '출정을 준비하고 있습니다.' : '모험가가 체력을 회복하고 있습니다.' : enemy ? `${enemy.boss ? 'BOSS · ' : ''}${enemy.name}(이)가 나타났습니다.` : s.running ? '풀숲 너머에서 다음 몬스터를 기다립니다.' : st.description}</p></div><WhistleButton s={s} send={send} busy={busy}/></section>
    </>;
}

/** v3.162 호루라기: 장면 구석의 작은 버튼. 누르면 부를 몬스터를 고르는 메뉴가 열립니다(SP 5 · 하루 3번). v3.165 메뉴는 이름만(까미 · 누리 · 정수 슬라임), 설명은 도움말 ‘사냥 규칙’에만. */
const WhistleButton = memo(function WhistleButton({ s, send, busy }: { s: State; send: (a: { type: 'whistle'; id: string }) => void; busy: boolean }) {
    const targets = WHISTLE_TARGETS.filter(t => whistleOk(s, t));
    if (!targets.length) return null;
    const used = s.whistleDay?.key === dayKey(s.lastTick || 0) ? s.whistleDay.used : 0, left = Math.max(0, WHISTLE.perDay - used), pending = s.whistle ? whistleTarget(s.whistle) : undefined;
    const locked = busy || !!s.dungeon || !!pending || left <= 0 || s.sp < WHISTLE.sp;
    const why = s.dungeon ? '던전에서 나온 뒤 불 수 있습니다.' : pending ? `불어 두었습니다. 다음 사냥터 출현에 ${pending.name}이(가) 나타납니다.` : left <= 0 ? '오늘 몫을 다 썼습니다(한국 시간 자정 초기화).' : s.sp < WHISTLE.sp ? `SP가 부족합니다(필요 ${WHISTLE.sp}).` : '';
    return <Popover>
        <PopoverTrigger asChild>
            <button type="button" className={`scene-whistle ${pending ? 'pending' : ''}`} title={`호루라기: SP ${WHISTLE.sp}로 다음 사냥터 출현을 고른 특별 몬스터로 정합니다(하루 ${WHISTLE.perDay}번). 자세한 규칙은 도움말 → 사냥 규칙.`} aria-label="호루라기 메뉴 열기">
                <Megaphone size={13}/> {pending ? `호루라기 · ${pending.name} 대기` : `호루라기 · SP ${WHISTLE.sp} 소모`}
            </button>
        </PopoverTrigger>
        <PopoverContent className="status-pop game-tooltip whistle-pop" side="top" align="end">
            <strong>호루라기 <small>오늘 {left} / {WHISTLE.perDay}</small></strong>
            {why && <p className="whistle-why">{why}</p>}
            <div className="whistle-options">{targets.map(t => <button key={t.id} type="button" className="secondary small" disabled={locked} title={t.name} onClick={() => send({ type: 'whistle', id: t.id })}>{t.short}</button>)}</div>
        </PopoverContent>
    </Popover>;
});
/** v27.23 숙련의 까미가 나타나면 3초 동안 금빛 연출을 띄웁니다. 같은 까미에는 한 번만. v27.58 경험의 누리도 같은 연출(하얀 빛). */
function KkamiArrival({ s }: { s: State }) {
    const [show, setShow] = useState<'' | 'kkami' | 'nuri'>('');
    const seen = useRef('');
    // v3.13 키에 처치 수를 넣지 않습니다. 재생 중인 화면에는 아직 까미가 보이는데 동기화로 처치 수가 먼저 올라 등장 연출이 처치 때 한 번 더 나왔습니다.
    // v3.161 정수의 슬라임 · 대왕 3종도 같은 연출(누리 계열은 하얀 빛).
    const key = s.enemy && isSpecialId(s.enemy.id) ? `${s.enemy.id}:${s.enemy.maxHp}` : '';
    useEffect(() => {
        if (!key) { seen.current = ''; return; }
        if (seen.current === key) return;
        seen.current = key;
        setShow(key.startsWith(EXP_NURI.id) || key.startsWith('kingNuri') ? 'nuri' : 'kkami');
        const timer = window.setTimeout(() => setShow(''), 3200);
        return () => window.clearTimeout(timer);
    }, [key]);
    if (!show) return null;
    return <div className="scene-fx-layer" aria-hidden="true"><div className={`scene-fx scene-fx-kkami${show === 'nuri' ? ' scene-fx-nuri' : ''}`}>
        <i className="scene-fx-dark"/><i className="scene-fx-flash"/>
        {['✦', '◉', '✦', '◉', '✦', '◉', '✦', '◉'].map((g, i) => <b key={i} className="scene-fx-kkami-coin" style={{ '--i': i } as React.CSSProperties}>{g}</b>)}
        <strong className="scene-fx-kkami-title">{show === 'nuri' ? '✦ 경험의 누리 등장!' : '✦ 숙련의 까미 등장!'}</strong>
        <span className="scene-fx-kkami-sub">{show === 'nuri' ? '잡으면 레벨 경험치 1~3% 로또' : '잡으면 직업·스킬 숙련 로또'}</span>
    </div></div>;
}

/** v3.13 까미·누리를 잡으면 등장 연출과 다른 처치 연출(금빛 고리 + 당첨 문구)을 띄웁니다. 재생 중인 로그에 당첨 줄이 나타나는 순간 기준. */
function KkamiKill({ s }: { s: State }) {
    const hit = s.logs.findLast(l => l.type === 'reward' && (l.text.startsWith('✦ 숙련의 까미 ·') || l.text.startsWith('✦ 경험의 누리 ·')));
    const [show, setShow] = useState<{ id: number; nuri: boolean; text: string } | null>(null);
    const seen = useRef(0);
    const id = hit?.id || 0;
    useEffect(() => {
        if (!id || !hit || seen.current === id) return;
        const fresh = seen.current !== 0;
        seen.current = id;
        if (!fresh) return;
        setShow({ id, nuri: hit.text.startsWith('✦ 경험의 누리'), text: hit.text.replace(/^✦ [^·]+· /, '') });
        const timer = window.setTimeout(() => setShow(null), 2800);
        return () => window.clearTimeout(timer);
    }, [id, hit]);
    if (!show) return null;
    return <div className="scene-fx-layer" aria-hidden="true"><div className={`scene-fx scene-fx-kkami scene-fx-kkami-kill${show.nuri ? ' scene-fx-nuri' : ''}`}>
        <i className="scene-fx-flash"/><i className="scene-fx-kkami-ring"/><i className="scene-fx-kkami-ring"/>
        {['✦', '◉', '✦', '◉', '✦', '◉', '✦', '◉'].map((g, i) => <b key={i} className="scene-fx-kkami-coin" style={{ '--i': i } as React.CSSProperties}>{g}</b>)}
        <strong className="scene-fx-kkami-title">{show.nuri ? '✦ 경험의 누리 처치!' : '✦ 숙련의 까미 처치!'}</strong>
        <span className="scene-fx-kkami-sub">{show.text}</span>
    </div></div>;
}
