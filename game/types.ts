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
    /** v3.5 상태이상 저항: 몬스터가 거는 기절·침묵·출혈·중독·화상·약화·감속을 이 확률로 무효화합니다(망토 전용 옵션, 최대 50%). */
    statusResist?: number;
    /** v3.12 연속 행동 확률 가산(칠흑 장신구). */
    chainBonus?: number;
    /** v3.12 보스·사냥감에게 주는 피해 증가율. */
    bossDamage?: number;
    /** v3.12 체력·물리/마법 공격·물리/마법 방어 배율 가산(0.05 = +5%). */
    allStats?: number;
    /** v3.221 물리/마법 공격 · 물리/마법 방어 배율 가산(체력 · 마나 제외, 0.05 = +5%). 아제로스 패시브. */
    combatScale?: number;
    stunBonus?: number;
    controlBonus?: number;
    dotTurnsBonus?: number;
    poisonStackBonus?: number;
    arcaneRatioBonus?: number;
    /** v3.155 웨폰 버라이어티: 살아 있는 자기 버프 1개마다 피해 +N(카데나 패시브). */
    varietyBonus?: number;
    followUpBonus?: number;
    healBonus?: number;
    executeBonus?: number;
    /** v3.75 장비 희귀 옵션: 처치당 스킬 숙련 +N(수련) · 계급 처치 수 +N(전공) · 분해 정수 비율(정수). 장식(꽝)은 효과 없는 표시용. */
    masteryFlat?: number;
    rankFlat?: number;
    essenceBonus?: number;
    ornament?: number;
    /** v24.2 진행도 비례 피해의 기준값(능력치 계산이 채움). 도감 종 수 · log10(누적 처치) · √(던전 클리어+보스 처치) · log10(보유 골드). */
    codexPower?: number;
    catchPower?: number;
    /** v3.153 렐릭의 힘: 획득 경험치 보너스 중 스킬 · 장비 · 직업 몫(환생 · 연구 몫 제외). 패스파인더의 렐릭 비례 피해 기준값. */
    relicPower?: number;
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
export type CountSource = 'codex' | 'catch' | 'hunt' | 'species' | 'gold' | 'rebirth' | 'mastered' | 'variant' | 'deaths' | /** v3.144 보낸 턴(누적 플레이 시간 ÷ 턴 길이, 환생해도 유지) */ 'turns' | /** v3.220 아제로스 계보: 까미 · 누리 처치, 지역 던전 정복, 칠흑 보스 처치 */ 'kkami' | 'nuri' | 'dungeonBoss' | 'onyx' | /** v3.221 보유한 지역 보스 코어 수 · 그 각성 단계 합 */ 'cores' | 'coreRanks' | /** v3.221 보유한 칠흑 장신구 종류 수 · 그 각성 단계 합 */ 'onyxOwned' | 'onyxRanks' | /** v3.230 무릉도장 최고 층 · 신 도전 횟수 */ 'abyssBest' | 'altar' | 'str' | 'dex' | 'int' | 'vit' | 'wis' | 'luk';
export type StatusEffects = {
    /** v3.221 황금 올가미 · 하얀 발자국 표식: 이 까미 · 누리를 잡을 때 로또 한 단계 상향 확률. */
    jackpotUp?: number;
    /** v3.54 이번 전투에서 첫 틱을 이미 바로 준 지속 피해(전투당 한 번). */
    opened?: Partial<Record<'bleed' | 'poison' | 'burn', true>>;
    dot?: {
        /** 틱마다 고정 피해(위력 비례분). v3.54부터 체력 비례분은 hpRatio로 따로 둡니다(옛 세이브의 damage에는 체력 비례분이 들어 있음). */
        damage: number;
        /** v3.54 틱마다 대상의 현재 체력 × hpRatio(무리는 swarmDotShare를 곱한 값). */
        hpRatio?: number;
        turns: number;
        name: string;
        /** 중첩형 지속 피해(중독)의 현재 중첩 수와 한 중첩당 피해. damage = perStack × stacks. */
        stacks?: number;
        perStack?: number;
    };
    /** v27.17 중독: 출혈과 별개 상태이상. 걸릴 때마다 한 중첩씩 쌓이고(상한 STATUS_TUNING.poisonMaxStacks + 포화) 지속이 갱신됩니다. 틱 피해 = (perStack + 체력 비례분) × stacks. v3.54 체력 비례분 = 틱 때 현재 체력 × hpRatio(옛 세이브는 고정값 hpTick). */
    poison?: { perStack: number; stacks: number; turns: number; hpTick?: number; hpRatio?: number };
    /** v27.48 화상: 중독처럼 쌓이지만(최대 STATUS_TUNING.burnMaxStacks) 출혈처럼 받는 직접 피해를 키웁니다(burnVulnerability). */
    burn?: { perStack: number; stacks: number; turns: number; hpTick?: number; hpRatio?: number };
    weaken?: number;
    silence?: number;
    slow?: number;
    /** 가속 남은 턴(v3.151부터는 buffs.haste로 옮기며, 옛 세이브의 값은 전투에서 처음 볼 때 옮깁니다). */
    haste?: number;
    /** v3.151 부식: 남은 턴. 걸린 동안 물리 · 마법 방어와 속도가 STATUS_TUNING.corrode* 만큼 떨어지는 최상급 디버프. */
    corrode?: number;
    /** v3.151 자기 버프(id마다 하나): 남은 턴 동안 stats를 더하고 speedMultiplier를 속도에 곱합니다. 가속도 이 틀로 돕니다. */
    buffs?: Record<string, { turns: number; name?: string; stats?: Partial<Stats>; speedMultiplier?: number; /** v3.158 내 직접 피해 배율(접신). */ damageMultiplier?: number }>;
    /** 상태이상이 풀린 뒤 같은 상태이상에 걸리지 않는 남은 턴(자기 행동마다 1씩 줄어듭니다). */
    immune?: Partial<Record<'stun' | 'bleed' | 'poison' | 'burn' | 'weaken' | 'silence' | 'slow' | 'corrode', number>>;
    /** v25 일곱 글자: 이번 전투에 새긴 인. */
    seals?: string[];
    /** v25 타임 리와인드를 이번 전투에 썼는지. */
    timeUsed?: boolean;
    /** v3.231 요원 탄창: 남은 발 · 다음 칸(장착 순서 위치). */
    mag?: { left: number; next: number };
    /** v3.198 태그(제로): 이번 전투에 마지막으로 쓴 태그 기술의 쪽(알파 · 베타). */
    tag?: 'alpha' | 'beta';
    /** v25 이번 전투에 無로 막은 횟수. */
    lastStand?: number;
    /** v3.143 충전 중첩(메카닉). 충전 기술이 명중하면 쌓이고 전탄발사가 소모합니다. */
    charge?: number;
    /** v3.172 반동 게이지(블래스터): 아직 충전 1로 바뀌지 않은 받은 피해의 나머지. */
    recoilPool?: number;
};
export type Item = {
    /** v3.58 각인 감정으로 고른 옵션 id(표시용). */
    imprinted?: string;
    /** v27.27 상점에서 산 장비의 구매가(골드). 판매가는 이 값의 절반을 넘지 않습니다. */
    paid?: number;
    /** 강화 단계(v27.93부터 스타포스 성 수). */
    enhance?: number;
    /** v27.93 연속 하락 횟수(2면 찬스 타임). 성공·파괴 때 0. */
    starFails?: number;
    style?: "physical" | "magic" | "balanced";
    description?: string;
    locked?: boolean;
    /** v27.94 이 장비의 옵션 재설정 횟수. 많을수록 다음 재설정 비용이 오릅니다. */
    rerolls?: number;
    /** v3.118 이 장비의 수치 재련 횟수. 많을수록 다음 재련 정수가 오릅니다(×1.08씩). */
    refines?: number;
    relic?: string;
    /** v3.66 계승 장비: 원시 각성한 고대(ancient) · 게이지로 계승한 태초(primal). 환생해도 남고 판매·분해·등록 불가, 위력은 환생마다 오릅니다(data/economy HEIR_GROWTH). 부위마다 종류별 1개. */
    heir?: 'ancient' | 'primal';
    /** v3.66 업데이트 전부터 가진 유물: 다음 승천까지 예전 위력 공식과 새 공식 중 높은 쪽(data/economy RELIC_LEGACY). */
    relicLegacy?: boolean;
    /** v3.12 칠흑 장신구(보스 id). 종당 1개, 환생해도 남고 판매·분해·이식 재료 불가. */
    onyx?: string;
    /** v3.113 칠흑 각성 단계(0~5): 이미 가진 칠흑 장신구를 다시 얻으면 오르고, 고유 옵션이 단계당 +10%입니다. */
    onyxRank?: number;
    /** v3.77 칠흑 장신구 무작위 옵션을 최고 굴림으로 맞췄는지(한 번만). */
    onyxTuned?: boolean;
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
    slot: 'rod' | 'coat' | 'charm' | 'cape';
    rarity: number;
    power: number;
    level: number;
};
/** v3.219 참모 지원 효과 종류. */
export type SupportEffect = 'exp' | 'gold' | 'mastery' | 'hp' | 'mana' | 'hpRegen' | 'ap' | 'boss' | 'rank' | 'penetration' | 'critDamage' | 'power';
export type SupportMap = Partial<Record<SupportEffect, number>>;
export type Skill = {
    /** v3.47 연출 갈래(skill-fx.ts SKILL_FX와 같은 값). 서버 전용 비밀 스킬은 공개 표 대신 여기에 둡니다. */
    fx?: string;
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
    effect?: 'heal' | 'stun' | 'bleed' | 'poison' | 'burn' | 'weaken' | 'drain' | 'silence' | 'slow' | 'haste' | 'corrode';
    /** v3.151 자기 버프: 이 기술을 쓰면 시전자가 turns 동안 stats(고정값)와 speedMultiplier를 얻습니다(같은 id면 더 긴 쪽으로 갱신). */
    selfBuff?: { id: string; name?: string; turns: number; stats?: Partial<Stats>; speedMultiplier?: number; damageMultiplier?: number };
    /**
     * v3.221 코어 비례 자기 버프(어둠의 추종자 어둠의 의식): 쓸 때 보유한 지역 보스 코어 수(n)로 selfBuff를 만듭니다.
     * 피해 배율 1 + damage × n, 능력치 stats × n. steps는 n이 at 이상이면 지속 턴 · 상태이상 면역 턴 · 추가 행동을 덧붙입니다.
     */
    /** v3.221 물리 · 마법 공격 중 높은 쪽으로 피해(그 종류로 방어 적용). 칠흑 일식. */
    bestOf?: boolean;
    /** v3.223 회복 효과(effect 'heal')를 힐러가 아니어도 피해 감소(idleHealDamage) 없이 씁니다. 칠흑 일식 진 힐라 형태만의 예외(역할 규칙 예외). */
    healNoPenalty?: boolean;
    /** v3.221 끼고 있는 칠흑 장신구(보스 id)에 따라 덧붙는 효과(칠흑 일식). */
    onyxForms?: Record<string, Partial<Skill>>;
    coreBuff?: { id: string; name: string; turns: number; damage: number; stats: Partial<Stats>; steps: { at: number; turns?: number; wardTurns?: number; extraTurn?: boolean }[] };
    /** v3.158 접신(아크 패시브): 충전이 need에 닿으면 충전을 비우고 자기 버프 ‘접신’(피해 × damageMultiplier · 속도 × speedMultiplier, turns턴)에 들어갑니다. 장착한 것 중 가장 센 하나만. */
    spectre?: { need: number; turns: number; damageMultiplier: number; speedMultiplier?: number; /** v3.163 버프 이름(기본 접신) · 고정 능력치(카이저 파이널 피규레이션의 흡혈). */ name?: string; stats?: Partial<Stats> };
    /** v3.163 피격 충전(카이저 패시브): 피해를 입는 공격을 맞을 때마다 충전 +N(치명타로 맞으면 +1 더). 장착한 것 중 가장 큰 값. */
    chargeOnHit?: number;
    /** v3.172 반동 게이지(블래스터): 받은 피해가 최대 체력 × recoilGauge에 닿을 때마다 내 충전 +1(여러 패시브면 가장 작은 비율 하나). 충전은 chargeNeed 기술이 소모합니다. */
    recoilGauge?: number;
    /** v3.172 마나 치유(라라): 행동 시작 때 체력이 모자라면 최대 마나 × spend를 써서 최대 체력 × heal을 되찾습니다(마나가 모자라면 안 함, 여러 개면 heal이 큰 것 하나). */
    manaMend?: { spend: number; heal: number };
    /** v3.176 콤보(아란 패시브): 내 공격(기본 공격 포함, 피해 없는 기술 제외)이 명중할 때마다 충전 +N. 장착한 것 중 가장 큰 값. */
    hitCharge?: number;
    /** v3.176 콤보 피해(아란 패시브): 충전 1중첩마다 내 직접 피해 +comboBonus(장착한 것 중 가장 큰 값). 비욘더가 중첩을 소모하면 처음부터. */
    comboBonus?: number;
    /** v3.176 회피 반격(듀얼블레이드 패시브): 내게 온 공격이 빗나가면 충전 +N. 장착한 것 중 가장 큰 값. */
    evadeCharge?: number;
    /** v3.176 회피 반격 소모(듀얼블레이드 액티브): 명중하면 충전을 모두 소모해 중첩당 추가타 +chargeHits(상한 뒤에 더함). 충전이 없어도 나갑니다. */
    chargeHits?: number;
    /** v3.176 마나 방패(배틀메이지 패시브): 받는 피해의 ratio만큼을 마나로 먼저 받습니다(마나 1이 피해 rate를 막음, 마나가 모자라면 그만큼만). 장착한 것 중 ratio가 큰 것 하나. */
    manaShield?: { ratio: number; rate: number };
    /** v3.164 전류(스트라이커 패시브): 추가타가 명중할 때마다 자기 버프를 1턴 늘립니다(없으면 turns로 시작). 장착한 것 중 속도 배율이 가장 큰 하나. */
    followUpBuff?: { id: string; name?: string; turns: number; speedMultiplier?: number };
    /** v3.164 전류 중 추가타 +N(스트라이커 5차 패시브). followUpBuff의 버프가 살아 있을 때만. */
    followUpExtra?: { buff: string; hits: number };
    /** v3.163 조화 보너스(제논): 직접 배분한 여섯 능력치의 (가장 낮은 값 ÷ 가장 높은 값) × 이 값만큼 피해가 커집니다. 고르게 투자할수록 세짐. */
    balanceBonus?: number;
    /** v3.158 이 자기 버프가 걸려 있을 때만 나가는 액티브(아크 인피니티 스펠: 'spectre'). */
    requiresBuff?: string;
    /** v3.155 쓰면 시전자의 살아 있는 자기 버프를 모두 N턴 연장합니다(카데나 체인아츠: 메일스트롬). */
    extendBuffs?: number;
    /** v3.151 기본 공격 상태이상(패시브): 장착하면 기본 공격(마력 평타 포함)이 명중할 때 이 상태이상을 겁니다(statusTurns 적용). 일리움 부식. */
    basicEffect?: 'corrode' | 'weaken' | 'slow' | 'silence' | 'stun';
    /** split: 원시 피해를 물리·마법 절반씩 나누어 각각 방어를 적용하는 한 번의 공격. */
    /** fixed(v3.143): 고정 피해. 방어 · 마법 방어를 전혀 받지 않습니다(메카닉 전탄발사). 기준 공격력은 baseStat(기본 물리 공격). */
    damageType?: 'physical' | 'magic' | 'split' | 'fixed';
    /** v3.143 고정 피해의 기준 공격력. */
    baseStat?: 'attack' | 'magic';
    cost?: number;
    manaCost?: number;
    accuracyBonus?: number;
    penetrationBonus?: number;
    /** statuses(v3.159 칼리 헥스 수집): 상대에게 걸린 상태이상 종류(기절 · 침묵 · 약화 · 감속 · 부식 · 출혈/저주 · 중독 · 화상) 1개마다 conditionalDamageBonus만큼 피해가 커집니다. */
    damageBonusCondition?: 'bleeding' | 'weakened' | 'controlled' | 'lowHp' | 'statuses';
    conditionalDamageBonus?: number;
    cleanseSelf?: boolean;
    healRatio?: number;
    drainRatio?: number;
    /** v3.221 'kkami': 숙련의 까미 · 대왕 까미에게만, 'nuri': 경험의 누리 · 대왕 누리에게만 발동합니다(까미 사냥꾼 · 누리 추적자). */
    condition?: 'wounded' | 'healthyTarget' | 'afflicted' | 'kkami' | 'nuri';
    /** v3.221 대상 최대 체력의 이 비율만큼 고정 피해(방어 · 치명 · 피해 배율 무시). 황금 올가미. */
    maxHpDamage?: number;
    /** v3.221 명중하면 대상에 표식: 그 까미 · 누리를 잡을 때 이 확률로 숙련 · 경험치 로또가 한 단계 위로 굴러갑니다(소 → 중, 중 → 대). */
    jackpotUp?: number;
    /** v27.69 사용하면 이만큼의 턴 동안 모든 상태이상 면역(몬스터 각성). */
    wardTurns?: number;
    /** v3.17 장착 패시브: 쓰러진 뒤 회복 대기를 이만큼(턴) 줄입니다(환생 10회 이상). */
    revive?: number;
    /** defense: 물리 방어 × 비율을 더함(방어 친화도 적용). dual: (물리+마법 공격)/2를 기반으로 사용. swap: 피해 유형과 반대 공격력을 기준값으로(물리 계수 마법 피해 등). */
    scaling?: 'hp' | 'mana' | 'hybrid' | 'harmony' | 'defense' | 'resist' | 'dual' | 'codex' | 'catch' | 'hunt' | 'gold' | 'mastered' | 'luck' | 'variant' | 'swap' | 'attr' | /** v3.153 렐릭의 힘 비례: 피해 × (1 + relicPower × scalingRatio). 패스파인더. */ 'relic' | /** v3.151 마력 평타 계수 기준값: 마법 공격 × (arcaneStrikeRatio + 마력 평타 계수 보너스). 일리움. */ 'arcane';
    /** v26.2 scaling 'attr'가 비례하는 능력치. 기준값 += 능력치 × scalingRatio. */
    scalingAttribute?: Attribute;
    /** v3.97 scaling 'attr'에 공격력 × 이 비율을 더합니다(외길 계보: 장비 · 연구가 쌓여도 기술이 따라 커지도록). v3.172 마법 기술이면 마법 공격을 더합니다. */
    scalingAttack?: number;
    /**
     * v3.228 핵심 패시브: 직업 보정을 한 자리 %로 줄인 몫을 메웁니다. flat은 고정 수치(4차, 다른 고정 수치처럼 배율 전에 더함), scale은 배율(5차, ×(1 + 값)).
     * 적힌 값은 숙련 마지막 단계 기준이고 0단계는 70%(coreScale). 다른 계보 직업에서 쓰면 절반입니다.
     */
    core?: { flat?: Partial<Record<'attack' | 'magic' | 'hp', number>>; scale?: Partial<Record<'attack' | 'magic' | 'hp', number>> };
    /** v24.2 진행도 비례 패시브: 기록 per마다 bonus를 더합니다(최대 cap번). */
    perCount?: { source: CountSource; per: number; bonus: Partial<Stats>; cap: number }[];
    /** v3.231 이계 액티브: 쓸 때 태우는 세계석 연료(이계 전투 직업만 씀, data/otherworld.ts FUEL). */
    fuelCost?: number;
    /** v3.231 요원 패시브: 탄창 +n발 · 재장전할 때 이 확률로 행동을 쓰지 않음. */
    magazineBonus?: number;
    reloadSkip?: number;
    /** v3.231 트레이더 액티브: 피해 × (1 + 평가 손익률 × pnlScale). 패시브 pnlFloor: 손익 배율의 하한. */
    pnlScale?: number;
    pnlFloor?: number;
    /** v3.231 pnlAbs: 손익의 절댓값으로(블랙 스완). pnlCap: 손익 배율 범위의 위아래(마켓 메이커 ±35%). */
    pnlAbs?: boolean;
    pnlCap?: number;
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
    /** v3.198 타임 리와인드(제로): 내 체력·마나를 가득 채우고 내 재사용 대기를 모두 되돌립니다(상대는 그대로). 전투당 1회. v25의 restoreAll(나와 상대 모두)을 바꿨습니다. */
    timeRewind?: boolean;
    /** v3.198 태그(제로): 알파 · 베타 기술. 쪽을 바꿔 쓰면(알파 다음 베타, 베타 다음 알파) 장착 패시브의 tagBonus만큼 피해가 커집니다. */
    tag?: 'alpha' | 'beta';
    /** v3.198 태그 전환 피해(제로 패시브): 장착한 것 중 가장 큰 값. */
    tagBonus?: number;
    /** v3.198 떠돌이의 요령(방랑 패시브): 장착하면 다른 직업에서 가져온 스킬의 AP가 이만큼 줄어듭니다(최소 1, 장착한 것 중 가장 큰 값). */
    borrowedDiscount?: number;
    /** v25 반동: 준 피해 × recoil만큼 자신도 받습니다(반동으로는 체력 1 아래로 내려가지 않음). */
    recoil?: number;
    /** v3.145 체력 소모(데몬슬레이어): 쓸 때 현재 체력 × hpCost를 냅니다(체력 1 아래로는 내려가지 않음). 마나 대신 쓰는 비용. 피가 줄수록 비용도 줄어 스스로 말라 죽지 않습니다. */
    hpCost?: number;
    /** v3.145 피의 분노(패시브): 잃은 체력 비율 × bloodRage만큼 모든 피해가 커집니다(장착한 패시브끼리 더함). */
    bloodRage?: number;
    /** v3.148 마나 연소(아델): 쓸 때 현재 마나 × manaBurn을 태우고(마나 소모 대신), 태운 마나 × burnScale(기본 SKILL_FORMULA.manaBurnScale)을 피해 기준값에 더합니다. */
    manaBurn?: number;
    burnScale?: number;
    /** v3.148 화상 폭발(플레임위자드): 명중한 적의 화상 중첩을 모두 터뜨려 중첩당 burnConsume만큼 피해가 커집니다(화상은 사라짐). */
    burnConsume?: number;
    /** v3.146 정령(은월 패시브): 장착하면 기본 공격을 포함한 모든 공격 행동에 정령의 추가타가 hits회 붙습니다(위력 power, 기술 배율에 곱함). 여러 개를 장착하면 횟수 · 위력 각각 가장 큰 값. */
    companion?: { hits: number; power: number };
    /** v3.219 참모 계보 지원 스킬: 장착하면 같은 계정의 다른 분신에게 effect 배율(숙련 단계에 따라 min → max). systems/support.ts */
    support?: { effect: SupportEffect; min: number; max: number };
    /** v3.219 지휘 체계: 장착한 지원 스킬 1개마다 자기 두 공격 +commandPer. */
    commandPer?: number;
    /** v3.225 총사령관 지휘 계통: 이 분신이 주는 다른 지원(AP 제외)을 숙련 단계에 따라 ×min → ×max. */
    supportAmp?: { min: number; max: number };
    /** v3.225 군수사령관 경량 편제: 참모 계보일 때 장착한 지원 스킬의 장착 AP -n(최소 1). */
    supportCostCut?: number;
    /** v25 자기 상태이상: 쓰고 나면 자신이 기절·감속·약화됩니다. waivedBy 기술을 장착하면 생략. */
    selfEffect?: { status: 'stun' | 'slow' | 'weaken'; turns: number; waivedBy?: string };
    /** v25 無: 쓰러질 피해를 받으면 체력 1로 버팁니다(전투당 charges번). 버틸 때마다 최대 체력 × heal을 되찾습니다. */
    lastStand?: { charges: number; chargesPerLevel?: number; heal?: number };
    /** v25.5 재사용 대기 초기화: 조건(치명타·처치·연속 행동)이 맞으면 chance 확률로 대기 중인 액티브를 되돌립니다. pick: longest 가장 긴 대기 하나, first 편성 순서 첫 번째, all 전부. */
    cooldownReset?: { on: 'crit' | 'kill' | 'chain'; chance: number; pick: 'longest' | 'first' | 'all' };
    /** v25.5 동시 시전 가능. 같은 표시가 있는 액티브끼리 한 행동에 함께 나갑니다. */
    multicast?: boolean;
    /** v3.86 각성기(5차 이상 액티브): 턴마다 따로 판정하고 대기는 턴 단위. start는 대기를 비운 뒤(전투·던전 시작, 쓰러짐, 편성 변경) 처음 대기 턴입니다. */
    awaken?: { start: number; /** 거는 상태이상 지속 배율(패시브 보너스 포함, 반올림). */ statusScale?: number };
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
    /** v24.2 노래: 장착 AP 0. 엔젤릭버스터 계보 전용(exclusiveLineage 'bard')입니다. */
    song?: boolean;
    /** v3.187 계보 전용: 이 직업 id가 지금 직업의 계보(자신 + 선행 직업)에 있어야 장착하고 효과가 납니다. 숙련 · SP 계승으로도 계보 밖에서는 못 씁니다. */
    exclusiveLineage?: string;
    /** v3.221 계보 전용이지만 궁극의 모험가(signatureFree)는 예외로 씁니다(황금 올가미). */
    exclusiveUltimate?: boolean;
    /** v24.2 골드 투척: 보유 골드의 ratio(최대 cap)를 쓰고, 쓴 골드 × scale을 피해에 더합니다. */
    /** 골드 투척: 보유 골드 × ratio를 실제로 쓰고 쓴 골드 × scale을 기준값에 더합니다. 상한은 cap(절대값)과 capAttack(기준 공격력 × 배수, v3.157 섀도어: 수백억 골드도 새 생의 Lv.10도 공격력에 맞춘 만큼만) 중 작은 쪽. */
    goldSpend?: { ratio: number; cap?: number; capAttack?: number; scale: number };
    /** v24.2 사냥감 연구: 보스·지정 몬스터에게 직접 피해 +preyBonus. */
    preyBonus?: number;
    scalingRatio?: number;
    statusTurns?: number;
    /** v3.132 함께 거는 두 번째 중첩형 지속 피해(포이즌 노바: 중독 + 화상). 지속은 statusTurns, 틱 비율은 dotRatio를 같이 씁니다. 각성 지속 배율을 받지 않습니다. */
    alsoEffect?: 'poison' | 'burn';
    /** v3.139 화면에 효과 대신 이 글만 보입니다(실제 효과는 그대로, 망인 죽지않은 영혼). */
    disguise?: string;
    /** v3.132 계보 밖 직업이 계승해 쓰면 발동률에 곱하는 값(5차 전용 기술, signatureScale과 함께). */
    outsiderChance?: number;
    /** v3.132 도트 퍼니셔: 적의 중독·화상 중첩에 비례한 추가타(최대 maxHits회, 위력 hitMultiplier). 둘 다 최대 중첩이면 기절 fullStun턴, 일부면 partStun턴, 없으면 추가타·기절 없음. */
    dotFinisher?: { maxHits: number; hitMultiplier: number; fullStun: number; partStun: number };
    /** v3.143 충전(메카닉): 이 기술이 명중하면 자신의 충전 중첩 +charge(약화된 적이면 +1 더, 최대 SKILL_FORMULA.charge.max). 전투가 끝나면 사라집니다. */
    charge?: number;
    /** v3.143 전탄발사: 충전 중첩이 chargeNeed 이상일 때만 쓰고, 쓰면 중첩을 모두 소모해 중첩당 피해 +chargeBonus. */
    chargeNeed?: number;
    chargeBonus?: number;
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
    /** Exact growth stages; index 0 is the free job skill. Negative AP is allowed. */
    levelEffects?: { cost?: number; bonus?: Partial<Stats>; penaltyRelief?: number }[];
    /** 환생 1회마다 더하는 능력치(최대 SKILL_FORMULA.perRebirthCap회). 환생할수록 강해지는 패시브에 씁니다. */
    perRebirth?: Partial<Stats>;
    /** 피해 없이 상태이상만 거는 기술. 명중 판정만 하고 직접 피해·반격·흡혈·추가타가 없습니다(출혈·중독의 턴당 피해는 그대로). */
    statusOnly?: boolean;
    /** 장착하면 현재 직업의 마이너스 배율 보정을 이 비율만큼 되돌립니다(0~1). 여러 개면 가장 큰 값 하나만 적용합니다. */
    penaltyRelief?: number;
    /** v3.70 능력치 수련 패시브: 기본 능력치(배분 능력치와 같은 자리)에 더합니다. 숙련 단계마다 +25%(data/stat-training.ts). */
    attrBonus?: Partial<Record<Attribute, number>>;
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
    /** v3.12 칠흑 보스 id. */
    onyx?: string;
    /** v3.12 떠나는 턴(s.turn 기준): 칠흑 보스, v3.161 대왕 시리즈. 지나면 도망(보상 없음). */
    leavesAt?: number;
    /** 무리 규모(N). 무리 전체가 체력 ×N인 한 개체입니다. 없으면 한 마리. */
    swarm?: number;
    /** v3.46 이 몬스터가 나온 턴(s.turn). 무리 계급 경험치를 싸운 턴 수로 셉니다. */
    born?: number;
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
    actor: string; skillId?: string; skillName: string; damageType: 'physical' | 'magic' | 'split' | 'fixed';
    hits: CombatHit[]; total: number; healed: number; drained: number;
    statuses: { id: string; turns: number; onSelf?: boolean }[];
    /** v3.211 극한돌파 전용 연출이 열린 스킬로 한 행동. */
    extreme?: boolean;
    /** v3.145 이 행동에 바친 체력(체력 소모 기술). */
    hpSpent?: number;
    /** v3.148 이 행동에 태운 마나(마나 연소 기술). */
    manaBurned?: number;
    /** 면역으로 막힌 상태이상(있을 때만). */
    immune?: string;
    /** v3.5 상태이상 저항으로 막힌 상태이상(있을 때만). */
    resisted?: string;
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
    /** v3.86 각성기 발동 줄. */
    awaken?: boolean;
    /** v3.86 추가 판정으로 함께 나간 줄(몇 번째 추가 판정인지, 1부터)과 위력 배율. */
    followUp?: { index: number; power: number };
    /** v25: 타임 리와인드. v3.198부터 나만 처음 상태로(상대는 그대로). */
    restored?: boolean;
    /** v3.231 요원 재장전으로 쓴 행동. */
    reload?: boolean;
    /** v25: 無로 버틴 쪽(heal은 되찾은 체력). self면 행동한 쪽이 자기 지속 피해·반격을 버틴 것입니다. */
    endured?: { heal: number; self?: boolean };
    /** 행동 시작 때 턴당 체력 회복으로 되찾은 체력(있을 때만). */
    regen?: number;
    /** v3.172 마나 치유(라라): 쓴 마나와 되찾은 체력. */
    mend?: { mana: number; value: number };
    /** v3.176 마나 방패(배틀메이지)가 마나로 받은 피해. */
    shielded?: number;
    dot?: { name: string; value: number }; /** v3.54 새로 건 지속 피해의 즉시 첫 틱(대상이 받음). */ onset?: { name: string; value: number }; /** v3.54 힐러의 넘친 회복 피해(대상이 받음). */ holy?: number; reflected?: number; /** v25.25 반격 흡혈로 맞은 쪽이 회복한 양. */ reflectHeal?: number; stunned?: boolean; defeated?: boolean; silenced?: boolean; cleansed?: boolean; linked?: boolean;
    /** 연속 행동 번호: 이 턴에서 이 전투원의 몇 번째 행동인지(1부터). 오래된 로그에는 없습니다. */
    chain?: number;
};
export type LifeStart = { at: number; playMs: number; partial?: boolean };
/** 환생 한 번의 기록. realMs: 생 시작부터 환생까지 실제 시간, playMs: 그동안 사냥이 진행된 시간(부재중 정산 포함). */
export type RebirthRecord = { n: number; at: number; realMs: number; playMs: number; level: number; pearls: number; partial?: boolean };
/** v3.31 승천 기록: 몇 번째 승천인지, 그때의 환생 횟수·무릉도장 최고층·걸린 시간. */
export type AscensionRecord = { n: number; at: number; rebirths: number; abyssBest: number; realMs: number; kills: number };
export type Log = {
    id: number;
    text: string;
    /** 기록된 턴 번호(s.turn). 전투 화면이 턴 경계를 나누는 데 씁니다. 오래된 로그에는 없습니다. */
    turn?: number;
    type: 'battle' | 'reward' | 'system' | 'skill';
    /** 전투 로그의 구조화된 결과. 오래된 로그에는 없을 수 있습니다. */
    event?: CombatEvent;
};
export type State = {
    version: number;
    /** SP를 지급한 무릉도장 이정표 깊이. 환생해도 유지됩니다. */
    abyssMilestones?: number[];
    /** v26.1 지금 진행 중인 서버 이벤트(서버가 동기화 때 적음). 없으면 null. */
    event?: import('./data/events').ActiveEvent | null;
    /** v27.31 운영 페이지에서 닫은 사냥터·던전(서버가 동기화 때 적음). 없으면 null. */
    closed?: import('./data/world').Closures | null;
    /** 마지막으로 자동 진행(사냥·던전·반복)이 끝나거나 바뀐 사유. 표시 전용이며 게임 규칙에 쓰지 않습니다. */
    runEnd?: { reason: string; turn: number } | null;
    /** 모험 안내. 없으면(기존 세이브) 표시하지 않습니다. hidden: 접기, skipped: 건너뛰기. done은 한 번 만족한 단계의 기록(턴)으로, 조건이 깨져도 되돌아가지 않습니다(v27.72). */
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
    /** v25.12 결투 시즌(한국 시간 월). 월이 바뀌면 점수를 1000으로 되돌리고 지난 시즌 순위를 기록합니다(v3.106 순위 보상 없음). */
    duelSeason?: { key: string; lastKey?: string; lastRank?: number };
    /** v27.43 제단: 마지막 신 도전 시각, 익명 기여 설정. 서버만 씁니다. */
    altar?: { challengeAt?: number; anonymous?: boolean; /** v27.54 신 도전 횟수·승리·가장 많이 깎은 신 체력 비율(0~1). 운영 통계용. */ tries?: number; wins?: number; best?: number; /** v27.72 공물을 바친 횟수(안내 단계 판정). */ offers?: number; /** v27.91 월드보스: 마지막 도전 시각, 보상을 정산한 세대, 누적 참여·피해(통계). */ raidAt?: number; raidClaimed?: number; raidHits?: number; raidDealt?: number; /** v3.22 보스별 마지막 도전 시각과 보상을 정산한 세대. */ raidAtBy?: Record<string, number>; raidClaimedBy?: Record<string, number> };
    /** v27.44 제단 진행 요약(서버가 동기화마다 채우는 표시용). */
    altarStatus?: import('./data/altar').AltarStatus;
    /** v25.11 공유 길드 소속 캐시(서버가 채움). 없으면 무소속. */
    guildMember?: { id: string; name: string; code?: string; leader: boolean; syncedAt: number };
    /** v25.11 이번 주 길드 기여 기록. sent*는 서버에 올린 값, 차이만 다음에 올립니다. */
    guildStats?: { key: string; catches: number; clears: number; bosses: number; abyss: number; sentCatches: number; sentClears: number; sentBosses: number; sentAbyss: number; sentAt: number };
    /** v25.6 계정 합계 캐시(캐릭터 슬롯 보너스). 서버가 저장 전에 채웁니다. 없으면 보너스 0. */
    account?: import('./data/account').AccountSummary;
    /** v3.219 다른 분신의 참모 지원(효과별 최고값). 서버가 계정 동기화(최대 10분 주기)에서 채우는 캐시입니다. 승천 캐릭터도 받습니다. */
    support?: SupportMap;
    /** 이 세이브에 적용된 레벨당 능력치 포인트. 없으면 이전 규칙(레벨당 4)으로 보고 차액을 한 번 지급합니다. */
    statRate?: number;
    tide: number;
    abyssBest: number;
    shopSerial: number;
    /** v22 장비 분해로 얻는 정수. 옵션 재설정에 쓰며 환생해도 유지됩니다. */
    essence?: number;
    /** v3.201 던전 주화: 던전 정복마다 받아 주화 상점에서 씁니다. 환생해도 남고 승천하면 사라집니다. dungeonCoinFrac는 주화 보너스의 소수점 이월. */
    dungeonCoins?: number;
    dungeonCoinFrac?: number;
    /**
     * v3.213 주화 증권거래소 계좌(공유 시장, 첫 매수 때 생김).
     * holdings는 종목 → 수량 · 원금(수수료 포함 매수 금액), realized는 누적 실현 손익. 환생해도 남고 승천하면 사라집니다.
     */
    /** v3.215 모험 일지(스토리): 열린 장면 id → 열린 시각(ms). 환생 · 승천해도 남습니다. 장면 표는 data/story.ts. */
    story?: Record<string, number>;
    market?: { holdings: Record<string, { qty: number; cost: number }>; realized?: number };
    /** v3.201 하루 보너스 정복: 그날(한국 시간 날짜)과 쓴 횟수. 날짜가 바뀌면 0부터. */
    dungeonBonus?: { day: string; used: number };
    /** v3.202 보스 전리품 연속 미획득 수(보너스 정복마다 +1, 받으면 0). 환생해도 남습니다. */
    bossLootMiss?: number;
    /** v3.202 보스 코어: 가진 코어(던전 id → 각성 단계 0~5)와 보스 코어 칸에 낀 코어. 환생 · 승천해도 남습니다. */
    bossCores?: Record<string, number | { rank: number; attrs?: { k: Attribute; f: number }[]; forges?: number }>;
    /** v3.231 이계 연료(세계석 1 = 100). fuelAuto: 자동 충전 때 남길 세계석(없으면 자동 충전 끔). */
    fuel?: number;
    fuelAuto?: number;
    /** v3.231 연료로 바꾼 세계석 누계(부재중 정산 환산이 측정 구간의 충전을 셈). */
    fuelBought?: number;
    /** v3.231 트레이더: 동기화 때 서버가 구한 평가 손익 배율(가중 · 자름 전 손익률 × 포지션 비중). */
    marketPnl?: number;
    coreSlot?: string;
    /** v3.210 LV1 모험가 서약으로 오른 최고 무릉도장 층(환생 · 승천해도 남음). */
    lv1AbyssBest?: number;
    /** v3.201 주화 상점 하루 한도 상품을 산 날(한국 시간)과 그날 산 횟수(칠흑 · v3.201 성장권). */
    dungeonShopDay?: { day: string; onyx?: number; growth1?: number; growth4?: number; coreBox?: number };
    attributes: Record<Attribute, number>;
    statPoints: number;
    sp: number;
    peakLevel: number;
    learned: Record<string, number>;
    skillSpent: Record<string, number>;
    /** Paid inheritance is independent of growth and never fabricates mastery wins. */
    skillInheritances: Record<string, boolean>;
    skillPractice: Record<string, number>;
    /** v3.31 승천할 때의 스킬 숙련. 연마 단계·한계 돌파 조건은 이 값 위로 쌓인 숙련만 셉니다(refinePractice). */
    refineBase?: Record<string, number>;
    /** v3.31 승천 횟수와 기록, 이번 승천의 시작 시각. */
    ascension?: number;
    ascensionLog?: AscensionRecord[];
    /** v3.114 환생 50 · 100회 확정 칠흑을 받은 이정표(캐릭터 평생 한 번, 환생 · 승천 유지). */
    onyxMilestones?: number[];
    /** v3.115 이번에 환생 이정표로 새로 받은 칠흑(보스 id → 이정표). 소식 문구에만 쓰고 collectNews가 지웁니다. v3.116 0이면 금고에서 꺼낸 것이라 소식을 띄우지 않습니다. */
    onyxGift?: Record<string, number>;
    ascensionStart?: number;
    /** v27.6 한계돌파 단계(기술 id → 0~limitBreak.max). 환생해도 유지됩니다. */
    limitBreaks?: Record<string, number>;
    /** v27.19 환생 유물이 세계석 구매에서 환생 횟수 제공으로 바뀌며, 이미 산 유물의 세계석을 돌려준 뒤 true. */
    relicRefunded?: boolean;
    /** v27.95 숙련 요구치 상향 전 기준으로 이미 숙련 계승한 스킬(새 기준에 못 미쳐도 계승 유지). 환생해도 남습니다. */
    legacyInherited?: Record<string, true>;
    /** v27.95 숙련 요구치 상향의 계승 보존을 이미 처리한 세이브(새 세이브는 처음부터 true). */
    masteryRescaled?: boolean;
    /** v3.200 윤회의 나그네(1차) → 궁극의 모험가(히든 5차) 리메이크를 처리한 세이브(새 세이브는 처음부터 true). */
    ultimateRemade?: boolean;
    /** v3.154 긴 휴식 12단계 × 2시간 → 3단계 × 6시간으로 한 번 변환했는지. */
    offlineRescaled?: boolean;
    /** v3.69 수련 패시브 숙련 요구치 상향의 계승 보존을 이미 처리한 세이브(새 세이브는 처음부터 true). */
    trainingRescaled?: boolean;
    /** v3.80 직업 숙달 목표를 올리기 전 기준으로 이미 숙달한 직업(계속 숙달로 봄). */
    masteryKept?: string[];
    /** v3.80 위 숙달 보존을 이미 처리한 세이브(새 세이브는 처음부터 true). */
    masteryAligned?: boolean;
    /** v3.84 관통 장비 옵션 ×2를 지금 가진 장비에 이미 적용한 세이브(새 세이브는 처음부터 true). */
    penetrationBoosted?: boolean;
    /** v3.19 계급장 필요 처치 재조정(강등 시 특전 되돌리기)을 이미 처리한 세이브(새 세이브는 처음부터 true). */
    rankRescaled?: boolean;
    jobMastery: Record<string, number>;
    unlockedJobs: string[];
    /** v3.166 목표로 찍은 직업(직업 상세의 ‘목표로 설정’). 항로도 · 목록 카드에 깃발을 붙이고, 그 직업으로 전직하면 지워집니다. */
    jobGoal?: string;
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
    /** v3.8 자동 강화 연구 비용 인하(100 → 10) 차액 환급을 처리한 세이브. */
    autoStarRefunded?: boolean;
    /** v3.38 장소 완성 AP를 업적(지역 연구 N곳 완성)으로 옮겼는지. */
    placeApMoved?: boolean;
    /** v3.39 소식 비교용 지난 표시(systems/news.ts). */
    newsMark?: import('./systems/news').NewsMark;
    /** v3.40 편지 수신인 기록(최근 10건). */
    letterLog?: { job: string; gift: number; turn: number }[];
    /** v3.40 자동 환생(승천 1회): 켜짐과 목표 레벨(0 = 요구 레벨). */
    /** v3.160 호루라기: 다음 사냥터 출현을 이 희귀 몬스터로(출현 때 지움). */
    whistle?: 'mimic' | 'nuri' | 'slime';
    /** v3.160 오늘(한국 시간) 분 호루라기 수. */
    whistleDay?: { key: string; used: number };
    autoRebirth?: { on: boolean; level: number };
    /** v3.40 연구 구매 예약(승천 1회): 순서대로 목표 단계까지 자동 구매. */
    researchPlan?: { on: boolean; items: { id: string; to: number }[] };
    /** v3.41 사냥터·난이도 자동 따라가기(승천 2회). */
    autoFollow?: { on: boolean; stage: 'top' | 'habitat' | 'keep'; tide: 'max' | 'mimic' | 'keep' };
    /** v3.41 숙련 순회 전직(승천 2회): 전직 시점('mastered' 또는 단련 단계). idle은 바꿀 직업이 없다고 한 번 알린 표시. */
    rotation?: { on: boolean; at: 'mastered' | number; idle?: boolean };
    /** v3.12 칠흑 보스: 서식지별로 보스를 못 본 출현 횟수(천장)와 보스별 처치 수. 환생해도 남습니다. */
    onyxSeen?: Record<string, number>;
    onyxBook?: Record<string, number>;
    /** v3.12 보스별 연속 미획득 격파 수(dropPity 천장용). */
    onyxMiss?: Record<string, number>;
    /** v3.6 스타포스 누적 기록(환생해도 남음): 시도·성공·실패(하락/유지)·파괴·쓴 골드. 업적·칭호가 봅니다. */
    starforce?: {
        tries: number; success: number; fail: number; destroy: number; gold: number;
        /** v3.20 업적용 흐름 기록: 10성 이상 연속 성공(지금·최고), 연속 실패(유지·하락·파괴, 지금·최고), 하락, 찬스 타임, 스타캐치 성공, 15성 이상 성공. */
        streak?: number; bestStreak?: number; failStreak?: number; bestFailStreak?: number; drops?: number; chance?: number; catches?: number; high?: number;
    };
    recovery: number;
    lastTick: number;
    skills: string[];
    /** v3.86 추가 판정 단계(편성에서 켬, 단계마다 장착 AP). 세계석 연구 ‘시스템 파괴 I’ 단계까지만 효과가 납니다. */
    extraRolls?: number;
    cooldowns: Record<string, number>;
    book: Record<string, number>;
    inventory: Item[];
    equipment: Record<string, Item | null>;
    permanent: Record<string, number>;
    /** 세계석 연구 재분배의 계정당 첫 1회 무료 반환을 썼는지. 없으면 false. */
    researchResetUsed?: boolean;
    /** v27.31 무료로 받은 세계석 연구 단계(재분배 때 반환하지 않음). limitBreak: 이미 한 한계돌파만큼 ‘리미터 해제’를 무료로 받음. */
    researchGranted?: Record<string, number>;
    /** v3.42 가격 인상(RESEARCH_GROWTH) 전에 이미 산 연구 단계. 재분배 때 이 단계까지는 전 가격으로 돌려줍니다. 승천·재분배하면 비웁니다. */
    researchLegacy?: Record<string, number>;
    /** v3.58 사냥 골드 수입: 플레이 시간 1시간 칸(h = playMs ÷ 1시간)마다 번 골드. 최근 24칸(systems/income.ts). */
    goldLog?: { h: number; g: number }[];
    /** v3.201 처치 경험치 수입 기록(goldLog와 같은 칸). 환생하면 지웁니다. */
    expLog?: { h: number; g: number }[];
    /** v3.211 극한돌파 전용 연출이 열린 스킬(처음 극한돌파한 순간 기록). 환생 · 승천해도 남습니다. */
    extremeFx?: Record<string, true>;
    /** v3.207 기록을 시작한 뒤 처치로 번 경험치 합계(expLog와 달리 환생해도 남음). */
    expEarned?: number;
    /** v3.207 처치 숙련 수입 기록(goldLog와 같은 칸, 현재 직업 숙련). 환생해도 남습니다. */
    masteryLog?: { h: number; g: number }[];
    /** v3.207 기록을 시작한 뒤 처치로 번 숙련 합계. */
    masteryEarned?: number;
    /** v3.58 기록을 시작한 뒤 사냥으로 번 골드 합계. */
    goldEarned?: number;
    /** v3.58 감정 기록: 총 횟수, 등급별 횟수(0~6), 천장 카운트(그 등급 이상이 마지막으로 나온 뒤 감정 수). 환생해도 남고 승천하면 초기화. */
    appraisal?: { count: number; byRarity: number[]; pity: { myth: number; ancient: number; primal: number } };
    /** v3.59 사냥·던전 드롭에서 태초 없이 떨어진 장비 수(PRIMAL_DROP_PITY에 닿으면 다음 드롭은 태초). 환생 유지 · 승천 초기화. */
    primalDropPity?: number;
    /** v3.66 태초 계승 게이지: 태초 장비를 분해할 때마다 +1(PRIMAL_INHERIT.gauge만큼 모이면 태초 하나를 계승). 환생 유지, 승천 초기화. */
    primalGauge?: number;
    /** v3.66 유물 위력 규칙 이전 표시(true면 이미 처리함). 새 캐릭터·승천 뒤에는 처음부터 true. */
    relicRule?: boolean;
    /** v3.58 물건 도감 ‘일반’ 4칸을 처음부터 등록된 것으로 처리했는지(확정 구매 삭제). */
    plainCodex?: boolean;
    /** 끝없는 수련으로 생긴 숙련 소수점 누적(1/20 단위, 0~19). */
    masteryCarry?: number;
    /** 자동 정리 · 분해 방식(설정). v3.23부터 정수로 분해. */
    autoSell?: boolean;
    /** v3.24 자동 판매기 켜짐 여부(설정). v3.35부터 자동 분해기와 함께 켤 수 있습니다(같은 등급이면 분해 우선). */
    autoVend?: boolean;
    /** v3.35 자동 분해기·자동 판매기가 처리할 등급(1 희귀 ~ 5 고대). 없으면 연구 단계 기본값(1단계 희귀, 2단계 영웅 이하). 한 등급은 한 장치에만. */
    autoSellGrades?: number[];
    autoVendGrades?: number[];
    /** v25.15 설정: 능력치 ‘최대’ 투자 확인 창을 건너뜁니다. */
    skipStatConfirm?: boolean;
    /** v27.32 설정: 만날 무리의 최대 규모(0이면 무리 끔). 없으면 제한 없음. 상한을 넘게 뽑힌 무리는 상한 규모로 나옵니다. */
    swarmCap?: number;
    /** v25.7 청산 방식(설정). 없으면 판매. */
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
    /**
     * v3.62 숨은 조건을 한 번이라도 만족한(드러난) 히든 직업. 이후로는 조건과 상관없이 계속 만족입니다(secret/unlocks.ts).
     * 이름은 옛 문 시스템(v25.23 한 번 열린 문)의 것을 세이브 호환으로 그대로 씁니다. 옛 윤회의 문 직업도 들어 있을 수 있습니다(드러남만).
     */
    doorsOpened?: string[];
    dungeon: null | {
        id: string;
        wave: number;
        depth?: number;
        /** 반복 도전. left: 남은 추가 도전 횟수(null=실패할 때까지), until: 무릉도장 목표 깊이. */
        repeat?: { left: number | null; until?: number };
        /** v27.70 일반 던전 난이도(DUNGEON_MODES). 없으면 노말. 무릉도장은 쓰지 않습니다. */
        mode?: import('./data/balance').DungeonMode;
    };
    /** v3.18 해커: 비트·권한 등급·해킹 단계·침투 작전 진행. 환생해도 남습니다. */
    hacker?: HackerState;
    /** v3.26 저장 전에 /api/game이 읽고 지우는 임시 표시: 해커 계열로 전직함(채팅 알림). */
    jobAnnounce?: string;
    /** v3.18 서버 해킹 소식(동기화 때 서버가 적음): 진행 중인 방송 탈취, 내가 크래킹당한 시각. */
    hackFeed?: { broadcast?: { text: string; by: string; until: number }; crackedUntil?: number;
        /** v3.25 해커 계열에게만: 변조할 수 있는 이벤트, 지금 다운된 곳, 변조된 이벤트(화이트 해커 복구 대상). */
        events?: { id: string; name: string; until: number; tampered?: boolean }[];
        down?: { kind: 'stage' | 'dungeon'; id: string; until: number; by: string; patched?: boolean }[];
        patched?: Record<string, number>;
        /** v3.27 신원 조작 목록(해커 계열에게만). until 0 = 무기한, mine = 내가 건 것. */
        masks?: { target: string; until: number; by: string; mine?: boolean; /** v3.28 내가 건 미끼 이름 */ decoy?: string }[];
        /** v3.27 다른 해커가 건 견제: 오늘 줄어든 침투 입장(trace), 브루트포스 과부하가 끝나는 시각. */
        traced?: { day: string; n: number };
        overloadUntil?: number;
        /** v3.28 해킹 X 루트 권한 연출(모두에게), 해킹 IX DDoS로 열린 이벤트(모두에게). */
        root?: { by: string; until: number };
        ddos?: { kind: string; by: string; until: number };
        /** v3.28 해커 계열에게만: 세이브 스캠이 이미 걸린 월드보스 세대. */
        scummed?: number[];
    };
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
    /** v3.189 부재중 보정(이벤트 절반 · 특별 몬스터 offlineScale)을 받는 정산 중에만 true인 임시 표시. 1시간(BALANCE.offlineAwaySeconds) 넘게 비웠을 때. */
    away?: boolean;
    /** v3.189 나눠 돌리는 정산(catchUpLeft)이 부재중 보정을 받는 정산인지. 이어 돌릴 때 같은 보정을 씁니다. */
    catchUpAway?: boolean;
    /** v3.17 부재중 정산을 요청당 CATCH_UP_CHUNK턴씩 나눠 돌릴 때 남은 턴. 0이거나 없으면 밀린 정산이 없습니다. */
    catchUpLeft?: number;
    lastOffline: null | {
        seconds: number;
        kills: number;
        gold: number;
        exp: number;
    };
};
/** 서약. breath는 걸었는지, rough는 힘의 길 선택 단계. v27.86 anchor·seal은 옛 ‘잠든 힘’(지금은 던전 랜덤게임) 세이브 호환용으로만 남깁니다. restraint는 절제(1~3단계). */
export type Vows = { anchor?: boolean; breath?: boolean; rough?: number; restraint?: number; seal?: { kind: 'stage' | 'dungeon'; id: string; caught: number; exp: number } | null;
    /** v25.6 이번 생의 조건 카드: stage 지정 사냥터 경험치·골드 ×1.5, tree 지정 계열 직업 숙련 ×2, gold 골드 ×2·경험치 ×0.75. */
    focus?: { kind: 'stage' | 'tree' | 'gold'; id?: string };
    /** v3.210 LV1 모험가(테스트용): 거는 순간의 레벨 · 경험치 · 배분 능력치를 보관하고 Lv.1로 고정합니다. 포기하면 되돌립니다. */
    lv1?: { level: number; exp: number; attributes: Record<Attribute, number>; statPoints: number } };
