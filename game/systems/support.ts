/**
 * v3.215 참모 계보 지원: 지원 스킬을 장착한 참모 계보 분신이 같은 계정의 다른 분신을 강하게 합니다.
 * - 지원 값은 장착한 지원 스킬의 숙련 단계에 따라 min → max. 지원자의 현재 직업이 참모 계보일 때만 셉니다(계승해 써도 지원 없음).
 * - 서버가 슬롯 요약(SlotSummary.support)에 실어 올리고(지원 값이 바뀐 저장에서만 1회), 받는 쪽은 계정 동기화(server/store.ts syncAccount,
 *   최대 10분 주기)에서 자기를 뺀 다른 분신들의 값을 효과별 최고값으로 합쳐 s.support에 캐시합니다. 받는 쪽을 위한 별도 읽기 · 갱신 계기는 없습니다.
 * - 계정 보너스(s.account)와 따로 두어 승천 캐릭터도 받습니다. 결투 등록 스냅샷은 지원을 빼고 만듭니다(server/store.ts, 제단 PvE는 받음).
 */
import type { State, SupportEffect, SupportMap } from '../types';
import { jobById } from '../data/classes';
import { skillById } from '../data/skills';
import { canUse, skillMastery, masteryMilestonesFor } from './progression';

export const STAFF_LINEAGE_ID = 'staff';
export const SUPPORT_EFFECTS: SupportEffect[] = ['exp', 'gold', 'mastery', 'hp', 'mana', 'hpRegen'];
export const SUPPORT_LABELS: Record<SupportEffect, string> = { exp: '경험치', gold: '골드', mastery: '직업 · 스킬 숙련 획득', hp: '최대 체력', mana: '최대 마나', hpRegen: '턴당 체력 회복' };
/** 효과별 상한(그 효과 지원 스킬의 최대값). v3.216 군의관: 체력 · 마나 5%, 회복 15%. */
export const SUPPORT_CAP: Record<SupportEffect, number> = { exp: .08, gold: .08, mastery: .08, hp: .05, mana: .05, hpRegen: .15 };

export const isStaff = (s: Pick<State, 'job'>) => jobById(s.job)?.lineage === STAFF_LINEAGE_ID;
const equipped = (s: State) => [...new Set(s.skills || [])].filter(id => canUse(s, id));
/** 지원 스킬 하나의 지금 값: 숙련 단계(한계돌파 포함, 마지막 단계까지)에 따라 min → max. */
export function supportValue(s: State, id: string) {
    const sk = skillById(id);
    if (!sk?.support) return 0;
    const steps = masteryMilestonesFor(sk).length, stage = Math.min(steps, skillMastery(s, id));
    return Math.round((sk.support.min + (sk.support.max - sk.support.min) * stage / steps) * 1e4) / 1e4;
}
/** 이 분신이 다른 분신에게 주는 지원. 참모 계보가 아니면 빈 표. */
export function supportOf(s: State): SupportMap {
    const out: SupportMap = {};
    if (!isStaff(s)) return out;
    for (const id of equipped(s)) { const sk = skillById(id); if (sk?.support) out[sk.support.effect] = Math.max(out[sk.support.effect] || 0, supportValue(s, id)); }
    return out;
}
/** 여러 분신의 지원을 효과별 최고값으로 합칩니다(합산하지 않음 · 효과마다 SUPPORT_CAP까지). */
export function mergeSupport(list: (SupportMap | undefined)[]): SupportMap {
    const out: SupportMap = {};
    for (const m of list) for (const e of SUPPORT_EFFECTS) { const v = Math.min(SUPPORT_CAP[e], Math.max(0, Number(m?.[e]) || 0)); if (v > (out[e] || 0)) out[e] = v; }
    return out;
}
/** 받은 지원 배율(1.05 = ×1.05). */
export const supportMultiplier = (s: Pick<State, 'support'>, e: SupportEffect) => 1 + Math.min(SUPPORT_CAP[e], Math.max(0, Number(s.support?.[e]) || 0));
/** 지휘 체계: 장착한 지원 스킬 1개마다 자기 두 공격 +commandPer(참모 계보일 때만). */
export function commandBonus(s: State) {
    if (!isStaff(s)) return 0;
    const ids = equipped(s), per = Math.max(0, ...ids.map(id => skillById(id)?.commandPer || 0));
    return per ? per * ids.filter(id => skillById(id)?.support).length : 0;
}
