export type Attribute = 'str' | 'dex' | 'int' | 'vit' | 'wis' | 'luk';
export type Stats = {
    /** Additive experience bonus; 0.1 means +10%. Includes permanent sources. */
    expBonus?: number;
    goldBonus?: number;
    /** Additional item drop chance in percentage points (0.05 = +5%). */
    dropBonus?: number;
    /** Additional pearls granted on reincarnation, kept as a data-driven stat. */
    rebirthBonus?: number;
    /** Extra gold multiplier applied to dungeon clear rewards. */
    dungeonGoldBonus?: number;
    magic?: number;
    resist?: number;
    accuracy?: number;
    evasion?: number;
    critDamage?: number;
    speed?: number;
    mana?: number;
    manaRegen?: number;
    /** 턴당 체력 회복. 행동할 때마다(연속·추가 행동 포함) 이만큼 회복합니다. 체질로 오릅니다. */
    hpRegen?: number;
    penetration?: number;
    lifesteal?: number;
    /** 올라운드 밸런스의 원시 피해. 직접 배분한 여섯 능력치로만 계산하며 장비·버프는 제외. */
    harmony?: number;
    /** 반격: 맞을 때마다 (내 물리 방어 × 이 값)을 공격자에게 돌려줍니다. 직업의 방어 친화도가 곱해진 최종값. */
    thorns?: number;
    /** v26.6 손가락 자르기 단계(최대 3). 주사위의 최저 배율을 올리고 최고 배율을 낮춥니다. */
    diceTrim?: number;
    /** v27.2 무리 조우 확률 증가(0.5 = +50%). 탱커 계보 패시브가 올립니다. */
    swarmFind?: number;
    /** 출혈·중독·화상 모두의 지속 피해 증가율. 0.2 = +20%. */
    dotBonus?: number;
    /** v27.57 종류별 지속 피해 증가율(공용 dotBonus에 더해짐). */
    bleedBonus?: number;
    poisonBonus?: number;
    burnBonus?: number;
    /** 방어 비례 피해·반격이 얼마나 제대로 발휘되는지(0.2~1). 방어 배율이 높은 수호 계열일수록 1에 가깝습니다. */
    guardAffinity?: number;
    /** v25.14 마법 방어 비례 피해가 발휘되는 정도(0.2~1). 마법 방어 배율이 높은 결계 계열일수록 1. */
    wardAffinity?: number;
    /** 회복 직업이면 1. 회복이 필요 없을 때 쓴 회복 기술도 피해가 줄지 않습니다. */
    healFocus?: number;
    /** 마법 직업의 기본 공격이 마력 평타(마법 공격 × arcaneStrikeRatio, 마나 없음)로 바뀔 확률. */
    arcaneStrike?: number;
    /** v22 장비 규칙 옵션. 기존 기술 규칙의 숫자 하나만 바꿉니다(상한은 data/gear.ts RULE_CAPS). */
    stunBonus?: number;
    controlBonus?: number;
    dotTurnsBonus?: number;
    poisonStackBonus?: number;
    arcaneRatioBonus?: number;
    followUpBonus?: number;
    healBonus?: number;
    executeBonus?: number;
    /** v24.2 진행도 비례 피해의 기준값(능력치 계산이 채움). 도감 종 수 · log10(누적 처치) · √(던전 클리어+보스 처치) · log10(보유 골드). */
    codexPower?: number;
    catchPower?: number;
    huntPower?: number;
    goldPower?: number;
    /** v25.4 숙달한 직업 수(숙달 비례 피해의 기준값). */
    masteredPower?: number;
    /** v25.23 √(변종·황금 처치 수). 변종 기록 비례 피해의 기준값. */
    variantPower?: number;
    /** v26.2 배분 능력치 원값(외길 계보의 능력치 비례 피해용). 능력치 계산이 채웁니다. */
    attrStr?: number; attrDex?: number; attrInt?: number; attrVit?: number; attrWis?: number; attrLuk?: number;
    /** v25.23 변종 조우 확률 증가(0.5 = ×1.5). 섀도어 계보 패시브. */
    variantFind?: number;
    /** v25.23 처치마다 황금 개체가 될 확률(그 한 마리 골드 10배). */
    goldenFind?: number;
    /** v27.18 극 치명타 확률: 치명타 확률이 상한(60%)을 넘은 몫. 치명타가 뜬 뒤 이 확률로 극 치명타(치명 피해 × superCritBonus). */
    superCrit?: number;
    hp: number;
    attack: number;
    defense: number;
    crit: number;
};
export type CombatStats = Required<Stats>;
/** 진행도 비례 기능이 세는 기록. */
export type CountSource = 'codex' | 'catch' | 'hunt' | 'species' | 'gold' | 'rebirth' | 'mastered' | 'variant' | 'str' | 'dex' | 'int' | 'vit' | 'wis' | 'luk';
export type StatusEffects = {
    dot?: {
        damage: number;
        turns: number;
        name: string;
        /** 중첩형 지속 피해(중독)의 현재 중첩 수와 한 중첩당 피해. damage = perStack × stacks. */
        stacks?: number;
        perStack?: number;
    };
    /** v27.17 중독: 출혈과 별개 상태이상. 걸릴 때마다 한 중첩씩 쌓이고(상한 STATUS_TUNING.poisonMaxStacks + 포화) 지속이 갱신됩니다. 틱 피해 = (perStack + hpTick) × stacks. */
    poison?: { perStack: number; stacks: number; turns: number; hpTick: number };
    /** v27.48 화상: 중독처럼 쌓이지만(최대 STATUS_TUNING.burnMaxStacks) 출혈처럼 받는 직접 피해를 키웁니다(burnVulnerability). */
    burn?: { perStack: number; stacks: number; turns: number; hpTick: number };
    weaken?: number;
    silence?: number;
    slow?: number;
    haste?: number;
    /** 상태이상이 풀린 뒤 같은 상태이상에 걸리지 않는 남은 턴(자기 행동마다 1씩 줄어듭니다). */
    immune?: Partial<Record<'stun' | 'bleed' | 'poison' | 'burn' | 'weaken' | 'silence' | 'slow', number>>;
    /** v25 일곱 글자: 이번 전투에 새긴 인. */
    seals?: string[];
    /** v25 타임 리와인드를 이번 전투에 썼는지. */
    timeUsed?: boolean;
    /** v25 이번 전투에 無로 막은 횟수. */
    lastStand?: number;
};
export type Item = {
    /** v27.27 상점에서 산 장비의 구매가(골드). 판매가는 이 값의 절반을 넘지 않습니다. */
    paid?: number;
    enhance?: number;
    style?: "physical" | "magic" | "balanced";
    description?: string;
    locked?: boolean;
    relic?: string;
    /** v21 이전 장비와 유물의 단일 옵션. */
    affix?: {
        stat: keyof Stats;
        value: number;
        name: string;
    };
    /** v22 등급 수만큼 붙는 옵션(0~6개). */
    affixes?: import('./data/gear').ItemAffix[];
    /** 드롭한 사냥터·던전 id. */
    origin?: string;
    id: string;
    name: string;
    slot: 'rod' | 'coat' | 'charm';
    rarity: number;
    power: number;
    level: number;
};
export type Skill = {
    /** A rare native technique requires this much mastery in its owning job. */
    unlockJobMastery?: number;
    sourceEnemySkill?: string;
    /** Extra mastery for the current job and all equipped usable skills. */
    masteryGain?: { bossOnly?: boolean; enemyIds?: string[]; bonusByLevel: number[] };
    rebirth?: number;
    id: string;
    name: string;
    desc: string;
    type: 'active' | 'passive';
    level: number;
    job?: string;
    chance: number;
    cooldown: number;
    multiplier: number;
    effect?: 'heal' | 'stun' | 'bleed' | 'poison' | 'burn' | 'weaken' | 'drain' | 'silence' | 'slow' | 'haste';
    /** split: 원시 피해를 물리·마법 절반씩 나누어 각각 방어를 적용하는 한 번의 공격. */
    damageType?: 'physical' | 'magic' | 'split';
    cost?: number;
    manaCost?: number;
    accuracyBonus?: number;
    penetrationBonus?: number;
    damageBonusCondition?: 'bleeding' | 'weakened' | 'controlled' | 'lowHp';
    conditionalDamageBonus?: number;
    cleanseSelf?: boolean;
    healRatio?: number;
    drainRatio?: number;
    condition?: 'wounded' | 'healthyTarget' | 'afflicted';
    /** v27.69 사용하면 이만큼의 턴 동안 모든 상태이상 면역(몬스터 각성). */
    wardTurns?: number;
    /** defense: 물리 방어 × 비율을 더함(방어 친화도 적용). dual: (물리+마법 공격)/2를 기반으로 사용. swap: 피해 유형과 반대 공격력을 기준값으로(물리 계수 마법 피해 등). */
    scaling?: 'hp' | 'mana' | 'hybrid' | 'harmony' | 'defense' | 'resist' | 'dual' | 'codex' | 'catch' | 'hunt' | 'gold' | 'mastered' | 'luck' | 'variant' | 'swap' | 'attr';
    /** v26.2 scaling 'attr'가 비례하는 능력치. 기준값 += 능력치 × scalingRatio. */
    scalingAttribute?: Attribute;
    /** v24.2 진행도 비례 패시브: 기록 per마다 bonus를 더합니다(최대 cap번). */
    perCount?: { source: CountSource; per: number; bonus: Partial<Stats>; cap: number }[];
    /** v24.2 도박: 쓸 때마다 피해 배율을 [min, max]에서, 명중을 ±accuracy에서 무작위로 굴립니다. */
    gamble?: { min: number; max: number; accuracy?: number };
    /** v26.6 주사위: 능력치(attribute) per마다 주사위 1개(최대 max). 가장 높은 눈이 1이면 ×low, 6이면 ×high(눈마다 같은 비율로 커짐). 손가락 자르기(diceTrim)로 양 끝을 좁힐 수 있습니다. */
    dice?: { attribute: Attribute; per: number; max: number; low: number; high: number };
    /** v24.2 올인: 현재 체력의 hpRatio와 마나 전부를 걸고, (건 체력 × hpScale + 건 마나 × manaScale)을 피해에 더합니다. */
    allIn?: { hpRatio: number; hpScale: number; manaScale: number; heal?: number };
    /** v26.3 순수 회복: 공격하지 않고 회복만 합니다(명중·피해·반격·추가타 없음). */
    healOnly?: boolean;
    /** v25 타임 디스토션: 반드시 명중합니다. */
    sureHit?: boolean;
    /** v25 시간: 이 행동 뒤 곧바로 한 번 더 행동합니다(연속 행동 횟수와 별개). */
    extraTurn?: boolean;
    /** v25 타임 리와인드: 나와 상대의 체력·마나를 모두 가득 채웁니다. 전투당 1회. */
    restoreAll?: boolean;
    /** v25 반동: 준 피해 × recoil만큼 자신도 받습니다(반동으로는 체력 1 아래로 내려가지 않음). */
    recoil?: number;
    /** v25 자기 상태이상: 쓰고 나면 자신이 기절·감속·약화됩니다. waivedBy 기술을 장착하면 생략. */
    selfEffect?: { status: 'stun' | 'slow' | 'weaken'; turns: number; waivedBy?: string };
    /** v25 無: 쓰러질 피해를 받으면 체력 1로 버팁니다(전투당 charges번). 버틸 때마다 최대 체력 × heal을 되찾습니다. */
    lastStand?: { charges: number; chargesPerLevel?: number; heal?: number };
    /** v25.5 재사용 대기 초기화: 조건(치명타·처치·연속 행동)이 맞으면 chance 확률로 대기 중인 액티브를 되돌립니다. pick: longest 가장 긴 대기 하나, first 편성 순서 첫 번째, all 전부. */
    cooldownReset?: { on: 'crit' | 'kill' | 'chain'; chance: number; pick: 'longest' | 'first' | 'all' };
    /** v25.5 동시 시전 가능. 같은 표시가 있는 액티브끼리 한 행동에 함께 나갑니다. */
    multicast?: boolean;
    /** v25 일곱 글자: 쓰면 이번 전투의 인(印)을 하나 새깁니다. */
    seal?: boolean;
    /** v25 魂: 이번 전투에 새긴 인 1개마다 피해 +sealPower. */
    sealPower?: number;
    /** v25 天: 일곱 글자를 모두 장착하고 여섯 인을 새기면 (물리+마법 공격) × (base + 일곱 글자 숙련 합 × perLevel) 고정 피해와 기절. */
    sealFinale?: { base: number; perLevel: number; stun: number };
    /** v25 해금 사슬: 이 기술의 숙련이 level 단계에 닿아야 습득합니다. */
    unlockAfter?: { skill: string; level: number };
    /** v25 숙련 Lv.1 전에는 효과를 ???로 감춥니다. */
    veiled?: boolean;
    /** v24.2 노래: 음유시인 계보 직업만 장착할 수 있습니다(AP 0). */
    song?: boolean;
    /** v24.2 골드 투척: 보유 골드의 ratio(최대 cap)를 쓰고, 쓴 골드 × scale을 피해에 더합니다. */
    goldSpend?: { ratio: number; cap: number; scale: number };
    /** v24.2 사냥감 연구: 보스·지정 몬스터에게 직접 피해 +preyBonus. */
    preyBonus?: number;
    scalingRatio?: number;
    statusTurns?: number;
    /** 이 기술이 거는 지속 피해 비율(기본 SKILL_FORMULA.bleedRatio)과 이름(기본 출혈). */
    dotRatio?: number;
    dotName?: string;
    /** true면 같은 중첩형 지속 피해에 겹쳐 쌓입니다(최대 STATUS_TUNING.poisonMaxStacks, 지속 시간 갱신). */
    /** Number of capped follow-up hits after the main hit. */
    extraAttacks?: number;
    /** Damage multiplier used by each follow-up hit. */
    extraAttackMultiplier?: number;
    /** 공용 기술 중 SP 없이 레벨 조건만으로 자동 습득하는 기술. */
    freeCommon?: boolean;
    masteryMilestones?: number[];
    masteryAP?: number;
    masteryBonus?: Partial<Stats>;
    /** Exact growth stages; index 0 is the free job skill. Negative AP is allowed. */
    levelEffects?: { cost?: number; bonus?: Partial<Stats>; penaltyRelief?: number }[];
    /** 환생 1회마다 더하는 능력치(최대 SKILL_FORMULA.perRebirthCap회). 환생할수록 강해지는 패시브에 씁니다. */
    perRebirth?: Partial<Stats>;
    /** 피해 없이 상태이상만 거는 기술. 명중 판정만 하고 직접 피해·반격·흡혈·추가타가 없습니다(출혈·중독의 턴당 피해는 그대로). */
    statusOnly?: boolean;
    /** 장착하면 현재 직업의 마이너스 배율 보정을 이 비율만큼 되돌립니다(0~1). 여러 개면 가장 큰 값 하나만 적용합니다. */
    penaltyRelief?: number;
    bonus?: Partial<Stats>;
    rankEffects?: {
        apReduction?: number;
        manaReduction?: number;
        chanceIncrease?: number;
        cooldownReduction?: number;
        multiplierScale?: number;
        bonusScale?: number;
    };
};
export type Enemy = {
    /** v27.16 양쪽 체력이 그대로인 턴 수. 오래 이어지면 몬스터가 달아난 것으로 보고 새 몬스터를 맞이합니다. */
    stale?: number;
    /** 무리 규모(N). 무리 전체가 체력 ×N인 한 개체입니다. 없으면 한 마리. */
    swarm?: number;
    /** v25.19 변종 종류(무리·거대·심연 변이·별빛). 없으면 보통 개체. */
    variant?: 'giant' | 'abyssal' | 'starlit' | 'swarm';
    combatStats?: Stats;
    effects?: StatusEffects;
    cooldowns?: Record<string, number>;
    skills?: string[];
    mana?: number;
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    exp: number;
    gold: number;
    boss: boolean;
    stun: number;
};
/** 한 번의 행동 결과. 전투 화면은 문자열 대신 이 값으로 피해·치명·회피·추가타·흡혈을 표시합니다. */
/**
 * 타격 하나. value는 실제로 깎인 체력(남은 체력에 막힘)이고 규칙(반동·체력 막대·처치)이 씁니다.
 * v27.75 raw는 계산된 피해(남은 체력에 막히기 전). value와 다를 때만 적고, 전투 기록·연출 숫자는 raw ?? value를 보여 줍니다.
 */
