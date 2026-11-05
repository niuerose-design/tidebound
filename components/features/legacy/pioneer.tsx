'use client';
/** v3.464 아제로스 개척 카드(docs/balance-rebirth.md 15절): 서버 공용 게이지 · 바치기 · 기여 순위 · 열린 지역의 공개 범위 투표. 정보는 카드를 열 때와 버튼을 누른 뒤에만 읽습니다. */
import { useEffect, useRef, useState } from 'react';
import { Map, RefreshCw, Sparkles, Vote } from 'lucide-react';
import type { State } from '@/game/types';
import { StatBar, formatExact, Eyebrow } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { formatRemaining } from '@/components/game/shared';
import { PIONEER, pioneerAccessName, type PioneerInfo, type PioneerRegionInfo, type PioneerAccess } from '@/game/data/pioneer';
import { ascensionOf } from '@/game/data/ascension';
import { Card, Note, field } from './parts';
import { cn } from '@/lib/utils';

export type PioneerProps = { pioneer: PioneerInfo | null; pioneerError: string; loadPioneer: () => Promise<void>; pioneerAct: (body: Record<string, unknown>) => Promise<boolean> };
const fmt = formatExact;
const QUICK = [10, 50, 100, 500];
/** 드러난 계보 이름만 적고, 나머지는 수로. */
const lineageLine = (names: (string | null)[]) => { const shown = names.filter((n): n is string => !!n), hidden = names.length - shown.length; return shown.length ? `드러난 계보: ${shown.join(', ')}${hidden ? ` · 나머지 ${hidden}개는 아직 숨어 있습니다` : ''}` : `계보 ${names.length}개가 아직 숨어 있습니다. 지역이 열리면 드러납니다.`; };
const num = (v: string) => Math.max(0, Math.floor(Number(v.replace(/[^0-9]/g, '')) || 0));
const Btn = ({ className, ...rest }: React.ComponentProps<typeof Button>) => <Button type="button" size="sm" className={cn('min-h-9 pointer-coarse:min-h-11', className)} {...rest}/>;

export function PioneerPanel({ s, busy, pioneer, pioneerError, loadPioneer, pioneerAct }: { s: State; busy: boolean } & PioneerProps) {
    const n = ascensionOf(s);
    const [amount, setAmount] = useState('50'), [now, setNow] = useState(() => Date.now());
    const loaded = useRef(false);
    useEffect(() => { if (loaded.current) return; loaded.current = true; const t = setTimeout(() => { void loadPioneer(); }, 0); return () => clearTimeout(t); }, [loadPioneer]);
    if (!n && s.rebirths < 50) return null;
    const next = pioneer?.regions.find(r => r.id === pioneer.next) || null, pearls = num(amount);
    return <Card className="border-accent/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-1">
                <Eyebrow>PIONEER · 아제로스 개척</Eyebrow>
                <h2 className="inline-flex items-center gap-1.5 font-display text-l font-bold"><Map size={18} className="text-accent"/>승천자가 여는 세계</h2>
                <Note>승천한 모험가가 세계석을 바쳐 아제로스 지역을 서버 전체에 영구로 엽니다. 열린 지역의 계보는 숨은 조건 없이 들어갑니다. 누가 들어갈 수 있는지는 승천자 투표로 정합니다.</Note>
            </div>
            <Btn variant="outline" disabled={busy} onClick={() => { setNow(Date.now()); void loadPioneer(); }}><RefreshCw size={14}/>새로고침</Btn>
        </div>
        {pioneerError && <p className="text-xs text-danger" role="alert">{pioneerError}</p>}
        {!pioneer ? <Note>개척 현황을 불러오는 중입니다.</Note> : <>
            {pioneer.ascended && next && <div className="grid gap-2 rounded-m bg-surface-1 p-3">
                <div className="flex flex-wrap items-center gap-2 text-s"><Sparkles size={15} className="text-gold-ink"/><b>{next.name}에 세계석 바치기</b><small className="text-xs text-ink-3">보유 {fmt(s.pearls)}개 · 서버 승천자 {pioneer.ascendedCount}명</small></div>
                <div className="flex flex-wrap items-center gap-2">
                    <input className={cn(field, 'w-28 font-num')} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} aria-label="바칠 세계석"/>
                    {QUICK.map(q => <Btn key={q} variant="outline" onClick={() => setAmount(String(q))}>{q}</Btn>)}
                    <Btn className="bg-accent text-accent-ink hover:bg-accent/90" disabled={busy || pearls < PIONEER.minOffer || pearls > s.pearls} onClick={() => { void pioneerAct({ action: 'offer', pearls }); }}>바치기</Btn>
                </div>
            </div>}
            {!pioneer.ascended && <Note>승천하면 세계석을 바치고 투표할 수 있습니다. 열린 지역이 모두에게 공개되면 승천하지 않아도 들어갈 수 있습니다.</Note>}
            <ol className="grid gap-2">{pioneer.regions.map((r, i) => <Region key={r.id} r={r} index={i} now={now} busy={busy} ascended={pioneer.ascended} act={pioneerAct}/>)}</ol>
        </>}
    </Card>;
}

