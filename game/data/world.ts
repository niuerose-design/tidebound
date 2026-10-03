export const STAGES = [
    { id: 'brook', name: '여명의 시냇가', subtitle: 'DAWN CREEK', level: 1, rebirth: 0, description: '물안개 너머, 첫 번째 입질이 찾아온다.', fish: ['minnow', 'carp', 'perch'], tone: '#79bca8' },
    { id: 'bay', name: '푸른 조개 만', subtitle: 'SHELL BAY', level: 5, rebirth: 0, description: '잔잔한 수면 아래 날카로운 비늘이 숨어 있다.', fish: ['mackerel', 'ray', 'puffer'], tone: '#68b6ce' },
    { id: 'reef', name: '붉은 산호초', subtitle: 'CRIMSON REEF', level: 10, rebirth: 0, description: '붉게 물든 산호 사이로 포식자가 유영한다.', fish: ['lionfish', 'eel', 'barracuda', 'stormBarracuda'], tone: '#d49081' },
    { id: 'kelp', name: '속삭이는 해초림', subtitle: 'WHISPERING KELP', level: 14, rebirth: 0, description: '해초의 미로에는 작지만 희귀한 생명들이 숨는다.', fish: ['seahorse', 'needlefish', 'tidejelly'], tone: '#72b89b' },
    { id: 'wreck', name: '망각의 난파선', subtitle: 'FORGOTTEN WRECK', level: 18, rebirth: 0, description: '잊힌 선원의 낚싯줄은 아직 팽팽하다.', fish: ['ghost', 'angler', 'shark'], tone: '#9e96c8' },
    { id: 'volcanic', name: '검은 화산수역', subtitle: 'BLACKWATER CALDERA', level: 24, rebirth: 0, description: '열수 분출구가 바다를 끓이고, 불씨를 품은 물고기가 떠오른다.', fish: ['emberEel', 'ashRay', 'magmaPuffer', 'cinderKoi'], tone: '#d17c62' },
    { id: 'trench', name: '검은 해구', subtitle: 'BLACK TRENCH', level: 26, rebirth: 0, description: '빛이 닿지 않는 곳, 거대한 심장이 뛴다.', fish: ['viper', 'squid', 'leviathan'], tone: '#5c9dba' },
    { id: 'moon', name: '달빛의 심연', subtitle: 'LUNAR ABYSS', level: 32, rebirth: 1, description: '한 번의 생을 넘어선 낚시꾼만 닿는 바다.', fish: ['moonfish', 'dragon', 'ancient', 'eclipseMoonfish'], tone: '#b4afd6' },
    { id: 'starfall', name: '별비의 외해', subtitle: 'STARFALL OPEN SEA', level: 46, rebirth: 2, description: '별이 바다에 떨어진 날 태어난 희귀종들이 밤을 가른다.', fish: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta', 'novaManta'], tone: '#9c8ed4' },
    // v25.8 환생 5회부터. Lv.60 생이 반복되는 환생 중반의 새 땅.
    { id: 'duskVents', name: '황혼의 열수구', subtitle: 'DUSK VENTS', level: 55, rebirth: 5, description: '해저에서 끓어오르는 물기둥 사이, 다섯 번의 생을 건넌 낚시꾼만 견디는 바다.', fish: ['ventCrab', 'glassSquid', 'sulfurEel', 'blindShark', 'cinderAngler', 'ventLeviathan'], tone: '#d88a5a' },
];
/**
 * 무리 사냥: 도감을 완성한 어종을 집중 사냥할 때 무리 전체를 체력 ×N인 한 개체로 상대합니다.
 * ×5·×100은 공격이 한 마리와 같고, ×500은 공격도 490배인 도전 과제입니다.
 * 적 자신의 최대 체력 비례 공격은 한 마리 체력 기준입니다. 포획하면 N마리분 보상을 한 번에 지급합니다.
 */
export const SWARM_SIZES = [1, 5, 100, 500] as const;
/** 무리 규모별 해금에 필요한 해당 어종 도감 포획 수. */
export const SWARM_UNLOCK: Record<number, number> = { 1: 0, 5: 10, 100: 500, 500: 5000 };
/** 무리 체력 배율: N배, ×100 이상은 98%(×100 = 98배, ×500 = 490배). */
export const swarmHpMultiplier = (size: number) => size >= 100 ? size * .98 : Math.max(1, size);
/** 무리 공격 배율: ×500 도전 무리만 체력과 같은 배율(490배), 그 아래 규모는 한 마리와 같습니다. 방어·속도는 늘 한 마리와 같습니다. */
export const swarmAttackMultiplier = (size: number) => size >= 500 ? swarmHpMultiplier(size) : 1;
export type FishDef = {
    id: string;
    name: string;
    level: number;
    hp: number;
    attack: number;
    defense: number;
    exp: number;
    gold: number;
    lore: string;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    spawnWeight?: number;
    rewardMultiplier?: number;
    boss?: boolean;
    /** v25.8 변종 어종: 이 해역 난이도(차수) 이상에서만 나타납니다. */
    minTier?: number;
};
const rows: [
    string,
    string,
    number,
    string
][] = [
    ['minnow', '은빛 피라미', 1, '작지만 물살을 거스르는 용기를 품었다.'], ['carp', '이끼 붕어', 2, '등에 얹힌 이끼는 오래된 강의 지도다.'], ['perch', '바늘 농어', 3, '날카로운 지느러미로 낚싯줄을 시험한다.'],
    ['mackerel', '청람 고등어', 5, '바다의 푸른 결을 비늘에 새겼다.'], ['ray', '모래 가오리', 6, '모래 속에서 소리 없이 기다린다.'], ['puffer', '가시 복어', 7, '겁을 먹을수록 더욱 위험해진다.'],
    ['lionfish', '불꽃 쏠배감펭', 10, '붉은 지느러미가 불꽃처럼 일렁인다.'], ['eel', '전류 곰치', 12, '산호초의 벼락이라 불린다.'], ['barracuda', '산호 바라쿠다', 14, '단 한 번의 돌진으로 사냥을 끝낸다.'],
    ['ghost', '유령 가자미', 18, '난파선의 그림자와 함께 움직인다.'], ['angler', '등불 아귀', 20, '아름다운 불빛은 친절이 아니다.'], ['shark', '철갑 상어', 22, '가라앉은 닻을 먹고 자란 포식자.'],
    ['viper', '심연 독사고기', 26, '눈보다 송곳니가 먼저 빛난다.'], ['squid', '거대 오징어', 28, '오래된 해도 위의 괴물은 실재했다.'], ['leviathan', '어린 레비아탄', 30, '이 거대한 그림자가 아직 어린 개체라니.'],
    ['moonfish', '월광 개복치', 32, '달의 파편을 삼켜 빛을 품었다.'], ['dragon', '해룡', 36, '물살을 뒤집고 조류를 지배한다.'], ['ancient', '태고의 실러캔스', 40, '바다가 처음 생긴 날을 기억한다.'],
    // v25.8 황혼의 열수구(환생 5회, Lv.55)
    ['ventCrab', '열수 게', 55, '끓는 물줄기 옆에서 집게를 벼린다. 껍데기가 쇠처럼 울린다.'], ['glassSquid', '유리 오징어', 57, '몸이 투명해 심장의 박동만 보인다.'], ['sulfurEel', '유황 곰치', 59, '숨을 쉴 때마다 노란 연기가 물을 흐린다.'], ['blindShark', '눈먼 상어', 61, '빛을 잃은 대신 물살의 떨림으로 모든 것을 본다.'],
];
/** 레벨별 물고기 기본 골드. 장비 판매가도 이 곡선을 따릅니다. */
export const fishGoldAt = (level: number) => Math.round(7 * Math.pow(1.12, level - 1));
export const FISH: FishDef[] = rows.map(([id, name, level, lore]) => ({ id, name, level, hp: Math.round(35 + level * 12 + level * level * .65), attack: Math.round(3 + level * 2.2), defense: Math.floor(level * .8), exp: Math.round(9 * Math.pow(1.15, level - 1)), gold: fishGoldAt(level), lore }));
const specialFish: Array<{
    id: string;
    name: string;
    level: number;
    lore: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    spawnWeight?: number;
    rewardMultiplier?: number;
    boss?: boolean;
    minTier?: number;
}> = [
    { id: 'seahorse', name: '유리 해마', level: 15, lore: '투명한 몸 안에서 작은 별빛이 흔들린다.', rarity: 'rare' as const, spawnWeight: .18, rewardMultiplier: 1.35 },
    { id: 'needlefish', name: '은침 청새치', level: 16, lore: '해초 사이를 화살처럼 가르는 희귀한 사냥꾼.', rarity: 'rare' as const, spawnWeight: .12, rewardMultiplier: 1.45 },
    { id: 'tidejelly', name: '조류 해파리', level: 17, lore: '빛나는 촉수가 물살의 방향을 바꾼다.', rarity: 'epic' as const, spawnWeight: .07, rewardMultiplier: 1.75 },
    { id: 'emberEel', name: '불씨 곰치', level: 24, lore: '열수 분출구에서 태어난 붉은 전류의 뱀.', rarity: 'rare' as const, spawnWeight: .14, rewardMultiplier: 1.5 },
    { id: 'ashRay', name: '재빛 가오리', level: 26, lore: '화산재를 날개처럼 두르고 수면을 가른다.', rarity: 'rare' as const, spawnWeight: .1, rewardMultiplier: 1.55 },
    { id: 'magmaPuffer', name: '마그마 복어', level: 27, lore: '몸속에 뜨거운 독을 저장한 위험한 희귀종.', rarity: 'epic' as const, spawnWeight: .06, rewardMultiplier: 1.9 },
    { id: 'cinderKoi', name: '잿불 비단잉어', level: 29, lore: '비늘 사이로 식지 않은 불꽃이 흐른다.', rarity: 'epic' as const, spawnWeight: .045, rewardMultiplier: 2.1 },
    { id: 'starKoi', name: '성운 비단잉어', level: 46, lore: '별자리의 무늬를 비늘에 품은 외해의 희귀종.', rarity: 'rare' as const, spawnWeight: .1, rewardMultiplier: 1.8 },
    { id: 'prismRay', name: '프리즘 가오리', level: 48, lore: '빛을 일곱 갈래로 쪼개며 헤엄친다.', rarity: 'epic' as const, spawnWeight: .065, rewardMultiplier: 2.2 },
    { id: 'voidGuppy', name: '공허 구피', level: 50, lore: '작은 몸 안에 깊이를 측정할 수 없는 어둠이 있다.', rarity: 'epic' as const, spawnWeight: .04, rewardMultiplier: 2.35 },
    // v25.8 차수 변종: 해역 난이도 10·20·30 이상에서만 나타나는 희귀 변종. 도감 항목이 따로 있어 차수를 올릴 이유가 됩니다.
    { id: 'stormBarracuda', name: '폭풍 바라쿠다', level: 20, lore: '폭풍이 지나간 산호초에만 나타나는 검은 번개의 사냥꾼.', rarity: 'epic' as const, spawnWeight: .08, rewardMultiplier: 2.4 }, // v26.6 해역 난이도 조건(10) 제거: 이미 산호초에서 저격해 온 유저가 있어 난이도 0부터 출현
    { id: 'eclipseMoonfish', name: '월식 개복치', level: 44, lore: '달이 가려진 밤, 심연의 빛을 등에 지고 떠오른다.', rarity: 'epic' as const, spawnWeight: .06, rewardMultiplier: 2.8, minTier: 20 },
    { id: 'novaManta', name: '신성 만타', level: 58, lore: '별이 터지는 순간의 빛을 날개에 새긴 외해의 전설.', rarity: 'legendary' as const, spawnWeight: .03, rewardMultiplier: 3.4, minTier: 30 },
    { id: 'cinderAngler', name: '잿불 아귀', level: 60, lore: '열수구의 불씨를 등불 삼아 어둠 속에서 입을 벌린다.', rarity: 'rare' as const, spawnWeight: .6, rewardMultiplier: 1.9 },
    { id: 'ventLeviathan', name: '열수 레비아탄', level: 63, lore: '열수구를 통째로 둥지로 삼은 거대한 그림자.', rarity: 'epic' as const, spawnWeight: .3, rewardMultiplier: 2.5 },
    { id: 'abyssManta', name: '심연 만타', level: 54, lore: '날개를 펼치면 주변의 조류가 잠시 멎는다.', rarity: 'legendary' as const, spawnWeight: .018, rewardMultiplier: 2.8 },
    { id: 'grottoWarden', name: '동굴의 수호 곰치', level: 14, lore: '동굴의 진주를 지키며 침묵의 전류를 뿜는다.', rarity: 'legendary' as const, rewardMultiplier: 2.6, boss: true },
    { id: 'kelpHydra', name: '해초 히드라', level: 22, lore: '잘린 촉수마다 새로운 머리가 자라는 던전의 보스.', rarity: 'legendary' as const, rewardMultiplier: 3, boss: true },
    { id: 'anchorWraith', name: '닻망령', level: 25, lore: '침몰한 닻을 갑옷 삼아 느린 저주를 건다.', rarity: 'legendary' as const, rewardMultiplier: 3.2, boss: true },
    { id: 'magmaKraken', name: '용암 크라켄', level: 34, lore: '화산수역의 심장을 감싸는 다중 촉수의 주인.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'templeOracle', name: '심해 신탁어', level: 38, lore: '환생자의 기억을 읽고 침묵의 파도를 부른다.', rarity: 'legendary' as const, rewardMultiplier: 3.8, boss: true },
    { id: 'abyssSovereign', name: '심연의 주권자', level: 52, lore: '무한 심연의 가장 깊은 곳에서 다음 생을 기다린다.', rarity: 'legendary' as const, rewardMultiplier: 5, boss: true },
    { id: 'ventColossus', name: '열수 거신', level: 66, lore: '열수 대성당의 기둥 자체가 움직이는 심해의 거인.', rarity: 'legendary' as const, rewardMultiplier: 6, boss: true },
    { id: 'starfallSeraph', name: '별비 세라핌', level: 62, lore: '별비를 날개로 두른 외해 성역의 최종 수호자.', rarity: 'legendary' as const, rewardMultiplier: 5.5, boss: true },
];
for (const f of specialFish)
    FISH.push({ id: f.id, name: f.name, level: f.level, hp: Math.round(35 + f.level * 12 + f.level * f.level * .65), attack: Math.round(3 + f.level * 2.2), defense: Math.floor(f.level * .8), exp: Math.round(9 * Math.pow(1.15, f.level - 1)), gold: fishGoldAt(f.level), lore: f.lore, rarity: f.rarity, spawnWeight: f.spawnWeight, rewardMultiplier: f.rewardMultiplier, boss: f.boss, ...(f.minTier ? { minTier: f.minTier } : {}) });
export const DUNGEONS = [
    { id: 'abyss', name: '윤회의 무한 심연', level: 40, rebirth: 3, fish: ['moonfish', 'dragon', 'ancient', 'dragon', 'ancient'], bossFish: 'abyssSovereign', boss: '심연의 기억 · 심연의 주권자', gold: 12000, pearls: 1, description: '정복할 때마다 다음 깊이가 열립니다. 깊을수록 층마다 더 많은 진주를 얻고, 10·25·50·100층을 처음 돌파하면 SP 1을 받습니다.' },
    { id: 'grotto', name: '조수의 동굴', level: 8, rebirth: 0, fish: ['ray', 'puffer', 'mackerel', 'ray', 'eel'], bossFish: 'grottoWarden', boss: '동굴의 주인 · 수호 곰치', gold: 350, pearls: 1, description: '다섯 번의 전투 끝에 잠든 수호자가 눈을 뜬다.' },
    { id: 'kelpCatacomb', name: '해초 묘실', level: 14, rebirth: 0, fish: ['seahorse', 'needlefish', 'tidejelly', 'seahorse', 'needlefish'], bossFish: 'kelpHydra', boss: '촉수의 왕 · 해초 히드라', gold: 950, pearls: 1, description: '길을 잃은 탐험선이 해초 뿌리 아래에 잠들어 있다.' },
    { id: 'cemetery', name: '닻의 묘지', level: 18, rebirth: 0, fish: ['ghost', 'angler', 'ghost', 'shark', 'shark'], bossFish: 'anchorWraith', boss: '침몰의 군주 · 닻망령', gold: 1600, pearls: 2, description: '돌아오지 못한 배들이 남긴 마지막 보물.' },
    { id: 'caldera', name: '검은 화구 제단', level: 26, rebirth: 0, fish: ['emberEel', 'ashRay', 'magmaPuffer', 'cinderKoi', 'emberEel'], bossFish: 'magmaKraken', boss: '분출의 왕 · 용암 크라켄', gold: 4200, pearls: 3, description: '뜨거운 조류가 장비와 골드를 녹여 새로운 형태로 만든다.' },
    { id: 'temple', name: '심해 신전', level: 30, rebirth: 1, fish: ['viper', 'squid', 'leviathan', 'moonfish', 'dragon'], bossFish: 'templeOracle', boss: '태고의 수호자 · 심해 신탁어', gold: 6000, pearls: 5, description: '환생의 기억을 지닌 자에게만 열리는 문.' },
    { id: 'ventCathedral', name: '열수 대성당', level: 60, rebirth: 8, fish: ['ventCrab', 'sulfurEel', 'glassSquid', 'blindShark', 'ventLeviathan'], bossFish: 'ventColossus', boss: '기둥의 주인 · 열수 거신', gold: 30000, pearls: 12, description: '열수구 아래 가라앉은 대성당. 기둥 하나하나가 숨을 쉬는, 환생 8회의 탐험지.' },
    { id: 'starSanctum', name: '별비 성소', level: 48, rebirth: 2, fish: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta', 'starKoi'], bossFish: 'starfallSeraph', boss: '별비의 수호자 · 세라핌', gold: 18000, pearls: 8, description: '희귀어의 서식지를 지나 별빛을 낚아 올리는 후반 탐험지.' },
];
