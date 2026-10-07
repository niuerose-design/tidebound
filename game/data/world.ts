import { ODDS, oddsKnown, STAGE_REWARD_AVG, type StageRewardAvg } from './odds';
import { MAPLE_MONSTERS } from './maple-monsters';
/** v27.34 메이플 지역 개편: region(지역) · place(세부 장소). name은 ‘지역 · 장소’로, 로그·기록·도감에 그대로 씁니다. id는 그대로라 세이브가 유지됩니다. */
/** 사냥터 정의. habitat는 v27.80 무리 서식지(지역마다 하나)입니다. */
export type StageDef = { id: string; region: string; place: string; name: string; subtitle: string; level: number; rebirth: number; description: string; fish: string[]; tone: string; habitat?: boolean; /** v3.103 적정 환생(측정, docs/hunting-ground-plan.md 9절). 입장 조건(rebirth)보다 클 때만 따로 보입니다. */ fit?: number };
const BASE_STAGES: StageDef[] = [
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
    // v3.10 고레벨 사냥터 4곳(Lv.70·80·90·100). 환생 요구 레벨 곡선(12회 66 · 20회 74 · 35회 89 · 50회 100)에 맞춰 엽니다.
    { id: 'coralForest', region: '아쿠아로드', place: '산호 숲', name: '아쿠아로드 · 산호 숲', subtitle: 'AQUA ROAD · CORAL FOREST', level: 70, rebirth: 10, description: '빛이 산호 사이로 부서지는 바다 밑 숲. 씨코와 상어가 물결을 가르고, 수호병이 깊은 곳을 지킨다.', fish: ['aqSeaco', 'aqShark', 'aqSquid', 'aqFlower', 'aqGuard'], tone: '#4fa3c7' },
    { id: 'dragonNest', region: '리프레', place: '용의 둥지', name: '리프레 · 용의 둥지', subtitle: 'LEAFRE · DRAGON NEST', level: 80, rebirth: 15, description: '용의 숲 깊은 곳의 둥지. 드래곤 터틀이 바위처럼 엎드려 있고 와이번이 절벽을 돈다.', fish: ['lfBlueTurtle', 'lfRedTurtle', 'lfWyvern', 'lfSkelegon', 'lfManticore'], tone: '#7fb069' },
    { id: 'memoryLane', region: '시간의 신전', place: '기억의 길', name: '시간의 신전 · 기억의 길', subtitle: 'TEMPLE OF TIME · MEMORY LANE', level: 90, rebirth: 15, description: '시간이 멈춘 신전의 회랑. 기억의 수호병과 키메라가 지나온 생을 묻는다.', fish: ['ttMonitor', 'ttGuardian', 'ttChimera', 'ttDodo', 'ttLyka'], tone: '#c9a85c' },
    { id: 'vanishingJourney', region: '아케인 리버', place: '소멸의 여로', name: '아케인 리버 · 소멸의 여로', subtitle: 'ARCANE RIVER · VANISHING JOURNEY', level: 100, rebirth: 20, description: '세계의 끝에서 흐르는 강. 에르다가 영혼이 되어 떠돌고, 쉰 번의 생을 건넌 모험가만 이 강을 거슬러 오른다.', fish: ['arErdaSpirit', 'arMemoryGuard', 'arMysticErda', 'arVanishSoul', 'arTrueErda'], tone: '#8b7fd6' },
];
/**
 * v27.80 무리 서식지: 지역마다 하나. 그 지역 몬스터가 전부 무리로만 나옵니다(×100 75% · ×500 25%, 도감·패시브 조건 없음).
 * 처치 한 번에 마리 수만큼 보상·도감이 쌓이는 고위험 고보상 사냥터입니다(v3.42 드롭은 √N번 판정, swarmDropRolls). v3.106부터 까미·누리도 나옵니다(무리가 아닌 한 마리로).
 * 입장: 지역 사냥터의 최고 레벨 · 환생은 HABITAT_REBIRTH 표(v3.103, 그 전에는 지역 사냥터 최고 환생 조건 + 2, 최소 2회).
 */
