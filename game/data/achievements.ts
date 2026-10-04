import type { State } from '../types';
import { STAGES, DUNGEONS, FISH } from './world';
import { JOBS } from './classes';
import { jobMastered, masteredJobCount, ACHIEVEMENT_AP, attributes } from '../systems/progression';
import { stats } from '../systems/stats';

/**
 * v25.6 업적: 조건을 처음 만족하면 한 번만 해금되고 보상을 바로 받습니다. 환생 후에도 유지됩니다.
 * 보상 종류: 세계석(pearls), SP(sp), 영구 장착 AP(ap), 영구 능력치 배율(bonus: attack·magic·hp·defense·resist에 +비율).
 * 조건 판정은 저장 상태만 보며 난수를 쓰지 않습니다. 기존 세이브는 이미 달성한 업적을 조용히 채우되 보상은 지급합니다.
 */
export type AchievementReward = { pearls?: number; sp?: number; ap?: number; bonus?: Partial<Record<'attack' | 'magic' | 'hp' | 'defense' | 'resist', number>> };
export type Achievement = { id: string; group: '항해' | '사냥' | '숙련' | '무릉도장' | '환생' | '도전'; title: string; desc: string; reward: AchievementReward; /** 진행도(0~target). */ progress: (s: State) => number; target: number };

const kills = (s: State) => s.kills || 0;
const codex = (s: State) => FISH.filter(f => (s.book?.[f.id] || 0) > 0).length;
const clears = (s: State) => Object.values(s.clears || {}).reduce((a, b) => a + (b || 0), 0);
const bosses = (s: State) => FISH.filter(f => f.boss).reduce((a, f) => a + (s.book?.[f.id] || 0), 0);
const masteredSkills = (s: State) => Object.values(s.skillPractice || {}).filter(n => n >= 8000).length;
const tideBest = (s: State) => Math.max(0, ...Object.values(s.tideBest || {}));
const playHours = (s: State) => Math.floor((s.playMs || 0) / 3_600_000);
const tiers = (s: State) => Math.max(0, ...(s.unlockedJobs || []).map(id => JOBS.find(j => j.id === id)?.tier || 0));

const series = (prefix: string, group: Achievement['group'], title: (n: number) => string, desc: (n: number) => string, steps: number[], progress: (s: State) => number, reward: (i: number) => AchievementReward): Achievement[] =>
    steps.map((n, i) => ({ id: `${prefix}:${n}`, group, title: title(n), desc: desc(n), reward: reward(i), progress, target: n }));

