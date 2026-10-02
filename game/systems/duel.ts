import type { Snapshot, DuelResult, CombatEvent } from '../types';
import { BALANCE } from '../data/balance';
import { normalizeStats, hitChance, power } from './stats';
import { Fighter, fighterSpeed, actTurn } from './combat';
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
    const fighter = (s: Snapshot): Fighter => ({ name: s.name, job: s.job, stats: s.stats, hp: s.stats.hp, skills: s.skills, cooldowns: {}, stun: 0, mana: normalizeStats(s.stats).mana, ranks: s.skillRanks || Object.fromEntries(s.skills.map(id => [id, 1])), mastery: s.skillMastery, specializations: s.skillSpecializations, practice: s.skillPractice, effects: {} });
    const a = fighter(player), b = fighter(opponent);
    const logs: string[] = [], rounds: DuelResult['rounds'] = [];
    let turns = 0;
    while (a.hp > 0 && b.hp > 0 && turns < BALANCE.duelMaxTurns) {
        turns++;
        const sa = fighterSpeed(a), sb = fighterSpeed(b);
        const first = sa === sb ? (turns % 2 ? a : b) : sa > sb ? a : b, second = first === a ? b : a;
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
