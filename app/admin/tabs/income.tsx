import { INCOME_KINDS, big, Tile, Fold, muted, grid } from '../parts';
import { format } from '@/components/game/shared';
import type { Admin } from '../use-admin';

/** v3.413 운영자 페이지 탭(page.tsx 에서 분리). 화면과 문구는 그대로입니다. */
export function IncomeTab({ a }: { a: Admin }) {
    const { income, incomeQuery, setIncomeQuery, loadIncome } = a;
    if (!income) return null;
    return <>
            <Fold title="요약" note={`기록 ${format(income.measured)}명 · 시간당 중앙값 ${big(income.median)}`}>
                <div style={grid(170)}>
                    <Tile label="기록 있는 모험가" value={format(income.measured)} note={`최근 24시간 저장 ${format(income.recent)}명`}/>
                    <Tile label="시간당 골드 중앙값" value={big(income.median)} note="최근 24시간 저장 기준"/>
                    {income.byRebirth.map(b => <Tile key={b.label} label={b.label} value={b.count ? big(b.median) : '-'} note={`${format(b.count)}명 · 최고 ${big(b.max)}`}/>)}
                </div>
            </Fold>
            {income.picked.map(p => <Fold key={p.id} title={p.name} note={`${p.username || '?'} · 환생 ${p.rebirths}${p.ascension ? ` · 승천 ${p.ascension}` : ''} · Lv.${p.level} · ${p.place} ${p.tide}${p.running ? '' : ' · 멈춤'}`}>
                <div style={{ ...grid(170), marginBottom: 10 }}>
                    <Tile label="시간당 골드" value={`${p.estimated ? '≈ ' : ''}${big(p.perHour)}`} note={`보유 ${big(p.gold)} · 기록 뒤 합계 ${big(p.earned)}`}/>
                    <Tile label="시간당 경험치" value={p.exp ? `${p.exp.estimated ? '≈ ' : ''}${big(p.exp.perHour)}` : '-'} note={p.exp ? `기록 뒤 합계 ${big(p.exp.earned)} · 이번 생 기준` : ''}/>
                    <Tile label="시간당 숙련" value={p.mastery ? `${p.mastery.estimated ? '≈ ' : ''}${big(p.mastery.perHour)}` : '-'} note={p.mastery ? `기록 뒤 합계 ${big(p.mastery.earned)} · 현재 직업` : ''}/>
                </div>
                {!p.log.length ? <p className="text-s text-ink-3">아직 기록이 없습니다.</p> : <div style={grid(260)}>{INCOME_KINDS.map(([k, label, color]) => { const top = Math.max(1, ...p.log.map(x => x[k] || 0)); return <div key={k}>
                    <b className="text-s">{label}</b>
                    <ul className="mt-1 grid gap-0.5 text-xs">{p.log.map(x => <li key={x.ago} className="grid grid-cols-[64px_1fr_72px] items-center gap-2"><span className={muted}>{x.ago ? `${x.ago}시간 전` : '지금'}</span><span className="h-2 rounded-full bg-surface-0"><span className="block h-2 rounded-full" style={{ width: `${(x[k] || 0) ? Math.max(2, (x[k] || 0) / top * 100) : 0}%`, background: color }}/></span><b className="text-right">{big(x[k] || 0)}</b></li>)}</ul>
                </div>; })}</div>}
            </Fold>)}
            {incomeQuery.trim() && !income.picked.length && <p className="text-s text-ink-3">‘{incomeQuery}’에 맞는 모험가가 없습니다.</p>}
            <Fold title="시간당 골드 상위 30" note="최근 24시간 저장 · 줄을 누르면 시간별 기록">
                {!income.top.length ? <p className="text-s text-ink-3">아직 기록이 없습니다.</p> :
                <div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr className="text-left text-ink-3"><th>#</th><th>모험가</th><th>환생</th><th>Lv</th><th>장소 · 난이도</th><th className="text-right">시간당</th><th className="text-right">보유</th></tr></thead>
                <tbody>{income.top.map((r, i) => <tr key={r.id} className="cursor-pointer border-t border-line hover:bg-surface-3/60" onClick={() => { setIncomeQuery(r.name); void loadIncome(r.name); }}><td>{i + 1}</td><td>{r.name} <span className={muted}>{r.username}</span></td><td>{r.rebirths}{r.ascension ? `·승${r.ascension}` : ''}</td><td>{r.level}</td><td>{r.place} · {r.tide}</td><td className="text-right">{r.estimated ? '≈ ' : ''}{big(r.perHour)}</td><td className="text-right">{big(r.gold)}</td></tr>)}</tbody></table></div>}
            </Fold>
    </>;
}
