import { useState } from 'react';
import { EXPEDITION, unitById, CODEX_TIERS, codexTier, FEATS, difficultyOf, CODEX_LINK_KILLS, setById, setUnits, rotationSchedule, lockedBossUnits } from '@/game/data/expedition';
import { FoldSection, ChoiceChips } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { UnitArt } from './replay';
import { tags, Note, Link } from './parts';
import type { State } from '@/game/types';

/** v3.413 기록 탭(expedition-screen.tsx 에서 분리): 최근 판 · 도전 기록 · 유닛 도감. */
type SetDef = ReturnType<typeof setById>;
type Pool = ReturnType<typeof setUnits>;

export function RecentBox({ s, copy, copied }: { s: State; copy: (key: string, text: string) => void; copied: string }) {
    const recent = s.expeditionRecent || [];
    const fmtAt = (t: number) => { const d = new Date(t + 9 * 3600_000); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
    return recent.length ? <FoldSection level={3} defaultOpen title="최근 판" summary={<>{recent[0].cleared ? `완주${recent[0].abyss ? ` · 심연 ${recent[0].abyss}` : ''}` : `${Math.min(recent[0].round, EXPEDITION.rounds)}라운드까지`} · {recent[0].wins}승{s.expeditionAbyssBest ? ` · 심연 최고 ${s.expeditionAbyssBest}` : ''} · 최고 {s.expeditionBest || 0}승</>}>
        <ul className="grid gap-1">{recent.slice(0, 5).map((x, i) => <li key={i} className={cn('grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2.5 gap-y-1 rounded-m border border-line bg-surface-1 px-2.5 py-1.5 text-xs', x.cleared && 'border-ok/50')}><span className="font-num text-ink-3">{fmtAt(x.at)}</span><b>{x.difficulty && x.difficulty > 1 ? `${difficultyOf(x.difficulty).icon} ` : ''}{x.cleared ? `완주${x.abyss ? ` · 심연 ${x.abyss}` : ''}` : `${Math.min(x.round, EXPEDITION.rounds)}라운드까지`}</b><span>{x.wins}승 · 세계석 +{x.reward}{x.code ? <> · <Link onClick={() => copy(`recent${i}`, x.code!)}>{copied === `recent${i}` ? '복사됨' : '코드 복사'}</Link></> : null}</span><small className="col-span-2 col-start-2 text-ink-3">{x.why}</small></li>)}</ul></FoldSection> : null;
}

export function FeatBox({ s }: { s: State }) {
    const feats = s.expeditionFeats || {};
    return <FoldSection level={3} defaultOpen title="도전 기록" summary={`${FEATS.filter(f => feats[f.id]).length}/${FEATS.length}`}><ul className="grid gap-1 text-xs">{FEATS.map(f => <li key={f.id} className={feats[f.id] ? 'text-ink-1' : 'text-ink-3'}>{feats[f.id] ? <span className="text-ok">✓ </span> : null}<b>{f.name}</b> · {f.desc}{feats[f.id] ? <small> · {feats[f.id]}회 · 칭호 {f.title}</small> : <small className="text-ink-3"> · 칭호 {f.title}</small>}</li>)}</ul></FoldSection>;
}

/** v3.431 유닛 도감: 이번 주 세트와 다음 로테이션 세트들의 유닛을 골라 봅니다. 다른 주 세트는 이번 주에 없는 유닛에 ‘새로’, 쉬는 유닛을 함께 표시합니다. */
export function CodexBox({ s, curSet, pool, now }: { s: State; curSet: SetDef; pool: Pool; now?: number }) {
    const unitWins = s.expeditionStats?.unitWins || {}, unitUse = s.expeditionStats?.units || {};
    const schedule = now ? rotationSchedule(now) : [{ set: curSet, start: 0 }];
    const [pick, setPick] = useState(0);
    const shown = schedule[Math.min(pick, schedule.length - 1)] || schedule[0], viewSet = shown.set, viewPool = shown.set.id === curSet.id ? pool : setUnits(viewSet.id);
    const thisWeek = new Set(pool.map(u => u.id)), resting = pool.filter(u => !viewPool.some(v => v.id === u.id));
    const locked = lockedBossUnits(s.book);
    const md = (t: number) => { const d = new Date(t + 9 * 3600_000); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
    return <FoldSection level={3} defaultOpen title="유닛 도감" summary={`${curSet.icon} ${curSet.name} ${pool.filter(u => unitWins[u.id] > 0).length}/${pool.length} 승리 · 금 ${Object.values(unitWins).filter(n => codexTier(n) >= 3).length}`}>
        <Note>보드에 두고 이긴 라운드 수로 숙달이 오릅니다: {CODEX_TIERS.map(t => `${t.name} ${t.wins}승`).join(' · ')}. 30종 모두 이기면 칭호 📘, 금 5종이면 🏅. 동 · 은 · 금마다 본편 도감 처치 +{CODEX_LINK_KILLS.join(' · +')}. 세트는 한국 시간 월요일 0시마다 바뀝니다.</Note>
        {schedule.length > 1 ? <ChoiceChips label="로테이션 세트" value={String(pick)} onChange={v => setPick(Number(v))} options={schedule.map((x, k) => ({ value: String(k), label: `${k === 0 ? '이번 주' : `${md(x.start)}~`} ${x.set.icon} ${x.set.name}` }))}/> : null}
        <Note>{pick === 0 ? `${viewSet.icon} ${viewSet.name}: ${viewSet.desc}` : `${md(shown.start)}(월) 0시부터 ${viewSet.icon} ${viewSet.name}: 이번 주에 없는 유닛 ${viewPool.filter(u => !thisWeek.has(u.id)).length}종(‘새로’ 표시)${resting.length ? ` · 쉬는 유닛 ${resting.map(u => u.name).join(' · ')}` : ''}.`}{pick === 0 && setById(curSet.id).remove?.length ? ` 이번 세트에서 쉬는 유닛: ${setById(curSet.id).remove!.map(id => unitById(id)?.name).join(' · ')}(기록은 남고 다른 세트에 돌아옴).` : ''}</Note>
        <div className="exp-codex-grid">{[...viewPool].sort((a, b) => a.cost - b.cost).map(def => { const w = unitWins[def.id] || 0, tier = codexTier(w), fresh = pick > 0 && !thisWeek.has(def.id); return <div key={def.id} className={`exp-codex-unit cost-${def.cost} tier-${tier}${w || fresh ? '' : ' unseen'}${fresh ? ' fresh' : ''}`} title={`${def.name} · ${tags(def)} · 배치 ${unitUse[def.id] || 0} · 승리 ${w}`}>{fresh ? <span className="exp-codex-new">새로</span> : null}<UnitArt def={def} size={26}/><b>{def.name}</b><small>{tags(def)}</small><small>{w ? `${w}승${tier ? ` · ${CODEX_TIERS[tier - 1].name}` : ''}` : unitUse[def.id] ? '아직 승리 없음' : fresh ? (locked.has(def.id) ? '🔒 본편 처치 필요' : `${md(shown.start)}부터 상점에`) : '미등록'}</small></div>; })}</div>
    </FoldSection>;
}