// v3.52 ×500 확률(bigChance)은 서버 전용(game/secret/odds.ts).
export const HABITAT = { sizes: [100, 500] as const, get bigChance() { return ODDS.variant.habitatBig; }, rebirthOver: 2, minRebirth: 2 };
const HABITAT_META: Record<string, { id: string; subtitle: string; description: string; tone: string }> = {
    '리스항구': { id: 'lithSwarm', subtitle: 'LITH HARBOR · SWARM NEST', description: '항구 뒤편 갯바위. 첫 바다의 몬스터들이 떼로 몰려와 한 덩어리로 덤빈다.', tone: '#5fa8a0' },
    '헤네시스': { id: 'henesysSwarm', subtitle: 'HENESYS · SWARM MEADOW', description: '돼지와 버섯이 끝없이 몰려드는 들판. 한 번 휩쓸면 도감이 백 장씩 넘어간다.', tone: '#c98a6a' },
    '페리온': { id: 'perionSwarm', subtitle: 'PERION · SWARM CANYON', description: '바위 협곡을 메운 멧돼지와 골렘 떼. 버티지 못하면 한꺼번에 밀려난다.', tone: '#b9744f' },
    '엘리니아': { id: 'elliniaSwarm', subtitle: 'ELLINIA · SWARM HOLLOW', description: '숲의 그림자마다 몬스터가 겹겹이 숨어 있다. 망령까지 떼를 지어 떠오른다.', tone: '#8f88c4' },
    '커닝시티': { id: 'kerningSwarm', subtitle: 'KERNING CITY · SWARM SEWER', description: '배수로 가득 차오른 몬스터의 물결. 다섯 번의 생으로도 모자란 곳.', tone: '#6d7fb0' },
    '아쿠아로드': { id: 'aquaSwarm', subtitle: 'AQUA ROAD · SWARM REEF', description: '산호초를 뒤덮은 바다 몬스터의 떼. 물결이 통째로 덤벼든다.', tone: '#3f8fb5' },
    '리프레': { id: 'leafreSwarm', subtitle: 'LEAFRE · SWARM VALLEY', description: '용의 숲 골짜기를 메운 비룡과 터틀의 무리. 날개 소리만으로 땅이 울린다.', tone: '#6b9d58' },
    '시간의 신전': { id: 'templeSwarm', subtitle: 'TEMPLE OF TIME · SWARM HALL', description: '신전의 대회랑에 줄지어 선 수호병과 키메라. 한 번의 생이 통째로 몰려온다.', tone: '#b8944a' },
    '아케인 리버': { id: 'arcaneSwarm', subtitle: 'ARCANE RIVER · SWARM CURRENT', description: '에르다의 급류. 소멸한 영혼들이 강 전체가 되어 밀려온다.', tone: '#7a6fc4' },
};
/** 지역 이름 목록(사냥터 순서). */
export const REGIONS = [...new Set(BASE_STAGES.map(st => st.region))];
/** 지역의 일반 사냥터(무리 서식지 제외). */
export const regionPlaces = (region: string) => BASE_STAGES.filter(st => st.region === region);
/** 지역에 사는 몬스터(중복 없이, 사냥터 순서). */
const regionFishCache = new Map<string, string[]>();
/** v3.104 사냥터 표는 바뀌지 않으므로 지역마다 한 번만 만듭니다(능력치 계산이 턴마다 부름). 돌려받은 배열은 고치지 마세요. */
export const regionFish = (region: string) => { let ids = regionFishCache.get(region); if (!ids) regionFishCache.set(region, ids = Object.freeze([...new Set(regionPlaces(region).flatMap(st => st.fish))]) as string[]); return ids; };
/**
 * v3.103 사냥터 개편(docs/hunting-ground-plan.md 9절, 기준 몸 '자기 계열 패시브' 측정).
 * 적정 환생: 난이도 0에서 사망 0 · 평균 처치 3턴 이하(서식지는 시간당 사망 5회 이하 · 경험치가 일반 사냥터 이상)가 되는 환생.
 * 서식지 입장 환생은 지역 최고 환생 + 2로 정하던 것을 표로 고정합니다(늦은 지역 사냥터 입장을 내리면서 따로 정함).
 */
