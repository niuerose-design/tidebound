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
    /** 기여도 환산: 골드 1,000 = 1, 세계석 1 = 50, 정수 1 = 3. v27.48 정수 5 → 3: 분해로 정수 1개를 얻을 때 포기하는 판매 골드가 Lv.45 전후 약 2,400~6,000이라 그 중간에 맞춤. */
    /** v3.17 세계석 50 → 500, 정수 3 → 30: 골드 수백억이 도는 시점에서 세계석·정수가 너무 저평가됐음(세계석 1 = 골드 50만, 정수 1 = 골드 3만 상당). */
    goldPerPoint: 1000, pearlPoints: 500, essencePoints: 30,
    /** 한 번에 바칠 수 있는 최소·최대. 최대는 실수와 정수 넘침을 막는 값입니다. */
    /** v3.16 축복 4~6단계(수천억~조 단위)를 한 번에 바칠 수 있게 골드 상한 1조 → 10조. */
    minPoints: 1, maxGold: 1e13, maxPearls: 100_000, maxEssence: 1_000_000,
    /** 같은 계정의 바치기 간격(서버 메모리 속도 제한). */
    offerCooldownMs: 3000,
    /** 신의 자리 주인이 거두는 몫: 다른 모험가가 바친 재화의 10%. 자리가 바뀌면 거두지 않은 몫은 사라집니다. */
    titheRate: .1,
    /** 신 소환에 드는 기여도, 신이 머무는 시간, 모험가별 도전 간격. */
    /** v27.48 30,000 → 10,000(골드 1,000만). */
    /** v27.91 월드보스가 생기면서 신 소환은 훨씬 비싸졌습니다(10,000 → 40,000). */
    godCost: 40_000, godLifetimeMs: 24 * 3600_000, challengeCooldownMs: 10 * 60_000,
    /** 신과의 전투 턴 상한. 무릉도장 보스전에는 턴 제한이 없어 결투(80턴)보다 넉넉히 둡니다. */
    godMaxTurns: 1000,
    /** 축복 시간은 쌓이지만 지금부터 최대 12시간까지만. */
    blessingCapMs: 12 * 3600_000,
    /** 순위표 길이와 화면 캐시. */
    boardSize: 20, cacheMs: 15_000,
    /** 처음 깨어나는 신(자리 주인이 없을 때): 무릉도장 depth층 보스(무공)와 같은 능력치·기술. */
    /** v27.54 신격: 공격·마법 ×attack, 방어 관통 penetration. 보통 모험가(체력 1만대·방어 1천대)는 한 방에 쓰러지고, 방어 특화만 몇 대 버팁니다. */
    // v3.188 무릉 1층 기준이 10만 · ×4 → 3만 · ×2로 내려가 신의 몸(9.3억 · 공격)을 지키도록 50층 → 59층(1.15^9 ≈ 3.5 · 1.08^9 ≈ 2.0으로 거의 같은 몸).
    firstGod: { name: '검은 마법사', depth: 59, attack: 5, penetration: .5 },
    /** v27.69 신의 자리 임기: 앉은 지 이만큼 지나면 자리와 쌓인 몫을 비웁니다(다음 신은 다시 처음 신). 깨어 있는 신은 남은 시간 동안 그대로. */
    throneTermMs: 7 * 24 * 3600_000,
} as const;

export type BlessingId = 'gold' | 'mimic' | 'exp' | 'nuri';
export type RaidId = 'balrog' | 'zakum' | 'horntail';
export type AltarGaugeId = BlessingId | 'god' | RaidId;
type BlessingEffect = { gold?: number; mimic?: number; exp?: number; nuri?: number };
/**
 * 축복: 게이지가 차면 서버 전체에 hours시간 동안 열립니다(1단계). 배율은 서버 이벤트와 곱해집니다.
 * v27.48 축복 단계: 진행 중에 게이지를 다시 채우면 단계가 오르고(최대 3단계) 시간도 hours만큼 늘어납니다.
 * 다음 단계 비용은 단계마다 ×LEVEL_STEP이라 3단계 유지는 비쌉니다. 축복이 끝나면 단계는 0으로 돌아갑니다.
 * v3.19 1·2·3단계 모두 유지 12시간(hours 12 = blessingCapMs): 열 때와 단계를 올릴 때마다 지금부터 12시간으로 맞춥니다.
 * 까미·누리는 숙련·경험치와 직결돼 다른 축복보다 비쌉니다.
 */
