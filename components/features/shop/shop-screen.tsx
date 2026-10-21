'use client';
/** v3.393 재설계 4단계: 상점(새 토대). 랜덤 · 저격 · 자동 뽑기, 정수 구매, 장비 강화. 서버 행동(gamble · imprintGamble · autoGamble · buyEssence)은 전과 같습니다. */
import { useState } from 'react';
import { Coins, Gem, ShoppingBag, Tag } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { SectionHeader, ChoiceChips, ConfirmAction, NumberTicker, EmptyState, RarityTag, rarityKey, rarityVar, formatExact } from '@/components/ui/game';
import { GAMBLE_CATEGORIES, APPRAISAL, APPRAISAL_PITY, IMPRINT_APPRAISAL, AUTO_APPRAISAL_MAX, ESSENCE_SHOP, inventoryCap } from '@/game/data/economy';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { gambleCost, imprintGambleCost, imprintChoices, pityLeft, GAMBLE_COUNTS, APPRAISAL_ALL, essencePrice, essenceBuyCount } from '@/game/systems/commerce';
import { catalogNow } from '@/game/data/catalog';
import { SlotIcon } from '@/components/game/shared';
import { AffixGlossaryButton, AffixGlossaryList, useGlossaryToggle } from '@/components/game/affix-glossary';
import { ForgeBench } from '@/components/features/inventory/forge-bench';
import { ItemArt, ItemName, ItemMeta, ItemTag } from '@/components/features/inventory/parts';
import { cn } from '@/lib/utils';
import { GoodCard, Tile, Field, field } from './parts';

type Send = (a: Action) => void;
const fmt = formatExact;
const TABS = [['gamble', '랜덤 뽑기'], ['imprint', '저격 뽑기'], ['auto', '자동 뽑기'], ['essence', '정수 구매'], ['forge', '장비 강화']] as const;

/** v3.58 뽑기(감정) 천장 현황: 신화·고대·태초 이상까지 남은 감정 수와 지금까지 감정 기록. */
function Pity({ s }: { s: State }) {
    const rec = s.appraisal;
    return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-m bg-surface-1 px-3 py-2 text-xs text-ink-2">
        {pityLeft(s).map(p => <span key={p.key}><b style={{ color: rarityVar(rarityKey(p.rarity)) }}>{RARITIES[p.rarity].name} 이상</b> 확정까지 <span className="font-num text-ink-1">{fmt(p.left)}</span>회</span>)}
        <span className="text-ink-3">{[`뽑기 ${fmt(rec?.count || 0)}회`, ...(rec?.byRarity || []).map((n, r) => [r, n] as const).filter(([r, n]) => r >= 4 && n).map(([r, n]) => `${RARITIES[r].name} ${n}`), '천장은 환생해도 남고 승천하면 초기화'].join(' · ')}</span>
    </div>;
}

