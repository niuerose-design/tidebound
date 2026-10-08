/** 세이브 상태 생성과 로그 기록. */
import { makeGoals, dayKey, weekKey } from '../data/goals';
import { stats } from './stats';
import type { State } from '../types';
import { BALANCE, SAVE_VERSION } from '../data/balance';
import { type CombatEvent } from './combat';
import { PROGRESSION } from '../data/progression';
import { initialProgress, grantJobSkills } from './progression';
import { LOG_KEEP, logGroup } from './log-delta';
export function addLog(s: State, text: string, type: 'battle' | 'reward' | 'system' | 'skill' = 'system', event?: CombatEvent) {
    s.logs.push({ id: ++s.logId, text, type, turn: s.turn, ...(event ? { event } : {}) });
    // v3.48 묶음(전투·시스템 / 획득·스킬)마다 따로 상한을 둡니다. 넘친 묶음의 가장 오래된 줄 하나를 뺍니다.
    const group = logGroup(type);
    if (s.logs.reduce((n, l) => n + (logGroup(l.type) === group ? 1 : 0), 0) > LOG_KEEP[group])
        s.logs.splice(s.logs.findIndex(l => logGroup(l.type) === group), 1);
}
export function newState(now: number): State {
    const state: State = {
        ...initialProgress(),
        version: SAVE_VERSION,
        relicRefunded: true, autoStarRefunded: true, placeApMoved: true, plainCodex: true, relicRule: true,
        masteryRescaled: true,
        trainingRescaled: true,
        masteryAligned: true,
        penetrationBoosted: true,
        rankRescaled: true,
        // v3.154 새 세이브는 긴 휴식 단계 변환이 필요 없습니다.
        offlineRescaled: true,
        // v27.31 새 세이브는 무료로 받을 리미터 해제 단계가 없습니다(옛 세이브만 migrations에서 한 번 받음).
        researchGranted: { limitBreak: 0 },
        researchLegacy: {},
        abyssMilestones: [], tutorial: { done: {} }, voyage: {}, achievements: {}, achievementClaims: {}, statRate: PROGRESSION.statPerLevel,
        tide: 0,
        abyssBest: 0,
        shopSerial: 0,
        essence: 0,
        name: '초보 모험가',
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
            rod: { id: 'starter', name: '목검', slot: 'rod', rarity: 0, power: 2, level: 1 },
            coat: { id: 'starter-coat', name: '하얀 반팔 면티', slot: 'coat', rarity: 0, power: 2, level: 1 },
            charm: null,
            cape: null,
        },
        permanent: { attack: 0, hp: 0, gold: 0 },
        dungeon: null,
        clears: {},
        lifeStart: { at: now, playMs: 0 },
        logs: [{ id: 1, text: '리스항구 · 선착장에 도착했습니다. 사냥을 시작하세요.', type: 'system' }],
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
    // v25.6 새 세이브도 그날의 목표판을 바로 가집니다(행동 없이도 상태가 같도록).
    state.daily = { key: dayKey(now), goals: makeGoals(state, dayKey(now), false) };
    state.weekly = { key: weekKey(now), goals: makeGoals(state, weekKey(now), true) };
    return state;
}
/** 자동 진행 종료·전환 사유를 남깁니다(표시 전용). */
export function endRun(s: State, reason: string) { s.runEnd = { reason, turn: s.turn }; }
