'use client';
/** v3.392 치장(새 토대): 칭호와 계급. 이름 옆에는 칭호나 계급장 중 하나를 보여 줍니다(채팅도 같음). 칭호는 업적으로, 계급은 처치한 마릿수로 얻습니다. */
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Medal } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { TITLES, unlockedTitles, displayTitle, titleById } from '@/game/data/titles';
import { RANKS, RANK_CUMULATIVE, RANK_PERKS, rankProgress, rankPointsEarned, rankPointsFree, rankPerkLevel, reenlistCount, REENLIST_BONUS_POINTS } from '@/game/data/rank';
import { RankInsignia } from '@/components/game/rank-insignia';
import { SectionHeader, ChoiceChips, ConfirmAction, FoldSection, StatBar } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Send = (a: Action) => void;
const FLOW_KEY = 'tidebound.rankFlow', TITLE_PAGE = 8;

export function CosmeticsScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const owned = new Set(unlockedTitles(s).map(t => t.id)), current = displayTitle(s), chosen = titleById(s.title), badge = s.badge || 'title';
    const p = rankProgress(s), earned = rankPointsEarned(s), free = rankPointsFree(s), reenlisted = reenlistCount(s), top = !p.next;
    // v3.18 계급 흐름도 방향(세로 기본). 이 기기에 기억.
    const [flow, setFlow] = useState<'column' | 'row'>('column');
    useEffect(() => { const t = setTimeout(() => { try { if (localStorage.getItem(FLOW_KEY) === 'row') setFlow('row'); } catch { /* 저장소 없음 */ } }, 0); return () => clearTimeout(t); }, []);
    const pickFlow = (v: string) => { setFlow(v as 'column' | 'row'); try { localStorage.setItem(FLOW_KEY, v); } catch { /* 저장소 없음 */ } };
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="APPEARANCE" title="칭호와 계급" description="이름 옆에는 칭호나 계급장 중 하나를 보여 줍니다(채팅도 같음). 칭호는 업적으로, 계급은 처치한 마릿수로 얻습니다."/>
        <div className="grid items-start gap-4 lg:grid-cols-2">
            <FoldSection title="칭호" summary={`${current ? `표시 중 · ${current}` : '표시 안 함'} · ${owned.size} / ${TITLES.length} 획득`} defaultOpen>
                <div className="mb-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" aria-pressed={badge === 'title'} className={cn(badge === 'title' && 'border-accent text-accent')} disabled={busy || badge === 'title'} onClick={() => send({ type: 'badge', id: 'title' })}>이름 옆에 칭호 표시</Button>
                    <Button type="button" variant="outline" size="sm" aria-pressed={s.title === undefined} className={cn(s.title === undefined && 'border-accent text-accent')} disabled={busy} onClick={() => send({ type: 'title', id: 'auto' })}>자동(최근 획득)</Button>
                    <Button type="button" variant="outline" size="sm" aria-pressed={s.title === null} className={cn(s.title === null && 'border-accent text-accent')} disabled={busy} onClick={() => send({ type: 'title', id: 'none' })}>표시 안 함</Button>
                </div>
                <TitlePager send={send} busy={busy} owned={owned} chosenId={chosen?.id}/>
            </FoldSection>
            <FoldSection title="계급" summary={`${p.rank.name}${reenlisted ? ` ★${reenlisted}` : ''} · 진급 포인트 ${free} / ${earned}`} defaultOpen>
                <div className="mb-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" aria-pressed={badge === 'rank'} className={cn(badge === 'rank' && 'border-accent text-accent')} disabled={busy || badge === 'rank'} onClick={() => send({ type: 'badge', id: 'rank' })}>이름 옆에 계급장 표시</Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy || earned === free} title="쓴 진급 포인트를 모두 돌려받습니다 (무료)" onClick={() => send({ type: 'rankPerk', id: 'reset' })}>특전 초기화</Button>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-3 rounded-m bg-surface-1 p-3" title={`계급표(각 계급까지 추가 처치 수): ${RANKS.map((r, i) => `${r.name}${i ? ` ${r.need.toLocaleString()}` : ''}`).join(' → ')}`}>
                    <RankInsignia index={p.index} size={44} title={p.rank.name} ring={reenlisted}/>
                    <div className="grid min-w-0 flex-1 gap-1">
                        <b className="text-s font-semibold">{p.rank.name}{reenlisted ? <small className="ml-1 text-xs font-normal text-gold-ink">★ 재입대 {reenlisted}회 · 진급 포인트 +{reenlisted * REENLIST_BONUS_POINTS}</small> : null}</b>
                        <small className="text-xs text-ink-3">{p.next ? `${p.next.name}까지 ${(p.need - p.have).toLocaleString()}마리` : '최고 계급'} · 누적 처치 {p.exp.toLocaleString()}마리</small>
                        {p.next && <StatBar value={p.have} max={p.need} size="s" showText={false} label="다음 계급까지"/>}
                    </div>
                    {/* v3.165 재입대: 중장일 때만 켜집니다(자동 사냥 중 · 던전 안에서는 꺼짐). */}
                    <ConfirmAction label="재입대" icon={<Medal size={14}/>} title="재입대" variant="outline" className="border-danger/60 text-danger"
                        hint={!top ? `${RANKS[RANKS.length - 1].name}에서만 재입대할 수 있습니다. 계급을 ${RANKS[0].name}으로 되돌리고 진급 포인트를 영구로 +${REENLIST_BONUS_POINTS} 받습니다(지금 +${reenlisted * REENLIST_BONUS_POINTS}).` : s.running || s.dungeon ? '자동 사냥을 멈추고 던전 밖에서 재입대할 수 있습니다.' : `계급을 ${RANKS[0].name}으로 되돌리고 진급 포인트를 영구로 +${REENLIST_BONUS_POINTS} 받습니다(지금 +${reenlisted * REENLIST_BONUS_POINTS}). 특전은 초기화되어 새 계급 기준으로 다시 찍습니다.`}
                        description={`계급 ${p.rank.name} → ${RANKS[0].name}. 특전 초기화 · 진급 포인트 영구 +${REENLIST_BONUS_POINTS}(${reenlisted + 1}회째). 되돌릴 수 없습니다.`} disabled={busy || !top || s.running || !!s.dungeon} onConfirm={() => send({ type: 'reenlist' })} confirmLabel="재입대"/>
                </div>
                <ul className="mb-4 grid gap-1.5">{RANK_PERKS.map(perk => { const level = rankPerkLevel(s, perk.id), maxed = level >= perk.max; return <li key={perk.id} className={cn('flex items-center gap-3 rounded-m border border-line bg-surface-1 p-2.5', !level && 'opacity-80')}>
                    <div className="min-w-0 flex-1"><div className="text-s font-semibold">{perk.name} <span className="font-num text-xs text-ink-3">{level}/{perk.max}</span></div><div className="text-xs text-ink-3">{perk.desc(Math.max(1, level))}{level ? '' : ' (1단계 기준)'}</div></div>
                    <Button type="button" variant={maxed ? 'outline' : 'default'} size="sm" className={cn(!maxed && 'bg-accent text-accent-ink hover:bg-accent/90')} disabled={busy || maxed || free < perk.cost} onClick={() => send({ type: 'rankPerk', id: perk.id })}>{maxed ? '최대' : '올리기 · 1P'}</Button>
                </li>; })}</ul>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-s font-semibold">계급 흐름도 <small className="font-normal text-ink-3">계급 이름 아래는 그 계급에 오르는 누적 처치 수</small></h3><ChoiceChips label="흐름도 방향" value={flow} onChange={pickFlow} options={[{ value: 'column', label: '세로' }, { value: 'row', label: '가로' }]}/></div>
                <ol className={cn('gap-1', flow === 'row' ? 'flex overflow-x-auto pb-2' : 'grid')} aria-label="계급 흐름도">{RANKS.map((r, i) => { const state = i < p.index ? 'passed' : i === p.index ? 'current' : 'locked'; return <li key={r.id} className={cn('flex items-center gap-2 rounded-m border px-2 py-1.5', flow === 'row' ? 'w-28 shrink-0 flex-col text-center' : '', state === 'current' ? 'border-accent/60 bg-accent-soft' : state === 'passed' ? 'border-line bg-surface-1' : 'border-line/60 bg-surface-1 opacity-60')} title={`${r.name} · ${r.group} · 진급 포인트 +${r.points}`}>
                    <RankInsignia index={i} size={flow === 'row' ? 34 : 28} title={r.name}/>
                    <span className="grid min-w-0 flex-1 leading-tight"><b className="truncate text-xs font-semibold">{r.name}</b><small className="font-num text-xs text-ink-3">{i ? `${RANK_CUMULATIVE[i].toLocaleString()}마리` : '시작'}</small>{flow === 'column' && <small className="text-xs text-ink-3">{r.group} · 진급 +{r.points}P{i === p.index && p.next ? ` · ${p.next.name}까지 ${(p.need - p.have).toLocaleString()}마리` : ''}</small>}</span>
                    {i === p.index && <em className="rounded-s bg-accent px-1.5 py-0.5 text-xs font-semibold not-italic text-accent-ink">현재</em>}
                </li>; })}</ol>
                <p className="mt-2 text-xs text-ink-3">진급 포인트는 병 1 · 부사관 2 · 장교 3 · 장성 4(합계 41)이고 특전은 단계당 1P입니다. 언제든 무료로 초기화합니다.</p>
            </FoldSection>
        </div>
    </div>;
}

