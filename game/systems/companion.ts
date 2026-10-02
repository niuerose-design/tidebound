/**
 * v25.6 분신 낚시꾼(두 번째 낚싯대). 본체와 같은 계정 성장(레벨·능력치 배분·환생·연구·업적)을 쓰되 직업·스킬·낚시터만 따로 고릅니다.
 * 턴마다 전투를 돌리지 않고, 편성이 바뀌거나 오래되면 짧은 고정 난수 모의전으로 ‘턴당 처치율’을 재고 그 비율로 숙련·골드를 쌓습니다.
 * 경험치·드롭·사망은 없고, 직업·장착 스킬 숙련(계정 공유)과 골드 25%만 얻습니다. 본체가 멈춰 있어도 분신은 따로 돕니다.
 */
import type { State } from '../types';
import { BALANCE } from '../data/balance';
import { STAGES, FISH } from '../data/world';
import { researchRank } from '../data/economy';
import { scaledEnemyStats, profile } from '../data/encounters';
import { jobById } from '../data/classes';
import { stats, goldMultiplier } from './stats';
import { canUse, skillMasteryRanks } from './progression';
import { researchMastery } from './mastery';
import { actTurn, fighterSpeed, type Fighter } from './combat';
import { catchReward } from './meta';
import { recordGoal } from './progress';

export type Companion = {
    job: string; stage: string; skills: string[]; running: boolean;
    /** 모의전으로 잰 비율. hash가 바뀌거나 3,000턴이 지나면 다시 잽니다. */
    rate?: { killsPerTurn: number; win: number; turnsPerFight: number; gold: number; hash: string; turn: number };
    /** 소수점 처치·숙련 누적. */
    carry: number; masteryCarry: number;
    kills: number; gold: number; mastery: number;
};
const SIM_FIGHTS = 6, SIM_MAX_TURNS = 200, REMEASURE_TURNS = 3000, GOLD_SHARE = .25;
export const companionUnlocked = (s: Pick<State, 'permanent'>) => researchRank(s, 'companion') > 0;
export const companionMasteryScale = (s: Pick<State, 'permanent'>) => researchRank(s, 'companion') >= 2 ? 1.5 : 1;
export const companionName = (s: Pick<State, 'name'>) => `${s.name}의 분신`;
/** 분신의 판정용 상태: 직업·스킬·낚시터만 바꾼 본체. 장비·능력치·연구는 그대로 공유합니다. */
export function companionState(s: State, c = s.companion): State { return { ...s, job: c?.job || s.job, skills: c?.skills || [], stage: c?.stage || s.stage, dungeon: null, target: null, enemy: null, vows: s.vows ? { ...s.vows, seal: null } : undefined }; }
export function companionStageOpen(s: Pick<State, 'level' | 'rebirths'>, stageId: string) { const st = STAGES.find(x => x.id === stageId); return !!st && s.level >= st.level && s.rebirths >= st.rebirth; }
const lcg = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const hashOf = (s: State, c: Companion) => [c.job, c.stage, c.skills.join('+'), s.level, s.rebirths, s.tide, Object.values(s.permanent).join(','), Object.keys(s.achievementClaims || {}).length, Object.values(s.equipment).map(i => i?.id || '-').join('|')].join('/');

