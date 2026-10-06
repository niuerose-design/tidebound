/**
 * v3.52 정보 비공개 4단계(4-2, docs/concept.md 10장): 드롭·확률 수치의 창구(화면 가능).
 * 진짜 값은 서버 전용 game/secret/odds.ts에 있고, 서버는 엔진을 불러올 때(game/secret/register.ts) setOdds로 채웁니다.
 * 화면은 처음에 모두 0이고, 비공개가 꺼져 있으면(오픈 베타) 서버가 카탈로그로 보낸 값을 applyCatalog가 setOdds로 채워 지금처럼 보여 줍니다.
 * 각 표(BALANCE·MIMIC·EXP_NURI·ONYX·VARIANTS·HABITAT·APPRAISAL)는 확률 칸을 이 창구에서 읽는 getter로 두어, 읽는 코드는 그대로입니다.
 * 확률 칸을 모듈을 불러올 때 계산해 두면(최상위 상수) 서버가 채우기 전 값(0)이 굳으므로, 늘 쓸 때 읽습니다.
 */
export type Odds = {
    /** 장비 드롭: 처치당 기본 확률 · 상한 · 던전 반복 정복 확정 장비 · 황금 개체 기본 · 등급 분포(일반~태초) · 사냥터 난이도 등급 가중 · 정수 확률·양. */
    drop: { chance: number; cap: number; dungeonRepeat: number; goldenBase: number; rarity: number[]; tideRarityPerTier: number; essenceChancePerTier: number; essenceEveryTiers: number };
    /** 숙련의 까미: 기본 · 난이도당 · 사냥터 순서당 배율 · 당첨 등급(소·중·대) · 행운의 편지 ‘대’ 당첨. */
    mimic: { chance: number; perTier: number; stageStep: number; tiers: number[]; letterJackpot: number };
    /** 경험의 누리: 기본 · 난이도당 · 당첨 등급(소·중·대). */
    nuri: { chance: number; perTier: number; tiers: number[] };
    /** 칠흑의 보스: 출현 기본 · 난이도당 배율 · 출현 천장 · 장신구 드롭 · 드롭 천장. */
    onyx: { chance: number; perTier: number; pity: number; drop: number; dropPity: number };
    /** 변종: 종류별 처치당 기본 확률 · 지역 배율 · 무리 규모(×5·×100·×500) 가중치 · 무리 서식지 ×500 확률. */
    variant: { chance: Record<string, number>; region: Record<string, Record<string, number>>; swarmWeights: number[]; habitatBig: number };
    /** 상점 감정 등급 확률(APPRAISAL 순서: 희귀 · 영웅 · 전설 · 신화 · 고대 · 태초). */
    appraisal: number[];
    /** v3.54 몬스터 출현 가중치(희귀 몬스터 id → 가중치, 없으면 1). */
    spawn: Record<string, number>;
};
const empty = (): Odds => ({
    drop: { chance: 0, cap: 0, dungeonRepeat: 0, goldenBase: 0, rarity: [0, 0, 0, 0, 0, 0, 0], tideRarityPerTier: 0, essenceChancePerTier: 0, essenceEveryTiers: 1 },
    mimic: { chance: 0, perTier: 0, stageStep: 0, tiers: [0, 0, 0], letterJackpot: 0 },
    nuri: { chance: 0, perTier: 0, tiers: [0, 0, 0] },
    onyx: { chance: 0, perTier: 0, pity: Infinity, drop: 0, dropPity: Infinity },
    variant: { chance: {}, region: {}, swarmWeights: [0, 0, 0], habitatBig: 0 },
    appraisal: [0, 0, 0, 0, 0, 0],
    spawn: {},
});
/** 지금 쓰는 값. 서버는 늘 진짜 값, 화면은 카탈로그로 받았을 때만. */
export const ODDS: Odds = empty();
let known = false;
export function setOdds(o: Odds) { Object.assign(ODDS, JSON.parse(JSON.stringify(o)) as Odds); known = true; }
/** 진짜 값을 받았는지(화면: 비공개가 켜져 있으면 false). */
export const oddsKnown = () => known;
/** v3.55 설명 글용: 값을 알면 퍼센트, 모르면 대신 쓸 말. */
export const oddsPercent = (x: number, unknown: string) => known ? `${Math.round(x * 1000) / 10}%` : unknown;

/**
 * v3.54 사냥터 평균 보상 배율(출현 가중 평균, world.ts stageRewardNorm). 출현 가중치는 비밀이지만 도감 ‘적 정보’가 실제 전투와 같은 값을 보여야 하므로,
 * 서버가 사냥터마다 [이 난이도부터, 평균] 구간 표로 만들어 카탈로그에 늘 싣습니다(가중치 하나하나는 드러나지 않음). 화면은 진짜 값을 모를 때 이 표를 씁니다.
 */
export type StageRewardAvg = Record<string, [tier: number, avg: number][]>;
export const STAGE_REWARD_AVG: StageRewardAvg = {};
export function setStageRewardAvg(table: StageRewardAvg) { for (const k of Object.keys(STAGE_REWARD_AVG)) delete STAGE_REWARD_AVG[k]; Object.assign(STAGE_REWARD_AVG, table); }
