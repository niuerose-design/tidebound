'use client';
/**
 * v3.404 주화 증권거래소(새 토대, docs/stock-market-plan.md): 왼쪽 메뉴의 한 칸(상점과 따로).
 * 시세는 모든 모험가가 같고, 서버가 계산해 동기화 응답에 얹어 줍니다. 차트 · 거래 내역은 이 기기에만 남습니다(market-records.ts).
 * 내용 · 서버 행동은 옛 market-panel 그대로이고 틀만 토큰 · shadcn · 게임 키트로 바꿨습니다.
 */
import { useCallback, useState } from 'react';
import { Coins, Landmark, Newspaper, OctagonAlert, TrendingUp, Wallet } from 'lucide-react';
import { MARKET, MARKET_TICK_MS, STOCKS, buyCost, sellGain, marketCost, rumorText, stockById, feeScaleOf, type StockDef } from '@/game/data/market';
import { useNow } from '@/components/game/shared';
import { useMarket, currentPrices, clearMarketTrades, type MarketStore, type MarketTrade } from '@/components/game/market-records';
import type { PanelProps } from '@/components/game/panel-props';
import { SectionHeader, formatExact as format } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { Tile, Field, field } from '@/components/features/shop/parts';
import { cn } from '@/lib/utils';

const signed = (n: number) => `${n > 0 ? '+' : ''}${format(Math.round(n))}`;
const pct = (n: number) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
/** 한국식 색: 오르면 빨강, 내리면 파랑(기존 .mkt-up · .mkt-down 색 그대로). */
const tone = (n: number) => n > 0 ? 'text-[#e8746b]' : n < 0 ? 'text-[#6fa8e6]' : '';
const clock = (ms: number) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}분 ${String(t % 60).padStart(2, '0')}초`; };

function Spark({ values }: { values: number[] }) {
    if (values.length < 2) return <div className="grid h-14 place-items-center rounded-m border border-dashed border-line text-xs text-ink-3">시세를 모으는 중</div>;
    const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1, w = 240, h = 56;
    const points = values.map((v, i) => `${(i / (values.length - 1) * w).toFixed(1)},${(h - 4 - (v - lo) / span * (h - 8)).toFixed(1)}`).join(' ');
    return <svg className={cn('block h-14 w-full text-ink-3', tone(values.at(-1)! - values[0]))} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`최저 ${lo} · 최고 ${hi}`}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg>;
}

const Notice = ({ icon, tone: t, children }: { icon: React.ReactNode; tone?: 'danger'; children: React.ReactNode }) => <section role="status" className={cn('flex flex-wrap items-start gap-2.5 rounded-l border px-4 py-3 text-s leading-relaxed [&>svg]:mt-0.5 [&>svg]:shrink-0', t === 'danger' ? 'border-danger/50 bg-danger/10 text-ink-1 [&>svg]:text-danger' : 'border-line bg-surface-2 text-ink-2 [&>svg]:text-accent')}>{icon}{children}</section>;

export function MarketScreen({ s, send, busy }: PanelProps) {
    const sync = useCallback(() => send({ type: 'sync' }), [send]);
    const { market: x, journal, status } = useMarket(s, sync), now = useNow(1000), m = s.market;
    const price = currentPrices(x), cost = marketCost(s);
    const holdings = m?.holdings || {}, value = STOCKS.reduce((a, d) => a + (holdings[d.id]?.qty || 0) * (price[d.id] || 0), 0), held = Object.keys(holdings).length;
    const next = x ? (x.tick + 1) * MARKET_TICK_MS - now : 0, halted = !!status && status.haltUntil > now, stop = !!status?.closed || halted;
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="COIN STOCK EXCHANGE" title="주화 증권거래소" description="던전 주화로 가상 종목을 사고팝니다. 시세는 모든 모험가가 같고 10분마다 바뀝니다."/>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="계좌">
            <Tile icon={<Coins size={16}/>} label="보유 던전 주화">{format(s.dungeonCoins || 0)}</Tile>
            <Tile icon={<Landmark size={16}/>} label="투자 원금">{format(cost)}</Tile>
            <Tile icon={<TrendingUp size={16}/>} label="평가 손익"><span className={tone(value - cost)}>{held > 0 && x ? signed(value - cost) : '-'}</span><small className="ml-1 text-xs font-normal text-ink-3">실현 {signed(m?.realized || 0)}</small></Tile>
            <Tile icon={<Wallet size={16}/>} label="평가 금액">{held > 0 && x ? format(Math.floor(value)) : '-'}</Tile>
        </div>
        {stop && <Notice tone="danger" icon={<OctagonAlert size={18}/>}>
            <span><b className="mr-1 font-semibold">{status!.closed ? '폐장' : '서킷브레이커 발동'}</b>{status!.closed ? '증권거래소가 닫혀 있어 매수 · 매도를 할 수 없습니다.' : `거래가 잠시 멈췄습니다. ${clock(status!.haltUntil - now)} 뒤 재개됩니다.`}{status!.reason ? ` 사유: ${status!.reason}` : ''} 시세는 계속 움직입니다.</span>
        </Notice>}
        <Notice icon={<Newspaper size={18}/>}>
            {x?.rumor ? <span><b className="mr-1 font-semibold text-gold-ink">시황 소문</b>{stockById(x.rumor.stock)?.name} · {rumorText(x.rumor.stock, x.rumor.up)}. 소문은 틀릴 때도 있습니다.</span> : <span>시세를 받는 중입니다.</span>}
            {x && <small className="basis-full text-xs text-ink-3 sm:ml-auto sm:basis-auto">다음 시세까지 {clock(next)}</small>}
        </Notice>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{STOCKS.map((d, i) => <StockCard key={d.id} d={d} column={i} x={x} s={s} busy={busy || stop} send={send}/>)}</div>
        <section className="rounded-l border border-line bg-surface-2 p-4 shadow-1">
            <ul className="grid list-disc gap-1 pl-4 text-xs leading-relaxed text-ink-2">
                <li>종목 {STOCKS.length}개(안정 · 보통 · 고위험). 시세는 {MARKET_TICK_MS / 60_000}분마다 바뀌고, 길게 보면 기준가 주변으로 돌아옵니다.</li>
                <li>매수 · 매도마다 수수료 {MARKET.fee * 100}%(최소 1주화). 가진 던전 주화만큼 살 수 있고 거래 횟수 제한은 없습니다. 체결은 서버가 받는 순간의 시세입니다.</li>
                <li>잃을 수도 있습니다. 환생해도 보유 주식은 남고, 승천하면 주식도 사라집니다.</li>
            </ul>
        </section>
        <Journal trades={journal.trades}/>
    </div>;
}

function StockCard({ d, column, x, s, busy, send }: Pick<PanelProps, 's' | 'busy' | 'send'> & { d: StockDef; column: number; x: MarketStore | null }) {
    const [qty, setQty] = useState('1');
    const series = x?.prices.map(row => row[column]) || [], p = series.at(-1), day = series.length > 144 ? series.at(-145)! : series[0];
    const h = s.market?.holdings[d.id], n = Math.max(0, Math.floor(Number(qty) || 0)), coins = s.dungeonCoins || 0;
    const buy = p ? buyCost(p, n, feeScaleOf(s)) : null, sell = p ? sellGain(p, n, feeScaleOf(s)) : null;
    // 수수료 올림 · 최소 1주화 때문에 어림값이 한두 주 넘칠 수 있어 실제 비용으로 줄입니다.
    let maxBuy = p ? Math.floor(coins / (p * (1 + MARKET.fee))) : 0;
    while (p && maxBuy > 0 && buyCost(p, maxBuy, feeScaleOf(s)).total > coins) maxBuy--;
    return <article className="grid content-start gap-2.5 rounded-l border border-line bg-surface-2 p-4 shadow-1">
        <header className="flex items-start justify-between gap-2">
            <div className="grid gap-0.5"><span className="text-xs uppercase tracking-wider text-ink-3">{d.risk}</span><h2 className="font-display text-m font-bold">{d.name}</h2></div>
            <div className="grid justify-items-end gap-0.5"><strong className="font-num text-l">{p ? format(p) : '-'}</strong>{p && day ? <small className={cn('font-num text-xs', tone(p - day))}>{pct(p / day - 1)}{series.length > 144 ? ' · 24시간' : ''}</small> : null}</div>
        </header>
        <Spark values={series.slice(-144)}/>
        <p className="text-xs leading-relaxed text-ink-2">{d.desc} 기준가 {format(d.base)}.</p>
        <p className="text-xs text-ink-3">{h ? <>보유 {format(h.qty)}주 · 평균 {format(Math.round(h.cost / h.qty * 10) / 10)} · 평가 <span className={tone((p || 0) * h.qty - h.cost)}>{p ? signed(p * h.qty - h.cost) : '-'}</span></> : '보유 없음'}</p>
        <div className="flex flex-wrap items-end gap-2">
            <Field label="수량"><input className={cn(field, 'w-28 font-num')} type="number" min={1} step={1} inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}/></Field>
            <Button type="button" size="sm" variant="outline" className="pointer-coarse:min-h-11" disabled={!maxBuy} onClick={() => setQty(String(Math.max(1, maxBuy)))}>최대 매수</Button>
            {h && <Button type="button" size="sm" variant="outline" className="pointer-coarse:min-h-11" onClick={() => setQty(String(h.qty))}>전부</Button>}
        </div>
        <p className="text-xs text-ink-3">{buy && sell && n ? `매수 ${format(buy.total)}주화(수수료 ${buy.fee}) · 매도 ${format(sell.net)}주화(수수료 ${sell.fee})` : '수량을 적으세요.'}</p>
        <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" className="bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11" disabled={busy || !n || !buy || buy.total > coins} onClick={() => send({ type: 'market', id: `buy:${d.id}`, value: String(n) })}>매수</Button>
            <Button type="button" size="sm" variant="outline" className="pointer-coarse:min-h-11" disabled={busy || !n || !h || h.qty < n} onClick={() => send({ type: 'market', id: `sell:${d.id}`, value: String(n) })}>매도</Button>
        </div>
    </article>;
}

function Journal({ trades }: { trades: MarketTrade[] }) {
    if (!trades.length) return null;
    return <section className="grid gap-2 rounded-l border border-line bg-surface-2 p-4 shadow-1">
        <header className="flex items-center justify-between gap-2"><h3 className="font-display text-m font-bold">거래 내역</h3><Button type="button" size="xs" variant="ghost" className="pointer-coarse:min-h-11" onClick={clearMarketTrades}>지우기</Button></header>
        <ul className="grid gap-1 text-xs">{trades.map((t, i) => <li key={`${t.at}-${i}`} className="flex flex-wrap gap-x-2 rounded-s bg-surface-1 px-2 py-1"><span className="font-num text-ink-3">{new Date(t.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <b className={tone(t.qty)}>{t.qty > 0 ? '매수' : '매도'}</b> <span>{stockById(t.stock)?.name} {format(Math.abs(t.qty))}주 · 약 {format(t.price)}</span></li>)}</ul>
        <p className="text-xs text-ink-3">이 기기에만 남는 기록입니다(전투 기록처럼). 정확한 체결 금액은 전투 화면 기록판의 시스템 줄에 있습니다.</p>
    </section>;
}