/** v3.18 침투 작전 한 판. 정답은 서버 키로만 계산하므로 여기에는 남지 않습니다. */
export type HackerInfil = {
    seed: number;
    /** 뚫은 노드 수. 지금 노드는 depth + 1번째. */
    depth: number;
    /** 뽑아 나가면 받는 보상(추적되면 일부만). */
    bank: { bits: number; exp: number };
    /** v3.26 seq(수열) · bin(진법 변환) · cipher(암호 해독) 추가. 새 퍼즐은 문제(prompt)를 함께 적습니다(정답은 서버 키로만 계산). */
    /** v3.28 path(최단 경로) · anagram(패스워드 재조합) 추가. */
    node: { kind: 'lock' | 'port' | 'seq' | 'bin' | 'cipher' | 'path' | 'anagram'; size: number; tries: number; max: number; history: { guess: string; hint: string }[]; prompt?: string };
};
export type HackerState = {
    bits: number;
    /** 권한 경험치(누적, 등급은 grade). */
    exp: number;
    grade: number;
    /** 해금한 해킹 단계(0 = 없음, 1 = I …). */
    tier: number;
    day?: string;
    /** 오늘 쓴 침투 입장·해킹 횟수. */
    entries?: number;
    used?: Record<string, number>;
    infil?: HackerInfil | null;
    bestDepth?: number;
    runs?: number;
    /** 해커로 전직하기 전 장착 스킬(돌아갈 때 되살림). */
    savedSkills?: string[];
    /** 저장 직전 /api/hack이 서버 공유 설정에 반영하고 지우는 해킹 실행. v3.25 해킹 II~V·화이트 해커 복구·패치·스니핑 정산. */
    pending?: { kind: HackKind; value: string; minutes: number; n?: number; bits?: number };
    /** v3.25 산 프로그램(영구)과 장착한 프로그램(메모리 한도 안). */
    programs?: string[];
    loadout?: string[];
    /** v3.25 패킷 스니핑: 이 시각부터 활동한 모험가 수로 끝난 뒤 정산합니다. v3.28 mult: 봇넷 중에 시작하면 2. */
    sniff?: { from: number; until: number; n: number; mult?: number } | null;
    /** v3.28 해킹 VI 패킷 가로채기: 걸어 둔 월드보스와 그 세대. 쓰러진 뒤 정산합니다. */
    intercept?: { raid: string; gen: number; n: number } | null;
    /** v3.28 해킹 VIII 봇넷: 끝나는 시각과 건 날(그날 침투 입장 +2). */
    botnet?: { until: number; day: string };
    /** v3.28 해킹 IX DDoS를 쓴 주(weekKey)와 그 주 횟수. */
    ddos?: { week: string; n: number };
    /** v3.28 해킹 X 루트 권한을 쓴 횟수(칭호 root). */
    roots?: number;
    /** v3.28 블랙 해커가 해킹에 실패해 추적당한 동안(이 시각까지 해킹 불가). */
    bustedUntil?: number;
    /** v3.57 정보 해킹으로 알아낸 비밀 조각(최근 것이 앞, HACKER.leak.keep개까지). */
    leaks?: { id: string; text: string; at: number }[];
    /** v3.29 해커 조직 소속 캐시(동기화 때 10분마다 서버의 crews 행과 맞춤). */
    crew?: { id: string; name: string; side: string; grade: number; leader: boolean; syncedAt: number; /** v3.33 켠 조직 모듈 */ modules?: string[] };
    /** v3.29 오늘 조직에 기여한 비트(하루 상한). */
    crewDeposit?: { day: string; n: number };
    /** v3.32 아직 조직에 올리지 않은 합동 작전 기여(침투 노드·해킹). 침투 작전이 끝난 뒤 한 번에 올립니다. */
    crewPending?: { nodes: number; hacks: number };
    /** v3.32 받은 합동 작전 단계 보상(조직 id:주 → 단계 수, 최근 2주만). */
    crewClaimed?: Record<string, number>;
    /** v3.25 해커 순위(월): 최고 침투 깊이 · 해킹 실행 · 화이트 해커 복구. dirty면 저장 전에 순위표에 올립니다. */
    season?: { key: string; depth: number; hacks: number; restores: number; dirty?: boolean };
};
export type HackKind = 'broadcast' | 'crack' | 'tamper' | 'down' | 'sniffClaim' | 'backdoor' | 'restore' | 'patch' | 'spoof' | 'unspoof' | 'trace' | 'overload'
    /** v3.28 해킹 VI~X(봇넷은 세이브 안에서만 계산). */
    | 'intercept' | 'interceptClaim' | 'savescum' | 'ddos' | 'root'
    /** v3.28 블랙 해커 실패(추적 공지만). */
    | 'busted';