export function ShopScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const [tab, setTab] = useState<typeof TABS[number][0]>('gamble');
    // v3.49 정보 비공개가 켜져 있으면 감정 등급 확률을 숨깁니다.
    const secret = catalogNow().secret;
    const gamble = gambleCost(s), imprint = imprintGambleCost(s), cap = inventoryCap(), full = s.inventory.length >= cap;
    const odds = secret ? '' : `${APPRAISAL.map(r => `${RARITIES[r.rarity].name} ${(Math.round(r.chance * 10000) / 100)}%`).join(' · ')}. `;
    const [slot, setSlot] = useState<string>('rod'), [affix, setAffix] = useState(''), [target, setTarget] = useState(4);
    const choices = imprintChoices(GAMBLE_CATEGORIES.find(c => c.id === slot)!.slot), pick = choices.some(c => c.id === affix) ? affix : choices[0]?.id || '';
    const [autoImprint, setAutoImprint] = useState(false);
    // v3.323 저격 · 자동 뽑기의 옵션 이름(황금 · 탐색 등) 뜻을 펼쳐 보는 버튼.
    const glossary = useGlossaryToggle(), glossaryButton = <AffixGlossaryButton open={glossary.open} onToggle={glossary.toggle}/>;
    const [forgeSlot, setForgeSlot] = useState<keyof typeof SLOTS>('rod'), forgeItem = s.equipment[forgeSlot];
    // v3.333 정수 구매: 정수 1개 = 랜덤 뽑기 골드 × 10/3(v3.334). '최대'는 가진 골드로 살 수 있는 만큼(한 번에 10만 개까지).
    const essence = essencePrice(s), essenceMax = essenceBuyCount(s, 'max');
    // v3.72 자동 뽑기는 골드 한도 없이 가진 골드 · 정수를 모두 씁니다(한 번에 최대 AUTO_APPRAISAL_MAX회).
    const autoEach = autoImprint ? imprint : { gold: gamble, essence: 0 };
    const autoMax = Math.min(AUTO_APPRAISAL_MAX, Math.floor(s.gold / Math.max(1, autoEach.gold)), autoEach.essence ? Math.floor((s.essence || 0) / autoEach.essence) : Infinity);
    const slotChips = <ChoiceChips label="부위" value={slot} onChange={setSlot} options={GAMBLE_CATEGORIES.map(c => ({ value: c.id, label: c.name }))}/>;
    const affixSelect = <Field label="새길 옵션"><select className={field} value={pick} onChange={e => setAffix(e.target.value)}>{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>;
    const icons = (only?: string) => <div className="flex shrink-0 gap-1">{GAMBLE_CATEGORIES.filter(o => !only || o.id === only).map(o => <span className="grid size-10 place-items-center rounded-m bg-surface-1 text-ink-2" key={o.id} title={o.name}><SlotIcon slot={o.slot} size={22}/></span>)}</div>;
    // v3.72 세 뽑기 탭은 같은 틀(머리 · 설명 · 선택 줄 · 비용 줄 · 버튼 줄)이라 탭을 바꿔도 화면이 흔들리지 않습니다.
    const draw = tab === 'gamble' ? {
        label: '랜덤 뽑기', eyebrow: '모든 부위', head: icons(),
        desc: '무기 · 방어구 · 장신구 · 망토 중 하나가 같은 확률로 나옵니다(무기는 물리·마법 중 하나). 등급 수만큼 옵션이 붙고, 영웅 이상은 규칙 옵션이 붙을 수 있습니다.',
        controls: <span className="text-xs text-ink-3">Lv.{s.level} · 희귀 이상 · 부위 무작위 · 옵션 1~6개</span>,
        cost: `한 번 ${fmt(gamble)} G`,
        actions: GAMBLE_COUNTS.map(n => { const total = gamble * n, noRoom = s.inventory.length + n > cap; return <ConfirmAction key={n} label={`${n}개 · ${fmt(total)} G`} title={`랜덤 뽑기 ${n}개를 할까요?`} description={`골드 ${fmt(total)} G를 사용합니다. ${odds}부위는 무작위이고, 결과는 가방에 보관됩니다.${n > 1 ? ` 가방 ${n}칸이 필요합니다.` : ''}`} disabled={busy || s.gold < total || noRoom} onConfirm={() => send({ type: 'gamble', id: APPRAISAL_ALL, value: String(n) })}/>; }),
    } : tab === 'imprint' ? {
        label: '저격 뽑기', eyebrow: '부위 · 옵션 지정', head: icons(slot),
        desc: '부위와 옵션 하나를 고르면 그 옵션이 반드시 붙은 장비가 나옵니다. 나머지 옵션과 등급은 랜덤 뽑기와 같고 천장도 함께 쌓입니다. 고대 이상 전용 옵션은 고를 수 없습니다.',
        controls: <>{slotChips}{affixSelect}{glossaryButton}<small className="basis-full text-xs text-ink-3">{choices.find(c => c.id === pick)?.description}</small></>,
        cost: `한 번 ${fmt(imprint.gold)} G(랜덤 뽑기의 ${IMPRINT_APPRAISAL.goldMultiplier}배) · 정수 ${imprint.essence}`,
        actions: GAMBLE_COUNTS.map(n => { const gold = imprint.gold * n, ess = imprint.essence * n, noRoom = s.inventory.length + n > cap; return <ConfirmAction key={n} label={`${n}개 · ${fmt(gold)} G · 정수 ${ess}`} title={`저격 뽑기 ${n}개를 할까요?`} description={`골드 ${fmt(gold)} G와 정수 ${ess}개를 사용합니다. ${odds}고른 옵션이 반드시 붙습니다.${n > 1 ? ` 가방 ${n}칸이 필요합니다.` : ''}`} disabled={busy || !pick || s.gold < gold || (s.essence || 0) < ess || noRoom} onConfirm={() => send({ type: 'imprintGamble', id: slot, value: `${pick}|${n}` })}/>; }),
    } : tab === 'auto' ? {
        label: '자동 뽑기', eyebrow: '목표 등급까지', head: icons(slot),
        desc: `고른 부위에서 목표 등급 이상이 나올 때까지 가진 골드${autoImprint ? '와 정수' : ''}를 모두 써서 반복합니다(한 번에 최대 ${fmt(AUTO_APPRAISAL_MAX)}회). 목표 미만은 물건 도감에 없는 종류면 등록하고, 나머지는 분해해 정수로 받습니다. 목표 장비는 가방에 들어가고 거기서 멈춥니다.`,
        controls: <>{slotChips}<Field label="목표 등급"><select className={field} value={target} onChange={e => setTarget(Number(e.target.value))}>{APPRAISAL.map(r => <option key={r.rarity} value={r.rarity}>{RARITIES[r.rarity].name} 이상</option>)}</select></Field>
            <label className="flex h-10 items-center gap-2 text-s"><Switch checked={autoImprint} onCheckedChange={setAutoImprint} aria-label="저격 뽑기로 반복"/>저격 뽑기로</label>{autoImprint && affixSelect}{autoImprint && glossaryButton}</>,
        cost: `한 번 ${fmt(autoEach.gold)} G${autoEach.essence ? ` · 정수 ${autoEach.essence}` : ''} · 지금 가진 것으로 최대 ${fmt(autoMax)}회 · ${APPRAISAL_PITY.find(p => p.rarity === target) ? `${RARITIES[target].name} 이상 천장까지 ${fmt(pityLeft(s).find(p => p.rarity === target)!.left)}회` : '희귀·영웅·전설은 천장 없음'}`,
        actions: [<ConfirmAction key="auto" variant="default" className="bg-accent text-accent-ink hover:bg-accent/90" label={`자동 뽑기 시작 · 최대 ${fmt(autoMax)}회`} title="자동 뽑기를 시작할까요?" description={`가진 골드 ${fmt(s.gold)} G${autoEach.essence ? `와 정수 ${fmt(s.essence || 0)}` : ''}를 모두 쓸 수 있습니다. 목표 미만 장비는 분해되거나 도감에 등록됩니다.`} disabled={busy || full || autoMax < 1} onConfirm={() => send({ type: 'autoGamble', id: slot, value: `${target}|max${autoImprint ? `|${pick}` : ''}` })}/>],
    } : null;
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="ITEM SHOP" title="상점" description="모든 부위가 나오는 랜덤 뽑기, 부위와 옵션을 골라 노리는 저격 뽑기, 목표 등급까지 돌리는 자동 뽑기, 그리고 강화."/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={<Coins size={18}/>} label="보유 골드"><NumberTicker value={s.gold}/><span className="text-xs text-ink-3">G</span></Tile>
            <Tile icon={<Gem size={18}/>} label="보유 정수"><NumberTicker value={s.essence || 0}/></Tile>
            <Tile icon={<ShoppingBag size={18}/>} label="장비 가방"><span className={cn(full && 'text-danger')}>{s.inventory.length}</span><span className="text-xs text-ink-3">/ {cap}</span></Tile>
            <Tile icon={<Tag size={18}/>} label={`뽑기 장비 레벨 · 환생 ${s.rebirths}`}>Lv.{s.level}<span className="text-xs text-ink-3">가격 ×{(gamble / Math.max(1, gambleCost({ ...s, rebirths: 0 }))).toFixed(1)}</span></Tile>
        </div>
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}><TabsList className="h-auto flex-wrap">{TABS.map(([id, name]) => <TabsTrigger key={id} value={id} className="min-h-9 pointer-coarse:min-h-11">{name}</TabsTrigger>)}</TabsList></Tabs>
        {draw && <section aria-label={draw.label} className="grid gap-3">
            <Pity s={s}/>
            {!secret && <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3"><span>등급 확률</span>{APPRAISAL.map(r => <RarityTag key={r.rarity} rarity={rarityKey(r.rarity)} label={`${RARITIES[r.rarity].name} ${Math.round(r.chance * 10000) / 100}%`}/>)}</div>}
            <GoodCard eyebrow={draw.eyebrow} title={draw.label} head={draw.head} desc={draw.desc} controls={<>{draw.controls}{glossary.open && (tab === 'imprint' || tab === 'auto' && autoImprint) && <div className="basis-full"><AffixGlossaryList affixes={choices} picked={pick}/></div>}</>} cost={draw.cost}>{draw.actions}</GoodCard>
        </section>}
        {tab === 'essence' && <GoodCard eyebrow="골드 → 정수" title="정수 구매" head={<span className="grid size-10 place-items-center rounded-m bg-surface-1 text-accent"><Gem size={22}/></span>} desc="골드로 정수를 바로 삽니다. 값은 뽑기 가격처럼 레벨 · 환생에 따라 오릅니다. 정수는 수치 재련 · 저격 뽑기 · 원시 각성 · 제단 공물에 씁니다."
            cost={`정수 1개 ${fmt(essence)} G · 가진 정수 ${fmt(s.essence || 0)} · 가진 골드로 최대 ${fmt(essenceMax)}개`}>
            {[...ESSENCE_SHOP.counts, 'max' as const].map(n => { const count = n === 'max' ? essenceMax : n, gold = essence * count, short = count < 1 || s.gold < gold; return <ConfirmAction key={String(n)} label={n === 'max' ? `최대 ${fmt(count)}개 · ${fmt(gold)} G` : `${fmt(n)}개 · ${fmt(gold)} G`} title={`정수 ${fmt(count)}개를 살까요?`} description={`골드 ${fmt(gold)} G를 쓰고 정수 ${fmt(count)}개를 받습니다(개당 ${fmt(essence)} G). 구매한 정수는 환불되지 않습니다.`} disabled={busy || short} onConfirm={() => send({ type: 'buyEssence', value: String(n) })}/>; })}
        </GoodCard>}
        {tab === 'forge' && <section aria-label="장비 강화" className="grid gap-3">
            {/* v3.76 부위 고르기 + 작업대 하나: 옵션 재설정까지 한 곳에서 합니다. */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="강화할 부위">{(Object.keys(SLOTS) as (keyof typeof SLOTS)[]).map(id => { const it = s.equipment[id], on = forgeSlot === id; return <button type="button" key={id} role="tab" aria-selected={on} onClick={() => setForgeSlot(id)}
                className={cn('flex min-h-11 items-center gap-2 rounded-m border p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50', on ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-2 hover:bg-surface-3/60')} style={it ? { borderLeftColor: it.onyx ? 'var(--rarity-primal)' : rarityVar(rarityKey(it.rarity)), borderLeftWidth: 3 } : undefined}>
                {it ? <ItemArt item={it} size={24}/> : <SlotIcon slot={id} size={18}/>}<span className="grid min-w-0"><small className="text-xs text-ink-3">{SLOTS[id]}</small><b className="truncate text-s" style={it?.onyx ? { color: 'var(--rarity-primal)' } : undefined}>{it ? it.name : '비어 있음'}</b></span>{it && <em className="ml-auto font-num text-xs not-italic text-gold-ink">★{it.enhance || 0}</em>}</button>; })}</div>
            {forgeItem ? <article className="grid gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" style={{ borderTopColor: forgeItem.onyx ? 'var(--rarity-primal)' : rarityVar(rarityKey(forgeItem.rarity)), borderTopWidth: 3 }}>
                <header className="flex items-center gap-3"><ItemArt item={forgeItem} size={34}/><div className="grid min-w-0 gap-0.5"><ItemName item={forgeItem} always className="text-m"/><span className="flex flex-wrap items-center gap-2"><ItemTag item={forgeItem}/><ItemMeta item={forgeItem}/></span></div></header>
                <ForgeBench s={s} send={send} busy={busy} item={forgeItem}/>
            </article> : <EmptyState title={`착용한 ${SLOTS[forgeSlot]}이 없습니다`} description="장비 보관함에서 장착하면 여기서 강화할 수 있습니다."/>}
            <p className="text-xs text-ink-3">보관 중인 장비는 장비 보관함에서 줄을 펼쳐 강화합니다.</p>
        </section>}
        {full && tab !== 'forge' && <p className="rounded-m border border-warn/50 bg-warn/10 px-3 py-2 text-s text-ink-1">가방이 가득 찼습니다. 장비를 정리하면 다시 뽑을 수 있습니다.</p>}
    </div>;
}
