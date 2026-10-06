import type { Skill, State } from '../types';
import { SKILLS } from '../data/skills';
import { stats } from './stats';
import { lineage, apCapacity, canUse, effectiveSkill, skillMastery, skillMasteryRewards, skillVeiled, refinePractice } from './progression';

/**
 * 추천 편성: 현재 직업 전용 → 선행 계보 → 공용 → 계승한 다른 직업 순으로, 액티브는 발동률 × 위력, 패시브는 양수 수치 합이 큰 순서대로 AP 안에서 채웁니다. 패시브 몫(총 AP의 약 40%)을 먼저 채웁니다.
 * 화면용 추천일 뿐이라 서버 규칙(setSkills의 사용 가능·AP 검사)을 그대로 통과해야 적용됩니다.
 */
export function recommendLoadout(s: State) {
    const line = lineage(s.job), magic = stats(s).magic > stats(s).attack;
    const rank = (sk: Skill) => sk.job === s.job ? 0 : sk.job && line.includes(sk.job) ? 1 : !sk.job ? 2 : 3;
    const fx = (sk: Skill) => effectiveSkill(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id), refinePractice(s, sk.id));
    const worth = (sk: Skill) => { const e = fx(sk); if (sk.type === 'active') return (e.chance || 0) * Math.max(1, e.multiplier || 1) * (sk.damageType === 'magic' ? (magic ? 1 : .4) : sk.damageType === 'physical' ? (magic ? .4 : 1) : 1) * (sk.statusOnly ? .5 : 1); return Object.values(e.bonus || {}).reduce((n, v) => n + (v > 0 ? 1 : 0), 0) + ((e.cost ?? 2) <= 0 ? 10 : 0); };
    // v27.62 정렬 비교마다 worth(효과 계산)를 다시 부르지 않도록 한 번씩만 계산해 둡니다(결과는 같음, 스킬 화면 렉 원인).
    const usable = SKILLS.filter(sk => canUse(s, sk.id) && !skillVeiled(s, sk)), score = new Map(usable.map(sk => [sk.id, worth(sk)]));
    const pool = usable.sort((a, b) => rank(a) - rank(b) || score.get(b.id)! - score.get(a.id)!);
    const out: string[] = [];
    // v27.62 AP 사용량·한도는 스킬별 값의 합이라(apUsed·apCapacity), 후보마다 validLoadout으로 처음부터 다시 세지 않고 누적합으로 판정합니다.
    // pool은 모두 사용 가능하고 중복이 없어 validLoadout(s, [...out, id])와 같은 결과입니다.
    const costs = new Map(pool.map(sk => [sk.id, effectiveSkill(sk, s.learned?.[sk.id] || 1, skillMastery(s, sk.id)).cost!]));
    const rewards = new Map(pool.map(sk => [sk.id, skillMasteryRewards(sk, s.learned?.[sk.id] || 1, skillMastery(s, sk.id)).ap]));
    const cost = (sk: Skill) => costs.get(sk.id)!, reward = (sk: Skill) => rewards.get(sk.id)!;
    const capBase = apCapacity(s, []);
    let used = 0, bonus = 0;
    const fits = (sk: Skill) => used + cost(sk) <= capBase + bonus + reward(sk);
    const take = (sk: Skill) => { used += cost(sk); bonus += reward(sk); out.push(sk.id); };
    // v25.14 패시브 몫을 먼저 확보합니다(총 AP의 약 40%). 액티브만 가득 차던 추천을 막고, 남는 AP는 종류를 가리지 않고 채웁니다.
    const cap = apCapacity(s), passiveBudget = Math.max(2, Math.round(cap * .4));
    for (const sk of pool.filter(x => x.type === 'passive')) if (used + cost(sk) <= passiveBudget && fits(sk)) take(sk);
    for (const sk of pool.filter(x => x.type === 'active')) if (fits(sk)) take(sk);
    for (const sk of pool) if (!out.includes(sk.id) && fits(sk)) take(sk);
    return out;
}