export type CombatHit = { kind: 'main' | 'follow'; value: number; raw?: number; critical: boolean; miss: boolean; /** v27.18 극 치명타 */ superCritical?: boolean };
export type CombatEvent = {
    actor: string; skillId?: string; skillName: string; damageType: 'physical' | 'magic' | 'split';
    hits: CombatHit[]; total: number; healed: number; drained: number;
    statuses: { id: string; turns: number; onSelf?: boolean }[];
    /** 면역으로 막힌 상태이상(있을 때만). */
    immune?: string;
    /** 도박 기술의 피해 배율 굴림(있을 때만). */
    gamble?: number;
    /** v26.4 굴린 주사위 눈(있을 때만). */
    dice?: number[];
    /** v25: 곧바로 한 번 더 행동(선행·찰). */
    extraTurn?: boolean;
    /** v25: 天 발동. */
    finale?: boolean;
    /** v25.5 이 행동으로 재사용 대기가 초기화된 기술 이름들. */
    cooldownReset?: string[];
    /** v25.5 동시 시전: 이 줄이 묶음의 몇 번째(0부터)이고 몇 개가 함께 나갔는지. 첫 줄은 이어서 나갈 기술 id를 들고 있습니다. */
    multicast?: { index: number; count: number; ids?: string[] };
    /** v25: 타임 리와인드로 모두 회복. */
    restored?: boolean;
    /** v25: 無로 버틴 쪽(heal은 되찾은 체력). self면 행동한 쪽이 자기 지속 피해·반격을 버틴 것입니다. */
    endured?: { heal: number; self?: boolean };
    /** 행동 시작 때 턴당 체력 회복으로 되찾은 체력(있을 때만). */
    regen?: number;
    dot?: { name: string; value: number }; reflected?: number; /** v25.25 반격 흡혈로 맞은 쪽이 회복한 양. */ reflectHeal?: number; stunned?: boolean; defeated?: boolean; silenced?: boolean; cleansed?: boolean; linked?: boolean;
    /** 연속 행동 번호: 이 턴에서 이 전투원의 몇 번째 행동인지(1부터). 오래된 로그에는 없습니다. */
    chain?: number;
};
export type LifeStart = { at: number; playMs: number; partial?: boolean };
/** 환생 한 번의 기록. realMs: 생 시작부터 환생까지 실제 시간, playMs: 그동안 사냥이 진행된 시간(부재중 정산 포함). */
export type RebirthRecord = { n: number; at: number; realMs: number; playMs: number; level: number; pearls: number; partial?: boolean };
export type Log = {
    id: number;
    text: string;
    /** 기록된 턴 번호(s.turn). 전투 화면이 턴 경계를 나누는 데 씁니다. 오래된 로그에는 없습니다. */
    turn?: number;
    type: 'battle' | 'reward' | 'system' | 'skill';
    /** 전투 로그의 구조화된 결과. 오래된 로그에는 없을 수 있습니다. */
    event?: CombatEvent;
};
export type GuildState = {
    name: string;
    level: number;
    xp: number;
    treasury: number;
    contribution: number;
    medals: number;
    research: Record<string, number>;
    missionKills: number;
    missionDungeons: number;
    missionClaimed: Record<string, boolean>;
    raidTier: number;
    raidBest: number;
    lastRaid: number;
};
export type State = {
    version: number;
    /** SP를 지급한 무릉도장 이정표 깊이. 환생해도 유지됩니다. */
    abyssMilestones?: number[];
    /** (구) 선택한 무리 사냥 규모. v25.19부터 무리는 변종으로 무작위 등장하며 이 값은 쓰지 않습니다. */
    swarm?: number;
    /** 직전 환생 방식에 따른 이번 생의 효과. 다음 환생 때 다시 정해집니다. */
    lifeBonus?: 'deep' | 'tailwind' | null;
    /** v26.1 지금 진행 중인 서버 이벤트(서버가 동기화 때 적음). 없으면 null. */
    event?: import('./data/events').ActiveEvent | null;
    /** v27.31 운영 페이지에서 닫은 사냥터·던전(서버가 동기화 때 적음). 없으면 null. */
    closed?: import('./data/world').Closures | null;
    /** v27.73 운영 페이지에서 연 문의 ??? 직업 id(서버가 동기화 때 적음). 없으면 null. 열려 있는 동안만 문이 열리고 doorsOpened에는 남지 않습니다. */
    openDoors?: string[] | null;
    skillSpecializations?: Record<string, string>;
    bossResearchClaims?: Record<string, boolean>;
    growthGoal?: { kind: 'skill' | 'job' | 'dungeon'; id: string; target?: number; notified?: boolean } | null;
    /** 마지막으로 자동 진행(사냥·던전·반복)이 끝나거나 바뀐 사유. 표시 전용이며 게임 규칙에 쓰지 않습니다. */
    runEnd?: { reason: string; turn: number } | null;
    /** 튜토리얼 카드. 없으면(기존 세이브) 표시하지 않습니다. hidden: 접기, skipped: 건너뛰기. */
    /** 모험 안내. done은 한 번 만족한 단계의 기록(턴)으로, 조건이 깨져도 되돌아가지 않습니다(v27.72). */
    tutorial?: { hidden?: boolean; skipped?: boolean; done?: Record<string, number> };
    /** 해금한 항해 기록 id → 해금 턴(-1은 도입 전에 이미 달성해 조용히 채운 기록). 환생 후에도 유지됩니다. */
    voyage?: Record<string, number>;
    /** v25.6 해금한 업적 id → 해금 턴. 환생 후에도 유지되며 보상은 해금 때 바로 받습니다. */
    achievements?: Record<string, number>;
    /** v26.1 장착한 칭호 id. undefined면 자동(가장 최근 달성), null이면 표시 안 함. */
    title?: string | null;
    /** v27.80 이름 옆 표시: 칭호 또는 계급장(채팅도 같음). 없으면 칭호. */
    badge?: 'title' | 'rank';
    /** v27.79 계급장: 처치 수로만 오르는 별도 레벨과 진급 포인트 특전. 환생해도 남습니다. 없으면 kills로 시작합니다. */
    rank?: import('./data/rank').RankState;
    /** v25.6 보상을 받은 업적 id. 영구 AP·배율은 받은 것만 셉니다. */
    achievementClaims?: Record<string, true>;
    /** v25.6 일일·주간 항해 목표판(한국 시간 기준 날짜·주 키). */
    daily?: import('./data/goals').GoalBoard;
    weekly?: import('./data/goals').GoalBoard;
    /** v25.6 이번 주 무릉도장 최고 깊이. settled는 보상을 정산한 지난주 키. */
    abyssWeek?: { key: string; best: number; dirty?: boolean; settled?: string };
    /** v25.8 사냥터별 처치한 최고 사냥터 난이도(차수). 이정표 세계석과 업적에 씁니다. */
    tideBest?: Record<string, number>;
    /** v25.12 결투 시즌(한국 시간 월). 월이 바뀌면 점수를 1000으로 되돌리고 지난 시즌 순위 보상을 한 번 정산합니다. */
    duelSeason?: { key: string; lastKey?: string; lastRank?: number };
    /** v27.43 제단: 마지막 신 도전 시각, 익명 기여 설정. 서버만 씁니다. */
    altar?: { challengeAt?: number; anonymous?: boolean; /** v27.54 신 도전 횟수·승리·가장 많이 깎은 신 체력 비율(0~1). 운영 통계용. */ tries?: number; wins?: number; best?: number; /** v27.72 공물을 바친 횟수(안내 단계 판정). */ offers?: number };
    /** v27.44 제단 진행 요약(서버가 동기화마다 채우는 표시용). */
    altarStatus?: import('./data/altar').AltarStatus;
    /** v25.11 공유 길드 소속 캐시(서버가 채움). 없으면 무소속. */
    guildMember?: { id: string; name: string; code?: string; leader: boolean; syncedAt: number };
    /** v25.11 이번 주 길드 기여 기록. sent*는 서버에 올린 값, 차이만 다음에 올립니다. */
    guildStats?: { key: string; catches: number; clears: number; bosses: number; abyss: number; sentCatches: number; sentClears: number; sentBosses: number; sentAbyss: number; sentAt: number };
    /** v25.6 계정 합계 캐시(캐릭터 슬롯 보너스). 서버가 저장 전에 채웁니다. 없으면 보너스 0. */
    account?: import('./data/account').AccountSummary;
    /** 이 세이브에 적용된 레벨당 능력치 포인트. 없으면 이전 규칙(레벨당 4)으로 보고 차액을 한 번 지급합니다. */
    statRate?: number;
    tide: number;
    abyssBest: number;
    shopSerial: number;
    /** v22 장비 분해로 얻는 정수. 옵션 재설정에 쓰며 환생해도 유지됩니다. */
    essence?: number;
    guild: GuildState;
    attributes: Record<Attribute, number>;
    statPoints: number;
    sp: number;
    peakLevel: number;
    learned: Record<string, number>;
    skillSpent: Record<string, number>;
    /** Paid inheritance is independent of growth and never fabricates mastery wins. */
    skillInheritances: Record<string, boolean>;
    skillPractice: Record<string, number>;
    /** v27.6 한계돌파 단계(기술 id → 0~limitBreak.max). 환생해도 유지됩니다. */
    limitBreaks?: Record<string, number>;
    /** v27.19 환생 유물이 세계석 구매에서 환생 횟수 제공으로 바뀌며, 이미 산 유물의 세계석을 돌려준 뒤 true. */
    relicRefunded?: boolean;
    jobMastery: Record<string, number>;
    unlockedJobs: string[];
    bookClaims: Record<string, number>;
    itemBook: Record<string, boolean>;
    target: string | null;
    presets: Record<string, {
        name: string;
        skills: string[];
    }>;
    mana: number;
    effects: StatusEffects;
    playerStun: number;
    name: string;
    level: number;
    exp: number;
    gold: number;
    pearls: number;
    rebirths: number;
    job: string;
    stage: string;
    running: boolean;
    hp: number;
    enemy: Enemy | null;
    turn: number;
    kills: number;
    deaths: number;
    recovery: number;
    lastTick: number;
    skills: string[];
    cooldowns: Record<string, number>;
    book: Record<string, number>;
    inventory: Item[];
    equipment: Record<string, Item | null>;
    permanent: Record<string, number>;
    /** 세계석 연구 재분배의 계정당 첫 1회 무료 반환을 썼는지. 없으면 false. */
    researchResetUsed?: boolean;
    /** v27.31 무료로 받은 세계석 연구 단계(재분배 때 반환하지 않음). limitBreak: 이미 한 한계돌파만큼 ‘한계의 문’을 무료로 받음. */
    researchGranted?: Record<string, number>;
    /** 숙련의 기억으로 생긴 숙련 소수점 누적(1/20 단위, 0~19). */
    masteryCarry?: number;
    /** 선별의 눈 자동 판매 켜짐 여부(설정). */
    autoSell?: boolean;
    /** v25.14 전투 화면 ‘문이 열렸습니다’ 알림 끄기(설정). */
    hideDoorNotice?: boolean;
    /** v25.15 설정: 능력치 ‘최대’ 투자 확인 창을 건너뜁니다. */
    skipStatConfirm?: boolean;
    /** v27.32 설정: 만날 무리의 최대 규모(0이면 무리 끔). 없으면 제한 없음. 상한을 넘게 뽑힌 무리는 상한 규모로 나옵니다. */
    swarmCap?: number;
    /** v25.7 환생 정리 방식(설정). 없으면 판매. */
    salvageMode?: 'sell' | 'dismantle';
    /** v25.21 누적 플레이 시간(ms). 턴이 진행될 때마다 더하고 환생해도 유지합니다(‘도전’ 업적). */
    playMs?: number;
    /** v27.63 이번 생의 시작: 실제 시각과 그때까지의 누적 플레이 시간. partial이면 업데이트 시점부터 잰 것(기존 세이브). */
    lifeStart?: LifeStart;
    /** v27.63 최근 환생 기록(최신이 끝, 최대 REBIRTH_LOG_KEEP개). */
    rebirthLog?: RebirthRecord[];
    /** 황금 개체를 잡은 횟수(몬스터별). */
    goldenBook?: Record<string, number>;
    /** v25.19 변종을 잡은 횟수(몬스터별 → 변종별). */
    variantBook?: Record<string, Partial<Record<'giant' | 'abyssal' | 'starlit' | 'swarm', number>>>;
    /** v27.80 몬스터별로 처치한 가장 높은 난이도(사냥터 난이도·던전 모드). 도감 5·6단계 조건에 씁니다. 환생해도 유지됩니다. */
    bookTier?: Record<string, number>;
    /** 이번 생에 걸린 서약. */
    vows?: Vows;
    /** 다음 생에 걸 서약 예약. 환생할 때 vows가 됩니다. */
    nextVows?: Vows;
    /** v27.73 스킬 화면 즐겨찾기(스킬 id). 전에는 브라우저에만 저장했고, 이제 세이브에 담아 기기를 옮겨도 따라갑니다. 환생·SP 환급·이번 생 초기화에도 유지. */
    skillPins?: string[];
    /** v27.73 스킬 화면에서 숨긴 스킬(스킬 id). 장착 중·검색 결과·‘숨김’ 탭에는 그대로 보입니다. 환생·SP 환급·이번 생 초기화에도 유지. */
    skillHidden?: string[];
    /** 윤회의 문: 이번 생에 문이 열린 ??? 직업(환생 때 추첨). */
    rebirthDoor?: string;
    /** v25.23 한 번이라도 열린 것을 본 문의 직업. 이후로는 시간·방문·조건과 상관없이 계속 열려 있습니다. */
    doorsOpened?: string[];
    dungeon: null | {
        id: string;
        wave: number;
        depth?: number;
        /** 반복 도전. left: 남은 추가 도전 횟수(null=실패할 때까지), until: 무릉도장 목표 깊이. */
        repeat?: { left: number | null; until?: number };
        /** v27.70 일반 던전 난이도(DUNGEON_MODES). 없으면 노말. 무릉도장은 쓰지 않습니다. */
        mode?: import('./data/balance').DungeonMode;
        /** v27.84 랜덤게임: 쌓인 판돈(배율 적용 전)과 목표 웨이브(0이면 없음). */
        stake?: { essence: number; pearls: number };
        until?: number;
    };
    /** v27.84 이번 생에 랜덤게임에 들어간 횟수(환생하면 0). */
    randomGameRuns?: number;
    clears: Record<string, number>;
    /** v27.81 헬·나이트메어 난이도 정복 횟수(난이도 → 던전 id → 횟수). 노말은 clears만 셉니다. 업적에 씁니다. */
    modeClears?: Partial<Record<import('./data/balance').DungeonMode, Record<string, number>>>;
    logs: Log[];
    logId: number;
    lastDuel: number;
    /** v26.2 오늘(한국 시간) 랭크 결투 횟수와 상대별 횟수. */
    duelDay?: { key: string; count: number; opponents: Record<string, number> };
    rating: number;
    wins: number;
    losses: number;
    bestStage: number;
    /** 오프라인 정산 중에만 true인 임시 표시(저장 전에 지웁니다). */
    catchingUp?: boolean;
    lastOffline: null | {
        seconds: number;
        kills: number;
        gold: number;
        exp: number;
    };
};
/** 서약. breath는 걸었는지, rough는 힘의 길·restraint는 절제 선택 단계(1~3). anchor·seal은 옛 잠든 힘(세이브 호환용). */
/** v27.84 anchor·seal은 옛 ‘잠든 힘’(지금은 던전 랜덤게임) 세이브 호환용으로만 남깁니다. restraint는 절제(1~3단계). */
export type Vows = { anchor?: boolean; breath?: boolean; rough?: number; restraint?: number; seal?: { kind: 'stage' | 'dungeon'; id: string; caught: number; exp: number } | null;
    /** v25.6 이번 생의 조건 카드: stage 지정 사냥터 경험치·골드 ×1.5, tree 지정 계열 직업 숙련 ×2, gold 골드 ×2·경험치 ×0.75. */
    focus?: { kind: 'stage' | 'tree' | 'gold'; id?: string } };
