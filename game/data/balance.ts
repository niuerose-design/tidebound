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
    activeSlots: 4, passiveSlots: 3, inventoryCap: 60,
    // v22: 장비는 드물게 떨어집니다. 처치당 기본 0.1%(시간당 수백 마리를 잡아도 한두 개).
    // 행운·물건도감·연구·드롭 보너스는 이 확률에 곱해지는 상대 증가로 바뀝니다(구 기준 17%p당 +100%).
    dropChance: 0.001, dropBonusScale: 0.17, dropChanceCap: 0.01,
    // 던전 반복 정복 시 희귀 이상 확정 장비 확률(첫 정복·심연 5층마다는 항상).
    dungeonRepeatDrop: 0.05,
    // 처치 후 회복률(근거: scripts/check-recovery.mjs). 응급처치를 장착하면 승리마다 FIRST_AID_HEAL을 더합니다.
    healAfterKill: 0.08, recoveryTurns: 3,
    // Fish codex SP is deliberately paced for long-term mastery rather than early burst spending.
    // Individual research is a long-term collection track, not an early SP faucet.
    bookMilestones: [50, 500, 2500, 10000], duelCooldownMs: 60000, duelMaxTurns: 80,
    // 연속 행동: 상대보다 빠르면 행동마다 p = min(1, max(0, 계수 × log2(내 속도 / 상대 속도)))로 한 번 더 행동합니다. 턴당 최대 횟수까지.
    chainCoefficient: 0.5, chainMaxActions: 5,
};
export const MONSTER_TUNING = {
    // A strong single-stat build should still need several hours of victories
    // before the first rebirth. HP is the main pacing lever; attack and defense
    // remain readable so deaths do not turn the early game into a wall.
    hpMultiplier: 2.5,
    attackMultiplier: 1.15,
    // v24 몬스터 치명타: 기본 + 레벨당 증가(상한), 보스·날쌘 성향은 추가. 치명 피해는 플레이어 기본값(critMultiplier)과 같습니다.
    critBase: .04, critPerLevel: .0006, critCap: .1, critBoss: .04, critSwift: .04,
    defenseMultiplier: 1.1,
    bossMultiplier: 2.7,
    bossRewardMultiplier: 1.9,
    dungeonPreparationTurns: 3,
    dungeonHealAfterKill: .04,
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
    // v21 만능 항해사: 원시 피해도 연구·환생·직업 배율을 받고, 장착한 능력치 패시브의
    // 출신 직업이 서로 다를수록(최대 harmonyJobCap개) 직업당 harmonyPerJob만큼 강해집니다.
    harmonyScale: 2, harmonyPerJob: .15, harmonyJobCap: 6,
    // v21 회복 기술은 체력이 가득 차도 발동합니다. 체력이 healThreshold 이상일 때 쓰면
    // 회복 직업이 아닌 경우 그 공격의 피해가 idleHealDamage 배가 됩니다.
    idleHealDamage: .6,
    // v22.2 흡혈 상한: 한 번의 행동(추가타 포함)으로 회복하는 흡혈량은 최대 체력 × 흡혈률 × 이 값까지입니다.
    // 심연은 적의 체력이 높고 공격이 약한 소모전이라, 준 피해 비례 흡혈 3%만으로 도달 층이 3배가 되었습니다.
    lifestealHpCap: .025,
    // v21 방어 친화도: (직업 물리 방어 배율 − guardBase) ÷ guardSpan, guardFloor~1로 제한. 고정 보정 직업은 jobFactor로 환산한 배율을 씁니다.
    // 방어 비례 피해와 반격은 이 값만큼만 발휘되어 계승해도 수호 계열만큼 강하지 않습니다.
    guardBase: .95, guardSpan: .5, guardFloor: .2,
    // 처형형 연계: 적 체력이 이 비율 이하일 때 lowHp 조건 보너스가 붙습니다.
    lowHpThreshold: .35,
    // v21.1 마력 평타: 마법 직업(마법 배율이 물리보다 0.05 이상 높음, 고정 보정의 반올림을 감안해 0.045로 판정)은 기본 공격 대신
    // 차수별 확률로 마법 공격 × arcaneStrikeRatio의 마법 피해를 줍니다. 마나를 쓰지 않습니다.
    arcaneStrikeRatio: .6, arcaneStrikeChance: [0, .7, .8, .9, .95, .95],
    // v21.2 전용 기술: signatureTier 이상 직업의 기술은 자기 계보(조상·후손 직업)에서 온전히,
    // 계보 밖에서 계승하면 배율·패시브 수치가 signatureScale 배로 발휘됩니다. 1~3차 기술은 자유롭게 조합됩니다.
    signatureTier: 4, signatureScale: .7,
    // v24 환생 비례 패시브(perRebirth): 환생 횟수는 이 값까지만 셉니다.
    perRebirthCap: 30,
    // v23.1 고정 수치 직업 보정의 환산 기준: 차수별 밸런스 점검 레벨(1차 Lv.15 · 2차 Lv.40 · 3차 Lv.50)에서
    // 장비 없이 배분했을 때의 능력치입니다. 고정 보정을 옛 배율로 되돌려 방어 친화도·마력 평타 판정에 씁니다.
    // v24에서 2·3차 고정 보정을 0.44·0.45배로 줄이면서 판정이 그대로 유지되도록 기준값도 같은 배율로 줄였습니다.
    jobFlatReference: {
        1: { attack: 125, magic: 135, hp: 510, defense: 35, resist: 32 },
        2: { attack: 132, magic: 145, hp: 497, defense: 38, resist: 33 },
        3: { attack: 167, magic: 185, hp: 621, defense: 47, resist: 41 },
    } as Record<number, Record<'attack' | 'magic' | 'hp' | 'defense' | 'resist', number>>,
};
// 상태이상 수치와 지속시간은 전투 코드와 분리해 여기서 조정합니다.
export const STATUS_TUNING = {
    weakenTurns: 3,
    bleedTurns: 3,
    /** v21.3 중독 중첩 상한. 중첩형 기술은 겹칠 때마다 한 중첩씩 쌓고 지속 시간을 갱신합니다. */
    poisonMaxStacks: 5,
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
    { id: 'slow', name: '감속', kind: '속도 감소', description: '속도가 35% 낮아져 선공·명중 보정·연속 행동에 불리해집니다.', detail: '선공은 다음 턴부터, 연속 행동 확률은 다음 판정부터 반영됩니다.' },
    { id: 'haste', name: '가속', kind: '속도 증가', description: '속도가 35% 높아져 선공·명중 보정·연속 행동에 유리해집니다.', detail: '상대보다 빨라지면 연속 행동 확률이 올라갑니다. 선공은 다음 턴부터, 연속 행동 확률은 다음 판정부터 반영됩니다.' },
] as const;
export const xpNeeded = (level: number) => Math.floor(BALANCE.xpBase * Math.pow(BALANCE.xpGrowth, Math.min(29, level - 1)) * (level > 30 ? Math.pow(level / 30, 2.3) : 1));
// v22: 등급 번호 = 붙는 옵션 수(0~6). 0~3은 기존 등급과 같은 이름·배율입니다.
export const RARITIES = [{ name: '일반', color: '#9dadaf', factor: 1 }, { name: '희귀', color: '#68b6ee', factor: 1.5 }, { name: '영웅', color: '#bf96ef', factor: 2.2 }, { name: '전설', color: '#e7be71', factor: 3.3 }, { name: '신화', color: '#f08a6c', factor: 3.9 }, { name: '고대', color: '#5fd0b5', factor: 4.5 }, { name: '태초', color: '#ff6fb5', factor: 5.2 }];
export const SLOTS = { rod: '낚싯대', coat: '방어구', charm: '나침반' };
/** 응급처치(공용 패시브): 승리 1회당 최대 체력 회복 비율. 무리 규모와 관계없이 한 번만 발동합니다. */
export const FIRST_AID_HEAL = .04;
