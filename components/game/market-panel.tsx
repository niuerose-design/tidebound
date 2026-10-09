'use client';
/**
 * v3.212 주화 증권거래소(공유 시장, docs/stock-market-plan.md): 상점 메뉴의 한 탭.
 * 시세는 모든 모험가가 같고, 서버가 계산해 동기화 응답에 얹어 줍니다. 차트 · 거래 내역은 이 기기에만 남습니다(market-records.ts).
 */
import { useCallback, useState } from 'react';
import { Coins, Landmark, Newspaper, Repeat, TrendingUp } from 'lucide-react';
import { MARKET, MARKET_TICK_MS, STOCKS, buyCost, sellGain, marketCost, marketTradesToday, rumorText, stockById, type StockDef } from '@/game/data/market';
import { dayKey } from '@/game/data/time';
import { Heading, format, useNow } from './shared';
import { useMarket, currentPrices, clearMarketTrades, type MarketStore, type MarketTrade } from './market-records';
import type { PanelProps } from './panel-props';

const signed = (n: number) => `${n > 0 ? '+' : ''}${format(Math.round(n))}`;
const pct = (n: number) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
/** 한국식 색: 오르면 빨강, 내리면 파랑. */
const tone = (n: number) => n > 0 ? 'mkt-up' : n < 0 ? 'mkt-down' : '';
const clock = (ms: number) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}분 ${String(t % 60).padStart(2, '0')}초`; };

function Spark({ values }: { values: number[] }) {
    if (values.length < 2) return <div className="mkt-spark mkt-spark-empty">시세를 모으는 중</div>;
    const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1, w = 240, h = 56;
    const points = values.map((v, i) => `${(i / (values.length - 1) * w).toFixed(1)},${(h - 4 - (v - lo) / span * (h - 8)).toFixed(1)}`).join(' ');
    return <svg className={`mkt-spark ${tone(values.at(-1)! - values[0])}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`최저 ${lo} · 최고 ${hi}`}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg>;
}

export function MarketPanel({ s, send, busy }: PanelProps) {
    const sync = useCallback(() => send({ type: 'sync' }), [send]);
    const { market: x, journal } = useMarket(s, sync), now = useNow(1000), m = s.market;
    const heading = <Heading eyebrow="COIN STOCK EXCHANGE" title="주화 증권거래소" description="던전 주화로 가상 종목을 사고팝니다. 시세는 모든 모험가가 같고 10분마다 바뀝니다."/>;
    const price = currentPrices(x), cost = marketCost(s), trades = marketTradesToday(s, dayKey(now));
    const holdings = m?.holdings || {}, value = STOCKS.reduce((a, d) => a + (holdings[d.id]?.qty || 0) * (price[d.id] || 0), 0), held = Object.keys(holdings).length;
    const next = x ? (x.tick + 1) * MARKET_TICK_MS - now : 0;
    return <>{heading}
        <section className="panel port-resource-bar" aria-label="계좌">
            <div><Coins size={22}/><span>보유 던전 주화<strong>{format(s.dungeonCoins || 0)}</strong></span></div>
            <div><Landmark size={22}/><span>투자 원금<strong>{format(cost)} <small>/ {format(MARKET.maxCost)}</small></strong></span></div>
            <div><TrendingUp size={22}/><span>평가 손익<strong className={tone(value - cost)}>{held > 0 && x ? signed(value - cost) : '-'}<small> 실현 {signed(m?.realized || 0)}</small></strong></span></div>
            <div><Repeat size={22}/><span>오늘 거래<strong>{trades} <small>/ {MARKET.tradesPerDay}회</small></strong></span></div>
        </section>
        <section className="panel mkt-rumor">
            <Newspaper size={18}/>
            {x?.rumor ? <span><b>시황 소문</b> {stockById(x.rumor.stock)?.name} · {rumorText(x.rumor.stock, x.rumor.up)}. 소문은 틀릴 때도 있습니다.</span> : <span>시세를 받는 중입니다.</span>}
            {x && <small>다음 시세까지 {clock(next)}</small>}
        </section>
        <div className="dshop-grid">{STOCKS.map((d, i) => <StockCard key={d.id} d={d} column={i} x={x} s={s} busy={busy} trades={trades} send={send}/>)}</div>
        <section className="panel mkt-open">
            <ul className="mkt-rules">
                <li>종목 {STOCKS.length}개(안정 · 보통 · 고위험). 시세는 {MARKET_TICK_MS / 60_000}분마다 바뀌고, 길게 보면 기준가 주변으로 돌아옵니다.</li>
                <li>매수 · 매도마다 수수료 {MARKET.fee * 100}%(최소 1주화). 총 보유 원금 {format(MARKET.maxCost)}주화 · 하루 {MARKET.tradesPerDay}번까지. 체결은 서버가 받는 순간의 시세입니다.</li>
                <li>잃을 수도 있습니다. 환생해도 보유 주식은 남고, 승천하면 주식도 사라집니다.</li>
            </ul>
        </section>
        <Journal trades={journal.trades}/>
    </>;
}

