/**
 * v3.40 승천 편의(설계 14.3): 자동 환생 · 연구 구매 예약(승천 1회부터). 전투력과 무관한 반복 조작 덜기입니다.
 * 둘 다 자동 사냥 턴(온라인 tick·부재중 정산)마다 확인합니다. 설정은 환생·승천해도 남습니다(승천 전에 짜 둔 순서를 다음 바퀴에 다시 씀).
 */
import type { State } from '../types';
import { ASCENSION, ascensionPerk } from '../data/ascension';
import { rebirthLevel } from './meta';
import { rebirthNow } from './actions/lifecycle';
import { addLog } from './state';
import { runResearchPlan } from './research-plan';
export { AUTO_REBIRTH_LEVELS, RESEARCH_PLAN_MAX, runResearchPlan, type ResearchPlanItem } from './research-plan';

/** 자동 환생이 지금 일어날 조건: 승천 1회 · 켜 둠 · 던전 밖 · 환생 상한 전 · 목표 레벨 도달. */
export function autoRebirthDue(s: State) {
    const a = s.autoRebirth;
    if (!a?.on || !ascensionPerk(s, 'autoRebirth') || s.dungeon || s.rebirths >= ASCENSION.rebirthCap) return false;
    return s.level >= Math.max(rebirthLevel(s), a.level || 0);
}

/** 자동 사냥 턴마다: 예약 연구를 사고, 조건이 되면 자동 환생한 뒤 사냥을 이어 갑니다. */
export function runAutomation(s: State, rng: () => number) {
    if (s.researchPlan?.on) runResearchPlan(s);
    if (!autoRebirthDue(s)) return;
    // 부재중 정산 중에도 일어나므로, 정산 요약(lastOffline)은 새 생으로 넘어가도 남깁니다.
    const level = s.level, offline = s.lastOffline;
    rebirthNow(s, s.lastTick, rng);
    s.running = true;
    if (offline) s.lastOffline = offline;
    addLog(s, `자동 환생 · Lv.${level}에서 ${s.rebirths}번째 환생`, 'system');
    if (s.researchPlan?.on) runResearchPlan(s);
}
