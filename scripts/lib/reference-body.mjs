// 사냥터 개편(docs/hunting-ground-plan.md 3절) 기준 몸: 구간마다 '그 구간을 제대로 키운 유저'.
//   초보(환생 0~10) · 중수(10~50, 치명 100% · 관통 50→70%) · 고수(50~100, 치명 100% · 관통 75→85%).
// 사용: const { referenceBody, bodyReport } = await referenceBodies(loadGame()); const s = referenceBody(30, 'hero');
import { random } from './sim.mjs';

export async function referenceBodies({ load }) {
    const { newState } = await load('systems/engine');
    const { stats, power } = await load('systems/stats');
    const { SKILLS } = await load('data/skills');
    const { JOBS, jobById } = await load('data/classes');
    const { RARITIES } = await load('data/balance');
    const { affixDef, rollOption } = await load('data/gear');
    const { gearName } = await load('data/maple-gear');
    const { masteryMilestonesFor, jobFactor, jobMasteryTarget, apCapacity, apUsed, canUse } = await load('systems/progression');
    const { recommendLoadout } = await load('systems/loadout');
    const { rebirthLevel } = await load('systems/meta');
    const { ACHIEVEMENTS } = await load('data/achievements');
    const { REGIONS, regionFish } = await load('data/world');
    const { BALANCE } = await load('data/balance');
    const { VOCATION_OFFSETS } = await load('data/long-term');

    const tierOf = r => r < 10 ? 'novice' : r < 50 ? 'mid' : 'expert';
    const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
    /** 세계석 연구 비율(최대 대비): 초보 0→15%, 중수 30→60%, 고수 75→100%. 치명 · 관통 · AP는 중수부터 최대(먼저 찍는 연구). */
    const researchFrac = r => r < 10 ? lerp(0, .15, r / 10) : r < 50 ? lerp(.3, .6, (r - 10) / 40) : lerp(.75, 1, (r - 50) / 50);
    const RESEARCH_MAX = { attack: 150, magicAttack: 150, hp: 150, guard: 75, magicGuard: 75, crit: 20, critDamage: 20, penetration: 15, evasion: 15, lifesteal: 15, manaRegen: 10, recovery: 10, ap: 12, tracking: 1 };
    const PRIORITY = new Set(['crit', 'penetration', 'ap', 'tracking']);
    /** 장비 [등급, 별]: 초보 희귀~영웅 10~15성, 중수 영웅 17성 → 신화 22성, 고수 고대 → 태초 22성. */
    const gearOf = r => r < 5 ? [1, 10] : r < 10 ? [2, 12] : r < 15 ? [2, 15] : r < 20 ? [3, 17] : r < 30 ? [3, 20] : r < 40 ? [4, 20] : r < 50 ? [4, 22] : r < 70 ? [5, 22] : [6, 22];
    /** 옵션 줄(앞에서부터 등급 수만큼): 주 공격 · 관통 · 치명 피해 · 치명 · 체력 · 모든 능력치 · 보스 피해. 중수부터 관통 · 치명을 앞으로. */
    const AFFIX_ORDER = (magic, tier) => tier === 'novice' ? [magic ? 'arcana' : 'might', 'vigor', 'piercing', 'lucky', 'brutal', 'plating', 'ward']
        : [magic ? 'arcana' : 'might', 'piercing', 'lucky', 'brutal', 'vigor', 'transcend', 'hunter'];
    /** 업적 비율 · 지역 연구 단계 · 직업 숙련(숙달 목표 위 전념 단계) · 계정(보스 처치 · 무릉 최고 층). */
    const extras = r => r < 10 ? { ach: lerp(.1, .3, r / 10), region: r < 3 ? 0 : 1, dedication: 0, mastered: r >= 3, boss: 0, abyss: 0 }
        : r < 50 ? { ach: lerp(.4, .6, (r - 10) / 40), region: 2, dedication: 2, mastered: true, boss: Math.round(lerp(200, 600, (r - 10) / 40)), abyss: Math.round(lerp(20, 60, (r - 10) / 40)) }
        : { ach: lerp(.75, .9, (r - 50) / 50), region: 3, dedication: VOCATION_OFFSETS.length, mastered: true, boss: 1000, abyss: 200 };

    /** 레벨에 맞는 직업 단계: Lv.70 이상 5차, 55 이상 4차, 그 아래는 그 계열에서 가장 높은 단계. */
    function jobFor(level, topId) {
        let j = jobById(topId);
        while (j && j.parent && (j.level > level)) j = jobById(j.parent);
        return j;
    }
    function equipment(s, level, magic, tier, [rarity, star]) {
        const order = AFFIX_ORDER(magic, tier), rng = () => .5, pw = Math.round((level + 2) * RARITIES[rarity].factor);
        return Object.fromEntries(['rod', 'coat', 'charm', 'cape'].map(slot => {
            const st = slot === 'rod' ? (magic ? 'magic' : 'physical') : 'balanced';
            const affixes = order.map(affixDef).filter(d => d && (!d.minRarity || rarity >= d.minRarity) && (!d.onlySlot || d.onlySlot === slot)).slice(0, rarity).map(d => rollOption(d, pw, rarity, rng, level));
            return [slot, { id: `${slot}-ref`, slot, style: st, rarity, power: pw, level, enhance: star, name: gearName(slot, rarity, st), affixes }];
        }));
    }
    /** 액티브는 추천 편성 그대로, 패시브는 전투력(power)이 가장 많이 오르는 것부터 AP가 찰 때까지(다른 직업 패시브 포함). */
    function optimizeLoadout(s) {
        const base = recommendLoadout(s).filter(id => SKILLS.find(x => x.id === id)?.type === 'active');
        s.skills = base;
        const cap = apCapacity(s), pool = SKILLS.filter(sk => sk.type === 'passive' && !s.skills.includes(sk.id) && canUse(s, sk.id));
        for (let guard = 0; guard < 30; guard++) {
            const now = power(stats(s)), left = cap - apUsed(s);
            let best = null, bestScore = 0;
            for (const sk of pool) {
                if (s.skills.includes(sk.id)) continue;
                const next = [...s.skills, sk.id], cost = apUsed(s, next) - apUsed(s);
                if (cost > left) continue;
                s.skills = next; const gain = power(stats(s)) - now; s.skills = next.slice(0, -1);
                const score = gain / (Math.max(0, cost) + .5);
                if (gain > 0 && score > bestScore) { best = sk.id; bestScore = score; }
            }
            if (!best) break;
            s.skills = [...s.skills, best];
        }
    }
    /** 치명 100% 목표(중수부터): 주 능력치에서 행운으로 옮겨 치명이 1에 닿는 가장 작은 행운. */
    function fitCrit(s, main, target) {
        if (stats(s).crit >= target) return;
        const total = s.attributes[main] + s.attributes.luk;
        let lo = s.attributes.luk, hi = total;
        while (lo < hi) { const mid = (lo + hi) >> 1; s.attributes.luk = mid; s.attributes[main] = total - mid; if (stats(s).crit >= target) hi = mid; else lo = mid + 1; }
        s.attributes.luk = lo; s.attributes[main] = total - lo;
    }

    function referenceBody(r, topId, { stageFishCleared = [], borrow = true } = {}) {
        const tier = tierOf(r), level = Math.min(100, rebirthLevel({ rebirths: r })), job = jobFor(level, topId);
        const s = newState(0);
        const own = SKILLS.filter(sk => sk.job === jobById(topId).id && sk.type === 'active');
        const magic = own.some(sk => sk.damageType === 'magic') || jobFactor(jobById(topId), 'magic') > jobFactor(jobById(topId), 'attack');
        const main = magic ? 'int' : 'str';
        const total = 5 + (level - 1) * 5, w = magic ? { int: 50, wis: 15, vit: 25, dex: 10 } : { str: 50, dex: 15, vit: 25, wis: 10 };
        const attrs = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; let used = 0;
        for (const [k, p] of Object.entries(w)) { attrs[k] = Math.floor(total * p / 100); used += attrs[k]; }
        attrs[main] += total - used;
        const frac = researchFrac(r), permanent = Object.fromEntries(Object.entries(RESEARCH_MAX).map(([k, v]) => [k, tier !== 'novice' && PRIORITY.has(k) ? v : Math.round(v * frac)]));
        const x = extras(r), ach = ACHIEVEMENTS.filter(a => !a.honor);
        const claims = Object.fromEntries(ach.slice(0, Math.round(ach.length * x.ach)).map(a => [a.id, true]));
        const book = {};
        if (x.region) for (const region of REGIONS) for (const id of regionFish(region)) book[id] = BALANCE.bookMilestones[x.region - 1];
        for (const id of stageFishCleared) delete book[id];
        Object.assign(s, { level, rebirths: r, job: job.id, attributes: attrs, statPoints: 0, inventory: [], equipment: equipment(s, level, magic, tier, gearOf(r)), permanent, book, achievementClaims: claims,
            unlockedJobs: JOBS.map(j => j.id), jobMastery: { [job.id]: x.mastered ? jobMasteryTarget(job) + (x.dedication ? VOCATION_OFFSETS[x.dedication - 1] : 0) : 0 },
            account: { slot: 1, rebirths: r, mastered: tier === 'expert' ? 30 : tier === 'mid' ? 10 : 0, species: 0, bossKills: x.boss, abyssBest: x.abyss, slots: [], syncedAt: 0 } });
        // 모든 스킬 습득 · 숙련 완료(다른 직업 스킬도 계승 상태). 초보는 자기 계열만 쓰도록 편성에서 거릅니다.
        for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = masteryMilestonesFor(sk).at(-1); }
        if (tier === 'novice' || !borrow) s.skills = recommendLoadout(s).filter(id => { const sk = SKILLS.find(k => k.id === id); return !sk.job || sk.job === job.id || sk.type === 'active'; });
        else optimizeLoadout(s);
        if (tier !== 'novice') { fitCrit(s, main, 1); if (borrow) { optimizeLoadout(s); fitCrit(s, main, 1); } }
        const st = stats(s); s.hp = st.hp; s.mana = st.mana;
        return s;
    }
    const bodyReport = s => { const st = stats(s); return { level: s.level, job: s.job, crit: +st.crit.toFixed(3), penetration: +st.penetration.toFixed(3), luk: s.attributes.luk, power: power(st), ap: `${apUsed(s)}/${apCapacity(s)}`, passives: s.skills.filter(id => SKILLS.find(k => k.id === id)?.type === 'passive').length }; };
    return { referenceBody, bodyReport, tierOf, random };
}
