// 세계석 연구 예산 모델(docs/research-review.md 2절). 점검 스크립트의 몸이 '최대의 몇 %' 같은 벌 수 없는 연구 대신,
// 그 환생까지 실제로 벌 수 있는 세계석으로 산 단계를 갖게 합니다.
//   예산 = 환생마다 받은 세계석의 누적(그 환생의 요구 레벨에서 환생) + 업적 보상(수령 비율의 1.5제곱 · 후반 업적에 몰려 있음) + 목표 · 무릉도장 몫 환생당 8개.
//   구매 = 실제 유저처럼 나눠 삽니다. 환생 조건이 안 된 연구는 건너뛰고, 상한에 닿아 남은 몫은 주 공격 → 체력으로 이월합니다.
//     초보(환생 10 미만): 주 공격 60% · 체력 40%.
//     중수부터: AP 15% · 관통 15% · 치명 10% · 주 공격 30% · 체력 15% · 치명 피해 5% · 물리 방어 3% · 마법 방어 3% · 회피 · 흡혈 · 마나 회복 · 회복 각 1%.
//   main: 'attack' | 'magicAttack' | 'both'(물리 · 마법 기술을 함께 쓰는 직업은 주 공격 몫을 반씩).
// 사용: const { researchByBudget, researchBudget } = await researchBudgetTools(loadGame()); const permanent = researchByBudget(60, 'attack');
export async function researchBudgetTools({ load }) {
    const { RESEARCH, researchCost, researchUnlocked } = await load('data/economy');
    const { rebirthLevel, rebirthReward } = await load('systems/meta');
    const { ACHIEVEMENTS } = await load('data/achievements');
    const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
    /** 기준 몸(reference-body.mjs extras)과 같은 업적 수령 비율: 초보 10→30%, 중수 40→60%, 고수 75→90%. */
    const achievementShare = r => r < 10 ? lerp(.1, .3, r / 10) : r < 50 ? lerp(.4, .6, (r - 10) / 40) : lerp(.75, .9, (r - 50) / 50);
    const rebirthPearls = r => { let sum = 0; for (let i = 0; i < r; i++) sum += rebirthReward({ level: Math.min(100, rebirthLevel({ rebirths: i })), rebirths: i }, 0); return sum; };
    const ACHIEVEMENT_PEARLS = ACHIEVEMENTS.filter(a => !a.honor).reduce((n, a) => n + (a.reward.pearls || 0), 0);
    const achievementPearls = frac => Math.round(ACHIEVEMENT_PEARLS * Math.pow(Math.max(0, Math.min(1, frac)), 1.5));
    const GOAL_PEARLS_PER_REBIRTH = 8;
    const researchBudget = (r, achFrac = achievementShare(r)) => rebirthPearls(r) + achievementPearls(achFrac) + GOAL_PEARLS_PER_REBIRTH * r;
    const SHARES = { novice: [['main', .6], ['hp', .4]], other: [['ap', .15], ['penetration', .15], ['crit', .1], ['main', .3], ['hp', .15], ['critDamage', .05], ['guard', .03], ['magicGuard', .03], ['evasion', .01], ['lifesteal', .01], ['manaRegen', .01], ['recovery', .01]] };
    /** scale은 예산 배율(점검 스크립트의 --research). 1이 기준, 0이면 연구 없음. */
    function researchByBudget(r, main = 'attack', achFrac = achievementShare(r), scale = 1) {
        const permanent = {}, mains = main === 'both' ? ['attack', 'magicAttack'] : [main];
        let budget = Math.round(researchBudget(r, achFrac) * scale);
        const buy = (id, limit) => {
            const def = RESEARCH.find(x => x.id === id);
            if (!def || !researchUnlocked(r, def)) return;
            let rank = permanent[id] || 0;
            for (let c = researchCost(id, rank); rank < def.max && c <= Math.min(limit, budget); c = researchCost(id, rank)) { limit -= c; budget -= c; rank++; }
            permanent[id] = rank;
        };
        const pool = budget;
        for (const [key, share] of SHARES[r < 10 ? 'novice' : 'other']) {
            if (key === 'main') for (const id of mains) buy(id, Math.round(pool * share / mains.length));
            else buy(key, Math.round(pool * share));
        }
        for (const id of mains) buy(id, budget);
        buy('hp', budget);
        return permanent;
    }
    return { researchBudget, researchByBudget, achievementShare, rebirthPearls, achievementPearls, GOAL_PEARLS_PER_REBIRTH };
}
