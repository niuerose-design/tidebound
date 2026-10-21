'use client';
/** v3.395 던전(새 토대): 진행 중 장면 · 웨이브 띠 · 자동 진행 · 주화 줄 · 던전 카드(난이도 · 단계 · 반복 · 도전). 서버 행동(dungeon · leaveDungeon)은 전과 같습니다. */
import { useState } from 'react';
import { Coins, Lock, Swords } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { FIRST_CLEAR_SP } from '@/game/data/achievements';
import { dungeonGoldMultiplier, stats } from '@/game/systems/stats';
import { levelGateOk } from '@/game/systems/meta';
import { clearCoinBase, dailyBonusLeft } from '@/game/systems/dungeon-coins';
import { DAILY_BONUS } from '@/game/data/dungeon-shop';
import { BALANCE, MONSTER_TUNING, DUNGEON_MODES, type DungeonMode } from '@/game/data/balance';
import { nightmareStageCap } from '@/game/systems/dungeon-run';
import { PLAIN_DUNGEONS, closedIn, CLOSED_NOTE, monsterById, dungeonById } from '@/game/data/world';
import { abyssPearls, nextAbyssMilestone } from '@/game/data/long-term';
import { MonsterArt, SceneBackdrop, backdropTheme } from '@/components/game/art';
import { useSkillFx } from '@/components/game/skill-fx-setting';
import { SceneFx, FoeCleave, SceneCombatHud, useCombatFx } from '@/components/game/combat-fx';
import { SceneFoe, SceneMe, SceneLog, AzerothHud, SkillReceipt, CastFx, SceneDamage, SceneLoot, BossIntro, LevelUpFx } from '@/components/game/scene-stage';
import { OtherworldHud } from '@/components/game/otherworld-hud';
import { useNow } from '@/components/game/shared';
import { SectionHeader, formatExact } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlaceCard, Badge, AutoRunStatus, field } from './parts';

type Send = (a: Action) => void;
const fmt = formatExact;

