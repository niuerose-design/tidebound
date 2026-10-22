import { questById, DIFFICULTIES } from '@/game/data/expedition';
import { StatBar } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { Head, Note } from './parts';
import type { State } from '@/game/types';

/** v3.413 출발 화면 · 과제 탭 조각(expedition-screen.tsx 에서 분리): 난이도 고르기 · 과제 목록. */

export function DiffPicker({ s, busy, unlocked, chosenDiff, setDiff }: { s: State; busy: boolean; unlocked: number; chosenDiff: number; setDiff: (n: number) => void }) {
    return <div className="grid gap-2" aria-label="난이도">
        <Head title="난이도" aside="아래 단계를 완주하면 다음 단계가 열립니다"/>
        <div className="exp-diff-list">{DIFFICULTIES.map(d => { const locked = d.level > unlocked, best = s.expeditionDiffBest?.[d.level], clears = s.expeditionDiffClears?.[d.level] || 0; return <button type="button" key={d.level} className={`exp-diff-card${chosenDiff === d.level ? ' on' : ''}${locked ? ' locked' : ''}`} disabled={busy || locked} aria-pressed={chosenDiff === d.level} onClick={() => setDiff(d.level)}><b>{d.icon} {d.name}</b><small>{d.desc}</small><small className="exp-diff-reward">보상 ×{d.reward}{d.score ? ` · 시즌 점수 +${d.score}` : ''}</small><small className="text-ink-3">{locked ? `🔒 ${DIFFICULTIES[d.level - 2].name} 완주 필요` : clears ? `완주 ${clears}회 · 최고 ${best?.wins || 0}승${best?.abyss ? ` · 심연 ${best.abyss}` : ''}` : best ? `최고 ${best.wins}승` : '기록 없음'}</small></button>; })}</div>
    </div>;
}

export function QuestBox({ q, stale }: { q: State['expeditionQuests']; stale: boolean }) {
    const questList = (list: { id: string; n: number; done?: boolean }[]) => <ul className="grid gap-1.5">{list.map(st => { const def = questById(st.id); if (!def) return null; return <li key={st.id} className={cn('grid gap-1 rounded-m border border-line bg-surface-1 p-2 text-xs', st.done && 'border-ok/50')}><div className="flex items-baseline justify-between gap-2"><b>{st.done ? <span className="text-ok">✓ </span> : null}{def.name}</b><small className="whitespace-nowrap text-gold-ink">{st.done ? '완료' : `${st.n} / ${def.target}`} · 세계석 {def.pearls} · 숙련 {def.xp}</small></div><small className="text-ink-3">{def.desc}</small><StatBar tone="warn" size="s" showText={false} value={st.n} max={def.target}/></li>; })}</ul>;
    return <div className="grid gap-2" aria-label="원정 과제">
        <Head title="과제" aside={stale ? '새 과제는 다음 행동 때 바뀝니다' : '한국 시간 자정 · 월요일에 새로'}/>
        {q ? <div className="grid gap-3 sm:grid-cols-2"><div className="grid content-start gap-1.5"><h3 className="text-xs font-semibold text-ink-3">오늘</h3>{questList(q.daily)}</div><div className="grid content-start gap-1.5"><h3 className="text-xs font-semibold text-ink-3">이번 주</h3>{questList(q.weekly)}</div></div> : <Note>원정을 출발하면 오늘 · 이번 주 과제가 생깁니다. 완료하면 바로 세계석과 숙련 경험치를 받습니다.</Note>}
    </div>;
}
