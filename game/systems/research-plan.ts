/** v3.40 연구 구매 예약(승천 1회부터, 설계 14.3). 자동 환생과 함께 automation.ts가 턴마다 부릅니다. */
import type { State } from '../types';
import { researchCost, researchById } from '../data/economy';
import { ascensionPerk } from '../data/ascension';
import { researchBlock, buyResearch } from './commerce';
import { addLog } from './state';

/** 자동 환생 목표 레벨 선택지(0 = 요구 레벨에 닿는 즉시). 요구 레벨보다 낮으면 요구 레벨을 씁니다. */
export const AUTO_REBIRTH_LEVELS = [0, 50, 60, 70, 80, 90, 100] as const;
/** 연구 구매 예약 칸 수. */
export const RESEARCH_PLAN_MAX = 40;

/**
 * 연구 구매 예약을 순서대로 처리합니다. 앞 칸을 목표 단계까지 산 뒤 다음 칸으로 갑니다.
 * 세계석이 모자라면 거기서 멈추고(순서를 지킴), 아직 열리지 않은 연구(환생 조건·승천 전용 단계·200회 잠금)는 건너뜁니다.
 * 산 단계 수를 돌려줍니다.
 */
export function runResearchPlan(s: State) {
    const plan = s.researchPlan;
    if (!plan?.on || !plan.items.length || !ascensionPerk(s, 'researchPlan')) return 0;
    let bought = 0;
    for (const item of plan.items) {
        const r = researchById(item.id);
        if (!r) continue;
        while ((s.permanent[item.id] || 0) < Math.min(item.to, r.max)) {
            if (researchBlock(s, item.id)) break;
            if (s.pearls < researchCost(item.id, s.permanent[item.id] || 0)) { if (bought) addLog(s, `연구 구매 예약 · ${bought}단계 구매`, 'system'); return bought; }
            buyResearch(s, item.id); bought++;
        }
    }
    if (bought) addLog(s, `연구 구매 예약 · ${bought}단계 구매`, 'system');
    return bought;
}