/**
 * v3.16 축복 4~6단계: 수백억 골드를 굴리는 고레벨 모험가의 싱크. 1~3단계는 그대로(×1.5), 4단계부터는 기여도 절대값
 * BLESSING_HIGH_COSTS(골드 3,000억 · 1조 · 3조 상당)이고 6단계 유지(연장)도 6단계 값입니다.
 */
/** v3.16 1~3단계 비용 상향: 기본 ×10, 단계 승수 1.5 → 2(4~6단계에 비해 너무 쌌음). */
export const BLESSING_MAX_LEVEL = 6, BLESSING_LEVEL_STEP = 2, BLESSING_HIGH_FROM = 3;
export const BLESSING_HIGH_COSTS = [300_000_000, 1_000_000_000, 3_000_000_000];
/**
 * v3.16 상위 단계는 짧게: 4·5·6단계는 올린 순간부터 BLESSING_HIGH_MINUTES만큼만 유지되고(겹치지 않음, 다시 채우면 새로 셈)
 * 지나면 3단계로 내려와 그때부터 blessingCapMs(12시간) 동안 이어집니다(상위 단계를 올릴 때 전체 시간 = 그 단계 시간 + 12시간 보장).
 */
export const BLESSING_HIGH_MINUTES = [240, 120, 60];
/** 단계 n(1부터)에 오를 때 그 단계가 유지되는 시간(ms). 1~3단계는 hours, 4~6단계는 짧은 전용 시간. */
export const blessingLevelMs = (hours: number, level: number) => level > BLESSING_HIGH_FROM ? BLESSING_HIGH_MINUTES[Math.min(level - BLESSING_HIGH_FROM - 1, BLESSING_HIGH_MINUTES.length - 1)] * 60_000 : hours * 3600_000;
/** 지금 살아 있는 단계: 축복이 닫혔으면 0, 상위 단계 시간이 지났으면 3단계로. */
export const effectiveBlessingLevel = (g: { until: number; level?: number; high_until?: number } | undefined, now: number) => !g || g.until <= now ? 0 : Math.max(1, (g.high_until || 0) > now ? g.level || 1 : Math.min(g.level || 1, BLESSING_HIGH_FROM));
export const BLESSINGS: { id: BlessingId; name: string; cost: number; hours: number; levels: BlessingEffect[] }[] = [
    { id: 'gold', name: '풍요의 축복', cost: 12_000, hours: 12, levels: [{ gold: 2 }, { gold: 2.5 }, { gold: 3 }, { gold: 3.5 }, { gold: 4 }, { gold: 5 }] },
    { id: 'exp', name: '성장의 축복', cost: 15_000, hours: 12, levels: [{ exp: 1.5 }, { exp: 1.75 }, { exp: 2 }, { exp: 2.25 }, { exp: 2.5 }, { exp: 3 }] },
    { id: 'mimic', name: '까미의 축복', cost: 25_000, hours: 12, levels: [{ mimic: 3 }, { mimic: 4 }, { mimic: 5 }, { mimic: 6 }, { mimic: 7 }, { mimic: 8 }] },
    // v27.70 누리의 축복: 경험의 누리 출현 배율. 레벨 경험치와 직결돼 까미와 같은 값입니다.
    { id: 'nuri', name: '누리의 축복', cost: 25_000, hours: 12, levels: [{ nuri: 3 }, { nuri: 4 }, { nuri: 5 }, { nuri: 6 }, { nuri: 7 }, { nuri: 8 }] },
];
type Blessing = typeof BLESSINGS[number];
/** 단계별 효과(1부터). */
export const blessingEffect = (b: Blessing, level: number) => b.levels[Math.max(0, Math.min(BLESSING_MAX_LEVEL, level) - 1)];
/** 효과 설명. 예: 모든 모험가의 골드 획득 ×2.5 */
export function blessingDesc(b: Blessing, level = 1) {
    const e = blessingEffect(b, level);
    return e.gold ? `모든 모험가의 골드 획득 ×${e.gold}` : e.exp ? `모든 모험가의 경험치 ×${e.exp}` : e.nuri ? `경험의 누리 출현 ×${e.nuri}` : `숙련의 까미 출현 ×${e.mimic}`;
}
/** 지금 게이지를 한 번 채우는 비용. 닫혀 있으면 기본(1단계로 열림), 진행 중이면 다음 단계(3단계면 시간 연장) 비용. */
export const blessingCost = (b: Blessing, level: number, active: boolean) => {
    const step = active ? Math.min(level, BLESSING_MAX_LEVEL - 1) : 0;
    return step >= BLESSING_HIGH_FROM ? BLESSING_HIGH_COSTS[Math.min(step - BLESSING_HIGH_FROM, BLESSING_HIGH_COSTS.length - 1)] : Math.round(b.cost * Math.pow(BLESSING_LEVEL_STEP, step));
};
/**
 * v27.91 월드보스. 소환 게이지가 차면 서버 전체에 한 마리가 lifetimeHours 동안 나타나고(v27.93 발록 6 · 자쿰 12 · 혼테일 24시간, 격파 뒤 2시간 대기), 모든 모험가의 피해가 체력 하나에 누적됩니다(공유 체력).
 * 도전은 결투 엔진으로 maxTurns 안에서 한 번 계산하고(부하·렉 방지), 모험가마다 cooldown 간격으로 다시 때립니다.
 * 격파하면 그 보스를 한 번이라도 때린 모험가 전원이 다음 동기화 때 보상을 받고, 서버 전체에 축복이 열립니다. 마지막 일격을 넣은 모험가는 보너스를 더 받습니다.
 * 셋은 입문(0환생도 기여 가능) · 중급 · 상급 순으로 체력이 크게 뜁니다. 공격·방어는 완만하고 체력은 공유를 감안해 큽니다(수치는 밸런스용이라 화면에는 기준을 적지 않음).
 */
