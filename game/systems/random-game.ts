/** v27.82 랜덤게임 진행: 무작위 몬스터 생성, 웨이브 판돈, 받고 나가기, 쓰러짐. */
import type { State } from '../types';
import { RANDOM_GAME, randomGameBoss, waveStake } from '../data/random-game';
import { FISH, PLACES, tideLiftFish } from '../data/world';
import { scaledEnemyStats, foeSkills } from '../data/encounters';
import { researchRank } from '../data/economy';
import { encounterTier } from './meta';
import { addLog, endRun } from './state';

/** 랜덤게임 연구 단계(0이면 잠김). 생마다 이 횟수만큼 입장합니다. */
export const randomGameRank = (s: Pick<State, 'permanent'>) => researchRank(s, RANDOM_GAME.research);
/** 판돈 배율: ×1 → ×1.5 → ×2. */
export const randomGamePayout = (s: Pick<State, 'permanent'>) => 1 + .5 * Math.max(0, randomGameRank(s) - 1);
export const randomGameRunsLeft = (s: Pick<State, 'permanent' | 'randomGameRuns'>) => Math.max(0, randomGameRank(s) - (s.randomGameRuns || 0));
export const inRandomGame = (s: Pick<State, 'dungeon'>) => s.dungeon?.id === RANDOM_GAME.id;
/** 받을 판돈(배율 적용, 내림). */
export const stakePayout = (s: Pick<State, 'permanent' | 'dungeon'>) => { const st = s.dungeon?.stake || { essence: 0, pearls: 0 }, m = randomGamePayout(s); return { essence: Math.floor(st.essence * m), pearls: Math.floor(st.pearls * m) }; };

/** 해금한 일반 사냥터의 몬스터 중 하나를 무작위로 골라 지금 웨이브 난이도로 세웁니다. 처치 경험치·골드는 0입니다. */
export function spawnRandomGame(s: State, rng: () => number) {
    const tier = encounterTier(s), boss = randomGameBoss(s.dungeon!.wave);
    const pool = [...new Set(PLACES.filter(st => st.rebirth <= s.rebirths).flatMap(st => st.fish))].map(id => FISH.find(f => f.id === id)!).filter(f => f && (f.minTier || 0) <= tier);
    const f = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    const field = tideLiftFish(f, tier, s.level), foe = scaledEnemyStats(field, { boss, tier });
    s.enemy = { id: f.id, name: boss ? `${f.name} · 웨이브 보스` : f.name, hp: foe.hp, maxHp: foe.hp, attack: foe.attack, defense: foe.defense, exp: 0, gold: 0, boss, stun: 0, combatStats: foe, skills: foeSkills(f.id, field.level, boss), cooldowns: {}, effects: {}, mana: 100 };
}

/** 웨이브를 깼을 때: 판돈을 쌓고 다음 웨이브로. 목표 웨이브에 닿으면 받고 나갑니다. */
export function clearRandomWave(s: State) {
    const d = s.dungeon!, w = d.wave + 1, add = waveStake(w);
    d.wave = w;
    d.stake = { essence: (d.stake?.essence || 0) + add.essence, pearls: (d.stake?.pearls || 0) + add.pearls };
    const now = stakePayout(s);
    addLog(s, `랜덤게임 ${w}웨이브 돌파 · 판돈 정수 ${now.essence}${now.pearls ? ` · 세계석 ${now.pearls}` : ''}`, 'reward');
    if (d.until && w >= d.until) cashOutRandomGame(s, `목표 ${d.until}웨이브 도달`);
}

/** 받고 나가기: 판돈을 받고 사냥터로 돌아가 자동 사냥을 이어갑니다. */
export function cashOutRandomGame(s: State, reason = '받고 나가기') {
    const got = stakePayout(s), wave = s.dungeon?.wave || 0;
    s.essence = (s.essence || 0) + got.essence;
    s.pearls += got.pearls;
    s.dungeon = null; s.enemy = null; s.effects = {}; s.playerStun = 0;
    s.running = true;
    endRun(s, `랜덤게임 ${wave}웨이브 · ${reason} → 자동 사냥으로 전환`);
    addLog(s, `랜덤게임 ${reason} · ${wave}웨이브 · 정수 +${got.essence}${got.pearls ? ` · 세계석 +${got.pearls}` : ''}`, 'reward');
}

/** 쓰러짐: 판돈을 모두 잃고 사냥터로 돌아갑니다. */
export function loseRandomGame(s: State) {
    const lost = stakePayout(s), wave = s.dungeon?.wave || 0;
    s.dungeon = null;
    s.running = false;
    endRun(s, `랜덤게임 ${wave}웨이브에서 쓰러짐 · 판돈 소멸 · 멈춤`);
    addLog(s, `랜덤게임 ${wave + 1}웨이브에서 쓰러졌습니다 · 판돈(정수 ${lost.essence}${lost.pearls ? ` · 세계석 ${lost.pearls}` : ''})을 모두 잃었습니다.`, 'system');
}
