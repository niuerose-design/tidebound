'use client';
import { AutoRunStatus } from './auto-run';
import { FIRST_CLEAR_SP } from '@/game/data/achievements';
import { dungeonGoldMultiplier, stats } from '@/game/systems/stats';
import { levelGateOk } from '@/game/systems/meta';
import { clearCoinBase, dailyBonusLeft } from '@/game/systems/dungeon-coins';
import { DAILY_BONUS } from '@/game/data/dungeon-shop';
import { useState } from 'react';
import { Lock, Swords } from 'lucide-react';
import { MonsterArt, SceneBackdrop } from './art';
import { BALANCE, MONSTER_TUNING, DUNGEON_MODES, type DungeonMode } from '@/game/data/balance';
import { PLAIN_DUNGEONS, closedIn, CLOSED_NOTE, monsterById, dungeonById } from '@/game/data/world';
import { Heading, format, useNow } from './shared';
import { useSkillFx } from './skill-fx-setting';
import { SceneFx, FoeCleave, SceneCombatHud, useCombatFx } from './combat-fx';
import { SceneFoe, SceneMe, SceneLog, AzerothHud, SkillReceipt, CastFx, SceneDamage } from './scene-stage';
import { OtherworldHud } from './otherworld-hud';
import { abyssPearls, nextAbyssMilestone } from '@/game/data/long-term';
import type { PanelProps } from './panel-props';
export function Dungeons({ s, send, busy, setView }: PanelProps) {
    const activeDungeon = s.dungeon ? dungeonById(s.dungeon?.id) : undefined;
    const playerStats = stats(s);
    const activeWave = s.dungeon?.wave ?? 0;
    const skillFx = useSkillFx(), { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name, skillFx);
    const [repeatChoice, setRepeatChoice] = useState<Record<string, string>>({});
    // v27.70 던전 난이도(노말·헬·나이트메어)는 던전마다 고릅니다. 입장 값은 '<난이도>@<반복>'.
    const [modeChoice, setModeChoice] = useState<Record<string, DungeonMode>>({});
    const coinMult = dungeonGoldMultiplier(s), now = useNow(60_000), bonusLeft = dailyBonusLeft(s, now);
    const repeat = s.dungeon?.repeat;
    const repeatStatus = repeat ? (repeat.until ? `반복 중 · ${repeat.until}층까지` : repeat.left === null ? '반복 중 · 실패할 때까지' : repeat.left === 0 ? '반복 중 · 마지막 도전' : `반복 중 · 이후 ${repeat.left}회 더`) : '';

    return <>
    {/* v3.257 던전에 들어가 있으면 머리말을 줄이고 진행 장면을 맨 위로, 자동 진행 카드는 그 아래로. */}
    <Heading eyebrow="DUNGEON" title="세계의 숨겨진 던전" description={activeDungeon ? undefined : "연속 전투와 보스에 도전하세요. 현재 전투·웨이브·전투 로그를 이 화면에서 바로 확인할 수 있습니다."}/>
    {!activeDungeon && <p className="footnote">현재 HP {format(s.hp)} / {format(playerStats.hp)} · MP {format(s.mana)} / {format(playerStats.mana)} · 입장 후 {MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 준비가 끝나면 모두 회복됩니다.</p>}
    {!activeDungeon && <AutoRunStatus s={s}/>}
    {activeDungeon && <section className="panel dungeon-run-panel">
        <div className="dungeon-run-header">
        <div title={activeDungeon.description}><span className="eyebrow">ACTIVE EXPEDITION{repeatStatus && ` · ${repeatStatus}`}</span><h2>{activeDungeon.name}{activeDungeon.id === 'abyss' && <b className="abyss-floor"> {s.dungeon!.depth || s.abyssBest + 1}층</b>}</h2><p>{activeDungeon.id === 'abyss' ? `최고 기록 ${s.abyssBest}층` : null}</p></div>
        <button className="secondary" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>던전 귀환</button>
        </div>
        {/* v3.235 사냥 화면과 같은 장면. v3.247 캐릭터 · 기록 · 전용 HUD까지 사냥 화면과 같습니다. v3.250 아래 내 모험가 · 몬스터 카드와 최근 전투 로그는 장면과 겹쳐 없애고 장면을 키웠습니다. */}
        <section className="battle-scene dungeon-scene"><SceneBackdrop/><div className="scene-shade"/><SceneFoe enemy={s.enemy} hidden={!!s.recovery} effect={combatFx}/><FoeCleave effect={combatFx} enemy={s.enemy}/><SceneFx effect={combatFx} boss={!!s.enemy?.boss} pnl={s.marketPnl || 0}/><SceneCombatHud enemy={s.enemy && !s.recovery ? s.enemy : null} effect={combatFx} combo={fxCombo}/>
            <div className="scene-job-slot"><OtherworldHud s={s} send={send} part="scene"/><AzerothHud s={s}/></div>
            {s.recovery > 0 && <span className="scene-idle recovery">출정 준비</span>}
            <span className="scene-wave">{s.enemy?.boss ? 'BOSS · ' : ''}{activeWave + 1} / {activeDungeon.monsters.length} 전투</span>
            <CastFx effect={combatFx} boss={!!s.enemy?.boss}/><SceneDamage effect={combatFx}/><SkillReceipt effect={combatFx} boss={!!s.enemy?.boss}/><SceneLog logs={s.logs} playerName={s.name}/><SceneMe s={s} stats={playerStats} effect={combatFx}/>
        </section>
        {<div className="dungeon-wave-track">{activeDungeon.monsters.map((id, index) => {
            const isDone = s.dungeon!.wave > index;
            const isCurrent = s.dungeon!.wave === index;
            const isBoss = index === activeDungeon.monsters.length - 1;
            const def = isBoss && activeDungeon.bossMonster ? monsterById(activeDungeon.bossMonster) : monsterById(id);
            return <div className={`dungeon-wave ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isBoss ? 'boss' : ''}`} key={`${id}-${index}`}><MonsterArt id={def?.id || id} boss={isBoss} size={28}/><span>{isBoss ? 'BOSS' : `W${index + 1}`}</span><strong>{def?.name || id}</strong></div>;
        })}</div>}
    </section>}
    {activeDungeon && <AutoRunStatus s={s}/>}
    {/* v3.204 던전 주화 상점은 상점 메뉴의 탭으로 옮겼습니다. 여기는 보유 주화와 바로 가기만. */}
    <section className="panel dungeon-coin-link"><span>던전 주화 <b>{format(s.dungeonCoins || 0)}</b> · 오늘 보너스 정복 {bonusLeft}/{DAILY_BONUS.clears}회 남음</span>{setView && <button className="secondary small" onClick={() => setView('dungeonShop')}>던전 주화 상점</button>}</section>
    <div className="stage-grid dungeon-grid">{[...PLAIN_DUNGEONS].sort((a, b) => a.level - b.level).map((d, i) => {
            const closed = closedIn(s, 'dungeons', d.id), locked = closed || !levelGateOk(s, d.level) || s.rebirths < d.rebirth;
            const mode = modeChoice[d.id] || 'normal', modeDef = DUNGEON_MODES.find(m => m.id === mode)!;
            const research = FIRST_CLEAR_SP[d.id], claimed = !!s.achievementClaims?.[`firstClear:${d.id}`], active = s.dungeon?.id === d.id;
            return <article className={`stage-card dungeon-stage-card ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} key={d.id}>
            <div className="stage-top"><span className="stage-num">{String(i + 1).padStart(2, '0')}</span>{locked ? <Lock size={20}/> : active ? <span className="badge">탐험 중</span> : d.id === 'abyss' ? <span className="badge">최고 {s.abyssBest}층</span> : s.clears[d.id] ? <span className="badge">{s.clears[d.id]}회 정복</span> : <span className="badge muted">미탐험</span>}</div>
            <Swords className="stage-wave" size={40}/>
            <div className="eyebrow">{closed ? CLOSED_NOTE : d.id === 'abyss' ? `다음 도전 ${s.abyssBest + 1}층` : `${d.monsters.length}웨이브 · 보스 ${d.boss?.split('·').pop()?.trim() || ''}`}</div>
            <h2>{d.name}</h2>
            <p>{d.description}</p>
            <div className="dungeon-reward-lines">
                <span><b>최초</b>{d.id === 'abyss' ? `${s.abyssBest + 1}층 세계석 ${abyssPearls(s.abyssBest + 1)} · 10층마다 보너스 세계석(층 수만큼)${nextAbyssMilestone(s.abyssBest) ? ` · ${nextAbyssMilestone(s.abyssBest)}층 SP 1` : ''}` : `세계석 ${d.pearls}${research ? ` · 업적 SP ${research}` : ''}`}{d.id !== 'abyss' && s.clears[d.id] && (!research || claimed) ? ' · 받음' : ''}</span>
                <span><b>정복</b>던전 주화 {format(Math.floor(clearCoinBase(d.id, mode, d.id === 'abyss' ? s.abyssBest + 1 : 1, d.id !== 'abyss' && bonusLeft > 0) * coinMult))}{d.id !== 'abyss' ? ` · 오늘 보너스 ${bonusLeft}/${DAILY_BONUS.clears}회` : ''}</span>
            </div>
            <div className="stage-footer dungeon-actions">
                <span>Lv. {d.level}+{d.rebirth ? ` · 환생 ${d.rebirth}회` : ''}</span>
                {d.id !== 'abyss' && <select aria-label={`${d.name} 난이도`} value={mode} disabled={busy || locked || !!s.dungeon} onChange={e => setModeChoice({ ...modeChoice, [d.id]: e.target.value as DungeonMode })}>{DUNGEON_MODES.map(m => <option key={m.id} value={m.id} title={m.note || undefined}>{m.name}</option>)}</select>}
                {d.id !== 'abyss' && modeDef.note && <small className="dungeon-mode-note">{modeDef.note}</small>}
                <select aria-label={`${d.name} 반복 설정`} value={repeatChoice[d.id] || 'once'} disabled={busy || locked || !!s.dungeon} onChange={e => setRepeatChoice({ ...repeatChoice, [d.id]: e.target.value })}>
                    <option value="once">1회</option>
                    {d.id === 'abyss' ? [5, 10, 25].map(n => <option key={n} value={`deeper:${n}`}>{s.abyssBest + n}층까지</option>) : [5, 10, DAILY_BONUS.clears].map(n => <option key={n} value={String(n)}>{n}회{n === DAILY_BONUS.clears ? ' · 오늘 보너스' : ''}</option>)}
                    <option value="fail">실패까지</option>
                </select>
                <button className="primary small" disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'dungeon', id: d.id, value: `${mode}@${repeatChoice[d.id] || 'once'}` })}>{locked ? <Lock size={14}/> : <Swords size={14}/>}도전</button>
            </div>
            </article>;
        })}</div>
    </>;
}

