import type { Snapshot, DuelResult, CombatEvent, State } from '../types';
import { dayKey } from '../data/goals';
import { BALANCE } from '../data/balance';
import { normalizeStats, hitChance, power } from './stats';
import { Fighter, fighterSpeed, actTurn, constraintFields } from './combat';
import { FISH } from '../data/world';
import { scaledEnemyStats, profile } from '../data/encounters';
/** 훈련 상대로 쓰는 던전 보스. 던전 마지막 웨이브와 같은 능력치·스킬로 섭니다(레벨 보정 0단계). */
export const BOSS_OPPONENTS = FISH.filter(f => f.boss);
export function bossSnapshot(id: string): Snapshot | null {
    const f = BOSS_OPPONENTS.find(x => x.id === id);
    if (!f) return null;
    const stats = scaledEnemyStats(f, { boss: true });
    return { name: f.name, level: f.level, job: 'boss', rebirths: 0, stats, skills: profile(f.id).skills, power: power(stats), rating: 1000 + f.level * 10 };
}
/** 테스트·점검용 표본 상대. 화면의 훈련 상대는 등록된 낚시꾼과 던전 보스입니다. */
export const TRAINING: Snapshot[] = [
    { name: '항구의 견습생', level: 3, job: 'fisher', rebirths: 0, stats: { hp: 140, attack: 18, defense: 5, crit: .08 }, skills: ['hook'], power: 250, rating: 1000 },
    { name: '산호초의 파수꾼', level: 12, job: 'warden', rebirths: 0, stats: { hp: 380, attack: 50, defense: 28, crit: .1 }, skills: ['anchor', 'breath', 'scales'], power: 700, rating: 1200 },
    { name: '심해의 방랑자', level: 26, job: 'tide', rebirths: 1, stats: { hp: 780, attack: 125, defense: 50, crit: .2 }, skills: ['spring', 'wave', 'hook', 'focus'], power: 1600, rating: 1600 },
];
export function duel(player: Snapshot, opponent: Snapshot, training: boolean, rng = Math.random): DuelResult {
    const fighter = (s: Snapshot): Fighter => ({ ...constraintFields(s.job), name: s.name, job: s.job, stats: s.stats, hp: s.stats.hp, skills: s.skills, cooldowns: {}, stun: 0, mana: normalizeStats(s.stats).mana, ranks: s.skillRanks || Object.fromEntries(s.skills.map(id => [id, 1])), mastery: s.skillMastery, specializations: s.skillSpecializations, practice: s.skillPractice, effects: {} });
    const a = fighter(player), b = fighter(opponent);
    const logs: string[] = [], rounds: DuelResult['rounds'] = [];
    let turns = 0;
    while (a.hp > 0 && b.hp > 0 && turns < BALANCE.duelMaxTurns) {
        turns++;
        const sa = fighterSpeed(a), sb = fighterSpeed(b);
        const first = !!a.firstStrike !== !!b.firstStrike ? (a.firstStrike ? a : b) : sa === sb ? (turns % 2 ? a : b) : sa > sb ? a : b, second = first === a ? b : a;
        const log = (text: string, event: CombatEvent) => { logs.push(`${turns}턴 · ${text}`); rounds.push({ turn: turns, event }); };
        actTurn(first, second, rng, log);
        if (first.hp > 0 && second.hp > 0)
            actTurn(second, first, rng, log);
    }
    const winner = a.hp <= 0 ? 'opponent' : b.hp <= 0 ? 'player' : 'draw';
    const expected = 1 / (1 + Math.pow(10, (opponent.rating - player.rating) / 400));
    const score = winner === 'player' ? 1 : winner === 'draw' ? .5 : 0;
    const pa = normalizeStats(player.stats), pb = normalizeStats(opponent.stats);
    return { winner, turns, logs, rounds, playerHp: a.hp, opponentHp: b.hp, opponent: opponent.name, ratingChange: training ? 0 : Math.round(24 * (score - expected)), training,
        playerHitChance: hitChance(pa, pb), opponentHitChance: hitChance(pb, pa), playerAccuracy: pa.accuracy, opponentAccuracy: pb.accuracy, playerEvasion: pa.evasion, opponentEvasion: pb.evasion };
}

