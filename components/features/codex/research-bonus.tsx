'use client';
/** v3.382 연구 보너스: 몬스터 연구 효과 · 개체도감 완성 · 지역 연구 · 장소 연구. */
import type { State } from '@/game/types';
import { FoldSection, StatBar } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { MONSTERS, BASE_STAGES, REGIONS, regionMonsters, monsterById } from '@/game/data/world';
import { BALANCE } from '@/game/data/balance';
import { PROGRESSION } from '@/game/data/progression';
import { completedStages } from '@/game/systems/progression';
import { bookEcology, bookStage, regionResearchStage } from '@/game/systems/book';
import { BOOK_ECOLOGY, BOOK_REVEAL, REGION_RESEARCH, REGION_RESEARCH_FROM, REGION_RESEARCH_MAX } from '@/game/data/book-traits';

const pct = (n: number) => Number((n * 100).toFixed(1));
const COMPLETE = PROGRESSION.monsterComplete, LAST = BALANCE.bookMilestones.length;

function Chip({ state, title, children }: { state: 'done' | 'seen' | 'none'; title?: string; children: React.ReactNode }) {
    return <span title={title} className={cn('rounded-s border px-1.5 py-0.5 text-xs', state === 'done' ? 'border-accent/60 bg-accent-soft text-ink-1' : state === 'seen' ? 'border-line bg-surface-3 text-ink-2' : 'border-line/60 text-ink-3')}>{children}</span>;
}
function RowHead({ name, sub, count, max, unit = '' }: { name: string; sub?: string; count: number; max: number; unit?: string }) {
    return <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="text-s font-semibold text-ink-1">{name}{sub && <span className="ml-2 text-xs font-normal text-ink-3">{sub}</span>}</span><span className="font-num text-xs tabular-nums text-ink-3">{count} / {max}{unit}</span></div>;
}
const Row = ({ children, tone }: { children: React.ReactNode; tone: 'done' | 'active' | 'none' }) => <li className={cn('grid gap-2 rounded-m border border-line/60 bg-surface-1 p-3', tone === 'done' && 'border-accent/40', tone === 'none' && 'opacity-80')}>{children}</li>;
const toneOf = (n: number, max: number) => n >= max ? 'done' : n ? 'active' : 'none';

