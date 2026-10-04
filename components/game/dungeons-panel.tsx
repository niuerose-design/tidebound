'use client';
import { AutoRunStatus } from './auto-run';
import { BOSS_RESEARCH } from '@/game/data/specializations';
import { dungeonClearGold, stats } from '@/game/systems/stats';
import { dungeonTier } from '@/game/systems/meta';
import { useState } from 'react';
import { Anchor, Lock, Swords } from 'lucide-react';
import { FishArt } from './art';
import { BALANCE, MONSTER_TUNING } from '@/game/data/balance';
import { FISH, DUNGEONS , closedIn, CLOSED_NOTE } from '@/game/data/world';
import { SKILLS } from '@/game/data/skills';
import { ENEMY_SKILLS, profile } from '@/game/data/encounters';
import { bookRevealed } from '@/game/systems/book';
import { BOOK_REVEAL } from '@/game/data/book-traits';
import { statDisplay } from '@/game/data/progression';
import { Heading, Meter, format } from './shared';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import { BattleLogLine } from './combat-log';
import { abyssPearls, nextAbyssMilestone, ABYSS_AP_MILESTONES } from '@/game/data/long-term';
import type { PanelProps } from './panel-props';
export function Dungeons({ s, send, busy }: PanelProps) {
    const activeDungeon = s.dungeon ? DUNGEONS.find(d => d.id === s.dungeon?.id) : undefined;
    const playerStats = stats(s);
    const enemyFish = s.enemy ? FISH.find(f => f.id === s.enemy?.id) : undefined;
    const revealed = !!enemyFish && bookRevealed(s, enemyFish.id);
    const enemyProfile = enemyFish && revealed ? profile(enemyFish.id) : undefined;
    const activeWave = s.dungeon?.wave ?? 0;
    const { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name);
    const [repeatChoice, setRepeatChoice] = useState<Record<string, string>>({});
    const repeat = s.dungeon?.repeat;
    const repeatStatus = repeat ? (repeat.until ? `반복 중 · ${repeat.until}층까지` : repeat.left === null ? '반복 중 · 실패할 때까지' : repeat.left === 0 ? '반복 중 · 마지막 도전' : `반복 중 · 이후 ${repeat.left}회 더`) : '';

    return <>
    <Heading eyebrow="DUNGEON" title="바다의 잊힌 장소" description="연속 전투와 보스에 도전하세요. 현재 전투·웨이브·전투 로그를 이 화면에서 바로 확인할 수 있습니다."/>
    {!activeDungeon && <p className="footnote">현재 HP {format(s.hp)} / {format(playerStats.hp)} · MP {format(s.mana)} / {format(playerStats.mana)} · 입장 후 {MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 준비가 끝나면 모두 회복됩니다.</p>}
    <AutoRunStatus s={s}/>
    {activeDungeon && <section className="panel dungeon-run-panel">
        <div className="dungeon-run-header">
        <div><span className="eyebrow">ACTIVE EXPEDITION{repeatStatus && ` · ${repeatStatus}`}</span><h2>{activeDungeon.name}{activeDungeon.id === 'abyss' && <b className="abyss-floor"> {s.dungeon!.depth || s.abyssBest + 1}층</b>}</h2><p>{activeDungeon.description}{activeDungeon.id === 'abyss' ? ` · 최고 기록 ${s.abyssBest}층` : ''}</p></div>
        <button className="secondary" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>던전 귀환</button>
        </div>
        <div className="dungeon-wave-track">{activeDungeon.fish.map((id, index) => {
            const isDone = s.dungeon!.wave > index;
            const isCurrent = s.dungeon!.wave === index;
            const isBoss = index === activeDungeon.fish.length - 1;
            const fish = isBoss && activeDungeon.bossFish ? FISH.find(f => f.id === activeDungeon.bossFish) : FISH.find(f => f.id === id);
            return <div className={`dungeon-wave ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isBoss ? 'boss' : ''}`} key={`${id}-${index}`}><FishArt id={fish?.id || id} boss={isBoss} size={28}/><span>{isBoss ? 'BOSS' : `W${index + 1}`}</span><strong>{fish?.name || id}</strong></div>;
        })}</div>
        <div className="dungeon-combat-grid dungeon-combat-fx-host">
        <CombatFxOverlay effect={combatFx} combo={fxCombo}/>
        <div className="dungeon-combatant player-combatant"><span className="eyebrow">내 낚시꾼</span><div className="combatant-name"><h3>{s.name}</h3><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label="HP" color="teal"/><PlayerHitEffect effect={combatFx}/></div><Meter value={s.mana} max={playerStats.mana} label="MP" color="blue"/><small>속도 {playerStats.speed} · 명중 수치 {statDisplay('accuracy', playerStats.accuracy || 0)} · 회피 수치 {statDisplay('evasion', playerStats.evasion || 0)}</small></div>
        <div className="dungeon-vs">VS<span>{activeWave + 1}/{activeDungeon.fish.length}</span></div>
        <div className="dungeon-combatant enemy-combatant"><span className="eyebrow">{s.enemy?.boss ? 'BOSS ENCOUNTER' : 'CURRENT CATCH'}</span><div className="combatant-name"><h3>{s.enemy?.name || (s.recovery > 0 ? `출정 준비 · ${Math.ceil(s.recovery * BALANCE.turnMs / 1000)}초 남음` : '다음 입질을 기다리는 중')}</h3>{s.enemy && <StatusBadges effects={s.enemy.effects} stun={s.enemy.stun} recent={combatFx} target="enemy"/>}</div>{s.enemy ? <><div className="player-hp-anchor"><Meter value={s.enemy.hp} max={s.enemy.maxHp} label="HP" color="rose"/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemyProfile?.name || '미확인 개체'} · 속도 {s.enemy.combatStats?.speed || '-'}{revealed ? ` · 공격 스킬 ${s.enemy.skills?.map(id => [...ENEMY_SKILLS, ...SKILLS].find(sk => sk.id === id)?.name || id).join(', ') || '기본 공격'}` : ` · 도감 ${BOOK_REVEAL}회 포획 시 성향·스킬 공개`}</small>{enemyProfile?.hint && <p className="dungeon-hint">{enemyProfile.hint}</p>}</> : <p className="dungeon-hint">{s.recovery > 0 ? '준비가 끝나면 체력·마나가 모두 회복되고 탐험이 시작됩니다.' : '자동 낚시가 다음 웨이브를 준비하고 있습니다.'}</p>}</div>
        </div>
        <div className="dungeon-combat-log"><div className="section-title"><h3>최근 전투 로그</h3><span>자동 갱신</span></div>{s.logs.filter(log => log.type === 'battle').slice(-6).reverse().map(log => <BattleLogLine key={log.id} log={log} playerName={s.name}/>)}</div>
    </section>}
    <div className="stage-grid dungeon-grid">{[...DUNGEONS].sort((a, b) => a.level - b.level).map((d, i) => {
            const closed = closedIn(s, 'dungeons', d.id), locked = closed || s.level < d.level || s.rebirths < d.rebirth;
            const tier = dungeonTier(d.id, s.abyssBest + 1);
            const research = BOSS_RESEARCH[d.id], claimed = !!s.bossResearchClaims?.[d.id], active = s.dungeon?.id === d.id;
            return <article className={`stage-card dungeon-stage-card ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} key={d.id}>
            <div className="stage-top"><span className="stage-num">{String(i + 1).padStart(2, '0')}</span>{locked ? <Lock size={20}/> : active ? <span className="badge">탐험 중</span> : d.id === 'abyss' ? <span className="badge">최고 {s.abyssBest}층</span> : s.clears[d.id] ? <span className="badge">{s.clears[d.id]}회 정복</span> : <span className="badge muted">미탐험</span>}</div>
            <Anchor className="stage-wave" size={40}/>
            <div className="eyebrow">{closed ? CLOSED_NOTE : d.id === 'abyss' ? `다음 도전 ${s.abyssBest + 1}층` : `${d.fish.length}웨이브 · 보스 ${d.boss?.split('·').pop()?.trim() || ''}`}</div>
            <h2>{d.name}</h2>
            <p>{d.description}</p>
            <div className="dungeon-reward-lines">
                <span><b>최초</b>{d.id === 'abyss' ? `${s.abyssBest + 1}층 진주 ${abyssPearls(s.abyssBest + 1)} · 10층마다 보너스 진주(층 수만큼)${nextAbyssMilestone(s.abyssBest) ? ` · ${nextAbyssMilestone(s.abyssBest)}층 SP 1` : ''}${ABYSS_AP_MILESTONES.find(n => n > s.abyssBest) ? ` · ${ABYSS_AP_MILESTONES.find(n => n > s.abyssBest)}층 AP 1` : ''}` : `진주 ${d.pearls}${research ? ` · 연구 SP ${research.sp}` : ''}`}{d.id !== 'abyss' && s.clears[d.id] && (!research || claimed) ? ' · 받음' : ''}</span>
                <span><b>반복</b>{format(dungeonClearGold(s, d.gold, tier))} G · 희귀 이상 장비{d.id === 'abyss' ? ' · 5층마다 확정 드롭에 무릉도장 전용 옵션' : ''}</span>
            </div>
            {research && s.clears[d.id] && !claimed && <button className="gold-button" disabled={busy} onClick={() => send({ type: 'bossResearch', id: d.id })}>첫 정복 연구 받기 · SP {research.sp}</button>}
            <div className="stage-footer dungeon-actions">
                <span>Lv. {d.level}+{d.rebirth ? ` · 환생 ${d.rebirth}회` : ''}</span>
                <select aria-label={`${d.name} 반복 설정`} value={repeatChoice[d.id] || 'once'} disabled={busy || locked || !!s.dungeon} onChange={e => setRepeatChoice({ ...repeatChoice, [d.id]: e.target.value })}>
                    <option value="once">1회</option>
                    {d.id === 'abyss' ? [5, 10, 25].map(n => <option key={n} value={`deeper:${n}`}>{s.abyssBest + n}층까지</option>) : [5, 10, 25].map(n => <option key={n} value={String(n)}>{n}회</option>)}
                    <option value="fail">실패까지</option>
                </select>
                <button className="primary small" disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'dungeon', id: d.id, value: repeatChoice[d.id] || 'once' })}>{locked ? <Lock size={14}/> : <Swords size={14}/>}도전</button>
            </div>
            </article>;
        })}</div>
    </>;
}