export const STAGE_FIT: Record<string, number> = {
    brook: 0, bay: 0, reef: 0, kelp: 0, wreck: 2, volcanic: 5, trench: 5, moon: 5, starfall: 10, duskVents: 10,
    coralForest: 10, dragonNest: 15, memoryLane: 15, vanishingJourney: 20,
    lithSwarm: 10, henesysSwarm: 10, perionSwarm: 10, elliniaSwarm: 20, kerningSwarm: 20, aquaSwarm: 15, leafreSwarm: 15, templeSwarm: 15, arcaneSwarm: 20,
};
const HABITAT_REBIRTH: Record<string, number> = { lithSwarm: 2, henesysSwarm: 2, perionSwarm: 2, elliniaSwarm: 3, kerningSwarm: 7, aquaSwarm: 14, leafreSwarm: 15, templeSwarm: 15, arcaneSwarm: 20 };
for (const st of BASE_STAGES) st.fit = STAGE_FIT[st.id];
const HABITATS: StageDef[] = REGIONS.map(region => {
    const places = regionPlaces(region), meta = HABITAT_META[region];
    return { id: meta.id, region, place: '무리 서식지', name: `${region} · 무리 서식지`, subtitle: meta.subtitle, level: Math.max(...places.map(st => st.level)), rebirth: HABITAT_REBIRTH[meta.id] ?? Math.max(HABITAT.minRebirth, Math.max(...places.map(st => st.rebirth)) + HABITAT.rebirthOver), description: meta.description, fish: regionFish(region), tone: meta.tone, habitat: true, fit: STAGE_FIT[meta.id] };
});
export const STAGES: StageDef[] = [...BASE_STAGES, ...HABITATS];
/** 일반 사냥터(무리 서식지 제외). 사냥터 수·도감·업적처럼 장소를 세는 곳에서 씁니다. */
export const PLACES = BASE_STAGES;
/**
 * v3.9 깊이 계수: 난이도 레벨 보정으로 사냥터가 평준화된 뒤에도 뒤 사냥터가 조금 더 어렵고 조금 더 주도록, 입장 레벨 순서(0부터)마다 +DEPTH_SCALE을 체력·공격·골드·경험치에 곱합니다.
 * 서식지는 자기 레벨 자리, 일반 던전은 지역 던전 순서 기준. 무릉도장·랜덤게임·까미·누리는 1.
 */
export const DEPTH_SCALE = .04;
const placeLevels = () => [...new Set(PLACES.map(st => st.level))].sort((a, b) => a - b);
export const stageDepth = (stageId: string) => { const st = STAGES.find(x => x.id === stageId); return st ? 1 + DEPTH_SCALE * placeLevels().filter(l => l < st.level).length : 1; };
export const isHabitat = (id: string) => !!STAGES.find(st => st.id === id)?.habitat;
/**
 * 무리 사냥: 도감을 완성한 몬스터를 집중 사냥할 때 무리 전체를 체력 ×N인 한 개체로 상대합니다.
 * ×5·×100은 공격이 한 마리와 같고, ×500은 공격도 490배인 도전 과제입니다.
 * 적 자신의 최대 체력 비례 공격은 한 마리 체력 기준입니다. 처치하면 N마리분 보상을 한 번에 지급합니다.
 */