export function ResearchBonus({ s }: { s: State }) {
    const stages = MONSTERS.map(f => bookStage(s, f.id)), maxStage = MONSTERS.length * LAST, complete = MONSTERS.filter(f => (s.book[f.id] || 0) >= COMPLETE).length, regions = completedStages(s);
    return <div className="grid gap-3">
        <FoldSection defaultOpen title="몬스터 연구 효과" summary={`${stages.reduce((a, n) => a + n, 0)} / ${maxStage}단계`}
            extra={`많이 잡은 몬스터일수록 그 몬스터 상대로 강해집니다(연구 ${BOOK_ECOLOGY.fromStage}단계부터, 6단계 최대 +${pct(BOOK_ECOLOGY.dealt.reduce((a, n) => a + n, 0))}% / -${pct(BOOK_ECOLOGY.taken.reduce((a, n) => a + n, 0))}%).`}>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{BOOK_ECOLOGY.dealt.map((_, i) => { const n = stages.filter(x => x >= i + BOOK_ECOLOGY.fromStage).length; return <li key={i} className={cn('flex items-center justify-between gap-2 rounded-m border border-line/60 bg-surface-1 px-3 py-2 text-xs', n ? 'text-ink-1' : 'text-ink-3')}><span>연구 {i + BOOK_ECOLOGY.fromStage}단계 · 누적 +{pct(BOOK_ECOLOGY.dealt.slice(0, i + 1).reduce((a, x) => a + x, 0))}% / -{pct(BOOK_ECOLOGY.taken.slice(0, i + 1).reduce((a, x) => a + x, 0))}%</span><b className="font-num">{n} / {MONSTERS.length}종</b></li>; })}</ul>
            <h3 className="text-s font-semibold text-ink-2">몬스터별 진행 <span className="font-normal text-ink-3">장소별 · 칩의 숫자는 그 몬스터의 연구 단계(최대 {LAST}단계)</span></h3>
            <ul className="grid gap-2">{BASE_STAGES.map(st => { const ids = [...new Set(st.monsters)], max = ids.length * LAST, sum = ids.reduce((a, id) => a + bookStage(s, id), 0); return <Row key={st.id} tone={toneOf(sum, max)}>
                <RowHead name={st.name} sub={`${st.rebirth ? `환생 ${st.rebirth} · ` : ''}Lv.${st.level}`} count={sum} max={max}/>
                <StatBar value={sum} max={max} size="s" showText={false}/>
                <div className="flex flex-wrap gap-1">{ids.map(id => { const f = monsterById(id)!, n = s.book[id] || 0, e = bookEcology(s, id), st2 = bookStage(s, id); return <Chip key={id} state={st2 >= LAST ? 'done' : e.stages ? 'seen' : 'none'} title={n ? `${f.name} · 처치 ${n.toLocaleString()}회 · +${pct(e.dealt)}% / -${pct(e.taken)}%` : '미발견'}>{n ? f.name : '???'}{n ? ` ${st2}/${LAST}` : ''}</Chip>; })}</div>
            </Row>; })}</ul>
        </FoldSection>
        <FoldSection title="개체도감 완성" summary={`${complete} / ${MONSTERS.length}`}
            extra={`몬스터를 ${COMPLETE}회 처치하면 완성입니다. 완성한 종은 장소 연구에 반영되고, ${BOOK_REVEAL}회부터 적 정보가 열립니다. 종별 연구는 2단계부터 그 몬스터 상대 생태 연구가 오르고, 4 · 5 · 6단계는 SP +${PROGRESSION.bookSP[3]} · +${PROGRESSION.bookSP[4]} · +${PROGRESSION.bookSP[5]}을 줍니다. 6단계는 그 몬스터를 난이도 ${BALANCE.bookTierReq[5]} 이상에서 처치해야 열립니다.`}>
            <ul className="grid gap-2">{BASE_STAGES.map(st => { const ids = [...new Set(st.monsters)], done = ids.filter(id => (s.book[id] || 0) >= COMPLETE).length; return <Row key={st.id} tone={toneOf(done, ids.length)}>
                <RowHead name={st.name} sub={`${st.rebirth ? `환생 ${st.rebirth} · ` : ''}Lv.${st.level}`} count={done} max={ids.length}/>
                <StatBar value={done} max={ids.length} size="s" showText={false}/>
                <div className="flex flex-wrap gap-1">{ids.map(id => { const f = monsterById(id)!, n = s.book[id] || 0; return <Chip key={id} state={n >= COMPLETE ? 'done' : n ? 'seen' : 'none'}>{n ? f.name : '???'}{n && n < COMPLETE ? ` ${n}` : ''}</Chip>; })}</div>
            </Row>; })}</ul>
        </FoldSection>
        <FoldSection title="지역 연구" summary={`${REGIONS.reduce((a, r) => a + regionResearchStage(s, r), 0)} / ${REGIONS.length * REGION_RESEARCH_MAX}`}
            extra={`지역(리스항구 등)의 모든 몬스터가 연구 ${REGION_RESEARCH_FROM} · ${REGION_RESEARCH_FROM + 1} · ${REGION_RESEARCH_FROM + 2}단계 이상이면 지역 연구 1 · 2 · 3단계입니다. 1단계에 지역 첫 보너스가 붙고, 단계마다 지역 효과가 한 번씩 쌓입니다.`}>
            <ul className="grid gap-2">{REGIONS.map(region => { const n = regionResearchStage(s, region), r = REGION_RESEARCH[region], ids = regionMonsters(region), need = REGION_RESEARCH_FROM + n; return <Row key={region} tone={toneOf(n, REGION_RESEARCH_MAX)}>
                <RowHead name={region} sub={`1단계 첫 보너스 ${r?.first.label} · 단계마다 ${r?.label}${n ? ` · ×${n} 적용 중` : ''}`} count={n} max={REGION_RESEARCH_MAX} unit="단계"/>
                <StatBar value={n} max={REGION_RESEARCH_MAX} size="s" showText={false}/>
                <div className="flex flex-wrap gap-1">{ids.map(id => { const f = monsterById(id)!, k = s.book[id] || 0, stage = bookStage(s, id); return <Chip key={id} state={stage >= REGION_RESEARCH_FROM + REGION_RESEARCH_MAX - 1 ? 'done' : stage >= need ? 'seen' : 'none'} title={k ? `${f.name} · 연구 ${stage}단계${n < REGION_RESEARCH_MAX ? ` · 다음 지역 연구에 ${need}단계 필요` : ''}` : '미발견'}>{k ? f.name : '???'}{k ? ` ${stage}단계` : ''}</Chip>; })}</div>
                {n < REGION_RESEARCH_MAX && <p className="text-xs text-ink-3">다음 단계: 지역의 모든 몬스터가 연구 {need}단계 이상.</p>}
            </Row>; })}</ul>
        </FoldSection>
        <FoldSection title="장소 연구" summary={`${regions.length} / ${BASE_STAGES.length}`}
            extra={`사냥터(장소)의 모든 종을 완성(처치 ${COMPLETE}회)하면 업적 ‘지역 연구 N곳 완성’에서 장착 AP +1을 받습니다.`}>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{BASE_STAGES.map(st => { const done = regions.some(r => r.id === st.id); return <li key={st.id} className={cn('flex items-center justify-between gap-2 rounded-m border px-3 py-2 text-xs', done ? 'border-accent/40 bg-surface-1 text-ink-1' : 'border-line/60 bg-surface-1 text-ink-3')}><span>{st.name}</span><b>{done ? '완성 · 장착 AP +1' : '미완성'}</b></li>; })}</ul>
        </FoldSection>
    </div>;
}
