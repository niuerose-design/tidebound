/** 턴 진행(온라인 tick·오프라인 advance). */
import { syncGoals, syncAchievements } from './progress';
import { syncVoyage } from './guidance';
import { syncGoal } from './goals';
import { stats } from './stats';
import type { State } from '../types';
import { BALANCE, SKILL_FORMULA } from '../data/balance';
import { TIME_MACHINE_MASTERY } from '../data/expansion-v25';
import { DUNGEONS } from '../data/world';
import { actTurn, fighterSpeed, Fighter, type CombatEvent } from './combat';
import { PROGRESSION } from '../data/progression';
import { offlineCapSeconds, researchRank } from '../data/economy';
import { canUse, skillMasteryRanks } from './progression';
import { addLog, endRun } from './state';
import { spawn, reward, drop } from './encounter';
import { profile } from '../data/encounters';
import { bookEcology } from './book';
import { breathReset } from './actions/lifecycle';
export function tick(s: State, rng = Math.random) {
    if (!s.running)
        return;
    syncStatRate(s);
    syncGoals(s, s.lastTick);
    tickTurn(s, rng);
    syncVoyage(s, text => addLog(s, text, 'reward'));
    syncAchievements(s, text => addLog(s, text, 'reward'));
    syncGoal(s, text => addLog(s, text, 'reward'));
}
/** 레벨당 능력치 포인트가 오른 뒤(4 → 5), 이전 세이브에 지난 레벨만큼 차액을 한 번 지급합니다. */
export function syncStatRate(s: State) {
    const rate = s.statRate ?? 4;
    if (rate >= PROGRESSION.statPerLevel) return;
    const bonus = (s.level - 1) * (PROGRESSION.statPerLevel - rate);
    s.statPoints += bonus;
    s.statRate = PROGRESSION.statPerLevel;
    if (bonus > 0) addLog(s, `레벨당 능력치 포인트가 ${PROGRESSION.statPerLevel}로 올라 지난 레벨분 +${bonus}포인트를 받았습니다.`, 'reward');
}
export function tickTurn(s: State, rng: () => number) {
    s.turn++;
    s.playMs = (s.playMs || 0) + BALANCE.turnMs;
    const a = stats(s);
    if (s.recovery > 0) {
        s.recovery--;
        if (!s.recovery) {
            s.hp = a.hp;
            s.mana = a.mana;
            addLog(s, '숨을 고르고 다시 낚싯대를 들었습니다.');
        }
        return;
    }
    if (!s.enemy)
        spawn(s, rng);
    const e = s.enemy!;
    const ecology = bookEcology(s, e.id);
    const player: Fighter = { name: s.name, job: s.job, stats: a, hp: s.hp, skills: s.skills.filter(id => canUse(s, id)), cooldowns: s.cooldowns, stun: s.playerStun, mana: s.mana, effects: s.effects, ranks: s.learned, mastery: skillMasteryRanks(s), specializations: s.skillSpecializations, practice: s.skillPractice, gold: s.gold, ...(ecology.stages ? { damageDealt: ecology.dealt, damageTaken: ecology.taken } : {}) };
    const enemy: Fighter = { name: e.name, stats: e.combatStats || { hp: e.maxHp, attack: e.attack, defense: e.defense, crit: 0 }, hp: e.hp, skills: e.skills || [], cooldowns: e.cooldowns || {}, stun: e.stun, mana: e.mana, effects: e.effects || {}, prey: e.boss || SKILL_FORMULA.designatedSpecies.includes(e.id), ...(profile(e.id).magicBasic ? { magicBasic: true } : {}), ...(e.swarm ? { swarm: e.swarm } : {}) };
    const first = fighterSpeed(player) >= fighterSpeed(enemy) ? player : enemy, second = first === player ? enemy : player;
    // 빠른 쪽이 먼저 행동(연속 행동 포함)하고, 둘 다 살아 있으면 느린 쪽도 같은 방식으로 행동합니다.
    // v25 타임머신: 쓸 때마다 현재 직업 숙련이 오릅니다.
    const log = (text: string, event: CombatEvent) => { addLog(s, text, 'battle', event); if (event?.restored && event.actor === s.name) s.jobMastery[s.job] = (s.jobMastery[s.job] || 0) + TIME_MACHINE_MASTERY; };
    actTurn(first, second, rng, log);
    if (first.hp > 0 && second.hp > 0)
        actTurn(second, first, rng, log);
    s.hp = player.hp;
    s.mana = player.mana ?? a.mana;
    s.gold = Math.max(0, player.gold ?? s.gold);
    s.playerStun = player.stun;
    s.effects = player.effects || {};
    e.hp = enemy.hp;
    e.stun = enemy.stun;
    e.mana = enemy.mana;
    e.effects = enemy.effects;
    e.cooldowns = enemy.cooldowns;
    if (e.hp <= 0 && s.hp > 0)
        reward(s, rng);
    else if (s.hp <= 0) {
        s.deaths++;
        // 한 번의 숨: 쓰러지면 즉시 이번 생을 처음부터 다시 시작합니다(오프라인 정산 중에도 같은 규칙).
        if (s.vows?.breath) { breathReset(s, s.lastTick); return; }
        s.recovery = BALANCE.recoveryTurns;
        s.enemy = null;
        s.cooldowns = {};
        s.effects = {};
        s.playerStun = 0;
        addLog(s, '물고기를 놓쳤습니다. 잠시 회복합니다.');
        if (s.dungeon) {
            const repeating = !!s.dungeon.repeat;
            endRun(s, `${DUNGEONS.find(x => x.id === s.dungeon!.id)?.name || '던전'} 도전 실패${repeating ? ' · 반복 중단 → 자동 낚시로 전환' : ' · 멈춤'}`);
            s.dungeon = null;
            s.running = repeating;
            addLog(s, repeating ? '던전 도전에 실패했습니다. 반복 도전을 멈추고 낚시터에서 자동 낚시를 이어갑니다.' : '던전 도전에 실패했습니다. 손실 없이 다시 도전할 수 있습니다.');
        }
    }
}
export function advance(s: State, now: number, rng = Math.random) {
    now = Math.max(now, s.lastTick);
    const elapsed = now - s.lastTick;
    // 정산 상한은 정산을 시작할 때의 긴 닻줄 단계로 정합니다(정산 중 연구가 바뀌지 않음).
    const cap = offlineCapSeconds(s);
    const count = Math.min(Math.floor(elapsed / BALANCE.turnMs), cap * 1000 / BALANCE.turnMs);
    const before = { kills: s.kills, gold: s.gold, exp: s.exp };
    for (let i = 0; i < count; i++)
        tick(s, rng);
    s.lastTick = elapsed > cap * 1000 ? now : now - (elapsed % BALANCE.turnMs);
    if (elapsed > 60000 && s.kills > before.kills) {
        s.lastOffline = { seconds: Math.min(cap, Math.floor(elapsed / 1000)), kills: s.kills - before.kills, gold: s.gold - before.gold, exp: Math.max(0, s.exp - before.exp) };
        const bottles = messageBottles(s, Math.floor(count * BALANCE.turnMs / 3_600_000), rng);
        if (bottles) s.lastOffline.bottles = bottles;
    }
}
/** 편지병 골드: 레벨 × 500. */
export const bottleGold = (level: number) => level * 500;
/**
 * 병 속의 편지: 오프라인 정산의 온전한 1시간마다 4%p/단계 확률로 편지병을 줍습니다.
 * 내용은 골드 70% · 장비 25% · 진주 1개 5%. 0단계면 난수를 쓰지 않습니다.
 */
export function messageBottles(s: State, hours: number, rng: () => number) {
    const rank = researchRank(s, 'messageBottle');
    if (!rank || hours <= 0) return null;
    const found = { count: 0, gold: 0, items: 0, pearls: 0 };
    for (let h = 0; h < hours; h++) {
        if (rng() >= rank * .04) continue;
        found.count++;
        const roll = rng();
        if (roll < .7) { const g = bottleGold(s.level); s.gold += g; found.gold += g; }
        else if (roll < .95) { drop(s, s.level, rng, true); found.items++; }
        else { s.pearls += 1; found.pearls++; }
    }
    if (found.count) addLog(s, `병 속의 편지 ${found.count}개를 주웠습니다${found.gold ? ` · +${found.gold} G` : ''}${found.items ? ` · 장비 ${found.items}개` : ''}${found.pearls ? ` · 진주 +${found.pearls}` : ''}`, 'reward');
    return found;
}
