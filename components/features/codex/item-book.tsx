'use client';
/** v3.382 물건도감: 슬롯 × 등급 등록(장비 1개 소모, 확인 Dialog) · 칠흑 장신구 · 칠흑 보스 코어. */
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { State } from '@/game/types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ChoiceChips, ItemSlot, RarityTag, StatBar, rarityKey, rarityVar, formatPercent } from '@/components/ui/game';
import { OnyxArt } from '@/components/game/onyx-art';
import { GearArt } from '@/components/game/gear-art';
import { BALANCE, RARITIES, SLOTS } from '@/game/data/balance';
import { EQUIPMENT_NAMES } from '@/game/data/equipment';
import { PROGRESSION, percent } from '@/game/data/progression';
import { itemKey } from '@/game/systems/progression';
import { keepsAcrossLives, ownedItems } from '@/game/systems/equipment';
import { dropRate } from '@/game/systems/stats';
import { ONYX, ONYX_BOSSES, ONYX_ITEMS, ONYX_CORE_ID, onyxCodexKey, onyxById } from '@/game/data/onyx';
import { BOSS_CORES, BOSS_CORE_RULES, coreEntry } from '@/game/data/boss-core';
import { BookCard, Trait, type Send } from './parts';

type Filter = 'all' | 'onyx' | number;
export function ItemBook({ s, send, busy, secret }: { s: State; send: Send; busy: boolean; secret: boolean }) {
    const [filter, setFilter] = useState<Filter>('all');
    const registered = Object.keys(s.itemBook).length, currentDrop = dropRate(s), slotCount = Object.keys(SLOTS).length;
    const perEntryBonus = Math.round(PROGRESSION.itemDropBonus / BALANCE.dropBonusScale * 1000) / 10;
    const perEntryDrop = Math.max(0, dropRate({ ...s, itemBook: { ...s.itemBook, ['preview:next']: true } }) - currentDrop);
    const gain = secret ? `장비 드롭 보너스 +${perEntryBonus}%` : `장비 드롭 확률 +${percent(perEntryDrop, 4)}p`;
    const bulk = Object.keys(SLOTS).flatMap(slot => RARITIES.map((_, i) => s.itemBook[itemKey(slot, i)] ? null : s.inventory.filter(x => x.slot === slot && x.rarity === i && !x.locked && !keepsAcrossLives(x)).sort((a, b) => a.power - b.power || (a.enhance || 0) - (b.enhance || 0))[0] || null)).filter((x): x is NonNullable<typeof x> => !!x);
    const total = slotCount * RARITIES.length;
    const countText = filter === 'all' ? `${registered} / ${total + ONYX_ITEMS.length}종 등록` : filter === 'onyx' ? `칠흑 ${ONYX_ITEMS.filter(d => s.itemBook[onyxCodexKey(d.id)]).length} / ${ONYX_ITEMS.length}` : `${RARITIES[filter].name} ${Object.keys(SLOTS).filter(slot => s.itemBook[itemKey(slot, filter)]).length} / ${slotCount}`;
    return <div className="grid gap-4">
        <section className="grid gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3"><BookOpen size={22} className="mt-0.5 shrink-0 text-accent"/><div className="min-w-0">
                    <div className="text-m font-semibold text-ink-1">등록한 종류 {registered} / {total}{secret ? '' : ` · 장비 드롭 확률 ${percent(currentDrop, 3)}`}</div>
                    <p className="mt-1 text-s leading-relaxed text-ink-3">{secret ? `도감 보너스: 장비 드롭 보너스 +${Math.round(registered * PROGRESSION.itemDropBonus / BALANCE.dropBonusScale * 100)}%. 한 종류 더 등록할 때마다 +${perEntryBonus}%.` : `도감 보너스 +${Math.round(registered * PROGRESSION.itemDropBonus / BALANCE.dropBonusScale * 100)}% 포함, 행운 · 연구 · 이벤트를 모두 더한 실제 값입니다. 한 종류 더 등록하면 약 +${percent(perEntryDrop, 4)}p.`} 가방의 장비 한 개를 영구 등록하며 해당 장비는 소모됩니다. 같은 슬롯 · 등급은 한 번만 등록합니다.</p>
                </div></div>
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button type="button" variant="outline" disabled={busy || !bulk.length}>{bulk.length ? `일괄 등록 (${bulk.length}종)` : '일괄 등록할 장비 없음'}</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>미등록 {bulk.length}종을 한 번에 등록할까요?</AlertDialogTitle>
                            <AlertDialogDescription>종류마다 가방에서 가장 약한 장비 1개를 골라 소모합니다: {bulk.map(c => `${c.name}${c.enhance ? ` ★${c.enhance}` : ''}`).join(', ')}. 보호 장비와 유물은 제외되며 돌려받을 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => send({ type: 'registerItemAll' })}>모두 등록</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <StatBar label="등록" value={registered} max={total} size="s"/>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <ChoiceChips label="등급별 보기" value={String(filter)} onChange={v => setFilter(v === 'all' || v === 'onyx' ? v : Number(v))}
                options={[{ value: 'all', label: '전체' }, ...RARITIES.map((r, i) => ({ value: String(i), label: r.name, style: { color: rarityVar(rarityKey(i)) } })), { value: 'onyx', label: '◆ 칠흑' }]}/>
            <span className="font-num text-xs text-ink-3">{countText}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(SLOTS).flatMap(([slot, label]) => RARITIES.map((rarity, i) => {
                if (filter !== 'all' && filter !== i) return null;
                const key = itemKey(slot, i), done = !!s.itemBook[key], candidate = s.inventory.find(item => item.slot === slot && item.rarity === i && !item.locked && !item.relic);
                return <BookCard key={key} undiscovered={!done}>
                    <div className="flex items-start gap-3">
                        <ItemSlot rarity={rarityKey(i)} label={`${rarity.name} ${label}`} size="l"><GearArt slot={slot} rarity={i} size={52}/></ItemSlot>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-m font-semibold text-ink-1">{EQUIPMENT_NAMES[slot as keyof typeof EQUIPMENT_NAMES][i]}</span><RarityTag rarity={rarityKey(i)}/></div>
                            <div className="mt-0.5 text-xs text-ink-3">{label} · {gain}</div>
                            <div className={`mt-1 text-xs font-medium ${done ? 'text-ok' : 'text-ink-3'}`}>{done ? '등록 완료 · 영구 보너스 적용 중' : '미등록'}</div></div>
                    </div>
                    {!done && <AlertDialog>
                        <AlertDialogTrigger asChild><Button type="button" size="sm" variant="outline" disabled={busy || !candidate}>{candidate ? '장비 1개 등록' : '가방에 해당 장비 없음'}</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>장비를 도감에 등록할까요?</AlertDialogTitle><AlertDialogDescription>{candidate?.name} (★{candidate?.enhance || 0}) 한 개를 소모합니다. 등록 보너스는 환생 후에도 유지되며 장비를 돌려받을 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => candidate && send({ type: 'registerItem', id: candidate.id })}>도감에 등록</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>}
                </BookCard>; }))}
            {(filter === 'all' || filter === 'onyx') && ONYX_ITEMS.map(d => { const done = !!s.itemBook[onyxCodexKey(d.id)], boss = d.boss ? onyxById(d.boss) : undefined, own = ownedItems(s).find(x => x?.onyx === d.id);
                return <BookCard key={d.id} undiscovered={!done}>
                    <div className="flex items-start gap-3">
                        <ItemSlot rarity="primal" label={`칠흑 ${d.name}`} size="l"><OnyxArt id={d.id} size={34}/></ItemSlot>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-m font-semibold text-ink-1">{d.name}</span><RarityTag rarity="primal" label="칠흑"/></div>
                            <div className="mt-0.5 text-xs text-ink-3">{boss ? `${boss.name} 격파 보상` : '지금은 떨어뜨리는 칠흑 보스가 없습니다'} · {gain}</div>
                            <div className={`mt-1 text-xs font-medium ${done ? 'text-ok' : 'text-ink-3'}`}>{done ? '등록 완료 · 영구 보너스 적용 중' : '미획득 · 얻으면 자동 등록(소모 없음)'}</div></div>
                    </div>
                    {boss ? <OnyxPity s={s} bossId={boss.id} rank={own ? own.onyxRank || 0 : -1}/> : own && <p className="text-xs text-ink-3">각성 {own.onyxRank || 0}/{ONYX.awakenMax} · 가진 장신구는 그대로 씁니다</p>}
                </BookCard>; })}
            {(filter === 'all' || filter === 'onyx') && (() => { const core = BOSS_CORES[ONYX_CORE_ID], boss = ONYX_BOSSES.find(b => 'core' in b.drop)!, e = coreEntry(s.bossCores?.[ONYX_CORE_ID]);
                return <BookCard key={ONYX_CORE_ID} undiscovered={!e}>
                    <div className="flex items-start gap-3">
                        <ItemSlot rarity="primal" label={`칠흑 보스 코어 ${core.name}`} size="l"><OnyxArt id={ONYX_CORE_ID} size={34}/></ItemSlot>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-m font-semibold text-ink-1">{core.name}</span><RarityTag rarity="primal" label="보스 코어"/></div>
                            <div className="mt-0.5 text-xs text-ink-3">{boss.name} 격파 보상 · {core.desc}</div>
                            <div className={`mt-1 text-xs font-medium ${e ? 'text-ok' : 'text-ink-3'}`}>{e ? (s.coreSlot === ONYX_CORE_ID ? '보스 코어 칸에 장착 중' : '보유 · 보스 코어 칸에서 장착') : '미획득 · 얻으면 보스 코어 칸에 들어갑니다'}</div></div>
                    </div>
                    <OnyxPity s={s} bossId={boss.id} rank={e ? Math.min(BOSS_CORE_RULES.awakenMax, e.rank) : -1}/>
                </BookCard>; })()}
        </div>
    </div>;
}

