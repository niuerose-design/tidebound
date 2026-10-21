'use client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { MONSTERS, SWARM_SIZES, SWARM_UNLOCK } from '@/game/data/world';
import { BALANCE } from '@/game/data/balance';
import { PROGRESSION } from '@/game/data/progression';
import { bookPending, bookTierReq } from '@/game/systems/progression';
import { bookStage } from '@/game/systems/book';
import { BOOK_ECOLOGY } from '@/game/data/book-traits';
import { Meter } from './shared';

const MILESTONES = BALANCE.bookMilestones;
/** 연구 단계를 달성하면 바로 적용되는 전투 보상. v27.81 2단계부터 연구 효과(예전 이름 생태 연구, 이 몬스터 상대 보정)만 오릅니다. */
function stepEffect(_id: string, rank: number) {
    const i = rank + 1 - BOOK_ECOLOGY.fromStage, pct = (n: number) => Number((n * 100).toFixed(1));
    if (i < 0) return '적 정보 공개';
    const dealt = BOOK_ECOLOGY.dealt.slice(0, i + 1).reduce((a, n) => a + n, 0), taken = BOOK_ECOLOGY.taken.slice(0, i + 1).reduce((a, n) => a + n, 0);
    return `연구 효과 +${pct(dealt)}% / -${pct(taken)}%`;
}
/** 이 연구 단계 구간(이전 목표 초과 ~ 이번 목표 이하)에서 열리는 무리 사냥 규모. 목표와 해금 수가 다르면 해금 수를 같이 적습니다. */
const swarmAt = (rank: number, n: number) => SWARM_SIZES.filter(size => size > 1 && SWARM_UNLOCK[size] > (MILESTONES[rank - 1] || 0) && SWARM_UNLOCK[size] <= MILESTONES[rank])
    .map(size => `무리 변종 ×${size} ${SWARM_UNLOCK[size] === MILESTONES[rank] ? '해금' : n >= SWARM_UNLOCK[size] ? `해금(${SWARM_UNLOCK[size].toLocaleString()}회 달성)` : `${SWARM_UNLOCK[size].toLocaleString()}회에 해금`}`);
/** v27.81 단계 보상: SP(4단계부터)와 무리 해금. */
const stepReward = (rank: number, n: number, swarm: boolean) => [PROGRESSION.bookSP[rank] ? `SP +${PROGRESSION.bookSP[rank]}` : '', ...(swarm ? swarmAt(rank, n) : [])].filter(Boolean).join(' · ');

/** 연구 진행: 처치 수 → 다음 연구 목표 → 받을 보상 → 수령 여부. 끝난 단계는 접어서 아래에 둡니다. 사냥터 몬스터(swarm)은 단계 보상에 무리 사냥 해금도 같이 적습니다. */
export function BookResearch({ s, id, send, busy, swarm = false }: { s: State; id: string; send: (a: Action) => void; busy: boolean; swarm?: boolean }) {
    const n = s.book[id] || 0, claimed = s.bookClaims?.[id] || 0, pending = bookPending(s, id);
    const reached = bookStage(s, id), next = reached < MILESTONES.length ? reached : -1, best = s.bookTier?.[id] || 0;
    /** v27.80 5단계부터 난이도 조건: 처치 수를 채워도 그 난이도 이상에서 잡은 적이 없으면 멈춥니다. */
    const tierText = (r: number) => bookTierReq(r) ? ` + 난이도 ${bookTierReq(r)} 이상 처치${best >= bookTierReq(r) ? ' ✓' : ` (최고 ${best})`}` : '';
    return <section className="book-block book-research">
        <h4>연구 진행 <small>{reached} / {MILESTONES.length}단계 달성</small></h4>
        <dl className="book-research-rows">
            <div><dt>처치 수</dt><dd>{n.toLocaleString()}회</dd></div>
            <div><dt>다음 연구 목표</dt><dd>{next < 0 ? '모든 단계 달성' : `${MILESTONES[next].toLocaleString()}회${n < MILESTONES[next] ? ` (남은 ${(MILESTONES[next] - n).toLocaleString()}회)` : ' ✓'}${tierText(next)}`}</dd></div>
            {next >= 0 && <div><dt>달성하면</dt><dd>{stepReward(next, n, swarm) || '능력치만'}</dd><small>{stepEffect(id, next)}</small></div>}
            {pending.ranks.length > 0 && <div><dt>수령 여부</dt><dd><b className="positive">미수령 SP +{pending.sp}</b></dd></div>}
        </dl>
        {/* v3.95 막대는 처치 수 그대로(이전 목표부터의 구간으로 그리면 '남은 N회'와 숫자가 어긋나 보임). */}
        {next >= 0 && <Meter value={Math.min(n, MILESTONES[next])} max={MILESTONES[next]} label={`${next + 1}단계까지`}/>}
        {pending.ranks.length > 0 && <Button type="button" size="sm" className="justify-self-start bg-gold-ink text-surface-0 hover:bg-gold-ink/90 pointer-coarse:min-h-11" disabled={busy} onClick={() => send({ type: 'claimBook', id })}>연구 보상 받기 · SP +{pending.sp}</Button>}
        {reached > 0 && <details className="book-done">
            <summary><ChevronDown size={13}/>달성한 연구 {reached}단계</summary>
            <ul>{MILESTONES.slice(0, reached).map((m, r) => <li key={m}><span>{m.toLocaleString()}회{bookTierReq(r) ? ` · 난이도 ${bookTierReq(r)}+` : ''}</span><span>{stepReward(r, n, swarm) || '능력치만'}</span><span className={r < claimed ? 'positive' : ''}>{!PROGRESSION.bookSP[r] ? '' : r < claimed ? <><CheckCircle2 size={12}/> 수령</> : '미수령'}</span></li>)}</ul>
        </details>}
    </section>;
}

export function pendingBookCount(s: State) { return MONSTERS.reduce((a, f) => a + bookPending(s, f.id).ranks.length, 0); }
