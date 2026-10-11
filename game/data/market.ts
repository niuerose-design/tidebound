/**
 * v3.213 주화 증권거래소(docs/stock-market-plan.md): 던전 주화로 가상 종목을 사고팔아 손해 · 이익을 봅니다.
 * 공유 시장: 모든 모험가가 같은 시세를 봅니다. 시세는 저장하지 않고 서버가 계산식으로 구합니다(systems/market.ts).
 * 화면은 이 파일(종목 · 수치 · 수수료 계산)만 씁니다. 시세 계산(서버 키)은 가져가지 않습니다.
 */
import type { State } from '../types';
import { jobById } from './classes';

/** 시세 한 칸(틱)의 길이. 시세 · 소문이 이 단위로 바뀝니다. */
export const MARKET_TICK_MS = 10 * 60_000;
export const MARKET = {
    /** 매수 · 매도 수수료(체결 금액의 비율, 최소 1주화). */
    fee: .01,
    /**
     * 평균 회귀 세기: logP(t) = λ · logP(t-1) + σ · ε(t) − σ²/2. 1에 가까울수록 천천히 기준가로 돌아갑니다(반감기 약 10일).
     * 빨리 돌아가면 '싸게 사서 하루 들기'가 수수료보다 크게 남아 주화를 찍어내는 곳이 됩니다(scripts/check-market.mjs).
     * −σ²/2는 로그 가격의 볼록성 보정입니다(없으면 아무 때나 사서 들고만 있어도 고위험 종목이 이득).
     */
    lambda: .9995,
    /** 시세 계산을 이만큼 앞 틱에서 0으로 시작합니다(λ^warm ≈ 1%라 시작점 영향이 사라짐). 가격 하나에 약 6ms. */
    warm: 9000,
    /** 화면에 처음 보내는 지난 시세 칸 수(하루). */
    history: 144,
    /** 화면이 쌓아 두는 지난 시세 칸 수(3일). */
    keep: 432,
    /** 가격 범위(기준가 배수). */
    floor: .2, ceil: 5,
    /** 시황 소문: 다음 틱 충격의 방향을 이 확률로 맞힙니다. */
    rumorTruth: .7,
} as const;

export type StockDef = {
    id: string; name: string; desc: string;
    /** 기준가(주화). 시세는 이 값 주변을 오갑니다. */
    base: number;
    /** 틱당 충격 세기. 하루 변동은 약 σ × 12, 기준가에서 벗어나는 폭(로그)은 약 σ × 32. */
    sigma: number;
    /** 고위험 종목: 틱마다 chance 확률로 ±size(로그) 급등락. */
    jump?: { chance: number; size: number };
    risk: '안정' | '보통' | '고위험';
};
export const STOCKS: StockDef[] = [
    { id: 'lith', name: '리스항구 해운', desc: '항구를 오가는 배편. 느리게 움직입니다.', base: 100, sigma: .0025, risk: '안정' },
    { id: 'henesys', name: '헤네시스 버섯농장', desc: '버섯 수확량에 따라 조금씩 오르내립니다.', base: 50, sigma: .0033, risk: '안정' },
    { id: 'perion', name: '페리온 광산', desc: '광맥 소식에 민감합니다.', base: 200, sigma: .0058, risk: '보통' },
    { id: 'ellinia', name: '엘리니아 마법학회', desc: '연구 성과가 나올 때마다 출렁입니다.', base: 150, sigma: .0075, risk: '보통' },
    { id: 'kerning', name: '커닝시티 상회', desc: '뒷골목 거래. 가끔 크게 튑니다.', base: 30, sigma: .01, jump: { chance: .003, size: .12 }, risk: '고위험' },
    { id: 'arcane', name: '아케인 리버 탐사', desc: '탐사대의 생사에 따라 급등락합니다.', base: 500, sigma: .012, jump: { chance: .003, size: .15 }, risk: '고위험' },
];
export const stockById = (id: string) => STOCKS.find(x => x.id === id);

/** 시황 소문 문장(종목별 오름 · 내림). */
export const RUMORS: Record<string, { up: string; down: string }> = {
    lith: { up: '대형 상선이 입항한다는 소문', down: '폭풍으로 배편이 끊긴다는 소문' },
    henesys: { up: '버섯 풍년이라는 소문', down: '주황버섯 병충해 소문' },
    perion: { up: '새 광맥을 찾았다는 소문', down: '갱도가 무너졌다는 소문' },
    ellinia: { up: '새 마법 연구가 성공했다는 소문', down: '실험실 폭발 소문' },
    kerning: { up: '큰 밀수품이 들어온다는 소문', down: '단속반이 뜬다는 소문' },
    arcane: { up: '탐사대가 보물을 찾았다는 소문', down: '탐사대와 연락이 끊겼다는 소문' },
};

export const rumorText = (stock: string, up: boolean) => RUMORS[stock]?.[up ? 'up' : 'down'] || '';
export const marketTick = (now: number) => Math.floor(now / MARKET_TICK_MS);
/** 수수료(최소 1주화). */
/** v3.231 scale: 직업 수수료 배율(트레이더 0.5). */
export const marketFee = (amount: number, scale = 1) => Math.max(1, Math.ceil(amount * MARKET.fee * scale));
/** 매수에 드는 주화(체결 금액 올림 + 수수료). */
export const buyCost = (price: number, qty: number, scale = 1) => { const gross = Math.ceil(price * qty); return { gross, fee: marketFee(gross, scale), total: gross + marketFee(gross, scale) }; };
/** 매도로 받는 주화(체결 금액 내림 − 수수료, 0 아래로는 안 감). */
export const sellGain = (price: number, qty: number, scale = 1) => { const gross = Math.floor(price * qty), fee = Math.min(gross, marketFee(gross, scale)); return { gross, fee, net: gross - fee }; };
/** v3.231 지금 직업의 수수료 배율(트레이더 계보 0.5). */
export const feeScaleOf = (s: Pick<State, 'job'>) => jobById(s.job)?.marketFeeScale ?? 1;
/** 총 보유 원금. */
export const marketCost = (s: Pick<State, 'market'>) => Object.values(s.market?.holdings || {}).reduce((a, h) => a + h.cost, 0);

/** 서버가 화면에 보내는 시세 조각(/api/game 응답의 market). prices[i]는 from + i 틱의 종목별 가격(STOCKS 순서). */
export type MarketFeed = {
    tick: number;
    from: number;
    prices: number[][];
    /** 지금 틱의 소문(다음 틱 방향). */
    rumor?: { stock: string; up: boolean };
};