/** 고정 난수 모의전 6판으로 승률·판당 턴·턴당 처치율을 잽니다. 패배는 회복 대기 턴을 더합니다. */
export function measureCompanion(s: State, c = s.companion!) {
    const cs = companionState(s, c), st = stats(cs), stage = STAGES.find(x => x.id === c.stage)!;
    const skills = c.skills.filter(id => canUse(cs, id)), rng = lcg(7 + st.attack + st.hp);
    let wins = 0, turns = 0, gold = 0;
    for (let i = 0; i < SIM_FIGHTS; i++) {
        const fish = FISH.find(f => f.id === stage.fish[i % stage.fish.length])!, foe = scaledEnemyStats(fish, { tier: s.tide || 0 }), p = profile(fish.id);
        const a: Fighter = { name: companionName(s), job: c.job, stats: st, hp: st.hp, mana: st.mana, skills, cooldowns: {}, stun: 0, effects: {}, ranks: s.learned, mastery: skillMasteryRanks(cs), specializations: s.skillSpecializations, practice: s.skillPractice };
        const b: Fighter = { name: fish.name, stats: foe, hp: foe.hp, mana: 100, skills: fish.level >= 5 ? p.skills : [], cooldowns: {}, stun: 0, effects: {}, ...(p.magicBasic ? { magicBasic: true } : {}) };
        let n = 0;
        while (a.hp > 0 && b.hp > 0 && n < SIM_MAX_TURNS) { n++; const first = fighterSpeed(a) >= fighterSpeed(b) ? a : b, second = first === a ? b : a; actTurn(first, second, rng, () => {}); if (first.hp > 0 && second.hp > 0) actTurn(second, first, rng, () => {}); }
        const won = a.hp > 0 && b.hp <= 0;
        wins += won ? 1 : 0; turns += n + (won ? 0 : BALANCE.recoveryTurns); gold += won ? catchReward(fish, s.tide || 0).gold : 0;
    }
    const win = wins / SIM_FIGHTS, turnsPerFight = turns / SIM_FIGHTS;
    return { killsPerTurn: wins / Math.max(1, turns), win, turnsPerFight, gold: wins ? gold / wins : 0, hash: hashOf(s, c), turn: s.turn };
}
/** 턴마다: 처치율만큼 처치를 누적하고, 처치 1마다 직업·장착 스킬 숙련(연구 배율 포함)과 골드 25%를 줍니다. */
export function tickCompanion(s: State, log: (text: string) => void) {
    const c = s.companion;
    if (!c || !c.running || !companionUnlocked(s)) return;
    if (!jobById(c.job) || !s.unlockedJobs.includes(c.job) || !companionStageOpen(s, c.stage)) { c.running = false; log(`${companionName(s)} · 조건이 맞지 않아 멈췄습니다(직업 또는 낚시터).`); return; }
    const cs = companionState(s, c);
    if (!c.rate || c.rate.hash !== hashOf(s, c) || s.turn - c.rate.turn >= REMEASURE_TURNS) c.rate = measureCompanion(s, c);
    c.carry += c.rate.killsPerTurn;
    if (c.carry < 1) return;
    const kills = Math.floor(c.carry); c.carry -= kills;
    const practice = researchMastery(s, kills).total * companionMasteryScale(s) + c.masteryCarry;
    const whole = Math.floor(practice); c.masteryCarry = practice - whole;
    if (whole > 0) {
        s.jobMastery[c.job] = (s.jobMastery[c.job] || 0) + whole;
        for (const id of c.skills) if (canUse(cs, id)) s.skillPractice[id] = (s.skillPractice[id] || 0) + whole;
        c.mastery += whole;
    }
    const gold = Math.floor(c.rate.gold * goldMultiplier(cs) * GOLD_SHARE * kills);
    s.gold += gold; c.gold += gold;
    const before = c.kills; c.kills += kills;
    recordGoal(s, 'catch', undefined, kills, log);
    if (Math.floor(before / 500) !== Math.floor(c.kills / 500)) log(`${companionName(s)} · 누적 ${c.kills.toLocaleString()}마리 포획 · ${jobById(c.job)?.name} 숙련 +${c.mastery.toLocaleString()}`);
}
/** 화면용 요약: 시간당 처치·숙련·골드. */
export function companionSummary(s: State) {
    const c = s.companion; if (!c?.rate) return null;
    const perHour = c.rate.killsPerTurn * 3600_000 / BALANCE.turnMs;
    return { killsPerHour: perHour, masteryPerHour: perHour * researchMastery(s, 1).total * companionMasteryScale(s), goldPerHour: perHour * c.rate.gold * goldMultiplier(companionState(s)) * GOLD_SHARE, win: c.rate.win, turnsPerFight: c.rate.turnsPerFight };
}