export type RaidDef = {
    id: RaidId; name: string; /** 전투 기술·외형을 빌리는 몬스터 id */ fish: string; level: number; cost: number; /** 머무는 시간 */ lifetimeHours: number;
    stats: { hp: number; attack: number; magic: number; defense: number; resist: number; speed: number; crit: number; accuracy: number; penetration: number; evasion: number };
    /** 참여자 보상(격파 뒤 다음 동기화 때) · 마지막 일격 보너스 · 축복 시간. */
    reward: { gold: number; pearls: number; sp: number }; slayer: { pearls: number; sp: number }; blessings: BlessingId[]; blessingHours: number;
};
/** v27.93 머무는 시간은 보스마다(lifetimeHours), 격파 뒤 다음 소환까지 respawnMs 대기. */
export const RAID = { cooldownMs: 10 * 60_000, maxTurns: 80, boardSize: 10, respawnMs: 2 * 3600_000, /** v3.84 순위에서 보는 최근 도전 전투 기록 줄 수(끝에서부터). */ logLines: 160 } as const;
/** v3.84 월드보스 도전 한 번의 요약. 피해 순위에서 다른 모험가도 이 모험가가 얼마나 · 어떻게 넣었는지 봅니다. */
export type RaidHitSummary = { at: number; dealt: number; turns: number; died: boolean; job: string; power: number; sources: { label: string; value: number }[] };
/**
 * v3.83 방어 재조정: 체력은 그대로 두고, 목표 몸의 중앙 직업이 한 번 도전(80턴)에 깎는 양으로 필요한 도전 횟수를 맞춥니다
 * (scripts/check-tier5.mjs --only raid): 발록 환생 0급 약 10번 · 자쿰 환생 50급 약 100번 · 혼테일 환생 100급 약 1,500번(방어 1,000, 운영 결정).
 * 예전 혼테일 방어 15,000은 엔드 몬스터(100~150)의 100배라 직접 피해가 거의 들어가지 않았습니다. 지속 피해(체력 비례)는 그대로입니다.
 * (2026-10-08 결정, docs/boss-plan.md §8.3) 체력은 그대로 두고 목표를 기준 몸(scripts/lib/reference-body.mjs) 실측으로 다시 적음: 발록 R0 10번 · 자쿰 R50 2번 · 혼테일 R100 12번
 * (빌림 / 자기 계열 1.0 / 3.8번 · 8.5 / 17번의 중간값, scripts/check-bosses.mjs --only raid). 체력은 지렛대가 아닙니다(지속 피해 체력 비례분이 체력에 함께 커짐).
 * 월드보스는 여러 모험가가 한 몸을 함께 깎는 공유 콘텐츠라 개인 몸 기준(빌림)을 그대로 쓰지 않는 특수 기준입니다.
 */