function StockCard({ d, column, x, s, busy, trades, send }: Pick<PanelProps, 's' | 'busy' | 'send'> & { d: StockDef; column: number; x: MarketStore | null; trades: number }) {
    const [qty, setQty] = useState('1');
    const series = x?.prices.map(row => row[column]) || [], p = series.at(-1), day = series.length > 144 ? series.at(-145)! : series[0];
    const h = s.market?.holdings[d.id], n = Math.max(0, Math.floor(Number(qty) || 0)), coins = s.dungeonCoins || 0;
    const buy = p ? buyCost(p, n) : null, sell = p ? sellGain(p, n) : null, room = MARKET.maxCost - marketCost(s);
    const maxBuy = p ? Math.max(0, Math.floor(Math.min(coins, room) / (p * (1 + MARKET.fee)))) : 0;
    const out = trades >= MARKET.tradesPerDay;
    return <article className="panel market-card dshop-card mkt-card">
        <header className="mkt-head"><div><span className="eyebrow">{d.risk}</span><h2>{d.name}</h2></div>
            <div className="mkt-price"><strong>{p ? format(p) : '-'}</strong>{p && day ? <small className={tone(p - day)}>{pct(p / day - 1)}{series.length > 144 ? ' · 24시간' : ''}</small> : null}</div></header>
        <Spark values={series.slice(-144)}/>
        <p className="draw-desc">{d.desc} 기준가 {format(d.base)}.</p>
        <p className="muted mkt-hold">{h ? <>보유 {format(h.qty)}주 · 평균 {format(Math.round(h.cost / h.qty * 10) / 10)} · 평가 <span className={tone((p || 0) * h.qty - h.cost)}>{p ? signed(p * h.qty - h.cost) : '-'}</span></> : '보유 없음'}</p>
        <div className="mkt-qty"><label>수량<input type="number" min={1} step={1} inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}/></label>
            <button className="secondary small" type="button" disabled={!maxBuy} onClick={() => setQty(String(Math.max(1, maxBuy)))}>최대 매수</button>
            {h && <button className="secondary small" type="button" onClick={() => setQty(String(h.qty))}>전부</button>}</div>
        <p className="muted draw-cost">{out ? `오늘 거래 ${MARKET.tradesPerDay}번을 모두 썼습니다.` : buy && sell && n ? `매수 ${format(buy.total)}주화(수수료 ${buy.fee}) · 매도 ${format(sell.net)}주화(수수료 ${sell.fee})` : '수량을 적으세요.'}</p>
        <div className="gamble-count-row draw-actions">
            <button className="secondary" disabled={busy || out || !n || !buy || buy.total > coins || buy.total > room} onClick={() => send({ type: 'market', id: `buy:${d.id}`, value: String(n) })}>매수</button>
            <button className="secondary" disabled={busy || out || !n || !h || h.qty < n} onClick={() => send({ type: 'market', id: `sell:${d.id}`, value: String(n) })}>매도</button>
        </div>
    </article>;
}

function Journal({ trades }: { trades: MarketTrade[] }) {
    if (!trades.length) return null;
    return <section className="panel mkt-journal">
        <header><h3>거래 내역</h3><button className="secondary small" onClick={clearMarketTrades}>지우기</button></header>
        <ul>{trades.map((t, i) => <li key={`${t.at}-${i}`}><span>{new Date(t.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <b className={t.qty > 0 ? 'mkt-up' : 'mkt-down'}>{t.qty > 0 ? '매수' : '매도'}</b> {stockById(t.stock)?.name} {format(Math.abs(t.qty))}주 · 약 {format(t.price)}</li>)}</ul>
        <p className="muted">이 기기에만 남는 기록입니다(전투 기록처럼). 정확한 체결 금액은 전투 화면 기록판의 시스템 줄에 있습니다.</p>
    </section>;
}
