/**
 * v3.212 주화 증권거래소 시세 · 거래(서버 전용 계산). 수치와 종목은 data/market.ts, 기획은 docs/stock-market-plan.md.
 *
 * - 개인 시장: 시세는 서버 키(setMarketKey)와 계좌 시드(State.market.seed)로만 만들 수 있어, 세이브를 받은 화면도 미래 시세를 계산하지 못합니다.
 * - 시세는 저장하지 않습니다. 틱 t의 가격은 t − warm 틱부터 평균에서 시작한 평균 회귀 과정(logP ← λ · logP + σ · ε − σ²/2)을 돌려 구하므로
 *   어느 서버 인스턴스에서 계산해도 같습니다. 화면 코드는 이 파일을 가져가지 않습니다(data/market.ts만).
 */
import type { State } from '../types';
import { MARKET, STOCKS, stockById, marketTick, buyCost, sellGain, marketCost, marketTradesToday, type MarketFeed } from '../data/market';
import { dayKey } from '../data/time';
import { addLog } from './state';
import type { ActionHandlers } from './actions/types';

let marketKey = 'tidebound-local-market-key';
/** 서버가 시작할 때 한 번 넣습니다(server/hacks.ts의 침투 작전 키에서 만듭니다). */
export function setMarketKey(key: string) { if (key) marketKey = key; }

/** 53비트 문자열 해시(cyrb53). */
function hash(text: string) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return [h1 >>> 0, h2 >>> 0] as const;
}
/** 32비트 섞기(정수 둘 → 0 이상 1 미만). 틱마다 문자열을 만들지 않으려고 씁니다. */
function unit(a: number, b: number) {
    let x = (a ^ Math.imul(b, 0x9e3779b1)) >>> 0;
    x = Math.imul(x ^ x >>> 16, 0x21f0aaad); x = Math.imul(x ^ x >>> 15, 0x735a2d97); x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
}
type Stream = readonly [number, number];
const streamOf = (seed: number, stock: string, salt = ''): Stream => hash(`${marketKey}:${seed}:${stock}:${salt}`);
const draw = (st: Stream, tick: number, k: number) => unit(st[0] ^ Math.imul(tick, 0x85ebca6b) ^ k, st[1] + tick);
/** 틱 tick의 충격(로그): 정규분포(Box-Muller, ±3에서 자름) × σ, 고위험 종목은 급등락을 더합니다. */
function shock(st: Stream, def: (typeof STOCKS)[number], tick: number) {
    const u1 = Math.max(1e-9, draw(st, tick, 1)), u2 = draw(st, tick, 2);
    const z = Math.max(-3, Math.min(3, Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)));
    let e = z * def.sigma;
    if (def.jump && draw(st, tick, 3) < def.jump.chance) e += (draw(st, tick, 4) < .5 ? -1 : 1) * def.jump.size * (.6 + .8 * draw(st, tick, 5));
    return e;
}
const toPrice = (base: number, logP: number) => Math.max(.1, Math.round(base * Math.min(MARKET.ceil, Math.max(MARKET.floor, Math.exp(logP))) * 10) / 10);
/** 충격의 분산(급등락 포함). 볼록성 보정(−분산/2)과, 그 보정이 옮긴 평균을 되돌리는 데 씁니다. 급등락 폭 배수(.6 + .8u)²의 평균은 약 1.053. */
const variance = (def: (typeof STOCKS)[number]) => def.sigma ** 2 + (def.jump ? def.jump.chance * def.jump.size ** 2 * 1.053 : 0);
/** 시작점을 맞추는 묶음 크기(틱). 같은 묶음의 틱은 늘 같은 시작점(묶음 첫 틱 − warm)에서 계산해, 차트와 체결 가격이 한 푼도 다르지 않게 합니다. */
const BLOCK = 144;
/** 한 종목의 from~to 틱 가격(0.1주화 단위). */
export function stockSeries(seed: number, stockId: string, from: number, to: number) {
    const def = stockById(stockId);
    if (!def || to < from) return [];
    // 보정(−분산/2)은 가격 비율을 공정하게 하고, 그 때문에 내려간 평균(drift / (1 − λ))은 표시 가격에서 되돌려 기준가 주변에 둡니다.
    const st = streamOf(seed, def.id), out: number[] = [], drift = -variance(def) / 2, center = drift / (1 - MARKET.lambda);
    for (let block = Math.floor(from / BLOCK) * BLOCK; block <= to; block += BLOCK) {
        let x = center;
        for (let t = block - MARKET.warm, end = Math.min(to, block + BLOCK - 1); t <= end; t++) {
            x = MARKET.lambda * x + shock(st, def, t) + drift;
            if (t >= from && t >= block) out.push(toPrice(def.base, x - center));
        }
    }
    return out;
}
export const stockPrice = (seed: number, stockId: string, tick: number) => stockSeries(seed, stockId, tick, tick)[0];
/** 틱 tick의 소문: 종목 하나와 다음 틱 충격의 방향(MARKET.rumorTruth 확률로 맞음). */
export function rumorAt(seed: number, tick: number) {
    const st = streamOf(seed, 'rumor'), def = STOCKS[Math.floor(draw(st, tick, 1) * STOCKS.length)];
    const real = shock(streamOf(seed, def.id), def, tick + 1) > 0;
    return { stock: def.id, up: draw(st, tick, 2) < MARKET.rumorTruth ? real : !real };
}
/**
 * /api/game 응답에 얹는 시세 조각. known은 화면이 가진 '시드:마지막 틱'. 같은 시드에 지금 틱까지 있으면 null(보낼 것 없음).
 * 처음이거나 시드가 바뀌었으면(승천 뒤 새 계좌) 최근 MARKET.history 틱을 보냅니다.
 */
