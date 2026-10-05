/**
 * v27.89 새싹 지원(환생 10회 미만 뉴비).
 * - 새싹의 축복: 경험치 ×(1 + 0.2 × (10 − 환생 횟수)) — 0회 ×3 → 9회 ×1.2, 10회부터 ×1. 다른 경험치 배율과 곱연산입니다.
 * - 초반 생존 보조(환생 5회 미만): 쓰러진 뒤 회복 대기 절반, 처치 후 회복 +5%p.
 */
import type { State } from '../types';
import { BALANCE, xpNeeded } from './balance';
import { skillById } from './skills';

/** v3.17 회복 대기는 환생 10회 미만까지 전처럼 3턴(6초)이고 경험치 손실도 없습니다. 처치 후 회복 +5%p는 그대로 5회 미만. */
export const SPROUT = { expUntil: 10, expPerRebirth: .2, survivalUntil: 5, recoveryUntil: 10, recoveryTurns: 3, recoveryScale: .5, healBonus: .05, deathExpLoss: .02, recoveryMin: 10 };
export const sproutExp = (rebirths = 0) => rebirths < SPROUT.expUntil ? 1 + SPROUT.expPerRebirth * (SPROUT.expUntil - Math.max(0, rebirths)) : 1;
export const sproutSurvival = (rebirths = 0) => rebirths < SPROUT.survivalUntil;
/** v3.17 쓰러진 뒤 회복 대기 턴. 환생 10회 미만은 3턴. 그 뒤는 기본 25턴에서 연구 ‘불굴의 의지’(단계당 -3턴)와 장착 패시브의 revive(턴)를 빼고 최저 10턴. */
export const deathRecoveryTurns = (s: Pick<State, 'rebirths'> & Partial<Pick<State, 'permanent' | 'skills'>>) => {
    if ((s.rebirths || 0) < SPROUT.recoveryUntil) return SPROUT.recoveryTurns;
    const research = (s.permanent?.revive || 0) * 3;
    const passive = (s.skills || []).reduce((a, id) => a + (skillById(id)?.revive || 0), 0);
    return Math.max(SPROUT.recoveryMin, BALANCE.recoveryTurns - research - passive);
};
/** v3.17 쓰러질 때 잃는 경험치: 지금 레벨 필요량의 2%(환생 10회 미만 0). 골드·숙련은 잃지 않습니다. */
export const deathExpLoss = (s: Pick<State, 'rebirths' | 'level' | 'exp'>) => (s.rebirths || 0) < SPROUT.recoveryUntil ? 0 : Math.min(Math.floor(s.exp || 0), Math.floor(xpNeeded(s.level, s.rebirths) * SPROUT.deathExpLoss));
/** 처치 후 회복에 더하는 비율. */
export const sproutHeal = (s: Pick<State, 'rebirths'>) => sproutSurvival(s.rebirths) ? SPROUT.healBonus : 0;