function Region({ r, index, now, busy, ascended, act }: { r: PioneerRegionInfo; index: number; now: number; busy: boolean; ascended: boolean; act: PioneerProps['pioneerAct'] }) {
    const vote = (choice: PioneerAccess) => { void act({ action: 'vote', region: r.id, choice }); };
    const open = (choice: PioneerAccess) => { void act({ action: 'openVote', region: r.id, choice }); };
    return <li className={cn('grid gap-2 rounded-m border border-line bg-surface-1 p-3', r.open && 'border-accent/50')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="grid gap-0.5"><span className="font-display text-xs text-ink-3">{index + 1}번째 지역</span><strong className="font-display text-m">{r.name}</strong><small className="text-xs text-ink-3">{r.subtitle}</small></div>
            <span className={cn('rounded-s px-2 py-0.5 text-xs', r.open ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-ink-3')}>{r.open ? `열림 · ${pioneerAccessName(r.access)}` : '아직 닫힘'}</span>
        </div>
        <Note>{r.desc}</Note>
        {!r.open && <StatBar value={r.points} max={r.cost} tone="warn" label="세계석"/>}
        {r.open && r.openedBy && <small className="text-xs text-ink-2">가장 많이 바친 {r.openedBy}의 손으로 {new Date(r.openedAt || now).toLocaleDateString('ko-KR')}에 열렸습니다.</small>}
        <small className="text-xs text-ink-2">{lineageLine(r.lineages)}</small>
        {r.board.length > 0 && <small className="text-xs text-ink-3">기여: {r.board.slice(0, 5).map(b => `${b.name} ${fmt(b.points)}`).join(', ')}{r.mine ? ` · 내 기여 ${fmt(r.mine)}` : ''}</small>}
        {r.open && <div className="grid gap-1.5 rounded-s bg-surface-0 p-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold"><Vote size={13}/>공개 범위 투표</span>
            {r.vote ? <>
                <small className="text-xs text-ink-2">{r.vote.byName}의 제안은 {pioneerAccessName(r.vote.choice)}입니다. 모두에게 공개 {r.vote.all}표, 승천자 전용 {r.vote.ascended}표, {formatRemaining(r.vote.until - now, 0)} 남음.</small>
                {ascended && <div className="flex flex-wrap gap-1.5">
                    <Btn variant={r.vote.mine === 'all' ? 'default' : 'outline'} disabled={busy} onClick={() => vote('all')}>모두에게 공개</Btn>
                    <Btn variant={r.vote.mine === 'ascended' ? 'default' : 'outline'} disabled={busy} onClick={() => vote('ascended')}>승천자 전용</Btn>
                    {r.vote.mine && <small className="self-center text-xs text-ink-3">내 표는 {pioneerAccessName(r.vote.mine)}. 끝나기 전까지 바꿀 수 있습니다.</small>}
                </div>}
            </> : <>
                {r.result ? <small className="text-xs text-ink-2">{new Date(r.result.at).toLocaleDateString('ko-KR')} 결정 {pioneerAccessName(r.result.access)}. {r.result.sole ? `유일한 승천자 ${r.result.byName}의 결정입니다.` : `${r.result.byName}이 열고 모두에게 공개 ${r.result.all}표, 승천자 전용 ${r.result.ascended}표.`}</small>
                    : <small className="text-xs text-ink-2">아직 투표가 없어 승천자 전용입니다.</small>}
                {r.canOpenVote ? <div className="flex flex-wrap gap-1.5">
                    <Btn variant="outline" disabled={busy} onClick={() => open('all')}>모두에게 공개로 투표 열기</Btn>
                    <Btn variant="outline" disabled={busy} onClick={() => open('ascended')}>승천자 전용으로 투표 열기</Btn>
                </div> : ascended && r.openVoteWhy ? <small className="text-xs text-ink-3">{r.openVoteWhy}</small> : null}
            </>}
        </div>}
    </li>;
}
