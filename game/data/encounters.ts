import { tierHealth, tierAttack } from '../systems/meta';
import type { Skill, Stats } from '../types';
import { bossLevelScale, monsterLevelScale, dungeonPressure, MONSTER_TUNING } from './balance';
export const ENEMY_SKILLS: Skill[] = [
    { id: 'foeShock', name: '전류 방출', desc: '마법 공격', type: 'active', level: 1, chance: .3, cooldown: 3, multiplier: 1.5, damageType: 'magic', manaCost: 0 },
    { id: 'foeVenom', name: '독가시', desc: '피해 없이 5턴 지속 피해.', type: 'active', level: 1, chance: .25, cooldown: 4, multiplier: 1, effect: 'bleed', statusTurns: 5, statusOnly: true, manaCost: 0 },
    { id: 'foeCrush', name: '꼬리 후려치기', desc: '피해 없이 2턴 기절.', type: 'active', level: 1, chance: .2, cooldown: 5, multiplier: 1.3, effect: 'stun', statusTurns: 2, statusOnly: true, manaCost: 0 },
    { id: 'foeSilence', name: '무음의 포효', desc: '피해 없이 4턴 침묵.', type: 'active', level: 1, chance: .28, cooldown: 5, multiplier: 1.15, effect: 'silence', damageType: 'magic', statusTurns: 4, statusOnly: true, manaCost: 0 },
    { id: 'foeSlow', name: '점액 조류', desc: '피해 없이 5턴 감속.', type: 'active', level: 1, chance: .3, cooldown: 4, multiplier: 1.1, effect: 'slow', damageType: 'magic', statusTurns: 5, statusOnly: true, manaCost: 0 },
    { id: 'foeHaste', name: '광폭 순환', desc: '물리 공격 110% 피해, 자신을 3턴 가속.', type: 'active', level: 1, chance: .3, cooldown: 4, multiplier: 1.1, effect: 'haste', statusTurns: 3, manaCost: 0 },
    { id: 'foeFrenzy', name: '촉수 난무', desc: '물리 공격 후 1회의 추가타.', type: 'active', level: 1, chance: .22, cooldown: 5, multiplier: 1.35, extraAttacks: 1, extraAttackMultiplier: .7, manaCost: 0 },
    // v27 피해 유형 다양화: 물리 출혈기 · 마법 약화기 · 복합 강타.
    { id: 'foeBarbs', name: '가시 찌르기', desc: '물리 공격 105% 피해 + 3턴 출혈.', type: 'active', level: 1, chance: .24, cooldown: 4, multiplier: 1.05, effect: 'bleed', statusTurns: 3, manaCost: 0 },
    { id: 'foeInkBurst', name: '먹물 폭발', desc: '마법 공격 115% 피해 + 3턴 약화.', type: 'active', level: 1, chance: .26, cooldown: 4, multiplier: 1.15, damageType: 'magic', effect: 'weaken', statusTurns: 3, manaCost: 0 },
    { id: 'foeShellRam', name: '비늘 들이받기', desc: '물리 공격 125% 피해.', type: 'active', level: 1, chance: .26, cooldown: 4, multiplier: 1.25, manaCost: 0 },
    { id: 'foeTideSlam', name: '조류 강타', desc: '복합 피해 120%. 물리·마법 방어를 절반씩 적용합니다.', type: 'active', level: 1, chance: .26, cooldown: 4, multiplier: 1.2, damageType: 'split', manaCost: 0 },
];
export const PROFILES: Record<string, {
    name: string;
    hint: string;
    skills: string[];
    /** v25.2 기본 공격도 마법 피해(마법 공격 수치 vs 마법 방어). 마력 생물·신탁 보스. */
    magicBasic?: boolean;
    /** v27 기본 공격이 복합 피해(물리·마법 절반씩). 조류 생물. */
    splitBasic?: boolean;
    defense: number;
    resist: number;
    evasion: number;
    speed: number;
}> = {
    swift: { name: '날쌘 개체', hint: '기민·명중으로 회피에 대응하세요. 가시로 출혈을 겁니다.', skills: ['foeBarbs'], defense: .7, resist: .8, evasion: .14, speed: 1.4 },
    armored: { name: '단단한 비늘', hint: '마법 공격이나 방어 관통에 약합니다. 물리 공격만 씁니다.', skills: ['foeCrush', 'foeShellRam'], defense: 2.2, resist: .55, evasion: 0, speed: .7 },
    arcane: { name: '마력 생물', hint: '마법 방어로 버티고 물리 공격을 활용하세요.', skills: ['foeShock'], magicBasic: true, defense: .6, resist: 2.1, evasion: .03, speed: 1 },
    venom: { name: '독성 생물', hint: '출혈을 버틸 회복과 체력을 준비하세요.', skills: ['foeVenom', 'foeBarbs'], defense: 1, resist: 1, evasion: .04, speed: 1.1 },
    silencer: { name: '침묵하는 생물', hint: '기본 공격부터 마법 피해. 액티브를 봉인하는 침묵과 마법 약화에 대비하세요.', skills: ['foeSilence', 'foeInkBurst'], magicBasic: true, defense: .9, resist: 1.1, evasion: .06, speed: 1.05 },
    controller: { name: '조류 제어자', hint: '기본 공격부터 복합 피해. 감속·기절로 턴 우선권을 빼앗습니다.', skills: ['foeSlow', 'foeCrush', 'foeTideSlam'], splitBasic: true, defense: 1.2, resist: 1.3, evasion: .02, speed: .85 },
    frenzy: { name: '광폭 포식자', hint: '한 번의 공격 뒤 추가타가 이어집니다.', skills: ['foeFrenzy', 'foeHaste'], defense: 1.1, resist: .9, evasion: .08, speed: 1.25 },
    venomBoss: { name: '독성 보스', hint: '출혈과 감속을 번갈아 사용합니다.', skills: ['foeVenom', 'foeSlow'], defense: 1.25, resist: 1.05, evasion: .06, speed: 1.05 },
    arcaneBoss: { name: '신탁 보스', hint: '마법 공격과 침묵으로 편성을 흔듭니다.', skills: ['foeShock', 'foeSilence'], magicBasic: true, defense: .95, resist: 1.45, evasion: .05, speed: 1.1 },
    boss: { name: '심연 보스', hint: '침묵·감속·추가타·복합 강타를 모두 사용합니다.', skills: ['foeSilence', 'foeSlow', 'foeFrenzy', 'tentacleBarrage', 'foeTideSlam'], defense: 1.35, resist: 1.35, evasion: .08, speed: 1.05 },
    // v27 조류 생물: 기본 공격부터 복합 피해. 물리·마법 방어 중 하나만 높은 빌드에 부담을 줍니다.
    tidal: { name: '조류 생물', hint: '기본 공격이 복합 피해라 물리·마법 방어를 고루 갖춰야 합니다.', skills: ['foeTideSlam', 'foeInkBurst'], splitBasic: true, defense: .9, resist: .9, evasion: .04, speed: 1 },
    stormEel: { name: '폭풍 곰치', hint: '기본 공격부터 마법(전류) 피해. 플레이어도 배울 수 있는 감속 전류를 사용합니다.', skills: ['electricBite', 'foeSilence'], magicBasic: true, defense: .85, resist: 1.1, evasion: .04, speed: 1.05 },
};
const profileIds: Record<string, string> = {
    minnow: 'swift', carp: 'armored', perch: 'tidal', mackerel: 'swift', ray: 'tidal', puffer: 'venom', lionfish: 'venom', eel: 'arcane', barracuda: 'swift', ghost: 'arcane', angler: 'arcane', shark: 'armored', viper: 'venom', squid: 'arcane', leviathan: 'armored', moonfish: 'arcane', dragon: 'swift', ancient: 'armored',
    seahorse: 'silencer', needlefish: 'swift', tidejelly: 'tidal', emberEel: 'stormEel', ashRay: 'armored', magmaPuffer: 'venomBoss', cinderKoi: 'frenzy', starKoi: 'arcane', prismRay: 'tidal', voidGuppy: 'silencer', abyssManta: 'frenzy', stormBarracuda: 'swift', eclipseMoonfish: 'arcane', novaManta: 'frenzy', ventCrab: 'armored', glassSquid: 'arcane', sulfurEel: 'venom', blindShark: 'frenzy', cinderAngler: 'arcane', ventLeviathan: 'armored', ventColossus: 'boss', grottoWarden: 'stormEel', kelpHydra: 'venomBoss', anchorWraith: 'controller', magmaKraken: 'frenzy', templeOracle: 'arcaneBoss', abyssSovereign: 'boss', starfallSeraph: 'boss'
};
export const profileId = (id: string) => profileIds[id] || 'armored';
export function profile(id: string) { return PROFILES[profileId(id)]; }
/** Single source for live encounters, codex previews and simulation fixtures. */
export function enemyStats(f: { id: string; hp: number; attack: number; defense: number; level: number }, boss = false): Stats {
    const p = profile(f.id), level = monsterLevelScale(f.level), bossScale = bossLevelScale(f.level);
    return {
        hp: Math.round(f.hp * MONSTER_TUNING.hpMultiplier * level.hp * (boss ? bossScale.hp : 1)),
        attack: Math.round(f.attack * MONSTER_TUNING.attackMultiplier * level.attack * (boss ? bossScale.attack : 1)),
        magic: Math.round(f.attack * MONSTER_TUNING.attackMultiplier * level.attack * 1.15 * (boss ? bossScale.magic : 1)),
        defense: Math.round(f.defense * MONSTER_TUNING.defenseMultiplier * level.defense * p.defense),
        resist: Math.round(f.defense * MONSTER_TUNING.defenseMultiplier * level.defense * p.resist),
        crit: Math.min(MONSTER_TUNING.critCap, MONSTER_TUNING.critBase + f.level * MONSTER_TUNING.critPerLevel) + (boss ? MONSTER_TUNING.critBoss : 0) + (p === PROFILES.swift || p === PROFILES.frenzy ? MONSTER_TUNING.critSwift : 0), accuracy: .95 + f.level * .002,
        evasion: p.evasion + (p === PROFILES.swift ? Math.min(.2, Math.max(0, f.level - 5) * .004) : 0),
        // v25.2: 속도 9 + 레벨 × .35 → 8 + 레벨 × .25. 고레벨에서 모든 빌드(특히 기민이 낮은 마법 빌드)가 몬스터보다 느려
        // 연속 행동을 과하게 허용했습니다(4차 마법 직업 승률 85% → 98%).
        speed: Math.round((8 + f.level * .25) * p.speed), mana: 100, manaRegen: 10,
    };
}
export function scaledEnemyStats(f: Parameters<typeof enemyStats>[0], options: { boss?: boolean; tier?: number; wave?: number } = {}): Stats {
    const foe = enemyStats(f, options.boss);
    const pressure = options.wave === undefined ? { hp: 1, attack: 1, defense: 1 } : dungeonPressure(options.wave);
    foe.hp = Math.round(foe.hp * tierHealth(options.tier || 0) * pressure.hp);
    foe.attack = Math.round(foe.attack * tierAttack(options.tier || 0) * pressure.attack);
    foe.magic = Math.round((foe.magic || 0) * tierAttack(options.tier || 0) * pressure.attack);
    foe.defense = Math.round(foe.defense * pressure.defense);
    foe.resist = Math.round((foe.resist || 0) * pressure.defense);
    return foe;
}
