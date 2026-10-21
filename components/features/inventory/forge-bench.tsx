'use client';
/**
 * v3.383 장비 작업대(새 토대): 왼쪽 능력치 · 옵션(재설정 · 재련), 오른쪽 스타포스 · 자동 강화 · 레벨 · 비용 초기화 · 이식 · 계승. 좁은 화면은 위아래로.
 * 서버 행동(enhance · autoEnhance · levelUp · gearReset · reforge · refine · imprintRelic · removeImprint · awaken · inheritPrimal)은 전과 같습니다.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Item, State, Stats } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ConfirmAction, KeyValueList, formatExact } from '@/components/ui/game';
import { useStarSetting, starSound } from '@/components/game/star-catch-setting';
import { cn } from '@/lib/utils';
import { isOnyxUnique } from '@/game/data/onyx';
import { ECONOMY, AFFIXES, RELIC_GROWTH, GEAR_LEVEL_UP, HEIR_GROWTH, AWAKENING, PRIMAL_INHERIT, heirFactor, awakenEssence, researchRank } from '@/game/data/economy';
import { SLOTS } from '@/game/data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay, HIDDEN_STATS, RELIC_LINEAGE } from '@/game/data/progression';
import { jobById, lineageOf } from '@/game/data/classes';
import { itemDescription, enhanceCost, imprintAffix, rerollCost, refineCost, canResetGear, refineTopOf, enhanceMaxFor, imprintCost, levelUpTarget, levelUpCost, heirKind } from '@/game/systems/equipment';
import { ORIGIN_THEMES, affixDef, affixQuality, REROLL_STEP_PCT, REFINE_GROWTH, GEAR_RESET_PEARLS, HEIR_ROLL_TAIL, HEIR_ROLL_TOP, heirRollChanceAbove } from '@/game/data/gear';
import { STARFORCE, starSuccess, starDrops, starDestroy, canSafeguard, chanceTime, starMultiplier, starLabel } from '@/game/data/starforce';
import { stats, power } from '@/game/systems/stats';
import { StarCatch } from './star-catch';
import { BonusList, Box, DeltaList, HEIR_LABEL, Note } from './parts';
import { Fold } from '@/components/features/codex/parts';

type Send = (a: import('@/game/types').Action) => void;
type Props = { s: State; send: Send; busy: boolean; item: Item };
const fmt = formatExact;
const relicShown = (s: State) => { const j = jobById(s.job); return !!j && lineageOf(j) === RELIC_LINEAGE; };
const select = 'h-10 w-full rounded-m border border-line bg-surface-0 px-2 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40 disabled:opacity-50';

export function ForgeBench({ s, send, busy, item, extra }: Props & { extra?: ReactNode }) {
    return <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-3">
            <p className="text-s text-ink-2">{itemDescription(item)}</p>
            <BonusList item={item}/>
            <Note>직업 배율 적용 전 장비 기여 수치 · {starLabel(item.enhance || 0, true)} (기본 수치 ×{starMultiplier(item.enhance || 0).toFixed(2)}){item.origin && ORIGIN_THEMES[item.origin] ? ` · ${ORIGIN_THEMES[item.origin].name}에서 획득` : ''}</Note>
            {!!item.affixes?.length && <GearOptions s={s} send={send} busy={busy} item={item}/>}
            {item.affix && <Box title={`추가 옵션 · ${item.affix.name}`}><span>{STAT_LABELS[item.affix.stat]} {statDeltaDisplay(item.affix.stat, item.affix.value)}</span><Note>{AFFIXES.find(a => a.stat === item.affix?.stat)?.description || '장착 시 해당 능력치에 더해집니다.'} 위 수치에 포함됩니다.</Note></Box>}
            {extra}
        </div>
        <div className="grid content-start gap-3"><EquipmentForge s={s} send={send} busy={busy} item={item}/></div>
    </div>;
}

/** 장비 옵션 목록: 옵션마다 수치 · 품질 · 재설정(골드) · 재련(정수). */
function GearOptions({ s, send, busy, item }: Props) {
    const cost = rerollCost(item, s), canPay = s.gold >= cost.gold, refine = refineCost(item, s), canRefine = (s.essence || 0) >= refine.essence, top = refineTopOf(item);
    const quality = (x: NonNullable<Item['affixes']>[number]) => { const q = affixQuality(x, item.power, item.rarity, item.level, HEIR_ROLL_TOP); return q === null ? null : Math.round(q * 100); };
    return <Box title={`${item.relic ? `이식 옵션 ${item.affixes!.length}/${RELIC_GROWTH.imprintSlots}줄` : `추가 옵션 ${item.affixes!.length}개`}${item.origin && ORIGIN_THEMES[item.origin] ? ` · ${ORIGIN_THEMES[item.origin].name}에서 획득` : ''}`}>
        <ul className="grid gap-2">{item.affixes!.map((x, i) => <li key={x.id + i} className="grid gap-1 rounded-s bg-surface-1 px-2 py-2">
            <div className="flex flex-wrap items-center gap-x-2 text-s"><b className="text-ink-1">{x.rule ? '◆ ' : ''}{x.name}</b>{!HIDDEN_STATS.has(x.stat) && <span className="font-num tabular-nums text-ink-2">{STAT_LABELS[x.stat]} {statDeltaDisplay(x.stat, x.value)}</span>}{x.stat2 && x.value2 ? <span className="font-num tabular-nums text-ink-2">{STAT_LABELS[x.stat2]} {statDeltaDisplay(x.stat2, x.value2)}</span> : null}{quality(x) !== null && <span className="text-xs text-ink-3">수치 {quality(x)}%</span>}</div>
            <Note>{affixDef(x.id)?.description}</Note>
            {!item.relic && !isOnyxUnique(item, x.id) && <div className="flex flex-wrap gap-2">
                <ConfirmAction size="xs" label="재설정" title={`${x.name} 옵션을 다시 굴릴까요?`} description={`이 옵션 하나만 바뀌고 나머지 옵션은 그대로입니다. 골드 ${fmt(cost.gold)} G를 사용합니다(정수 없음). 같은 옵션은 중복되지 않습니다. 규칙 옵션(◆)도 어느 줄에나 나올 수 있습니다.`} disabled={busy || !canPay} onConfirm={() => send({ type: 'reforge', id: item.id, value: String(i) })}/>
                {!x.rule && !affixDef(x.id)?.fixed && <ConfirmAction size="xs" label="재련" title={`${x.name} 옵션의 수치를 다시 굴릴까요?`} description={`옵션 종류는 그대로이고 수치만 최저~최고 사이에서 다시 굴립니다${top > 1 ? `. 이 장비는 수치 ${Math.round(top * 100)}%까지 가능하지만 100% 위는 ${Math.round(HEIR_ROLL_TAIL * 100)}%만 나오고 위로 갈수록 급히 드뭅니다(110% 위 ${(heirRollChanceAbove(1.1) * 100).toFixed(1)}% · 120% 위 ${(heirRollChanceAbove(1.2) * 100).toFixed(1)}% · 130% 위 ${(heirRollChanceAbove(1.3) * 100).toFixed(2)}%)` : ''}. 지금보다 낮아질 수도 있습니다. 정수 ${fmt(refine.essence)}를 사용합니다(골드 없음). 이 장비를 재련할 때마다 다음 정수가 ×${REFINE_GROWTH}로 오릅니다.`} disabled={busy || !canRefine} onConfirm={() => send({ type: 'refine', id: item.id, value: String(i) })}/>}
            </div>}
        </li>)}</ul>
        <Note>{item.relic ? '이식 옵션은 환생해도 남고, 같은 칸에 다시 이식하면 덮어씁니다. 고정 수치 · 비율 옵션 모두 유물 등급 기준으로 맞춰 새겨집니다(태초에서 온 비율 줄 ×0.73). 위 수치는 장비 기여 수치에 포함됩니다.' : <>옵션 재설정 · {fmt(cost.gold)} G{item.rerolls ? ` (이 장비 ${item.rerolls}회 재설정 · 1회마다 +${REROLL_STEP_PCT}%)` : ` (재설정할 때마다 +${REROLL_STEP_PCT}%)`} · 수치 재련 · 정수 {fmt(refine.essence)}{item.refines ? ` (이 장비 ${item.refines}회 재련 · 1회마다 ×${REFINE_GROWTH})` : ` (재련할 때마다 ×${REFINE_GROWTH})`} · 보유 정수 {fmt(s.essence || 0)}</>}</Note>
    </Box>;
}

