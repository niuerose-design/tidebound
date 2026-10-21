'use client';
/**
 * v3.390 장면 + 조작 줄. 장면 안의 배경 · 몬스터 · 내 캐릭터 · 연출 · 전투 기록(scene-stage · combat-fx)은 연출 CSS(battle.css .battle-scene …)에 붙어 있어 클래스 이름을 그대로 쓰고,
 * 장면 높이는 여기서 정합니다(폰 420 · 태블릿 320 · 데스크톱 420~560, 화면 배율 반영). 스킬 연출 상태는 여기에만 있어 타격 연출이 바뀔 때 이 안만 다시 그립니다.
 */
import type { State, Action, CombatStats } from '@/game/types';
import { stageById, dungeonById, swarmHpMultiplier, swarmAttackMultiplier } from '@/game/data/world';
import { variantById } from '@/game/data/variants';
import { BALANCE } from '@/game/data/balance';
import { statDisplay, percent } from '@/game/data/progression';
import { hitChance, normalizeStats } from '@/game/systems/stats';
import { profile } from '@/game/data/encounters';
import { bookRevealed } from '@/game/systems/book';
import { BOOK_REVEAL } from '@/game/data/book-traits';
import { isSpecialId } from '@/game/data/king';
import { SceneBackdrop, backdropTheme } from '@/components/game/art';
import { useSkillFx } from '@/components/game/skill-fx-setting';
import { SceneFx, FoeCleave, SceneCombatHud, useCombatFx } from '@/components/game/combat-fx';
import { SceneFoe, SceneMe, SceneLog, AzerothHud, SkillReceipt, CastFx, SceneDamage, SceneLoot, BossIntro, LevelUpFx } from '@/components/game/scene-stage';
import { OtherworldHud } from '@/components/game/otherworld-hud';
import { cn } from '@/lib/utils';
import { KkamiArrival, KkamiKill } from './kkami';
import { Dock } from './dock';

export function Arena({ s, playerStats, busy, send, setView }: { s: State; playerStats: CombatStats; busy: boolean; send: (a: Action) => void; setView: (v: string) => void }) {
    const st = stageById(s.stage)!, d = dungeonById(s.dungeon?.id);
    const enemy = s.enemy;
    const enemyStats = enemy ? normalizeStats(enemy.combatStats || { hp: enemy.maxHp, attack: enemy.attack, defense: enemy.defense, crit: 0 }) : null;
    const skillFx = useSkillFx(), { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name, skillFx);
    // 회복 대기(필드 패배 후)·출정 준비(던전 입장 후) 남은 시간.
    const recoverySeconds = Math.ceil(s.recovery * BALANCE.turnMs / 1000);
    const recoveryText = s.recovery > 0 ? d ? `출정 준비 · ${recoverySeconds}초 남음` : `회복 대기 · ${recoverySeconds}초 남음` : null;
    const shown = enemy && !s.recovery ? enemy : null;
    const idle = recoveryText ?? (shown ? null : s.running ? '다음 몬스터를 기다리는 중' : '자동 사냥이 멈춰 있습니다');
    return <div className="grid gap-3">
        {/* v3.259 내 HP가 30% 아래면 장면 가장자리가 붉게 맥박칩니다(danger). */}
        <section className={cn('battle-scene mb-0! h-[420px]! md:h-[320px]! xl:h-[clamp(420px,calc(100vh/var(--ui-scale,1)-400px),560px)]!', s.running && 'running', !s.recovery && s.hp < playerStats.hp * .3 && 'danger')}><SceneBackdrop theme={backdropTheme(d ? d.name : st.region, st.name)}/><div className="scene-shade"/>
            <SceneFoe enemy={enemy} hidden={!!s.recovery} effect={combatFx} kkami={!!enemy && isSpecialId(enemy.id)}/>
            <KkamiArrival s={s}/><KkamiKill s={s}/><FoeCleave effect={combatFx} enemy={enemy}/><SceneFx effect={combatFx} boss={!!enemy?.boss} pnl={s.marketPnl || 0}/>
            <SceneCombatHud enemy={shown} effect={combatFx} combo={fxCombo} info={shown && <>
                <strong>{shown.name}{shown.swarm ? ` · 무리 ×${shown.swarm}` : ''}</strong>
                <span>{bookRevealed(s, shown.id) ? profile(shown.id).name : '미확인 개체'} · 속도 {enemyStats?.speed || 0}{!s.dungeon && s.tide ? ` · 사냥터 난이도 ${s.tide} 적용` : ''}</span>
                {shown.variant && shown.variant !== 'swarm' && <span>{variantById(shown.variant)?.mark} {variantById(shown.variant)?.name} · {variantById(shown.variant)?.desc}</span>}
                {shown.swarm ? <span>무리 체력 ×{swarmHpMultiplier(shown.swarm)}{swarmAttackMultiplier(shown.swarm) > 1 ? ` · 공격 ×${swarmAttackMultiplier(shown.swarm)}` : ''}</span> : null}
                <small>{bookRevealed(s, shown.id) ? profile(shown.id).hint : `도감 ${BOOK_REVEAL}회 처치 시 성향·대응법 공개 (${Math.min(s.book[shown.id] || 0, BOOK_REVEAL)} / ${BOOK_REVEAL})`}</small>
                {enemyStats && <small title={`명중 수치 ${statDisplay('accuracy', playerStats.accuracy || 0)} · 회피 수치 ${statDisplay('evasion', playerStats.evasion || 0)}`}>내 속도 {playerStats.speed} · 명중률 {percent(hitChance(playerStats, enemyStats), 0)} · 회피율 {percent(1 - hitChance(enemyStats, playerStats), 0)} (상대 회피 · 명중과 속도 차이로 정해짐)</small>}
            </>}/>
            <div className="scene-job-slot"><OtherworldHud s={s} send={send} part="scene"/><AzerothHud s={s}/></div>
            {idle && <span className={cn('scene-idle', recoveryText && 'recovery')} aria-live="polite">{idle}</span>}
            {/* v3.258 회복 대기 · 출정 준비 중(몬스터 없음)에는 지난 타격의 숫자 · 스킬 이름 · 투사체를 지웁니다. */}
            {!s.recovery && <><CastFx effect={combatFx} boss={!!enemy?.boss}/><SceneDamage effect={combatFx}/><SkillReceipt effect={combatFx} boss={!!enemy?.boss}/></>}
            <SceneLoot logs={s.logs}/><BossIntro enemy={shown}/><LevelUpFx level={s.level}/>
            <SceneLog logs={s.logs} playerName={s.name}/>
            <SceneMe s={s} stats={playerStats} effect={combatFx}/>
        </section>
        <Dock s={s} busy={busy} send={send} setView={setView} effect={combatFx}/>
    </div>;
}
