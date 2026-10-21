'use client';
/** v3.395 사냥터 · 던전 공용 조각: 장소 카드 틀(번호 · 상태 배지 · 제목 · 설명 · 발), 장소 연구 줄, 자동 진행 상태. */
import type { ReactNode } from 'react';
import { Activity, Flag, Gauge, History, Lock, Target } from 'lucide-react';
import type { State } from '@/game/types';
import { PROGRESSION } from '@/game/data/progression';
import { monsterById, stageById, dungeonById } from '@/game/data/world';
import { bookPending } from '@/game/systems/progression';
import { regionResearchStage } from '@/game/systems/book';
import { REGION_RESEARCH, REGION_RESEARCH_FROM, REGION_RESEARCH_MAX } from '@/game/data/book-traits';
import { cn } from '@/lib/utils';

export const field = 'h-9 rounded-m border border-line bg-surface-0 px-2 text-xs text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40 disabled:opacity-50 pointer-coarse:h-11';

/** 장소 카드: 사냥터는 카드 전체가 버튼, 던전은 article(아래 조작 줄). tone 은 왼쪽 띠 색. */
export function PlaceCard({ index, locked, state, eyebrow, title, description, tone, foot, children, as = 'div', onClick, disabled, className }: { index: number; locked?: boolean; state?: ReactNode; eyebrow: ReactNode; title: ReactNode; description: ReactNode; tone?: string; foot?: ReactNode; children?: ReactNode; as?: 'button' | 'div'; onClick?: () => void; disabled?: boolean; className?: string }) {
    const inner = <>
        <div className="flex items-center justify-between gap-2"><span className="font-num text-xs text-ink-3">{String(index + 1).padStart(2, '0')}</span>{locked ? <Lock size={16} className="text-ink-3" aria-label="잠김"/> : state}</div>
        <div className="grid gap-0.5"><span className="eyebrow">{eyebrow}</span><h3 className="font-display text-m font-bold leading-tight">{title}</h3></div>
        <p className="text-xs leading-relaxed text-ink-2">{description}</p>
        {foot && <div className="mt-auto grid gap-1 text-xs text-ink-3">{foot}</div>}
        {children}
    </>;
    const cls = cn('grid content-start gap-2 rounded-l border border-line bg-surface-2 p-3 text-left shadow-1 transition-colors', locked && 'opacity-70', className);
    const style = tone ? { borderLeftColor: tone, borderLeftWidth: 3 } : undefined;
    if (as === 'button') return <button type="button" className={cn(cls, 'outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50', !disabled && 'hover:bg-surface-3/60')} style={style} disabled={disabled} onClick={onClick}>{inner}</button>;
    return <div className={cls} style={style}>{inner}</div>;
}
export const Badge = ({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'muted' | 'warn' }) => <span className={cn('rounded-s px-1.5 py-0.5 text-xs font-semibold', tone === 'accent' ? 'bg-accent text-accent-ink' : tone === 'warn' ? 'bg-warn/20 text-ink-1' : 'bg-surface-3 text-ink-2')}>{children}</span>;

/** 한 장소(사냥터)의 연구 진행도와 장소 완성 보상. */
export function regionResearch(s: State, stageId: string) {
    const st = stageById(stageId)!;
    const done = st.monsters.filter(id => (s.book[id] || 0) >= PROGRESSION.monsterComplete).length;
    const pending = st.monsters.reduce((a, id) => a + bookPending(s, id).ranks.length, 0);
    return { done, total: st.monsters.length, complete: done === st.monsters.length, pending, reward: '업적 장착 AP +1' };
}
export function RegionProgress({ s, id }: { s: State; id: string }) {
    const r = regionResearch(s, id);
    return <span>{r.complete ? `장소 연구 완료 · ${r.reward} 적용 중` : `장소 연구 ${r.done} / ${r.total}종 완성 · 완성 보상 ${r.reward}`}{r.pending > 0 && <b className="text-ok"> · 미수령 {r.pending}단계</b>}</span>;
}
/** v27.80 지역 연구 단계(0~3)와 효과. 지역 몬스터 전부가 연구 4·5·6단계 이상이면 1·2·3단계. */
export function RegionResearchLine({ s, region }: { s: State; region: string }) {
    const n = regionResearchStage(s, region), r = REGION_RESEARCH[region];
    if (!r) return null;
    return <span>{n ? <b className="text-ok">지역 연구 {n} / {REGION_RESEARCH_MAX}단계 · {r.first.label} · {r.label} ×{n} 적용 중</b> : `지역 연구 0 / ${REGION_RESEARCH_MAX}단계`}{n < REGION_RESEARCH_MAX && ` · 다음: 지역 몬스터 전부 연구 ${REGION_RESEARCH_FROM + n}단계 → ${n ? `${r.label} 한 번 더` : `첫 보너스 ${r.first.label} · ${r.label}`}`}</span>;
}