export function DungeonsScreen({ s, send, busy, setView }: { s: State; send: Send; busy: boolean; setView?: (v: string) => void }) {
    const active = s.dungeon ? dungeonById(s.dungeon.id) : undefined, playerStats = stats(s);
    const [repeatChoice, setRepeatChoice] = useState<Record<string, string>>({});
    // v27.70 던전 난이도(노말·헬·나이트메어)는 던전마다 고릅니다. 입장 값은 '<난이도>[:단계]@<반복>'.
    const [modeChoice, setModeChoice] = useState<Record<string, DungeonMode>>({});
    // v3.310 나이트메어 단계 선택(기본: 지금 들어갈 수 있는 최고 단계).
    const [stageChoice, setStageChoice] = useState<Record<string, number>>({});
    const coinMult = dungeonGoldMultiplier(s), now = useNow(60_000), bonusLeft = dailyBonusLeft(s, now);
    return <div className="grid gap-5 text-ink-1">
        {/* v3.257 던전에 들어가 있으면 머리말을 줄이고 진행 장면을 맨 위로, 자동 진행 카드는 그 아래로. */}
        <SectionHeader as="h1" eyebrow="DUNGEON" title="세계의 숨겨진 던전" description={active ? undefined : '연속 전투와 보스에 도전하세요. 현재 전투·웨이브·전투 로그를 이 화면에서 바로 확인할 수 있습니다.'}/>
        {!active && <p className="text-xs text-ink-3">현재 HP {fmt(s.hp)} / {fmt(playerStats.hp)} · MP {fmt(s.mana)} / {fmt(playerStats.mana)} · 입장 후 {MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 준비가 끝나면 모두 회복됩니다.</p>}
        {active && <ActiveRun s={s} send={send} busy={busy} playerStats={playerStats}/>}
        <AutoRunStatus s={s}/>
        {/* v3.204 던전 주화 상점은 상점 메뉴의 탭으로 옮겼습니다. 여기는 보유 주화와 바로 가기만. */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-l border border-line bg-surface-2 px-4 py-3 shadow-1" aria-label="던전 주화">
            <span className="inline-flex items-center gap-2 text-s"><Coins size={16} className="text-accent"/>던전 주화 <b className="font-num">{fmt(s.dungeonCoins || 0)}</b><span className="text-ink-3">· 오늘 보너스 정복 {bonusLeft}/{DAILY_BONUS.clears}회 남음</span></span>
            {setView && <span className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setView('dungeonShop')}>던전 주화 상점</Button><Button type="button" size="sm" variant="ghost" onClick={() => setView('help')}>난이도 도움말</Button></span>}
        </section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[...PLAIN_DUNGEONS].sort((a, b) => a.level - b.level).map((d, i) => {
            const closed = closedIn(s, 'dungeons', d.id), locked = closed || !levelGateOk(s, d.level) || s.rebirths < d.rebirth;
            const mode = modeChoice[d.id] || 'normal', abyss = d.id === 'abyss';
            const stageCap = nightmareStageCap(s, d.id), bestStage = s.nightmareBest?.[d.id] || 0, stage = mode === 'nightmare' && !abyss ? Math.max(1, Math.min(stageChoice[d.id] || stageCap, stageCap)) : 1;
            const research = FIRST_CLEAR_SP[d.id], claimed = !!s.achievementClaims?.[`firstClear:${d.id}`], here = s.dungeon?.id === d.id, off = busy || locked || !!s.dungeon;
            return <PlaceCard key={d.id} index={i} locked={locked} className={cn(here && 'border-accent/70 bg-accent-soft')}
                state={here ? <Badge>탐험 중</Badge> : abyss ? <Badge tone="muted">최고 {s.abyssBest}층</Badge> : s.clears[d.id] ? <Badge tone="muted">{s.clears[d.id]}회 정복</Badge> : <Badge tone="muted">미탐험</Badge>}
                eyebrow={closed ? CLOSED_NOTE : abyss ? `다음 도전 ${s.abyssBest + 1}층` : `${d.monsters.length}웨이브 · 보스 ${d.boss?.split('·').pop()?.trim() || ''}`} title={d.name} description={d.description}
                foot={<>
                    <span><b className="mr-1 text-ink-2">최초</b>{abyss ? `${s.abyssBest + 1}층 세계석 ${abyssPearls(s.abyssBest + 1)} · 10층마다 보너스 세계석(층 수만큼)${nextAbyssMilestone(s.abyssBest) ? ` · ${nextAbyssMilestone(s.abyssBest)}층 SP 1` : ''}` : `세계석 ${d.pearls}${research ? ` · 업적 SP ${research}` : ''}`}{!abyss && s.clears[d.id] && (!research || claimed) ? ' · 받음' : ''}</span>
                    <span><b className="mr-1 text-ink-2">정복</b>던전 주화 {fmt(Math.floor(clearCoinBase(d.id, mode, abyss ? s.abyssBest + 1 : 1, !abyss && bonusLeft > 0, stage) * coinMult))}{!abyss ? ` · 오늘 보너스 ${bonusLeft}/${DAILY_BONUS.clears}회` : ''}</span>
                    <span>Lv. {d.level}+{d.rebirth ? ` · 환생 ${d.rebirth}회` : ''}</span>
                </>}>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    {!abyss && <select className={field} aria-label={`${d.name} 난이도`} value={mode} disabled={off} onChange={e => setModeChoice({ ...modeChoice, [d.id]: e.target.value as DungeonMode })}>{DUNGEON_MODES.map(m => <option key={m.id} value={m.id} title={m.note || undefined}>{m.name}</option>)}</select>}
                    {!abyss && mode === 'nightmare' && <select className={field} aria-label={`${d.name} 단계`} value={stage} title="단계마다 체력 · 공격이 오릅니다. 자세한 규칙은 도움말 › 사냥 · 던전 · 생존" disabled={off} onChange={e => setStageChoice({ ...stageChoice, [d.id]: Number(e.target.value) })}>{Array.from({ length: stageCap }, (_, k) => k + 1).map(k => <option key={k} value={k}>{k}단계{k > bestStage ? ' · 도전' : ''}</option>)}</select>}
                    {!abyss && mode === 'nightmare' && bestStage > 0 && <small className="text-xs text-ink-3">최고 {bestStage}단계 정복</small>}
                    <select className={field} aria-label={`${d.name} 반복 설정`} value={repeatChoice[d.id] || 'once'} disabled={off} onChange={e => setRepeatChoice({ ...repeatChoice, [d.id]: e.target.value })}>
                        <option value="once">1회</option>
                        {abyss ? [5, 10, 25].map(n => <option key={n} value={`deeper:${n}`}>{s.abyssBest + n}층까지</option>) : [5, 10, DAILY_BONUS.clears].map(n => <option key={n} value={String(n)}>{n}회{n === DAILY_BONUS.clears ? ' · 오늘 보너스' : ''}</option>)}
                        <option value="fail">실패까지</option>
                        {!abyss && mode === 'nightmare' && <option value="climb">단계 오르기 · 실패까지</option>}
                    </select>
                    <Button type="button" size="sm" className="ml-auto bg-accent text-accent-ink hover:bg-accent/90" disabled={off} onClick={() => send({ type: 'dungeon', id: d.id, value: `${mode}${mode === 'nightmare' && !abyss ? `:${stage}` : ''}@${repeatChoice[d.id] || 'once'}` })}>{locked ? <Lock size={14}/> : <Swords size={14}/>}도전</Button>
                </div>
            </PlaceCard>;
        })}</div>
    </div>;
}

