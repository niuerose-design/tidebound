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
 * 보스마다 고유 성향·기술이 있습니다(data/encounters PROFILES onyx*).
 * v3.77 무작위 옵션은 얻을 때 최고 굴림(systems/equipment tuneOnyx), 강화 파괴 시 12성으로 돌아갑니다. 위력은 (레벨 + 2) × power이고 골드로 레벨을 올려 키웁니다(환생으로 저절로 오르지 않음).
 */
// v3.52 출현·드롭 확률과 천장은 서버 전용(game/secret/odds.ts). 체력·공격·머무는 턴·옵션 수는 공개.
export const ONYX = { get chance() { return ODDS.onyx.chance; }, get chancePerTier() { return ODDS.onyx.perTier; }, get pity() { return ODDS.onyx.pity; }, hp: 100, attack: 3, turns: 80, get drop() { return ODDS.onyx.drop; }, get dropPity() { return ODDS.onyx.dropPity; }, duplicatePearls: 5, power: 5.2, affixes: 5,
    /** v3.113 각성: 이미 가진 칠흑을 다시 얻으면(같은 드롭 확률 · 천장) 고유 옵션 +awakenStep씩, 최대 awakenMax단계. 세계석은 그대로 받습니다. */
    awakenMax: 5, awakenStep: .1,
    /** v3.113 공명: 착용하지 않은 칠흑 장신구의 고유 옵션을 이 비율만큼 받습니다(각성 포함, 강화 · 별 보정 없음). */
    resonance: .1 };
