import type { Skill } from '../types';
import { LINEAGES, lineageOf, worldOf, type Job, type Lineage } from './classes';

/**
 * v3.228 핵심 패시브 개편(메이플 월드 4 · 5차): 직업 보정(물리 · 마법 공격 · 최대 체력)을 한 자리 %로 줄이고, 줄어든 몫을 직업 패시브 하나(핵심 패시브, sk.core)로 옮깁니다.
 * 직업 자료에는 옛 배율을 그대로 두고, 불러올 때 한 번 바꿉니다(공개 직업은 data/skills.ts, 비밀 직업은 서버의 secret/register.ts).
 *   주 공격: 4차 ×1.06 · 5차 ×1.09, 다른 쪽 공격은 같은 비율로 줄여 물리 · 마법 성향을 지킵니다. 최대 체력 ×1. 숙달 보너스 10%.
 *   4차 핵심: 고정 수치 = (옛 숙달 배율 − 새 숙달 배율) × CORE_REWORK.flat(Lv.60~70 장비 없는 몸에서 같은 크기) + 주 공격 +15% · 체력 +5%(장비가 쌓여도 덜 모자라게).
 *   5차 핵심: 배율 = 옛 숙달 배율 ÷ 새 숙달 배율 − 1, 공격 +35% · 체력 +22% 상한. 그래서 단일 직업으로는 대체로 약해지고, 빌려 가는 쪽은 강해집니다.
 * 핵심 패시브는 그 직업의 패시브 중 주 공격을 올리는 것(없으면 AP가 큰 것)이고, 패시브가 없는 직업 · 1 이하 배율 · 제약 직업은 바꾸지 않습니다. 아제로스 계보는 제외합니다.
 */
export const CORE_REWORK = {
    main: { 4: .06, 5: .09 } as Record<number, number>,
    masteryBoost: .1,
    flat: { attack: 421, magic: 421, hp: 1422 },
    cap: { attack: .35, magic: .35, hp: .22 },
    /** 4차 핵심의 작은 배율(주 공격). */
    scale4: .15,
    scale4Hp: .05,
} as const;
const done = new WeakSet<Job>();
const mastered = (factor: number, boost: number) => factor > 1 ? 1 + (factor - 1) * (1 + boost) : factor;
const round = (n: number, step: number) => Math.round(n / step) * step;
type Key = 'attack' | 'magic' | 'hp';

/** 그 직업의 핵심 패시브로 쓸 스킬: 주 공격을 올리는 패시브 → AP가 큰 패시브 → 먼저 나온 패시브. 계보 전용(exclusiveLineage)은 빼고 고릅니다. */
export function pickCorePassive(job: Job, skills: Skill[]) {
    const own = skills.filter(sk => sk.job === job.id && sk.type === 'passive' && !sk.exclusiveLineage);
    const main: Key = job.magic > job.attack ? 'magic' : 'attack';
    return [...own].sort((a, b) => Number(!!(b.bonus?.[main] && b.bonus[main]! > 0)) - Number(!!(a.bonus?.[main] && a.bonus[main]! > 0)) || (b.cost || 0) - (a.cost || 0))[0];
}
export function applyCoreRework(jobs: Job[], skills: Skill[], lineages: Lineage[] = LINEAGES) {
    for (const job of jobs) {
        if (done.has(job) || (job.tier !== 4 && job.tier !== 5) || job.retired || job.constraint) continue;
        if (worldOf(lineages.find(l => l.id === lineageOf(job)) ?? LINEAGES.find(l => l.id === lineageOf(job))) === 'azeroth') continue;
        const top = Math.max(job.attack, job.magic), cut = CORE_REWORK.main[job.tier];
        if (top <= 1 + cut && job.hp <= 1) continue;
        const sk = pickCorePassive(job, skills);
        if (!sk) continue;
        done.add(job);
        const boost = job.masteryBoost ?? .15, old = { attack: job.attack, magic: job.magic, hp: job.hp };
        const next = { ...old };
        if (top > 1 + cut) for (const k of ['attack', 'magic'] as const) if (old[k] > 1) next[k] = Number((1 + cut * (old[k] - 1) / (top - 1)).toFixed(3));
        if (old.hp > 1) next.hp = 1;
        const core: NonNullable<Skill['core']> = {};
        for (const k of ['attack', 'magic', 'hp'] as const) {
            const before = mastered(old[k], boost), after = mastered(next[k], CORE_REWORK.masteryBoost);
            if (before <= after) continue;
            if (job.tier === 4) {
                const n = round((before - after) * CORE_REWORK.flat[k], 5);
                if (n > 0) (core.flat ??= {})[k] = n;
                // v3.228 고정 수치는 장비 · 연구가 쌓일수록 비중이 줄어, 작은 배율(주 공격 +15%, 다른 쪽 공격은 같은 비율 · 체력 +5%)을 함께 둡니다.
                if (k !== 'hp' && top > 1 + cut && old[k] > 1) (core.scale ??= {})[k] = Number((CORE_REWORK.scale4 * (old[k] - 1) / (top - 1)).toFixed(3));
                if (k === 'hp') (core.scale ??= {}).hp = CORE_REWORK.scale4Hp;
            }
            else { const n = Number(Math.min(before / after - 1, CORE_REWORK.cap[k]).toFixed(2)); if (n > 0) (core.scale ??= {})[k] = n; }
        }
        Object.assign(job, next, { masteryBoost: CORE_REWORK.masteryBoost });
        if (core.flat || core.scale) sk.core = core;
    }
}
