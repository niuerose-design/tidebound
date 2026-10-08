'use client';
import { AutoRunStatus } from './auto-run';
import { FIRST_CLEAR_SP } from '@/game/data/achievements';
import { dungeonClearGold, stats } from '@/game/systems/stats';
import { dungeonTier, dungeonClearBase, dungeonRewardTier, levelGateOk, dungeonLevelAt, tierHealth, tierAttack, tierReward, tierExp } from '@/game/systems/meta';
import { useState } from 'react';
import { Lock, Swords, Gem, Skull } from 'lucide-react';
import { MonsterArt } from './art';
import { BALANCE, MONSTER_TUNING, dungeonOverlevel, DUNGEON_MODES, type DungeonMode } from '@/game/data/balance';
import { MONSTERS, DUNGEONS, PLAIN_DUNGEONS , closedIn, CLOSED_NOTE } from '@/game/data/world';
import { SKILLS } from '@/game/data/skills';
import { ENEMY_SKILLS, profile } from '@/game/data/encounters';
import { bookRevealed } from '@/game/systems/book';
import { BOOK_REVEAL } from '@/game/data/book-traits';
import { statDisplay } from '@/game/data/progression';
import { Heading, Meter, format, useNow } from './shared';
import { useSkillFx } from './skill-fx-setting';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import { BattleLogLine } from './combat-log';
import { abyssPearls, nextAbyssMilestone } from '@/game/data/long-term';
import type { PanelProps } from './panel-props';
import { RANDOM_GAME, randomGameTier, waveStake, stakeUpTo } from '@/game/data/random-game';
import { randomGameRank, randomGamePayout, randomGameRunsLeft, stakePayout } from '@/game/systems/random-game';
export function Dungeons({ s, send, busy }: PanelProps) {
    const activeDungeon = s.dungeon ? DUNGEONS.find(d => d.id === s.dungeon?.id) : undefined;
    const playerStats = stats(s);
    const enemyMonster = s.enemy ? MONSTERS.find(f => f.id === s.enemy?.id) : undefined;
    const revealed = !!enemyMonster && bookRevealed(s, enemyMonster.id);
    const enemyProfile = enemyMonster && revealed ? profile(enemyMonster.id) : undefined;
    const activeWave = s.dungeon?.wave ?? 0;
    const randomRun = activeDungeon?.id === RANDOM_GAME.id;
    const skillFx = useSkillFx(), { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name, skillFx);
    const [repeatChoice, setRepeatChoice] = useState<Record<string, string>>({});
    // v27.70 던전 난이도(노말·헬·나이트메어)는 던전마다 고릅니다. 입장 값은 '<난이도>@<반복>'.
    const [modeChoice, setModeChoice] = useState<Record<string, DungeonMode>>({});
    const repeat = s.dungeon?.repeat;
    const repeatStatus = repeat ? (repeat.until ? `반복 중 · ${repeat.until}층까지` : repeat.left === null ? '반복 중 · 실패할 때까지' : repeat.left === 0 ? '반복 중 · 마지막 도전' : `반복 중 · 이후 ${repeat.left}회 더`) : '';

    return <>
    <Heading eyebrow="DUNGEON" title="세계의 숨겨진 던전" description="연속 전투와 보스에 도전하세요. 현재 전투·웨이브·전투 로그를 이 화면에서 바로 확인할 수 있습니다."/>
    {!activeDungeon && <p className="footnote">현재 HP {format(s.hp)} / {format(playerStats.hp)} · MP {format(s.mana)} / {format(playerStats.mana)} · 입장 후 {MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 준비가 끝나면 모두 회복됩니다.</p>}
    <AutoRunStatus s={s}/>
    {activeDungeon && <section className="panel dungeon-run-panel">
        <div className="dungeon-run-header">
        <div><span className="eyebrow">ACTIVE EXPEDITION{repeatStatus && ` · ${repeatStatus}`}</span><h2>{activeDungeon.name}{activeDungeon.id === 'abyss' && <b className="abyss-floor"> {s.dungeon!.depth || s.abyssBest + 1}층</b>}{randomRun && <b className="abyss-floor"> {activeWave + 1}웨이브</b>}</h2><p>{activeDungeon.description}{activeDungeon.id === 'abyss' ? ` · 최고 기록 ${s.abyssBest}층` : ''}</p></div>
        {randomRun ? <button className="gold-button" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>받고 나가기 · 정수 {stakePayout(s)}</button> : <button className="secondary" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>던전 귀환</button>}
        </div>
        {randomRun ? <p className="random-game-stake">판돈 · 정수 {stakePayout(s)} (×{randomGamePayout(s)}) · 다음 웨이브 돌파 시 정수 +{Math.floor(waveStake(activeWave + 1) * randomGamePayout(s))} · 난이도 {randomGameTier(activeWave)}{s.dungeon?.until ? ` · 목표 ${s.dungeon.until}웨이브에서 자동으로 받고 나감` : ' · 목표 없음'} · 쓰러지면 판돈 소멸</p> : <div className="dungeon-wave-track">{activeDungeon.monsters.map((id, index) => {
            const isDone = s.dungeon!.wave > index;
            const isCurrent = s.dungeon!.wave === index;
            const isBoss = index === activeDungeon.monsters.length - 1;
            const monster = isBoss && activeDungeon.bossMonster ? MONSTERS.find(f => f.id === activeDungeon.bossMonster) : MONSTERS.find(f => f.id === id);
            return <div className={`dungeon-wave ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isBoss ? 'boss' : ''}`} key={`${id}-${index}`}><MonsterArt id={monster?.id || id} boss={isBoss} size={28}/><span>{isBoss ? 'BOSS' : `W${index + 1}`}</span><strong>{monster?.name || id}</strong></div>;
        })}</div>}
        <div className="dungeon-combat-grid dungeon-combat-fx-host">
        <CombatFxOverlay effect={combatFx} combo={fxCombo}/>
        <div className="dungeon-combatant player-combatant"><span className="eyebrow">내 모험가</span><div className="combatant-name"><h3>{s.name}</h3><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label="HP" color="teal"/><PlayerHitEffect effect={combatFx}/></div><Meter value={s.mana} max={playerStats.mana} label="MP" color="blue"/><small>속도 {playerStats.speed} · 명중 수치 {statDisplay('accuracy', playerStats.accuracy || 0)} · 회피 수치 {statDisplay('evasion', playerStats.evasion || 0)}</small></div>
        <div className="dungeon-vs">VS<span>{randomRun ? `${activeWave + 1}웨이브` : `${activeWave + 1}/${activeDungeon.monsters.length}`}</span></div>
        <div className="dungeon-combatant enemy-combatant"><span className="eyebrow">{s.enemy?.boss ? 'BOSS ENCOUNTER' : 'CURRENT TARGET'}</span><div className="combatant-name"><h3>{s.enemy?.name || (s.recovery > 0 ? `출정 준비 · ${Math.ceil(s.recovery * BALANCE.turnMs / 1000)}초 남음` : '다음 몬스터를 기다리는 중')}</h3>{s.enemy && <StatusBadges effects={s.enemy.effects} stun={s.enemy.stun} recent={combatFx} target="enemy"/>}</div>{s.enemy ? <><div className="player-hp-anchor"><Meter value={s.enemy.hp} max={s.enemy.maxHp} label="HP" color="rose"/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemyProfile?.name || '미확인 개체'} · 속도 {s.enemy.combatStats?.speed || '-'}{revealed ? ` · 공격 스킬 ${s.enemy.skills?.map(id => [...ENEMY_SKILLS, ...SKILLS].find(sk => sk.id === id)?.name || id).join(', ') || '기본 공격'}` : ` · 도감 ${BOOK_REVEAL}회 처치 시 성향·스킬 공개`}</small>{enemyProfile?.hint && <p className="dungeon-hint">{enemyProfile.hint}</p>}</> : <p className="dungeon-hint">{s.recovery > 0 ? '준비가 끝나면 체력·마나가 모두 회복되고 탐험이 시작됩니다.' : '자동 사냥이 다음 웨이브를 준비하고 있습니다.'}</p>}</div>
        </div>
        <div className="dungeon-combat-log"><div className="section-title"><h3>최근 전투 로그</h3><span>자동 갱신</span></div>{s.logs.filter(log => log.type === 'battle').slice(-6).reverse().map(log => <BattleLogLine key={log.id} log={log} playerName={s.name}/>)}</div>
    </section>}
    {!activeDungeon && <RandomGameCard s={s} send={send} busy={busy}/>}
    <div className="stage-grid dungeon-grid">{[...PLAIN_DUNGEONS].sort((a, b) => a.level - b.level).map((d, i) => {
            const closed = closedIn(s, 'dungeons', d.id), locked = closed || !levelGateOk(s, d.level) || s.rebirths < d.rebirth;
            const mode = modeChoice[d.id] || 'normal', modeDef = DUNGEON_MODES.find(m => m.id === mode)!, tier = dungeonTier(d.id, s.abyssBest + 1, mode), dLevel = dungeonLevelAt(d, tier, s.level);
            const research = FIRST_CLEAR_SP[d.id], claimed = !!s.achievementClaims?.[`firstClear:${d.id}`], active = s.dungeon?.id === d.id, overlevel = dungeonOverlevel(s.level, dLevel);
            return <article className={`stage-card dungeon-stage-card ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} key={d.id}>
            <div className="stage-top"><span className="stage-num">{String(i + 1).padStart(2, '0')}</span>{locked ? <Lock size={20}/> : active ? <span className="badge">탐험 중</span> : d.id === 'abyss' ? <span className="badge">최고 {s.abyssBest}층</span> : s.clears[d.id] ? <span className="badge">{s.clears[d.id]}회 정복</span> : <span className="badge muted">미탐험</span>}</div>
            <Swords className="stage-wave" size={40}/>
            <div className="eyebrow">{closed ? CLOSED_NOTE : d.id === 'abyss' ? `다음 도전 ${s.abyssBest + 1}층` : `${d.monsters.length}웨이브 · 보스 ${d.boss?.split('·').pop()?.trim() || ''}`}</div>
            <h2>{d.name}</h2>
            <p>{d.description}</p>
            <div className="dungeon-reward-lines">
                <span><b>최초</b>{d.id === 'abyss' ? `${s.abyssBest + 1}층 세계석 ${abyssPearls(s.abyssBest + 1)} · 10층마다 보너스 세계석(층 수만큼)${nextAbyssMilestone(s.abyssBest) ? ` · ${nextAbyssMilestone(s.abyssBest)}층 SP 1` : ''}` : `세계석 ${d.pearls}${research ? ` · 업적 SP ${research}` : ''}`}{d.id !== 'abyss' && s.clears[d.id] && (!research || claimed) ? ' · 받음' : ''}</span>
                <span><b>반복</b>{format(Math.floor(dungeonClearGold(s, dungeonClearBase({ level: dLevel }), dungeonRewardTier(tier, d.id)) * overlevel))} G{d.id !== 'abyss' && mode !== 'normal' ? ` · ${modeDef.name}: 몬스터 Lv.${dLevel} · 체력 ×${tierHealth(tier).toFixed(2)} · 공격 ×${tierAttack(tier).toFixed(2)} · 골드 ×${tierReward(tier).toFixed(1)} · 경험치 ×${tierExp(tier).toFixed(2)}` : ''} · 낮은 확률로 희귀 이상 장비{d.id === 'abyss' ? ' · 5층마다 확정 드롭' : ''}</span>
                {overlevel < 1 && <span><b>레벨 초과</b>권장 레벨보다 높아 클리어 골드·반복 장비 확률 ×{overlevel.toFixed(1)}</span>}
            </div>
            <div className="stage-footer dungeon-actions">
                <span>Lv. {d.level}+{d.rebirth ? ` · 환생 ${d.rebirth}회` : ''}</span>
                {d.id !== 'abyss' && <select aria-label={`${d.name} 난이도`} value={mode} disabled={busy || locked || !!s.dungeon} onChange={e => setModeChoice({ ...modeChoice, [d.id]: e.target.value as DungeonMode })}>{DUNGEON_MODES.map(m => <option key={m.id} value={m.id} title={m.note || undefined}>{m.name}</option>)}</select>}
                {d.id !== 'abyss' && modeDef.note && <small className="dungeon-mode-note">{modeDef.note}</small>}
                <select aria-label={`${d.name} 반복 설정`} value={repeatChoice[d.id] || 'once'} disabled={busy || locked || !!s.dungeon} onChange={e => setRepeatChoice({ ...repeatChoice, [d.id]: e.target.value })}>
                    <option value="once">1회</option>
                    {d.id === 'abyss' ? [5, 10, 25].map(n => <option key={n} value={`deeper:${n}`}>{s.abyssBest + n}층까지</option>) : [5, 10, 25].map(n => <option key={n} value={String(n)}>{n}회</option>)}
                    <option value="fail">실패까지</option>
                </select>
                <button className="primary small" disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'dungeon', id: d.id, value: `${mode}@${repeatChoice[d.id] || 'once'}` })}>{locked ? <Lock size={14}/> : <Swords size={14}/>}도전</button>
            </div>
            </article>;
        })}</div>
    </>;
}

/** v27.86 랜덤게임 입장 카드. v27.91 두 칸 구성: 왼쪽 규칙 세 줄, 오른쪽 목표 웨이브 칩(받는 판돈 표시)과 시작 버튼. 판돈 표는 목표까지 모두 깼을 때 받는 양(연구 배율 포함). */
function RandomGameCard({ s, send, busy }: PanelProps) {
    const [target, setTarget] = useState<number>(10), now = useNow(60_000);
    const rank = randomGameRank(s), left = randomGameRunsLeft(s, now), m = randomGamePayout(s);
    if (s.rebirths < 5 && !rank) return null;
    const payout = (n: number) => `정수 ${Math.floor(stakeUpTo(n) * m)}`;
    return <section className={`panel random-game ${rank ? '' : 'locked'}`}>
        <div className="random-game-head">
            <div><span className="eyebrow">RANDOM GAME · 던전</span><h2>랜덤게임</h2></div>
            <div className="random-game-chips">{rank ? <><span className={left ? 'chip on' : 'chip'} title="하루(한국 시간 자정)가 지나거나 환생하면 다시 채워집니다">오늘 남은 입장 {left} / {rank}</span><span className="chip gold">판돈 ×{m}</span></> : <span className="chip">세계석 연구 ‘랜덤게임’에서 해금 · 환생 5회</span>}</div>
        </div>
        <div className="random-game-body">
            <ul className="random-game-rules">
                <li><Swords size={14}/><span>해금한 사냥터의 몬스터가 웨이브마다 무작위로 나옵니다. 웨이브마다 난이도 +{RANDOM_GAME.tierPerWave}, {RANDOM_GAME.bossEvery}웨이브마다 보스.</span></li>
                <li><Gem size={14}/><span>처치 경험치·골드·장비는 없습니다. 웨이브를 깰 때마다 판돈(정수 {RANDOM_GAME.essencePerWave} × 웨이브)이 쌓입니다.</span></li>
                <li><Skull size={14}/><span>목표 웨이브에 닿거나 ‘받고 나가기’를 누르면 받습니다. <b>쓰러지면 판돈을 모두 잃습니다.</b></span></li>
            </ul>
            {rank > 0 && <div className="random-game-pick">
                <div className="random-game-pick-title">목표 웨이브 <small>칩의 숫자는 목표까지 모두 깼을 때 받는 정수</small></div>
                <div className="random-game-targets" role="radiogroup" aria-label="목표 웨이브">{RANDOM_GAME.targets.map(n => <button key={n} type="button" role="radio" aria-checked={target === n} className={`random-game-target ${target === n ? 'on' : ''}`} disabled={busy} onClick={() => setTarget(n)}><b>{n ? `${n}` : '∞'}</b><small>{n ? payout(n) : '목표 없음'}</small></button>)}</div>
                <div className="random-game-go">
                    <span>{target ? `${target}웨이브까지 모두 깨면 ${payout(target)}` : '받고 나가기를 누르거나 쓰러질 때까지 계속합니다.'}</span>
                    <button className="gold-button" disabled={busy || !left || !!s.dungeon} onClick={() => send({ type: 'dungeon', id: RANDOM_GAME.id, value: `until:${target}` })}>{left ? '랜덤게임 시작' : '오늘 입장 횟수를 모두 썼습니다 · 내일 또는 환생 뒤 다시'}</button>
                </div>
            </div>}
        </div>
    </section>;
}
