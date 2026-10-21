import { ODDS, oddsKnown, STAGE_REWARD_AVG, type StageRewardAvg } from './odds';
import { MAPLE_MONSTERS } from './maple-monsters';
/** v27.34 메이플 지역 개편: region(지역) · place(세부 장소). name은 ‘지역 · 장소’로, 로그·기록·도감에 그대로 씁니다. id는 그대로라 세이브가 유지됩니다. */
/** 사냥터 정의. habitat는 v27.80 무리 서식지(지역마다 하나)입니다. */
type StageDef = { id: string; region: string; place: string; name: string; subtitle: string; level: number; rebirth: number; description: string; monsters: string[]; tone: string; habitat?: boolean; /** v3.103 적정 환생(측정, docs/hunting-ground-plan.md 9절). 입장 조건(rebirth)보다 클 때만 따로 보입니다. */ fit?: number };
/** 일반 사냥터(무리 서식지 제외). 사냥터 수·도감·업적처럼 장소를 세는 곳에서 씁니다. */
export const BASE_STAGES: StageDef[] = [
    { id: 'brook', region: '리스항구', place: '선착장', name: '리스항구 · 선착장', subtitle: 'LITH HARBOR · PIER', level: 1, rebirth: 0, description: '빅토리아 아일랜드의 관문. 선착장 끝에서 첫 몬스터가 찾아온다.', monsters: ['minnow', 'carp', 'perch'], tone: '#79bca8' },
    { id: 'bay', region: '리스항구', place: '조개 해안', name: '리스항구 · 조개 해안', subtitle: 'LITH HARBOR · SHELL COAST', level: 5, rebirth: 0, description: '항구 뒤 조개껍데기가 깔린 해안. 버섯과 슬라임이 파도 소리에 맞춰 통통 튄다.', monsters: ['mackerel', 'ray', 'puffer'], tone: '#68b6ce' },
    { id: 'reef', region: '헤네시스', place: '돼지의 해변', name: '헤네시스 · 돼지의 해변', subtitle: 'HENESYS · PIG BEACH', level: 10, rebirth: 0, description: '헤네시스 남쪽 해변. 돼지 떼가 모래밭을 뛰놀고, 버섯이 그늘에서 덮칠 틈을 노린다.', monsters: ['lionfish', 'eel', 'barracuda', 'stormBarracuda'], tone: '#d49081' },
    { id: 'kelp', region: '헤네시스', place: '버섯숲 연못', name: '헤네시스 · 버섯숲 연못', subtitle: 'HENESYS · MUSHROOM POND', level: 14, rebirth: 0, description: '버섯 마을 숲속의 연못. 연못가 그늘마다 색이 다른 버섯들이 자란다.', monsters: ['seahorse', 'needlefish', 'tidejelly'], tone: '#72b89b' },
    { id: 'wreck', region: '페리온', place: '유적 발굴지 수로', name: '페리온 · 유적 발굴지 수로', subtitle: 'PERION · EXCAVATION CANAL', level: 18, rebirth: 0, description: '발굴지 아래로 흐르는 수로. 멧돼지가 내달리고, 깨어난 해골 병사와 돌거인이 유물을 지킨다.', monsters: ['ghost', 'angler', 'shark'], tone: '#9e96c8' },
    { id: 'volcanic', region: '페리온', place: '불타는 땅 화구호', name: '페리온 · 불타는 땅 화구호', subtitle: 'PERION · BURNING CRATER', level: 24, rebirth: 0, description: '바위산 너머 불타는 땅. 끓는 화구호 곁에서 불씨를 품은 골렘과 드레이크가 깨어난다.', monsters: ['emberEel', 'ashRay', 'magmaPuffer', 'cinderKoi'], tone: '#d17c62' },
    { id: 'trench', region: '엘리니아', place: '깊은 숲 늪', name: '엘리니아 · 깊은 숲 늪', subtitle: 'ELLINIA · DEEP FOREST BOG', level: 26, rebirth: 0, description: '빛이 닿지 않는 숲 깊은 곳의 늪. 어둠 속에서 커다란 눈들이 모험가를 지켜본다.', monsters: ['viper', 'squid', 'leviathan'], tone: '#5c9dba' },
    { id: 'moon', region: '엘리니아', place: '달빛 마법 호수', name: '엘리니아 · 달빛 마법 호수', subtitle: 'ELLINIA · MOONLIT LAKE', /** v27.30 32 → 34: 평균 몬스터 레벨(36)에 맞춤. */ level: 34, rebirth: 1, description: '마법사의 마을 위 달빛 호수. 나무 위의 루팡과 떠도는 망령 너머, 한 번의 생을 넘어선 모험가만 닿는다.', monsters: ['moonfish', 'dragon', 'ancient', 'eclipseMoonfish'], tone: '#b4afd6' },
    { id: 'starfall', region: '커닝시티', place: '네온 수로', name: '커닝시티 · 네온 수로', subtitle: 'KERNING CITY · NEON CANAL', level: 46, rebirth: 2, description: '네온이 별비처럼 쏟아지는 도시의 수로. 거품과 박쥐, 비룡이 밤하늘을 가른다.', monsters: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta', 'novaManta'], tone: '#9c8ed4' },
    // v25.8 환생 5회부터. Lv.60 생이 반복되는 환생 중반의 새 땅.
    { id: 'duskVents', region: '커닝시티', place: '지하 배수로', name: '커닝시티 · 지하 배수로', subtitle: 'KERNING CITY · UNDERGROUND DRAIN', level: 55, rebirth: 5, description: '도시 아래 끓어오르는 배수로. 다섯 번의 생을 건넌 모험가만 이 열기를 견딘다.', monsters: ['ventCrab', 'glassSquid', 'sulfurEel', 'blindShark', 'cinderAngler', 'ventLeviathan'], tone: '#d88a5a' },
    // v3.10 고레벨 사냥터 4곳(Lv.70·80·90·100). 환생 요구 레벨 곡선(12회 66 · 20회 74 · 35회 89 · 50회 100)에 맞춰 엽니다.
    { id: 'coralForest', region: '아쿠아로드', place: '산호 숲', name: '아쿠아로드 · 산호 숲', subtitle: 'AQUA ROAD · CORAL FOREST', level: 70, rebirth: 10, description: '빛이 산호 사이로 부서지는 바다 밑 숲. 씨코와 상어가 물결을 가르고, 수호병이 깊은 곳을 지킨다.', monsters: ['aqSeaco', 'aqShark', 'aqSquid', 'aqFlower', 'aqGuard'], tone: '#4fa3c7' },
    { id: 'dragonNest', region: '리프레', place: '용의 둥지', name: '리프레 · 용의 둥지', subtitle: 'LEAFRE · DRAGON NEST', level: 80, rebirth: 15, description: '용의 숲 깊은 곳의 둥지. 드래곤 터틀이 바위처럼 엎드려 있고 와이번이 절벽을 돈다.', monsters: ['lfBlueTurtle', 'lfRedTurtle', 'lfWyvern', 'lfSkelegon', 'lfManticore'], tone: '#7fb069' },
    { id: 'memoryLane', region: '시간의 신전', place: '기억의 길', name: '시간의 신전 · 기억의 길', subtitle: 'TEMPLE OF TIME · MEMORY LANE', level: 90, rebirth: 15, description: '시간이 멈춘 신전의 회랑. 기억의 수호병과 키메라가 지나온 생을 묻는다.', monsters: ['ttMonitor', 'ttGuardian', 'ttChimera', 'ttDodo', 'ttLyka'], tone: '#c9a85c' },
    { id: 'vanishingJourney', region: '아케인 리버', place: '소멸의 여로', name: '아케인 리버 · 소멸의 여로', subtitle: 'ARCANE RIVER · VANISHING JOURNEY', level: 100, rebirth: 20, description: '세계의 끝에서 흐르는 강. 에르다가 영혼이 되어 떠돌고, 쉰 번의 생을 건넌 모험가만 이 강을 거슬러 오른다.', monsters: ['arErdaSpirit', 'arMemoryGuard', 'arMysticErda', 'arVanishSoul', 'arTrueErda'], tone: '#8b7fd6' },
    // v3.367 코프룰루 구역(판게아 바다 너머 별의 바다, tools/content-kit 1차 생성): 사냥터 8곳 Lv.100~106 · 환생 50~65. 환생 50 이상 모험가의 땅: 레벨 대신 난이도 · 변종(난이도 50~80)으로 깊이를 둡니다(몬스터 경험치는 Lv.110까지만 세므로). 이름은 판게아 고유(원작 고유명사 없음).
    { id: 'derelictHangar', region: '잿빛 궤도', place: '폐선 격납고', name: '잿빛 궤도 · 폐선 격납고', subtitle: 'ASH ORBIT · DERELICT HANGAR', level: 100, rebirth: 50, description: '바다 끝 하늘에 걸린 부서진 정거장. 멈춘 격납고 안에서 녹슨 기계와 떠도는 생물이 쉰 번의 생을 건넌 모험가를 맞는다.', monsters: ['aoScrapDrone', 'aoRustSentry', 'aoHangarSpore', 'aoDriftJelly', 'aoCargoSpider', 'aoWeldHound', 'aoCoreLeech', 'aoBlackBoxWarden', 'aoGhostDrone'], tone: '#7f8a99' },
    { id: 'fracturedDeck', region: '잿빛 궤도', place: '균열 갑판', name: '잿빛 궤도 · 균열 갑판', subtitle: 'ASH ORBIT · FRACTURED DECK', level: 101, rebirth: 50, description: '반으로 갈라진 정거장 외벽 갑판. 중력이 끊긴 틈마다 유령 같은 선원과 별빛을 먹는 생물이 떠다닌다.', monsters: ['aoDeckWraith', 'aoStarMoth', 'aoPatrolUnit', 'aoHullBarnacle', 'aoRiftLurker', 'aoSignalEel', 'aoVoidCrab', 'aoStarEater', 'aoEclipseMoth'], tone: '#8b93a6' },
    { id: 'crystalQuarry', region: '광맥 황야', place: '결정 채굴장', name: '광맥 황야 · 결정 채굴장', subtitle: 'VEIN WASTES · CRYSTAL QUARRY', level: 102, rebirth: 55, description: '보랏빛 결정이 지층째 드러난 채굴장. 결정을 먹고 자란 갑각 생물과 멈추지 않는 채굴 기계가 쉰다섯 번의 생을 건넌 모험가를 가로막는다.', monsters: ['vwShardBeetle', 'vwDigger', 'vwDustWing', 'vwQuarryWorm', 'vwPrismLizard', 'vwOreGolem', 'vwVeinSpirit', 'vwCrystalTitan', 'vwHollowShard'], tone: '#a784c9' },
    { id: 'gasCaldera', region: '광맥 황야', place: '가스 분화구', name: '광맥 황야 · 가스 분화구', subtitle: 'VEIN WASTES · GAS CALDERA', level: 103, rebirth: 55, description: '노란 가스가 끓어오르는 분화구. 가스를 들이마신 생물은 몸집이 커지고, 숨을 쉴 때마다 독이 번진다.', monsters: ['vwGasToad', 'vwStingWisp', 'vwSulfurCrab', 'vwPipeKeeper', 'vwBloatHound', 'vwCinderWasp', 'vwFumeSerpent', 'vwCalderaMaw', 'vwYellowTitan'], tone: '#c9b24f' },
    { id: 'spawningMarsh', region: '군체 늪지', place: '산란 늪', name: '군체 늪지 · 산란 늪', subtitle: 'HIVE MARSH · SPAWNING MARSH', level: 104, rebirth: 60, description: '행성 표면을 뒤덮은 보라색 생체 늪. 알주머니마다 새 군체가 깨어나고, 예순 번의 생을 건넌 모험가의 발소리에 늪이 반응한다.', monsters: ['hmLarva', 'hmMarshSlider', 'hmAcidHound', 'hmEggSac', 'hmSpineCrawler', 'hmBroodWatcher', 'hmSpawner', 'hmMarshTyrant', 'hmBlackLarva'], tone: '#8e5fa8' },
    { id: 'nerveCorridor', region: '군체 늪지', place: '신경 회랑', name: '군체 늪지 · 신경 회랑', subtitle: 'HIVE MARSH · NERVE CORRIDOR', level: 105, rebirth: 60, description: '늪 아래 신경 다발로 이어진 회랑. 벽이 숨을 쉬고, 군체의 뜻을 받은 지배종이 침입자를 조용히 기다린다.', monsters: ['hmNerveRunner', 'hmSpinePillar', 'hmMindEye', 'hmPlateBrute', 'hmSynapseHound', 'hmVeinLeech', 'hmOverseer', 'hmCorridorKing', 'hmPaleOverseer'], tone: '#6e4a8c' },
    { id: 'lightSpire', region: '고요한 성단', place: '빛의 첨탑', name: '고요한 성단 · 빛의 첨탑', subtitle: 'SILENT CLUSTER · LIGHT SPIRE', level: 105, rebirth: 65, description: '별들 사이에 멈춰 선 고대 문명의 첨탑. 빛으로 짜인 수호자가 예순다섯 번의 생을 건넌 모험가의 기억을 비춰 본다.', monsters: ['scLightWeaver', 'scGlimmer', 'scMemoryLens', 'scStairStatue', 'scPrismGuard', 'scHaloWisp', 'scShadowEater', 'scSpireKeeper', 'scDawnWeaver'], tone: '#e0c878' },
    { id: 'voidGallery', region: '고요한 성단', place: '공허 회랑', name: '고요한 성단 · 공허 회랑', subtitle: 'SILENT CLUSTER · VOID GALLERY', level: 106, rebirth: 65, description: '별빛이 닿지 않는 성단의 뒷면. 고대 문명이 봉인한 것들이 회랑을 떠돌고, 바다 너머의 끝이 여기서 보인다.', monsters: ['scUnsealed', 'scVoidJelly', 'scDimStatue', 'scReverser', 'scHollowSentinel', 'scGravityMaw', 'scEchoOfEnd', 'scLastWarden', 'scStillReverser'], tone: '#5a5b8a' },
];
/**
 * v27.80 무리 서식지: 지역마다 하나. 그 지역 몬스터가 전부 무리로만 나옵니다(×100 75% · ×500 25%, 도감·패시브 조건 없음).
 * 처치 한 번에 마리 수만큼 보상·도감이 쌓이는 고위험 고보상 사냥터입니다(v3.42 드롭은 √N번 판정, swarmDropRolls). v3.106부터 까미·누리도 나옵니다(무리가 아닌 한 마리로).
 * 입장: 지역 사냥터의 최고 레벨 · 환생은 HABITAT_REBIRTH 표(v3.103).
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
    '잿빛 궤도': { id: 'ashOrbitSwarm', subtitle: 'ASH ORBIT · SWARM DOCK', description: '정거장 부두를 메운 드론과 포자의 떼. 경보가 울리면 격납고 전체가 한꺼번에 덮친다.', tone: '#6f7a89' },
    '광맥 황야': { id: 'veinSwarm', subtitle: 'VEIN WASTES · SWARM PIT', description: '채굴 갱도를 가득 메운 결정 벌레의 떼. 한 덩어리로 밀려오는 보랏빛 파도.', tone: '#9470b8' },
    '군체 늪지': { id: 'hiveSwarm', subtitle: 'HIVE MARSH · SWARM NEST', description: '산란 늪 전체가 하나의 군체다. 알이 한꺼번에 깨어나 늪이 통째로 일어선다.', tone: '#7d4f99' },
    '고요한 성단': { id: 'clusterSwarm', subtitle: 'SILENT CLUSTER · SWARM HALO', description: '성단의 빛이 한꺼번에 몰려든다. 수호자들이 하나의 빛이 되어 쏟아지는 곳.', tone: '#c9b062' },
};
/** 지역 이름 목록(사냥터 순서). */
export const REGIONS = [...new Set(BASE_STAGES.map(st => st.region))];
/** 지역의 일반 사냥터(무리 서식지 제외). */
const regionPlaces = (region: string) => BASE_STAGES.filter(st => st.region === region);
/** 지역에 사는 몬스터(중복 없이, 사냥터 순서). */
const regionMonsterCache = new Map<string, string[]>();
/** v3.104 사냥터 표는 바뀌지 않으므로 지역마다 한 번만 만듭니다(능력치 계산이 턴마다 부름). 돌려받은 배열은 고치지 마세요. */
export const regionMonsters = (region: string) => { let ids = regionMonsterCache.get(region); if (!ids) regionMonsterCache.set(region, ids = Object.freeze([...new Set(regionPlaces(region).flatMap(st => st.monsters))]) as string[]); return ids; };
/**
 * v3.103 사냥터 개편(docs/hunting-ground-plan.md 9절, 기준 몸 '자기 계열 패시브' 측정).
 * 적정 환생: 난이도 0에서 사망 0 · 평균 처치 3턴 이하(서식지는 시간당 사망 5회 이하 · 경험치가 일반 사냥터 이상)가 되는 환생.
 * 서식지 입장 환생은 지역 사냥터 조건에서 유도하지 않고 표로 따로 정합니다.
 */
export const STAGE_FIT: Record<string, number> = {
    brook: 0, bay: 0, reef: 0, kelp: 0, wreck: 2, volcanic: 5, trench: 5, moon: 5, starfall: 10, duskVents: 10,
    coralForest: 10, dragonNest: 15, memoryLane: 15, vanishingJourney: 20,
    lithSwarm: 10, henesysSwarm: 10, perionSwarm: 10, elliniaSwarm: 20, kerningSwarm: 20, aquaSwarm: 15, leafreSwarm: 15, templeSwarm: 15, arcaneSwarm: 20,
    // v3.367 코프룰루: 환생 50 이상의 땅이라 입장 환생과 같게 둡니다(Lv.100~110 몬스터는 환생 25 기준 몸도 1턴에 잡으므로 ‘적정’은 입장 조건이 정함).
    derelictHangar: 50, fracturedDeck: 50, crystalQuarry: 55, gasCaldera: 55, spawningMarsh: 60, nerveCorridor: 60, lightSpire: 65, voidGallery: 65, ashOrbitSwarm: 52, veinSwarm: 57, hiveSwarm: 62, clusterSwarm: 67,
};
const HABITAT_REBIRTH: Record<string, number> = { lithSwarm: 2, henesysSwarm: 2, perionSwarm: 2, elliniaSwarm: 3, kerningSwarm: 7, aquaSwarm: 14, leafreSwarm: 15, templeSwarm: 15, arcaneSwarm: 20, ashOrbitSwarm: 52, veinSwarm: 57, hiveSwarm: 62, clusterSwarm: 67 };
for (const st of BASE_STAGES) st.fit = STAGE_FIT[st.id];
const HABITATS: StageDef[] = REGIONS.map(region => {
    const places = regionPlaces(region), meta = HABITAT_META[region];
    return { id: meta.id, region, place: '무리 서식지', name: `${region} · 무리 서식지`, subtitle: meta.subtitle, level: Math.max(...places.map(st => st.level)), rebirth: HABITAT_REBIRTH[meta.id] ?? Math.max(HABITAT.minRebirth, Math.max(...places.map(st => st.rebirth)) + HABITAT.rebirthOver), description: meta.description, monsters: regionMonsters(region), tone: meta.tone, habitat: true, fit: STAGE_FIT[meta.id] };
});
export const STAGES: StageDef[] = [...BASE_STAGES, ...HABITATS];
let stageIndex: Map<string, StageDef> | undefined;
/** 사냥터 id로 찾기(무리 서식지 포함). */
export const stageById = (id: string | undefined) => id === undefined ? undefined : (stageIndex ??= new Map(STAGES.map(st => [st.id, st]))).get(id);
/**
 * v3.9 깊이 계수: 난이도 레벨 보정으로 사냥터가 평준화된 뒤에도 뒤 사냥터가 조금 더 어렵고 조금 더 주도록, 입장 레벨 순서(0부터)마다 +DEPTH_SCALE을 체력·공격·골드·경험치에 곱합니다.
 * 서식지는 자기 레벨 자리, 일반 던전은 지역 던전 순서 기준. 무릉도장·까미·누리는 1.
 */
export const DEPTH_SCALE = .04;
const placeLevels = () => [...new Set(BASE_STAGES.map(st => st.level))].sort((a, b) => a - b);
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
type MonsterDef = {
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
    // v3.367 코프룰루 구역(Lv.100~110). 이름·설명은 판게아 고유라 maple-monsters.ts 덮어쓰기 없음.
    ['aoScrapDrone', '고철 드론', 100, '멈춘 정거장을 아직도 정비한다. 모험가를 고장 난 부품으로 본다.'],
    ['aoRustSentry', '녹슨 경비기', 101, '경보가 꺼진 지 오래지만 명령은 남아 있다. 침입자는 막는다.'],
    ['aoHangarSpore', '격납고 포자', 101, '화물 틈에 뿌리내린 포자. 기름 냄새를 맡고 모여든다.'],
    ['aoDriftJelly', '표류 해파리', 102, '중력이 없는 격납고를 느리게 떠돈다. 촉수에 전기가 흐른다.'],
    ['aoDeckWraith', '갑판 망령', 101, '갑판이 갈라지던 날의 선원들. 아직도 자기 자리를 지킨다.'],
    ['aoStarMoth', '별빛 나방', 102, '별빛을 먹고 날개가 빛난다. 빛을 들고 있으면 먼저 달려든다.'],
    ['aoPatrolUnit', '순찰 기계', 102, '갑판을 정해진 길로만 돈다. 길을 막으면 밀어낸다.'],
    ['aoHullBarnacle', '외벽 따개비', 103, '외벽에 붙어 별바람을 견딘다. 떼어 내려면 껍질부터 깨야 한다.'],
    ['aoBridgeGuard', '함교 경비기', 102, '함교 문을 지키는 중장갑 기계. 선장의 명령 없이는 비키지 않는다.'],
    ['vwShardBeetle', '결정 딱정벌레', 102, '결정을 먹고 등갑이 결정이 되었다. 햇빛에 보랏빛으로 반짝인다.'],
    ['vwDigger', '채굴 기계', 103, '기지가 버려진 뒤에도 땅을 판다. 앞을 막는 것도 광석으로 친다.'],
    ['vwDustWing', '결정 가루 날개', 103, '날개에서 결정 가루가 떨어진다. 가루를 마시면 눈이 따갑다.'],
    ['vwQuarryWorm', '채굴장 지렁이', 104, '갱도를 통째로 삼키며 자란다. 입 안에 결정 이빨이 겹겹이 났다.'],
    ['vwGasToad', '가스 두꺼비', 103, '노란 가스를 마셔 몸이 부풀었다. 터지기 전에 잡아야 한다.'],
    ['vwStingWisp', '독침 안개', 104, '가스 구름 속을 날며 독침을 떨어뜨린다. 보이지 않을 때가 더 위험하다.'],
    ['vwSulfurCrab', '유황 게', 104, '분화구 바닥의 유황을 먹고 산다. 집게에서 노란 연기가 난다.'],
    ['vwPipeKeeper', '가스관 관리기', 105, '가스관을 지키라는 명령만 남았다. 가까이 가면 밸브를 돌려 가스를 뿜는다.'],
    ['hmLarva', '군체 유충', 104, '알주머니에서 막 깨어났다. 작지만 수백 마리가 한 방향으로 달린다.'],
    ['hmMarshSlider', '늪 미끄럼이', 105, '촉수로 늪 위를 미끄러진다. 닿는 것마다 늪 아래로 끌어 내린다.'],
    ['hmAcidHound', '산성 사냥개', 105, '침이 늪보다 독하다. 무리로 사냥하고 먹이를 나누지 않는다.'],
    ['hmEggSac', '알주머니', 106, '늪 바닥에 박힌 알주머니. 건드리면 껍질이 굳고 안에서 무언가 꿈틀댄다.'],
    ['hmNerveRunner', '신경 주자', 105, '신경 다발 위를 달린다. 벽이 움찔할 때마다 속도가 붙는다.'],
    ['hmSpinePillar', '가시 기둥', 106, '벽에서 자라는 기둥. 움직이지 않지만 지나가는 것을 꿰뚫는다.'],
    ['hmMindEye', '정신 눈알', 106, '회랑 천장에서 내려다본다. 눈이 마주치면 머리가 울린다.'],
    ['hmPlateBrute', '갑판 군체', 107, '등에 갑판 같은 판을 두른 중장갑 군체. 길을 막고 밀어낸다.'],
    ['hmMuscleWall', '근육 벽', 106, '심장을 감싼 근육. 베면 아물고, 아물수록 두꺼워진다.'],
    ['scLightWeaver', '빛의 직조자', 105, '빛으로 짜인 수호자. 공격도 방어도 빛으로 한다.'],
    ['scGlimmer', '반짝임', 106, '첨탑을 떠도는 빛의 조각. 혼자서는 약하지만 늘 떼로 다닌다.'],
    ['scMemoryLens', '기억 렌즈', 106, '모험가의 지나온 생을 비춰 본다. 비친 기억은 잠시 말을 잃는다.'],
    ['scStairStatue', '계단 석상', 107, '첨탑 계단마다 선 결정 석상. 허락 없이 오르면 깨어난다.'],
    ['scUnsealed', '풀려난 수호자', 106, '봉인이 풀린 고대 수호자. 명령은 잊었고 적의만 남았다.'],
    ['scVoidJelly', '공허 해파리', 107, '별빛이 닿지 않는 곳을 떠돈다. 촉수가 닿으면 체온이 사라진다.'],
    ['scDimStatue', '빛 잃은 석상', 107, '빛을 잃고 검게 굳은 석상. 빛이 없으니 깨뜨릴 틈도 없다.'],
    ['scReverser', '역행자', 108, '시간을 거꾸로 산다. 공격이 닿기 전에 이미 피해 있다.'],
];
/** 레벨별 몬스터 기본 골드. 장비 판매가도 이 곡선을 따릅니다. */
/** v27.30 몬스터 골드 곡선: Lv.40까지 레벨당 12% 복리, 그 뒤로는 6.5%. 후반 골드가 사용처 비용을 크게 앞지르던 인플레이션을 줄입니다. */
const GOLD_CURVE = { base: 7, early: 1.12, knee: 40, late: 1.065 };
export const monsterGoldAt = (level: number) => Math.round(GOLD_CURVE.base * Math.pow(GOLD_CURVE.early, Math.min(level, GOLD_CURVE.knee) - 1) * Math.pow(GOLD_CURVE.late, Math.max(0, level - GOLD_CURVE.knee)));
/** v27.30 골드 사용처 가격 배율: Lv.40까지 1, 그 위로는 몬스터 골드를 따라 커집니다(Lv.65에서 멈춤). */
export const PRICE_LEVEL_CAP = 65;
export const priceScale = (level: number) => Math.max(1, monsterGoldAt(Math.min(PRICE_LEVEL_CAP, Math.max(1, level))) / monsterGoldAt(GOLD_CURVE.knee));
/** v3.11 몬스터 경험치 곡선: Lv.66까지 레벨당 15% 복리, 그 위로는 EXP_CURVE.late(고레벨 사냥터에서 환생이 너무 빨라지지 않게). 플레이어 필요 경험치 곡선과는 별개입니다. */
const EXP_CURVE = { knee: 66, drop: .35, late: 1.115 };
export const monsterExpAt = (level: number) => Math.round(9 * Math.pow(1.15, Math.min(level, EXP_CURVE.knee) - 1) * (level > EXP_CURVE.knee ? EXP_CURVE.drop * Math.pow(EXP_CURVE.late, level - EXP_CURVE.knee) : 1));
/**
 * v27.66 레벨 차 경험치 보정: 몬스터가 내 레벨보다 EXP_LEVEL_GAP 넘게 높으면 경험치를 ‘내 레벨 + EXP_LEVEL_GAP’ 몬스터 기준으로 줄입니다.
 * 환생 5회부터 레벨 제한이 풀려 Lv.1이 최상위 사냥터·던전에서 몇 마리 만에 수십 레벨을 오르던 것(환생 반복으로 세계석 찍어 내기)을 막습니다. 골드는 그대로.
 */
export const EXP_LEVEL_GAP = 10;
export const expLevelScale = (monsterLevel: number, playerLevel: number) => monsterLevel > playerLevel + EXP_LEVEL_GAP ? monsterExpAt(playerLevel + EXP_LEVEL_GAP) / monsterExpAt(monsterLevel) : 1;
/** 몬스터 레벨별 기본 능력치(체력·공격·방어). MONSTERS 정의와 같은 식입니다. */
const monsterStatsAt = (level: number) => ({ hp: Math.round(35 + level * 12 + level * level * .65), attack: Math.round(3 + level * 2.2), defense: Math.floor(level * .8) });
/** v27.30 사냥터 적의 능력치는 입장 레벨 + STAGE_ENEMY_LEVEL_OVER까지만 셉니다(보상은 몬스터 레벨 그대로). 입장 직후 몇몇 고레벨 몬스터가 벽이 되던 구간 완화. */
export const STAGE_ENEMY_LEVEL_OVER = 6;
/** 사냥터에서 실제로 싸우는 능력치 기준 몬스터(레벨 상한 적용). 전투와 도감이 같은 값을 씁니다. */
export function stageStatMonster<F extends { level: number; hp: number; attack: number; defense: number }>(f: F, stageLevel: number): F {
    const level = Math.min(f.level, stageLevel + STAGE_ENEMY_LEVEL_OVER);
    return level < f.level ? { ...f, level, ...monsterStatsAt(level) } : f;
}
/**
 * v27.64 사냥터 난이도의 몬스터 레벨 보정: 난이도가 오를수록 몬스터 레벨이 목표 레벨(내 레벨·가장 높은 사냥터 수준 중 낮은 쪽)로 다가가 난이도 10에서 닿습니다.
 * 전에는 난이도가 체력·공격 배율만 올려, 낮은 사냥터(리스항구)의 약한 몬스터를 고레벨이 순식간에 잡으며 난이도 숙련·까미 확률만 챙겼습니다.
 * 이제 같은 난이도라면 어느 사냥터든 내 레벨 근처까지 단단해져, 사냥터를 취향대로 고를 수 있습니다. 경험치·골드도 올라간 레벨 기준(원래보다 낮아지지 않음).
 */
/**
 * 난이도가 이 단계에 이르면 모든 사냥터 몬스터가 목표 레벨(내 레벨과 가장 높은 사냥터 수준 중 낮은 쪽)에 닿습니다. 그 전에는 남은 차이를 단계 비율만큼 메웁니다.
 * v27.67 숙련의 까미가 나오는 난이도(5)부터는 어느 사냥터든 같은 수준이 되게 맞춥니다(난이도 5 리스항구 까미 작업 방지).
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
export function stageRewardNorm(stageMonsters: readonly string[], tier: number) {
    // v3.55 출현 가중치를 모르는 화면(비공개 켬)은 서버가 카탈로그로 보낸 사냥터별 평균 표를 씁니다.
    const stage = oddsKnown() ? undefined : STAGES.find(st => st.monsters === stageMonsters), table = stage && STAGE_REWARD_AVG[stage.id];
    const avg = table ? stageAvgAt(table, tier) : stageRewardAvg(stageMonsters, tier);
    return 1 / Math.pow(Math.max(1, avg), Math.min(1, tier / TIDE_LIFT_TIERS));
}
/** v3.55 구간 표에서 난이도 tier의 평균(그 난이도 이하의 마지막 구간). */
export const stageAvgAt = (table: [number, number][], tier: number) => [...table].reverse().find(([from]) => from <= tier)?.[1] ?? 1;
/** 사냥터 평균 보상 배율(출현 가중, 그 난이도에서 나오는 몬스터). 서버는 진짜 가중치로 계산합니다. */
function stageRewardAvg(stageMonsters: readonly string[], tier: number) {
    const rows = stageMonsters.map(id => MONSTERS.find(f => f.id === id)!).filter(f => f && (f.minTier || 0) <= tier);
    const weight = rows.reduce((a, f) => a + (f.spawnWeight ?? 1), 0);
    return weight ? rows.reduce((a, f) => a + (f.spawnWeight ?? 1) * (f.rewardMultiplier || 1), 0) / weight : 1;
}
/** v3.55 서버: 카탈로그에 실을 사냥터별 [이 난이도부터, 평균 보상 배율] 구간 표. 몬스터의 minTier마다 평균이 바뀝니다. */
export function stageRewardAvgTable(): StageRewardAvg {
    return Object.fromEntries(STAGES.map(st => {
        const from = [...new Set([0, ...st.monsters.map(id => MONSTERS.find(f => f.id === id)?.minTier || 0)])].sort((a, b) => a - b);
        return [st.id, from.map(tier => [tier, stageRewardAvg(st.monsters, tier)] as [number, number])];
    }));
}
export function tideLiftMonster<F extends { level: number; hp: number; attack: number; defense: number; exp: number; gold: number }>(f: F, tier: number, playerLevel: number): F {
    const level = tideLiftLevel(f.level, tier, playerLevel);
    return level > f.level ? { ...f, level, ...monsterStatsAt(level), exp: Math.max(f.exp, monsterExpAt(level)), gold: Math.max(f.gold, monsterGoldAt(level)) } : f;
}
export const MONSTERS: MonsterDef[] = rows.map(([id, name, level, lore]) => ({ id, name, level, hp: Math.round(35 + level * 12 + level * level * .65), attack: Math.round(3 + level * 2.2), defense: Math.floor(level * .8), exp: monsterExpAt(level), gold: monsterGoldAt(level), lore }));
const specialMonsters: Array<{
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
    { id: 'essenceSlime', name: '정수의 슬라임', level: 30, lore: '분해된 장비의 정수가 뭉쳐 굳은 보랏빛 슬라임. 말랑한 몸에 반짝이는 가루를 잔뜩 품고 있다가, 터지면 정수가 쏟아진다.', rarity: 'legendary' as const, rewardMultiplier: 1 },
    { id: 'kingMimic', name: '대왕 까미', level: 10, lore: '수백 개의 상자를 삼켜 몸집을 불린 까미의 우두머리. 입을 벌리면 황금빛 숙련이 넘실대지만, 오래 붙잡아 두면 상자째 달아난다.', rarity: 'legendary' as const, rewardMultiplier: 1 },
    { id: 'kingNuri', name: '대왕 누리', level: 50, lore: '날개가 하늘을 덮는 누리의 어미. 한 번 짖으면 사냥터가 흔들리고, 품은 경험은 새끼의 세 배. 금세 날아가 버린다.', rarity: 'legendary' as const, rewardMultiplier: 1 },
    { id: 'kingSlime', name: '대왕 정수 슬라임', level: 30, lore: '작은 슬라임들이 모여 산처럼 굳은 정수 덩어리. 느리지만 한 번 부딪히면 무겁고, 오래 두면 조용히 녹아 사라진다.', rarity: 'legendary' as const, rewardMultiplier: 1 },
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
    { id: 'stormBarracuda', name: '아이언 호그', level: 20, lore: '폭풍이 지나간 산호초에만 나타나는 검은 번개의 사냥꾼.', rarity: 'epic' as const, rewardMultiplier: 2.4 }, // v26.6 난이도 조건 없음: 이미 산호초에서 저격해 온 유저가 있어 난이도 0부터 출현
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
    // v3.278 아쿠아로드 · 리프레 칠흑 보스.
    { id: 'onyxSwoo', name: '스우', level: 76, lore: '아쿠아로드 심해 기지에 내려앉은 검은 날개의 군단장. 중력을 비틀어 모든 것을 바닥으로 끌어내린다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxDamien', name: '데미안', level: 86, lore: '리프레 세계수의 그루터기에서 타락한 날개를 펼친 복수자. 낙인이 쌓일수록 검은 불꽃이 거세진다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxSeren', name: '세렌', level: 96, lore: '시간의 신전에 내려온 태양의 수호자. 미트라의 분노가 회랑을 태운다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'onyxBlackMage', name: '검은 마법사', level: 106, lore: '아케인 리버의 끝에서 세계를 다시 쓰려는 초월자. 그의 뒤에는 창세의 빛이 있다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'starfallSeraph', name: '파풀라투스', level: 62, lore: '루디브리엄 시계탑의 시간을 멈춘 차원의 침략자.', rarity: 'legendary' as const, rewardMultiplier: 5.5, boss: true },
    // v3.367 코프룰루 구역: 희귀~전설(출현 가중치는 secret/odds.ts ODDS.spawn), 난이도 변종(minTier 50~80), 던전 보스 2, 칠흑 보스 4(베스퍼 · 할더 · 미렌 · 솔렌).
    { id: 'aoCargoSpider', name: '화물 거미', level: 102, lore: '버려진 화물에 실을 치고 기다린다. 짐을 든 모험가부터 노린다.', rarity: 'rare' as const, rewardMultiplier: 1.4 },
    { id: 'aoWeldHound', name: '용접 사냥개', level: 103, lore: '턱에 달린 용접기가 아직 뜨겁다. 물면 불이 붙는다.', rarity: 'rare' as const, rewardMultiplier: 1.5 },
    { id: 'aoCoreLeech', name: '동력 거머리', level: 103, lore: '정거장의 남은 동력을 빨아먹고 자랐다. 닿은 것의 힘을 끊는다.', rarity: 'epic' as const, rewardMultiplier: 1.85 },
    { id: 'aoBlackBoxWarden', name: '블랙박스 수호기', level: 104, lore: '정거장의 마지막 기록을 품은 기계. 기록을 지키려 모든 것을 막는다.', rarity: 'legendary' as const, rewardMultiplier: 1.9 },
    { id: 'aoGhostDrone', name: '유령 드론', level: 103, lore: '격납고가 가장 어두울 때만 깨어난다. 몸은 없고 명령만 남았다.', rarity: 'epic' as const, rewardMultiplier: 2.6, minTier: 50 },
    { id: 'aoRiftLurker', name: '틈새 잠복자', level: 103, lore: '중력이 끊긴 틈에 숨어 지나가는 것을 덮친다. 한 번 잡으면 놓지 않는다.', rarity: 'rare' as const, rewardMultiplier: 1.4 },
    { id: 'aoSignalEel', name: '신호 장어', level: 104, lore: '끊긴 통신선을 타고 다닌다. 몸에 남은 신호가 전격이 되었다.', rarity: 'rare' as const, rewardMultiplier: 1.55 },
    { id: 'aoVoidCrab', name: '공허 게', level: 104, lore: '갑판 바깥의 어둠에서 왔다. 집게가 물리와 마법을 반씩 가른다.', rarity: 'epic' as const, rewardMultiplier: 2 },
    { id: 'aoStarEater', name: '별 포식자', level: 105, lore: '별빛을 먹어 치우는 비행 생물. 지나간 자리는 한동안 어둡다.', rarity: 'legendary' as const, rewardMultiplier: 2 },
    { id: 'aoEclipseMoth', name: '일식 나방', level: 104, lore: '별이 가려진 순간에만 나타나는 검은 나방. 날갯짓이 소리를 지운다.', rarity: 'epic' as const, rewardMultiplier: 2.7, minTier: 50 },
    { id: 'aoRustAdmiral', name: '녹슨 제독', level: 104, lore: '정거장의 마지막 선장. 멈춘 항로를 되살리려 시간을 되감는다. 잿빛 궤도의 전설.', rarity: 'legendary' as const, rewardMultiplier: 6.5, boss: true },
    { id: 'onyxVesper', name: '베스퍼', level: 106, lore: '잿빛 궤도 부두에 내려앉은 정적. 경보가 울려도 소리는 나지 않고, 소리 없이 모든 것이 멈춘다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'vwPrismLizard', name: '프리즘 도마뱀', level: 104, lore: '비늘이 빛을 일곱 갈래로 쪼갠다. 쪼개진 빛마다 뜨겁다.', rarity: 'rare' as const, rewardMultiplier: 1.4 },
    { id: 'vwOreGolem', name: '광석 골렘', level: 105, lore: '채굴 기계가 버린 광석이 뭉쳐 일어섰다. 느리지만 바위보다 단단하다.', rarity: 'rare' as const, rewardMultiplier: 1.5 },
    { id: 'vwVeinSpirit', name: '광맥 정령', level: 105, lore: '결정 속에 갇혀 있던 빛. 풀려나자 소리부터 빼앗는다.', rarity: 'epic' as const, rewardMultiplier: 1.9 },
    { id: 'vwCrystalTitan', name: '결정 거인', level: 106, lore: '채굴장 바닥에서 일어난 결정 덩어리. 걸음마다 땅이 갈라진다.', rarity: 'legendary' as const, rewardMultiplier: 1.8 },
    { id: 'vwHollowShard', name: '속 빈 결정', level: 105, lore: '안이 텅 빈 결정 생물. 깨지는 소리가 물리와 마법으로 동시에 울린다.', rarity: 'epic' as const, rewardMultiplier: 2.6, minTier: 60 },
    { id: 'vwBloatHound', name: '부푼 사냥개', level: 105, lore: '가스에 중독된 뒤로 쉬지 않고 달린다. 숨소리가 들리면 이미 가깝다.', rarity: 'rare' as const, rewardMultiplier: 1.35 },
    { id: 'vwCinderWasp', name: '잿불 말벌', level: 106, lore: '가스에 불이 붙은 채 난다. 쏘인 자리가 오래 탄다.', rarity: 'rare' as const, rewardMultiplier: 1.5 },
    { id: 'vwFumeSerpent', name: '연기 뱀', level: 106, lore: '가스 구름이 뱀의 모양을 얻었다. 물린 자리에 독이 겹겹이 쌓인다.', rarity: 'epic' as const, rewardMultiplier: 2 },
    { id: 'vwCalderaMaw', name: '분화구 아가리', level: 107, lore: '분화구 바닥에서 입을 벌린 거대 생물. 가스를 삼켜 불로 뱉는다.', rarity: 'legendary' as const, rewardMultiplier: 2 },
    { id: 'vwYellowTitan', name: '황색 거인', level: 106, lore: '가스를 오래 마신 골렘. 몸이 세 배로 부풀어 느리지만 한 걸음이 무겁다.', rarity: 'epic' as const, rewardMultiplier: 2.7, minTier: 60 },
    { id: 'onyxHalder', name: '할더', level: 108, lore: '광맥 황야 갱도에 봉인된 결정의 석상. 팔이 여섯이고, 하나하나가 결정 채굴기다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'hmSpineCrawler', name: '가시 기는 것', level: 106, lore: '늪 바닥을 기며 등의 가시를 세운다. 밟히면 늪째 굳는다.', rarity: 'rare' as const, rewardMultiplier: 1.4 },
    { id: 'hmBroodWatcher', name: '산란 감시자', level: 107, lore: '알들 위를 맴도는 눈. 소리를 지워 알이 깨어나는 때를 숨긴다.', rarity: 'rare' as const, rewardMultiplier: 1.5 },
    { id: 'hmSpawner', name: '산란체', level: 107, lore: '늪 바닥에 숨은 거대한 산란 기관. 쓰러질 때까지 유충을 토해 낸다.', rarity: 'epic' as const, rewardMultiplier: 1.95 },
    { id: 'hmMarshTyrant', name: '늪의 폭군', level: 108, lore: '산란 늪에서 가장 오래 산 개체. 새 군체가 깨어나면 가장 먼저 먹는다.', rarity: 'legendary' as const, rewardMultiplier: 1.9 },
    { id: 'hmBlackLarva', name: '검은 유충', level: 107, lore: '늪이 가장 깊은 난이도에서만 깨어나는 검은 알의 유충. 형제보다 세 배 빠르다.', rarity: 'epic' as const, rewardMultiplier: 2.6, minTier: 70 },
    { id: 'hmSynapseHound', name: '시냅스 사냥개', level: 107, lore: '신경을 물면 전기가 흐른다. 한 번 물린 자리는 한동안 저리다.', rarity: 'rare' as const, rewardMultiplier: 1.45 },
    { id: 'hmVeinLeech', name: '혈관 거머리', level: 108, lore: '회랑 벽의 혈관에 붙어 산다. 떨어지면 다음 먹이를 찾는다.', rarity: 'rare' as const, rewardMultiplier: 1.55 },
    { id: 'hmOverseer', name: '지배종', level: 108, lore: '군체의 뜻을 받아 회랑을 다스린다. 말을 끊고 생각을 끊는다.', rarity: 'epic' as const, rewardMultiplier: 2.1 },
    { id: 'hmCorridorKing', name: '회랑의 왕', level: 109, lore: '신경 회랑 끝에 앉은 거대 군체. 벽을 조여 회랑 전체를 무기로 쓴다.', rarity: 'legendary' as const, rewardMultiplier: 2 },
    { id: 'hmPaleOverseer', name: '창백한 지배종', level: 108, lore: '군체와 연결이 끊긴 지배종. 빛을 잃은 대신 자기 뜻으로 마법을 쓴다.', rarity: 'epic' as const, rewardMultiplier: 2.8, minTier: 70 },
    { id: 'hmHiveMother', name: '모체', level: 108, lore: '군체의 심장 그 자체. 늪의 모든 알이 이 심장의 박동에 맞춰 깨어난다. 군체 늪지의 전설.', rarity: 'legendary' as const, rewardMultiplier: 7, boss: true },
    { id: 'onyxMirren', name: '미렌', level: 110, lore: '군체 늪지 위를 떠도는 거대한 눈. 눈이 감기면 늪의 모든 것이 함께 잠든다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
    { id: 'scPrismGuard', name: '프리즘 수호자', level: 107, lore: '빛을 물리와 마법으로 갈라 쓴다. 어느 쪽 방어든 한쪽만으로는 모자라다.', rarity: 'rare' as const, rewardMultiplier: 1.4 },
    { id: 'scHaloWisp', name: '후광 요정', level: 108, lore: '후광이 뜨겁다. 가까이 선 것은 빛에 그을린다.', rarity: 'rare' as const, rewardMultiplier: 1.5 },
    { id: 'scShadowEater', name: '그림자 포식자', level: 108, lore: '첨탑의 빛이 만든 그림자를 먹고 자랐다. 빛이 셀수록 커진다.', rarity: 'epic' as const, rewardMultiplier: 2 },
    { id: 'scSpireKeeper', name: '첨탑 수호장', level: 109, lore: '첨탑 꼭대기를 지키는 고대 문명의 마지막 병사. 빛의 갑주는 아직 금이 가지 않았다.', rarity: 'legendary' as const, rewardMultiplier: 1.8 },
    { id: 'scDawnWeaver', name: '새벽 직조자', level: 108, lore: '첫 빛을 짜는 직조자. 가장 높은 난이도에서만 첨탑에 내려온다.', rarity: 'epic' as const, rewardMultiplier: 2.7, minTier: 80 },
    { id: 'scHollowSentinel', name: '텅 빈 파수꾼', level: 108, lore: '갑주 안이 비어 있다. 비어 있는 곳에서 소리를 지우는 바람이 분다.', rarity: 'rare' as const, rewardMultiplier: 1.45 },
    { id: 'scGravityMaw', name: '중력 아가리', level: 109, lore: '회랑 바닥의 입. 가까운 것을 끌어당겨 연달아 씹는다.', rarity: 'rare' as const, rewardMultiplier: 1.55 },
    { id: 'scEchoOfEnd', name: '끝의 메아리', level: 109, lore: '세계의 끝에서 되돌아온 소리가 형체를 얻었다. 물리와 마법을 동시에 울린다.', rarity: 'epic' as const, rewardMultiplier: 2.1 },
    { id: 'scLastWarden', name: '최후의 관문지기', level: 110, lore: '고대 문명이 바다 너머에 세운 마지막 문의 지기. 문 뒤는 아직 아무도 보지 못했다.', rarity: 'legendary' as const, rewardMultiplier: 2 },
    { id: 'scStillReverser', name: '멈춘 역행자', level: 109, lore: '시간이 멈춘 역행자. 가장 높은 난이도에서만 회랑 끝에 서 있다.', rarity: 'epic' as const, rewardMultiplier: 2.8, minTier: 80 },
    { id: 'onyxSolenne', name: '솔렌', level: 110, lore: '고요한 성단의 빛을 짠 첫 직조자. 성단이 고요한 것은 그가 모든 소리를 빛으로 바꿨기 때문이다.', rarity: 'legendary' as const, rewardMultiplier: 4, boss: true },
];
for (const f of specialMonsters)
    MONSTERS.push({ id: f.id, name: f.name, level: f.level, hp: Math.round(35 + f.level * 12 + f.level * f.level * .65), attack: Math.round(3 + f.level * 2.2), defense: Math.floor(f.level * .8), exp: monsterExpAt(f.level), gold: monsterGoldAt(f.level), lore: f.lore, rarity: f.rarity, /** v3.55 출현 가중치는 서버 전용(ODDS.spawn). */ get spawnWeight() { return ODDS.spawn[f.id]; }, rewardMultiplier: f.rewardMultiplier, boss: f.boss, ...(f.minTier ? { minTier: f.minTier } : {}) });
// v27.41 메이플 몬스터 이름: maple-monsters.ts 한곳에서 이름·설명을 덮어씁니다(id·능력치는 그대로).
for (const f of MONSTERS) { const m = MAPLE_MONSTERS[f.id]; if (m) { f.name = m.name; f.lore = m.lore; } }
let monsterIndex: Map<string, MonsterDef> | undefined;
/** 몬스터 id로 찾기. */
export const monsterById = (id: string | undefined) => id === undefined ? undefined : (monsterIndex ??= new Map(MONSTERS.map(f => [f.id, f]))).get(id);
/**
 * v27.31 운영 페이지에서 닫은 사냥터·던전(입장 불가). 서버가 DB 설정(settings.closures)을 읽어 setClosures로 채웁니다.
 * 설정을 한 번도 저장하지 않았으면 DEFAULT_CLOSURES(무릉도장 닫힘)를 씁니다. 테스트는 harness에서 비웁니다.
 * 서버 계산은 dungeonClosed·stageClosed를, 화면은 동기화 때 적힌 State.closed를 봅니다.
 */
export type Closures = { dungeons: string[]; stages: string[] };
export const DEFAULT_CLOSURES: Closures = { dungeons: ['abyss'], stages: [] };
const CLOSED_DUNGEONS = new Set<string>(DEFAULT_CLOSURES.dungeons);
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
// v3.186 입장 환생(docs/boss-plan.md §6): 입장 몸(초보)으로 보스 14 · 22 · 20턴 · 사망 0이 되는 값.
/** v3.201 지역 던전은 잡몹 1판 + 보스(2연전). monsters의 마지막 칸은 보스 자리표시(bossMonster로 바뀜). 무릉도장은 층 공식 그대로 5연전. */
export const DUNGEONS = [
    { id: 'abyss', name: '무릉도장', level: 40, rebirth: 3, monsters: ['moonfish', 'dragon', 'ancient', 'dragon', 'ancient'], bossMonster: 'abyssSovereign', boss: '도장의 주인 · 무공', gold: 12000, pearls: 1, description: '오를 때마다 다음 층이 열립니다. 높을수록 층마다 더 많은 세계석을 얻고, 10·25·50·100층을 처음 돌파하면 SP 1을 받습니다.' },
    { id: 'grotto', name: '헤네시스 · 버섯 동산', level: 8, rebirth: 0, monsters: ['ray', 'eel'], bossMonster: 'grottoWarden', boss: '버섯 동산의 주인 · 머쉬맘', gold: 350, pearls: 1, description: '숲의 몬스터를 물리치면 거대한 버섯이 눈을 뜬다.' },
    { id: 'kelpCatacomb', name: '커닝시티 · 지하 수로', level: 14, rebirth: 0, monsters: ['seahorse', 'needlefish'], bossMonster: 'kelpHydra', boss: '수로의 왕 · 킹 슬라임', gold: 950, pearls: 1, description: '갈라지고 또 갈라지는 슬라임들이 도시 아래 수로를 메웠다.' },
    { id: 'cemetery', name: '슬리피우드 · 개미굴', level: 18, rebirth: 0, monsters: ['ghost', 'shark'], bossMonster: 'anchorWraith', boss: '개미굴의 망령 · 좀비 머쉬맘', gold: 1600, pearls: 2, description: '깊은 개미굴 아래, 썩지 않는 버섯이 마지막 보물을 지킨다.' },
    { id: 'caldera', name: '페리온 · 불의 제단', level: 26, rebirth: 2, monsters: ['emberEel', 'emberEel'], bossMonster: 'magmaKraken', boss: '불꽃의 마족 · 주니어 발록', gold: 4200, pearls: 3, description: '뜨거운 불길이 장비와 골드를 녹여 새로운 형태로 만든다.' },
    { id: 'temple', name: '엘리니아 · 잊힌 마법 사원', level: 30, rebirth: 2, monsters: ['viper', 'dragon'], bossMonster: 'templeOracle', boss: '하늘의 마녀 · 엘리쟈', gold: 6000, pearls: 5, description: '환생의 기억을 지닌 자에게만 열리는 문.' },
    { id: 'ventCathedral', name: '엘나스 · 자쿰의 제단', level: 60, rebirth: 8, monsters: ['ventCrab', 'ventLeviathan'], bossMonster: 'ventColossus', boss: '폐광의 거대 석상 · 자쿰', gold: 30000, pearls: 12, description: '엘나스 폐광 깊은 곳의 제단. 팔 하나하나가 숨을 쉬는, 환생 8회의 탐험지.' },
    { id: 'starSanctum', name: '루디브리엄 · 시계탑', level: 48, rebirth: 6, monsters: ['starKoi', 'starKoi'], bossMonster: 'starfallSeraph', boss: '시계탑의 주인 · 파풀라투스', gold: 18000, pearls: 8, description: '장난감 도시의 시계탑 꼭대기. 멈춘 시간 속에서 차원의 침략자와 맞서는 후반 탐험지.' },
    // v3.367 코프룰루 지역 던전(잡몹 1판 + 보스).
    { id: 'orbitBridge', world: 'koprulu' as const, name: '잿빛 궤도 · 함교', level: 102, rebirth: 52, monsters: ['aoBridgeGuard', 'aoBridgeGuard'], bossMonster: 'aoRustAdmiral', boss: '함교의 마지막 선장 · 녹슨 제독', gold: 120000, pearls: 14, description: '정거장 가장 높은 곳의 함교. 마지막 선장은 아직도 자리에 앉아 항로를 바꾸려 든다.' },
    { id: 'hiveHeart', world: 'koprulu' as const, name: '군체 늪지 · 군체의 심장', level: 106, rebirth: 62, monsters: ['hmMuscleWall', 'hmMuscleWall'], bossMonster: 'hmHiveMother', boss: '군체의 심장 · 모체', gold: 190000, pearls: 18, description: '늪 가장 깊은 곳에서 뛰는 군체의 심장. 심장이 멈추기 전에는 늪의 알이 깨어나기를 멈추지 않는다.' },
];
/** v3.209 랜덤게임을 지운 뒤로는 DUNGEONS와 같습니다(예전 이름을 쓰는 곳이 많아 남겨 둠). */
export const PLAIN_DUNGEONS = DUNGEONS;
let dungeonIndex: Map<string, (typeof DUNGEONS)[number]> | undefined;
/** 던전 id로 찾기. */
export const dungeonById = (id: string | undefined) => id === undefined ? undefined : (dungeonIndex ??= new Map(DUNGEONS.map(d => [d.id, d]))).get(id);
/** v3.9 지역 던전(까미·누리·무릉도장 제외)의 입장 레벨 순서 깊이 계수. */
const REGION_DUNGEONS = () => PLAIN_DUNGEONS.filter(d => d.id !== 'abyss' && d.id !== 'masteryMimic' && d.id !== 'expNuri');
export const dungeonDepth = (id: string) => { const d = REGION_DUNGEONS().find(x => x.id === id); return d ? 1 + DEPTH_SCALE * [...new Set(REGION_DUNGEONS().map(x => x.level))].filter(l => l < d.level).length : 1; };
