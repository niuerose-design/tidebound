import type { Skill, State } from '../types';
import { SKILLS } from '../data/skills';
import { stats } from './stats';
import { lineage, apCapacity, apUsed, canUse, effectiveSkill, skillMastery, validLoadout, skillVeiled } from './progression';

/**
 * 추천 편성: 현재 직업 전용 → 선행 계보 → 공용 → 계승한 다른 직업 순으로, 액티브는 발동률 × 위력, 패시브는 양수 수치 합이 큰 순서대로 AP 안에서 채웁니다. 패시브 몫(총 AP의 약 40%)을 먼저 채웁니다.
 * 화면용 추천일 뿐이라 서버 규칙(setSkills의 사용 가능·AP 검사)을 그대로 통과해야 적용됩니다.
 */
export function recommendLoadout(s: State) {
    const line = lineage(s.job), magic = stats(s).magic > stats(s).attack;
    const rank = (sk: Skill) => sk.job === s.job ? 0 : sk.job && line.includes(sk.job) ? 1 : !sk.job ? 2 : 3;
    const fx = (sk: Skill) => effectiveSkill(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id), s.skillSpecializations?.[sk.id], s.skillPractice[sk.id] || 0);
    const worth = (sk: Skill) => { const e = fx(sk); if (sk.type === 'active') return (e.chance || 0) * Math.max(1, e.multiplier || 1) * (sk.damageType === 'magic' ? (magic ? 1 : .4) : sk.damageType === 'physical' ? (magic ? .4 : 1) : 1) * (sk.statusOnly ? .5 : 1); return Object.values(e.bonus || {}).reduce((n, v) => n + (v > 0 ? 1 : 0), 0) + ((e.cost ?? 2) <= 0 ? 10 : 0); };
    const pool = SKILLS.filter(sk => canUse(s, sk.id) && !skillVeiled(s, sk)).sort((a, b) => rank(a) - rank(b) || worth(b) - worth(a));
    const out: string[] = [];
    // v25.14 패시브 몫을 먼저 확보합니다(총 AP의 약 40%). 액티브만 가득 차던 추천을 막고, 남는 AP는 종류를 가리지 않고 채웁니다.
    const cap = apCapacity(s), passiveBudget = Math.max(2, Math.round(cap * .4));
    for (const sk of pool.filter(x => x.type === 'passive')) if (apUsed(s, [...out, sk.id]) <= passiveBudget && validLoadout(s, [...out, sk.id])) out.push(sk.id);
    for (const sk of pool.filter(x => x.type === 'active')) if (validLoadout(s, [...out, sk.id])) out.push(sk.id);
    for (const sk of pool) if (!out.includes(sk.id) && validLoadout(s, [...out, sk.id])) out.push(sk.id);
    return out;
}