/** 자동 진행 한눈에 보기: 현재 목표 · 진행 상황 · 중단 조건 · 마지막 종료 사유. */
export function AutoRunStatus({ s }: { s: State }) {
    const d = s.dungeon ? dungeonById(s.dungeon!.id) : undefined, st = stageById(s.stage);
    const r = s.dungeon?.repeat;
    const target = s.target && s.target !== 'all' ? monsterById(s.target)?.name : undefined;
    const goal = d ? `${d.name}${d.id === 'abyss' ? ` ${s.dungeon!.depth || s.abyssBest + 1}층` : ''} 정복` : s.running ? `${st?.name || '사냥터'} 자동 사냥${target ? ` · ${target} 집중` : ''}` : '멈춤';
    const progress = d ? `웨이브 ${Math.min(s.dungeon!.wave + 1, d.monsters.length)} / ${d.monsters.length}${s.recovery > 0 ? ' · 입장 준비 중' : ''}` : s.running ? (s.recovery > 0 ? `회복 중 · ${s.recovery}턴 남음` : `전투 중 · 누적 처치 ${s.kills.toLocaleString()}`) : '시작 버튼을 누르면 자동 사냥을 시작합니다.';
    const stop = d ? (r ? (r.until !== undefined ? `${r.until}층 도달 또는 실패 시 → 자동 사냥으로 전환` : r.left === null ? '실패할 때까지 반복 → 이후 자동 사냥' : `${r.left === 0 ? '이번이 마지막 도전' : `이후 ${r.left}회 더`} · 실패 시 중단 → 자동 사냥`) : '정복하거나 실패하면 멈춤 (1회 도전)')
        : s.running ? '직접 멈출 때까지 · 패배하면 잠시 회복 후 계속' : '—';
    const items = [
        { icon: <Target size={14}/>, label: '현재 활동', value: goal, cls: 'text-accent' },
        { icon: <Gauge size={14}/>, label: '진행 상황', value: progress, cls: s.recovery > 0 ? 'text-warn' : '' },
        { icon: <Flag size={14}/>, label: '중단 조건', value: stop, cls: '' },
        { icon: <History size={14}/>, label: '마지막 종료 사유', value: s.runEnd ? s.runEnd.reason : '기록 없음', cls: 'text-ink-3' },
    ];
    return <section className="grid gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="자동 진행 상태">
        <header className="flex flex-wrap items-center justify-between gap-2"><div><span className="eyebrow">AUTO RUN · 사냥 · 던전</span><h2 className="flex items-center gap-1.5 font-display text-m font-bold"><Activity size={16}/> 자동 진행</h2></div>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold', s.running ? 'bg-ok/15 text-ok' : 'bg-surface-3 text-ink-3')}><i className={cn('size-1.5 rounded-full', s.running ? 'bg-ok' : 'bg-ink-3')}/>{s.running ? '진행 중' : '멈춤'}</span></header>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{items.map(x => <div key={x.label} className="rounded-m bg-surface-1 p-2.5"><span className="flex items-center gap-1 text-xs text-ink-3">{x.icon}{x.label}</span><p className={cn('mt-0.5 text-s', x.cls)}>{x.value}</p></div>)}</div>
    </section>;
}