export const RAIDS: RaidDef[] = [
    { id: 'balrog', name: '발록', fish: 'magmaKraken', level: 30, cost: 2_000, lifetimeHours: 6, stats: { hp: 500_000, attack: 90, magic: 90, defense: 60, resist: 60, speed: 14, crit: .1, accuracy: 1, penetration: .15, evasion: .05 },
        reward: { gold: 30_000, pearls: 2, sp: 0 }, slayer: { pearls: 3, sp: 0 }, blessings: ['gold', 'exp'], blessingHours: 1 },
    { id: 'zakum', name: '자쿰', fish: 'ventColossus', level: 70, cost: 5_000, lifetimeHours: 12, stats: { hp: 60_000_000, attack: 4_000, magic: 4_000, defense: 350, resist: 350, speed: 30, crit: .12, accuracy: 1.05, penetration: .25, evasion: .08 },
        reward: { gold: 500_000, pearls: 6, sp: 1 }, slayer: { pearls: 6, sp: 0 }, blessings: ['gold', 'exp'], blessingHours: 2 },
    { id: 'horntail', name: '혼테일', fish: 'abyssSovereign', level: 120, cost: 12_000, lifetimeHours: 24, stats: { hp: 2_000_000_000, attack: 60_000, magic: 60_000, defense: 1_000, resist: 1_000, speed: 50, crit: .14, accuracy: 1.08, penetration: .3, evasion: .1 },
        reward: { gold: 5_000_000, pearls: 15, sp: 2 }, slayer: { pearls: 15, sp: 1 }, blessings: ['gold', 'exp', 'mimic', 'nuri'], blessingHours: 3 },
];
export const raidById = (id: string) => RAIDS.find(r => r.id === id);
export const isRaidGauge = (id: string): id is RaidId => RAIDS.some(r => r.id === id);
/** 소환 게이지(신 + 월드보스 셋)와 축복 게이지. 화면의 축복/소환 탭이 이 둘로 나뉩니다. */
export const SUMMON_GAUGE_IDS: AltarGaugeId[] = ['god', ...RAIDS.map(r => r.id)];
export const GAUGE_IDS: AltarGaugeId[] = [...BLESSINGS.map(b => b.id), ...SUMMON_GAUGE_IDS];
/** v3.16 단계 점핑: 지금 live 단계(0 = 닫힘)에서 target 단계까지 한 번에 가는 총 기여도(단계마다 그때의 비용을 더함). */
export const blessingJumpCost = (id: BlessingId, live: number, target: number) => { let sum = 0; for (let lv = live; lv < Math.min(target, BLESSING_MAX_LEVEL); lv++) sum += gaugeCost(id, lv, lv > 0); return target <= live ? gaugeCost(id, live, live > 0) : sum; };
export const gaugeCost = (id: AltarGaugeId, level = 0, active = false) => id === 'god' ? ALTAR.godCost : isRaidGauge(id) ? raidById(id)!.cost : blessingCost(BLESSINGS.find(b => b.id === id)!, level, active);
export const gaugeName = (id: AltarGaugeId) => id === 'god' ? '신 소환' : isRaidGauge(id) ? `${raidById(id)!.name} 소환` : BLESSINGS.find(b => b.id === id)!.name;

