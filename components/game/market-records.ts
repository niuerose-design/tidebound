'use client';
/**
 * v3.212 증권거래소 시세 · 거래 기록: 전투 기록(battle-records.ts)처럼 이 브라우저의 localStorage에만 남깁니다(서버 저장 · 전송 없음).
 * - 시세: 서버가 동기화 응답에 얹어 준 조각(MarketFeed)을 쌓아 MARKET.keep 틱(3일)까지 둡니다. 받은 틱은 다시 받지 않습니다.
 * - 거래 내역: 보유 수량이 바뀐 것을 보고 그때 시세로 적습니다(보기용, 체결 판정은 서버 세이브).
 * - 계좌 시드마다 따로 둡니다(승천하면 새 계좌라 새 기록). 거래소 화면을 열어 둔 동안만 동기화에 marketKnown을 붙입니다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { State } from '@/game/types';
import { MARKET, STOCKS, type MarketFeed } from '@/game/data/market';

export type MarketTrade = { at: number; stock: string; qty: number; price: number };
export type MarketStore = { seed: number; from: number; tick: number; prices: number[][]; rumor?: MarketFeed['rumor']; trades: MarketTrade[]; held?: Record<string, number> };
const KEY = 'tidebound.market:', SAVE_MS = 30_000, TRADES_KEEP = 50;
let store: MarketStore | null = null, timer: ReturnType<typeof setTimeout> | undefined, watchers = 0;
const subs = new Set<() => void>();

const save = () => { timer = undefined; if (!store) return; try { localStorage.setItem(KEY + store.seed, JSON.stringify(store)); } catch { /* 저장소 없음 · 가득 참: 이번 화면에서만 */ } };
const flush = () => { if (timer) { clearTimeout(timer); save(); } };
function load(seed: number) {
    if (store?.seed === seed) return store;
    flush();
    store = { seed, from: 0, tick: -1, prices: [], trades: [] };
    try { const raw = localStorage.getItem(KEY + seed), parsed = raw ? JSON.parse(raw) as MarketStore : null; if (parsed?.seed === seed && Array.isArray(parsed.prices) && Array.isArray(parsed.trades)) store = parsed; } catch { /* 깨진 값: 새로 시작 */ }
    return store;
}
const changed = () => { if (store) store = { ...store }; subs.forEach(fn => fn()); timer ??= setTimeout(save, SAVE_MS); };
if (typeof window !== 'undefined') { window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); }); }

/** 동기화 요청에 붙일 값: 거래소 화면을 볼 때만 '시드:마지막 틱'(없으면 빈 문자열 = 하루치 요청). 안 볼 때는 undefined라 서버가 시세를 계산하지 않습니다. */
export function marketKnown(s: State | null) {
    const seed = s?.market?.seed;
    if (!watchers || !seed) return undefined;
    const x = load(seed);
    return x.tick >= 0 ? `${seed}:${x.tick}` : '';
}
/** 서버가 보낸 시세 조각을 쌓습니다. 사이가 비면(오래 안 봄) 받은 조각부터 다시 시작합니다. */
export function ingestMarket(feed: MarketFeed) {
    const x = load(feed.seed), rows = feed.prices;
    if (!rows.length) return;
    let prices = x.prices, from = x.from;
    if (x.tick < 0 || feed.from > x.tick + 1 || feed.from < x.from) { prices = rows; from = feed.from; }
    else prices = [...prices.slice(0, feed.from - x.from), ...rows];
    const cut = Math.max(0, prices.length - MARKET.keep);
    store = { ...x, prices: prices.slice(cut), from: from + cut, tick: feed.tick, rumor: feed.rumor };
    changed();
}
/** 지금 시세(종목 id → 가격). 시세를 아직 못 받았으면 빈 객체. */
export const currentPrices = (x: MarketStore | null): Record<string, number> => { const row = x?.prices.at(-1); return row ? Object.fromEntries(STOCKS.map((d, i) => [d.id, row[i]])) : {}; };
/** 보유 수량이 바뀌었으면 거래 내역에 적습니다(처음 보는 계좌는 지금 수량만 기억). */
function noteHoldings(s: State) {
    const m = s.market;
    if (!m || !store || store.seed !== m.seed) return;
    const now = Object.fromEntries(STOCKS.map(d => [d.id, m.holdings[d.id]?.qty || 0])), before = store.held, price = currentPrices(store);
    if (before && STOCKS.every(d => before[d.id] === now[d.id])) return;
    const fresh = before ? STOCKS.filter(d => before[d.id] !== now[d.id] && price[d.id]).map(d => ({ at: Date.now(), stock: d.id, qty: now[d.id] - (before[d.id] || 0), price: price[d.id] })) : [];
    store = { ...store, held: now, trades: [...fresh.reverse(), ...store.trades].slice(0, TRADES_KEEP) };
    changed();
}
const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
const read = () => store;
/** 거래소 화면: 보는 동안 동기화에 시세를 요청하고, 열자마자 한 번 동기화합니다. */
export function useMarket(s: State, sync: () => void) {
    const seed = s.market?.seed;
    useEffect(() => { watchers++; return () => { watchers--; }; }, []);
    useEffect(() => { if (seed) { load(seed); changed(); sync(); } }, [seed, sync]);
    useEffect(() => { noteHoldings(s); }, [s]);
    const x = useSyncExternalStore(subscribe, read, () => null);
    return x && x.seed === seed ? x : null;
}
/** 이 기기의 거래 내역 지우기. */
export function clearMarketTrades() { if (!store) return; store = { ...store, trades: [] }; changed(); }
