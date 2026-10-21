'use client';
/** v3.390 장면 아래 조작 줄(새 토대): 사냥터 · 던전 이름, 핫바, 시작/일시정지, 사냥터 변경, 호루라기, 이세계 행동. */
import { memo } from 'react';
import { ChevronRight, Megaphone, Pause, Play } from 'lucide-react';
import type { State, Action } from '@/game/types';
import type { CombatFx } from '@/game/systems/combat-feedback';
import { STAGES, stageById, dungeonById } from '@/game/data/world';
import { WHISTLE, WHISTLE_TARGETS, whistleOk, whistleTarget } from '@/game/data/whistle';
import { dayKey } from '@/game/data/time';
import { OtherworldHud } from '@/components/game/otherworld-hud';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Hotbar } from './hotbar';

type Send = (a: Action) => void;
export function Dock({ s, busy, send, setView, effect }: { s: State; busy: boolean; send: Send; setView: (v: string) => void; effect: CombatFx[] }) {
    const st = stageById(s.stage)!, d = dungeonById(s.dungeon?.id);
    const eyebrow = d ? `${d.id === 'abyss' ? `${s.dungeon!.depth || s.abyssBest + 1}층 · ` : ''}${d.name} · ${s.dungeon!.wave + 1} / ${d.monsters.length} 전투` : `STAGE ${String(STAGES.indexOf(st) + 1).padStart(2, '0')} · Lv. ${st.level}+`;
    return <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-l border bg-surface-1 p-3 shadow-1" style={{ borderColor: 'color-mix(in srgb, var(--stage-tone, var(--line)) 55%, var(--line))' }}>
        <div className="grid min-w-0 flex-[1_1_200px] gap-0.5">
            <span className="truncate font-display text-xs tracking-[.14em]" style={{ color: 'var(--stage-tone, var(--accent))' }}>{eyebrow}</span>
            <strong className="truncate text-m font-semibold text-ink-1">{d ? d.name : st.name}</strong>
        </div>
        <Hotbar s={s} effect={effect} setView={setView}/>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <Button type="button" size="sm" disabled={busy} className={cn('font-semibold', s.running ? 'bg-warn text-[#2a1a0c] hover:bg-warn/90' : 'bg-accent text-accent-ink hover:bg-accent/90')} onClick={() => send({ type: s.running ? 'pause' : 'start' })}>{s.running ? <Pause size={15}/> : <Play size={15}/>}{s.running ? '사냥 일시정지' : '자동 사냥 시작'}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setView(d ? 'dungeons' : 'stages')}>{d ? '던전 변경' : '사냥터 변경'}<ChevronRight size={14}/></Button>
            <Whistle s={s} send={send} busy={busy}/>
        </div>
        <OtherworldHud s={s} send={send} part="actions"/>
    </div>;
}

/** v3.162 호루라기: SP 로 다음 사냥터 출현을 고른 특별 몬스터로 정합니다(하루 WHISTLE.perDay 번). 메뉴는 이름만, 설명은 도움말 ‘사냥 규칙’. */
const Whistle = memo(function Whistle({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const targets = WHISTLE_TARGETS.filter(t => whistleOk(s, t));
    if (!targets.length) return null;
    const used = s.whistleDay?.key === dayKey(s.lastTick || 0) ? s.whistleDay.used : 0, left = Math.max(0, WHISTLE.perDay - used), pending = s.whistle ? whistleTarget(s.whistle) : undefined;
    const locked = busy || !!s.dungeon || !!pending || left <= 0 || s.sp < WHISTLE.sp;
    const why = s.dungeon ? '던전에서 나온 뒤 불 수 있습니다.' : pending ? `불어 두었습니다. 다음 사냥터 출현에 ${pending.name}이(가) 나타납니다.` : left <= 0 ? '오늘 몫을 다 썼습니다(한국 시간 자정 초기화).' : s.sp < WHISTLE.sp ? `SP가 부족합니다(필요 ${WHISTLE.sp}).` : '';
    return <Popover>
        <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className={cn('rounded-full', pending && 'border-gold-ink text-gold-ink')} title={`호루라기: SP ${WHISTLE.sp}로 다음 사냥터 출현을 고른 특별 몬스터로 정합니다(하루 ${WHISTLE.perDay}번). 자세한 규칙은 도움말 → 사냥 규칙.`} aria-label="호루라기 메뉴 열기"><Megaphone size={13}/><span className="hidden sm:inline">{pending ? `${pending.name} 대기` : `SP ${WHISTLE.sp}`}</span></Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 rounded-m border-line bg-surface-1 p-3 text-ink-1 shadow-2" side="top" align="end">
            <strong className="text-s font-semibold">호루라기 <small className="font-num text-xs text-ink-3">오늘 {left} / {WHISTLE.perDay}</small></strong>
            {why && <p className="mt-1 text-xs text-ink-3">{why}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">{targets.map(t => <Button key={t.id} type="button" variant="outline" size="sm" disabled={locked} title={t.name} onClick={() => send({ type: 'whistle', id: t.id })}>{t.short}</Button>)}</div>
        </PopoverContent>
    </Popover>;
});
