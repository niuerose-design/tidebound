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
    penetration?: number;
    lifesteal?: number;
    /** 육중 조화의 원시 피해. 직접 배분한 여섯 능력치로만 계산하며 장비·버프는 제외. */
    harmony?: number;
    /** 반격: 맞을 때마다 (내 물리 방어 × 이 값)을 공격자에게 돌려줍니다. 직업의 방어 친화도가 곱해진 최종값. */
    thorns?: number;
    /** 출혈·중독 같은 지속 피해 증가율. 0.2 = +20%. */
    dotBonus?: number;
    /** 방어 비례 피해·반격이 얼마나 제대로 발휘되는지(0.2~1). 방어 배율이 높은 수호 계열일수록 1에 가깝습니다. */
    guardAffinity?: number;
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
    hp: number;
    attack: number;
    defense: number;
    crit: number;
};
export type CombatStats = Required<Stats>;
export type StatusEffects = {
    dot?: {
        damage: number;
        turns: number;
        name: string;
        /** 중첩형 지속 피해(중독)의 현재 중첩 수와 한 중첩당 피해. damage = perStack × stacks. */
        stacks?: number;
        perStack?: number;
    };
    weaken?: number;
    silence?: number;
    slow?: number;
    haste?: number;
};
export type Item = {
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
    /** 드롭한 낚시터·던전 id. */
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
    effect?: 'heal' | 'stun' | 'bleed' | 'weaken' | 'drain' | 'silence' | 'slow' | 'haste';
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
    condition?: 'wounded' | 'healthyTarget';
    /** defense: 물리 방어 × 비율을 더함(방어 친화도 적용). dual: (물리+마법 공격)/2를 기반으로 사용. */
    scaling?: 'hp' | 'mana' | 'hybrid' | 'harmony' | 'defense' | 'dual';
    scalingRatio?: number;
    statusTurns?: number;
    /** 이 기술이 거는 지속 피해 비율(기본 SKILL_FORMULA.bleedRatio)과 이름(기본 출혈). */
    dotRatio?: number;
    dotName?: string;
    /** true면 같은 중첩형 지속 피해에 겹쳐 쌓입니다(최대 STATUS_TUNING.poisonMaxStacks, 지속 시간 갱신). */
    dotStacks?: boolean;
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
    /** 무리 사냥 규모(N). 무리 전체가 체력 ×N인 한 개체입니다. 없으면 한 마리. */
    swarm?: number;
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
export type CombatHit = { kind: 'main' | 'follow'; value: number; critical: boolean; miss: boolean };
export type CombatEvent = {
    actor: string; skillId?: string; skillName: string; damageType: 'physical' | 'magic' | 'split';
    hits: CombatHit[]; total: number; healed: number; drained: number;
    statuses: { id: string; turns: number; onSelf?: boolean }[];
    dot?: { name: string; value: number }; reflected?: number; stunned?: boolean; defeated?: boolean; silenced?: boolean; cleansed?: boolean; linked?: boolean;
    /** 연속 행동 번호: 이 턴에서 이 전투원의 몇 번째 행동인지(1부터). 오래된 로그에는 없습니다. */
    chain?: number;
};
export type Log = {
    id: number;
    text: string;
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
    /** SP를 지급한 무한 심연 이정표 깊이. 환생해도 유지됩니다. */
    abyssMilestones?: number[];
    /** 선택한 무리 사냥 규모. 집중 사냥 중인 어종의 해금 조건을 충족할 때만 적용됩니다. */
    swarm?: number;
    /** 직전 환생 방식에 따른 이번 생의 효과. 다음 환생 때 다시 정해집니다. */
    lifeBonus?: 'deep' | 'tailwind' | null;
    skillSpecializations?: Record<string, string>;
    bossResearchClaims?: Record<string, boolean>;
    growthGoal?: { kind: 'skill' | 'job' | 'dungeon'; id: string; target?: number; notified?: boolean } | null;
    /** 마지막으로 자동 진행(낚시·던전·반복)이 끝나거나 바뀐 사유. 표시 전용이며 게임 규칙에 쓰지 않습니다. */
    runEnd?: { reason: string; turn: number } | null;
    /** 튜토리얼 카드. 없으면(기존 세이브) 표시하지 않습니다. hidden: 접기, skipped: 건너뛰기. */
    tutorial?: { hidden?: boolean; skipped?: boolean };
    /** 해금한 항해 기록 id → 해금 턴(-1은 도입 전에 이미 달성해 조용히 채운 기록). 환생 후에도 유지됩니다. */
    voyage?: Record<string, number>;
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
    /** 진주 연구 재분배의 계정당 첫 1회 무료 반환을 썼는지. 없으면 false. */
    researchResetUsed?: boolean;
    /** 숙련의 기억으로 생긴 숙련 소수점 누적(1/20 단위, 0~19). */
    masteryCarry?: number;
    /** 선별의 그물 자동 판매 켜짐 여부(설정). */
    autoSell?: boolean;
    /** 황금 개체를 잡은 횟수(어종별). */
    goldenBook?: Record<string, number>;
    /** 이번 생에 걸린 서약. */
    vows?: Vows;
    /** 다음 생에 걸 서약 예약. 환생할 때 vows가 됩니다. */
    nextVows?: Vows;
    /** 윤회의 문: 이번 생에 문이 열린 ??? 직업(환생 때 추첨). */
    rebirthDoor?: string;
    dungeon: null | {
        id: string;
        wave: number;
        depth?: number;
        /** 반복 도전. left: 남은 추가 도전 횟수(null=실패할 때까지), until: 무한 심연 목표 깊이. */
        repeat?: { left: number | null; until?: number };
    };
    clears: Record<string, number>;
    logs: Log[];
    logId: number;
    lastDuel: number;
    rating: number;
    wins: number;
    losses: number;
    bestStage: number;
    lastOffline: null | {
        seconds: number;
        kills: number;
        gold: number;
        exp: number;
        /** 병 속의 편지: 정산 중 주운 편지병과 내용. */
        bottles?: { count: number; gold: number; items: number; pearls: number };
    };
};
/** 서약. anchor·breath는 걸었는지, rough는 거친 바다 선택 단계(1~3). seal은 잠든 닻 봉인 진행(이번 생만). */
export type Vows = { anchor?: boolean; breath?: boolean; rough?: number; seal?: { kind: 'stage' | 'dungeon'; id: string; caught: number; exp: number } | null };
export type Snapshot = {
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
