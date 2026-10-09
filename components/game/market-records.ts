'use client';
/**
 * v3.213 증권거래소 시세 · 거래 기록: 전투 기록(battle-records.ts)처럼 이 브라우저의 localStorage에만 남깁니다(서버 저장 · 전송 없음).
 * - 시세(공유 시장이라 이 브라우저의 모든 모험가가 같이 씀): 서버가 동기화 응답에 얹어 준 조각(MarketFeed)을 MARKET.keep 틱(3일)까지 쌓습니다. 받은 틱은 다시 받지 않습니다.
 * - 거래 내역(모험가 이름마다): 보유 수량이 바뀐 것을 보고 그때 시세로 적습니다(보기용, 체결 판정은 서버 세이브).
 * - 거래소 화면을 열어 둔 동안만 동기화에 marketKnown을 붙입니다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { State } from '@/game/types';
import { MARKET, STOCKS, type MarketFeed } from '@/game/data/market';

export type MarketTrade = { at: number; stock: string; qty: number; price: number };
/** 장 상태(서버 응답의 marketStatus, 저장하지 않음): 폐장 · 서킷브레이커 끝 시각 · 사유. */
export type MarketStatus = { closed: boolean; haltUntil: number; reason: string };
export type MarketStore = { from: number; tick: number; prices: number[][]; rumor?: MarketFeed['rumor'] };
type Journal = { held?: Record<string, number>; trades: MarketTrade[] };
const KEY = 'tidebound.market', JOURNAL_KEY = 'tidebound.marketTrades:', SAVE_MS = 30_000, TRADES_KEEP = 50;
let store: MarketStore | null = null, journal: Journal = { trades: [] }, owner = '', timer: ReturnType<typeof setTimeout> | undefined, watchers = 0, loaded = false;
const subs = new Set<() => void>();

const save = () => {
    timer = undefined;
    try { if (store) localStorage.setItem(KEY, JSON.stringify(store)); if (owner) localStorage.setItem(JOURNAL_KEY + owner, JSON.stringify(journal)); } catch { /* 저장소 없음 · 가득 참: 이번 화면에서만 */ }
};
const flush = () => { if (timer) { clearTimeout(timer); save(); } };
function loadPrices() {
    if (loaded) return;
    loaded = true;
    try { const raw = localStorage.getItem(KEY), parsed = raw ? JSON.parse(raw) as MarketStore : null; if (parsed && Array.isArray(parsed.prices) && Number.isInteger(parsed.tick)) store = parsed; } catch { /* 깨진 값: 새로 시작 */ }
}
function loadJournal(name: string) {
    if (owner === name) return;
    flush();
    owner = name; journal = { trades: [] };
    try { const raw = localStorage.getItem(JOURNAL_KEY + name), parsed = raw ? JSON.parse(raw) as Journal : null; if (parsed && Array.isArray(parsed.trades)) journal = parsed; } catch { /* 깨진 값: 새로 시작 */ }
}
let status: MarketStatus | null = null;
let snapshot: { market: MarketStore | null; journal: Journal; status: MarketStatus | null } = { market: null, journal, status };
const changed = () => { snapshot = { market: store, journal, status }; subs.forEach(fn => fn()); timer ??= setTimeout(save, SAVE_MS); };
if (typeof window !== 'undefined') { window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); }); }

/** 동기화 요청에 붙일 값: 거래소 화면을 볼 때만 가진 마지막 틱(없으면 빈 문자열 = 하루치 요청). 안 볼 때는 undefined라 서버가 시세를 붙이지 않습니다. */
export function marketKnown() {
    if (!watchers) return undefined;
    loadPrices();
    return store ? String(store.tick) : '';
}
/** 서버가 보낸 시세 조각을 쌓습니다. 사이가 비면(오래 안 봄) 받은 조각부터 다시 시작합니다. */
export function ingestMarket(feed: MarketFeed) {
    loadPrices();
    const rows = feed.prices;
    if (!rows.length) return;
    let prices = rows, from = feed.from;
    if (store && feed.from <= store.tick + 1 && feed.from >= store.from) { prices = [...store.prices.slice(0, feed.from - store.from), ...rows]; from = store.from; }
    const cut = Math.max(0, prices.length - MARKET.keep);
    store = { prices: prices.slice(cut), from: from + cut, tick: feed.tick, rumor: feed.rumor };
    changed();
}
/** 장 상태를 바꿉니다(같으면 그대로). */
export function ingestMarketStatus(next: MarketStatus) {
    if (status && status.closed === next.closed && status.haltUntil === next.haltUntil && status.reason === next.reason) return;
    status = next; snapshot = { market: store, journal, status }; subs.forEach(fn => fn());
}
/** 지금 시세(종목 id → 가격). 시세를 아직 못 받았으면 빈 객체. */
export const currentPrices = (x: MarketStore | null): Record<string, number> => { const row = x?.prices.at(-1); return row ? Object.fromEntries(STOCKS.map((d, i) => [d.id, row[i]])) : {}; };
/** 보유 수량이 바뀌었으면 이 모험가의 거래 내역에 적습니다(처음 보면 지금 수량만 기억). */
function noteHoldings(s: State) {
    loadJournal(s.name);
    const now = Object.fromEntries(STOCKS.map(d => [d.id, s.market?.holdings[d.id]?.qty || 0])), before = journal.held, price = currentPrices(store);
    if (before && STOCKS.every(d => before[d.id] === now[d.id])) return;
    const fresh = before ? STOCKS.filter(d => before[d.id] !== now[d.id] && price[d.id]).map(d => ({ at: Date.now(), stock: d.id, qty: now[d.id] - (before[d.id] || 0), price: price[d.id] })) : [];
    journal = { held: now, trades: [...fresh.reverse(), ...journal.trades].slice(0, TRADES_KEEP) };
    changed();
}
const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
const read = () => snapshot;
const EMPTY = { market: null, journal: { trades: [] }, status: null };
/** 거래소 화면: 보는 동안 동기화에 시세를 요청하고, 열자마자 한 번 동기화합니다. */
export function useMarket(s: State, sync: () => void) {
    useEffect(() => { watchers++; loadPrices(); changed(); sync(); return () => { watchers--; }; }, [sync]);
    useEffect(() => { noteHoldings(s); }, [s]);
    return useSyncExternalStore(subscribe, read, () => EMPTY);
}
/** 이 기기의 거래 내역 지우기. */
export function clearMarketTrades() { journal = { ...journal, trades: [] }; changed(); }