/** v3.205 칭호 목록: 한 쪽에 TITLE_PAGE 개씩, 왼쪽 · 오른쪽 화살표로 넘깁니다. 처음에는 장착 중인 칭호가 있는 쪽을 엽니다. */
function TitlePager({ send, busy, owned, chosenId }: { send: Send; busy: boolean; owned: Set<string>; chosenId?: string }) {
    const pages = Math.max(1, Math.ceil(TITLES.length / TITLE_PAGE)), start = Math.max(0, Math.floor(TITLES.findIndex(t => t.id === chosenId) / TITLE_PAGE));
    const [page, setPage] = useState(start), at = Math.min(page, pages - 1), rows = TITLES.slice(at * TITLE_PAGE, at * TITLE_PAGE + TITLE_PAGE);
    return <div className="grid gap-2">
        <div className="flex items-center justify-center gap-3 text-xs text-ink-3">
            <Button type="button" variant="outline" size="icon-sm" className="pointer-coarse:min-w-11" aria-label="이전 칭호" disabled={at === 0} onClick={() => setPage(at - 1)}><ChevronLeft size={16}/></Button>
            <span className="font-num">{at + 1} / {pages}</span>
            <Button type="button" variant="outline" size="icon-sm" className="pointer-coarse:min-w-11" aria-label="다음 칭호" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}><ChevronRight size={16}/></Button>
        </div>
        <ul className="grid gap-1.5">{rows.map(t => { const got = owned.has(t.id), on = chosenId === t.id; return <li key={t.id} className={cn('flex items-center gap-3 rounded-m border p-2.5', on ? 'border-accent/60 bg-accent-soft' : 'border-line bg-surface-1', !got && 'opacity-60')}>
            <div className="min-w-0 flex-1"><div className="text-s font-semibold text-gold-ink">{t.name}</div><div className="text-xs text-ink-3">{t.group} · {t.desc}</div></div>
            {got ? <Button type="button" variant="outline" size="sm" className={cn(on && 'border-accent text-accent')} disabled={busy || on} onClick={() => send({ type: 'title', id: t.id })}>{on ? '장착 중' : '장착'}</Button> : <span className="text-xs text-ink-3">미획득</span>}
        </li>; })}</ul>
    </div>;
}
