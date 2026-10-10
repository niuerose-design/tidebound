// 세계석 연구 예산 모델(docs/research-review.md 2절). 점검 스크립트의 몸이 '최대의 몇 %' 같은 벌 수 없는 연구 대신,
// 그 환생까지 실제로 벌 수 있는 세계석으로 산 단계를 갖게 합니다.
//   예산 = 환생마다 받은 세계석의 누적(그 환생의 요구 레벨에서 환생) + 업적 보상(수령 비율의 1.5제곱 · 후반 업적에 몰려 있음) + 목표 · 무릉도장 몫 환생당 8개
//        + 사냥 수입(v3.152, docs/research-review.md 2.2절): 그 환생까지 쌓인 사냥 시간 × 시간당 세계석(별빛 개체 · 보급품, 환생 0회 30 → 50회부터 100)
//          + 하루 고정 수입(목표 · 길드 · 월드보스 참여 25개) × 걸린 날짜(사냥 시간 ÷ 하루 사냥 시간). 하루 사냥 시간 기본 12시간(운영 결정 2026-10-08:
//          넉넉히 잡아 대응 여유). --hunt-hours N 또는 TIDEBOUND_HUNT_HOURS로 바꾸고, 0이면 사냥 수입 없이 옛 모델.
//          사냥 시간 곡선은 docs/balance-rebirth.md 12.1 · 13.1(0→10회 26시간 · 0→50회 100시간 · 0→100회 320시간 · 100회 생 18.9시간 → 200회 29.8시간).
//   구매 = 실제 유저처럼 나눠 삽니다. 환생 조건이 안 된 연구는 건너뛰고, 상한에 닿아 남은 몫은 주 공격 → 체력으로 이월합니다.
//     초보(환생 10 미만): 주 공격 60% · 체력 40%.
//     중수부터: AP 15% · 관통 15% · 치명 10% · 주 공격 30% · 체력 15% · 치명 피해 5% · 물리 방어 3% · 마법 방어 3% · 회피 · 흡혈 · 마나 회복 · 회복 각 1%.
//   main: 'attack' | 'magicAttack' | 'both'(물리 · 마법 기술을 함께 쓰는 직업은 주 공격 몫을 반씩).
// 사용: const { researchByBudget, researchBudget } = await researchBudgetTools(loadGame()); const permanent = researchByBudget(60, 'attack');
const argNumber = (flag, env, fallback) => { const i = process.argv.indexOf(flag); const v = i >= 0 ? process.argv[i + 1] : process.env[env]; return v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : fallback; };
/** 사냥 수입 가정. hoursPerDay 0이면 사냥 수입을 더하지 않습니다. */
export const HUNT = { hoursPerDay: argNumber('--hunt-hours', 'TIDEBOUND_HUNT_HOURS', 12), pearlsPerHourMax: 100, pearlsPerHourStart: 30, dailyPearls: 25 };
/** 환생 r회에 닿기까지 쌓인 사냥 시간(시간). 구간별 선형: 0→10회 26h · 10→50회 74h · 50→100회 220h · 100회부터 한 생 18.9h에서 200회 29.8h까지 선형. */
export function huntHoursUntil(r) {
    if (r <= 10) return 2.6 * r;
    if (r <= 50) return 26 + (r - 10) * 1.85;
    if (r <= 100) return 100 + (r - 50) * 4.4;
    let h = 320; for (let k = 100; k < r; k++) h += 18.9 + (k - 100) * .109; return h;
}
export async function researchBudgetTools({ load, huntHours = HUNT.hoursPerDay }) {
    const { RESEARCH, researchCost, researchUnlocked } = await load('data/economy');
    const { rebirthLevel, rebirthReward } = await load('systems/meta');
    const { ACHIEVEMENTS } = await load('data/achievements');
    const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
    /** 기준 몸(reference-body.mjs extras)과 같은 업적 수령 비율: 초보 10→30%, 중수 40→60%, 고수 75→90%. */
    const achievementShare = r => r < 10 ? lerp(.1, .3, r / 10) : r < 50 ? lerp(.4, .6, (r - 10) / 40) : lerp(.75, .9, (r - 50) / 50);
    const rebirthPearls = r => { let sum = 0; for (let i = 0; i < r; i++) sum += rebirthReward({ level: Math.min(100, rebirthLevel({ rebirths: i })), rebirths: i }); return sum; };
    const ACHIEVEMENT_PEARLS = ACHIEVEMENTS.filter(a => !a.honor).reduce((n, a) => n + (a.reward.pearls || 0), 0);
    const achievementPearls = frac => Math.round(ACHIEVEMENT_PEARLS * Math.pow(Math.max(0, Math.min(1, frac)), 1.5));
    const GOAL_PEARLS_PER_REBIRTH = 8;
    /** 사냥으로 번 세계석(환생 r회까지). 시간당 세계석은 환생 0회 30에서 50회 100까지 선형(저환생은 원킬이 아니라 처치 수가 적음), 하루 고정 수입은 걸린 날짜만큼. */
    const huntPearls = r => {
        if (!(huntHours > 0)) return 0;
        let pearls = 0, prev = 0;
        for (let k = 1; k <= r; k++) { const h = huntHoursUntil(k), rate = lerp(HUNT.pearlsPerHourStart, HUNT.pearlsPerHourMax, k / 50); pearls += (h - prev) * rate; prev = h; }
        return Math.round(pearls + prev / huntHours * HUNT.dailyPearls);
    };
    const researchBudget = (r, achFrac = achievementShare(r)) => rebirthPearls(r) + achievementPearls(achFrac) + GOAL_PEARLS_PER_REBIRTH * r + huntPearls(r);
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
    return { researchBudget, researchByBudget, achievementShare, rebirthPearls, achievementPearls, huntPearls, huntHours, GOAL_PEARLS_PER_REBIRTH };
}
