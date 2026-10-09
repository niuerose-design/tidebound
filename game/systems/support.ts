/**
 * v3.219 참모 계보 지원: 지원 스킬을 장착한 참모 계보 분신이 같은 계정의 다른 분신을 강하게 합니다.
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
export const SUPPORT_EFFECTS: SupportEffect[] = ['exp', 'gold', 'mastery', 'hp', 'mana', 'hpRegen', 'ap', 'boss', 'rank', 'penetration', 'critDamage', 'power'];
export const SUPPORT_LABELS: Record<SupportEffect, string> = { exp: '경험치', gold: '골드', mastery: '직업 · 스킬 숙련 획득', hp: '최대 체력', mana: '최대 마나', hpRegen: '턴당 체력 회복', ap: '장착 AP', boss: '보스 · 사냥감 피해', rank: '계급 경험치', penetration: '방어 관통', critDamage: '치명 피해', power: '두 공격 · 최대 체력' };
/** v3.224 총사령관 지휘 계통의 최대 증폭(AP는 증폭하지 않음). */
export const SUPPORT_AMP_MAX = 1.25;
/** 지원 스킬 최대값(군의관 체력 · 마나 5% · 회복 15%, 작전참모 AP 2 · 보스 5% · 계급 6%, 화력참모 관통 5%p · 치명 15%p, v3.224 군수사령관 AP 3 · 총사령관 공격 · 체력 4%). */
const BASE_CAP: Record<SupportEffect, number> = { exp: .08, gold: .08, mastery: .08, hp: .05, mana: .05, hpRegen: .15, ap: 3, boss: .05, rank: .06, penetration: .05, critDamage: .15, power: .04 };
/** 효과별 상한 = 지원 스킬 최대값 × 지휘 계통 최대 증폭(AP는 증폭 없이 3). */
export const SUPPORT_CAP = Object.fromEntries(SUPPORT_EFFECTS.map(e => [e, e === 'ap' ? BASE_CAP.ap : Math.round(BASE_CAP[e] * SUPPORT_AMP_MAX * 1e4) / 1e4])) as Record<SupportEffect, number>;
/** 화면 표기: AP는 정수, 관통 · 치명 피해는 %p, 나머지는 %. */
export const supportText = (e: SupportEffect, v: number) => e === 'ap' ? `${SUPPORT_LABELS[e]} +${Math.floor(v)}` : `${SUPPORT_LABELS[e]} +${Math.round(v * 1000) / 10}${e === 'penetration' || e === 'critDamage' ? '%p' : '%'}`;
/** 받은 지원 값(상한 적용). */
export const supportAmount = (s: Pick<State, 'support'>, e: SupportEffect) => Math.min(SUPPORT_CAP[e], Math.max(0, Number(s.support?.[e]) || 0));

export const isStaff = (s: Pick<State, 'job'>) => jobById(s.job)?.lineage === STAFF_LINEAGE_ID;
const equipped = (s: State) => [...new Set(s.skills || [])].filter(id => canUse(s, id));
/** 지원 스킬 하나의 지금 값: 숙련 단계(한계돌파 포함, 마지막 단계까지)에 따라 min → max. */
const byStage = (s: State, id: string, range: { min: number; max: number }) => {
    const sk = skillById(id), steps = masteryMilestonesFor(sk).length, stage = Math.min(steps, skillMastery(s, id));
    return range.min + (range.max - range.min) * stage / steps;
};
export function supportValue(s: State, id: string) {
    const sk = skillById(id);
    return sk?.support ? Math.round(byStage(s, id, sk.support) * 1e4) / 1e4 : 0;
}
/** v3.224 지휘 계통: 장착했으면 숙련 단계에 따른 증폭 배율, 아니면 1. */
export function supportAmp(s: State) {
    if (!isStaff(s)) return 1;
    return Math.max(1, ...equipped(s).map(id => { const r = skillById(id)?.supportAmp; return r ? Math.round(byStage(s, id, r) * 1e4) / 1e4 : 1; }));
}
/** 이 분신이 다른 분신에게 주는 지원. 참모 계보가 아니면 빈 표. */
export function supportOf(s: State): SupportMap {
    const out: SupportMap = {};
    if (!isStaff(s)) return out;
    for (const id of equipped(s)) { const sk = skillById(id); if (sk?.support) out[sk.support.effect] = Math.max(out[sk.support.effect] || 0, supportValue(s, id)); }
    // v3.224 지휘 계통: AP를 뺀 모든 지원을 증폭합니다.
    const amp = supportAmp(s);
    if (amp > 1) for (const e of SUPPORT_EFFECTS) if (e !== 'ap' && out[e]) out[e] = Math.round(out[e]! * amp * 1e4) / 1e4;
    return out;
}
/** 여러 분신의 지원을 효과별 최고값으로 합칩니다(합산하지 않음 · 효과마다 SUPPORT_CAP까지). */
export function mergeSupport(list: (SupportMap | undefined)[]): SupportMap {
    const out: SupportMap = {};
    for (const m of list) for (const e of SUPPORT_EFFECTS) { const v = Math.min(SUPPORT_CAP[e], Math.max(0, Number(m?.[e]) || 0)); if (v > (out[e] || 0)) out[e] = v; }
    return out;
}
/** 받은 지원 배율(1.05 = ×1.05). */
export const supportMultiplier = (s: Pick<State, 'support'>, e: SupportEffect) => 1 + supportAmount(s, e);
/** v3.219 작전참모 전술 지도: 장착 AP(정수). */
export const supportAP = (s: Pick<State, 'support'>) => Math.floor(supportAmount(s, 'ap'));
/** 지휘 체계: 장착한 지원 스킬 1개마다 자기 두 공격 +commandPer(참모 계보일 때만). */
export function commandBonus(s: State) {
    if (!isStaff(s)) return 0;
    const ids = equipped(s), per = Math.max(0, ...ids.map(id => skillById(id)?.commandPer || 0));
    return per ? per * ids.filter(id => skillById(id)?.support || skillById(id)?.supportAmp).length : 0;
}