export type OnyxBoss = { id: string; name: string; region: string; accessory: { name: string; desc: string; affix: ItemAffix } };
export const ONYX_BOSSES: OnyxBoss[] = [
    { id: 'onyxDusk', name: '더스크', region: '리스항구', accessory: { name: '거대한 공포', desc: '더스크를 쓰러뜨린 증표. 가시 반격이 크게 오릅니다.', affix: { id: 'onyxThorns', name: '공포의 가시', stat: 'thorns', value: .1, rule: true } } },
    { id: 'onyxDunkel', name: '듄켈', region: '헤네시스', accessory: { name: '커맨더 포스 이어링', desc: '듄켈의 귀걸이. 연속 행동 확률이 오릅니다.', affix: { id: 'onyxChain', name: '지휘관의 박자', stat: 'chainBonus', value: .1, rule: true } } },
    { id: 'onyxWill', name: '윌', region: '페리온', accessory: { name: '루즈 컨트롤 머신 마크', desc: '윌의 장치. 상태이상 저항이 오르고 내 기절·침묵·감속이 1턴 길어집니다.', affix: { id: 'onyxControl', name: '거미의 실', stat: 'statusResist', value: .15, stat2: 'controlBonus', value2: 1, rule: true } } },
    { id: 'onyxLucid', name: '루시드', region: '엘리니아', accessory: { name: '몽환의 벨트', desc: '루시드의 벨트. 마력 평타 확률과 마력 평타 배율이 오릅니다.', affix: { id: 'onyxArcane', name: '몽환의 마력', stat: 'arcaneStrike', value: .1, stat2: 'arcaneRatioBonus', value2: .1, rule: true } } },
    { id: 'onyxHilla', name: '진 힐라', region: '커닝시티', accessory: { name: '마력이 깃든 안대', desc: '진 힐라의 안대. 상태이상 저항이 크게 오르고 턴마다 체력을 회복합니다.', affix: { id: 'onyxWard', name: '사령의 가호', stat: 'statusResist', value: .2, stat2: 'hpRegen', value2: 15, rule: true } } },
    { id: 'onyxSeren', name: '세렌', region: '시간의 신전', accessory: { name: '미트라의 분노', desc: '세렌의 증표. 보스·사냥감에게 주는 피해가 오릅니다.', affix: { id: 'onyxBoss', name: '태양의 분노', stat: 'bossDamage', value: .15, rule: true } } },
    { id: 'onyxBlackMage', name: '검은 마법사', region: '아케인 리버', accessory: { name: '창세의 뱃지', desc: '검은 마법사의 뱃지. 체력·마나·공격·방어가 모두 오릅니다.', affix: { id: 'onyxGenesis', name: '창세의 힘', stat: 'allStats', value: .05, rule: true } } },
];
export const onyxBossFor = (region: string) => ONYX_BOSSES.find(b => b.region === region);
/** v3.113 각성 배율: 1 + 단계 × awakenStep. */
export const onyxAwaken = (item: Pick<Item, 'onyxRank'>) => 1 + Math.min(ONYX.awakenMax, Math.max(0, item.onyxRank || 0)) * ONYX.awakenStep;
/** v3.113 칠흑 고유 옵션의 각성 적용 값. 제어 연장(controlBonus, 턴)은 정수라 각성 · 공명을 받지 않습니다. */
export const onyxScaledStat = (stat: string, value: number, mult: number) => stat === 'controlBonus' ? value : value * mult;
/** v3.113 이 칠흑 장신구의 고유 옵션(보스별 1줄)인지. */
export const isOnyxUnique = (item: Pick<Item, 'onyx'>, affixId: string) => !!item.onyx && ONYX_BOSSES.some(b => b.id === item.onyx && b.accessory.affix.id === affixId);
/** v3.113 공명: 착용하지 않은 칠흑 장신구마다 고유 옵션(각성 포함) × resonance. 제어 연장은 빠집니다. */
export function onyxResonance(s: Pick<State, 'inventory' | 'equipment'>) {
    const worn = new Set(Object.values(s.equipment).map(i => i?.id).filter(Boolean)), out: Record<string, number> = {};
    for (const item of s.inventory) {
        if (!item.onyx || worn.has(item.id)) continue;
        const a = ONYX_BOSSES.find(b => b.id === item.onyx)?.accessory.affix;
        if (!a) continue;
        const m = onyxAwaken(item) * ONYX.resonance;
        out[a.stat] = (out[a.stat] || 0) + a.value * m;
        if (a.stat2 && a.value2 && a.stat2 !== 'controlBonus') out[a.stat2] = (out[a.stat2] || 0) + a.value2 * m;
    }
    return out;
}
export const onyxById = (id: string) => ONYX_BOSSES.find(b => b.id === id);
/** v3.14 물건 도감 키: 칠흑 장신구는 얻는 순간 자동 등록(장비 소모 없음, 환생 유지). */
export const onyxCodexKey = (bossId: string) => `onyx:${bossId}`;
/** 보유한 칠흑 장신구의 보스 id 집합(가방·착용). */
export const ownedOnyx = (s: Pick<State, 'inventory' | 'equipment'>) => new Set([...s.inventory, ...Object.values(s.equipment)].map(i => i?.onyx).filter((x): x is string => !!x));
/** v3.12 칠흑 세트: 착용이 아니라 보유 수 기준(장신구 칸이 하나라서). 환생해도 남는 영구 보너스. */
export const ONYX_SET: { count: number; label: string; bossDamage?: number; habitatReward?: number; statusResist?: number; allStats?: number }[] = [
    { count: 2, label: '보스·사냥감 피해 +5%', bossDamage: .05 },
    { count: 4, label: '무리 서식지 골드·경험치 +15%', habitatReward: .15 },
    { count: 6, label: '상태이상 저항 +10%p', statusResist: .1 },
    { count: 7, label: '체력·마나·공격·방어 +3%', allStats: .03 },
];
export const onyxSetBonus = (owned: number) => ONYX_SET.filter(b => owned >= b.count).reduce((a, b) => ({ bossDamage: a.bossDamage + (b.bossDamage || 0), habitatReward: a.habitatReward + (b.habitatReward || 0), statusResist: a.statusResist + (b.statusResist || 0), allStats: a.allStats + (b.allStats || 0) }), { bossDamage: 0, habitatReward: 0, statusResist: 0, allStats: 0 });
/** 서식지 출현마다 칠흑 보스가 나올 확률. 못 본 횟수가 pity에 닿으면 확정. */
export const onyxChance = (tier: number, seen: number) => seen >= ONYX.pity ? 1 : ONYX.chance * (1 + tier * ONYX.chancePerTier);
/** 칠흑 장신구를 만듭니다(태초 고정, 레벨은 부르는 쪽이 정함(v3.122 서식지 레벨과 내 레벨 중 높은 쪽), 고유 규칙 옵션 + 무작위 옵션은 호출자가 채움). */
export function onyxAccessory(boss: OnyxBoss, id: string, level: number): Item {
    const stage = STAGES.find(st => st.region === boss.region && st.habitat);
    return { id, name: boss.accessory.name, slot: 'charm', rarity: RARITIES.length - 1, level, power: Math.max(2, Math.round((level + 2) * ONYX.power)), locked: true, onyx: boss.id, origin: stage?.id, description: boss.accessory.desc, affixes: [{ ...boss.accessory.affix }] };
}
