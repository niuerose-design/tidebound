import type { Snapshot, DuelResult, CombatEvent, State } from '../types';
import { BALANCE } from '../data/balance';
import { normalizeStats, hitChance, power } from './stats';
import { Fighter, fighterSpeed, actTurn, constraintFields } from './combat';
import { FISH, fishById, dungeonById } from '../data/world';
import { abyssReference } from './encounter';
import { scaledEnemyStats, abyssEnemyStats, foeSkills } from '../data/encounters';
import { ALTAR, raidStageStats, type RaidDef } from '../data/altar';
import { dayKey } from '../data/time';
/** 훈련 상대로 쓰는 던전 보스. 던전 마지막 웨이브와 같은 능력치·스킬로 섭니다(레벨 보정 0단계). */
export const BOSS_OPPONENTS = FISH.filter(f => f.boss);
export function bossSnapshot(id: string): Snapshot | null {
    const f = BOSS_OPPONENTS.find(x => x.id === id);
    if (!f) return null;
    const stats = scaledEnemyStats(f, { boss: true });
    return { name: f.name, level: f.level, job: 'boss', rebirths: 0, stats, skills: foeSkills(f.id, f.level, true), power: power(stats), rating: 1000 + f.level * 10 };
}
/** v27.43 무릉도장 depth층 보스(마지막 웨이브)와 같은 능력치·기술. 제단의 첫 신이 씁니다. */
export function abyssBossSnapshot(depth: number): Snapshot {
    const d = dungeonById('abyss')!, f = fishById(d.bossFish)!;
    // v3.186 신은 던전 보스 체력 배율(bossHpScale)을 받지 않습니다(제단 설계 체력 9.3억 유지).
    const stats = abyssEnemyStats(f, abyssReference(), depth, { boss: true, wave: d.fish.length - 1, rawBoss: true });
    return { name: d.boss, level: f.level, job: 'boss', rebirths: 0, stats, skills: foeSkills(f.id, f.level, true), power: power(stats), rating: 1000 + f.level * 10 };
}
/**
 * v27.91 월드보스 결투 상대. hp는 서버가 들고 있는 남은 공유 체력(없으면 그 단계의 최대 체력)이라, 남은 체력이 적으면 한 번의 도전으로 쓰러집니다.
 * v3.191 stage는 소환 단계(RAID_STAGE): 능력치는 raidStageStats, 지속 피해의 체력 비례분은 1단계 체력 기준(dotHpCap).
 */
