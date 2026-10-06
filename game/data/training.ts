/**
 * v3.67 독립 수련 통합(docs/concept.md 11.8 A안): 계열별 독립 1차 직업 27개를 ‘수련’ 직업 6개로 접습니다.
 * - 수련 직업은 사냥용이 아니라 계승·숙달 재료입니다. 수련 직업으로 직접 사냥하면 크게 약하고(공격 ×0.4 · 체력 ×0.5) 처치 보상도 줄어듭니다(경험치·골드 ×0.5, rewardScale).
 *   이 보정은 기획안의 초안 값이며 수치 패치(5단계)에서 다듬습니다. 다른 직업이 패시브를 계승해 쓸 때는 보정이 없습니다.
 * - 옛 수련 직업의 스킬은 id 그대로 새 수련 직업이 가집니다(skills.ts가 owner를 바꿈). 습득·숙련·계승 기록은 그대로 남습니다.
 * - 옛 수련 직업 27개는 retired: 새로 전직할 수 없고 화면에 보이지 않습니다. 숙달 기록은 숙달 수에 그대로 셉니다.
 */
import type { JobTreeId } from './classes';

type TrainingJob = { id: string; name: string; title: string; desc: string; tree: JobTreeId; requires: Partial<Record<'str' | 'dex' | 'int' | 'vit' | 'wis' | 'luk', number>> };
const RAW: TrainingJob[] = [
    { id: 'trainingPhysical', name: '물리 수련', title: '일곱 가지 몸놀림', desc: '물리 계열의 기초 패시브와 그물·함성·질주 기술을 한곳에 모은 수련 직업입니다. 직접 사냥하면 약하고, 기술은 계승해서 씁니다.', tree: 'physical', requires: { str: 10 } },
    { id: 'trainingMagic', name: '마법 수련', title: '서재와 명상의 나날', desc: '마법 계열의 기초 패시브와 봉인·교란 주문을 한곳에 모은 수련 직업입니다. 직접 사냥하면 약하고, 기술은 계승해서 씁니다.', tree: 'magic', requires: { int: 10 } },
    { id: 'trainingDefense', name: '방어 수련', title: '단단해지는 법', desc: '방어 계열의 기초 패시브와 밀치기를 한곳에 모은 수련 직업입니다. 직접 사냥하면 약하고, 기술은 계승해서 씁니다.', tree: 'defense', requires: { vit: 10 } },
    { id: 'trainingStatus', name: '상태이상 수련', title: '독과 피의 기초', desc: '상태이상 계열의 기초 패시브와 출혈·중독 기술을 한곳에 모은 수련 직업입니다. 직접 사냥하면 약하고, 기술은 계승해서 씁니다.', tree: 'status', requires: { luk: 10 } },
    { id: 'trainingHybrid', name: '복합 수련', title: '두 손을 함께 쓰는 법', desc: '복합 계열의 기초 패시브를 한곳에 모은 수련 직업입니다. 직접 사냥하면 약하고, 기술은 계승해서 씁니다.', tree: 'hybrid', requires: { str: 8, int: 8 } },
    { id: 'trainingSupport', name: '보조 수련', title: '발걸음과 지도', desc: '곡예와 측량(장비 드롭) 패시브를 모은 수련 직업입니다. 직접 사냥하면 약하고, 기술은 계승해서 씁니다.', tree: 'support', requires: { dex: 10 } },
];
/** 수련 직업 보정(초안). */
export const TRAINING_PENALTY = { attack: .4, magic: .4, hp: .5, reward: .5 };
export const TRAINING_JOBS = RAW.map(j => ({
    ...j, attack: TRAINING_PENALTY.attack, magic: TRAINING_PENALTY.magic, hp: TRAINING_PENALTY.hp, defense: 1, resist: 1, crit: 0,
    tier: 1, level: 10, mastery: 0, role: '수련·계승 재료', lineage: `${j.tree}-independent`, branchless: true, fullKit: true, subRole: 'training' as const, rewardScale: TRAINING_PENALTY.reward,
}));
/** 새 수련 직업 → 합쳐지는 옛 수련 직업(11.8-1). 지도 제작자는 둘로 나뉩니다(교란 → 마법, 측량 → 보조). */
export const TRAINING_GROUPS: Record<string, string[]> = {
    trainingPhysical: ['netWeaver', 'oathAngler', 'wakeRunner', 'woodcutter', 'sapper', 'hunter', 'gladiator'],
    trainingMagic: ['bubbleMage', 'stillwaterBinder', 'manaScribe', 'scholar', 'meditator', 'tideSurveyor'],
    trainingDefense: ['driftwoodHermit', 'scaleKnight', 'lifeTender', 'blacksmithApprentice', 'noviceMonk', 'herbalist'],
    trainingStatus: ['apothecary', 'toadstoolForager', 'inkThrower', 'barbSkirmisher'],
    trainingHybrid: ['sellsword', 'tinkerApprentice', 'ambiAngler'],
    trainingSupport: ['acrobat'],
};
/** 옛 직업 묶음과 다른 곳으로 가는 스킬. */
const SKILL_OVERRIDES: Record<string, string> = { chartedCurrents: 'trainingSupport', currentJam: 'trainingMagic' };
export const RETIRED_TRAINING = Object.values(TRAINING_GROUPS).flat();
const OLD_TO_NEW = Object.fromEntries(Object.entries(TRAINING_GROUPS).flatMap(([next, olds]) => olds.map(old => [old, next])));
/** 옛 수련 직업이 옮겨 갈 새 수련 직업. */
export const trainingFor = (oldJob: string): string | undefined => OLD_TO_NEW[oldJob];
/** 스킬의 새 주인(옛 수련 직업의 스킬이면). */
export const trainingSkillOwner = (skillId: string, oldJob?: string) => SKILL_OVERRIDES[skillId] ?? (oldJob ? OLD_TO_NEW[oldJob] : undefined);
