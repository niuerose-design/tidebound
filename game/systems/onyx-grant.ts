import type { Item, State } from '../types';
import { rollAffixes } from '../data/gear';
import { STAGES } from '../data/world';
import { ONYX, ONYX_DROP_ITEMS, ONYX_TOTAL, onyxAccessory, onyxItemById, onyxCodexKey, onyxCollected, type OnyxBoss } from '../data/onyx';
import { BOSS_CORES, BOSS_CORE_RULES, coreEntry } from '../data/boss-core';
import { grantBossCore } from './boss-loot';
import { tuneOnyx, ownedItems } from './equipment';
import { addLog } from './state';

/**
 * v3.114 칠흑 장신구 하나를 줍니다(보스 드롭 · 환생 이정표 공용). 이미 가진 종이면 각성 +1(최대 awakenMax), 각성까지 다 찼으면 세계석 duplicatePearls.
 * level은 서식지 레벨이고, 실제 장신구 레벨은 그것과 내 레벨 중 높은 쪽입니다(v3.122). 무작위 옵션은 최고 굴림(tuneOnyx)입니다.
 */
export function grantOnyx(s: State, itemId: string, level: number, rng: () => number, source: string) {
    const def = onyxItemById(itemId)!;
    const own = ownedItems(s).find(x => x?.onyx === itemId);
    if (own) {
        const rank = own.onyxRank || 0;
        if (rank < ONYX.awakenMax) {
            own.onyxRank = rank + 1;
            addLog(s, `✦ ${source} · ${def.name} 각성 ${own.onyxRank}/${ONYX.awakenMax}! 고유 옵션 +${Math.round(own.onyxRank * ONYX.awakenStep * 100)}%`, 'reward');
        }
        else { s.pearls += ONYX.duplicatePearls; addLog(s, `✦ ${source} · ${def.name}은(는) 각성까지 마쳐 세계석 +${ONYX.duplicatePearls}`, 'reward'); }
        return 'awaken' as const;
    }
    // v3.122 장신구 레벨은 서식지 레벨과 내 레벨 중 높은 쪽.
    const lv = Math.max(level, s.level || 1), item = onyxAccessory(def, `onyx-${itemId}-${s.turn}`, lv);
    // v3.77 칠흑 장신구의 무작위 옵션은 최고 굴림입니다. 위력은 (레벨 + 2) × ONYX.power(v3.125 6.37, Lv.100 650)이고 골드로 레벨을 올려 키웁니다.
    item.affixes = rollAffixes(ONYX.affixes + 1, item.power, item.origin, rng, item.affixes!, 'charm', lv, item.rarity);
    tuneOnyx(item);
    s.inventory.push(item); s.itemBook ??= {}; s.itemBook[onyxCodexKey(itemId)] = true;
    addLog(s, `✦ ${source} · 칠흑 장신구 ‘${item.name}’ 획득! 환생해도 남습니다 (칠흑 ${onyxCollected(s)}/${ONYX_TOTAL}종) · 물건 도감 자동 등록`, 'reward');
    return 'new' as const;
}

/**
 * v3.116 금고에서 꺼낸 칠흑 장신구를 받습니다. 별 · 각성 단계는 그대로이고, 이미 같은 종을 가졌으면 그 장신구가 각성 +1(다 찼으면 세계석)입니다.
 * 소식은 띄우지 않습니다(onyxGift 0).
 */
