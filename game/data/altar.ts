/**
 * v27.43 제단. 모든 모험가가 골드·세계석·정수를 바쳐 함께 채우는 서버 공용 콘텐츠입니다.
 * - 바친 만큼 기여도가 오르고, 이번 주 기여 순위에 이름(또는 익명)이 올라갑니다.
 * - 바칠 때 고른 게이지(축복 셋, 신 소환 하나)가 차고, 가득 차면 서버 전체에 축복(일시 이벤트)이 열리거나 신이 깨어납니다.
 * - 신을 가장 먼저 쓰러뜨린 모험가가 신의 자리에 앉고, 그동안 다른 모험가가 바치는 재화의 일부(몫)를 거둘 수 있습니다.
 *   다음에 깨어나는 신은 그 자리의 주인을 본뜬 모습이라, 더 강한 모험가가 자리를 빼앗아 갑니다.
 * 서버 부하: 게임 틱은 제단을 전혀 읽지 않습니다. 축복은 기존 서버 이벤트처럼 30초 캐시로만 읽고,
 * 제단 화면도 인스턴스마다 15초 캐시를 씁니다. 쓰기는 바치기·도전·거두기 버튼에서만 일어납니다.
 */
export const ALTAR = {
    /** 기여도 환산: 골드 1,000 = 1, 세계석 1 = 50, 정수 1 = 5. */
    goldPerPoint: 1000, pearlPoints: 50, essencePoints: 5,
    /** 한 번에 바칠 수 있는 최소·최대. 최대는 실수와 정수 넘침을 막는 값입니다. */
    minPoints: 1, maxGold: 1e12, maxPearls: 100_000, maxEssence: 1_000_000,
    /** 같은 계정의 바치기 간격(서버 메모리 속도 제한). */
    offerCooldownMs: 3000,
    /** 신의 자리 주인이 거두는 몫: 다른 모험가가 바친 재화의 10%. 자리가 바뀌면 거두지 않은 몫은 사라집니다. */
    titheRate: .1,
    /** 신 소환에 드는 기여도, 신이 머무는 시간, 모험가별 도전 간격. */
    godCost: 30_000, godLifetimeMs: 24 * 3600_000, challengeCooldownMs: 10 * 60_000,
    /** 신과의 전투 턴 상한. 무릉도장 보스전에는 턴 제한이 없어 결투(80턴)보다 넉넉히 둡니다. */
    godMaxTurns: 1000,
    /** 축복 시간은 쌓이지만 지금부터 최대 12시간까지만. */
    blessingCapMs: 12 * 3600_000,
    /** 순위표 길이와 화면 캐시. */
    boardSize: 20, cacheMs: 15_000,
    /** 처음 깨어나는 신(자리 주인이 없을 때): 무릉도장 depth층 보스(무공)와 같은 능력치·기술. */
    firstGod: { name: '검은 마법사', depth: 50 },
    /** 자리 주인을 본뜬 신: 주인의 능력치에 체력 ×2, 공격·마법 ×1.15(신격). */
    godhood: { hp: 2, attack: 1.15 },
} as const;

export type BlessingId = 'gold' | 'mimic' | 'exp';
export type AltarGaugeId = BlessingId | 'god';
/** 축복: 게이지가 차면 서버 전체에 hours시간 동안 열립니다. 배율은 서버 이벤트와 곱해집니다. */
export const BLESSINGS: { id: BlessingId; name: string; desc: string; cost: number; hours: number; effect: { gold?: number; mimic?: number; exp?: number } }[] = [
    { id: 'gold', name: '풍요의 축복', desc: '모든 모험가의 골드 획득 ×2', cost: 3000, hours: 1, effect: { gold: 2 } },
    { id: 'mimic', name: '까미의 축복', desc: '숙련의 까미 출현 ×3', cost: 3000, hours: 1, effect: { mimic: 3 } },
    { id: 'exp', name: '성장의 축복', desc: '모든 모험가의 경험치 ×1.5', cost: 4000, hours: 1, effect: { exp: 1.5 } },
];
export const GAUGE_IDS: AltarGaugeId[] = [...BLESSINGS.map(b => b.id), 'god'];
export const gaugeCost = (id: AltarGaugeId) => id === 'god' ? ALTAR.godCost : BLESSINGS.find(b => b.id === id)!.cost;

export type Offering = { gold: number; pearls: number; essence: number };
/** 바친 재화의 기여도. 골드는 1,000 단위로 내림합니다. */
export const offeringPoints = (o: Offering) => Math.floor(o.gold / ALTAR.goldPerPoint) + o.pearls * ALTAR.pearlPoints + o.essence * ALTAR.essencePoints;
/** 신의 자리 주인 몫(내림). */
export const tithe = (o: Offering): Offering => ({ gold: Math.floor(o.gold * ALTAR.titheRate), pearls: Math.floor(o.pearls * ALTAR.titheRate), essence: Math.floor(o.essence * ALTAR.titheRate) });

/** 제단 화면 정보(API 응답). */
export type AltarInfo = {
    week: string;
    gauges: { id: AltarGaugeId; name: string; desc: string; points: number; cost: number; until: number }[];
    god: { gen: number; alive: boolean; name: string; level: number; power: number; until: number; mine: boolean } | null;
    throne: { id: string; name: string; since: number; mine: boolean; tithe?: Offering } | null;
    totals: Offering & { points: number };
    board: { rank: number; name: string; points: number; anonymous: boolean; self: boolean }[];
    me: { points: number; rank: number; anonymous: boolean; challengeAt: number };
};

/** 받침에 맞는 조사(이/가, 을/를, 은/는, 과/와). 한글이 아니면 받침 없음으로 봅니다. */
export function josa(word: string, pair: '이가' | '을를' | '은는' | '과와') {
    const c = word.charCodeAt(word.length - 1), last = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0;
    return word + (last ? pair[0] : pair[1]);
}
