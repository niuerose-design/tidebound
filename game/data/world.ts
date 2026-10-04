import { MAPLE_MONSTERS } from './maple-monsters';
/** v27.34 메이플 지역 개편: region(지역) · place(세부 장소). name은 ‘지역 · 장소’로, 로그·기록·도감에 그대로 씁니다. id는 그대로라 세이브가 유지됩니다. */
export const STAGES = [
    { id: 'brook', region: '리스항구', place: '선착장', name: '리스항구 · 선착장', subtitle: 'LITH HARBOR · PIER', level: 1, rebirth: 0, description: '빅토리아 아일랜드의 관문. 선착장 끝에서 첫 몬스터가 찾아온다.', fish: ['minnow', 'carp', 'perch'], tone: '#79bca8' },
    { id: 'bay', region: '리스항구', place: '조개 해안', name: '리스항구 · 조개 해안', subtitle: 'LITH HARBOR · SHELL COAST', level: 5, rebirth: 0, description: '항구 뒤 조개껍데기가 깔린 해안. 버섯과 슬라임이 파도 소리에 맞춰 통통 튄다.', fish: ['mackerel', 'ray', 'puffer'], tone: '#68b6ce' },
    { id: 'reef', region: '헤네시스', place: '돼지의 해변', name: '헤네시스 · 돼지의 해변', subtitle: 'HENESYS · PIG BEACH', level: 10, rebirth: 0, description: '헤네시스 남쪽 해변. 돼지 떼가 모래밭을 뛰놀고, 버섯이 그늘에서 덮칠 틈을 노린다.', fish: ['lionfish', 'eel', 'barracuda', 'stormBarracuda'], tone: '#d49081' },
    { id: 'kelp', region: '헤네시스', place: '버섯숲 연못', name: '헤네시스 · 버섯숲 연못', subtitle: 'HENESYS · MUSHROOM POND', level: 14, rebirth: 0, description: '버섯 마을 숲속의 연못. 연못가 그늘마다 색이 다른 버섯들이 자란다.', fish: ['seahorse', 'needlefish', 'tidejelly'], tone: '#72b89b' },
    { id: 'wreck', region: '페리온', place: '유적 발굴지 수로', name: '페리온 · 유적 발굴지 수로', subtitle: 'PERION · EXCAVATION CANAL', level: 18, rebirth: 0, description: '발굴지 아래로 흐르는 수로. 멧돼지가 내달리고, 깨어난 해골 병사와 돌거인이 유물을 지킨다.', fish: ['ghost', 'angler', 'shark'], tone: '#9e96c8' },
    { id: 'volcanic', region: '페리온', place: '불타는 땅 화구호', name: '페리온 · 불타는 땅 화구호', subtitle: 'PERION · BURNING CRATER', level: 24, rebirth: 0, description: '바위산 너머 불타는 땅. 끓는 화구호 곁에서 불씨를 품은 골렘과 드레이크가 깨어난다.', fish: ['emberEel', 'ashRay', 'magmaPuffer', 'cinderKoi'], tone: '#d17c62' },
    { id: 'trench', region: '엘리니아', place: '깊은 숲 늪', name: '엘리니아 · 깊은 숲 늪', subtitle: 'ELLINIA · DEEP FOREST BOG', level: 26, rebirth: 0, description: '빛이 닿지 않는 숲 깊은 곳의 늪. 어둠 속에서 커다란 눈들이 모험가를 지켜본다.', fish: ['viper', 'squid', 'leviathan'], tone: '#5c9dba' },
    { id: 'moon', region: '엘리니아', place: '달빛 마법 호수', name: '엘리니아 · 달빛 마법 호수', subtitle: 'ELLINIA · MOONLIT LAKE', /** v27.30 32 → 34: 평균 몬스터 레벨(36)에 맞춤. */ level: 34, rebirth: 1, description: '마법사의 마을 위 달빛 호수. 나무 위의 루팡과 떠도는 망령 너머, 한 번의 생을 넘어선 모험가만 닿는다.', fish: ['moonfish', 'dragon', 'ancient', 'eclipseMoonfish'], tone: '#b4afd6' },
    { id: 'starfall', region: '커닝시티', place: '네온 수로', name: '커닝시티 · 네온 수로', subtitle: 'KERNING CITY · NEON CANAL', level: 46, rebirth: 2, description: '네온이 별비처럼 쏟아지는 도시의 수로. 거품과 박쥐, 비룡이 밤하늘을 가른다.', fish: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta', 'novaManta'], tone: '#9c8ed4' },
    // v25.8 환생 5회부터. Lv.60 생이 반복되는 환생 중반의 새 땅.
    { id: 'duskVents', region: '커닝시티', place: '지하 배수로', name: '커닝시티 · 지하 배수로', subtitle: 'KERNING CITY · UNDERGROUND DRAIN', level: 55, rebirth: 5, description: '도시 아래 끓어오르는 배수로. 다섯 번의 생을 건넌 모험가만 이 열기를 견딘다.', fish: ['ventCrab', 'glassSquid', 'sulfurEel', 'blindShark', 'cinderAngler', 'ventLeviathan'], tone: '#d88a5a' },
];
/**
 * 무리 사냥: 도감을 완성한 몬스터를 집중 사냥할 때 무리 전체를 체력 ×N인 한 개체로 상대합니다.
 * ×5·×100은 공격이 한 마리와 같고, ×500은 공격도 490배인 도전 과제입니다.
 * 적 자신의 최대 체력 비례 공격은 한 마리 체력 기준입니다. 처치하면 N마리분 보상을 한 번에 지급합니다.
 */
export const SWARM_SIZES = [1, 5, 100, 500] as const;
/** 무리 규모별 해금에 필요한 해당 몬스터 도감 처치 수. */
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
    /** v25.8 변종 몬스터: 이 사냥터 난이도(차수) 이상에서만 나타납니다. */
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
/** 레벨별 몬스터 기본 골드. 장비 판매가도 이 곡선을 따릅니다. */
/** v27.30 몬스터 골드 곡선: Lv.40까지 레벨당 12% 복리, 그 뒤로는 6.5%. 후반 골드가 사용처 비용을 크게 앞지르던 인플레이션을 줄입니다. */
const GOLD_CURVE = { base: 7, early: 1.12, knee: 40, late: 1.065 };
export const fishGoldAt = (level: number) => Math.round(GOLD_CURVE.base * Math.pow(GOLD_CURVE.early, Math.min(level, GOLD_CURVE.knee) - 1) * Math.pow(GOLD_CURVE.late, Math.max(0, level - GOLD_CURVE.knee)));
/** v27.30 골드 사용처 가격 배율: Lv.40까지 1, 그 위로는 몬스터 골드를 따라 커집니다(Lv.65에서 멈춤). */
export const PRICE_LEVEL_CAP = 65;
export const priceScale = (level: number) => Math.max(1, fishGoldAt(Math.min(PRICE_LEVEL_CAP, Math.max(1, level))) / fishGoldAt(GOLD_CURVE.knee));
export const fishExpAt = (level: number) => Math.round(9 * Math.pow(1.15, level - 1));
/**
 * v27.66 레벨 차 경험치 보정: 몬스터가 내 레벨보다 EXP_LEVEL_GAP 넘게 높으면 경험치를 ‘내 레벨 + EXP_LEVEL_GAP’ 몬스터 기준으로 줄입니다.
 * 환생 5회부터 레벨 제한이 풀려 Lv.1이 최상위 사냥터·던전에서 몇 마리 만에 수십 레벨을 오르던 것(환생 반복으로 세계석 찍어 내기)을 막습니다. 골드는 그대로.
 */
export const EXP_LEVEL_GAP = 10;
export const expLevelScale = (monsterLevel: number, playerLevel: number) => monsterLevel > playerLevel + EXP_LEVEL_GAP ? fishExpAt(playerLevel + EXP_LEVEL_GAP) / fishExpAt(monsterLevel) : 1;
/** 몬스터 레벨별 기본 능력치(체력·공격·방어). FISH 정의와 같은 식입니다. */
const fishStatsAt = (level: number) => ({ hp: Math.round(35 + level * 12 + level * level * .65), attack: Math.round(3 + level * 2.2), defense: Math.floor(level * .8) });
/** v27.30 사냥터 적의 능력치는 입장 레벨 + STAGE_ENEMY_LEVEL_OVER까지만 셉니다(보상은 몬스터 레벨 그대로). 입장 직후 몇몇 고레벨 몬스터가 벽이 되던 구간 완화. */
export const STAGE_ENEMY_LEVEL_OVER = 6;
/** 사냥터에서 실제로 싸우는 능력치 기준 몬스터(레벨 상한 적용). 전투와 도감이 같은 값을 씁니다. */
export function stageStatFish<F extends { level: number; hp: number; attack: number; defense: number }>(f: F, stageLevel: number): F {
    const level = Math.min(f.level, stageLevel + STAGE_ENEMY_LEVEL_OVER);
    return level < f.level ? { ...f, level, ...fishStatsAt(level) } : f;
}
/**
 * v27.64 사냥터 난이도의 몬스터 레벨 보정: 난이도가 오를수록 몬스터 레벨이 목표 레벨(내 레벨·가장 높은 사냥터 수준 중 낮은 쪽)로 다가가 난이도 10에서 닿습니다.
 * 전에는 난이도가 체력·공격 배율만 올려, 낮은 사냥터(리스항구)의 약한 몬스터를 고레벨이 순식간에 잡으며 난이도 숙련·까미 확률만 챙겼습니다.
 * 이제 같은 난이도라면 어느 사냥터든 내 레벨 근처까지 단단해져, 사냥터를 취향대로 고를 수 있습니다. 경험치·골드도 올라간 레벨 기준(원래보다 낮아지지 않음).
 */
/** 난이도가 이 단계에 이르면 모든 사냥터 몬스터가 목표 레벨(내 레벨과 가장 높은 사냥터 수준 중 낮은 쪽)에 닿습니다. 그 전에는 남은 차이를 단계 비율만큼 메웁니다. */
export const TIDE_LIFT_TIERS = 10;
/** 목표 레벨의 상한: 가장 높은 사냥터 몬스터의 능력치 레벨(입장 레벨 + STAGE_ENEMY_LEVEL_OVER). 상위 사냥터의 난이도는 그대로 두고 낮은 사냥터만 따라 올라옵니다. */
let liftCap = 0;
const tideLiftCap = () => liftCap ||= Math.max(...STAGES.map(st => st.level)) + STAGE_ENEMY_LEVEL_OVER;
export function tideLiftLevel(level: number, tier: number, playerLevel: number) {
    const target = Math.min(playerLevel, tideLiftCap());
    return target > level && tier > 0 ? Math.round(level + (target - level) * Math.min(1, tier / TIDE_LIFT_TIERS)) : level;
}
export function tideLiftFish<F extends { level: number; hp: number; attack: number; defense: number; exp: number; gold: number }>(f: F, tier: number, playerLevel: number): F {
    const level = tideLiftLevel(f.level, tier, playerLevel);
    return level > f.level ? { ...f, level, ...fishStatsAt(level), exp: Math.max(f.exp, fishExpAt(level)), gold: Math.max(f.gold, fishGoldAt(level)) } : f;
}
export const FISH: FishDef[] = rows.map(([id, name, level, lore]) => ({ id, name, level, hp: Math.round(35 + level * 12 + level * level * .65), attack: Math.round(3 + level * 2.2), defense: Math.floor(level * .8), exp: fishExpAt(level), gold: fishGoldAt(level), lore }));
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
    { id: 'masteryMimic', name: '숙련의 까미', level: 10, lore: '보물상자인 척 입을 벌리고 있다. 잡으면 오래 쌓은 숙련이 한꺼번에 밀려온다.', rarity: 'legendary' as const, spawnWeight: 0, rewardMultiplier: 1 },
    { id: 'expNuri', name: '경험의 누리', level: 50, lore: '후광을 두른 하얀 강아지. 금빛 날개로 사냥터 위를 신나게 날아다니다가, 붙잡히면 품고 있던 경험을 한꺼번에 쏟아 낸다.', rarity: 'legendary' as const, spawnWeight: 0, rewardMultiplier: 1 },
    { id: 'seahorse', name: '파란 버섯', level: 15, lore: '투명한 몸 안에서 작은 별빛이 흔들린다.', rarity: 'rare' as const, spawnWeight: .18, rewardMultiplier: 1.35 },
    { id: 'needlefish', name: '뿔버섯', level: 16, lore: '해초 사이를 화살처럼 가르는 희귀한 사냥꾼.', rarity: 'rare' as const, spawnWeight: .12, rewardMultiplier: 1.45 },
    { id: 'tidejelly', name: '좀비버섯', level: 17, lore: '빛나는 촉수가 물살의 방향을 바꾼다.', rarity: 'epic' as const, spawnWeight: .07, rewardMultiplier: 1.75 },
    { id: 'emberEel', name: '파이어보어', level: 24, lore: '열수 분출구에서 태어난 붉은 전류의 뱀.', rarity: 'rare' as const, spawnWeight: .14, rewardMultiplier: 1.5 },
    { id: 'ashRay', name: '다크 스톤골렘', level: 26, lore: '화산재를 날개처럼 두르고 수면을 가른다.', rarity: 'rare' as const, spawnWeight: .1, rewardMultiplier: 1.55 },
    { id: 'magmaPuffer', name: '믹스 골렘', level: 27, lore: '몸속에 뜨거운 독을 저장한 위험한 희귀종.', rarity: 'epic' as const, spawnWeight: .06, rewardMultiplier: 1.9 },
    { id: 'cinderKoi', name: '레드 드레이크', level: 29, lore: '비늘 사이로 식지 않은 불꽃이 흐른다.', rarity: 'epic' as const, spawnWeight: .045, rewardMultiplier: 2.1 },
    { id: 'starKoi', name: '버블링', level: 46, lore: '별자리의 무늬를 비늘에 품은 외해의 희귀종.', rarity: 'rare' as const, spawnWeight: .1, rewardMultiplier: 1.8 },
    { id: 'prismRay', name: '옥토퍼스', level: 48, lore: '빛을 일곱 갈래로 쪼개며 헤엄친다.', rarity: 'epic' as const, spawnWeight: .065, rewardMultiplier: 2.2 },
    { id: 'voidGuppy', name: '스티지', level: 50, lore: '작은 몸 안에 깊이를 측정할 수 없는 어둠이 있다.', rarity: 'epic' as const, spawnWeight: .04, rewardMultiplier: 2.35 },
    // v25.8 차수 변종: 사냥터 난이도 10·20·30 이상에서만 나타나는 희귀 변종. 도감 항목이 따로 있어 차수를 올릴 이유가 됩니다.
    { id: 'stormBarracuda', name: '아이언 호그', level: 20, lore: '폭풍이 지나간 산호초에만 나타나는 검은 번개의 사냥꾼.', rarity: 'epic' as const, spawnWeight: .08, rewardMultiplier: 2.4 }, // v26.6 사냥터 난이도 조건(10) 제거: 이미 산호초에서 저격해 온 유저가 있어 난이도 0부터 출현
    { id: 'eclipseMoonfish', name: '레이스', level: 44, lore: '달이 가려진 밤, 심연의 빛을 등에 지고 떠오른다.', rarity: 'epic' as const, spawnWeight: .06, rewardMultiplier: 2.8, minTier: 20 },
    { id: 'novaManta', name: '와이번', level: 58, lore: '별이 터지는 순간의 빛을 날개에 새긴 외해의 전설.', rarity: 'legendary' as const, spawnWeight: .03, rewardMultiplier: 3.4, minTier: 30 },
    { id: 'cinderAngler', name: '크로코', level: 60, lore: '열수구의 불씨를 등불 삼아 어둠 속에서 입을 벌린다.', rarity: 'rare' as const, spawnWeight: .6, rewardMultiplier: 1.9 },
    { id: 'ventLeviathan', name: '다크 와이번', level: 63, lore: '열수구를 통째로 둥지로 삼은 거대한 그림자.', rarity: 'epic' as const, spawnWeight: .3, rewardMultiplier: 2.5 },
    { id: 'abyssManta', name: '와일드 카고', level: 54, lore: '날개를 펼치면 주변의 조류가 잠시 멎는다.', rarity: 'legendary' as const, spawnWeight: .018, rewardMultiplier: 2.8 },
    { id: 'grottoWarden', name: '머쉬맘', level: 14, lore: '버섯 동산을 다스리는 거대한 버섯. 짓누르는 몸통으로 침묵의 충격을 뿜는다.', rarity: 'legendary' as const, rewardMultiplier: 2.6, boss: true },
    { id: 'kelpHydra', name: '킹 슬라임', level: 22, lore: '쪼개질 때마다 새 슬라임을 낳는 수로의 왕.', rarity: 'legendary' as const, rewardMultiplier: 3, boss: true },
    { id: 'anchorWraith', name: '좀비 머쉬맘', level: 25, lore: '개미굴 깊은 곳에서 되살아난 머쉬맘. 느린 저주를 건다.', rarity: 'legendary' as const, rewardMultiplier: 3.2, boss: true },
    { id: 'magmaKraken', name: '주니어 발록', level: 34, lore: '불의 제단을 지키는 마족. 불길을 휘감은 손톱으로 할퀸다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'templeOracle', name: '엘리쟈', level: 38, lore: '환생자의 기억을 읽고 침묵의 바람을 부르는 하늘의 마녀.', rarity: 'legendary' as const, rewardMultiplier: 3.8, boss: true },
    { id: 'abyssSovereign', name: '무공', level: 52, lore: '무릉도장의 가장 높은 곳에서 다음 도전자를 기다리는 도장의 주인.', rarity: 'legendary' as const, rewardMultiplier: 5, boss: true },
    { id: 'ventColossus', name: '자쿰', level: 66, lore: '엘나스 폐광의 제단에 봉인된 거대 석상. 여러 개의 팔이 따로 움직인다.', rarity: 'legendary' as const, rewardMultiplier: 6, boss: true },
    { id: 'starfallSeraph', name: '파풀라투스', level: 62, lore: '루디브리엄 시계탑의 시간을 멈춘 차원의 침략자.', rarity: 'legendary' as const, rewardMultiplier: 5.5, boss: true },
];
for (const f of specialFish)
    FISH.push({ id: f.id, name: f.name, level: f.level, hp: Math.round(35 + f.level * 12 + f.level * f.level * .65), attack: Math.round(3 + f.level * 2.2), defense: Math.floor(f.level * .8), exp: fishExpAt(f.level), gold: fishGoldAt(f.level), lore: f.lore, rarity: f.rarity, spawnWeight: f.spawnWeight, rewardMultiplier: f.rewardMultiplier, boss: f.boss, ...(f.minTier ? { minTier: f.minTier } : {}) });
// v27.41 메이플 몬스터 이름: maple-monsters.ts 한곳에서 이름·설명을 덮어씁니다(id·능력치는 그대로).
for (const f of FISH) { const m = MAPLE_MONSTERS[f.id]; if (m) { f.name = m.name; f.lore = m.lore; } }
/**
 * v27.31 운영 페이지에서 닫은 사냥터·던전(입장 불가). 서버가 DB 설정(settings.closures)을 읽어 setClosures로 채웁니다.
 * 설정을 한 번도 저장하지 않았으면 DEFAULT_CLOSURES(무릉도장 닫힘)를 씁니다. 테스트는 harness에서 비웁니다.
 * 서버 계산은 dungeonClosed·stageClosed를, 화면은 동기화 때 적힌 State.closed를 봅니다.
 */
export type Closures = { dungeons: string[]; stages: string[] };
export const DEFAULT_CLOSURES: Closures = { dungeons: ['abyss'], stages: [] };
export const CLOSED_DUNGEONS = new Set<string>(DEFAULT_CLOSURES.dungeons);
const CLOSED_STAGES = new Set<string>(DEFAULT_CLOSURES.stages);
export const dungeonClosed = (id: string) => CLOSED_DUNGEONS.has(id);
export const stageClosed = (id: string) => CLOSED_STAGES.has(id);
/** 첫 사냥터는 닫을 수 없습니다(닫힌 사냥터에서 쫓겨난 모험가가 돌아갈 곳). */
export function setClosures(c: Closures) {
    CLOSED_DUNGEONS.clear(); CLOSED_STAGES.clear();
    for (const id of c.dungeons) if (DUNGEONS.some(d => d.id === id)) CLOSED_DUNGEONS.add(id);
    for (const id of c.stages) if (id !== STAGES[0].id && STAGES.some(st => st.id === id)) CLOSED_STAGES.add(id);
}
/** State.closed에 적을 지금 닫힌 목록. 닫힌 곳이 없으면 null. */
export const closuresSnapshot = (): Closures | null => CLOSED_DUNGEONS.size || CLOSED_STAGES.size ? { dungeons: [...CLOSED_DUNGEONS], stages: [...CLOSED_STAGES] } : null;
/** 화면용: 동기화 때 받은 State.closed 기준. */
export const closedIn = (s: { closed?: Closures | null }, kind: keyof Closures, id: string) => !!s.closed?.[kind]?.includes(id);
export const CLOSED_NOTE = '점검 중 · 입장 불가';
export const DUNGEONS = [
    { id: 'abyss', name: '무릉도장', level: 40, rebirth: 3, fish: ['moonfish', 'dragon', 'ancient', 'dragon', 'ancient'], bossFish: 'abyssSovereign', boss: '도장의 주인 · 무공', gold: 12000, pearls: 1, description: '오를 때마다 다음 층이 열립니다. 높을수록 층마다 더 많은 세계석을 얻고, 10·25·50·100층을 처음 돌파하면 SP 1을 받습니다.' },
    { id: 'grotto', name: '헤네시스 · 버섯 동산', level: 8, rebirth: 0, fish: ['ray', 'puffer', 'mackerel', 'ray', 'eel'], bossFish: 'grottoWarden', boss: '버섯 동산의 주인 · 머쉬맘', gold: 350, pearls: 1, description: '다섯 번의 전투 끝에 거대한 버섯이 눈을 뜬다.' },
    { id: 'kelpCatacomb', name: '커닝시티 · 지하 수로', level: 14, rebirth: 0, fish: ['seahorse', 'needlefish', 'tidejelly', 'seahorse', 'needlefish'], bossFish: 'kelpHydra', boss: '수로의 왕 · 킹 슬라임', gold: 950, pearls: 1, description: '갈라지고 또 갈라지는 슬라임들이 도시 아래 수로를 메웠다.' },
    { id: 'cemetery', name: '슬리피우드 · 개미굴', level: 18, rebirth: 0, fish: ['ghost', 'angler', 'ghost', 'shark', 'shark'], bossFish: 'anchorWraith', boss: '개미굴의 망령 · 좀비 머쉬맘', gold: 1600, pearls: 2, description: '깊은 개미굴 아래, 썩지 않는 버섯이 마지막 보물을 지킨다.' },
    { id: 'caldera', name: '페리온 · 불의 제단', level: 26, rebirth: 0, fish: ['emberEel', 'ashRay', 'magmaPuffer', 'cinderKoi', 'emberEel'], bossFish: 'magmaKraken', boss: '불꽃의 마족 · 주니어 발록', gold: 4200, pearls: 3, description: '뜨거운 불길이 장비와 골드를 녹여 새로운 형태로 만든다.' },
    { id: 'temple', name: '엘리니아 · 잊힌 마법 사원', level: 30, rebirth: 1, fish: ['viper', 'squid', 'leviathan', 'moonfish', 'dragon'], bossFish: 'templeOracle', boss: '하늘의 마녀 · 엘리쟈', gold: 6000, pearls: 5, description: '환생의 기억을 지닌 자에게만 열리는 문.' },
    { id: 'ventCathedral', name: '엘나스 · 자쿰의 제단', level: 60, rebirth: 8, fish: ['ventCrab', 'sulfurEel', 'glassSquid', 'blindShark', 'ventLeviathan'], bossFish: 'ventColossus', boss: '폐광의 거대 석상 · 자쿰', gold: 30000, pearls: 12, description: '엘나스 폐광 깊은 곳의 제단. 팔 하나하나가 숨을 쉬는, 환생 8회의 탐험지.' },
    { id: 'starSanctum', name: '루디브리엄 · 시계탑', level: 48, rebirth: 2, fish: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta', 'starKoi'], bossFish: 'starfallSeraph', boss: '시계탑의 주인 · 파풀라투스', gold: 18000, pearls: 8, description: '장난감 도시의 시계탑 꼭대기. 멈춘 시간 속에서 차원의 침략자와 맞서는 후반 탐험지.' },
];
