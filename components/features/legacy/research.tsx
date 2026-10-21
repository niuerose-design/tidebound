'use client';
/** v3.398 세계석 연구 탭: 연구 카드(현재 → 다음 효과) · 묶음 접기 · 서약 설명 팝오버 · 탭별 재분배. 서버 행동(permanent · resetResearch)은 전과 같습니다. */
import { useState } from 'react';
import { Info } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FoldSection, ConfirmAction } from '@/components/ui/game';
import { RESEARCH, RESEARCH_TABS, RESEARCH_GROUPS, researchCost, researchEffect, researchUnlocked, researchMaxFor, type ResearchDef, type ResearchTab } from '@/game/data/economy';
import { researchRefund } from '@/game/systems/commerce';
import { VOW_IDS, VOW_NAMES, VOW_RESEARCH, type VowId } from '@/game/systems/vows';
import { ASCENSION } from '@/game/data/ascension';
import { cn } from '@/lib/utils';
import { Card, Note } from './parts';
import { VOW_TEXT } from './vows';

type Send = (a: Action) => void;
const VOW_BY_RESEARCH = Object.fromEntries(VOW_IDS.map(id => [VOW_RESEARCH[id], id])) as Record<string, VowId>;

/** 서약 연구 카드의 설명 팝업: 서약이 무엇인지, 어떻게 거는지, 이 서약의 제약과 보상. */
function VowInfo({ id, s }: { id: VowId; s: State }) {
    return <Popover>
        <PopoverTrigger asChild><button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-s px-1 text-xs text-accent outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-accent/50" aria-label={`${VOW_NAMES[id]} 서약 설명`}><Info size={14}/><span>서약이란?</span></button></PopoverTrigger>
        <PopoverContent className="grid w-80 gap-2 text-xs leading-relaxed" side="bottom" align="start">
            <strong className="text-s">서약 · {VOW_NAMES[id]}</strong>
            <p>서약은 다음 생에 스스로 거는 제약입니다. 더 어렵게 플레이하는 대신 고유한 보상을 받습니다.</p>
            <p><b>이 서약:</b> {VOW_TEXT[id](s)}</p>
            <p><b>거는 법:</b> 이 연구로 해금한 뒤 환생 화면 아래 ‘서약’에서 ‘다음 생에 걸기’를 켜고 환생하면 그 생 동안 적용됩니다. 여러 서약을 함께 걸 수 있습니다.</p>
            <p><b>연구 단계:</b> 1단계 해금, 2·3단계는 보상만 50%씩 강화합니다(제약은 그대로).</p>
        </PopoverContent>
    </Popover>;
}
/** 세계석 연구 카드: 현재 → 다음 효과, 잠긴 연구는 해금 환생 횟수를 보여줍니다. */
function ResearchCard({ r, s, send, busy }: { r: ResearchDef; s: State; send: Send; busy: boolean }) {
    // v3.31 승천해야 열리는 단계(행운의 편지 6~10)와 환생 200회부터의 연구 구매 잠금.
    const rank = s.permanent[r.id] || 0, cost = researchCost(r.id, rank), unlocked = researchUnlocked(s.rebirths, r), maxed = rank >= r.max, capped = !maxed && rank >= researchMaxFor(s, r), locked200 = s.rebirths >= ASCENSION.researchLockAt;
    return <article className={cn('grid content-start gap-2 rounded-m border border-line bg-surface-1 p-3', !unlocked && 'opacity-70')}>
        <div className="flex flex-wrap items-center gap-x-2"><h3 className="text-s font-semibold">{r.name}</h3>{VOW_BY_RESEARCH[r.id] && <VowInfo id={VOW_BY_RESEARCH[r.id]} s={s}/>}</div>
        <p className="text-xs leading-relaxed text-ink-2">{r.desc}{r.levels ? '' : <small className="text-ink-3"> (1단계당)</small>}</p>
        <p className="font-num text-xs text-accent">{maxed ? `${researchEffect(r, rank)} · 최대` : `${rank || r.levels ? researchEffect(r, rank) : `${r.label} +0`} → ${researchEffect(r, rank + 1)}`}</p>
        <div className="mt-auto flex items-center justify-between gap-2"><small className="font-num text-xs text-ink-3">연구 {rank} / {r.max}{r.ascendAbove !== undefined ? ` · ${r.ascendAbove + 1}단계부터 승천 후` : ''}</small>
            <Button type="button" size="sm" variant="outline" disabled={busy || !unlocked || maxed || capped || locked200 || s.pearls < cost} onClick={() => send({ type: 'permanent', id: r.id })}>{!unlocked ? `환생 ${r.rebirth}회 필요` : maxed ? '연구 완료' : capped ? '승천 후 열림' : locked200 ? `환생 ${ASCENSION.researchLockAt}회 · 구매 잠김` : `${cost} 세계석`}</Button></div>
    </article>;
}
export function ResearchTabView({ tab, s, send, busy }: { tab: ResearchTab; s: State; send: Send; busy: boolean }) {
    const list = RESEARCH.filter(r => r.tab === tab), name = RESEARCH_TABS.find(x => x.id === tab)!.name;
    const groups = tab === 'combat' ? (['attack', 'defense'] as const) : tab === 'utility' ? (['basic', 'special', 'vow'] as const) : [undefined];
    const { refund, spent } = researchRefund(s, tab);
    // v3.24 묶음(공격·방어·기본·특별·서약)을 접고 펼칩니다. 탭을 바꿔도 접어 둔 묶음은 그대로입니다.
    const [folded, setFolded] = useState<Record<string, boolean>>({});
    return <>
        {groups.map(g => { const items = list.filter(r => !g || r.group === g), done = items.reduce((n, r) => n + Math.min(r.max, s.permanent[r.id] || 0), 0), total = items.reduce((n, r) => n + r.max, 0);
            const grid = <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{items.map(r => <ResearchCard key={r.id} r={r} s={s} send={send} busy={busy}/>)}</div>;
            return g ? <FoldSection key={g} title={RESEARCH_GROUPS[g]} summary={`${items.length}개 · 연구 ${done} / ${total}`} defaultOpen={!folded[g]} onOpenChange={open => setFolded(f => ({ ...f, [g]: !open }))}>{grid}</FoldSection> : <div key="all">{grid}</div>; })}
        <Card className="sm:flex sm:items-center sm:justify-between">
            <div className="grid gap-1"><strong className="text-s">{name} 연구 재분배</strong><Note>{spent ? `이 탭에 쓴 세계석 ${spent}개 중 ${refund}개를 돌려받고 ${name} 연구 단계를 모두 0으로 되돌립니다.` : `${name} 탭에 쓴 세계석이 없습니다.`} 재분배는 언제나 무료이며 쓴 세계석을 모두 돌려받습니다. 자동 사냥과 던전을 멈춘 상태에서만 할 수 있습니다.</Note></div>
            <ConfirmAction label={`재분배 · 세계석 +${refund}`} title={`${name} 연구를 재분배할까요?`} description={`${name} 탭의 연구 단계가 모두 0이 되고 세계석 ${refund}개를 모두 돌려받습니다.`} disabled={busy || refund <= 0 || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetResearch', id: tab })}/>
        </Card>
    </>;
}