export function marketFeed(s: Pick<State, 'market'>, known: unknown, now: number): MarketFeed | null {
    const seed = s.market?.seed;
    if (!seed) return null;
    const tick = marketTick(now), [kSeed, kTick] = typeof known === 'string' ? known.split(':').map(Number) : [NaN, NaN];
    const same = kSeed === seed && Number.isInteger(kTick);
    if (same && kTick >= tick) return null;
    const from = Math.max(tick - MARKET.history + 1, same ? kTick + 1 : -Infinity);
    const columns = STOCKS.map(d => stockSeries(seed, d.id, from, tick));
    const prices = columns[0].map((_, i) => columns.map(c => c[i]));
    return { seed, tick, from, prices, rumor: rumorAt(seed, tick) };
}

const qtyOf = (value: unknown) => { const n = Number(value); if (!Number.isInteger(n) || n < 1 || n > 1e6) throw Error('수량은 1 이상의 정수로 적으세요.'); return n; };
function countTrade(m: NonNullable<State['market']>, day: string) {
    m.trades = (m.day === day ? m.trades || 0 : 0) + 1;
    m.day = day;
}
export const marketActions: ActionHandlers = {
    /** id: 'open'(계좌 개설) · 'buy:<종목>' · 'sell:<종목>', value는 수량. 체결 가격은 서버가 처리하는 순간의 틱 가격입니다. */
    market(s, { a, id, now, rng }) {
        if (id === 'open') {
            if (s.market) throw Error('이미 증권 계좌가 있습니다.');
            s.market = { seed: 1 + Math.floor(rng() * 2147483646), holdings: {} };
            addLog(s, '증권거래소 · 계좌를 열었습니다. 이 모험가만의 시세가 흐르기 시작합니다.', 'system');
            return;
        }
        const m = s.market;
        if (!m) throw Error('먼저 증권 계좌를 여세요.');
        const [side, stockId] = id.split(':'), def = stockById(stockId || '');
        if ((side !== 'buy' && side !== 'sell') || !def) throw Error('없는 종목입니다.');
        const day = dayKey(now);
        if (marketTradesToday(s, day) >= MARKET.tradesPerDay) throw Error(`거래는 하루 ${MARKET.tradesPerDay}번까지입니다(한국 시간 자정에 초기화).`);
        const qty = qtyOf(a.value), price = stockPrice(m.seed, def.id, marketTick(now)), held = m.holdings[def.id];
        if (side === 'buy') {
            const c = buyCost(price, qty);
            if (marketCost(s) + c.total > MARKET.maxCost) throw Error(`총 보유 원금은 ${MARKET.maxCost.toLocaleString()}주화까지입니다(지금 ${marketCost(s).toLocaleString()}).`);
            if ((s.dungeonCoins || 0) < c.total) throw Error(`던전 주화가 부족합니다 (필요 ${c.total.toLocaleString()}).`);
            s.dungeonCoins = (s.dungeonCoins || 0) - c.total;
            m.holdings[def.id] = { qty: (held?.qty || 0) + qty, cost: (held?.cost || 0) + c.total };
            countTrade(m, day);
            addLog(s, `증권거래소 · ${def.name} ${qty.toLocaleString()}주 매수 · ${price.toLocaleString()} · 주화 -${c.total.toLocaleString()} (수수료 ${c.fee})`, 'system');
            return;
        }
        if (!held || held.qty < qty) throw Error(`${def.name}을(를) ${qty.toLocaleString()}주 갖고 있지 않습니다(보유 ${(held?.qty || 0).toLocaleString()}주).`);
        const g = sellGain(price, qty), part = held.qty === qty ? held.cost : Math.round(held.cost * qty / held.qty), pnl = g.net - part;
        s.dungeonCoins = (s.dungeonCoins || 0) + g.net;
        if (held.qty === qty) delete m.holdings[def.id]; else m.holdings[def.id] = { qty: held.qty - qty, cost: held.cost - part };
        m.realized = (m.realized || 0) + pnl;
        countTrade(m, day);
        addLog(s, `증권거래소 · ${def.name} ${qty.toLocaleString()}주 매도 · ${price.toLocaleString()} · 주화 +${g.net.toLocaleString()} (수수료 ${g.fee}) · 손익 ${pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}`, pnl >= 0 ? 'reward' : 'system');
    },
};
