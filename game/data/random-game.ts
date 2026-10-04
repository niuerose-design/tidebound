/**
 * v27.82 랜덤게임(전 서약 ‘잠든 힘’): 해금한 사냥터의 몬스터가 웨이브마다 무작위로 나오는 던전.
 * 웨이브를 깰 때마다 판돈(정수·세계석)이 쌓이고, 목표 웨이브에 닿거나 ‘받고 나가기’를 누르면 받습니다. 쓰러지면 판돈은 모두 사라집니다.
 * 처치 경험치·골드·장비 드롭은 없습니다(보상은 판돈뿐). 세계석 연구 ‘랜덤게임’(vowAnchor) 단계만큼 생마다 입장하고, 판돈은 ×1 → ×1.5 → ×2.
 */
export const RANDOM_GAME = {
    id: 'randomGame',
    /** 웨이브 w(1부터)의 난이도: 2w(웨이브 10 = 난이도 20, 20 = 40). 몬스터 레벨은 난이도 5부터 내 레벨까지 오릅니다. */
    tierBase: 0, tierPerWave: 2,
    /** 이 웨이브마다 보스. */
    bossEvery: 10,
    /** 웨이브 w를 깨면 판돈에 정수 2w, 세계석 ⌊w/10⌋. */
    essencePerWave: 2, pearlEvery: 10,
    /** 입장할 때 고르는 목표 웨이브(0은 목표 없음: 받고 나가기를 누르거나 쓰러질 때까지). */
    targets: [5, 10, 15, 20, 30, 50, 0] as const,
    research: 'vowAnchor',
};
export const randomGameTier = (wave: number) => RANDOM_GAME.tierBase + RANDOM_GAME.tierPerWave * (wave + 1);
export const randomGameBoss = (wave: number) => (wave + 1) % RANDOM_GAME.bossEvery === 0;
/** 웨이브 w(1부터)를 깨서 쌓이는 판돈(배율 적용 전). */
export const waveStake = (w: number) => ({ essence: RANDOM_GAME.essencePerWave * w, pearls: Math.floor(w / RANDOM_GAME.pearlEvery) });
/** 웨이브 1~n을 모두 깼을 때의 판돈 합계(배율 적용 전). */
export const stakeUpTo = (n: number) => { let essence = 0, pearls = 0; for (let w = 1; w <= n; w++) { const x = waveStake(w); essence += x.essence; pearls += x.pearls; } return { essence, pearls }; };
