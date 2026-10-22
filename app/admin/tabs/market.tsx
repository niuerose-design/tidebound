import { Primary, Sm, Fold, muted, rowItem, field } from '../parts';
import { cn } from '@/lib/utils';
import { format } from '@/components/game/shared';
import { kstIso } from '@/game/data/time';
import type { Admin } from '../use-admin';

/** v3.413 운영자 페이지 탭(page.tsx 에서 분리). 화면과 문구는 그대로입니다. */
export function MarketTab({ a }: { a: Admin }) {
    const { busy, market, haltMin, setHaltMin, marketReason, setMarketReason, setMarketControl } = a;
    if (!market) return null;
    return <>
            <Fold title="장 상태" note={market.control.closed ? '폐장' : market.control.haltUntil ? '서킷브레이커' : '정상 거래'}>
                <ul className="grid">
                    <li className={rowItem}><span className="text-s"><b>장 폐쇄</b> · {market.control.closed ? <b className="text-danger">폐장 중(매수 · 매도 막힘)</b> : <span className="text-ok">열림</span>}</span>
                        <Sm className={cn(market.control.closed && 'border-transparent bg-accent text-accent-ink hover:bg-accent/90')} disabled={busy} onClick={() => void setMarketControl({ closed: !market.control.closed }, market.control.closed ? '장을 다시 엽니다.' : '장을 닫습니다(풀 때까지 거래 막힘).')}>{market.control.closed ? '장 열기' : '장 닫기'}</Sm></li>
                    <li className={cn(rowItem, 'flex-wrap')}><span className="text-s"><b>서킷브레이커</b> · {market.control.haltUntil ? <b className="text-gold-ink">{kstIso(market.control.haltUntil).slice(5, 16).replace('T', ' ')}까지 거래 중단</b> : <span className={muted}>없음</span>}</span>
                        <span className="flex flex-wrap items-center gap-1.5">
                            {[10, 30, 60].map(m => <Sm key={m} disabled={busy} onClick={() => void setMarketControl({ haltMinutes: m }, `서킷브레이커 ${m}분을 겁니다.`)}>{m}분</Sm>)}
                            <input value={haltMin} onChange={e => setHaltMin(e.target.value)} inputMode="numeric" aria-label="서킷브레이커 분" className={cn(field, 'w-[70px]')}/>
                            <Sm disabled={busy || !(Number(haltMin) > 0)} onClick={() => void setMarketControl({ haltMinutes: Number(haltMin) }, `서킷브레이커 ${haltMin}분을 겁니다.`)}>분 걸기</Sm>
                            {market.control.haltUntil > 0 && <Primary type="button" disabled={busy} onClick={() => void setMarketControl({ haltMinutes: 0 }, '서킷브레이커를 풉니다.')}>해제</Primary>}
                        </span></li>
                    <li className={cn(rowItem, 'flex-wrap')}><span className="text-s"><b>사유</b> <small className={muted}>(유저 화면에 보임 · 최대 100자 · 장 닫기 · 서킷브레이커와 함께 저장)</small></span>
                        <span className="flex flex-[1_1_280px] gap-1.5"><input value={marketReason} maxLength={100} onChange={e => setMarketReason(e.target.value)} placeholder="예: 시세 점검" className={cn(field, 'flex-1')}/>
                            <Sm disabled={busy} onClick={() => void setMarketControl({}, '사유만 바꿉니다.')}>사유 저장</Sm></span></li>
                </ul>
            </Fold>
            <Fold title="지금 시세" note={`${market.stocks.length}종목 · 24시간 등락`}>
                <ul className="grid">{market.stocks.map(x => <li key={x.id} className={rowItem}><span className="text-s"><b>{x.name}</b> <small className={muted}>{x.risk} · 기준가 {format(x.base)}</small></span>
                    <span className="font-num text-s">{format(x.price)} <span className={cn(x.change > 0 ? 'text-[#e8746b]' : x.change < 0 ? 'text-[#6fa8e6]' : '')}>{x.change > 0 ? '+' : ''}{(x.change * 100).toFixed(2)}%</span></span></li>)}</ul>
            </Fold>
    </>;
}
