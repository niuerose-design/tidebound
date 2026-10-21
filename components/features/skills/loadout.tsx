'use client';
/** v3.385 현재 편성: 액티브(판정 순서, 끌기 · 화살표) · 패시브 · 추가 판정 · 편성 저장 칸 3개. 서버 행동은 전과 같음(setSkills · skillUp · skill · extraRoll · savePreset · loadPreset · renamePreset). */
import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Button } from '@/components/ui/button';
import { FoldSection, ConfirmAction } from '@/components/ui/game';
import { SkillIcon } from '@/components/game/shared';
import { cn } from '@/lib/utils';
import { skillById } from '@/game/data/skills';
import { loadoutSkillAP, apCapacity, apUsed, effectiveSkill, skillLevel, skillMastery, validLoadout } from '@/game/systems/progression';
import { extraRollLevel } from '@/game/systems/progression';
import { researchRank, researchById } from '@/game/data/economy';
import { SKILL_FORMULA } from '@/game/data/balance';

type Send = (a: Action) => void;
export function Loadout({ s, send, busy, recommended }: { s: State; send: Send; busy: boolean; recommended: string[] }) {
    const [dragId, setDragId] = useState<string | null>(null);
    const used = apUsed(s), cap = apCapacity(s);
    const sameLoadout = recommended.length === s.skills.length && recommended.every(id => s.skills.includes(id));
    const dropOn = (targetId: string) => {
        if (!dragId || dragId === targetId) return;
        const actives = s.skills.filter(id => skillById(id)?.type === 'active'), rest = s.skills.filter(id => skillById(id)?.type !== 'active');
        const from = actives.indexOf(dragId), to = actives.indexOf(targetId);
        if (from < 0 || to < 0) return;
        actives.splice(from, 1); actives.splice(to, 0, dragId);
        send({ type: 'setSkills', value: [...actives, ...rest].join(',') });
    };
    const unlocked = researchRank(s, 'extraRoll'), level = extraRollLevel(s), need = SKILL_FORMULA.extraRoll.ap[0], power = Math.round(SKILL_FORMULA.extraRoll.power[0] * 100), short = need - (cap - used), gate = researchById('extraRoll');
    return <FoldSection defaultOpen title="현재 편성" summary={`AP ${used} / ${cap}`} extra="개수 제한 없음 · 총 AP만 제한 · 액티브는 끌어서 순서 변경">
        <div className="flex flex-wrap gap-2"><ConfirmAction variant="default" label="추천 편성" title="추천 편성을 적용할까요?" description={`현재 직업 전용 → 선행 계보 → 공용 순서로, 발동률과 위력이 높은 액티브와 수치가 큰 패시브를 AP ${cap} 안에서 채웁니다. 적용 후: ${recommended.map(id => skillById(id)?.name).join(', ') || '없음'}. 지금 편성은 저장 칸에 먼저 담아 두면 되돌릴 수 있습니다.`} confirmLabel="적용" disabled={busy || !recommended.length || sameLoadout} onConfirm={() => send({ type: 'setSkills', value: recommended.join(',') })}/></div>
        <div className="grid gap-3 lg:grid-cols-2">{(['active', 'passive'] as const).map(type => {
            const ids = s.skills.filter(id => skillById(id)?.type === type);
            return <div key={type} className="grid content-start gap-2 rounded-m border border-line/60 bg-surface-1 p-3">
                <h3 className="text-s font-semibold text-ink-1">{type === 'active' ? '액티브' : '패시브'} <span className="text-xs font-normal text-ink-3">{type === 'active' ? `위에서부터 먼저 판정 · 처음 성공한 하나만 사용${extraRollLevel(s) ? ' · 추가 판정: 그 아래에서 한 번 더' : ''} · 각성기는 턴마다 따로` : '장착 효과 · 순서 무관'}</span></h3>
                <ol className="grid gap-1">{ids.map((id, i) => { const sk = skillById(id)!, rank = s.learned[id] || 1, mastery = skillMastery(s, id), fx = effectiveSkill(sk, rank, mastery);
                    return <li key={id} className={cn('flex items-center gap-2 rounded-m bg-surface-2 px-2 py-1.5', dragId === id && 'opacity-50')} draggable={type === 'active' && !busy} onDragStart={e => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDragId(null)} onDragOver={e => { if (type === 'active' && dragId) e.preventDefault(); }} onDrop={e => { e.preventDefault(); dropOn(id); setDragId(null); }}>
                        {type === 'active' && <span className="cursor-grab text-ink-3" aria-hidden title="끌어서 순서 변경"><GripVertical size={14}/></span>}
                        {type === 'active' && <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 font-num text-xs text-ink-2" aria-label={`판정 ${i + 1}순위`}>{i + 1}</span>}
                        <span className="grid size-8 shrink-0 place-items-center rounded-s bg-surface-3"><SkillIcon id={id} size={18}/></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-s font-semibold text-ink-1">{sk.name} · Lv.{skillLevel(sk, rank, mastery)}</span><span className="block text-xs text-ink-3">AP {loadoutSkillAP(s, id)}{type === 'active' ? ` · 발동 ${Math.round((fx.chance || 0) * 100)}%` : ''}{sk.awaken ? ' · 각성(턴마다)' : ''}</span></span>
                        {type === 'active' && <Button type="button" size="icon-sm" variant="ghost" className="icon-button" aria-label={`${sk.name} 우선순위 올리기`} title="먼저 판정" disabled={busy || i === 0} onClick={() => send({ type: 'skillUp', id })}><ArrowUp size={15}/></Button>}
                        {type === 'active' && <Button type="button" size="icon-sm" variant="ghost" className="icon-button" aria-label={`${sk.name} 우선순위 내리기`} title="나중에 판정" disabled={busy || i >= ids.length - 1} onClick={() => send({ type: 'skillUp', id: ids[i + 1] })}><ArrowDown size={15}/></Button>}
                        <Button type="button" size="xs" variant="ghost" disabled={busy || !validLoadout(s, s.skills.filter(x => x !== id))} onClick={() => send({ type: 'skill', id })}>해제</Button>
                    </li>; })}</ol>
                {!ids.length && <p className="text-xs text-ink-3">{type === 'active' ? '액티브가 없으면 기본 공격만 합니다.' : '장착한 패시브가 없습니다.'}</p>}
            </div>; })}</div>
        <div className={cn('flex flex-wrap items-center justify-between gap-2 rounded-m border px-3 py-2 text-s', level ? 'border-accent/50 bg-accent-soft/40' : 'border-line/60 bg-surface-1')}>
            <div className="min-w-0 flex-1 basis-64"><b className="text-ink-1">추가 판정 {level ? `${level}단계 · 켜짐` : unlocked ? '· 꺼짐' : '· 잠김'}</b><p className="mt-0.5 text-xs leading-relaxed text-ink-3">{unlocked ? `액티브가 발동한 행동에서 편성 순서상 그 아래 액티브로 한 번 더 판정합니다. 성공하면 ${power}% 위력으로 함께 씁니다. 동시 시전 묶음으로 나간 행동은 묶음 최대 개수가 1 늘어납니다. 장착 AP ${need}.` : `세계석 연구 ‘${gate?.name}’에서 해금합니다${gate?.rebirth ? `(환생 ${gate.rebirth}회부터)` : ''}. 켜면 장착 AP ${need}를 씁니다.`}</p></div>
            {unlocked > 0 && <Button type="button" size="sm" variant={level ? 'outline' : 'default'} disabled={busy || (!level && short > 0)} onClick={() => send({ type: 'extraRoll', value: String(level ? 0 : 1) })}>{level ? '끄기' : short > 0 ? `AP ${short} 부족` : `켜기 · AP ${need}`}</Button>}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">{['1', '2', '3'].map(id => <div key={id} className="flex flex-wrap items-center gap-2 rounded-m bg-surface-1 px-3 py-2 text-s"><span className="min-w-0 flex-1"><PresetName id={id} name={s.presets[id]?.name} disabled={busy} send={send}/><span className="block text-xs text-ink-3">{s.presets[id] ? `${s.presets[id].skills.length}개 스킬` : '저장 없음'}</span></span><Button type="button" size="xs" variant="outline" disabled={busy} onClick={() => send({ type: 'savePreset', id })}>저장</Button><Button type="button" size="xs" variant="outline" disabled={busy || !s.presets[id]} onClick={() => send({ type: 'loadPreset', id })}>불러오기</Button></div>)}</div>
    </FoldSection>;
}
/** 편성 이름: 저장한 칸은 눌러서 이름을 바꿉니다(Enter · 칸 밖을 누르면 저장, Esc는 취소, 1~20자). */
function PresetName({ id, name, disabled, send }: { id: string; name?: string; disabled: boolean; send: Send }) {
    const [edit, setEdit] = useState(false);
    const label = name || `편성 ${id}`;
    if (!edit) return name ? <button type="button" className="rounded-s text-left font-semibold text-ink-1 underline decoration-dotted underline-offset-4 hover:text-accent" disabled={disabled} title="눌러서 이름 바꾸기" onClick={() => setEdit(true)}>{label}</button> : <span className="font-semibold text-ink-1">{label}</span>;
    const done = (value: string) => { setEdit(false); const next = value.trim().slice(0, 20); if (next && next !== name) send({ type: 'renamePreset', id, value: next }); };
    return <input className="h-9 w-full max-w-40 rounded-m border border-line bg-surface-0 px-2 text-s text-ink-1 outline-none focus-visible:border-accent" aria-label={`편성 ${id} 이름`} defaultValue={label} maxLength={20} autoFocus onBlur={e => done(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEdit(false); }}/>;
}