export function receiveOnyx(s: State, item: Item) {
    const def = onyxItemById(item.onyx!)!;
    const own = ownedItems(s).find(x => x?.onyx === item.onyx);
    if (own) {
        const rank = own.onyxRank || 0;
        (s.onyxGift ??= {})[item.onyx!] = 0;
        if (rank < ONYX.awakenMax) { own.onyxRank = rank + 1; addLog(s, `✦ 금고의 ${def.name} · 이미 가진 칠흑이라 각성 ${own.onyxRank}/${ONYX.awakenMax}! 고유 옵션 +${Math.round(own.onyxRank * ONYX.awakenStep * 100)}%`, 'reward'); }
        else { s.pearls += ONYX.duplicatePearls; addLog(s, `✦ 금고의 ${def.name} · 각성까지 마쳐 세계석 +${ONYX.duplicatePearls}`, 'reward'); }
        return 'awaken' as const;
    }
    const taken = new Set(ownedItems(s).map(x => x?.id));
    const got = { ...item, id: taken.has(item.id) ? `onyx-${item.onyx}-${s.turn}-v` : item.id };
    // v3.125 금고에 들어가 있던 장신구도 지금 위력 계수에 맞춥니다.
    tuneOnyx(got);
    s.inventory.push(got); s.itemBook ??= {}; s.itemBook[onyxCodexKey(item.onyx!)] = true; (s.onyxGift ??= {})[item.onyx!] = 0;
    addLog(s, `✦ 계정 금고에서 칠흑 장신구 ‘${got.name}’을(를) 꺼냈습니다 (칠흑 ${onyxCollected(s)}/${ONYX_TOTAL}종)`, 'reward');
    return 'new' as const;
}

/** v3.114 환생 이정표 칠흑: 이 환생 횟수에 닿으면(승천 전 기록 포함) 무작위 칠흑 1개. 캐릭터 평생 한 번씩이라 승천 뒤 다시 닿아도 주지 않습니다. */
export const ONYX_MILESTONES = [50, 100] as const;
/** 이 캐릭터가 지금까지 닿은 가장 높은 환생 횟수(지금 생과 남아 있는 승천 기록). */
export const bestRebirths = (s: Pick<State, 'rebirths' | 'ascensionLog'>) => Math.max(s.rebirths || 0, ...(s.ascensionLog || []).map(x => x.rebirths || 0));
/** 받을 이정표를 모두 지급합니다(여러 번 불러도 같음). 소급 적용은 세이브를 불러올 때(migrateState), 새로 닿는 것은 환생할 때 부릅니다. */
export function grantOnyxMilestones(s: State, rng: () => number = Math.random) {
    const got = new Set(s.onyxMilestones || []), best = bestRebirths(s);
    for (const m of ONYX_MILESTONES) {
        if (got.has(m) || best < m) continue;
        // v3.276 지금 칠흑 보스에게서 얻을 수 있는 장신구 중 하나.
        const def = ONYX_DROP_ITEMS[Math.min(ONYX_DROP_ITEMS.length - 1, Math.floor(rng() * ONYX_DROP_ITEMS.length))];
        const level = STAGES.find(st => st.region === def.region && st.habitat)?.level || 1;
        got.add(m); s.onyxMilestones = [...got].sort((a, b) => a - b);
        if (grantOnyx(s, def.id, level, rng, `환생 ${m}회 달성 보상`) === 'new') (s.onyxGift ??= {})[def.id] = m;
    }
}

/** v3.276 칠흑 보스가 주는 것의 이름(장신구 또는 칠흑 보스코어). */
export const onyxDropName = (boss: OnyxBoss) => 'charm' in boss.drop ? onyxItemById(boss.drop.charm)!.name : BOSS_CORES[boss.drop.core].name;
/** v3.276 칠흑 보스가 주는 것을 이미 가졌으면 그 각성 단계, 없으면 -1. */
export function onyxDropRank(s: State, boss: OnyxBoss) {
    if ('core' in boss.drop) { const e = coreEntry(s.bossCores?.[boss.drop.core]); return e ? Math.min(BOSS_CORE_RULES.awakenMax, e.rank) : -1; }
    const id = boss.drop.charm, own = ownedItems(s).find(x => x?.onyx === id);
    return own ? own.onyxRank || 0 : -1;
}
/** v3.276 칠흑 보스 격파 보상을 줍니다(장신구면 grantOnyx, 칠흑 보스코어면 grantBossCore). 새로 얻었으면 'new'. */
export function grantOnyxDrop(s: State, boss: OnyxBoss, level: number, rng: () => number, source: string) {
    if ('charm' in boss.drop) return grantOnyx(s, boss.drop.charm, level, rng, source);
    const had = s.bossCores?.[boss.drop.core] !== undefined;
    grantBossCore(s, boss.drop.core, rng, source);
    return had ? 'awaken' as const : 'new' as const;
}
