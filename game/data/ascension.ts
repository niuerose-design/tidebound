/**
 * v3.30 승천: 환생을 끝까지 오른 뒤 숙련·업적·계급장을 들고 처음부터 다시 오르는 2단계 리셋(설계: docs/balance-rebirth.md 8·11·13·14절).
 * 환생·장비·연구는 한 승천 안의 일시적인 사다리이고, 직업·스킬 숙련은 승천을 넘어 쌓이는 게임의 중심입니다.
 */
/** 승천에 필요한 환생 횟수: 승천할 때마다 오르고 200에서 멈춥니다(13절 B안). 인덱스 = 지금까지 한 승천 횟수. */
export const ASCENSION = {
    requirements: [100, 125, 150, 175, 200],
    /** 환생 상한: 이 횟수부터는 환생할 수 없고 승천만 할 수 있습니다(9절). */
    rebirthCap: 200,
    /** 이 환생 횟수부터 세계석 연구 구매가 잠깁니다(9절). 재분배는 막지 않습니다. */
    researchLockAt: 200,
    /** 숙련 배율: 승천 1회당 +100%(선형), 승천 5회에서 멈춤(×6). 까미 당첨분에도 곱합니다(11.7). */
    masteryPer: 1, masteryCap: 5,
    /** 서약 보상 보너스 부분 배율: 승천 1회당 +20%, 5회에서 멈춤(×2, 14.1). */
    vowPer: .2, vowCap: 5,
    /** 승천한 모험가의 초반 가속: 환생 이 횟수 전까지 경험치 ×earlyExp(새싹의 축복 대신, 12.1). */
    earlyExpUntil: 10, earlyExp: 2,
} as const;
type AscensionState = { ascension?: number };
export const ascensionOf = (s: AscensionState) => Math.max(0, Math.floor(s.ascension || 0));
export const ascended = (s: AscensionState) => ascensionOf(s) > 0;
/** 다음 승천에 필요한 환생 횟수. */
export const ascensionRequirement = (s: AscensionState) => ASCENSION.requirements[Math.min(ascensionOf(s), ASCENSION.requirements.length - 1)];
/** 숙련 획득 배율(승천). */
export const ascensionMastery = (s: AscensionState) => 1 + Math.min(ASCENSION.masteryCap, ascensionOf(s)) * ASCENSION.masteryPer;
/** 서약 보상 보너스 부분에 곱하는 배율(승천). */
export const ascensionVow = (s: AscensionState) => 1 + Math.min(ASCENSION.vowCap, ascensionOf(s)) * ASCENSION.vowPer;
/** 승천한 모험가의 초반 경험치 배율. */
export const ascensionEarlyExp = (s: AscensionState & { rebirths: number }) => ascended(s) && s.rebirths < ASCENSION.earlyExpUntil ? ASCENSION.earlyExp : 1;

/**
 * 승천하면 자동으로 주는 세계석 연구(14.2). 순수 편의는 최대 단계, 콘텐츠를 여는 연구(서약 셋·랜덤게임)는 1단계.
 * 무료로 준 단계는 researchGranted에 적어 재분배 때 세계석으로 돌려주지 않습니다.
 */
export const ASCENSION_RESEARCH: Record<string, number> = {
    habit: 3, inventory: 8, offline: 12, salvage: 5, sortingNet: 2, autoVend: 2, autoStar: 1, revive: 5,
    vowAnchor: 1, vowBreath: 1, vowRough: 1, vowRestraint: 1,
};
/** 승천 기록을 세이브에 남기는 수. */
export const ASCENSION_LOG_KEEP = 20;
/** 모든 승천을 합친 누적 환생 횟수. 분신 슬롯 해금은 이 값으로 판정해 승천 뒤에도 잠기지 않습니다. */
export const lifetimeRebirths = (s: { rebirths: number; ascensionLog?: { rebirths: number }[] }) => (s.rebirths || 0) + (s.ascensionLog || []).reduce((a, x) => a + (x.rebirths || 0), 0);