function EquipmentForge({ s, send, busy, item }: Props) {
    const [safeguard, setSafeguard] = useState(false);
    const star = item.enhance || 0, max = enhanceMaxFor(item), chance = chanceTime(item), guard = safeguard && canSafeguard(star);
    const catchOn = useStarSetting('catch');
    const [catching, setCatching] = useState(false), [fx, setFx] = useState<'' | 'success' | 'drop' | 'keep'>('');
    const prev = useRef({ star, tries: s.starforce?.tries || 0 });
    useEffect(() => {
        const tries = s.starforce?.tries || 0, before = prev.current;
        if (tries !== before.tries) { const kind = star > before.star ? 'success' : star < before.star ? 'drop' : 'keep'; setFx(kind); starSound(kind); const t = setTimeout(() => setFx(''), 900); prev.current = { star, tries }; return () => clearTimeout(t); }
        prev.current = { star, tries };
    }, [star, s.starforce?.tries]);
    const fire = (caught: boolean) => { setCatching(false); const flags = [guard ? 'safeguard' : '', caught ? 'catch' : ''].filter(Boolean).join(','); send({ type: 'enhance', id: item.id, ...(flags ? { value: flags } : {}) }); };
    const cost = enhanceCost(item, s) * (guard ? STARFORCE.safeguardCost : 1);
    const p = chance ? 1 : starSuccess(star), d = chance ? 0 : starDestroy(star, guard), f = Math.max(0, 1 - p - d), pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
    const legacyReroll = !(item.affixes?.length && !item.relic), reroll = rerollCost(item, s);
    return <>
        <Box title={<span className="flex items-center justify-between gap-2">스타포스<span className="font-num text-gold-ink">★{star} / {max}성</span></span>}>
            <div className={cn('flex flex-wrap gap-px text-m leading-none', fx === 'success' && 'animate-in zoom-in-105 duration-700', fx === 'drop' && 'animate-in slide-in-from-left-2 duration-500', fx === 'keep' && 'animate-in fade-in-50 duration-700')} aria-label={`${star} / ${max}성`}>{Array.from({ length: max }, (_, i) => <i key={i} className={cn('not-italic', i < star ? 'text-gold-ink' : 'text-ink-3/50', i > 0 && i % 5 === 0 && 'ml-1.5')} aria-hidden>{i < star ? '★' : '☆'}</i>)}</div>
            {star < max && <KeyValueList columns={2} items={[{ key: '성공', value: pct(p), tone: 'ok' }, { key: '실패', value: `${pct(f)} · ${starDrops(star) ? '1성 하락' : '유지'}` }, ...((d > 0 || canSafeguard(star)) ? [{ key: '파괴', value: pct(d), tone: d > 0 ? 'danger' as const : undefined }] : [])]}/>}
            {chance && star < max && <Note tone="ok">찬스 타임 · 하락이 두 번 이어져 다음 시도는 100% 성공합니다.</Note>}
            {canSafeguard(star) && <label htmlFor={`guard-${item.id}`} className="flex min-h-9 items-center justify-between gap-3 text-s text-ink-2"><span>파괴 방지 (비용 ×{STARFORCE.safeguardCost})</span><Switch id={`guard-${item.id}`} checked={safeguard} onCheckedChange={setSafeguard}/></label>}
            {catching ? <StarCatch bonus={STARFORCE.catchBonus} onResult={fire}/> : <Button type="button" disabled={busy || star >= max || s.gold < cost} onClick={() => catchOn && !chance ? setCatching(true) : fire(false)}>{star >= max ? '최대 강화' : `${star + 1}성 강화 · ${fmt(cost)} G${catchOn && !chance ? ' · 스타캐치' : ''}`}</Button>}
            {star < max && researchRank(s, 'autoStar') > 0 && <AutoStar s={s} send={send} busy={busy} item={item} safeguard={guard}/>}
            <Fold label="강화 규칙"><Note>1~{STARFORCE.gainHighFrom}성 기본 수치 +{STARFORCE.gainLow * 100}%/성, {STARFORCE.gainHighFrom + 1}~{STARFORCE.gainTopFrom}성 +{STARFORCE.gainHigh * 100}%/성, {STARFORCE.gainTopFrom + 1}성부터 +{STARFORCE.gainTop * 100}%/성. {STARFORCE.dropFrom}성부터 실패하면 1성 하락({STARFORCE.safeStars.join(' · ')}성은 유지), 15성부터 파괴 확률이 붙습니다. {STARFORCE.gainTopFrom}성부터는 성공 3 · 2 · 1%의 극한 구간입니다(스타캐치는 성공률 ×{STARFORCE.catchTopScale}). 파괴된 장비는 사라지고 유물 · 계승 · 칠흑은 {STARFORCE.relicResetStar}성({STARFORCE.relicResetHighFrom}성 이상이면 {STARFORCE.relicResetHigh}성)으로 돌아갑니다. 판매하면 강화 비용의 {ECONOMY.saleEnhanceRefund * 100}%를 돌려받습니다.</Note></Fold>
        </Box>
        <GearLevelUp s={s} send={send} busy={busy} item={item}/>
        {canResetGear(item) && (item.rerolls || item.refines) ? <Box title="비용 초기화"><Note>재설정 {item.rerolls || 0}회 · 재련 {item.refines || 0}회 → 0 (다음 재설정 · 재련이 기본 비용으로)</Note>
            <ConfirmAction label={`비용 초기화 · 세계석 ${GEAR_RESET_PEARLS}`} title={`${item.name}의 비용을 초기화할까요?`} description={`세계석 ${GEAR_RESET_PEARLS}를 쓰고 재설정 · 재련 횟수를 0으로 되돌립니다. 대신 별이 0성이 되고 추가 옵션을 모두 새로 굴립니다(수치는 최고${item.onyx ? ', 칠흑 고유 옵션은 그대로' : ''}). 되돌릴 수 없습니다.`} disabled={busy || s.pearls < GEAR_RESET_PEARLS} onConfirm={() => send({ type: 'gearReset', id: item.id })}/></Box> : null}
        {item.relic && <RelicImprint s={s} send={send} busy={busy} item={item}/>}
        {(item.rarity === 5 || item.rarity === 6) && !item.relic && !item.onyx && <HeirPanel s={s} send={send} busy={busy} item={item}/>}
        {legacyReroll && <ConfirmAction label={`옵션 재설정 · ${fmt(reroll.gold)} G`} title="추가 옵션을 무작위로 바꿀까요?" description={`이전 방식의 단일 옵션입니다. 기존 추가 옵션이 사라지고 8종 중 하나가 같은 확률로 선택됩니다. 유물의 전용 옵션도 교체됩니다. 골드 ${fmt(reroll.gold)} G를 사용합니다.`} disabled={busy || item.rarity === 0 || s.gold < reroll.gold || (s.essence || 0) < reroll.essence} onConfirm={() => send({ type: 'reforge', id: item.id })}/>}
    </>;
}

