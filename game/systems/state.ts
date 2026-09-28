/** 세이브 상태 생성과 로그 기록. */
import { stats } from './stats';
import type { State } from '../types';
import { BALANCE, SAVE_VERSION } from '../data/balance';
import { type CombatEvent } from './combat';
import { PROGRESSION } from '../data/progression';
import { initialProgress, grantJobSkills } from './progression';
import { newGuild } from '../data/guild';
export function addLog(s: State, text: string, type: 'battle' | 'reward' | 'system' | 'skill' = 'system', event?: CombatEvent) {
    s.logs.push({ id: ++s.logId, text, type, ...(event ? { event } : {}) });
    if (s.logs.length > 70)
        s.logs.shift();
}
export function newState(now: number): State {
    const state: State = {
        ...initialProgress(),
        version: SAVE_VERSION,
        skillSpecializations: {}, bossResearchClaims: {}, abyssMilestones: [], growthGoal: null, tutorial: {}, voyage: {}, statRate: PROGRESSION.statPerLevel,
        tide: 0,
        abyssBest: 0,
        shopSerial: 0,
        guild: newGuild(),
        name: '물결의 낚시꾼',
        level: 1,
        exp: 0,
        gold: 100,
        pearls: 0,
        rebirths: 0,
        job: 'fisher',
        stage: 'brook',
        running: false,
        hp: BALANCE.baseHp + 12,
        enemy: null,
        turn: 0,
        kills: 0,
        deaths: 0,
        recovery: 0,
        lastTick: now,
        skills: ['hook'],
        cooldowns: {},
        book: {},
        inventory: [],
        equipment: {
            rod: { id: 'starter', name: '대나무 낚싯대', slot: 'rod', rarity: 0, power: 2, level: 1 },
            coat: { id: 'starter-coat', name: '낡은 구명조끼', slot: 'coat', rarity: 0, power: 2, level: 1 },
            charm: null,
        },
        permanent: { attack: 0, hp: 0, gold: 0 },
        dungeon: null,
        clears: {},
        logs: [{ id: 1, text: '여명의 시냇가에 도착했습니다. 낚시를 시작하세요.', type: 'system' }],
        logId: 1,
        lastDuel: 0,
        rating: 1000,
        wins: 0,
        losses: 0,
        bestStage: 0,
        lastOffline: null,
    };
    grantJobSkills(state);
    state.hp = stats(state).hp;
    state.mana = stats(state).mana;
    return state;
}
/** 자동 진행 종료·전환 사유를 남깁니다(표시 전용). */
export function endRun(s: State, reason: string) { s.runEnd = { reason, turn: s.turn }; }
