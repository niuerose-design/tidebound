/** v27.86 랜덤게임 진행: 무작위 몬스터 생성, 웨이브 판돈, 받고 나가기, 쓰러짐. */
import { ascensionVow } from '../data/ascension';
import type { State } from '../types';
import { RANDOM_GAME, randomGameBoss, waveStake } from '../data/random-game';
import { BASE_STAGES, tideLiftMonster, monsterById } from '../data/world';
import { scaledEnemyStats, foeSkills } from '../data/encounters';
import { researchRank } from '../data/economy';
import { encounterTier } from './meta';
import { addLog, endRun } from './state';
import { dayKey } from '../data/time';

/** 랜덤게임 연구 단계(0이면 잠김). 생마다(v3.24 그리고 하루마다, 한국 시간 자정) 이 횟수만큼 입장합니다. */
export const randomGameRank = (s: Pick<State, 'permanent'>) => researchRank(s, RANDOM_GAME.research);
/** 판돈 배율: ×1 → ×1.5 → ×2. */
/** 판돈 배율: 연구 1단계 ×1, 2단계 ×1.5, 3단계 ×2. v3.31 보너스 부분(1을 넘는 몫)에 승천 배율을 곱합니다(승천 5회 3단계 ×3). */
export const randomGamePayout = (s: Pick<State, 'permanent'> & Partial<Pick<State, 'ascension'>>) => 1 + .5 * Math.max(0, randomGameRank(s) - 1) * ascensionVow(s);
/** v3.24 오늘(한국 시간) 이번 생에 쓴 입장 횟수. 날이 바뀌었으면 0입니다. now를 빼면 저장된 값 그대로. */
export const randomGameUsed = (s: Pick<State, 'randomGameRuns' | 'randomGameDay'>, now?: number) => now !== undefined && s.randomGameDay !== dayKey(now) ? 0 : (s.randomGameRuns || 0);
export const randomGameRunsLeft = (s: Pick<State, 'permanent' | 'randomGameRuns' | 'randomGameDay'>, now?: number) => Math.max(0, randomGameRank(s) - randomGameUsed(s, now));
export const inRandomGame = (s: Pick<State, 'dungeon'>) => s.dungeon?.id === RANDOM_GAME.id;
/** 받을 판돈 정수(배율 적용, 내림). */
export const stakePayout = (s: Pick<State, 'permanent' | 'dungeon'>) => Math.floor((s.dungeon?.stake?.essence || 0) * randomGamePayout(s));

/** 해금한 일반 사냥터의 몬스터 중 하나를 무작위로 골라 지금 웨이브 난이도로 세웁니다. 처치 경험치·골드는 0입니다. */
export function spawnRandomGame(s: State, rng: () => number) {
    const tier = encounterTier(s), boss = randomGameBoss(s.dungeon!.wave);
    const pool = [...new Set(BASE_STAGES.filter(st => st.rebirth <= s.rebirths).flatMap(st => st.monsters))].map(id => monsterById(id)!).filter(f => f && (f.minTier || 0) <= tier);
    const f = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    const field = tideLiftMonster(f, tier, s.level), foe = scaledEnemyStats(field, { boss, tier });
    s.enemy = { id: f.id, name: boss ? `${f.name} · 웨이브 보스` : f.name, hp: foe.hp, maxHp: foe.hp, attack: foe.attack, defense: foe.defense, exp: 0, gold: 0, boss, stun: 0, combatStats: foe, skills: foeSkills(f.id, field.level, boss), cooldowns: {}, effects: {}, mana: 100 };
}

/** 웨이브를 깼을 때: 판돈을 쌓고 다음 웨이브로. 목표 웨이브에 닿으면 받고 나갑니다. */
export function clearRandomWave(s: State) {
    const d = s.dungeon!, w = d.wave + 1, add = waveStake(w);
    d.wave = w;
    s.randomGameStats ??= { best: 0, runs: 0, cashed: 0 }; s.randomGameStats.best = Math.max(s.randomGameStats.best, w);
    d.stake = { essence: (d.stake?.essence || 0) + add };
    addLog(s, `랜덤게임 ${w}웨이브 돌파 · 판돈 정수 ${stakePayout(s)}`, 'reward');
    if (d.until && w >= d.until) cashOutRandomGame(s, `목표 ${d.until}웨이브 도달`);
}

/** 받고 나가기: 판돈을 받고 사냥터로 돌아가 자동 사냥을 이어갑니다. */
export function cashOutRandomGame(s: State, reason = '받고 나가기') {
    const got = stakePayout(s), wave = s.dungeon?.wave || 0;
    s.randomGameStats ??= { best: 0, runs: 0, cashed: 0 }; s.randomGameStats.cashed++;
    s.essence = (s.essence || 0) + got;
    s.dungeon = null; s.enemy = null; s.effects = {}; s.playerStun = 0;
    s.running = true;
    endRun(s, `랜덤게임 ${wave}웨이브 · ${reason} → 자동 사냥으로 전환`);
    addLog(s, `랜덤게임 ${reason} · ${wave}웨이브 · 정수 +${got}`, 'reward');
}

/** 쓰러짐: 판돈을 모두 잃고 사냥터로 돌아갑니다. */
export function loseRandomGame(s: State) {
    const lost = stakePayout(s), wave = s.dungeon?.wave || 0;
    s.dungeon = null;
    s.running = false;
    endRun(s, `랜덤게임 ${wave}웨이브에서 쓰러짐 · 판돈 소멸 · 멈춤`);
    addLog(s, `랜덤게임 ${wave + 1}웨이브에서 쓰러졌습니다 · 판돈(정수 ${lost})을 모두 잃었습니다.`, 'system');
}
