import type { Skill } from '../types';
export type Specialization = { id: string; name: string; description: string; dungeon?: string; family?: 'physical' | 'magic' | 'healing' };
export const SPECIALIZATIONS: Specialization[] = [
    { id: 'precision', name: '정밀 챔질', description: '명중 +8%p. 직접 피해 배율 −10%. 회피가 높은 적을 상대합니다.' },
    { id: 'bloodlink', name: '상처 추적', family: 'physical', description: '이미 출혈 중인 적에게 직접 피해 +35%. 기본 피해 배율 −10%. 출혈 기술과 연계합니다.' },
    { id: 'currentlink', name: '약점 해류', family: 'magic', description: '이미 약화된 적에게 직접 피해 +35%. 기본 피해 배율 −10%. 약화 주문과 연계합니다.' },
    { id: 'reserve', name: '마나 절약', family: 'magic', description: '마나 비용 −25%(올림, 최소 1). 직접 피해 배율 −10%.' },
    { id: 'disrupt', name: '봉인 추격', dungeon: 'grotto', description: '이미 침묵·감속 중인 적에게 직접 피해 +40%. 기본 피해 배율 −10%.' },
    { id: 'purify', name: '정화의 숨', dungeon: 'kelpCatacomb', family: 'healing', description: '회복·흡혈 기술 발동 시 자신의 출혈·감속을 해제합니다. 직접 피해 배율 −20%.' },
    { id: 'shatter', name: '닻 파쇄', dungeon: 'cemetery', description: '이 기술의 방어 관통 +25%p(합계 최대 85%). 직접 피해 배율 −15%.' },
    { id: 'echo', name: '촉수의 잔향', dungeon: 'caldera', description: '추가타가 없는 공격에 위력 35%의 추가타 1회. 본타 피해 배율 −20%.' },
];
export const BOSS_RESEARCH: Record<string, { sp: number; specialization?: string }> = {
    grotto: { sp: 1, specialization: 'disrupt' }, kelpCatacomb: { sp: 1, specialization: 'purify' },
    cemetery: { sp: 1, specialization: 'shatter' }, caldera: { sp: 1, specialization: 'echo' },
    temple: { sp: 2 }, starSanctum: { sp: 2 }, abyss: { sp: 2 },
};
export function specializationFits(sk: Skill, spec: Specialization) {
    return sk.type === 'active' && (spec.id !== 'echo' || !sk.extraAttacks) &&
        (!spec.family || (spec.family === 'magic' ? sk.damageType === 'magic' : spec.family === 'physical' ? sk.damageType !== 'magic' : sk.effect === 'heal' || sk.effect === 'drain'));
}
export function applySpecialization(sk: Skill, id?: string): Skill {
    const spec = SPECIALIZATIONS.find(x => x.id === id);
    if (!spec || !specializationFits(sk, spec)) return sk;
    const out = { ...sk };
    out.multiplier *= spec.id === 'purify' || spec.id === 'echo' ? .8 : spec.id === 'shatter' ? .85 : .9;
    if (spec.id === 'precision') out.accuracyBonus = (out.accuracyBonus || 0) + .08;
    if (spec.id === 'bloodlink') { out.damageBonusCondition = 'bleeding'; out.conditionalDamageBonus = .35; }
    if (spec.id === 'currentlink') { out.damageBonusCondition = 'weakened'; out.conditionalDamageBonus = .35; }
    if (spec.id === 'disrupt') { out.damageBonusCondition = 'controlled'; out.conditionalDamageBonus = .4; }
    if (spec.id === 'reserve') out.manaCost = Math.max(1, Math.ceil((out.manaCost || 0) * .75));
    if (spec.id === 'purify') out.cleanseSelf = true;
    if (spec.id === 'shatter') out.penetrationBonus = (out.penetrationBonus || 0) + .25;
    if (spec.id === 'echo') { out.extraAttacks = 1; out.extraAttackMultiplier = .35; }
    return out;
}
