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
    affix?: {
        stat: keyof Stats;
        value: number;
        name: string;
    };
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
    damageType?: 'physical' | 'magic';
    cost?: number;
    manaCost?: number;
    accuracyBonus?: number;
    penetrationBonus?: number;
    damageBonusCondition?: 'bleeding' | 'weakened' | 'controlled';
    conditionalDamageBonus?: number;
    cleanseSelf?: boolean;
    healRatio?: number;
    drainRatio?: number;
    condition?: 'wounded' | 'healthyTarget';
    scaling?: 'hp' | 'mana' | 'hybrid';
    scalingRatio?: number;
    statusTurns?: number;
    /** Number of capped follow-up hits after the main hit. */
    extraAttacks?: number;
    /** Damage multiplier used by each follow-up hit. */
    extraAttackMultiplier?: number;
    masteryMilestones?: number[];
    masteryAP?: number;
    masteryBonus?: Partial<Stats>;
    /** Exact growth stages; index 0 is the free job skill. Negative AP is allowed. */
    levelEffects?: { cost?: number; bonus?: Partial<Stats> }[];
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
    /** Optional challenge multiplier for x5/x100-style elite encounters. */
    powerMultiplier?: number;
    powerLabel?: string;
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
export type Log = {
    id: number;
    text: string;
    type: 'battle' | 'reward' | 'system' | 'skill';
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
    /** 직전 환생 방식에 따른 이번 생의 효과. 다음 환생 때 다시 정해집니다. */
    lifeBonus?: 'deep' | 'tailwind' | null;
    skillSpecializations?: Record<string, string>;
    bossResearchClaims?: Record<string, boolean>;
    growthGoal?: { kind: 'skill' | 'job' | 'dungeon'; id: string; target?: number } | null;
    tide: number;
    abyssBest: number;
    shopSerial: number;
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
    };
};
export type Snapshot = {
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