/** 자동 강화(세계석 연구 ‘자동 강화’): 목표 별과 골드 한도를 정해 한 번에 시도합니다. */
function AutoStar({ s, send, busy, item, safeguard }: Props & { safeguard: boolean }) {
    const star = item.enhance || 0, max = enhanceMaxFor(item);
    const [target, setTarget] = useState(Math.min(max, star + 1)), [cap, setCap] = useState('');
    const goal = Math.min(max, Math.max(star + 1, target)), limit = cap.trim() ? Number(cap.replace(/[^\d]/g, '')) : s.gold, ok = Number.isFinite(limit) && limit > 0;
    return <Box title="자동 강화 · 목표까지 연속 시도" className="bg-surface-1">
        <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-ink-3">목표<select className={select} value={goal} onChange={e => setTarget(Number(e.target.value))}>{Array.from({ length: max - star }, (_, i) => star + 1 + i).map(n => <option key={n} value={n}>★{n}</option>)}</select></label>
            <label className="grid gap-1 text-xs text-ink-3">골드 한도<input className={select} type="text" inputMode="numeric" placeholder={`보유 ${fmt(s.gold)}`} value={cap} onChange={e => setCap(e.target.value)}/></label>
        </div>
        <ConfirmAction variant="default" label={`★${goal}까지 자동 강화`} title={`★${goal}까지 자동으로 강화할까요?`} description={`한도 ${fmt(Math.min(limit || 0, s.gold))} G 안에서 목표에 닿을 때까지 계속 시도합니다. 하락 · 파괴도 그대로 일어나며 파괴되면 멈춥니다.${safeguard ? ' 파괴 방지가 적용됩니다.' : ''}`} disabled={busy || !ok} onConfirm={() => send({ type: 'autoEnhance', id: item.id, value: `${goal}:${Math.min(limit, s.gold)}:${safeguard ? 1 : 0}` })}/>
        <Note>결과는 전투 기록에 한 줄(시도 · 성공 · 하락 · 유지 · 파괴 · 쓴 골드)로 남습니다. 한 번에 최대 2,000회.</Note>
    </Box>;
}

