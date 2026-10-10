/**
 * v3.231 이계 연료(data/otherworld.ts FUEL): 세계석 → 연료 충전, 자동 충전, 절전 판정.
 * 연료는 상태의 숫자 하나(s.fuel)입니다. 전투에서 이계 액티브를 쓸 때 줄고(combat.ts), 턴마다 상태로 되돌려 적습니다(turn.ts).
 */
import type { State } from '../types';
import { FUEL } from '../data/otherworld';
import { jobById } from '../data/classes';

/** 세계석 n개를 연료로(상한까지만, 남는 세계석은 쓰지 않음). 실제로 쓴 세계석 수를 돌려줍니다. */
export function chargeFuel(s: State, pearls: number) {
    const room = Math.max(0, FUEL.cap - (s.fuel || 0)), use = Math.max(0, Math.min(Math.floor(pearls), s.pearls || 0, Math.ceil(room / FUEL.perPearl)));
    if (use <= 0) return 0;
    s.pearls -= use;
    s.fuelBought = (s.fuelBought || 0) + use;
    s.fuel = Math.min(FUEL.cap, (s.fuel || 0) + use * FUEL.perPearl);
    return use;
}
/** 자동 충전: 연료가 FUEL.autoBelow 아래면 세계석 FUEL.autoPearls개를 충전합니다(세계석이 s.fuelAuto개 아래로는 쓰지 않음). */
export function autoFuel(s: State) {
    if (s.fuelAuto === undefined || (s.fuel || 0) >= FUEL.autoBelow) return 0;
    return chargeFuel(s, Math.min(FUEL.autoPearls, Math.max(0, (s.pearls || 0) - s.fuelAuto)));
}
/** 절전 모드: 이계 전투 직업인데 연료가 없음. */
export const powerSaving = (s: Pick<State, 'job' | 'fuel'>) => !!jobById(s.job)?.fuelJob && !((s.fuel || 0) > 0);
