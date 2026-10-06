/**
 * v3.52 드롭·확률 수치(서버 전용, docs/concept.md 10장). 공개 표(balance·gear·mimic·exp-nuri·onyx·variants·world·economy)의 확률 칸은
 * game/data/odds.ts 창구를 읽고, 서버는 register.ts가 이 값으로 채웁니다. 화면은 비공개가 꺼져 있을 때만 카탈로그로 받습니다.
 * 편집은 이 파일에서 합니다. 각 값의 내력은 옛 위치의 주석(버전별 조정 기록)을 그대로 옮겼습니다.
 */
// 서버 전용 표식: 화면(클라이언트) 번들이 이 파일을 가져가면 빌드가 실패합니다(docs/concept.md 10.2-1).
import 'server-only';
import type { Odds } from '../data/odds';

export const SERVER_ODDS: Odds = {
    drop: {
        // v27.53 처치당 기본 0.25%(전에는 0.1%). v27.73 상한 1.5% → 3%: 행운 500이나 행운 300 + 물건도감 완성만으로 상한에 닿아 보물의 감각 연구가 0 효과가 되던 것을 풀었습니다.
        // 행운·물건도감·연구·드롭 보너스는 이 확률에 곱해지는 상대 증가(BALANCE.dropBonusScale).
        chance: 0.0025, cap: 0.03,
        /** v27.30 던전 반복 정복 시 희귀 이상 확정 장비 확률 5% → 1%(레벨 초과 감소 적용). 첫 정복·심연 5층마다는 항상. */
        dungeonRepeat: 0.01,
        /** v27.45 황금 개체 기본 확률(처치마다). 시프 계열 패시브가 그 위에 더합니다. */
        goldenBase: .002,
        /** 장비 등급 분포(일반 · 희귀 · 영웅 · 전설 · 신화 · 고대 · 태초). 하한 등급 이상만 다시 정규화해 뽑습니다. */
        rarity: [.5, .25, .13, .07, .035, .012, .003],
        /**
         * v27.76 사냥터 난이도의 장비 보상. 희귀 이상 드롭의 등급 가중치를 (1 + tideRarityPerTier × 난이도)^(등급−1)로 밉니다.
         * 보수적으로 잡아 난이도 100에서 태초 0.6% → 1.0%, 전설 이상 24% → 30%.
         * 정수: 난이도 essenceMinTier(공개) 이상 사냥터에서 처치마다 확률 essenceChancePerTier × 난이도, 양 1 + ⌊난이도 ÷ essenceEveryTiers⌋. 던전은 제외.
         */
        tideRarityPerTier: .0014, essenceChancePerTier: .003, essenceEveryTiers: 10,
    },
    mimic: {
        /** 출현마다 까미가 나올 확률. 사냥터 난이도 1단계마다 perTier만큼 더합니다(난이도 MIMIC.tierCap까지). */
        chance: .0015, perTier: .0005,
        /** 사냥터 순서(0부터)마다 등장 확률 배율 +stageStep(MIMIC.stageCap 사냥터까지). 낮은 사냥터는 빨리 많이 잡고, 높은 사냥터는 한 번의 확률이 높습니다. */
        stageStep: .25,
        /** 숙련 로또 소 · 중 · 대. 앞에서부터 확률을 더해 판정합니다. */
        tiers: [.70, .25, .05],
        /** v3.31 행운의 편지 8단계(승천 후): ‘대’ 당첨 5% → 7.5%(차이는 ‘소’에서 뺌). */
        letterJackpot: .075,
    },
    nuri: {
        /** 출현마다 누리가 나올 확률. 사냥터 난이도 1단계마다 perTier만큼 더합니다. 예: 난이도 10 → 0.25%. */
        chance: .0015, perTier: .0001,
        /** 경험치 로또 소 · 중 · 대(기댓값 약 1.35%). */
        tiers: [.70, .25, .05],
    },
    /** v3.12 칠흑의 보스: 무리 서식지 출현마다 chance × (1 + 난이도 × perTier), pity번 못 보면 확정. 장신구 drop, dropPity번째 연속 미획득 격파는 확정. */
    onyx: { chance: .003, perTier: 1 / 50, pity: 2000, drop: .003, dropPity: 400 },
    variant: {
        /** 변종별 처치당 기본 확률. */
        chance: { swarm: .04, giant: .02, abyssal: .004, starlit: .008 },
        /** v27.80 지역별 변종: 지역마다 대표 변종은 ×2.5, 나머지는 ×0.8. 커닝시티·아케인 리버는 두 변종 ×1.8. (대표 변종 이름은 공개 표 REGION_SIGNATURE) */
        region: {
            '리스항구': { swarm: 2.5, giant: .8, abyssal: .8, starlit: .8 },
            '헤네시스': { giant: 2.5, swarm: .8, abyssal: .8, starlit: .8 },
            '페리온': { abyssal: 2.5, swarm: .8, giant: .8, starlit: .8 },
            '엘리니아': { starlit: 2.5, swarm: .8, giant: .8, abyssal: .8 },
            '커닝시티': { swarm: 1.8, abyssal: 1.8, giant: .8, starlit: .8 },
            '아쿠아로드': { swarm: 2.5, giant: .8, abyssal: .8, starlit: .8 },
            '리프레': { giant: 2.5, swarm: .8, abyssal: .8, starlit: .8 },
            '시간의 신전': { starlit: 2.5, swarm: .8, giant: .8, abyssal: .8 },
            '아케인 리버': { abyssal: 1.8, swarm: 1.8, giant: .8, starlit: .8 },
        },
        /** 무리 규모 추첨 가중치 ×5 : ×100 : ×500. */
        swarmWeights: [8, 3, 1],
        /** v27.80 무리 서식지에서 ×500이 나올 확률(아니면 ×100). */
        habitatBig: .25,
    },
    /** 상점 감정 등급 확률: 희귀 · 영웅 · 전설 · 신화 · 고대 · 태초. */
    appraisal: [.55, .33, .09, .025, .004, .001],
    /**
     * v3.54 몬스터 출현 가중치(world.ts specialFish에서 옮김). 표에 없는 몬스터는 1. 까미·누리는 0(일반 출현 판정에서 빠지고 따로 판정).
     * 희귀 몬스터 출현 증가(도감 특성·패시브)는 encounter.ts weightedFishId가 이 위에 곱합니다.
     */
    spawn: {
        masteryMimic: 0, expNuri: 0,
        seahorse: .18, needlefish: .12, tidejelly: .07, emberEel: .14, ashRay: .1, magmaPuffer: .06, cinderKoi: .045,
        starKoi: .1, prismRay: .065, voidGuppy: .04, stormBarracuda: .08, eclipseMoonfish: .06, novaManta: .03,
        cinderAngler: .6, ventLeviathan: .3, abyssManta: .018,
    },
};
