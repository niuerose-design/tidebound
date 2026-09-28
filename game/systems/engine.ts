import { BOSS_RESEARCH, SPECIALIZATIONS, specializationFits } from '../data/specializations';
import { commerce } from './commerce';
import { rollAffix, saleValue } from './equipment';
import { vocationTargets, thresholdRank, refinementBonusLabel, abyssPearls, ABYSS_SP_MILESTONES } from '../data/long-term';
import { jobMasteryTarget, skillRefinementTargets, skillPracticeTargets } from './progression';
import { rebirthLevel, rebirthReward, tideLimit, encounterTier, tierReward, tierHealth, tierAttack } from './meta';
import { goldMultiplier, dungeonGoldMultiplier, expMultiplier } from './stats';
import { victoryMastery } from './mastery';
import type { State, Action, Item, Attribute } from '../types';
import { BALANCE, MONSTER_TUNING, RARITIES, xpNeeded, upgradeCost } from '../data/balance';
import { FISH, STAGES, DUNGEONS } from '../data/world';
import { JOBS } from '../data/classes';
import { SKILLS } from '../data/skills';
import { EQUIPMENT_NAMES } from '../data/equipment';
import { stats, skillUnlocked, dropRate } from './stats';
import { strike, fighterSpeed, Fighter } from './combat';
import { PROGRESSION, emptyAttributes } from '../data/progression';
import { initialProgress, canUse, canLearn, canChangeJob, trimLoadout, validLoadout, skillCost, bookReward, itemKey, skillMasteryRanks, grantJobSkills, canSpendSkill, canInheritSkill, skillLevel, skillMastery } from './progression';
import { scaledEnemyStats, profile } from '../data/encounters';
import { newGuild } from '../data/guild';
import { guildAction, guildHasJoined } from './guild';
export function addLog(s: State, text: string, type: 'battle' | 'reward' | 'system' | 'skill' = 'system') {
    s.logs.push({ id: ++s.logId, text, type });
    if (s.logs.length > 70)
        s.logs.shift();
}
export function newState(now: number): State {
    const state: State = {
        ...initialProgress(),
        version: 7,
        skillSpecializations: {}, bossResearchClaims: {}, abyssMilestones: [], growthGoal: null,
        tide: 0,
        abyssBest: 0,
        shopSerial: 0,
        guild: newGuild(),
        name: '물결의 낚시꾼',
        level: 1,
        exp: 0,
        gold: 100,
        pearls: 0,
        rebirths: 0,
        job: 'fisher',
        stage: 'brook',
        running: false,
        hp: BALANCE.baseHp + 12,
        enemy: null,
        turn: 0,
        kills: 0,
        deaths: 0,
        recovery: 0,
        lastTick: now,
        skills: ['hook'],
        cooldowns: {},
        book: {},
        inventory: [],
        equipment: {
            rod: { id: 'starter', name: '대나무 낚싯대', slot: 'rod', rarity: 0, power: 2, level: 1 },
            coat: { id: 'starter-coat', name: '낡은 구명조끼', slot: 'coat', rarity: 0, power: 2, level: 1 },
            charm: null,
        },
        upgrades: { attack: 0, hp: 0, defense: 0 },
        permanent: { attack: 0, hp: 0, gold: 0 },
        dungeon: null,
        clears: {},
        logs: [{ id: 1, text: '여명의 시냇가에 도착했습니다. 낚시를 시작하세요.', type: 'system' }],
        logId: 1,
        lastDuel: 0,
        rating: 1000,
        wins: 0,
        losses: 0,
        bestStage: 0,
        lastOffline: null,
    };
    grantJobSkills(state);
    state.hp = stats(state).hp;
    state.mana = stats(state).mana;
    return state;
}
function drop(s: State, level: number, rng: () => number, guaranteed = false) {
    if (!guaranteed && rng() > dropRate(s))
        return;
    const roll = rng();
    const rarity = guaranteed ? Math.max(1, roll > .95 ? 3 : roll > .7 ? 2 : 1) : roll > .985 ? 3 : roll > .90 ? 2 : roll > .65 ? 1 : 0;
    const slot = (['rod', 'coat', 'charm'] as const)[Math.floor(rng() * 3)];
    const item: Item = { id: `loot-${s.turn}-${s.logId}-${Math.floor(rng() * 1e9)}`, slot, rarity, name: EQUIPMENT_NAMES[slot][rarity], power: Math.max(2, Math.round((level + 2) * RARITIES[rarity].factor * (.8 + rng() * .4))), level };
    if (rarity > 0)
        item.affix = rollAffix(rarity, rng);
    if (slot === 'rod')
        item.style = rng() < .33 ? 'physical' : rng() < .5 ? 'magic' : 'balanced';
    if (s.inventory.length >= BALANCE.inventoryCap) {
        s.gold += item.power * 3;
        addLog(s, `가방 가득 참: ${item.name} 자동 판매 +${item.power * 3} G`, 'reward');
    }
    else {
        s.inventory.push(item);
        addLog(s, `${RARITIES[rarity].name} 장비 발견 · ${item.name}`, 'reward');
    }
}
function weightedFishId(ids: string[], rng: () => number) {
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
function spawn(s: State, rng: () => number) {
    const dungeon = DUNGEONS.find(d => d.id === s.dungeon?.id);
    const st = STAGES.find(x => x.id === s.stage)!;
    const finalWave = !!dungeon && s.dungeon!.wave === dungeon.fish.length - 1;
    const id = dungeon ? (finalWave && dungeon.bossFish ? dungeon.bossFish : dungeon.fish[s.dungeon!.wave]) : (s.target && st.fish.includes(s.target) ? s.target : weightedFishId(st.fish, rng));
    const f = FISH.find(x => x.id === id)!;
    const boss = finalWave;
    const mult = boss ? MONSTER_TUNING.bossRewardMultiplier : 1;
    const powerScale = Math.max(1, f.powerMultiplier || 1);
    const tier = encounterTier(s);
    const foe = scaledEnemyStats(f, { boss, tier, ...(s.dungeon ? { wave: s.dungeon.wave } : {}) });
    const hp = foe.hp;
    const rewardScale = f.rewardMultiplier || 1;
    s.enemy = { id: f.id, name: boss ? dungeon!.boss : f.name, hp, maxHp: hp, attack: foe.attack, defense: foe.defense, exp: Math.round(f.exp * mult * tierReward(tier) * rewardScale * powerScale), gold: Math.round(f.gold * mult * tierReward(tier) * rewardScale * powerScale), boss, stun: 0, combatStats: foe, skills: f.level >= 5 ? profile(f.id).skills : [], cooldowns: {}, effects: {}, mana: 100, powerMultiplier: powerScale, powerLabel: f.powerLabel };
}
function reward(s: State, rng: () => number) {
    const e = s.enemy!;
    // Use the loadout and growth level at the time of victory, before new mastery unlocks.
    const masteryReward = victoryMastery(s, e);
    const gold = Math.floor(e.gold * goldMultiplier(s)), exp = Math.floor(e.exp * expMultiplier(s));
    s.kills++;
    if (guildHasJoined(s))
        s.guild.missionKills++;
    const jobTargets = vocationTargets(jobMasteryTarget(JOBS.find(j => j.id === s.job)!));
    const oldJobRank = thresholdRank(s.jobMastery[s.job] || 0, jobTargets);
    s.jobMastery[s.job] = (s.jobMastery[s.job] || 0) + masteryReward.amount;
    const newJobRank = thresholdRank(s.jobMastery[s.job], jobTargets);
    if (newJobRank > oldJobRank) addLog(s, `직업 단련 ${newJobRank}단계 달성 · 현재 직업의 체력·양 공격·양 방어 +4%`, 'skill');
    for (const id of s.skills) {
        if (canUse(s, id)) {
            const sk = SKILLS.find(x => x.id === id)!, targets = skillRefinementTargets(sk);
            const before = thresholdRank(s.skillPractice[id] || 0, targets);
            s.skillPractice[id] = (s.skillPractice[id] || 0) + masteryReward.amount;
            const after = thresholdRank(s.skillPractice[id], targets);
            if (after > before) addLog(s, `${sk.name} 연마 ${after}/${targets.length}단계 달성 · 직접 피해·양수 패시브 누적 ${refinementBonusLabel(after)}`, 'skill');
        }
    }
    s.book[e.id] = (s.book[e.id] || 0) + 1;
    s.gold += gold;
    s.exp += exp;
    addLog(s, `${e.name} 포획 · +${gold} G · +${exp} EXP`, 'reward');
    if (masteryReward.bonus) addLog(s, `${masteryReward.source} · 직업·장착 스킬 숙련 +${masteryReward.amount} (기본 1 + 보너스 ${masteryReward.bonus})`, 'skill');
    const fish = FISH.find(f => f.id === e.id)!;
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
    s.hp = Math.min(stats(s).hp, s.hp + Math.floor(stats(s).hp * (s.dungeon ? MONSTER_TUNING.dungeonHealAfterKill : BALANCE.healAfterKill)));
    s.enemy = null;
    s.effects = {};
    s.playerStun = 0;
    if (s.dungeon) {
        const d = DUNGEONS.find(x => x.id === s.dungeon!.id)!;
        s.dungeon.wave++;
        if (s.dungeon.wave >= d.fish.length) {
            const bonusGold = Math.floor(d.gold * tierReward(encounterTier(s)) * goldMultiplier(s) * dungeonGoldMultiplier(s));
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
            if (guildHasJoined(s))
                s.guild.missionDungeons++;
            drop(s, d.level + encounterTier(s) * 5, rng, true);
            addLog(s, `${d.name} 정복! +${bonusGold} G${first && d.id !== 'abyss' ? ` · 첫 클리어 +${d.pearls} 진주` : ''}`, 'reward');
            s.dungeon = null;
            s.running = false;
        }
    }
}
export function tick(s: State, rng = Math.random) {
    if (!s.running)
        return;
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
    const enemy: Fighter = { name: e.name, stats: e.combatStats || { hp: e.maxHp, attack: e.attack, defense: e.defense, crit: 0 }, hp: e.hp, skills: e.skills || [], cooldowns: e.cooldowns || {}, stun: e.stun, mana: e.mana, effects: e.effects || {} };
    const first = fighterSpeed(player) >= fighterSpeed(enemy) ? player : enemy, second = first === player ? enemy : player;
    addLog(s, strike(first, second, rng), 'battle');
    if (first.hp > 0 && second.hp > 0)
        addLog(s, strike(second, first, rng), 'battle');
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
            s.dungeon = null;
            s.running = false;
            addLog(s, '던전 도전에 실패했습니다. 손실 없이 다시 도전할 수 있습니다.');
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
export function act(s: State, a: Action, now: number, rng = Math.random) {
    // Save files created before job-granted skills existed are upgraded lazily
    // on the next action. This also grants a newly level-eligible job skill.
    grantJobSkills(s);
    const message = commerce(s, a, rng);
    if (message !== null) {
        s.hp = Math.min(s.hp, stats(s).hp);
        s.mana = Math.min(s.mana, stats(s).mana);
        addLog(s, message);
        return;
    }
    const guildMessage = guildAction(s, a, now);
    if (guildMessage !== null) {
        s.hp = Math.min(s.hp, stats(s).hp);
        s.mana = Math.min(s.mana, stats(s).mana);
        addLog(s, guildMessage, 'reward');
        return;
    }
    const id = a.id || '';
    switch (a.type) {
        case 'sync': break;
        case 'tide': {
            const tier = Number(id);
            if (!Number.isInteger(tier) || tier < 0 || tier > tideLimit(s) || s.dungeon)
                throw Error('해역 난이도 조건을 확인하세요.');
            s.tide = tier;
            s.enemy = null;
            s.effects = {};
            s.playerStun = 0;
            addLog(s, `해역 난이도 ${tier}단계`);
            break;
        }
        case 'start':
            s.running = true;
            s.lastTick = now;
            addLog(s, '자동 낚시를 시작했습니다.');
            break;
        case 'pause':
            s.running = false;
            addLog(s, '낚시를 잠시 멈췄습니다.');
            break;
        case 'specialize': {
            if (s.running || s.dungeon) throw Error('낚시를 멈추고 던전에서 나온 뒤 특화를 바꾸세요.');
            const sk = SKILLS.find(x => x.id === id), spec = SPECIALIZATIONS.find(x => x.id === a.value);
            if (!sk || !canUse(s, id)) throw Error('사용 가능한 스킬을 선택하세요.');
            if (a.value !== 'none' && (!spec || !specializationFits(sk, spec) || skillMastery(s, id) < 1 || (spec.dungeon && !s.bossResearchClaims?.[spec.dungeon]))) throw Error('실전 숙련 1단계와 해당 보스 연구가 필요합니다.');
            s.skillSpecializations ??= {};
            if (a.value === 'none') delete s.skillSpecializations[id]; else s.skillSpecializations[id] = spec!.id;
            addLog(s, `${sk.name} · ${spec?.name || '기본형'} 선택 · 변경 비용 없음`);
            break;
        }
        case 'bossResearch': {
            const reward = BOSS_RESEARCH[id];
            if (!reward || !s.clears[id] || s.bossResearchClaims?.[id]) throw Error('아직 정복하지 않았거나 이미 연구 보상을 받았습니다.');
            s.bossResearchClaims ??= {};
            s.bossResearchClaims[id] = true;
            s.sp += reward.sp;
            addLog(s, `${DUNGEONS.find(x => x.id === id)!.name} 연구 완료 · SP +${reward.sp}${reward.specialization ? ' · ' + SPECIALIZATIONS.find(x => x.id === reward.specialization)!.name + ' 특화 해금' : ''}`);
            break;
        }
        case 'growthGoal': {
            const kind = a.value;
            if (id === 'none') { s.growthGoal = null; break; }
            const valid = kind === 'skill' ? SKILLS.some(x => x.id === id) : kind === 'job' ? JOBS.some(x => x.id === id) : kind === 'dungeon' ? DUNGEONS.some(x => x.id === id) : false;
            if (!valid) throw Error('성장 목표를 확인하세요.');
            s.growthGoal = { kind: kind as 'skill' | 'job' | 'dungeon', id, ...(kind === 'skill' ? { target: Math.min(skillPracticeTargets(SKILLS.find(x => x.id === id)!).length, skillPracticeTargets(SKILLS.find(x => x.id === id)!).filter(n => (s.skillPractice[id] || 0) >= n).length + 1) } : {}) };
            break;
        }
        case 'offlineDismiss':
            s.lastOffline = null;
            break;
        case 'rename': {
            const name = (a.value || '').trim();
            if (name.length < 2 || name.length > 16)
                throw Error('이름은 2~16자로 입력하세요.');
            s.name = name;
            break;
        }
        case 'stage': {
            const st = STAGES.find(x => x.id === id);
            if (!st || s.level < st.level || s.rebirths < st.rebirth)
                throw Error('아직 진입할 수 없는 낚시터입니다.');
            s.stage = id;
            s.target = null;
            s.effects = {};
            s.playerStun = 0;
            s.bestStage = Math.max(s.bestStage || 0, STAGES.indexOf(st));
            s.dungeon = null;
            s.enemy = null;
            addLog(s, `${st.name}(으)로 이동했습니다.`);
            break;
        }
        case 'dungeon': {
            const d = DUNGEONS.find(x => x.id === id);
            if (!d || s.level < d.level || s.rebirths < d.rebirth)
                throw Error('던전 입장 조건을 충족하지 못했습니다.');
            s.dungeon = { id, wave: 0, ...(id === 'abyss' ? { depth: s.abyssBest + 1 } : {}) };
            s.enemy = null;
            // Preparation takes real turns: repeated entry cannot heal instantly.
            s.effects = {};
            s.playerStun = 0;
            s.cooldowns = {};
            s.recovery = Math.max(s.recovery, MONSTER_TUNING.dungeonPreparationTurns);
            s.running = true;
            s.lastTick = now;
            addLog(s, `${d.name} 입장 준비 · ${MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 후 체력·마나를 회복하고 출발합니다.`);
            break;
        }
        case 'leaveDungeon':
            s.dungeon = null;
            s.enemy = null;
            s.running = false;
            addLog(s, '던전에서 귀환했습니다.');
            break;
        case 'job': {
            if (!canChangeJob(s, id))
                throw Error('레벨·능력치·선행 직업 숙련 조건을 확인하세요.');
            // A class change is a safe combat boundary. Discard only the
            // unfinished encounter (and any dungeon reward), then apply the
            // new class with the current HP/MP ratio intact.
            const hadCombat = s.running || !!s.dungeon || !!s.enemy || s.recovery > 0;
            const old = stats(s);
            if (hadCombat) {
                const fromDungeon = !!s.dungeon;
                s.running = false;
                s.dungeon = null;
                s.enemy = null;
                s.recovery = 0;
                s.effects = {};
                s.playerStun = 0;
                s.cooldowns = {};
                s.lastTick = now;
                addLog(s, fromDungeon ? '전직을 위해 진행 중인 던전을 보상 없이 정리하고 귀환했습니다.' : '전직을 위해 진행 중인 전투를 정리했습니다. 현재 입질은 사라집니다.');
            }
            s.job = id;
            if (!s.unlockedJobs.includes(id))
                s.unlockedJobs.push(id);
            grantJobSkills(s);
            trimLoadout(s);
            const next = stats(s);
            const hpRatio = old.hp > 0 ? s.hp / old.hp : 1;
            const manaRatio = old.mana > 0 ? s.mana / old.mana : 1;
            s.hp = Math.min(next.hp, Math.max(1, Math.floor(hpRatio * next.hp)));
            s.mana = Math.min(next.mana, Math.max(0, Math.floor(manaRatio * next.mana)));
            s.enemy = null;
            s.effects = {};
            s.playerStun = 0;
            s.cooldowns = {};
            addLog(s, `${JOBS.find(j => j.id === id)!.name}(으)로 전직했습니다. 숙달 스킬을 계승할 수 있습니다.`);
            break;
        }
        case 'skill': {
            if (s.skills.includes(id)) {
                const nextSkills = s.skills.filter(x => x !== id);
                if (!validLoadout(s, nextSkills))
                    throw Error('이 스킬을 빼면 AP가 부족합니다. 다른 스킬을 먼저 해제하세요.');
                s.skills = nextSkills;
            }
            else {
                if (!canUse(s, id))
                    throw Error('전용 직업으로 전직하거나, 숙련 또는 SP 계승을 완료하세요.');
                if (!validLoadout(s, [...s.skills, id]))
                    throw Error('총 장착 AP 한도를 초과합니다.');
                s.skills.push(id);
            }
            s.hp = Math.min(s.hp, stats(s).hp);
            s.mana = Math.min(s.mana, stats(s).mana);
            break;
        }
        case 'learn': {
            if (!canSpendSkill(s, id))
                throw Error('전직으로 얻고 현재 사용할 수 있는 스킬만 강화할 수 있습니다. 최대 레벨도 확인하세요.');
            const sk = SKILLS.find(x => x.id === id)!;
            const cost = skillCost(s, id);
            if (s.sp < cost)
                throw Error('SP가 부족합니다. 보스 첫 정복 연구 또는 최종 도감 연구에서 얻을 수 있습니다.');
            s.sp -= cost;
            s.skillSpent[id] = (s.skillSpent[id] || 0) + cost;
            s.learned[id] = skillLevel(sk, s.learned[id], skillMastery(s, id)) + 2;
            addLog(s, `${sk.name} 강화 Lv.${s.learned[id] - 1} · SP -${cost}`, 'skill');
            break;
        }
        case 'inheritSkill': {
            if (!canInheritSkill(s, id))
                throw Error('전직으로 얻은 미계승 스킬만 SP로 계승할 수 있습니다.');
            const cost = skillCost(s, id);
            if (s.sp < cost)
                throw Error('계승에는 1 SP가 필요합니다. 장착 승리로 무료 계승할 수도 있습니다.');
            s.sp -= cost;
            s.skillSpent[id] = (s.skillSpent[id] || 0) + cost;
            s.skillInheritances[id] = true;
            addLog(s, `${SKILLS.find(x => x.id === id)!.name} SP 계승 · 다른 직업에서도 장착 가능`, 'skill');
            break;
        }
        case 'resetSkills': {
            if (s.running || s.dungeon)
                throw Error('전투를 멈춘 뒤 초기화하세요.');
            s.sp += Object.values(s.skillSpent).reduce((sum, n) => sum + n, 0);
            s.skillSpent = {};
            s.skillInheritances = {};
            s.learned = Object.fromEntries(Object.keys(s.learned).map(id => [id, 1]));
            trimLoadout(s);
            s.cooldowns = {};
            s.hp = Math.min(s.hp, stats(s).hp);
            s.mana = Math.min(s.mana, stats(s).mana);
            break;
        }
        case 'attribute': {
            if (!['str', 'dex', 'int', 'vit', 'wis', 'luk'].includes(id))
                throw Error('알 수 없는 능력치입니다.');
            const amount = Number(a.value || '1');
            if (!Number.isInteger(amount) || ![1, 5, 10].includes(amount) || s.statPoints < amount)
                throw Error('능력치 포인트가 부족합니다.');
            s.attributes[id as Attribute] += amount;
            s.statPoints -= amount;
            break;
        }
        case 'resetAttributes': {
            if (s.running)
                throw Error('전투를 멈춘 뒤 재분배하세요.');
            s.statPoints += Object.values(s.attributes).reduce((sum, n) => sum + n, 0);
            s.attributes = emptyAttributes();
            s.hp = Math.min(s.hp, stats(s).hp);
            s.mana = Math.min(s.mana, stats(s).mana);
            break;
        }
        case 'resetData': {
            if (s.running || s.dungeon)
                throw Error('자동 낚시와 던전을 먼저 멈춘 뒤 초기화하세요.');
            const name = s.name;
            Object.assign(s, newState(now), { name });
            break;
        }
        case 'claimBook': {
            if (!FISH.some(f => f.id === id))
                throw Error('물고기를 찾을 수 없습니다.');
            const reward = bookReward(s, id);
            if (!reward.ready)
                throw Error('받을 도감 보상이 없습니다.');
            s.bookClaims[id] = reward.rank + 1;
            s.sp += reward.sp;
            s.gold += reward.gold;
            addLog(s, `도감 연구 완료 · ${FISH.find(f => f.id === id)!.name} · 골드 +${reward.gold}${reward.sp ? ` · SP +${reward.sp}` : ''}`, 'reward');
            break;
        }
        case 'registerItem': {
            const item = s.inventory.find(x => x.id === id);
            if (!item)
                throw Error('가방에 있는 장비를 선택하세요.');
            if (item.locked || item.relic)
                throw Error('보호 장비와 유물은 등록할 수 없습니다.');
            const key = itemKey(item.slot, item.rarity);
            if (s.itemBook[key])
                throw Error('이미 등록한 종류입니다.');
            s.itemBook[key] = true;
            s.inventory = s.inventory.filter(x => x.id !== id);
            addLog(s, `${item.name} 물건도감 등록 · 장비 1개 소모`, 'reward');
            break;
        }
        case 'target': {
            if (s.dungeon)
                throw Error('던전에서는 목표를 바꿀 수 없습니다.');
            const stage = STAGES.find(x => x.id === s.stage)!;
            if (id !== 'all' && !stage.fish.includes(id))
                throw Error('현재 낚시터의 물고기를 선택하세요.');
            s.target = id === 'all' ? null : id;
            s.enemy = null;
            break;
        }
        case 'savePreset': {
            if (!['1', '2', '3'].includes(id))
                throw Error('저장 칸을 확인하세요.');
            s.presets[id] = { name: (a.value || `편성 ${id}`).slice(0, 20), skills: [...s.skills] };
            break;
        }
        case 'loadPreset': {
            const preset = s.presets[id];
            if (!preset || !validLoadout(s, preset.skills))
                throw Error('현재 직업·레벨·AP로 불러올 수 없는 편성입니다.');
            s.skills = [...preset.skills];
            s.hp = Math.min(s.hp, stats(s).hp);
            s.mana = Math.min(s.mana, stats(s).mana);
            break;
        }
        case 'skillUp': {
            const index = s.skills.indexOf(id);
            if (index > 0) {
                [s.skills[index - 1], s.skills[index]] = [s.skills[index], s.skills[index - 1]];
            }
            break;
        }
        case 'equip': {
            const item = s.inventory.find(x => x.id === id);
            if (!item)
                throw Error('장비를 찾을 수 없습니다.');
            s.inventory = s.inventory.filter(x => x.id !== id);
            if (s.equipment[item.slot])
                s.inventory.push(s.equipment[item.slot]!);
            s.equipment[item.slot] = item;
            s.hp = Math.min(s.hp, stats(s).hp);
            break;
        }
        case 'unequip':
            if (!['rod', 'coat', 'charm'].includes(id) || !s.equipment[id])
                throw Error('장착한 장비가 없습니다.');
            if (s.inventory.length >= BALANCE.inventoryCap)
                throw Error('가방이 가득 찼습니다.');
            s.inventory.push(s.equipment[id]!);
            s.equipment[id] = null;
            s.hp = Math.min(s.hp, stats(s).hp);
            break;
        case 'sell': {
            const item = s.inventory.find(x => x.id === id);
            if (!item)
                throw Error('장비를 찾을 수 없습니다.');
            if (item.locked || item.relic)
                throw Error('보호 장비와 유물은 판매할 수 없습니다.');
            s.gold += saleValue(item);
            s.inventory = s.inventory.filter(x => x.id !== id);
            break;
        }
        case 'upgrade': {
            if (!['attack', 'hp', 'defense', 'magic', 'gold'].includes(id))
                throw Error('잘못된 강화입니다.');
            const cost = upgradeCost(s.upgrades[id] || 0);
            if (s.gold < cost)
                throw Error('골드가 부족합니다.');
            s.gold -= cost;
            s.upgrades[id] = (s.upgrades[id] || 0) + 1;
            if (id === 'hp')
                s.hp = Math.min(stats(s).hp, s.hp + 25);
            break;
        }
        case 'rebirth': {
            if (s.level < rebirthLevel(s))
                throw Error(`레벨 ${rebirthLevel(s)}부터 환생할 수 있습니다.`);
            const pearls = rebirthReward(s, stats(s).rebirthBonus || 0);
            const fresh = newState(now);
            fresh.gold = 100 + (s.permanent.starting || 0) * 500;
            fresh.inventory = s.inventory.filter(i => i.relic);
            for (const [slot, item] of Object.entries(s.equipment)) {
                if (item?.relic)
                    fresh.equipment[slot] = item;
            }
            fresh.abyssBest = s.abyssBest;
            fresh.shopSerial = s.shopSerial;
            Object.assign(s, { ...fresh, skillSpecializations: s.skillSpecializations, bossResearchClaims: s.bossResearchClaims, abyssMilestones: s.abyssMilestones, growthGoal: s.growthGoal, name: s.name, pearls: s.pearls + pearls, rebirths: s.rebirths + 1, permanent: s.permanent, book: s.book, clears: s.clears, kills: s.kills, deaths: s.deaths, rating: s.rating, wins: s.wins, losses: s.losses, lastDuel: s.lastDuel, bestStage: s.bestStage, sp: s.sp, peakLevel: s.peakLevel, learned: s.learned, skillSpent: s.skillSpent, skillInheritances: s.skillInheritances, skillPractice: s.skillPractice, jobMastery: s.jobMastery, unlockedJobs: s.unlockedJobs, bookClaims: s.bookClaims, itemBook: s.itemBook, presets: s.presets, guild: s.guild });
            s.hp = stats(s).hp;
            s.mana = stats(s).mana;
            addLog(s, `새로운 항해가 시작됩니다. 환생 진주 +${pearls}`);
            break;
        }
        default: throw Error('지원하지 않는 행동입니다.');
    }
}