/** 레벨 올리기: +10씩 내 레벨까지. 위력 · 고정 수치 옵션이 오르고 별은 0으로. */
function GearLevelUp({ s, send, busy, item }: Props) {
    const next = levelUpTarget(item, s), cost = levelUpCost(item, s), star = item.enhance || 0;
    if (!next) return <Note>레벨 올리기 · Lv.{item.level || 1} · 내 레벨(Lv.{s.level})까지 올렸습니다{item.relic ? ` · 별 상한 ${enhanceMaxFor(item)}성` : ''}</Note>;
    return <Box title={`레벨 올리기 · Lv.${item.level || 1} → Lv.${next}${item.relic ? ` · 별 상한 ${enhanceMaxFor(item)}성` : ''}`}>
        <ConfirmAction label={`Lv.${next}로 올리기 · ${fmt(cost)} G`} title={`${item.name}을(를) Lv.${next}로 올릴까요?`} description={`위력과 고정 수치 옵션이 레벨에 맞춰 오릅니다.${star ? ` 지금 ★${star}은 0으로 돌아갑니다(강화 비용은 돌려받지 않음).` : ''}${item.relic ? ` 유물 별 상한이 ${RELIC_GROWTH.starBase + Math.floor(next / 10)}성이 됩니다.` : ''} 골드 ${fmt(cost)} G를 사용합니다.`} disabled={busy || s.gold < cost} onConfirm={() => send({ type: 'levelUp', id: item.id })}/>
        <Note>한 번에 +{GEAR_LEVEL_UP.step}. 올리면 별이 0으로 돌아가니 별은 레벨을 다 올린 뒤에 쌓으세요.{heirKind(item) ? ' 유물 · 계승 장비 위력은 (레벨 + 2) × 환생 배율입니다.' : ''}</Note>
    </Box>;
}

