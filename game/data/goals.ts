import type { State } from '../types';
import { FISH, STAGES, DUNGEONS } from './world';
import { kst } from './doors';

/**
 * v25.6 일일·주간 항해 목표. 한국 시간 자정·월요일에 바뀌며, 날짜를 씨앗으로 정해지므로 서버·클라이언트가 같은 목표를 봅니다.
 * 진행은 포획·정복 때 쌓이고, 다 채우면 보상(진주·정수)을 바로 받습니다. 하루 목표를 모두 채우면 추가 진주.
 */
export type GoalKind = 'catch' | 'species' | 'dungeon' | 'boss' | 'swarm';
export type Goal = { id: string; kind: GoalKind; target: number; /** species면 어종 id, dungeon이면 던전 id(빈 값은 아무 곳). */ subject?: string; pearls: number; essence?: number; progress: number; claimed?: boolean };
export type GoalBoard = { key: string; goals: Goal[]; /** 모두 완료 보너스를 받았는지. */ bonus?: boolean };
export const DAILY_ALL_BONUS = 3, WEEKLY_ALL_BONUS = 10;

const hash = (text: string) => { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const pick = <T>(list: T[], seed: number) => list[seed % list.length];
/** 한국 시간 기준 날짜 키(YYYY-MM-DD)와 ISO 주 키(YYYY-Www). */
export const dayKey = (now: number) => kst(now).date;
export function weekKey(now: number) {
    const d = new Date(kst(now).date + 'T00:00:00Z');
    const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3);
    const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
/** 주 키를 랭킹 시즌 정수로(예: 2026-W40 → 202640). */
export const weekSeason = (key: string) => Number(key.replace('-W', ''));

/** 지금 플레이어가 갈 수 있는 해역·던전 안에서 목표를 뽑습니다(환생·레벨 조건). */
export function makeGoals(s: Pick<State, 'rebirths' | 'level' | 'peakLevel'>, key: string, weekly: boolean): Goal[] {
    const level = Math.max(s.level, s.peakLevel || 0, 10), seed = hash(key + (weekly ? ':w' : ':d'));
    const stages = STAGES.filter(st => st.level <= level && st.rebirth <= s.rebirths), dungeons = DUNGEONS.filter(d => d.level <= level && d.rebirth <= s.rebirths);
    const fishPool = [...new Set(stages.flatMap(st => st.fish))].filter(id => FISH.some(f => f.id === id));
    const scale = weekly ? 6 : 1;
    const goals: Goal[] = [
        { id: 'catch', kind: 'catch', target: 60 * scale, pearls: weekly ? 4 : 1, progress: 0 },
        { id: 'species', kind: 'species', subject: pick(fishPool, seed), target: 25 * scale, pearls: weekly ? 5 : 1, essence: weekly ? 10 : 2, progress: 0 },
        dungeons.length ? { id: 'dungeon', kind: 'dungeon', subject: pick(dungeons, seed >>> 3).id, target: weekly ? 5 : 1, pearls: weekly ? 6 : 1, essence: weekly ? 15 : 3, progress: 0 } : { id: 'boss', kind: 'boss', target: weekly ? 6 : 1, pearls: weekly ? 6 : 1, progress: 0 },
    ];
    if (weekly) goals.push({ id: 'boss', kind: 'boss', target: 12, pearls: 5, progress: 0 });
    return goals;
}
export function goalText(g: Goal) {
    const name = g.kind === 'species' ? FISH.find(f => f.id === g.subject)?.name || '지정 어종' : g.kind === 'dungeon' ? DUNGEONS.find(d => d.id === g.subject)?.name || '던전' : '';
    return g.kind === 'catch' ? `아무 물고기 ${g.target}마리 포획` : g.kind === 'species' ? `${name} ${g.target}마리 포획` : g.kind === 'dungeon' ? `${name} ${g.target}회 정복` : g.kind === 'boss' ? `보스 ${g.target}마리 포획` : `무리 사냥 ${g.target}회`;
}
