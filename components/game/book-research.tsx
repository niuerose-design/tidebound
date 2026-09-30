'use client';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { FISH, STAGES } from '@/game/data/world';
import { BALANCE } from '@/game/data/balance';
import { PROGRESSION } from '@/game/data/progression';
import { bookPending } from '@/game/systems/progression';
import { bookTrait, bonusLabel } from '@/game/systems/book';
import { BOOK_TRAITS, BOOK_ECOLOGY, REGION_THEMES } from '@/game/data/book-traits';
import { Meter } from './shared';

const MILESTONES = BALANCE.bookMilestones;
/** 연구 단계를 달성하면 바로 적용되는 전투 보상. 생태 연구는 2단계부터 붙습니다. */
export function stepEffect(id: string, rank: number) {
    const trait = BOOK_TRAITS[bookTrait(id)];
    const ecology = rank + 1 >= BOOK_ECOLOGY.fromStage ? ` · 생태 연구: 이 어종 상대 주는 피해 +${BOOK_ECOLOGY.dealtPerStage * 100}% · 받는 공격 피해 -${BOOK_ECOLOGY.takenPerStage * 100}%` : '';
    return `${trait.name} 연구 ${bonusLabel(trait.perStage)}${ecology}`;
}
const stepReward = (rank: number) => [`${PROGRESSION.bookGold[rank].toLocaleString()} G`, PROGRESSION.bookSP[rank] ? `SP +${PROGRESSION.bookSP[rank]}` : ''].filter(Boolean).join(' · ');

/** 연구 진행: 처치 수 → 다음 연구 목표 → 받을 보상 → 수령 여부. 끝난 단계는 접어서 아래에 둡니다. */
export function BookResearch({ s, id, send, busy }: { s: State; id: string; send: (a: Action) => void; busy: boolean }) {
    const n = s.book[id] || 0, claimed = s.bookClaims?.[id] || 0, pending = bookPending(s, id);
    const reached = MILESTONES.filter(m => n >= m).length, next = reached < MILESTONES.length ? reached : -1;
    return <section className="book-block book-research">
        <h4>연구 진행 <small>플레이어 보상</small></h4>
        <dl className="book-research-rows">
            <div><dt>처치 수</dt><dd>{n.toLocaleString()}회</dd></div>
            <div><dt>다음 연구 목표</dt><dd>{next < 0 ? '모든 단계 달성' : `${next + 1}단계 · ${MILESTONES[next].toLocaleString()}회 (남은 ${(MILESTONES[next] - n).toLocaleString()}회)`}</dd></div>
            {next >= 0 && <div><dt>받을 보상</dt><dd>{stepReward(next)}</dd><small>달성하면 바로 적용: {stepEffect(id, next)}</small></div>}
            <div><dt>수령 여부</dt><dd>{pending.ranks.length ? <b className="positive">미수령 {pending.ranks.length}단계</b> : next < 0 ? '모두 수령' : '목표 미달성'}</dd></div>
        </dl>
        {next >= 0 && <Meter value={n - (MILESTONES[next - 1] || 0)} max={MILESTONES[next] - (MILESTONES[next - 1] || 0)} label={`${next + 1} / ${MILESTONES.length}단계 진행`}/>}
        {pending.ranks.length > 0 && <button className="gold-button" disabled={busy} onClick={() => send({ type: 'claimBook', id })}>{pending.ranks.length > 1 ? `${pending.ranks.length}단계 보상 한 번에 받기` : '연구 보상 받기'} · {[`${pending.gold.toLocaleString()} G`, pending.sp ? `SP +${pending.sp}` : ''].filter(Boolean).join(' · ')}</button>}
        {reached > 0 && <details className="book-done">
            <summary><ChevronDown size={13}/>달성한 연구 {reached}단계</summary>
            <ul>{MILESTONES.slice(0, reached).map((m, r) => <li key={m}><span>{r + 1}단계 · {m.toLocaleString()}회</span><span>{stepReward(r)}</span><span className={r < claimed ? 'positive' : ''}>{r < claimed ? <><CheckCircle2 size={12}/> 수령</> : '미수령'}</span></li>)}</ul>
        </details>}
    </section>;
}

/** 한 지역의 연구 진행도와 지역 완성 보상. 낚시터 카드와 도감 지역 제목에서 같이 씁니다. */
export function regionResearch(s: State, stageId: string) {
    const st = STAGES.find(x => x.id === stageId)!;
    const done = st.fish.filter(id => (s.book[id] || 0) >= PROGRESSION.fishComplete).length;
    const pending = st.fish.reduce((a, id) => a + bookPending(s, id).ranks.length, 0);
    return { done, total: st.fish.length, complete: done === st.fish.length, pending, reward: `${REGION_THEMES[st.id]?.label ? REGION_THEMES[st.id].label + ' · ' : ''}AP +1` };
}

export function pendingBookCount(s: State) { return FISH.reduce((a, f) => a + bookPending(s, f.id).ranks.length, 0); }

export function RegionProgress({ s, id }: { s: State; id: string }) {
    const r = regionResearch(s, id);
    return <span className="region-research">{r.complete ? `지역 연구 완료 · ${r.reward} 적용 중` : `지역 연구 ${r.done} / ${r.total}종 완성 · 완성 보상 ${r.reward}`}{r.pending > 0 && <b className="positive"> · 미수령 {r.pending}단계</b>}</span>;
}