export type Offering = { gold: number; pearls: number; essence: number };
/** 바친 재화의 기여도. 골드는 1,000 단위로 내림합니다. */
export const offeringPoints = (o: Offering) => Math.floor(o.gold / ALTAR.goldPerPoint) + o.pearls * ALTAR.pearlPoints + o.essence * ALTAR.essencePoints;
/** 신의 자리 주인 몫(내림). */
export const tithe = (o: Offering): Offering => ({ gold: Math.floor(o.gold * ALTAR.titheRate), pearls: Math.floor(o.pearls * ALTAR.titheRate), essence: Math.floor(o.essence * ALTAR.titheRate) });

/** 제단 화면 정보(API 응답). */
export type AltarInfo = {
    week: string;
    gauges: { id: AltarGaugeId; name: string; desc: string; points: number; cost: number; until: number; level: number; next: string }[];
    /** v27.70 hp: 신의 최대 체력, attack: 공격(신격 포함). */
    god: { gen: number; alive: boolean; name: string; level: number; power: number; hp: number; attack: number; until: number; mine: boolean } | null;
    /** v27.70 power·hp: 탄핵 상대(자리 주인을 본뜬 신)의 전투력·체력. */
    throne: { id: string; name: string; since: number; mine: boolean; power: number; hp: number; tithe?: Offering } | null;
    totals: Offering & { points: number };
    board: { rank: number; name: string; points: number; anonymous: boolean; self: boolean }[];
    /** v3.19 누적 기여 순위(모든 주 합계)와 내 누적 기여·순위. */
    allTime?: { rank: number; name: string; points: number; anonymous: boolean; self: boolean }[];
    total?: { points: number; rank: number };
    me: { points: number; rank: number; anonymous: boolean; challengeAt: number; /** v27.91 월드보스 마지막 도전 시각 */ raidAt: number; /** v3.22 보스별 마지막 도전 시각 */ raidAtBy: Record<string, number> };
    /** v27.91 지금 나타난(또는 방금 격파된) 월드보스. 없으면 null. */
    /** v3.22 보스마다 따로: 지금 나타났거나 방금 격파된 월드보스들(발록·자쿰·혼테일 순). */
    raids: AltarRaidInfo[];
};
export type AltarRaidInfo = {
    id: RaidId; gen: number; name: string; level: number; alive: boolean; slain: boolean; hp: number; hpMax: number; attack: number; defense: number; power: number; until: number;
    /** 참여자 수와 마지막 일격 */ participants: number; slayer: string;
    /** 피해 순위(상위 RAID.boardSize)와 내 기록 */ board: { rank: number; name: string; dealt: number; hits: number; self: boolean; /** v3.84 가장 최근 도전 요약 */ last?: RaidHitSummary }[]; me: { dealt: number; hits: number; rank: number };
    reward: RaidDef['reward']; slayerBonus: RaidDef['slayer'];
};

/** 받침에 맞는 조사(이/가, 을/를, 은/는, 과/와). 한글이 아니면 받침 없음으로 봅니다. */
export function josa(word: string, pair: '이가' | '을를' | '은는' | '과와') {
    const c = word.charCodeAt(word.length - 1), last = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0;
    return word + (last ? pair[0] : pair[1]);
}

/** v27.44 전투 화면 제단 알림용 요약. 서버가 동기화 때 공용 캐시(15초)로 State.altarStatus에 적습니다(추가 질의 없음). */
export type AltarStatus = {
    blessings: { id: BlessingId; name: string; desc: string; until: number; level: number }[];
    god: { gen: number; name: string; until: number } | null;
    /** v3.22 살아 있는 월드보스들(알림용, 체력 비율 pct 0~1). 이 값이 없는 옛 요약은 다음 동기화 때 서버가 새로 적습니다. */
    raids?: { id: string; gen: number; name: string; until: number; pct: number }[];
    throne: string;
    gauges: { id: AltarGaugeId; name: string; pct: number }[];
};
