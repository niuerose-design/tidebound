import type { Item, State } from '../types';
import type { ItemAffix } from './gear';
import { STAGES } from './world';
import { RARITIES } from './balance';
import { ODDS } from './odds';

/**
 * v3.12 칠흑의 보스: 무리 서식지에서만 아주 드물게 나오는 지역 보스. 집중 사냥 대상이 될 수 없고 변종·까미·누리와 겹치지 않습니다.
 * 능력치는 그 서식지에서 가장 강한 몬스터(난이도 보정 뒤)의 체력 ×hp, 공격 ×attack인 단일 개체이고, turns턴 안에 못 잡으면 떠납니다(도망 보상 없음).
 * 처치하면 drop 확률로 그 보스의 칠흑 장신구 1개를 받습니다(dropPity번째 연속 미획득 격파는 확정, 종당 1개, 이미 있으면 세계석 duplicatePearls). 장신구는 환생해도 남습니다.
 * 엔드 콘텐츠 기준: 서식지 방치 시 출현 약 180회/시간 → 보스 약 13회/일(난이도 0). drop .003 · 천장 400이면 장신구 1개에 기대 약 18일, 최장 약 31일(난이도 50에서는 절반). 7종 완성은 반년 남짓.
 * v3.278 아쿠아로드 스우(루즈 컨트롤 머신 마크) · 리프레 데미안(마력이 깃든 안대)을 더해 칠흑 보스 9마리, 9종 모두 얻을 수 있습니다.
 * v3.276 장신구와 보스를 나눴습니다(ONYX_ITEMS · ONYX_BOSSES.drop). 윌은 칠흑 보스코어 ‘저주받은 마도서’, 진 힐라는 ‘고통의 근원’을 줍니다. 수집은 9종(장신구 8 + 마도서).
 * 보스마다 고유 성향·기술이 있습니다(data/encounters PROFILES onyx*).
 * v3.77 무작위 옵션은 얻을 때 최고 굴림(systems/equipment tuneOnyx), 강화 파괴 시 12성으로 돌아갑니다. 위력은 (레벨 + 2) × power(onyxPower)이고 골드로 레벨을 올려 키웁니다(환생으로 저절로 오르지 않음).
 * v3.125 power 6.37(Lv.100 650). 이미 가진 장신구는 불러올 때 위력과 고정 수치 옵션을 함께 맞춥니다(tuneOnyx).
 */
// v3.52 출현·드롭 확률과 천장은 서버 전용(game/secret/odds.ts). 체력·공격·머무는 턴·옵션 수는 공개.
export const ONYX = { get chance() { return ODDS.onyx.chance; }, get chancePerTier() { return ODDS.onyx.perTier; }, get pity() { return ODDS.onyx.pity; }, /** v3.188 체력 배율은 보스마다(ONYX_BOSSES[].hpMul). 공격은 서식지 최강 ×3 그대로. */ attack: 3, turns: 80, get drop() { return ODDS.onyx.drop; }, get dropPity() { return ODDS.onyx.dropPity; }, duplicatePearls: 5,
    /** v3.125 위력 계수: Lv.100에서 650(환생 60 계승 태초 606과 환생 200 계승 태초 788 사이). 각성 · 7종 세트까지 모으면 환생 200 계승 태초 장신구를 넘도록 둔 값입니다. */
    power: 6.37, affixes: 5,
    /** v3.113 각성: 이미 가진 칠흑을 다시 얻으면(같은 드롭 확률 · 천장) 고유 옵션 +awakenStep씩, 최대 awakenMax단계. 세계석은 그대로 받습니다. */
    awakenMax: 5, awakenStep: .1,
    /** v3.113 공명: 착용하지 않은 칠흑 장신구의 고유 옵션을 이 비율만큼 받습니다(각성 포함, 강화 · 별 보정 없음). */
    resonance: .1 };
