/**
 * v27.89 새싹 지원(환생 10회 미만 뉴비).
 * - 새싹의 축복: 경험치 ×(1 + 0.2 × (10 − 환생 횟수)) — 0회 ×3 → 9회 ×1.2, 10회부터 ×1. 다른 경험치 배율과 곱연산입니다.
 * - 초반 생존 보조(환생 5회 미만): 쓰러진 뒤 회복 대기 절반, 처치 후 회복 +5%p.
 */
import type { State } from '../types';
import { BALANCE } from './balance';

export const SPROUT = { expUntil: 10, expPerRebirth: .2, survivalUntil: 5, recoveryScale: .5, healBonus: .05 };
export const sproutExp = (rebirths = 0) => rebirths < SPROUT.expUntil ? 1 + SPROUT.expPerRebirth * (SPROUT.expUntil - Math.max(0, rebirths)) : 1;
export const sproutSurvival = (rebirths = 0) => rebirths < SPROUT.survivalUntil;
/** 쓰러진 뒤 회복 대기 턴. 환생 5회 미만은 절반(올림). */
export const deathRecoveryTurns = (s: Pick<State, 'rebirths'>) => sproutSurvival(s.rebirths) ? Math.ceil(BALANCE.recoveryTurns * SPROUT.recoveryScale) : BALANCE.recoveryTurns;
/** 처치 후 회복에 더하는 비율. */
export const sproutHeal = (s: Pick<State, 'rebirths'>) => sproutSurvival(s.rebirths) ? SPROUT.healBonus : 0;