export const SWARM_SIZES = [1, 5, 100, 500] as const;
/** 무리 규모별 해금에 필요한 해당 몬스터 도감 처치 수. */
export const SWARM_UNLOCK: Record<number, number> = { 1: 0, 5: 10, 100: 500 };
/** v3.87 일반 사냥터 무리의 최대 규모. ×500 도전 무리는 무리 서식지에서만 나옵니다. */
export const FIELD_SWARM_MAX = 100;
/** 무리 체력 배율: N배, ×100 이상은 98%(×100 = 98배, ×500 = 490배). */
export const swarmHpMultiplier = (size: number) => size >= 100 ? size * .98 : Math.max(1, size);
/** 무리 공격 배율: ×500 도전 무리만 체력과 같은 배율(490배), 그 아래 규모는 한 마리와 같습니다. 방어·속도는 늘 한 마리와 같습니다. */
export const swarmAttackMultiplier = (size: number) => size >= 500 ? swarmHpMultiplier(size) : 1;
/** v3.42 무리 장비 드롭 판정 횟수: 마리 수 N 대신 √N(반올림). ×5 2번 · ×100 10번 · ×500 22번. 서식지에서 장비가 폭증하던 것을 막습니다. */
export const swarmDropRolls = (size: number) => size > 1 ? Math.round(Math.sqrt(size)) : 1;
/** v3.42 덜 굴린 드롭 판정은 기대 장비 수 × 이 값만큼 정수로 바꿉니다(희귀·영웅 분해 정수의 중간값). */
export const SWARM_ESSENCE_PER_ITEM = 3;
/** v3.42 ×500 도전 무리(공격도 490배)의 추가 보상: 경험치·골드 ×1.5(v3.48 숙련은 swarmMasteryKills로), 드롭 판정 ×2(44번). */
export const SWARM_BIG = { size: 500, reward: 1.5, drops: 2 } as const;
export const swarmRewardMultiplier = (size: number) => size >= SWARM_BIG.size ? SWARM_BIG.reward : 1;
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
    // v3.10 고레벨 사냥터(Lv.68~104). 이름·설명은 maple-monsters.ts가 덮어씁니다.
    ['aqSeaco', '씨코', 68, '산호 숲의 물개.'], ['aqShark', '샤크', 70, '산호 숲의 상어.'], ['aqSquid', '스퀴드', 71, '먹물을 뿜는 오징어.'], ['aqFlower', '플라워피쉬', 72, '꽃처럼 피는 물고기.'], ['aqGuard', '바다 수호병', 74, '깊은 바다의 수호자.'],
    ['lfBlueTurtle', '블루 드래곤 터틀', 78, '푸른 등껍질의 용거북.'], ['lfRedTurtle', '레드 드래곤 터틀', 80, '붉은 등껍질의 용거북.'], ['lfWyvern', '블루 와이번', 81, '절벽을 도는 비룡.'], ['lfSkelegon', '스켈레곤', 82, '뼈만 남은 용.'], ['lfManticore', '맨티코어', 84, '사자의 몸에 전갈의 꼬리.'],
    ['ttMonitor', '메모리 모니터', 88, '기억을 지키는 파수꾼.'], ['ttGuardian', '기억의 수호병', 90, '회랑을 지키는 병사.'], ['ttChimera', '키메라', 91, '여러 짐승이 합쳐진 괴물.'], ['ttDodo', '도도', 92, '시간을 잊은 새.'], ['ttLyka', '릴리노우흐', 94, '신전의 늑대.'],
    ['arErdaSpirit', '에르다 스피릿', 98, '에르다가 뭉친 영혼.'], ['arMemoryGuard', '추억의 수호병', 100, '잊힌 기억의 병사.'], ['arMysticErda', '신비한 에르다', 101, '빛나는 에르다.'], ['arVanishSoul', '소멸의 영혼', 102, '강에 흩어지는 영혼.'], ['arTrueErda', '트루 에르다', 104, '순수한 에르다의 결정.'],
    ['ventCrab', '열수 게', 55, '끓는 물줄기 옆에서 집게를 벼린다. 껍데기가 쇠처럼 울린다.'], ['glassSquid', '유리 오징어', 57, '몸이 투명해 심장의 박동만 보인다.'], ['sulfurEel', '유황 곰치', 59, '숨을 쉴 때마다 노란 연기가 물을 흐린다.'], ['blindShark', '눈먼 상어', 61, '빛을 잃은 대신 물살의 떨림으로 모든 것을 본다.'],
];
/** 레벨별 몬스터 기본 골드. 장비 판매가도 이 곡선을 따릅니다. */
/** v27.30 몬스터 골드 곡선: Lv.40까지 레벨당 12% 복리, 그 뒤로는 6.5%. 후반 골드가 사용처 비용을 크게 앞지르던 인플레이션을 줄입니다. */
const GOLD_CURVE = { base: 7, early: 1.12, knee: 40, late: 1.065 };
export const fishGoldAt = (level: number) => Math.round(GOLD_CURVE.base * Math.pow(GOLD_CURVE.early, Math.min(level, GOLD_CURVE.knee) - 1) * Math.pow(GOLD_CURVE.late, Math.max(0, level - GOLD_CURVE.knee)));
/** v27.30 골드 사용처 가격 배율: Lv.40까지 1, 그 위로는 몬스터 골드를 따라 커집니다(Lv.65에서 멈춤). */
export const PRICE_LEVEL_CAP = 65;
export const priceScale = (level: number) => Math.max(1, fishGoldAt(Math.min(PRICE_LEVEL_CAP, Math.max(1, level))) / fishGoldAt(GOLD_CURVE.knee));
/** v3.11 몬스터 경험치 곡선: Lv.66까지 레벨당 15% 복리, 그 위로는 EXP_CURVE.late(고레벨 사냥터에서 환생이 너무 빨라지지 않게). 플레이어 필요 경험치 곡선과는 별개입니다. */
export const EXP_CURVE = { knee: 66, drop: .35, late: 1.115 };
export const fishExpAt = (level: number) => Math.round(9 * Math.pow(1.15, Math.min(level, EXP_CURVE.knee) - 1) * (level > EXP_CURVE.knee ? EXP_CURVE.drop * Math.pow(EXP_CURVE.late, level - EXP_CURVE.knee) : 1));
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
/**
 * 난이도가 이 단계에 이르면 모든 사냥터 몬스터가 목표 레벨(내 레벨과 가장 높은 사냥터 수준 중 낮은 쪽)에 닿습니다. 그 전에는 남은 차이를 단계 비율만큼 메웁니다.
 * v27.67 10 → 5: 숙련의 까미가 나오는 난이도(5)부터는 어느 사냥터든 같은 수준이 되게 맞춥니다(난이도 5 리스항구 까미 작업 방지).
 */
