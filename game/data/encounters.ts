import { tierHealth, tierAttack } from '../systems/meta';
import type { Skill, Stats } from '../types';
import { bossLevelScale, monsterLevelScale, dungeonPressure, MONSTER_TUNING } from './balance';
export const ENEMY_SKILLS: Skill[] = [
    { id: 'foeShock', name: '전류 방출', desc: '마법 공격', type: 'active', level: 1, chance: .3, cooldown: 3, multiplier: 1.5, damageType: 'magic', manaCost: 0 },
    { id: 'foeVenom', name: '독가시', desc: '지속 피해', type: 'active', level: 1, chance: .25, cooldown: 4, multiplier: 1, effect: 'bleed', manaCost: 0 },
    { id: 'foeCrush', name: '꼬리 후려치기', desc: '기절', type: 'active', level: 1, chance: .2, cooldown: 5, multiplier: 1.3, effect: 'stun', manaCost: 0 },
    { id: 'foeSilence', name: '무음의 포효', desc: '마법 공격 115% 피해, 2턴 침묵.', type: 'active', level: 1, chance: .28, cooldown: 5, multiplier: 1.15, effect: 'silence', damageType: 'magic', statusTurns: 2, manaCost: 0 },
    { id: 'foeSlow', name: '점액 조류', desc: '마법 공격 110% 피해, 3턴 감속.', type: 'active', level: 1, chance: .3, cooldown: 4, multiplier: 1.1, effect: 'slow', damageType: 'magic', statusTurns: 3, manaCost: 0 },
    { id: 'foeHaste', name: '광폭 순환', desc: '물리 공격 110% 피해, 자신을 3턴 가속.', type: 'active', level: 1, chance: .3, cooldown: 4, multiplier: 1.1, effect: 'haste', statusTurns: 3, manaCost: 0 },
    { id: 'foeFrenzy', name: '촉수 난무', desc: '물리 공격 후 1회의 추가타.', type: 'active', level: 1, chance: .22, cooldown: 5, multiplier: 1.35, extraAttacks: 1, extraAttackMultiplier: .7, manaCost: 0 },
];
export const PROFILES: Record<string, {
    name: string;
    hint: string;
    skills: string[];
    defense: number;
    resist: number;
    evasion: number;
    speed: number;
}> = {
    swift: { name: '날쌘 개체', hint: '기민·명중으로 회피에 대응하세요.', skills: [], defense: .7, resist: .8, evasion: .14, speed: 1.4 },
    armored: { name: '단단한 비늘', hint: '마법 공격이나 방어 관통에 약합니다.', skills: ['foeCrush'], defense: 2.2, resist: .55, evasion: 0, speed: .7 },
    arcane: { name: '마력 생물', hint: '마법 방어로 버티고 물리 공격을 활용하세요.', skills: ['foeShock'], defense: .6, resist: 2.1, evasion: .03, speed: 1 },
    venom: { name: '독성 생물', hint: '출혈을 버틸 회복과 체력을 준비하세요.', skills: ['foeVenom'], defense: 1, resist: 1, evasion: .04, speed: 1.1 },
    silencer: { name: '침묵하는 생물', hint: '액티브를 봉인하는 침묵에 대비하세요.', skills: ['foeSilence'], defense: .9, resist: 1.1, evasion: .06, speed: 1.05 },
    controller: { name: '조류 제어자', hint: '감속·기절로 턴 우선권을 빼앗습니다.', skills: ['foeSlow', 'foeCrush'], defense: 1.2, resist: 1.3, evasion: .02, speed: .85 },
    frenzy: { name: '광폭 포식자', hint: '한 번의 공격 뒤 추가타가 이어집니다.', skills: ['foeFrenzy', 'foeHaste'], defense: 1.1, resist: .9, evasion: .08, speed: 1.25 },
    venomBoss: { name: '독성 보스', hint: '출혈과 감속을 번갈아 사용합니다.', skills: ['foeVenom', 'foeSlow'], defense: 1.25, resist: 1.05, evasion: .06, speed: 1.05 },
    arcaneBoss: { name: '신탁 보스', hint: '마법 공격과 침묵으로 편성을 흔듭니다.', skills: ['foeShock', 'foeSilence'], defense: .95, resist: 1.45, evasion: .05, speed: 1.1 },
    boss: { name: '심연 보스', hint: '침묵·감속·추가타를 모두 사용합니다.', skills: ['foeSilence', 'foeSlow', 'foeFrenzy', 'tentacleBarrage'], defense: 1.35, resist: 1.35, evasion: .08, speed: 1.05 },
    stormEel: { name: '폭풍 곰치', hint: '플레이어도 배울 수 있는 감속 전류를 사용합니다.', skills: ['electricBite', 'foeSilence'], defense: 1.05, resist: 1.25, evasion: .04, speed: 1.1 },
};
const profileIds: Record<string, string> = {
    minnow: 'swift', carp: 'armored', perch: 'swift', mackerel: 'swift', ray: 'armored', puffer: 'venom', lionfish: 'venom', eel: 'arcane', barracuda: 'swift', ghost: 'arcane', angler: 'arcane', shark: 'armored', viper: 'venom', squid: 'arcane', leviathan: 'armored', moonfish: 'arcane', dragon: 'swift', ancient: 'armored',
    seahorse: 'silencer', needlefish: 'swift', tidejelly: 'controller', emberEel: 'stormEel', ashRay: 'armored', magmaPuffer: 'venomBoss', cinderKoi: 'frenzy', starKoi: 'arcane', prismRay: 'controller', voidGuppy: 'silencer', abyssManta: 'frenzy', grottoWarden: 'stormEel', kelpHydra: 'venomBoss', anchorWraith: 'controller', magmaKraken: 'frenzy', templeOracle: 'arcaneBoss', abyssSovereign: 'boss', starfallSeraph: 'boss'
};
export function profile(id: string) { return PROFILES[profileIds[id] || 'armored']; }
/** Single source for live encounters, codex previews and simulation fixtures. */
export function enemyStats(f: { id: string; hp: number; attack: number; defense: number; level: number }, boss = false): Stats {
    const p = profile(f.id), level = monsterLevelScale(f.level), bossScale = bossLevelScale(f.level);
    return {
        hp: Math.round(f.hp * MONSTER_TUNING.hpMultiplier * level.hp * (boss ? bossScale.hp : 1)),
        attack: Math.round(f.attack * MONSTER_TUNING.attackMultiplier * level.attack * (boss ? bossScale.attack : 1)),
        magic: Math.round(f.attack * MONSTER_TUNING.attackMultiplier * level.attack * 1.15 * (boss ? bossScale.magic : 1)),
        defense: Math.round(f.defense * MONSTER_TUNING.defenseMultiplier * level.defense * p.defense),
        resist: Math.round(f.defense * MONSTER_TUNING.defenseMultiplier * level.defense * p.resist),
        crit: boss ? .08 : 0, accuracy: .95 + f.level * .002,
        evasion: p.evasion + (p === PROFILES.swift ? Math.min(.2, Math.max(0, f.level - 5) * .004) : 0),
        speed: Math.round((9 + f.level * .35) * p.speed), mana: 100, manaRegen: 10,
    };
}
export function scaledEnemyStats(f: Parameters<typeof enemyStats>[0] & { powerMultiplier?: number }, options: { boss?: boolean; tier?: number; wave?: number } = {}): Stats {
    const foe = enemyStats(f, options.boss), power = Math.max(1, f.powerMultiplier || 1);
    const pressure = options.wave === undefined ? { hp: 1, attack: 1, defense: 1 } : dungeonPressure(options.wave);
    foe.hp = Math.round(foe.hp * tierHealth(options.tier || 0) * power * pressure.hp);
    foe.attack = Math.round(foe.attack * tierAttack(options.tier || 0) * power * pressure.attack);
    foe.magic = Math.round((foe.magic || 0) * tierAttack(options.tier || 0) * power * pressure.attack);
    foe.defense = Math.round(foe.defense * Math.sqrt(power) * pressure.defense);
    foe.resist = Math.round((foe.resist || 0) * Math.sqrt(power) * pressure.defense);
    return foe;
}