export type Snapshot = {
    /** v26.1 표시 칭호 이름(랭킹). */
    title?: string;
    /** v25.12 지난 시즌 순위(상위 3위만 배지). 시즌 이월 때 서버가 넣습니다. */
    seasonRank?: number;
    /** 걸어 둔 서약 배지(랭킹 표시). 예: ['anchor', 'rough2'] */
    vows?: string[];
    /** 세이브 버전. 랭킹·결투는 현재 버전의 스냅샷만 사용합니다. */
    season?: number;
    skillPractice?: Record<string, number>;
    skillSpecializations?: Record<string, string>;
    skillRanks?: Record<string, number>;
    skillMastery?: Record<string, number>;
    name: string;
    level: number;
    job: string;
    rebirths: number;
    stats: Stats;
    skills: string[];
    power: number;
    rating: number;
    guild?: string;
};
export type Action = {
    type: string;
    id?: string;
    value?: string;
};
export type DuelResult = {
    winner: 'player' | 'opponent' | 'draw';
    turns: number;
    logs: string[];
    /** 행동별 구조화 결과(턴 번호 포함). 결투 결과창이 전투 로그와 같은 줄로 보여 줍니다. */
    rounds?: { turn: number; event: CombatEvent }[];
    playerHp: number;
    opponentHp: number;
    opponent: string;
    ratingChange: number;
    training: boolean;
    playerHitChance: number;
    opponentHitChance: number;
    playerAccuracy: number;
    opponentAccuracy: number;
    playerEvasion: number;
    opponentEvasion: number;
};