/** 칠흑 천장: 연속 미획득 격파 수 / 천장. 가진 장신구는 같은 천장으로 각성이 오릅니다. */
function OnyxPity({ s, bossId, rank }: { s: State; bossId: string; rank: number }) {
    const miss = s.onyxMiss?.[bossId] || 0, pity = ONYX.dropPity, owned = rank >= 0;
    if (owned && rank >= ONYX.awakenMax) return <p className="text-xs text-ok">각성 완료 {ONYX.awakenMax}/{ONYX.awakenMax}</p>;
    const label = owned ? `각성 ${rank}/${ONYX.awakenMax} · 다음 각성 천장` : '획득 천장';
    if (!Number.isFinite(pity)) return <p className="text-xs text-ink-3">{label} · 연속 미획득 {miss.toLocaleString()}회</p>;
    return <Trait title={<>{label} <span className="font-num text-ink-2">{miss.toLocaleString()} / {pity.toLocaleString()}</span></>}>
        <StatBar value={miss} max={pity} size="s" color="var(--gold-ink)" showText={false}/>
        <div className="mt-1 text-xs text-ink-3">{pity.toLocaleString()}번째 연속 미획득 격파는 확정{miss > 0 ? ` · ${(pity - miss).toLocaleString()}회 남음` : ''}{formatPercent(0) && ''}</div>
    </Trait>;
}