export const ACHIEVEMENTS: Achievement[] = [
    ...series('kills', '사냥', n => `처치 ${n.toLocaleString()}마리`, n => `누적 ${n.toLocaleString()}마리를 처치합니다.`, [100, 1000, 5000, 20000, 100000], kills, i => [{ pearls: 1 }, { pearls: 2 }, { pearls: 4, bonus: { attack: .02, magic: .02 } }, { pearls: 8, bonus: { hp: .03 } }, { pearls: 15, ap: 1 }][i]),
    ...series('codex', '항해', n => `도감 ${n}종`, n => `서로 다른 몬스터 ${n}종을 발견합니다.`, [10, 20, 30, FISH.length], codex, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 5, bonus: { defense: .03, resist: .03 } }, { pearls: 10, ap: 1 }][i]),
    ...series('stages', '항해', n => `해역 ${n}곳`, n => `사냥터 ${n}곳에서 사냥합니다.`, [3, 6, 9, STAGES.length], s => STAGES.filter(st => s.voyage?.[`stage:${st.id}`] !== undefined).length, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 6, bonus: { hp: .03 } }, { pearls: 10, ap: 1 }][i]),
    ...series('clears', '사냥', n => `던전 정복 ${n}회`, n => `던전을 ${n}회 정복합니다(무릉도장 포함).`, [1, 10, 50, 200, 1000], clears, i => [{ pearls: 1 }, { pearls: 2 }, { pearls: 5, bonus: { attack: .02, magic: .02 } }, { pearls: 8 }, { pearls: 15, ap: 1 }][i]),
    ...series('bosses', '사냥', n => `보스 ${n}마리`, n => `보스를 ${n}마리 처치합니다.`, [10, 100, 500], bosses, i => [{ pearls: 2 }, { pearls: 5, bonus: { defense: .03, resist: .03 } }, { pearls: 10, sp: 1 }][i]),
    ...series('duels', '사냥', n => `결투 승리 ${n}회`, n => `랭크 결투에서 ${n}번 이깁니다.`, [10, 100, 500], s => s.wins || 0, i => [{ pearls: 2 }, { pearls: 5, bonus: { attack: .02, magic: .02 } }, { pearls: 10, ap: 1 }][i]),
    ...series('dungeons', '항해', n => `던전 ${n}곳 정복`, n => `서로 다른 던전 ${n}곳을 정복합니다.`, [3, 5, 7, DUNGEONS.length], s => DUNGEONS.filter(d => (s.clears?.[d.id] || 0) > 0).length, i => [{ pearls: 2 }, { pearls: 4 }, { pearls: 8, sp: 1 }, { pearls: 15, ap: 1 }][i]),
    ...series('mastered', '숙련', n => `직업 숙달 ${n}개`, n => `직업 ${n}개를 끝까지 숙달합니다.`, [1, 3, 8, 15, 30], masteredJobCount, i => [{ pearls: 2 }, { pearls: 4, bonus: { attack: .02, magic: .02 } }, { pearls: 8, ap: 1 }, { pearls: 12, bonus: { hp: .04 } }, { pearls: 20, ap: 1, sp: 1 }][i]),
    ...series('skillsMax', '숙련', n => `스킬 최대 숙련 ${n}개`, n => `스킬 ${n}개의 실전 숙련을 8,000 이상 쌓습니다.`, [1, 5, 15, 40], masteredSkills, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, ap: 1 }, { pearls: 20, bonus: { attack: .03, magic: .03 } }][i]),
    ...series('tier', '숙련', n => `${n}차 전직`, n => `${n}차 직업에 처음 전직합니다.`, [2, 3, 4, 5], tiers, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 6, bonus: { hp: .03 } }, { pearls: 10, ap: 1 }][i]),
    ...series('tide', '항해', n => `해역 난이도 ${n}`, n => `사냥터에서 해역 난이도 ${n} 이상으로 처치합니다.`, [5, 10, 20, 30, 50], tideBest, i => [{ pearls: 2 }, { pearls: 4, bonus: { attack: .02, magic: .02 } }, { pearls: 8, ap: 1 }, { pearls: 15, bonus: { hp: .04 } }, { pearls: 30, ap: 1, sp: 1 }][i]),
    ...series('abyss', '무릉도장', n => `무릉도장 ${n}층`, n => `무릉도장 ${n}층을 정복합니다.`, [5, 10, 25, 50, 100], s => s.abyssBest || 0, i => [{ pearls: 2 }, { pearls: 4, bonus: { defense: .02, resist: .02 } }, { pearls: 8, ap: 1 }, { pearls: 15, bonus: { attack: .03, magic: .03, hp: .03 } }, { pearls: 30, ap: 1, sp: 2 }][i]),
    ...series('rebirths', '환생', n => `환생 ${n}회`, n => `${n}번째 환생을 마칩니다.`, [1, 3, 5, 10, 20, 50], s => s.rebirths || 0, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 5, bonus: { hp: .03 } }, { pearls: 10, ap: 1 }, { pearls: 20, bonus: { attack: .03, magic: .03 } }, { pearls: 40, ap: 1, sp: 2 }][i]),
    // v25.21 ‘도전’ 탭: 플레이 시간과 장기 누적 기록. 다른 묶음과 달리 별도 탭에서 봅니다.
    ...series('playtime', '도전', n => `항해 ${n.toLocaleString()}시간`, n => `자동 사냥·던전으로 누적 ${n.toLocaleString()}시간을 보냅니다(부재중 정산 포함).`, [1, 10, 50, 100, 500, 1000], playHours, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 6, bonus: { hp: .02 } }, { pearls: 10, ap: 1 }, { pearls: 20, bonus: { attack: .02, magic: .02 } }, { pearls: 40, sp: 1, ap: 1 }][i]),
    ...series('turns', '도전', n => `${n.toLocaleString()}턴`, n => `전투 턴을 누적 ${n.toLocaleString()}번 진행합니다.`, [10000, 100000, 1000000], s => s.turn || 0, i => [{ pearls: 2 }, { pearls: 6 }, { pearls: 15, ap: 1 }][i]),
    ...series('attr', '도전', n => `능력치 ${n} 돌파`, n => `기본 능력치 하나를 ${n} 이상으로 올립니다(직접 투자 + 성장).`, [100, 300, 500], s => Math.max(0, ...Object.values(attributes(s))), i => [{ pearls: 3 }, { pearls: 8, ap: 1 }, { pearls: 20, sp: 1, ap: 1 }][i]),
    ...series('hpmax', '도전', n => `최대 체력 ${n.toLocaleString()}`, n => `최종 최대 체력이 ${n.toLocaleString()}을 넘습니다.`, [10000, 50000, 200000], s => stats(s).hp, i => [{ pearls: 3 }, { pearls: 10, bonus: { hp: .02 } }, { pearls: 25, ap: 1 }][i]),
    ...series('manamax', '도전', n => `최대 마나 ${n.toLocaleString()}`, n => `최종 최대 마나가 ${n.toLocaleString()}을 넘습니다.`, [5000, 50000], s => stats(s).mana, i => [{ pearls: 3 }, { pearls: 12, ap: 1 }][i]),
    ...series('deaths', '도전', n => `쓰러짐 ${n}회`, n => `${n}번 쓰러지고도 다시 출항합니다.`, [10, 100, 1000], s => s.deaths || 0, i => [{ pearls: 1 }, { pearls: 3, bonus: { hp: .02 } }, { pearls: 8 }][i]),
    { id: 'deep:100', group: '환생', title: '깊은 항해', desc: 'Lv.100에 도달한 채 환생합니다.', reward: { pearls: 10, bonus: { hp: .03, defense: .02, resist: .02 } }, progress: s => s.lifeBonus === 'deep' ? 1 : 0, target: 1 },
    { id: 'warden:all', group: '숙련', title: '모든 바다의 수호자', desc: '방어 계열 직업 3개를 숙달합니다.', reward: { pearls: 6, bonus: { defense: .04, resist: .04 } }, progress: s => JOBS.filter(j => j.tree === 'defense' && jobMastered(s, j)).length, target: 3 },
];
for (const a of ACHIEVEMENTS) if (a.reward.ap) ACHIEVEMENT_AP[a.id] = a.reward.ap;
export const achievementById = (id: string) => ACHIEVEMENTS.find(a => a.id === id);
/** 업적 묶음. ‘도전’은 플레이 시간·전투 턴·능력치 돌파 같은 누적 기록입니다. */
export const CHALLENGE_GROUP = '도전' as const;
export const ACHIEVEMENT_GROUPS = ['항해', '사냥', '숙련', '무릉도장', '환생', CHALLENGE_GROUP] as const;