export function raidBossSnapshot(raid: RaidDef, hp?: number, stage = 1): Snapshot {
    const staged = raidStageStats(raid, stage), stats = { ...staged, hp: Math.max(1, Math.floor(hp ?? staged.hp)), mana: 100, manaRegen: 10 };
    return { name: raid.name, level: raid.level, job: 'boss', rebirths: 0, stats, skills: foeSkills(raid.fish, raid.level, true), power: power(stats), rating: 1000 + raid.level * 10, dotHpCap: raid.stats.hp };
}
/** v27.54 검은 마법사 신격 보정(공격·마법 ×5, 방어 관통 50%). 이미 저장된 옛 검은 마법사에도 도전 때 한 번 적용됩니다(관통으로 적용 여부 판별). */
export function divineFirstGod(god: Snapshot): Snapshot {
    const f = ALTAR.firstGod;
    if (god.name !== f.name || (god.stats.penetration || 0) >= f.penetration) return god;
    const stats = { ...god.stats, attack: Math.round(god.stats.attack * f.attack), ...(god.stats.magic ? { magic: Math.round(god.stats.magic * f.attack) } : {}), penetration: f.penetration };
    return { ...god, stats, power: power(stats) };
}
/** 테스트·점검용 표본 상대. 화면의 훈련 상대는 등록된 모험가와 던전 보스입니다. */
export const TRAINING: Snapshot[] = [
    { name: '항구의 견습생', level: 3, job: 'fisher', rebirths: 0, stats: { hp: 140, attack: 18, defense: 5, crit: .08 }, skills: ['hook'], power: 250, rating: 1000 },
    { name: '산호초의 파수꾼', level: 12, job: 'warden', rebirths: 0, stats: { hp: 380, attack: 50, defense: 28, crit: .1 }, skills: ['anchor', 'breath', 'temperedSkin'], power: 700, rating: 1200 },
    { name: '심해의 방랑자', level: 26, job: 'tide', rebirths: 1, stats: { hp: 780, attack: 125, defense: 50, crit: .2 }, skills: ['spring', 'wave', 'hook', 'focus'], power: 1600, rating: 1600 },
];
/** maxTurns: 결투는 80턴, v27.43 제단의 신은 무릉도장처럼 길게(ALTAR.godMaxTurns). */
export function duel(player: Snapshot, opponent: Snapshot, training: boolean, rng = Math.random, maxTurns: number = BALANCE.duelMaxTurns): DuelResult {
    const fighter = (s: Snapshot): Fighter => ({ ...constraintFields(s.job), /* v3.84 월드보스는 보스라 보스 피해(bossDamage)를 받습니다. */ ...(s.job === 'boss' ? { foe: true, prey: true } : {}), name: s.name, job: s.job, stats: s.stats, hp: s.stats.hp, ...(s.dotHpCap ? { dotHpCap: s.dotHpCap } : {}), skills: s.skills, cooldowns: {}, extraRolls: s.extraRolls, stun: 0, mana: normalizeStats(s.stats).mana, ranks: s.skillRanks || Object.fromEntries(s.skills.map(id => [id, 1])), mastery: s.skillMastery, effects: {} });
    const a = fighter(player), b = fighter(opponent);
    const logs: string[] = [], rounds: DuelResult['rounds'] = [];
    let turns = 0;
    while (a.hp > 0 && b.hp > 0 && turns < maxTurns) {
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
const DUEL_TIERS = [{ id: 'shell', name: '조개', min: 0 }, { id: 'coral', name: '산호', min: 1000 }, { id: 'pearl', name: '진주', min: 1200 }, { id: 'deep', name: '심해', min: 1400 }, { id: 'abyss', name: '심연', min: 1600 }] as const;
export const duelTier = (rating: number) => [...DUEL_TIERS].reverse().find(t => rating >= t.min) || DUEL_TIERS[0];
/** 추천 상대: 내 점수 ±150 안에서 가까운 순으로 최대 n명. */
export const RECOMMEND_RANGE = 150;
export function recommendOpponents<T extends { rating: number; self?: boolean }>(rows: T[], rating: number, n = 5) { return rows.filter(r => !r.self && Math.abs(r.rating - rating) <= RECOMMEND_RANGE).sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating)).slice(0, n); }

/** v26.2 오늘의 랭크 결투 기록(한국 시간 날짜 기준). 날짜가 바뀌면 비어 있는 기록을 돌려줍니다. */
function duelDayOf(s: Pick<State, 'duelDay'>, now: number) {
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

/**
 * v3.84 월드보스 도전 결과를 피해 출처별로 묶습니다(기술별 직접 피해 · 지속 피해 · 반격 · 넘친 회복 피해). 많은 순으로 maxRows줄, 나머지는 '기타'.
 * 보스가 받은 피해만 셉니다: 내 행동의 직접 피해 · 지속 피해 첫 틱 · 넘친 회복 피해, 보스 행동 때의 지속 피해 틱 · 내 반격.
 */
export function raidBreakdown(result: Pick<DuelResult, 'rounds'>, playerName: string, maxRows = 8) {
    const sum = new Map<string, number>(), put = (label: string, n: number | undefined) => { if (n && n > 0) sum.set(label, (sum.get(label) || 0) + n); };
    for (const { event: e } of result.rounds || []) {
        if (e.actor === playerName) { put(e.skillName || '기본 공격', e.total); put('넘친 회복 피해', e.holy); if (e.onset) put('지속 피해 (출혈 · 중독 · 화상)', e.onset.value); }
        else { if (e.dot) put('지속 피해 (출혈 · 중독 · 화상)', e.dot.value); put('반격', e.reflected); }
    }
    const rows = [...sum].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    return rows.length > maxRows ? [...rows.slice(0, maxRows - 1), { label: '기타', value: rows.slice(maxRows - 1).reduce((n, r) => n + r.value, 0) }] : rows;
}
