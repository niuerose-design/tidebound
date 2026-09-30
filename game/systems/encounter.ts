/** 적 등장·드롭·승리 보상. */
import { BOSS_RESEARCH } from '../data/specializations';
import { DROP_RARITY, rollAffixes } from '../data/gear';
import { vocationTargets, thresholdRank, refinementBonusLabel, abyssPearls, ABYSS_SP_MILESTONES } from '../data/long-term';
import { jobMasteryTarget, skillRefinementTargets } from './progression';
import { activeSwarm, catchReward, encounterTier } from './meta';
import { stats, dropRate, dungeonClearGold, goldMultiplier, expMultiplier } from './stats';
import { victoryMastery } from './mastery';
import type { State, Item } from '../types';
import { BALANCE, MONSTER_TUNING, RARITIES, xpNeeded, FIRST_AID_HEAL } from '../data/balance';
import { FISH, STAGES, DUNGEONS, swarmHpMultiplier, swarmAttackMultiplier } from '../data/world';
import { JOBS } from '../data/classes';
import { SKILLS } from '../data/skills';
import { EQUIPMENT_NAMES } from '../data/equipment';
import { PROGRESSION } from '../data/progression';
import { canUse, grantJobSkills } from './progression';
import { scaledEnemyStats, profile } from '../data/encounters';
import { addLog, endRun } from './state';
import { continueRepeat } from './dungeon-run';
/** 승리 1회당 회복량. 무리 규모와 관계없이 승리마다 한 번 적용합니다(응급처치 포함). */
export function victoryHeal(s: State) {
    const firstAid = s.skills.includes('firstAid') && canUse(s, 'firstAid') ? FIRST_AID_HEAL : 0;
    return Math.floor(stats(s).hp * ((s.dungeon ? MONSTER_TUNING.dungeonHealAfterKill : BALANCE.healAfterKill) + firstAid));
}
/** 드롭 등급: DROP_RARITY 분포에서 minRarity 이상만 다시 정규화해 뽑습니다. */
export function rollRarity(rng: () => number, minRarity = 0) {
    const weights = DROP_RARITY.map((w, i) => i >= minRarity ? w : 0);
    let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll < 0) return i; }
    return weights.length - 1;
}
export function drop(s: State, level: number, rng: () => number, guaranteed = false) {
    if (!guaranteed && rng() > dropRate(s))
        return;
    const rarity = rollRarity(rng, guaranteed ? 1 : 0);
    const origin = s.dungeon?.id || s.stage;
    const slot = (['rod', 'coat', 'charm'] as const)[Math.floor(rng() * 3)];
    const item: Item = { id: `loot-${s.turn}-${s.logId}-${Math.floor(rng() * 1e9)}`, slot, rarity, name: EQUIPMENT_NAMES[slot][rarity], power: Math.max(2, Math.round((level + 2) * RARITIES[rarity].factor * (.8 + rng() * .4))), level };
    if (rarity > 0)
        item.affixes = rollAffixes(rarity, item.power, origin, rng);
    item.origin = origin;
    if (slot === 'rod')
        item.style = rng() < .33 ? 'physical' : rng() < .5 ? 'magic' : 'balanced';
    if (s.inventory.length >= BALANCE.inventoryCap) {
        s.gold += item.power * 3;
        addLog(s, `가방 가득 참: ${item.name} 자동 판매 +${item.power * 3} G`, 'reward');
    }
    else {
        s.inventory.push(item);
        addLog(s, `${RARITIES[rarity].name} 장비 발견 · ${item.name}${rarity ? ` · 옵션 ${rarity}개` : ''}`, 'reward');
    }
}
export function weightedFishId(ids: string[], rng: () => number) {
    const choices = ids.map(id => FISH.find(f => f.id === id)).filter(Boolean) as typeof FISH;
    const total = choices.reduce((sum, f) => sum + (f.spawnWeight ?? 1), 0);
    let roll = rng() * total;
    for (const f of choices) {
        roll -= f.spawnWeight ?? 1;
        if (roll <= 0)
            return f.id;
    }
    return choices[choices.length - 1]?.id || ids[0];
}
export function spawn(s: State, rng: () => number) {
    const dungeon = DUNGEONS.find(d => d.id === s.dungeon?.id);
    const st = STAGES.find(x => x.id === s.stage)!;
    const finalWave = !!dungeon && s.dungeon!.wave === dungeon.fish.length - 1;
    const id = dungeon ? (finalWave && dungeon.bossFish ? dungeon.bossFish : dungeon.fish[s.dungeon!.wave]) : (s.target && st.fish.includes(s.target) ? s.target : weightedFishId(st.fish, rng));
    const f = FISH.find(x => x.id === id)!;
    const boss = finalWave;
    const tier = encounterTier(s);
    const foe = scaledEnemyStats(f, { boss, tier, ...(s.dungeon ? { wave: s.dungeon.wave } : {}) });
    const { exp, gold } = catchReward(f, tier, boss);
    // 무리 사냥: 무리 전체를 체력 ×N(×100 이상은 98%)인 한 개체로 상대합니다. 공격은 ×500에서만 체력과 같은 배율이고, 방어는 한 마리와 같습니다.
    const swarm = !dungeon && s.target === f.id ? activeSwarm(s) : 1;
    if (swarm > 1) {
        foe.hp = Math.round(foe.hp * swarmHpMultiplier(swarm));
        foe.attack = Math.round(foe.attack * swarmAttackMultiplier(swarm));
        foe.magic = Math.round((foe.magic || 0) * swarmAttackMultiplier(swarm));
    }
    s.enemy = { id: f.id, name: boss ? dungeon!.boss : f.name, hp: foe.hp, maxHp: foe.hp, attack: foe.attack, defense: foe.defense, exp, gold, boss, stun: 0, combatStats: foe, skills: f.level >= 5 ? profile(f.id).skills : [], cooldowns: {}, effects: {}, mana: 100, ...(swarm > 1 ? { swarm } : {}) };
}
export function reward(s: State, rng: () => number) {
    const e = s.enemy!;
    // Use the loadout and growth level at the time of victory, before new mastery unlocks.
    // 무리 사냥은 전멸 시 N마리분을 지급합니다. 조건부 숙련 상한은 한 마리 기준으로 적용한 뒤 N배.
    const size = e.swarm || 1;
    const masteryReward = victoryMastery(s, e), practice = masteryReward.amount * size;
    const gold = Math.floor(e.gold * goldMultiplier(s)) * size, exp = Math.floor(e.exp * expMultiplier(s)) * size;
    s.kills += size;
    const jobTargets = vocationTargets(jobMasteryTarget(JOBS.find(j => j.id === s.job)!));
    const oldJobRank = thresholdRank(s.jobMastery[s.job] || 0, jobTargets);
    s.jobMastery[s.job] = (s.jobMastery[s.job] || 0) + practice;
    const newJobRank = thresholdRank(s.jobMastery[s.job], jobTargets);
    if (newJobRank > oldJobRank) addLog(s, `직업 단련 ${newJobRank}단계 달성 · 현재 직업의 체력·양 공격·양 방어 +4%`, 'skill');
    for (const id of s.skills) {
        if (canUse(s, id)) {
            const sk = SKILLS.find(x => x.id === id)!, targets = skillRefinementTargets(sk);
            const before = thresholdRank(s.skillPractice[id] || 0, targets);
            s.skillPractice[id] = (s.skillPractice[id] || 0) + practice;
            const after = thresholdRank(s.skillPractice[id], targets);
            if (after > before) addLog(s, `${sk.name} 연마 ${after}/${targets.length}단계 달성 · 직접 피해·양수 패시브 누적 ${refinementBonusLabel(after)}`, 'skill');
        }
    }
    s.book[e.id] = (s.book[e.id] || 0) + size;
    s.gold += gold;
    s.exp += exp;
    addLog(s, `${e.name}${size > 1 ? ` 무리 ×${size}` : ''} 포획 · +${gold} G · +${exp} EXP`, 'reward');
    if (masteryReward.bonus) addLog(s, `${masteryReward.source} · 직업·장착 스킬 숙련 +${practice} (기본 ${masteryReward.base} + 보너스 ${masteryReward.bonus}${size > 1 ? ` · ×${size}` : ''})`, 'skill');
    const fish = FISH.find(f => f.id === e.id)!;
    for (let i = 0; i < size; i++)
        drop(s, fish.level + encounterTier(s) * 5, rng);
    while (s.exp >= xpNeeded(s.level) && s.level < 100) {
        s.exp -= xpNeeded(s.level);
        s.level++;
        s.statPoints += PROGRESSION.statPerLevel;
        if (s.level > s.peakLevel) {
            s.sp += (s.level - s.peakLevel) * PROGRESSION.spPerPeakLevel;
            s.peakLevel = s.level;
        }
        s.mana = stats(s).mana;
        s.hp = stats(s).hp;
        addLog(s, `레벨 ${s.level} 달성! 능력치가 상승했습니다.`);
    }
    for (const id of grantJobSkills(s)) {
        const sk = SKILLS.find(skill => skill.id === id)!;
        if (sk.unlockJobMastery) addLog(s, `직업 숙련으로 ${sk.name} 해금 · 기본 Lv.0부터 장착 가능`, 'skill');
    }
    s.hp = Math.min(stats(s).hp, s.hp + victoryHeal(s));
    s.enemy = null;
    s.effects = {};
    s.playerStun = 0;
    if (s.dungeon) {
        const d = DUNGEONS.find(x => x.id === s.dungeon!.id)!;
        s.dungeon.wave++;
        if (s.dungeon.wave >= d.fish.length) {
            const bonusGold = dungeonClearGold(s, d.gold, encounterTier(s));
            s.gold += bonusGold;
            const first = !s.clears[d.id];
            const depth = s.dungeon.depth || 1;
            if (d.id === 'abyss') {
                s.abyssBest = Math.max(s.abyssBest, depth);
                const pearls = abyssPearls(depth);
                s.pearls += pearls;
                addLog(s, `심연 ${depth}층 정복 · 진주 +${pearls}`, 'reward');
                s.abyssMilestones ??= [];
                if (ABYSS_SP_MILESTONES.includes(depth) && !s.abyssMilestones.includes(depth)) {
                    s.abyssMilestones.push(depth);
                    s.sp += 1;
                    addLog(s, `심연 ${depth}층 첫 돌파 이정표 · SP +1`, 'reward');
                }
            }
            if (first && BOSS_RESEARCH[d.id]) addLog(s, `${d.name} 첫 정복! 던전 화면에서 연구 보상 SP ${BOSS_RESEARCH[d.id].sp}을 받으세요.`, 'reward');
            if (first && d.id !== 'abyss')
                s.pearls += d.pearls;
            s.clears[d.id] = (s.clears[d.id] || 0) + 1;
            // 희귀 이상 확정 장비: 첫 정복, 무한 심연 5층마다, 반복 정복은 낮은 확률.
            if (first || (d.id === 'abyss' && depth % 5 === 0) || rng() < BALANCE.dungeonRepeatDrop)
                drop(s, d.level + encounterTier(s) * 5, rng, true);
            addLog(s, `${d.name} 정복! +${bonusGold} G${first && d.id !== 'abyss' ? ` · 첫 클리어 +${d.pearls} 진주` : ''}`, 'reward');
            const repeat = s.dungeon.repeat;
            s.dungeon = null;
            s.running = false;
            if (repeat) continueRepeat(s, d.id, repeat);
            else endRun(s, `${d.name} 정복 · 1회 도전 완료로 멈춤`);
        }
    }
}
