'use client';
/** v3.390 전투 스킬 핫바(새 토대). 칸을 누르면 스킬 편성으로, 마우스를 올리거나 길게 누르면 RichTooltip 으로 발동률 · 대기 · 마나 · 효과 요약 · 지금 상태를 봅니다. */
import { ChevronRight } from 'lucide-react';
import type { State } from '@/game/types';
import type { CombatFx } from '@/game/systems/combat-feedback';
import { skillById } from '@/game/data/skills';
import { jobById } from '@/game/data/classes';
import { skillBrief } from '@/game/systems/skill-description';
import { apCapacity, apUsed, effectiveSkill, maxSkillLevel, skillLevel, skillMastery } from '@/game/systems/progression';
import { SkillIcon } from '@/components/game/shared';
import { RichTooltip, formatExact } from '@/components/ui/game';
import { cn } from '@/lib/utils';

export function Hotbar({ s, effect, setView }: { s: State; effect: CombatFx[]; setView: (v: string) => void }) {
    const activeIds = s.skills.filter(id => skillById(id)?.type === 'active');
    const fired = (id: string) => effect.findLast(fx => fx.actor === 'player' && fx.skillId === id)?.id;
    const go = () => setView('skills');
    return <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="전투 스킬">
        {activeIds.map(id => {
            const sk = skillById(id)!, effective = effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id));
            const wait = sk.awaken && s.cooldowns[id] === undefined ? sk.awaken.start : s.cooldowns[id] || 0, hit = fired(id), cooling = wait > 0;
            const state = cooling ? `대기 ${wait}턴` : '사용 준비';
            return <RichTooltip key={id} title={<>{sk.name}{sk.awaken ? <em className="ml-1 text-xs not-italic text-gold-ink">각성</em> : null}</>} kicker={`${jobById(sk.job)?.name || '공용'} · 성장 Lv.${skillLevel(sk, s.learned[id] || 1, skillMastery(s, id))} / ${maxSkillLevel(sk)}`} flavor={skillBrief(effective)}
                effects={[`발동 ${Math.round(effective.chance * 100)}%`, `대기 ${sk.awaken ? `시작 ${sk.awaken.start}턴` : `${effective.cooldown}턴`}`, ...((effective.manaCost || 0) > 0 ? [`마나 ${formatExact(effective.manaCost!)}`] : [])]} source={<span className={cooling ? 'text-warn' : 'text-ok'}>{state} · 눌러서 스킬 편성</span>}>
                <button type="button" className={cn('relative grid h-12 w-[68px] place-items-center content-center gap-0.5 overflow-hidden rounded-m border bg-surface-1 px-1 text-ink-1 transition-colors', cooling ? 'border-line' : 'border-accent/70 shadow-[0_0_8px_var(--accent-soft)]', sk.awaken && 'border-gold-ink/70')} aria-label={`${sk.name} ${state}`} onClick={go}>
                    <span className={cn('grid place-items-center [&_img]:size-5 [&_svg]:size-5', cooling && 'opacity-45')}><SkillIcon id={id} size={20}/></span>
                    <small className={cn('block max-w-full truncate text-xs leading-tight text-ink-2', cooling && 'opacity-45')}>{sk.name}</small>
                    {cooling && <b className="absolute right-0.5 top-0.5 min-w-4 rounded-s bg-surface-0/90 px-1 font-num text-xs font-bold text-gold-ink">{wait}</b>}
                    {hit !== undefined && <i key={hit} className="pointer-events-none absolute inset-0 rounded-m border-2 border-gold-ink/90 shadow-[0_0_12px_var(--gold-ink)] animate-out fade-out-0 zoom-out-95 fill-mode-forwards duration-500 motion-reduce:hidden" aria-hidden="true"/>}
                </button>
            </RichTooltip>;
        })}
        {!activeIds.length && <button type="button" className="grid h-12 w-12 place-items-center rounded-m border border-dashed border-line text-l text-ink-3" onClick={go} title="스킬을 장착하세요">+</button>}
        <button type="button" className="inline-flex h-12 items-center gap-0.5 rounded-m border border-line bg-surface-1 px-2 font-num text-xs text-ink-3 hover:text-ink-1" onClick={go} title="스킬 편성">AP {apUsed(s)}/{apCapacity(s)}<ChevronRight size={13}/></button>
    </div>;
}