export const TIDE_LIFT_TIERS = 5;
/** 목표 레벨의 상한: 가장 높은 사냥터 몬스터의 능력치 레벨(입장 레벨 + STAGE_ENEMY_LEVEL_OVER). 상위 사냥터의 난이도는 그대로 두고 낮은 사냥터만 따라 올라옵니다. */
let liftCap = 0;
const tideLiftCap = () => liftCap ||= Math.max(...STAGES.map(st => st.level)) + STAGE_ENEMY_LEVEL_OVER;
export function tideLiftLevel(level: number, tier: number, playerLevel: number) {
    const target = Math.min(playerLevel, tideLiftCap());
    return target > level && tier > 0 ? Math.round(level + (target - level) * Math.min(1, tier / TIDE_LIFT_TIERS)) : level;
}
/**
 * v27.67 레벨이 올라간 몬스터의 보상 배율 정규화: 사냥터 평균 보상 배율(출현 가중, 지금 난이도에서 나오는 몬스터)로 나눕니다.
 * 희귀 몬스터만 사는 사냥터(네온 수로)가 같은 레벨로 올라간 뒤에도 보상 ×2를 유지하던 것을 맞춥니다. 사냥터 안의 상대 차이는 남습니다.
 * 반환값은 rewardMultiplier에 곱할 값(올라간 정도만큼 점점 적용).
 */