/**
 * v3.276 칠흑 장신구는 보스와 따로 정의합니다(id는 예전 보스 id를 그대로 써 세이브 · 도감 키가 이어짐).
 * boss는 지금 그 장신구를 떨어뜨리는 칠흑 보스이고, 없으면 지금은 새로 얻거나 각성할 수 없습니다(이미 가진 장신구는 그대로).
 */
export type OnyxItemDef = { id: string; name: string; desc: string; affix: ItemAffix; /** 장신구 출신 서식지(origin) */ region: string; boss?: string };
export const ONYX_ITEMS: OnyxItemDef[] = [
    { id: 'onyxDusk', boss: 'onyxDusk', region: '리스항구', name: '거대한 공포', desc: '더스크를 쓰러뜨린 증표. 가시 반격이 크게 오릅니다.', affix: { id: 'onyxThorns', name: '공포의 가시', stat: 'thorns', value: .1, rule: true } },
    { id: 'onyxDunkel', boss: 'onyxDunkel', region: '헤네시스', name: '커맨더 포스 이어링', desc: '듄켈의 귀걸이. 연속 행동 확률이 오릅니다.', affix: { id: 'onyxChain', name: '지휘관의 박자', stat: 'chainBonus', value: .1, rule: true } },
    { id: 'onyxWill', boss: 'onyxSwoo', region: '아쿠아로드', name: '루즈 컨트롤 머신 마크', desc: '스우의 제어 장치. 상태이상 저항이 오르고 내 기절·침묵·감속이 1턴 길어집니다.', affix: { id: 'onyxControl', name: '거미의 실', stat: 'statusResist', value: .15, stat2: 'controlBonus', value2: 1, rule: true } },
    { id: 'onyxLucid', boss: 'onyxLucid', region: '엘리니아', name: '몽환의 벨트', desc: '루시드의 벨트. 마력 평타 확률과 마력 평타 배율이 오릅니다.', affix: { id: 'onyxArcane', name: '몽환의 마력', stat: 'arcaneStrike', value: .1, stat2: 'arcaneRatioBonus', value2: .1, rule: true } },
    { id: 'onyxHilla', boss: 'onyxDamien', region: '리프레', name: '마력이 깃든 안대', desc: '데미안의 안대. 상태이상 저항이 크게 오르고 턴마다 체력을 회복합니다.', affix: { id: 'onyxWard', name: '사령의 가호', stat: 'statusResist', value: .2, stat2: 'hpRegen', value2: 15, rule: true } },
    { id: 'onyxPain', boss: 'onyxHilla', region: '커닝시티', name: '고통의 근원', desc: '진 힐라가 품은 고통의 결정. 준 피해로 체력을 빼앗고 빈사의 적을 더 쉽게 끝냅니다.', affix: { id: 'onyxSoul', name: '영혼 착취', stat: 'lifesteal', value: .05, stat2: 'executeBonus', value2: .05, rule: true } },
    { id: 'onyxSeren', boss: 'onyxSeren', region: '시간의 신전', name: '미트라의 분노', desc: '세렌의 증표. 보스·사냥감에게 주는 피해가 오릅니다.', affix: { id: 'onyxBoss', name: '태양의 분노', stat: 'bossDamage', value: .15, rule: true } },
    { id: 'onyxBlackMage', boss: 'onyxBlackMage', region: '아케인 리버', name: '창세의 뱃지', desc: '검은 마법사의 뱃지. 체력·마나·공격·방어가 모두 오릅니다.', affix: { id: 'onyxGenesis', name: '창세의 힘', stat: 'allStats', value: .05, rule: true } },
];
/** v3.276 칠흑 보스코어(윌 · 저주받은 마도서). 장신구가 아니라 보스 코어 칸에 끼며 data/boss-core BOSS_CORES에 있습니다. */
export const ONYX_CORE_ID = 'onyxGrimoire';
/** 칠흑 수집 종류 수: 장신구 + 칠흑 보스코어. */
export const ONYX_TOTAL = ONYX_ITEMS.length + 1;
/** v3.276 drop: 격파 시 주는 칠흑 장신구(charm) 또는 칠흑 보스코어(core). */
export type OnyxBoss = { id: string; name: string; region: string; /** v3.188 몸 = 서식지 최강 몬스터 체력 × hpMul(docs/boss-plan.md §8.1 C안, 빌림 기준: 적정 환생 빌림 몸 9~16턴 · 자기 계열은 환생 50부터). 앞 지역은 최강 몬스터가 약해 배율이 크고 뒤 지역은 작습니다. */ hpMul: number; drop: { charm: string } | { core: string } };
export const ONYX_BOSSES: OnyxBoss[] = [
    { id: 'onyxDusk', hpMul: 5000, name: '더스크', region: '리스항구', drop: { charm: 'onyxDusk' } },
    { id: 'onyxDunkel', hpMul: 1600, name: '듄켈', region: '헤네시스', drop: { charm: 'onyxDunkel' } },
    { id: 'onyxWill', hpMul: 750, name: '윌', region: '페리온', drop: { core: ONYX_CORE_ID } },
    { id: 'onyxLucid', hpMul: 800, name: '루시드', region: '엘리니아', drop: { charm: 'onyxLucid' } },
    { id: 'onyxHilla', hpMul: 400, name: '진 힐라', region: '커닝시티', drop: { charm: 'onyxPain' } },
    { id: 'onyxSwoo', hpMul: 200, name: '스우', region: '아쿠아로드', drop: { charm: 'onyxWill' } },
    { id: 'onyxDamien', hpMul: 120, name: '데미안', region: '리프레', drop: { charm: 'onyxHilla' } },
    { id: 'onyxSeren', hpMul: 70, name: '세렌', region: '시간의 신전', drop: { charm: 'onyxSeren' } },
    { id: 'onyxBlackMage', hpMul: 80, name: '검은 마법사', region: '아케인 리버', drop: { charm: 'onyxBlackMage' } },
];
export const onyxItemById = (id: string) => ONYX_ITEMS.find(i => i.id === id);
/** 그 보스가 주는 칠흑 장신구 정의(보스코어를 주는 보스면 undefined). */
export const onyxCharmOf = (boss: OnyxBoss) => 'charm' in boss.drop ? onyxItemById(boss.drop.charm) : undefined;
/** 지금 칠흑 보스에게서 얻을 수 있는 장신구(상점 · 환생 이정표 후보). */
export const ONYX_DROP_ITEMS = ONYX_ITEMS.filter(i => !!i.boss);
export const onyxBossFor = (region: string) => ONYX_BOSSES.find(b => b.region === region);
/** v3.113 각성 배율: 1 + 단계 × awakenStep. */
export const onyxAwaken = (item: Pick<Item, 'onyxRank'>) => 1 + Math.min(ONYX.awakenMax, Math.max(0, item.onyxRank || 0)) * ONYX.awakenStep;
/** v3.113 칠흑 고유 옵션의 각성 적용 값. 제어 연장(controlBonus, 턴)은 정수라 각성 · 공명을 받지 않습니다. */
export const onyxScaledStat = (stat: string, value: number, mult: number) => stat === 'controlBonus' ? value : value * mult;
/** v3.113 이 칠흑 장신구의 고유 옵션(보스별 1줄)인지. */
export const isOnyxUnique = (item: Pick<Item, 'onyx'>, affixId: string) => !!item.onyx && ONYX_ITEMS.some(i => i.id === item.onyx && i.affix.id === affixId);
/** v3.113 공명: 착용하지 않은 칠흑 장신구마다 고유 옵션(각성 포함) × resonance. 제어 연장은 빠집니다. */
export function onyxResonance(s: Pick<State, 'inventory' | 'equipment'>) {
    const worn = new Set(Object.values(s.equipment).map(i => i?.id).filter(Boolean)), out: Record<string, number> = {};
    for (const item of s.inventory) {
        if (!item.onyx || worn.has(item.id)) continue;
        const a = onyxItemById(item.onyx)?.affix;
        if (!a) continue;
        const m = onyxAwaken(item) * ONYX.resonance;
        out[a.stat] = (out[a.stat] || 0) + a.value * m;
        if (a.stat2 && a.value2 && a.stat2 !== 'controlBonus') out[a.stat2] = (out[a.stat2] || 0) + a.value2 * m;
    }
    return out;
}
export const onyxById = (id: string) => ONYX_BOSSES.find(b => b.id === id);
/** v3.14 물건 도감 키: 칠흑 장신구는 얻는 순간 자동 등록(장비 소모 없음, 환생 유지). */
export const onyxCodexKey = (itemId: string) => `onyx:${itemId}`;
/** 보유한 칠흑 장신구의 id 집합(가방·착용). */
export const ownedOnyx = (s: Pick<State, 'inventory' | 'equipment'>) => new Set([...s.inventory, ...Object.values(s.equipment)].map(i => i?.onyx).filter((x): x is string => !!x));
/** v3.276 칠흑 수집 수: 보유한 칠흑 장신구 종류 + 칠흑 보스코어(저주받은 마도서). 세트 · 업적 · 칭호가 씁니다. */
export const onyxCollected = (s: Pick<State, 'inventory' | 'equipment'> & Partial<Pick<State, 'bossCores'>>) => ownedOnyx(s).size + (s.bossCores?.[ONYX_CORE_ID] !== undefined ? 1 : 0);
/** v3.12 칠흑 세트: 착용이 아니라 보유 수 기준(장신구 칸이 하나라서). 환생해도 남는 영구 보너스. v3.276 9종(마도서 포함) 단계 추가. */
export const ONYX_SET: { count: number; label: string; bossDamage?: number; habitatReward?: number; statusResist?: number; allStats?: number }[] = [
    { count: 2, label: '보스·사냥감 피해 +5%', bossDamage: .05 },
    { count: 4, label: '무리 서식지 골드·경험치 +15%', habitatReward: .15 },
    { count: 6, label: '상태이상 저항 +10%p', statusResist: .1 },
    { count: 7, label: '체력·마나·공격·방어 +3%', allStats: .03 },
    { count: 9, label: '보스·사냥감 피해 +10%', bossDamage: .1 },
];
export const onyxSetBonus = (owned: number) => ONYX_SET.filter(b => owned >= b.count).reduce((a, b) => ({ bossDamage: a.bossDamage + (b.bossDamage || 0), habitatReward: a.habitatReward + (b.habitatReward || 0), statusResist: a.statusResist + (b.statusResist || 0), allStats: a.allStats + (b.allStats || 0) }), { bossDamage: 0, habitatReward: 0, statusResist: 0, allStats: 0 });
/** 서식지 출현마다 칠흑 보스가 나올 확률. 못 본 횟수가 pity에 닿으면 확정. */
export const onyxChance = (tier: number, seen: number, boost = 0) => seen >= ONYX.pity ? 1 : ONYX.chance * (1 + tier * ONYX.chancePerTier) * (1 + boost);
/** 칠흑 장신구의 위력: (레벨 + 2) × ONYX.power. 획득 · 레벨 올리기 · 불러오기(tuneOnyx)가 같은 식을 씁니다. */
export const onyxPower = (level: number) => Math.max(2, Math.round((Math.max(1, level) + 2) * ONYX.power));
/** 칠흑 장신구를 만듭니다(태초 고정, 레벨은 부르는 쪽이 정함(v3.122 서식지 레벨과 내 레벨 중 높은 쪽), 고유 규칙 옵션 + 무작위 옵션은 호출자가 채움). */
export function onyxAccessory(def: OnyxItemDef, id: string, level: number): Item {
    const stage = STAGES.find(st => st.region === def.region && st.habitat);
    return { id, name: def.name, slot: 'charm', rarity: RARITIES.length - 1, level, power: onyxPower(level), locked: true, onyx: def.id, origin: stage?.id, description: def.desc, affixes: [{ ...def.affix }] };
}