/** 받은 업적의 영구 보상 합계. 능력치 배율은 더해서 한 번 곱합니다(apCapacity·stats가 씀). */
export function achievementTotals(s: Pick<State, 'achievementClaims'>) {
    const total = { ap: 0, bonus: { attack: 0, magic: 0, hp: 0, defense: 0, resist: 0 } as Record<'attack' | 'magic' | 'hp' | 'defense' | 'resist', number> };
    for (const id of Object.keys(s.achievementClaims || {})) {
        const a = achievementById(id); if (!a) continue;
        total.ap += a.reward.ap || 0;
        for (const [k, n] of Object.entries(a.reward.bonus || {})) total.bonus[k as keyof typeof total.bonus] += n || 0;
    }
    return total;
}
export function rewardText(r: AchievementReward) {
    const parts: string[] = [];
    if (r.pearls) parts.push(`세계석 +${r.pearls}`);
    if (r.sp) parts.push(`SP +${r.sp}`);
    if (r.ap) parts.push(`장착 AP +${r.ap}`);
    const label: Record<string, string> = { attack: '물리 공격', magic: '마법 공격', hp: '최대 체력', defense: '물리 방어', resist: '마법 방어' };
    for (const [k, n] of Object.entries(r.bonus || {})) parts.push(`${label[k]} +${Math.round((n || 0) * 100)}%`);
    return parts.join(' · ');
}