/** 유물 옵션 이식: 같은 부위의 가방 장비(보호 제외) 하나를 소비해 옵션 한 줄을 유물 칸에 새깁니다. */
function RelicImprint({ s, send, busy, item }: Props) {
    const sources = s.inventory.filter(x => x.slot === item.slot && !x.relic && !x.locked && x.affixes?.length);
    const choices = sources.flatMap(x => x.affixes!.map((a, i) => ({ key: `${x.id}:${i}`, item: x, affix: a, index: i })));
    const [choice, setChoice] = useState(''), [slot, setSlot] = useState(0);
    const picked = choices.find(c => c.key === choice) || choices[0], key = picked?.key || '';
    const lines = item.affixes || [], cost = picked ? imprintCost(picked.item, s) : 0;
    const blocked = !picked ? '' : lines.some((x, i) => i !== slot && x.id === picked.affix.id) ? '이미 같은 옵션이 새겨져 있습니다.' : picked.affix.rule && lines.some((x, i) => i !== slot && x.rule) ? '규칙 옵션은 유물당 하나만 새길 수 있습니다.' : s.gold < cost ? '골드가 부족합니다.' : '';
    const label = (a: NonNullable<Item['affixes']>[number]) => `${a.name} · ${STAT_LABELS[a.stat]} ${statDeltaDisplay(a.stat, a.value)}${a.stat2 && a.value2 ? ` · ${STAT_LABELS[a.stat2]} ${statDeltaDisplay(a.stat2, a.value2)}` : ''}`;
    const preview = (() => {
        if (!picked) return null;
        const next = [...lines]; next[slot] = imprintAffix(picked.affix, picked.item.rarity, item.rarity, picked.item.level, item.level);
        const withRelic = (affixes: Item['affixes']) => ({ ...s, equipment: { ...s.equipment, [item.slot]: { ...item, affixes } } });
        const before = stats(withRelic(lines)), after = stats(withRelic(next.filter(Boolean)));
        const delta = byStatOrder(Object.entries(after).filter(([k, n]) => Math.abs(n - before[k as keyof Stats]) > .001 && (k !== 'relicPower' || relicShown(s)))).map(([k, n]) => [k, n - before[k as keyof Stats]] as [string, number]);
        return { delta, gain: power(after) - power(before) };
    })();
    return <Box title={`옵션 이식 · 환생 ${s.rebirths}회 위력 배율 ×${heirFactor('relic', s.rebirths).toFixed(2)}${item.relicLegacy ? ' · 다음 승천까지 예전 공식과 새 공식 중 높은 쪽' : ''}`}>
        <div className="grid gap-1" role="radiogroup" aria-label="이식 칸">{Array.from({ length: RELIC_GROWTH.imprintSlots }, (_, i) => <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-s bg-surface-1 px-2 py-1.5">
            <label className="flex min-h-9 items-center gap-2 text-s text-ink-2"><input type="radio" className="size-4 accent-[var(--accent)]" name={`imprint-${item.id}`} checked={slot === i} onChange={() => setSlot(i)}/> {i + 1}번 칸 · {lines[i] ? label(lines[i]) : '비어 있음'}</label>
            {lines[i] && <ConfirmAction size="xs" label="지우기" title={`${lines[i].name} 이식 옵션을 지울까요?`} description="이 칸이 비고 옵션은 사라집니다(되돌릴 수 없음). 비용은 없고, 다시 이식할 수 있습니다." disabled={busy} onConfirm={() => send({ type: 'removeImprint', id: item.id, value: String(i) })}/>}
        </div>)}</div>
        {choices.length ? <>
            <label className="grid gap-1 text-xs text-ink-3">소비할 장비 · 옵션<select className={select} value={key} onChange={e => setChoice(e.target.value)}>{choices.map(c => <option key={c.key} value={c.key}>{c.item.name}{starLabel(c.item.enhance || 0) ? ` ${starLabel(c.item.enhance || 0)}` : ''} › {label(imprintAffix(c.affix, c.item.rarity, item.rarity, c.item.level, item.level))}</option>)}</select></label>
            <ConfirmAction variant="default" label={`이식 · ${fmt(cost)} G`} title={`${picked!.affix.name} 옵션을 ${slot + 1}번 칸에 이식할까요?`} description={`${picked!.item.name}이(가) 사라지고 ${picked!.affix.name} 옵션이 유물에 남습니다.${lines[slot] ? ` ${lines[slot].name} 옵션을 덮어씁니다.` : ''} 골드 ${fmt(cost)} G를 사용합니다.`} disabled={busy || !!blocked} onConfirm={() => send({ type: 'imprintRelic', id: item.id, value: `${picked!.key}:${slot}` })}/>
            {picked && <><Note>{affixDef(picked.affix.id)?.description}</Note>{preview && <DeltaList title={`이 유물을 ${SLOTS[item.slot]} 칸에 장착했을 때 최종 능력치 변화 · 전투력 ${preview.gain >= 0 ? '+' : '−'}${fmt(Math.abs(preview.gain))}`} delta={preview.delta}/>}</>}
            {blocked && <Note tone="danger">{blocked}</Note>}
        </> : <Note>같은 부위의 옵션 달린 장비(보호 제외)가 가방에 있어야 이식할 수 있습니다.</Note>}
        <Note>고정 수치 옵션은 원래 장비에서와 같은 효과가 되도록 유물 등급에 맞춰 환산하고, 장비 레벨이 유물과 다르면 유물 레벨에 맞춰 환산해 새깁니다. 이식 비용은 소비하는 장비의 옵션 재설정 골드 ×{RELIC_GROWTH.imprintCost}. 이식 옵션과 성은 환생해도 남고, 파괴되면 {STARFORCE.relicResetStar}성으로 돌아갑니다.</Note>
    </Box>;
}