/** 진행 중인 던전: 머리줄(이름 · 단계 · 층 · 반복 상태 · 귀환) + 사냥 화면과 같은 장면 + 웨이브 띠. 장면 안은 연출 CSS(battle.css) 예외라 옛 클래스를 그대로 씁니다. */
function ActiveRun({ s, send, busy, playerStats }: { s: State; send: Send; busy: boolean; playerStats: ReturnType<typeof stats> }) {
    const d = dungeonById(s.dungeon!.id)!, wave = s.dungeon!.wave, repeat = s.dungeon!.repeat;
    const skillFx = useSkillFx(), { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name, skillFx);
    const repeatStatus = repeat ? (repeat.until ? `반복 중 · ${repeat.until}층까지` : repeat.climb ? '반복 중 · 단계 오르기' : repeat.left === null ? '반복 중 · 실패할 때까지' : repeat.left === 0 ? '반복 중 · 마지막 도전' : `반복 중 · 이후 ${repeat.left}회 더`) : '';
    return <section className="grid gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="진행 중인 던전">
        <header className="flex flex-wrap items-center justify-between gap-2">
            <div title={d.description}><span className="eyebrow">ACTIVE EXPEDITION{repeatStatus && ` · ${repeatStatus}`}</span><h2 className="font-display text-l font-bold">{d.name}{!!s.dungeon!.stage && s.dungeon!.stage > 1 && <b className="ml-2 text-m text-warn"> 나이트메어 {s.dungeon!.stage}단계</b>}{d.id === 'abyss' && <b className="ml-2 text-m text-accent"> {s.dungeon!.depth || s.abyssBest + 1}층</b>}</h2>{d.id === 'abyss' && <p className="text-xs text-ink-3">최고 기록 {s.abyssBest}층</p>}</div>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>던전 귀환</Button>
        </header>
        <section className={cn('battle-scene dungeon-scene mb-0! h-[420px]! md:h-[320px]! xl:h-[clamp(420px,calc(100vh/var(--ui-scale,1)-440px),560px)]!', !s.recovery && s.hp < playerStats.hp * .3 && 'danger')}><SceneBackdrop theme={backdropTheme(d.name)}/><div className="scene-shade"/><SceneFoe enemy={s.enemy} hidden={!!s.recovery} effect={combatFx}/><FoeCleave effect={combatFx} enemy={s.enemy}/><SceneFx effect={combatFx} boss={!!s.enemy?.boss} pnl={s.marketPnl || 0}/><SceneCombatHud enemy={s.enemy && !s.recovery ? s.enemy : null} effect={combatFx} combo={fxCombo}/>
            <div className="scene-job-slot"><OtherworldHud s={s} send={send} part="scene"/><AzerothHud s={s}/></div>
            {s.recovery > 0 && <span className="scene-idle recovery">출정 준비</span>}
            <span className="scene-wave">{s.enemy?.boss ? 'BOSS · ' : ''}{wave + 1} / {d.monsters.length} 전투</span>
            {!s.recovery && <><CastFx effect={combatFx} boss={!!s.enemy?.boss}/><SceneDamage effect={combatFx}/><SkillReceipt effect={combatFx} boss={!!s.enemy?.boss}/></>}<SceneLoot logs={s.logs}/><BossIntro enemy={s.enemy && !s.recovery ? s.enemy : null}/><LevelUpFx level={s.level}/><SceneLog logs={s.logs} playerName={s.name}/><SceneMe s={s} stats={playerStats} effect={combatFx}/>
        </section>
        <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="웨이브">{d.monsters.map((id, index) => {
            const done = wave > index, current = wave === index, boss = index === d.monsters.length - 1;
            const def = boss && d.bossMonster ? monsterById(d.bossMonster) : monsterById(id);
            return <li key={`${id}-${index}`} className={cn('flex min-w-24 shrink-0 flex-col items-center gap-1 rounded-m border px-2 py-2 text-center', current ? 'border-accent/70 bg-accent-soft' : done ? 'border-line bg-surface-1 opacity-60' : 'border-line bg-surface-1', boss && 'border-danger/50')}>
                <MonsterArt id={def?.id || id} boss={boss} size={boss ? 40 : 28}/><span className={cn('text-xs', boss ? 'font-semibold text-danger' : 'text-ink-3')}>{boss ? 'BOSS' : `W${index + 1}`}</span><strong className="truncate text-xs">{def?.name || id}</strong>
            </li>; })}</ol>
    </section>;
}