/** v25.12 결투 점수 티어(표시용). */
export const DUEL_TIERS = [{ id: 'shell', name: '조개', min: 0 }, { id: 'coral', name: '산호', min: 1000 }, { id: 'pearl', name: '진주', min: 1200 }, { id: 'deep', name: '심해', min: 1400 }, { id: 'abyss', name: '무릉도장', min: 1600 }] as const;
export const duelTier = (rating: number) => [...DUEL_TIERS].reverse().find(t => rating >= t.min) || DUEL_TIERS[0];
/** 지난 시즌 순위 보상(진주). 1위 60 · 2위 40 · 3위 30 · 10위 안 15 · 50위 안 6 · 참가 2. */
export const duelSeasonPearls = (rank: number) => rank <= 1 ? 60 : rank === 2 ? 40 : rank === 3 ? 30 : rank <= 10 ? 15 : rank <= 50 ? 6 : 2;
/** 추천 상대: 내 점수 ±150 안에서 가까운 순으로 최대 n명. */
export const RECOMMEND_RANGE = 150;
export function recommendOpponents<T extends { rating: number; self?: boolean }>(rows: T[], rating: number, n = 5) { return rows.filter(r => !r.self && Math.abs(r.rating - rating) <= RECOMMEND_RANGE).sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating)).slice(0, n); }

/** v26.2 오늘의 랭크 결투 기록(한국 시간 날짜 기준). 날짜가 바뀌면 비어 있는 기록을 돌려줍니다. */
export function duelDayOf(s: Pick<State, 'duelDay'>, now: number) {
    const key = dayKey(now);
    return s.duelDay?.key === key ? s.duelDay : { key, count: 0, opponents: {} };
}
/** 오늘 남은 랭크 결투 횟수와, 이 상대에게 남은 횟수. */
export function duelAllowance(s: Pick<State, 'duelDay' | 'lastDuel'>, now: number, opponentId?: string) {
    const day = duelDayOf(s, now);
    const left = Math.max(0, BALANCE.duelPerDay - day.count), vs = opponentId ? Math.max(0, BALANCE.duelPerOpponentPerDay - (day.opponents[opponentId] || 0)) : BALANCE.duelPerOpponentPerDay;
    const cooldown = Math.max(0, BALANCE.duelCooldownMs - (now - (s.lastDuel || 0)));
    return { left, vs, cooldown, perDay: BALANCE.duelPerDay, perOpponent: BALANCE.duelPerOpponentPerDay };
}
/** 랭크 결투를 할 수 없는 이유. 가능하면 빈 문자열. */
export function rankedDuelBlock(s: Pick<State, 'duelDay' | 'lastDuel'>, now: number, opponentId: string) {
    const a = duelAllowance(s, now, opponentId);
    if (a.cooldown > 0) return `랭크 결투는 ${Math.round(BALANCE.duelCooldownMs / 1000)}초에 한 번 가능합니다.`;
    if (a.left <= 0) return `오늘 랭크 결투 ${a.perDay}회를 모두 썼습니다. 연습 대결은 횟수 제한이 없습니다.`;
    if (a.vs <= 0) return `같은 상대와는 하루 ${a.perOpponent}회까지 랭크 결투를 할 수 있습니다.`;
    return '';
}
/** 랭크 결투 1회를 오늘 기록에 더합니다. */
export function recordRankedDuel(s: State, now: number, opponentId: string) {
    const day = duelDayOf(s, now);
    s.duelDay = { key: day.key, count: day.count + 1, opponents: { ...day.opponents, [opponentId]: (day.opponents[opponentId] || 0) + 1 } };
}
