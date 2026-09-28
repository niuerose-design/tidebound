/** 턴 진행(온라인 tick·오프라인 advance). */
import { syncVoyage } from './guidance';
import { syncGoal } from './goals';
import { stats } from './stats';
import type { State } from '../types';
import { BALANCE } from '../data/balance';
import { DUNGEONS } from '../data/world';
import { strike, fighterSpeed, Fighter, type CombatEvent } from './combat';
import { PROGRESSION } from '../data/progression';
import { canUse, skillMasteryRanks } from './progression';
import { addLog, endRun } from './state';
import { spawn, reward } from './encounter';
export function tick(s: State, rng = Math.random) {
    if (!s.running)
        return;
    syncStatRate(s);
    tickTurn(s, rng);
    syncVoyage(s, text => addLog(s, text, 'reward'));
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
    const player: Fighter = { name: s.name, stats: a, hp: s.hp, skills: s.skills.filter(id => canUse(s, id)), cooldowns: s.cooldowns, stun: s.playerStun, mana: s.mana, effects: s.effects, ranks: s.learned, mastery: skillMasteryRanks(s), specializations: s.skillSpecializations, practice: s.skillPractice };
    const enemy: Fighter = { name: e.name, stats: e.combatStats || { hp: e.maxHp, attack: e.attack, defense: e.defense, crit: 0 }, hp: e.hp, skills: e.skills || [], cooldowns: e.cooldowns || {}, stun: e.stun, mana: e.mana, effects: e.effects || {}, ...(e.swarm ? { swarm: e.swarm } : {}) };
    const first = fighterSpeed(player) >= fighterSpeed(enemy) ? player : enemy, second = first === player ? enemy : player;
    const events: CombatEvent[] = [];
    addLog(s, strike(first, second, rng, events), 'battle', events.at(-1));
    if (first.hp > 0 && second.hp > 0)
        addLog(s, strike(second, first, rng, events), 'battle', events.at(-1));
    s.hp = player.hp;
    s.mana = player.mana ?? a.mana;
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
    const count = Math.min(Math.floor(elapsed / BALANCE.turnMs), BALANCE.offlineCapSeconds * 1000 / BALANCE.turnMs);
    const before = { kills: s.kills, gold: s.gold, exp: s.exp };
    for (let i = 0; i < count; i++)
        tick(s, rng);
    s.lastTick = elapsed > BALANCE.offlineCapSeconds * 1000 ? now : now - (elapsed % BALANCE.turnMs);
    if (elapsed > 60000 && s.kills > before.kills)
        s.lastOffline = { seconds: Math.min(BALANCE.offlineCapSeconds, Math.floor(elapsed / 1000)), kills: s.kills - before.kills, gold: s.gold - before.gold, exp: Math.max(0, s.exp - before.exp) };
}
