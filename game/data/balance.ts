/** 가장 자주 수정할 밸런스. UI/저장 코드와 독립적입니다. */
/** 세이브 형식 버전. 바뀌면 migrations.ts가 이전 세이브를 변환하고, 랭킹은 같은 버전의 스냅샷만 보여줍니다. */
export const SAVE_VERSION = 8;
export const BALANCE = {
    turnMs: 2000, offlineCapSeconds: 86400, baseHp: 110, baseAttack: 13, baseDefense: 3,
    hpPerLevel: 14, attackPerLevel: 3, defensePerLevel: 1, baseCrit: 0.08,
    // Stage hopping used to make the first rebirth arrive in under an hour.
    // See scripts/check-progression-pace.mjs for gearless routing samples;
    // completion times vary substantially with the chosen job and loadout.
    // Gear luck, routing and inherited techniques still change the time to rebirth.
    critMultiplier: 1.65, xpBase: 35, xpGrowth: 1.33, jobLevel: 10, rebirthLevel: 30,
    // Legacy display values kept for save/config compatibility. Loadouts are now limited by total AP only.
    activeSlots: 4, passiveSlots: 3, inventoryCap: 60, dropChance: 0.17,
    healAfterKill: 0.16, recoveryTurns: 3,
    // Fish codex SP is deliberately paced for long-term mastery rather than early burst spending.
    // Individual research is a long-term collection track, not an early SP faucet.
    bookMilestones: [50, 500, 2500, 10000], duelCooldownMs: 60000, duelMaxTurns: 80,
};
export const MONSTER_TUNING = {
    // A strong single-stat build should still need several hours of victories
    // before the first rebirth. HP is the main pacing lever; attack and defense
    // remain readable so deaths do not turn the early game into a wall.
    hpMultiplier: 2.5,
    attackMultiplier: 1.15,
    defenseMultiplier: 1.1,
    bossMultiplier: 2.7,
    bossRewardMultiplier: 1.9,
    dungeonPreparationTurns: 3,
    dungeonHealAfterKill: .08,
} as const;
/** Entry-level fish stay approachable; higher-level fish are a real gearless wall. */
export function monsterLevelScale(level: number) {
    return { hp: 1 + Math.max(0, level - 5) * .035, attack: 1 + Math.max(0, level - 8) * .012, defense: 1 + Math.max(0, level - 10) * .006 };
}
export function bossLevelScale(level: number) {
    const growth = Math.min(1, Math.max(0, level - 14) / 24);
    return { hp: 2.1 + (MONSTER_TUNING.bossMultiplier - 2.1) * growth, attack: 1.2 + .25 * growth, magic: 1.08 + .17 * growth };
}
export function dungeonPressure(wave: number) {
    const index = Math.max(0, Math.min(4, wave));
    return { hp: 1.05 + index * .04, attack: 1.04 + index * .025, defense: 1 + index * .02 };
}
// 스킬 공식의 기본값. 전투 계산(combat.ts)과 스킬 설명(skill-description.ts)이 같은 값을 씁니다.
export const SKILL_FORMULA = {
    healThreshold: .8, woundedThreshold: .7, healRatio: .22,
    hpScaling: .08, manaScaling: .45, hybridHpScaling: .05, hybridManaScaling: .25,
    crushDefense: 1.5, weakenedDamage: .75, bleedRatio: .22, drainRatio: .25, extraAttackMultiplier: .65,
    // 육중 조화: 40 + 배분 포인트 합 × 0.8 + 가장 낮은 배분 포인트 × 12, 물리·마법 절반씩.
    // 초안(합 × 1.2 + 최저 × 6)은 편중 배분이 더 강해 check-all-rounder.mjs 결과로 조정했습니다.
    harmonyBase: 40, harmonyPerPoint: .8, harmonyPerLowest: 12, splitPhysical: .5,
};
// 상태이상 수치와 지속시간은 전투 코드와 분리해 여기서 조정합니다.
export const STATUS_TUNING = {
    weakenTurns: 3,
    bleedTurns: 3,
    silenceTurns: 2,
    slowTurns: 3,
    hasteTurns: 3,
    slowMultiplier: .35,
    hasteMultiplier: .35,
    /** Extra hits are intentionally capped so one proc cannot create runaway loops. */
    maxExtraAttacks: 2,
} as const;
export const STATUS_GUIDE = [
    { id: 'stun', name: '기절', kind: '행동 차단', description: '다음 행동을 건너뜁니다.', detail: '기절 중에도 출혈 같은 지속 피해는 먼저 처리됩니다.' },
    { id: 'silence', name: '침묵', kind: '스킬 차단', description: '지속 중 액티브 스킬을 사용할 수 없습니다.', detail: '기본 공격은 계속하며, 쿨다운·마나를 낭비하지 않습니다.' },
    { id: 'weaken', name: '약화', kind: '피해 감소', description: '주는 직접 피해가 25% 감소합니다.', detail: '물리·마법 등 다음 공격의 피해 계산에 적용됩니다.' },
    { id: 'bleed', name: '출혈', kind: '지속 피해', description: '행동할 때마다 고정 피해를 받습니다.', detail: '명중한 공격의 위력에 따라 출혈 피해가 정해지고 최대 3턴 지속됩니다.' },
    { id: 'slow', name: '감속', kind: '속도 감소', description: '속도가 35% 낮아져 선공과 명중 보정에 불리해집니다.', detail: '현재 라운드가 끝난 뒤 다음 라운드부터 선공 판정에 반영됩니다.' },
    { id: 'haste', name: '가속', kind: '속도 증가', description: '속도가 35% 높아져 선공과 명중 보정에 유리해집니다.', detail: '추가 공격을 만들지는 않으며, 기존 턴 구조 안에서 선공을 유리하게 만듭니다.' },
] as const;
export const xpNeeded = (level: number) => Math.floor(BALANCE.xpBase * Math.pow(BALANCE.xpGrowth, Math.min(29, level - 1)) * (level > 30 ? Math.pow(level / 30, 2.3) : 1));
export const RARITIES = [{ name: '일반', color: '#9dadaf', factor: 1 }, { name: '희귀', color: '#68b6ee', factor: 1.5 }, { name: '영웅', color: '#bf96ef', factor: 2.2 }, { name: '전설', color: '#e7be71', factor: 3.3 }];
export const SLOTS = { rod: '낚싯대', coat: '방어구', charm: '나침반' };
