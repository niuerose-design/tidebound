/** 실전 누적 수련. SP는 기존 기본 성장에만 사용됩니다. */
/**
 * v3.74 극한돌파: 한계돌파 3단계를 마친 액티브 스킬의 숙련이 1억에 닿으면 달성합니다(어떤 스킬이든 같은 값).
 * 한 가지 스킬만 파는 모험가를 위한 보상으로 설계 중이라 지금은 효과가 없고, 달성하면 운영자에게 문의합니다(업적은 보상 없음).
 */
export const EXTREME_BREAK_PRACTICE = 100_000_000;
export const VOCATION_OFFSETS = [5000, 25000, 100000, 400000, 1500000, 5000000, 15000000];
export const vocationTargets = (base: number) => VOCATION_OFFSETS.map(n => base + n);
export const thresholdRank = (practice: number, targets: number[]) => targets.filter(n => practice >= n).length;
// Early lives keep their original rewards. Later lives still help, but cannot
// make repeated low-level resets an exponentially accelerating pearl faucet.
export const rebirthExperience = (count: number) => .25 * (Math.min(20, count) + Math.sqrt(Math.max(0, count - 20)));
export const rebirthMemory = (count: number) => 1 + .025 * Math.sqrt(Math.max(0, count));
export const evasionRating = (raw: number) => raw <= .5 ? Math.max(0, raw) : .5 + .4 * (raw - .5) / (.4 + raw - .5);
/** v27.71 기민을 뺀 나머지 회피 소스(패시브·장비·연구·직업)의 합산 상한. 기민으로 쌓은 회피는 이 위에 그대로 더해집니다. */
export const EVASION_SOURCE_CAP = .6;
export const evasionRaw = (dex: number, others: number) => Math.max(0, dex) + Math.min(EVASION_SOURCE_CAP, others);

// 무릉도장: 깊을수록 한 층의 가치가 커집니다. 5의 배수 층은 3배.
export const abyssPearls = (depth: number) => (1 + Math.floor(depth / 10)) * (depth % 5 === 0 ? 3 : 1);
/** 처음 돌파할 때 SP 1을 주는 깊이. SP는 극히 드문 자원이므로 이정표 수를 적게 유지합니다. */
export const ABYSS_SP_MILESTONES = [10, 25, 50, 100];
export const nextAbyssMilestone = (best: number) => ABYSS_SP_MILESTONES.find(n => n > best);

/** v25.8 무릉도장 10층마다 첫 돌파 보너스 세계석(층 수만큼). */
export const abyssFloorBonus = (depth: number) => depth % 10 === 0 ? depth : 0;
/** v25.8 윤회 칭호: 환생 횟수로 얻는 영구 칭호. 랭킹·채팅·전투 화면에 이름과 함께 표시됩니다. */
export const REBIRTH_TITLES: { rebirths: number; title: string }[] = [
    // v3.190 칭호마다 이름에 어울리는 그림(이모지)을 앞에 둡니다(치장 화면 · 이름 옆 · 순위표 모두 같은 글자).
    { rebirths: 5, title: '🔁 되돌아온 모험가' }, { rebirths: 10, title: '🌀 윤회의 여행자' }, { rebirths: 20, title: '⚡ 운명을 거스른 자' }, { rebirths: 30, title: '🌊 심연을 건넌 자' }, { rebirths: 50, title: '♾ 영원의 모험가' },
];
export const rebirthTitle = (rebirths: number) => [...REBIRTH_TITLES].reverse().find(x => rebirths >= x.rebirths)?.title || '';
