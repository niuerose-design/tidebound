/**
 * v3.161 대왕 시리즈: 숙련의 까미 · 경험의 누리 · 정수의 슬라임의 우두머리. 작은 녀석을 minBookKills마리 잡은 뒤부터,
 * 그 특별 몬스터가 나올 자리의 share만큼이 대왕으로 바뀝니다(출현 난수는 그대로 나눠 씀, 호루라기로는 부를 수 없음).
 * 보상이 강력한 만큼 잡기 어렵습니다: 체력은 작은 녀석의 ×hp(까미 ×10 · 누리 ×12 · 슬라임 ×8 최강 몬스터), 공격은 최강 몬스터의 ×attack,
 * turns턴 안에 못 잡으면 달아납니다(칠흑 보스처럼 도망 보상 없음). 보상은 작은 녀석의 ‘대’ 당첨 × rewardMul이 확정입니다.
 * 특별 도감에 따로 실리고, 던전에서는 나오지 않습니다.
 */
import { ODDS } from './odds';
import { MIMIC } from './mimic';
import { EXP_NURI } from './exp-nuri';
import { ESSENCE_SLIME } from './essence-slime';
export type KingKind = 'mimic' | 'nuri' | 'slime';
export const KING = {
    /** 작은 녀석(특별 도감 처치 수)을 이만큼 잡은 뒤부터 대왕이 섞입니다. */
    minBookKills: 30,
    /** 그 특별 몬스터 출현 중 대왕으로 바뀌는 몫. 값은 서버 전용(odds). */
    get share() { return ODDS.king.share; },
    /** 체력: 작은 녀석의 배수. 공격: 그 사냥터 최강 몬스터의 배수. */
    hp: 4, attack: 1.5,
    /** 이 턴 수(2초/턴) 안에 못 잡으면 달아납니다. 칠흑 보스와 같은 80턴. */
    turns: 80,
    /** 보상: 작은 녀석의 ‘대’ 당첨 × 이 값(까미 120,000 숙련(v3.291, 전 300,000) · 누리 레벨 9% 또는 출현 90회분 · 슬라임 정수 묶음 ×120). */
    rewardMul: 3,
    mimic: { id: 'kingMimic', name: '대왕 까미', base: MIMIC.id },
    nuri: { id: 'kingNuri', name: '대왕 누리', base: EXP_NURI.id },
    slime: { id: 'kingSlime', name: '대왕 정수 슬라임', base: ESSENCE_SLIME.id },
} as const;
export const KING_KINDS: readonly KingKind[] = ['mimic', 'nuri', 'slime'];
export const KING_IDS: readonly string[] = KING_KINDS.map(k => KING[k].id);
/** 특별 몬스터(까미 · 누리 · 슬라임 · 대왕 3종) id. 일반 도감 · 황금 개체 · 변종에서 빠집니다. */
export const SPECIAL_IDS: readonly string[] = [MIMIC.id, EXP_NURI.id, ESSENCE_SLIME.id, ...KING_IDS];
export const isSpecialId = (id: string) => SPECIAL_IDS.includes(id);
/** 대왕이 섞일 수 있는지: 작은 녀석을 minBookKills마리 이상 잡았는가. */
export const kingReady = (s: { book: Record<string, number> }, kind: KingKind) => (s.book[KING[kind].base] || 0) >= KING.minBookKills;
