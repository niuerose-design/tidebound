'use client';
/**
 * v3.389 나의 모험가 카드(새 토대). 데스크톱(xl 이상)은 왼쪽 열의 긴 카드, 그보다 좁으면 장면 위 한 줄(compact)로 보이고 누르면 능력치 화면으로 갑니다.
 * 능력치(a)는 동기화 상태로 한 번 계산한 값을 받습니다(재생 프레임마다 다시 계산하지 않음).
 */
import { ChevronRight, Leaf, Users } from 'lucide-react';
import type { CombatStats, State } from '@/game/types';
import { xpNeeded, SLOTS } from '@/game/data/balance';
import { jobById } from '@/game/data/classes';
import { displayTitle } from '@/game/data/titles';
import { rankTitle, rankIndex, rankState } from '@/game/data/rank';
import { power } from '@/game/systems/stats';
import { xpWall } from '@/game/systems/meta';
import { RankInsignia } from '@/components/game/rank-insignia';
import { GearArt } from '@/components/game/gear-art';
import { OnyxArt } from '@/components/game/onyx-art';
import { SlotIcon } from '@/components/game/shared';
import { StatBar, ProgressRing, NumberTicker, KeyValueList, ItemSlot, rarityKey, rarityVar, formatExact, formatShort } from '@/components/ui/game';
import { Button } from '@/components/ui/button';

export function PlayerCard({ s, a, setView, compact = false }: { s: State; a: CombatStats; setView: (v: string) => void; compact?: boolean }) {
    const need = xpNeeded(s.level, s.rebirths, xpWall(s)), job = jobById(s.job)?.name;
    const title = s.badge === 'rank' ? <span className="inline-flex items-center gap-1 rounded-s bg-surface-3 px-1.5 py-0.5 text-xs text-gold-ink" title={`계급 ${rankTitle(s)}`}><RankInsignia index={rankIndex(rankState(s).exp)} size={14}/>{rankTitle(s)}</span>
        : displayTitle(s) ? <span className="rounded-s bg-surface-3 px-1.5 py-0.5 text-xs text-gold-ink">{displayTitle(s)}</span> : null;
    if (compact) return <button type="button" className="flex w-full items-center gap-3 rounded-l border border-line bg-surface-2 p-3 text-left shadow-1 xl:hidden" onClick={() => setView('character')} aria-label="나의 모험가 능력치 보기">
        <ProgressRing value={s.exp / Math.max(1, need)} size={44} stroke={4} color="var(--gold-ink)" label="경험치"><span className="font-num text-xs">{s.level}</span></ProgressRing>
        <span className="grid min-w-0 flex-1 gap-1">
            <span className="flex flex-wrap items-baseline gap-x-2"><strong className="truncate text-s font-semibold text-ink-1">{s.name}</strong><small className="text-xs text-ink-3">{job} · 환생 {s.rebirths}회</small><span className="ml-auto font-num text-xs text-ink-2">전투력 {formatShort(power(a))}</span></span>
            <span className="grid grid-cols-2 gap-2"><StatBar value={s.hp} max={a.hp} tone="hp" size="s" showText={false} label="체력"/><StatBar value={s.mana} max={a.mana} tone="mp" size="s" showText={false} label="마나"/></span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-ink-3"/>
    </button>;
    return <section className="hidden gap-4 rounded-l border border-line bg-surface-2 p-4 shadow-1 xl:grid" aria-label="나의 모험가">
        <header className="flex items-center justify-between"><h2 className="font-display text-m font-bold text-ink-1">나의 모험가</h2><span className="font-display text-xs tracking-[.14em] text-ink-3">CHARACTER</span></header>
        <div className="grid justify-items-center gap-2 text-center">
            <ProgressRing value={s.exp / Math.max(1, need)} size={76} stroke={5} color="var(--gold-ink)" label="다음 레벨까지"><span className="grid place-items-center leading-none"><Leaf size={18} className="text-accent"/><span className="mt-0.5 font-num text-xs">Lv.{s.level}</span></span></ProgressRing>
            <div className="grid gap-0.5">
                <div className="flex flex-wrap items-center justify-center gap-1.5">{title}<strong className="text-m font-semibold text-ink-1">{s.name}</strong></div>
                <small className="text-xs text-ink-3">{job} · 환생 {s.rebirths}회</small>
                <small className="inline-flex items-center justify-center gap-1 text-xs text-ink-3"><Users size={12}/>{s.guildMember?.name ? `길드 · ${s.guildMember.name}` : '무소속'}</small>
            </div>
        </div>
        <div className="flex items-baseline justify-between border-y border-line py-2"><span className="text-s text-ink-2">전투력</span><NumberTicker value={power(a)} className="text-l font-semibold text-accent"/></div>
        <div className="grid gap-2"><StatBar value={s.hp} max={a.hp} tone="hp" label="체력"/><StatBar value={s.mana} max={a.mana} tone="mp" label="마나"/><StatBar value={s.exp} max={need} tone="exp" label="경험치"/></div>
        <KeyValueList columns={1} className="text-xs" items={[{ key: '물리 공격', value: formatExact(a.attack) }, { key: '물리 방어', value: formatExact(a.defense) }, { key: '최대 체력', value: formatExact(a.hp) }, { key: '치명타', value: `${Math.round(a.crit * 100)}%` }, { key: '마법 공격', value: formatExact(a.magic) }, { key: '마법 방어', value: formatExact(a.resist) }]}/>
        <Button type="button" variant="ghost" size="sm" className="justify-start px-0 text-accent hover:bg-transparent hover:text-ink-1" onClick={() => setView('character')}>능력치 배분 · 남은 {s.statPoints}P<ChevronRight size={14}/></Button>
        <header className="flex items-center justify-between"><h3 className="font-display text-s font-bold text-ink-1">착용 장비</h3><button type="button" aria-label="장비 보관함 열기" className="grid size-8 place-items-center rounded-m text-ink-3 hover:bg-surface-3 hover:text-ink-1" onClick={() => setView('inventory')}><ChevronRight size={16}/></button></header>
        <div className="grid gap-2">{Object.entries(SLOTS).map(([id, label]) => {
            const item = s.equipment[id], color = item ? rarityVar(item.onyx ? 'primal' : rarityKey(item.rarity)) : undefined;
            return <button key={id} type="button" className="flex items-center gap-2 rounded-m border border-line bg-surface-1 p-2 text-left hover:border-line-strong" onClick={() => setView('inventory')}>
                <ItemSlot rarity={item ? (item.onyx ? 'primal' : rarityKey(item.rarity)) : undefined} empty={!item} label={label} size="s">{item?.onyx ? <OnyxArt id={item.onyx} size={26}/> : item ? <GearArt slot={id} rarity={item.rarity} style={item.style} size={30}/> : <SlotIcon slot={id} size={16}/>}</ItemSlot>
                <span className="grid min-w-0"><small className="text-xs text-ink-3">{label}</small><strong className="truncate text-xs font-semibold text-ink-1" style={{ color }}>{item?.name || '빈 슬롯'}</strong></span>
            </button>; })}</div>
    </section>;
}