/** 계승: 고대는 정수로 원시 각성, 태초는 분해 게이지로 계승. */
function HeirPanel({ s, send, busy, item }: Props) {
    const kind = item.rarity === 5 ? 'ancient' : 'primal', g = HEIR_GROWTH[kind], label = HEIR_LABEL[kind], factor = (rb: number) => heirFactor(kind, rb).toFixed(2);
    if (item.heir) return <Box title={`${label} · 환생해도 남습니다`}><Note>위력 = (레벨 + 2) × 배율 ×{factor(s.rebirths)} (환생 {HEIR_GROWTH.toRebirth}회 ×{g.to}). 강화가 파괴되면 {STARFORCE.relicResetStar}성으로 돌아갑니다. 승천하면 사라집니다.</Note></Box>;
    const old = [...s.inventory, ...Object.values(s.equipment)].find(x => x && x.id !== item.id && x.heir === kind && x.slot === item.slot);
    const replace = old ? ` 이 부위의 ${label} ‘${old.name}’은(는) 이번 생 장비로 돌아갑니다(다음 환생 때 사라짐).` : '';
    const what = `환생해도 남고, 위력이 (레벨 + 2) × ${factor(s.rebirths)}(환생 ${HEIR_GROWTH.toRebirth}회 ×${g.to})로 바뀌며 옵션 수치가 최고로 고정됩니다. 판매할 수 없게 되고, 분해는 보호를 푼 뒤에만 됩니다.`;
    if (kind === 'ancient') { const cost = awakenEssence(s.rebirths), have = s.essence || 0;
        return <Box title={`원시 각성 · 정수 ${fmt(cost)} (보유 ${fmt(have)})`}>
            <ConfirmAction label={`원시 각성 · 정수 ${fmt(cost)}`} title={`${item.name}을(를) 원시 각성할까요?`} description={`정수 ${fmt(cost)}를 씁니다. ${what}${replace}`} disabled={busy || have < cost} onConfirm={() => send({ type: 'awaken', id: item.id })}/>
            <Note>각성 비용은 환생이 많을수록 늘어납니다(정수 {fmt(AWAKENING.essenceBase)} × 10^(환생 ÷ {AWAKENING.rebirthScale})). 부위마다 원시 고대 하나만 둘 수 있습니다.</Note>
        </Box>; }
    const gauge = s.primalGauge || 0;
    return <Box title={`태초 계승 · 게이지 ${gauge}/${PRIMAL_INHERIT.gauge}`}>
        <ConfirmAction label={`태초 계승 · 게이지 ${PRIMAL_INHERIT.gauge}`} title={`${item.name}을(를) 계승할까요?`} description={`계승 게이지 ${PRIMAL_INHERIT.gauge}를 씁니다. ${what}${replace}`} disabled={busy || gauge < PRIMAL_INHERIT.gauge} onConfirm={() => send({ type: 'inheritPrimal', id: item.id })}/>
        <Note>태초 장비가 손을 떠날 때마다(분해 · 판매 · 강화 파괴 · 도감 등록 · 이식 소비) 게이지가 1 찹니다(환생해도 남고 승천하면 초기화). 부위마다 계승 태초 하나만 둘 수 있습니다.</Note>
    </Box>;
}