export function stageRewardNorm(stageFish: readonly string[], tier: number) {
    // v3.55 출현 가중치를 모르는 화면(비공개 켬)은 서버가 카탈로그로 보낸 사냥터별 평균 표를 씁니다.
    const stage = oddsKnown() ? undefined : STAGES.find(st => st.fish === stageFish), table = stage && STAGE_REWARD_AVG[stage.id];
    const avg = table ? stageAvgAt(table, tier) : stageRewardAvg(stageFish, tier);
    return 1 / Math.pow(Math.max(1, avg), Math.min(1, tier / TIDE_LIFT_TIERS));
}
/** v3.55 구간 표에서 난이도 tier의 평균(그 난이도 이하의 마지막 구간). */
export const stageAvgAt = (table: [number, number][], tier: number) => [...table].reverse().find(([from]) => from <= tier)?.[1] ?? 1;
/** 사냥터 평균 보상 배율(출현 가중, 그 난이도에서 나오는 몬스터). 서버는 진짜 가중치로 계산합니다. */
function stageRewardAvg(stageFish: readonly string[], tier: number) {
    const rows = stageFish.map(id => FISH.find(f => f.id === id)!).filter(f => f && (f.minTier || 0) <= tier);
    const weight = rows.reduce((a, f) => a + (f.spawnWeight ?? 1), 0);
    return weight ? rows.reduce((a, f) => a + (f.spawnWeight ?? 1) * (f.rewardMultiplier || 1), 0) / weight : 1;
}
/** v3.55 서버: 카탈로그에 실을 사냥터별 [이 난이도부터, 평균 보상 배율] 구간 표. 몬스터의 minTier마다 평균이 바뀝니다. */
export function stageRewardAvgTable(): StageRewardAvg {
    return Object.fromEntries(STAGES.map(st => {
        const from = [...new Set([0, ...st.fish.map(id => FISH.find(f => f.id === id)?.minTier || 0)])].sort((a, b) => a - b);
        return [st.id, from.map(tier => [tier, stageRewardAvg(st.fish, tier)] as [number, number])];
    }));
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
    rewardMultiplier?: number;
    boss?: boolean;
    minTier?: number;
}> = [
    { id: 'masteryMimic', name: '숙련의 까미', level: 10, lore: '보물상자인 척 입을 벌리고 있다. 잡으면 오래 쌓은 숙련이 한꺼번에 밀려온다.', rarity: 'legendary' as const, rewardMultiplier: 1 },
    { id: 'expNuri', name: '경험의 누리', level: 50, lore: '후광을 두른 하얀 강아지. 금빛 날개로 사냥터 위를 신나게 날아다니다가, 붙잡히면 품고 있던 경험을 한꺼번에 쏟아 낸다.', rarity: 'legendary' as const, rewardMultiplier: 1 },
    { id: 'seahorse', name: '파란 버섯', level: 15, lore: '투명한 몸 안에서 작은 별빛이 흔들린다.', rarity: 'rare' as const, rewardMultiplier: 1.35 },
    { id: 'needlefish', name: '뿔버섯', level: 16, lore: '해초 사이를 화살처럼 가르는 희귀한 사냥꾼.', rarity: 'rare' as const, rewardMultiplier: 1.45 },
    { id: 'tidejelly', name: '좀비버섯', level: 17, lore: '빛나는 촉수가 물살의 방향을 바꾼다.', rarity: 'epic' as const, rewardMultiplier: 1.75 },
    { id: 'emberEel', name: '파이어보어', level: 24, lore: '열수 분출구에서 태어난 붉은 전류의 뱀.', rarity: 'rare' as const, rewardMultiplier: 1.5 },
    { id: 'ashRay', name: '다크 스톤골렘', level: 26, lore: '화산재를 날개처럼 두르고 수면을 가른다.', rarity: 'rare' as const, rewardMultiplier: 1.55 },
    { id: 'magmaPuffer', name: '믹스 골렘', level: 27, lore: '몸속에 뜨거운 독을 저장한 위험한 희귀종.', rarity: 'epic' as const, rewardMultiplier: 1.9 },
    { id: 'cinderKoi', name: '레드 드레이크', level: 29, lore: '비늘 사이로 식지 않은 불꽃이 흐른다.', rarity: 'epic' as const, rewardMultiplier: 2.1 },
    { id: 'starKoi', name: '버블링', level: 46, lore: '별자리의 무늬를 비늘에 품은 외해의 희귀종.', rarity: 'rare' as const, rewardMultiplier: 1 },
    { id: 'prismRay', name: '옥토퍼스', level: 48, lore: '빛을 일곱 갈래로 쪼개며 헤엄친다.', rarity: 'epic' as const, rewardMultiplier: 1.2 },
    { id: 'voidGuppy', name: '스티지', level: 50, lore: '작은 몸 안에 깊이를 측정할 수 없는 어둠이 있다.', rarity: 'epic' as const, rewardMultiplier: 1.3 },
    // v25.8 차수 변종: 사냥터 난이도 10·20·30 이상에서만 나타나는 희귀 변종. 도감 항목이 따로 있어 차수를 올릴 이유가 됩니다.
    { id: 'stormBarracuda', name: '아이언 호그', level: 20, lore: '폭풍이 지나간 산호초에만 나타나는 검은 번개의 사냥꾼.', rarity: 'epic' as const, rewardMultiplier: 2.4 }, // v26.6 사냥터 난이도 조건(10) 제거: 이미 산호초에서 저격해 온 유저가 있어 난이도 0부터 출현
    { id: 'eclipseMoonfish', name: '레이스', level: 44, lore: '달이 가려진 밤, 심연의 빛을 등에 지고 떠오른다.', rarity: 'epic' as const, rewardMultiplier: 2.8, minTier: 20 },
    { id: 'novaManta', name: '와이번', level: 58, lore: '별이 터지는 순간의 빛을 날개에 새긴 외해의 전설.', rarity: 'legendary' as const, rewardMultiplier: 2, minTier: 30 },
    { id: 'cinderAngler', name: '크로코', level: 60, lore: '열수구의 불씨를 등불 삼아 어둠 속에서 입을 벌린다.', rarity: 'rare' as const, rewardMultiplier: 1.5 },
    { id: 'ventLeviathan', name: '다크 와이번', level: 63, lore: '열수구를 통째로 둥지로 삼은 거대한 그림자.', rarity: 'epic' as const, rewardMultiplier: 1.8 },
    { id: 'abyssManta', name: '와일드 카고', level: 54, lore: '날개를 펼치면 주변의 조류가 잠시 멎는다.', rarity: 'legendary' as const, rewardMultiplier: 1.6 },
    { id: 'grottoWarden', name: '머쉬맘', level: 14, lore: '버섯 동산을 다스리는 거대한 버섯. 짓누르는 몸통으로 침묵의 충격을 뿜는다.', rarity: 'legendary' as const, rewardMultiplier: 2.6, boss: true },
    { id: 'kelpHydra', name: '킹 슬라임', level: 22, lore: '쪼개질 때마다 새 슬라임을 낳는 수로의 왕.', rarity: 'legendary' as const, rewardMultiplier: 3, boss: true },
    { id: 'anchorWraith', name: '좀비 머쉬맘', level: 25, lore: '개미굴 깊은 곳에서 되살아난 머쉬맘. 느린 저주를 건다.', rarity: 'legendary' as const, rewardMultiplier: 3.2, boss: true },
    { id: 'magmaKraken', name: '주니어 발록', level: 34, lore: '불의 제단을 지키는 마족. 불길을 휘감은 손톱으로 할퀸다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'templeOracle', name: '엘리쟈', level: 38, lore: '환생자의 기억을 읽고 침묵의 바람을 부르는 하늘의 마녀.', rarity: 'legendary' as const, rewardMultiplier: 3.8, boss: true },
    { id: 'abyssSovereign', name: '무공', level: 52, lore: '무릉도장의 가장 높은 곳에서 다음 도전자를 기다리는 도장의 주인.', rarity: 'legendary' as const, rewardMultiplier: 5, boss: true },
    { id: 'ventColossus', name: '자쿰', level: 66, lore: '엘나스 폐광의 제단에 봉인된 거대 석상. 여러 개의 팔이 따로 움직인다.', rarity: 'legendary' as const, rewardMultiplier: 6, boss: true },
    // v3.12 칠흑의 보스(무리 서식지 전용). 능력치는 서식지 최강 몬스터 기준이라 레벨은 도감·기술용입니다.
    { id: 'onyxDusk', name: '더스크', level: 11, lore: '리스항구 갯바위에 안개처럼 내려앉은 공포. 형체가 없는데 눈이 많다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxDunkel', name: '듄켈', level: 20, lore: '헤네시스 들판을 가르는 검은 검의 지휘관. 베인 자리마다 들불이 번진다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxWill', name: '윌', level: 30, lore: '페리온 협곡에 거미줄을 친 거울의 마법사. 거울 속에도 윌이 있다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxLucid', name: '루시드', level: 40, lore: '엘리니아 숲의 꿈을 다스리는 요정 여왕. 나비 한 마리마다 악몽이 깃든다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxHilla', name: '진 힐라', level: 61, lore: '커닝시티 배수로 아래 되살아난 사령술사. 죽은 것들이 그녀의 숨으로 움직인다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxSeren', name: '세렌', level: 96, lore: '시간의 신전에 내려온 태양의 수호자. 미트라의 분노가 회랑을 태운다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxBlackMage', name: '검은 마법사', level: 106, lore: '아케인 리버의 끝에서 세계를 다시 쓰려는 초월자. 그의 뒤에는 창세의 빛이 있다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'starfallSeraph', name: '파풀라투스', level: 62, lore: '루디브리엄 시계탑의 시간을 멈춘 차원의 침략자.', rarity: 'legendary' as const, rewardMultiplier: 5.5, boss: true },
];
for (const f of specialFish)
    FISH.push({ id: f.id, name: f.name, level: f.level, hp: Math.round(35 + f.level * 12 + f.level * f.level * .65), attack: Math.round(3 + f.level * 2.2), defense: Math.floor(f.level * .8), exp: fishExpAt(f.level), gold: fishGoldAt(f.level), lore: f.lore, rarity: f.rarity, /** v3.55 출현 가중치는 서버 전용(ODDS.spawn). */ get spawnWeight() { return ODDS.spawn[f.id]; }, rewardMultiplier: f.rewardMultiplier, boss: f.boss, ...(f.minTier ? { minTier: f.minTier } : {}) });
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
/**
 * v3.25 해킹 III 서버 다운: 새 입장만 막습니다(이미 들어간 모험가는 계속). 서버가 해킹 설정(hacks)을 읽어 setHackDown으로 채웁니다.
 * 화이트 해커가 패치한 곳(patched)은 다운이 걸려 있어도 열려 있습니다.
 */
let HACK_DOWN: { kind: 'stage' | 'dungeon'; id: string; until: number; by: string }[] = [];
let HACK_PATCHED: Record<string, number> = {};
export function setHackDown(list: typeof HACK_DOWN, patched: Record<string, number> = {}) { HACK_DOWN = list; HACK_PATCHED = patched; }
export const placeKey = (kind: 'stage' | 'dungeon', id: string) => `${kind}:${id}`;
/** 지금 해킹으로 막힌 곳이면 그 기록, 아니면 undefined. */
export const hackDownOf = (kind: 'stage' | 'dungeon', id: string, now: number) => (HACK_PATCHED[placeKey(kind, id)] || 0) > now ? undefined : HACK_DOWN.find(d => d.kind === kind && d.id === id && d.until > now);
export const DUNGEONS = [
    /** v27.86 랜덤게임: 웨이브마다 무작위 몬스터(fish는 자리표시). 일반 던전 목록·업적·목표에서는 random으로 빠집니다. */
    { id: 'randomGame', name: '랜덤게임', level: 1, rebirth: 5, fish: ['minnow'], bossFish: undefined as string | undefined, boss: '랜덤게임', gold: 0, pearls: 0, description: '해금한 사냥터의 몬스터가 웨이브마다 무작위로 나옵니다. 웨이브를 깰수록 판돈이 쌓이고, 쓰러지면 모두 잃습니다.', random: true },
    { id: 'abyss', name: '무릉도장', level: 40, rebirth: 3, fish: ['moonfish', 'dragon', 'ancient', 'dragon', 'ancient'], bossFish: 'abyssSovereign', boss: '도장의 주인 · 무공', gold: 12000, pearls: 1, description: '오를 때마다 다음 층이 열립니다. 높을수록 층마다 더 많은 세계석을 얻고, 10·25·50·100층을 처음 돌파하면 SP 1을 받습니다.' },
    { id: 'grotto', name: '헤네시스 · 버섯 동산', level: 8, rebirth: 0, fish: ['ray', 'puffer', 'mackerel', 'ray', 'eel'], bossFish: 'grottoWarden', boss: '버섯 동산의 주인 · 머쉬맘', gold: 350, pearls: 1, description: '다섯 번의 전투 끝에 거대한 버섯이 눈을 뜬다.' },
    { id: 'kelpCatacomb', name: '커닝시티 · 지하 수로', level: 14, rebirth: 0, fish: ['seahorse', 'needlefish', 'tidejelly', 'seahorse', 'needlefish'], bossFish: 'kelpHydra', boss: '수로의 왕 · 킹 슬라임', gold: 950, pearls: 1, description: '갈라지고 또 갈라지는 슬라임들이 도시 아래 수로를 메웠다.' },
    { id: 'cemetery', name: '슬리피우드 · 개미굴', level: 18, rebirth: 0, fish: ['ghost', 'angler', 'ghost', 'shark', 'shark'], bossFish: 'anchorWraith', boss: '개미굴의 망령 · 좀비 머쉬맘', gold: 1600, pearls: 2, description: '깊은 개미굴 아래, 썩지 않는 버섯이 마지막 보물을 지킨다.' },
    { id: 'caldera', name: '페리온 · 불의 제단', level: 26, rebirth: 0, fish: ['emberEel', 'ashRay', 'magmaPuffer', 'cinderKoi', 'emberEel'], bossFish: 'magmaKraken', boss: '불꽃의 마족 · 주니어 발록', gold: 4200, pearls: 3, description: '뜨거운 불길이 장비와 골드를 녹여 새로운 형태로 만든다.' },
    { id: 'temple', name: '엘리니아 · 잊힌 마법 사원', level: 30, rebirth: 1, fish: ['viper', 'squid', 'leviathan', 'moonfish', 'dragon'], bossFish: 'templeOracle', boss: '하늘의 마녀 · 엘리쟈', gold: 6000, pearls: 5, description: '환생의 기억을 지닌 자에게만 열리는 문.' },
    { id: 'ventCathedral', name: '엘나스 · 자쿰의 제단', level: 60, rebirth: 8, fish: ['ventCrab', 'sulfurEel', 'glassSquid', 'blindShark', 'ventLeviathan'], bossFish: 'ventColossus', boss: '폐광의 거대 석상 · 자쿰', gold: 30000, pearls: 12, description: '엘나스 폐광 깊은 곳의 제단. 팔 하나하나가 숨을 쉬는, 환생 8회의 탐험지.' },
    { id: 'starSanctum', name: '루디브리엄 · 시계탑', level: 48, rebirth: 2, fish: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta', 'starKoi'], bossFish: 'starfallSeraph', boss: '시계탑의 주인 · 파풀라투스', gold: 18000, pearls: 8, description: '장난감 도시의 시계탑 꼭대기. 멈춘 시간 속에서 차원의 침략자와 맞서는 후반 탐험지.' },
];
/** v27.86 랜덤게임을 뺀 일반 던전(목록·업적·목표·점검용). */
export const PLAIN_DUNGEONS = DUNGEONS.filter(d => !('random' in d && d.random));
/** v3.9 지역 던전(까미·누리·무릉도장·랜덤게임 제외)의 입장 레벨 순서 깊이 계수. */
const REGION_DUNGEONS = () => PLAIN_DUNGEONS.filter(d => d.id !== 'abyss' && d.id !== 'masteryMimic' && d.id !== 'expNuri');
export const dungeonDepth = (id: string) => { const d = REGION_DUNGEONS().find(x => x.id === id); return d ? 1 + DEPTH_SCALE * [...new Set(REGION_DUNGEONS().map(x => x.level))].filter(l => l < d.level).length : 1; };
