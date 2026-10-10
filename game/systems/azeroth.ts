import type { Skill, State } from '../types';

/** v3.247 채굴 확률 보너스(세계석 광부 패시브): 고정 mineBonus + 캔 세계석 per개마다 bonus(최대 cap). 전투(turn.ts)와 장면 HUD가 같이 씁니다. */
export function mineBonusOf(s: Pick<State, 'pearlsMined'>, skills: (Skill | undefined)[]) {
    return skills.reduce((n, sk) => n + (sk?.type === 'passive' ? (sk.mineBonus || 0) + (sk.mineGrowth ? Math.min(sk.mineGrowth.cap, Math.floor((s.pearlsMined || 0) / sk.mineGrowth.per) * sk.mineGrowth.bonus) : 0) : 0), 0);
}