export type Snapshot = {
    /** v3.18 옛 애드가드 숨김 정보(v3.26부터 스냅샷에 싣지 않고 서버 설정 hacks.masked로 가림). */
    privacy?: { show: string[] };
    /** v26.1 표시 칭호 이름(랭킹). */
    title?: string;
    /** v25.12 지난 시즌 순위(상위 3위만 배지). 시즌 이월 때 서버가 넣습니다. */
    seasonRank?: number;
    /** 걸어 둔 서약 배지(랭킹 표시). 예: ['anchor', 'rough2'] */
    vows?: string[];
    /** 세이브 버전. 랭킹·결투는 현재 버전의 스냅샷만 사용합니다. */
    season?: number;
    skillPractice?: Record<string, number>;
    skillRanks?: Record<string, number>;
    skillMastery?: Record<string, number>;
    /** v3.211 극한 단계 최종 피해 배율(스킬 id → 1.02~1.1). 없으면 없음. */
    skillFinal?: Record<string, number>;
    name: string;
    level: number;
    job: string;
    rebirths: number;
    stats: Stats;
    skills: string[];
    /** v3.86 추가 판정 단계(결투·제단·월드보스에도 그대로). */
    /** v3.221 보유한 지역 보스 코어 수(어둠의 추종자 어둠의 의식). */
    /** v3.221 끼고 있는 칠흑 장신구의 보스 id(칠흑의 화신 칠흑 일식). */
    onyx?: string;
    cores?: number;
    extraRolls?: number;
    /** v3.191 지속 피해 체력 비례분의 기준 체력 상한(월드보스 소환 단계: 1단계 체력). 없으면 현재 체력 그대로. */
    dotHpCap?: number;
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
