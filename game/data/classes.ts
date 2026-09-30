import type { Attribute, Stats } from '../types';
import { EXPANSION_JOBS } from './expansion';
export type Job = {
    id: string;
    name: string;
    title: string;
    desc: string;
    attack: number;
    magic: number;
    hp: number;
    defense: number;
    resist: number;
    crit: number;
    /** Additive experience bonus, separate from combat multipliers. */
    expBonus?: number;
    tier: number;
    level: number;
    parent?: string;
    requires: Partial<Record<Attribute, number>>;
    mastery: number;
    role: string;
    tree: JobTreeId;
    /** Cumulative wins needed to complete this job's mastery track. */
    masteryTarget?: number;
    /** Extra multiplier applied to positive job bonuses after mastery is complete. */
    masteryBoost?: number;
    requiresSkillMastery?: Record<string, number>;
    requiresJobMastery?: Record<string, number>;
    /** 직접 배분한 능력치 포인트(레벨 기본치 제외) 조건. */
    requiresAllocated?: Partial<Record<Attribute, number>>;
    penalties?: Partial<Stats>;
    branchless?: boolean;
    /** 회복 직업. 체력이 충분할 때 쓴 회복 기술도 피해가 줄지 않습니다. */
    healer?: boolean;
    hidden?: boolean;
    rebirth?: number;
    /** 계보 id. 없으면 루트 조상 id, 상위·하위가 없는 1차 직업은 `${tree}-independent`(lineageOf). */
    lineage?: string;
    /** 직업 성격 태그. 없으면 role을 '·'로 나눈 값(jobTags). */
    tags?: string[];
    /** 미발견 히든·문 직업의 실루엣 카드에 보이는 한 줄 힌트. */
    hint?: string;
};
export type JobTreeId = 'physical' | 'magic' | 'defense' | 'status' | 'hybrid' | 'support' | 'mystery';
export type JobTree = {
    id: JobTreeId;
    name: string;
    subtitle: string;
    description: string;
    accent: string;
};
export const JOB_TREES: JobTree[] = [
    { id: 'physical', name: '물리', subtitle: '근력 · 기민 · 물리', description: '근력과 기민으로 적을 꿰뚫고 치명타·연타를 쌓는 계열입니다.', accent: '#d88a68' },
    { id: 'magic', name: '마법', subtitle: '지능 · 정신 · 마법', description: '마나와 주문 확률을 이용해 큰 마법 피해·회복·약화를 만드는 계열입니다.', accent: '#75b8d6' },
    { id: 'defense', name: '방어', subtitle: '체질 · 방어 · 회복', description: '체력과 방어를 바탕으로 회복·기절·반격·흡혈을 조합하는 계열입니다.', accent: '#8fc49b' },
    { id: 'status', name: '상태이상', subtitle: '출혈 · 중독 · 저주 · 제어', description: '방어를 무시하는 지속 피해와 기절·침묵·약화로 적을 무너뜨리는 계열입니다. 걸어 둔 상태이상에 연계할수록 강해집니다.', accent: '#b6c86a' },
    { id: 'hybrid', name: '복합', subtitle: '물리 + 마법 · HP · MP', description: '물리와 마법, 체력과 마나를 함께 쓰는 복합 계열입니다. 모든 항해의 출발점인 견습 낚시꾼도 여기에 속합니다.', accent: '#c0a1dc' },
    { id: 'support', name: '보조', subtitle: '경험치 · 보상 · 속도 · 파밍', description: '직접 화력보다 성장 속도·보상·파밍·가속으로 편성을 보조하는 계열입니다.', accent: '#e0b36a' },
    { id: 'mystery', name: '???', subtitle: '히든 · 페널티 · 몬스터', description: '조건을 만족해야 드러나는 숨은 직업, 페널티를 숙련으로 극복하는 직업, 몬스터 혈족의 모음입니다.', accent: '#9a9ab8' },
];
export const JOBS: Job[] = [
    { id: 'fisher', name: '견습 낚시꾼', title: '가능성이 시작되는 곳', desc: '공용 기술을 익히며 자신만의 항해를 준비합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 0, level: 1, requires: {}, mastery: 0, role: '균형', tree: 'hybrid' },
    { id: 'harpoon', name: '작살 사냥꾼', title: '정교한 한 방', desc: '물리 공격과 치명타에 아주 작은 보정만 받는 첫 전직. 이후 관통·폭발 계열로 갈라집니다.', attack: 1.06, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, tier: 1, level: 10, requires: { str: 12, dex: 10 }, mastery: 0, role: '물리 입문', tree: 'physical', penalties: { accuracy: -.02 } },
    { id: 'tide', name: '조류 술사', title: '조류를 움직이는 의지', desc: '마법 공격과 저항에 작은 보정만 받는 첫 전직. 주문의 방향은 후속 직업에서 결정됩니다.', attack: 1, magic: 1.08, hp: 1.02, defense: 1, resist: 1.02, crit: 0, tier: 1, level: 10, requires: { int: 12, wis: 10 }, mastery: 0, role: '마법 입문', tree: 'magic', penalties: { attack: -2 } },
    { id: 'warden', name: '산호 수호자', title: '바다의 방패', desc: '체력과 방어에 작은 보정만 받는 첫 전직. 회복·제어·반격 중 하나를 선택합니다.', attack: 1, magic: 1, hp: 1.1, defense: 1.08, resist: 1.02, crit: 0, tier: 1, level: 10, requires: { vit: 12, str: 10 }, mastery: 0, role: '방어 입문', tree: 'defense', penalties: { attack: -2 } },
    { id: 'whaler', name: '거경 사냥꾼', title: '거대한 적을 꿰뚫는 자', desc: '물리 공격 +45%, 치명타 +12%p. 높은 체력의 적을 상대하는 관통 특화.', attack: 1.45, magic: 1, hp: 1.1, defense: 1, resist: 1, crit: .12, tier: 2, level: 25, parent: 'harpoon', requires: { str: 35, dex: 20 }, mastery: 75, role: '물리 폭발', tree: 'physical' },
    { id: 'corsair', name: '폭풍 유격수', title: '파도보다 먼저 움직인다', desc: '물리 공격 +25%, 치명타 +20%p. 기민과 출혈을 조합하는 사냥꾼.', attack: 1.25, magic: 1, hp: 1, defense: 1, resist: 1, crit: .2, tier: 2, level: 25, parent: 'harpoon', requires: { dex: 35, luk: 20 }, mastery: 75, role: '회피·출혈', tree: 'physical' },
    { id: 'tempest', name: '심해 폭풍술사', title: '심연이 답하는 주문', desc: '마법 공격 +55%, 마법 방어 +20%. 약화와 폭발 주문.', attack: 1, magic: 1.55, hp: 1, defense: 1, resist: 1.2, crit: .05, tier: 2, level: 25, parent: 'tide', requires: { int: 35, wis: 20 }, mastery: 75, role: '마법 폭발', tree: 'magic' },
    { id: 'oracle', name: '진주 예언자', title: '마르지 않는 생명의 샘', desc: '마법 공격 +25%, 체력 +25%, 마법 방어 +40%. 회복과 흡수.', attack: 1, magic: 1.25, hp: 1.25, defense: 1, resist: 1.4, crit: 0, tier: 2, level: 25, parent: 'tide', requires: { wis: 35, vit: 20 }, mastery: 75, role: '회복·유지', tree: 'magic' },
    { id: 'bulwark', name: '심연의 철벽', title: '가라앉지 않는 요새', desc: '체력 +55%, 물리 방어 +65%. 방어 기반 공격과 기절.', attack: 1.1, magic: 1, hp: 1.55, defense: 1.65, resist: 1.2, crit: 0, tier: 2, level: 25, parent: 'warden', requires: { vit: 35, str: 20 }, mastery: 75, role: '방어·제어', tree: 'defense' },
    { id: 'paladin', name: '성해 기사', title: '빛과 작살의 서약', desc: '물리·마법 공격 +20%, 체력 +25%, 두 방어 +25%. 하이브리드 전투.', attack: 1.2, magic: 1.2, hp: 1.25, defense: 1.25, resist: 1.25, crit: .05, tier: 2, level: 25, parent: 'warden', requires: { str: 25, wis: 25 }, mastery: 75, role: '복합·흡혈', tree: 'defense' },
    { id: 'wanderer', name: '이형 항해자', title: '어느 깃발에도 속하지 않는 자', desc: '수면 읽기로 명중과 회피를 익히는 복합 입문 직업. 다른 직업에서 계승한 기술의 빈틈을 보완합니다.', attack: 1.02, magic: 1.02, hp: 1.02, defense: 1, resist: 1, crit: .01, tier: 1, level: 10, requires: { str: 10, int: 10, vit: 10 }, mastery: 0, role: '복합 입문', tree: 'hybrid', penalties: { accuracy: -.02 } },
    { id: 'chimera', name: '심해 융합자', title: '살과 마나를 한 덩어리로', desc: '최대 체력과 마나를 공격으로 바꾸는 대기만성형 직업.', attack: 1.3, magic: 1.3, hp: 1.3, defense: 1.1, resist: 1.15, crit: .05, tier: 2, level: 25, parent: 'wanderer', requires: { str: 25, int: 25, vit: 20 }, mastery: 75, role: 'HP·MP 복합', tree: 'hybrid' },
    { id: 'voidcaller', name: '공허의 기록자', title: '기록되지 않은 파도의 목소리', desc: '환생 이후에 드러나는 히든 직업. 마나 비례 주문과 높은 발동 확률.', attack: 1, magic: 1.35, hp: 1.05, defense: 1, resist: 1.25, crit: .1, tier: 2, level: 25, parent: 'wanderer', requires: { int: 30, luk: 30 }, mastery: 75, role: '히든·MP', tree: 'mystery', lineage: 'voidcaller', hidden: true, rebirth: 1 },
    { id: 'undead', name: '망인', title: '죽음과 함께 걷는 낚시꾼', desc: '체력·마법·명중에 불리한 대신, 숙련한 골격 패시브가 AP와 최대 체력을 되찾아 줍니다.', attack: .98, magic: .88, hp: .78, defense: .9, resist: .86, crit: .02, tier: 1, level: 10, requires: { vit: 14, luk: 14 }, mastery: 0, role: '페널티·숙련', tree: 'mystery', hidden: true, penalties: { accuracy: -.08, mana: -10, resist: -3 } },
    { id: 'skeleton', name: '해골 기사', title: '부서져도 다시 선다', desc: '최대 체력은 낮지만 방어와 골격의 힘으로 버티는 페널티 극복형 직업.', attack: 1.18, magic: .84, hp: .72, defense: 1.25, resist: .82, crit: .04, tier: 2, level: 25, parent: 'undead', requires: { str: 32, vit: 24 }, mastery: 75, role: '골격·방어', tree: 'mystery', hidden: true, penalties: { accuracy: -.1, mana: -14, resist: -5 } },
    { id: 'bonecaster', name: '골령술사', title: '마나로 뼈를 세우는 자', desc: '약한 육체와 낮은 명중을 감수하고 마나·마법 방어·숙련 보상에 투자하는 히든 직업.', attack: .8, magic: 1.28, hp: .7, defense: .8, resist: 1.18, crit: .06, tier: 2, level: 25, parent: 'undead', requires: { int: 32, wis: 24 }, mastery: 75, role: '골령·마법', tree: 'mystery', hidden: true, penalties: { accuracy: -.12, mana: -6, defense: -3 } },
];

// 직업은 전투 공식과 분리된 데이터입니다. 숫자를 낮추거나 조건을 바꿔도 저장 형식은 변하지 않습니다.
// 1차 직업은 거의 중립, 2차는 방향성, 3차는 큰 대가와 뚜렷한 보상을 갖도록 설계했습니다.
JOBS.push(
    { id: 'tidalBrawler', name: '조수 투사', title: '주먹으로 물살을 가른다', desc: '작살 사냥꾼과 같은 출발선에서 근접 연타를 연구하는 소규모 분기입니다.', attack: 1.03, magic: 1, hp: 1, defense: 1.01, resist: 1, crit: .01, tier: 1, level: 10, requires: { str: 10, dex: 10 }, mastery: 0, role: '근접 입문', tree: 'physical', penalties: { accuracy: -.02 } },
    { id: 'currentScholar', name: '해류 연구자', title: '파도의 문장을 읽는다', desc: '조류 술사보다 공격력은 낮지만 마나와 약화 주문 조합을 실험하는 입문 직업입니다.', attack: 1, magic: 1.03, hp: 1, defense: 1, resist: 1.02, crit: 0, tier: 1, level: 10, requires: { int: 10, wis: 10 }, mastery: 0, role: '주문 입문', tree: 'magic', penalties: { attack: -2 } },
    { id: 'seagrassKeeper', name: '해초 돌봄꾼', title: '작은 회복을 반복한다', desc: '강한 탱커 대신 낮은 비용 회복과 지속전을 선택하는 보조 입문 직업입니다.', attack: 1, magic: 1, hp: 1.04, defense: 1.02, resist: 1.02, crit: 0, tier: 1, level: 10, requires: { vit: 10, wis: 10 }, mastery: 0, role: '보조 입문', tree: 'defense', penalties: { accuracy: -.02 } },
    { id: 'squidJester', name: '오징어 광대', title: '웃음 뒤에 먹물을 숨긴다', desc: '정확한 한 방 대신 낮은 방어와 불안정한 명중을 감수하고 확률·치명 조합을 노립니다.', attack: 1.02, magic: 1.02, hp: .98, defense: .98, resist: 1, crit: .03, tier: 1, level: 10, requires: { dex: 10, luk: 10 }, mastery: 0, role: '확률 입문', tree: 'support', penalties: { accuracy: -.03 } },
    { id: 'reefBrawler', name: '암초 격투가', title: '부딪힐수록 단단해진다', desc: '체력 비례 챔질과 흡혈을 섞는 근접형. 물리 공격은 과하지 않지만 장기전에 강합니다.', attack: 1.12, magic: 1, hp: 1.08, defense: 1.08, resist: 1, crit: .02, tier: 2, level: 25, parent: 'harpoon', requires: { str: 25, vit: 20 }, mastery: 75, role: 'HP·흡혈', tree: 'physical', penalties: { accuracy: -.03 } },
    { id: 'lineBreaker', name: '쇄도 돌파자', title: '낚싯줄의 약한 곳을 찾는다', desc: '방어 관통과 약화로 강한 적을 먼저 무너뜨리는 정석형 분기입니다.', attack: 1.1, magic: 1, hp: 1.02, defense: 1.05, resist: 1, crit: .02, tier: 2, level: 25, parent: 'tidalBrawler', requires: { str: 28, dex: 24 }, mastery: 75, role: '관통·약화', tree: 'physical', penalties: { accuracy: -.03 } },
    { id: 'krakenSlayer', name: '크라켄 처형자', title: '거대한 심장을 꿰뚫는다', desc: '높은 체력의 적에게만 진짜 힘을 내는 3차 직업. 명중과 마나 페널티가 큽니다.', attack: 1.52, magic: 1, hp: 1.15, defense: 1.05, resist: 1, crit: .12, tier: 3, level: 40, parent: 'whaler', requires: { str: 50, dex: 35 }, mastery: 150, role: '처형·출혈', tree: 'physical', penalties: { accuracy: -.04, mana: -5 } },
    { id: 'needleDancer', name: '침끝 무희', title: '한 걸음마다 약점을 남긴다', desc: '낮은 방어를 회피·치명·출혈로 보완하는 고속 3차 직업입니다.', attack: 1.28, magic: 1, hp: .96, defense: .94, resist: .98, crit: .25, tier: 3, level: 40, parent: 'corsair', requires: { dex: 50, luk: 38 }, mastery: 150, role: '회피·치명', tree: 'physical', penalties: { defense: -3 } },
    { id: 'runeSwell', name: '문양 파도술사', title: '룬을 물결에 새긴다', desc: '마법 공격과 약화 확률을 균형 있게 끌어올리는 주문 분기입니다.', attack: 1, magic: 1.15, hp: 1.02, defense: 1, resist: 1.08, crit: .02, tier: 2, level: 25, parent: 'tide', requires: { int: 25, wis: 25 }, mastery: 75, role: '약화·마나', tree: 'magic', penalties: { attack: -3 } },
    { id: 'saltAlchemist', name: '염수 연금술사', title: '소금으로 상처를 굳힌다', desc: '마법 출혈과 관통을 조합하지만 명중이 낮고 체력이 약한 실험형입니다.', attack: 1, magic: 1.1, hp: .95, defense: 1, resist: 1.05, crit: .05, tier: 2, level: 25, parent: 'currentScholar', requires: { int: 28, luk: 22 }, mastery: 75, role: '출혈·관통', tree: 'magic', penalties: { accuracy: -.03 } },
    { id: 'stormScribe', name: '폭풍 필경사', title: '번개를 문장으로 봉인한다', desc: '한 번의 주문에 모든 마나를 태우는 고점형 3차 직업입니다.', attack: 1, magic: 1.48, hp: .95, defense: 1, resist: 1.1, crit: .08, tier: 3, level: 40, parent: 'tempest', requires: { int: 50, wis: 34 }, mastery: 150, role: '마나·폭발', tree: 'magic', penalties: { mana: -8 } },
    { id: 'lunarOracle', name: '월광 예언자', title: '달의 조수로 미래를 고친다', desc: '높은 회복력과 저항을 얻지만 물리 공격에 약한 유지형 3차 직업입니다.', attack: 1, magic: 1.3, hp: 1.18, defense: 1, resist: 1.4, crit: 0, tier: 3, level: 40, parent: 'oracle', requires: { wis: 50, vit: 35 }, mastery: 150, role: '회복·저항', tree: 'magic', penalties: { attack: -4 } },
    { id: 'reefMedic', name: '암초 의무관', title: '상처를 산호로 꿰맨다', desc: '작은 회복을 자주 발동해 자동 전투의 안정성을 높이는 보조 분기입니다.', attack: .97, magic: 1.02, hp: 1.16, defense: 1.12, resist: 1.12, crit: 0, tier: 2, level: 25, parent: 'seagrassKeeper', requires: { vit: 28, wis: 22 }, mastery: 75, role: '회복·흡혈', tree: 'defense', penalties: { attack: -3 } },
    { id: 'bellTurtle', name: '종거북 수호자', title: '울림으로 적의 박자를 끊는다', desc: '속도를 포기하고 방어와 기절을 챙기는 느린 제어형입니다.', attack: .97, magic: 1, hp: 1.25, defense: 1.2, resist: 1.04, crit: .01, tier: 2, level: 25, parent: 'warden', requires: { vit: 34, luk: 20 }, mastery: 75, role: '기절·방어', tree: 'defense', penalties: { speed: -6 } },
    { id: 'coralSaint', name: '산호 성인', title: '스스로 빛나는 방벽', desc: '액티브 없이 두 패시브만으로 파티 없는 자동 전투를 버티는 순수 보조형 3차 직업입니다.', attack: .94, magic: 1.08, hp: 1.35, defense: 1.22, resist: 1.35, crit: 0, tier: 3, level: 40, parent: 'oracle', requires: { vit: 50, wis: 38 }, mastery: 150, role: '패시브·유지', tree: 'defense', lineage: 'warden', penalties: { attack: -6 } },
    { id: 'brineThorn', name: '염수 가시성채', title: '다가오는 자를 꿰뚫는다', desc: '높은 생명력과 방어를 얻는 대신 마나와 명중을 포기하는 반격형 3차 직업입니다.', attack: 1.05, magic: 1, hp: 1.48, defense: 1.55, resist: 1.15, crit: .02, tier: 3, level: 40, parent: 'bulwark', requires: { vit: 52, str: 38 }, mastery: 150, role: '반격·성채', tree: 'defense', penalties: { mana: -12, accuracy: -.04 } },
    { id: 'clockworkAngler', name: '태엽 낚시꾼', title: '한 턴을 미리 감는다', desc: '속도·명중·HP·MP 비례를 섞어 어느 편성에도 들어가는 복합 분기입니다.', attack: 1.06, magic: 1.06, hp: 1.02, defense: .98, resist: 1, crit: .02, tier: 2, level: 25, parent: 'wanderer', requires: { dex: 28, int: 22 }, mastery: 75, role: '속도·복합', tree: 'hybrid', penalties: { hp: -18 } },
    { id: 'gambler', name: '심해 도박사', title: '확률을 이기는 대신 대가를 건다', desc: '치명 피해와 골드가 오르지만 명중·방어·체력이 함께 흔들리는 고위험 직업입니다.', attack: 1.02, magic: 1.02, hp: .92, defense: .96, resist: 1, crit: .1, tier: 2, level: 25, parent: 'squidJester', requires: { luk: 36, dex: 28 }, mastery: 75, role: '치명·경제', tree: 'support', penalties: { accuracy: -.04, defense: -2 } },
    { id: 'bloodTide', name: '혈조의 군주', title: '피를 조류로 바꾼다', desc: 'HP 비례 피해와 흡혈이 동시에 성장하는 대기만성형 3차 직업입니다.', attack: 1.35, magic: .9, hp: 1.45, defense: 1.1, resist: .96, crit: .1, tier: 3, level: 40, parent: 'chimera', requires: { str: 45, vit: 35 }, mastery: 150, role: 'HP·흡혈', tree: 'hybrid', penalties: { mana: -10, resist: -4 } },
    { id: 'manaLeviathan', name: '마나 레비아탄', title: '바다 전체를 주문으로 삼킨다', desc: 'MP 비례 주문을 극단까지 밀어붙이는 환생 후 3차 히든 직업입니다.', attack: .92, magic: 1.55, hp: .95, defense: .97, resist: 1.3, crit: .12, tier: 3, level: 40, parent: 'voidcaller', requires: { int: 50, wis: 38 }, mastery: 150, role: 'MP·히든', tree: 'mystery', lineage: 'voidcaller', penalties: { attack: -8, defense: -3 }, hidden: true, rebirth: 2 },
    { id: 'soulHarvester', name: '영혼 수확자', title: '쓰러진 적의 파도를 거둔다', desc: '망인 계열의 페널티를 치명타와 흡혈로 뒤집는 히든 3차 직업입니다.', attack: 1.35, magic: .92, hp: .98, defense: 1.15, resist: .95, crit: .18, tier: 3, level: 40, parent: 'skeleton', requires: { str: 44, luk: 38 }, mastery: 150, role: '치명·영혼', tree: 'mystery', penalties: { resist: -5 }, hidden: true },
    { id: 'netWeaver', name: '그물 직조가', title: '잡은 물고기를 놓치지 않는다', desc: '상위 전직 없이 수집과 안정성을 택하는 독립 1차 직업입니다.', attack: 1.02, magic: 1, hp: 1.02, defense: 1, resist: 1, crit: .01, tier: 1, level: 10, requires: { dex: 10, luk: 10 }, mastery: 0, role: '독립·수집', tree: 'physical', penalties: { speed: -3 }, branchless: true },
    { id: 'fishWhisperer', name: '물고기 속삭임꾼', title: '물결의 의지를 듣는다', desc: '상위 전직 없이 낮은 비용 주문과 마나 회전을 연구하는 독립 1차 직업입니다.', attack: 1, magic: 1.02, hp: 1, defense: 1, resist: 1.02, crit: 0, tier: 1, level: 10, requires: { int: 10, wis: 10 }, mastery: 0, role: '독립·순환', tree: 'magic', penalties: { mana: -3 }, branchless: true },
    { id: 'driftwoodHermit', name: '유목 은둔자', title: '혼자서도 버티는 법', desc: '상위 전직 없이 체력과 저항을 차곡차곡 쌓는 독립 1차 직업입니다.', attack: .98, magic: 1, hp: 1.02, defense: 1.02, resist: 1.03, crit: 0, tier: 1, level: 10, requires: { vit: 10, wis: 10 }, mastery: 0, role: '독립·생존', tree: 'defense', penalties: { attack: -2 }, branchless: true },
    { id: 'relicScavenger', name: '난파선 수집가', title: '부서진 것에서 가치를 찾는다', desc: '상위 전직 없이 골드와 명중을 챙기는 독립 1차 직업입니다. 장비 파밍용 편성의 출발점입니다.', attack: 1.01, magic: 1.01, hp: .98, defense: .98, resist: 1, crit: .02, tier: 1, level: 10, requires: { dex: 10, luk: 12 }, mastery: 0, role: '독립·파밍', tree: 'support', penalties: { defense: -2 }, branchless: true },
    { id: 'tideSurveyor', name: '해류 측량사', title: '더 나은 항로를 고르는 자', desc: '전투 보정은 거의 없지만 희귀어와 장비가 많은 항로를 읽는 독립 1차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { dex: 12, luk: 12 }, mastery: 0, role: '독립·드롭', tree: 'magic', penalties: { attack: -2, magic: -2 }, branchless: true },
    { id: 'salvageMerchant', name: '인양 상인', title: '전리품을 항해 자금으로 바꾼다', desc: '전투력 대신 포획·던전 골드를 극대화하는 독립 1차 직업입니다.', attack: .98, magic: .98, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { luk: 14, dex: 10 }, mastery: 0, role: '독립·골드', tree: 'support', penalties: { defense: -2 }, branchless: true },
    { id: 'pearlBroker', name: '진주 중개인', title: '윤회의 값을 협상한다', desc: '물고기 속삭임을 숙달한 뒤 환생 보상을 늘리는 경제형 2차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 2, level: 25, parent: 'fishWhisperer', requires: { int: 25, luk: 25 }, mastery: 75, role: '환생·경제', tree: 'magic', penalties: { attack: -4, magic: -4 } },
    { id: 'rareTracker', name: '희귀어 추적자', title: '한 번뿐인 흔적을 놓치지 않는다', desc: '난파선 감식을 완성한 2차 파밍 직업입니다. 전리품 감지로 장비 드롭과 골드 보상을 늘립니다.', attack: .98, magic: .98, hp: .98, defense: 1, resist: 1, crit: .01, tier: 2, level: 25, parent: 'relicScavenger', requires: { dex: 28, luk: 28 }, mastery: 75, role: '희귀·파밍', tree: 'support', penalties: { defense: -3 } },
    { id: 'stormEel', name: '폭풍 곰치 혈족', title: '몬스터의 전류를 배운 자', desc: '곰치의 전기 이빨을 물어뜯는 물리 기술로 계승하는 몬스터 계열 2차 직업입니다. 감속과 속도 패시브로 선공을 잡습니다.', attack: 1.22, magic: 1, hp: 1.05, defense: 1, resist: 1.04, crit: .04, tier: 2, level: 25, parent: 'tidalBrawler', requires: { str: 28, dex: 22 }, mastery: 75, role: '몬스터·물리 감속', tree: 'physical', penalties: { accuracy: -.02 } },
    { id: 'abyssArchivist', name: '심연 기록관', title: '다음 생의 장부를 보관한다', desc: '진주 장부를 끝까지 숙련해 환생과 던전 경제를 함께 키우는 후반 비전투 직업입니다.', attack: .9, magic: .95, hp: .98, defense: .95, resist: 1.02, crit: 0, tier: 3, level: 40, parent: 'pearlBroker', requires: { int: 45, wis: 35, luk: 30 }, mastery: 150, role: '환생·기록', tree: 'magic', penalties: { attack: -8, magic: -6, accuracy: -.04 }, hidden: true, rebirth: 1 },
    { id: 'krakenkin', name: '크라켄 혈족', title: '보스의 촉수를 의지로 묶는다', desc: '폭풍 곰치의 계승을 마친 뒤 보스의 다중 공격을 사용할 수 있는 몬스터 계열 물리 3차 직업입니다.', attack: 1.42, magic: 1, hp: 1.15, defense: 1.02, resist: 1, crit: .08, tier: 3, level: 40, parent: 'stormEel', requires: { str: 38, dex: 30 }, mastery: 150, role: '몬스터·추가타', tree: 'mystery', lineage: 'krakenkin', penalties: { accuracy: -.04 }, hidden: true, rebirth: 1 },
);

// 한 직업의 기본 기술은 1~2개에 집중합니다. 성장 경로를 공유하더라도
// 다른 직업의 기술은 자동 지급하지 않으므로 계승을 위한 순회가 필요합니다.
JOBS.push(
    { id: 'oathAngler', name: '맹세의 낚시꾼', title: '오래 버틴 결의', desc: '직접 공격기 없이 심연의 결의 하나를 연마합니다. 물리 공격을 보강할 다음 편성을 준비하는 독립 직업입니다.', attack: 1.02, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { str: 12, wis: 10 }, mastery: 0, role: '독립·공격 패시브', tree: 'physical', branchless: true, penalties: { mana: -4 }, masteryTarget: 1200, masteryBoost: .1 },
    { id: 'stormHunter', name: '폭풍 추격자', title: '긴 틈을 한 방으로', desc: '폭풍 사냥만 집중해서 익힙니다. 긴 재사용 대기와 낮은 발동률을 감수한 폭발형 분기입니다.', attack: 1.1, magic: 1, hp: .98, defense: 1, resist: 1, crit: .02, tier: 2, level: 25, parent: 'harpoon', requires: { str: 28, dex: 22 }, mastery: 400, requiresSkillMastery: { pierce: 2 }, role: '단일·폭발', tree: 'physical', penalties: { accuracy: -.03 }, masteryTarget: 4000, masteryBoost: .18 },
    { id: 'tideMender', name: '생명의 조율사', title: '밀려오는 회복의 때', desc: '생명의 조류를 가져온 회복형 주문사. 공격 주문과 회복 주문을 어느 순서로 섞을지 선택합니다.', attack: .98, magic: 1.05, hp: 1.06, defense: 1, resist: 1.06, crit: 0, tier: 2, level: 25, parent: 'tide', requires: { int: 24, wis: 28 }, mastery: 400, requiresSkillMastery: { wave: 1 }, role: '회복·주문', tree: 'magic', penalties: { attack: -3 }, masteryTarget: 4000, masteryBoost: .18 },
    { id: 'scaleKnight', name: '비늘 견습기사', title: '가장 작은 방벽', desc: '비늘 갑옷 하나로 물리 방어를 익힙니다. 화려한 공격 대신 방어 패시브의 계승을 준비합니다.', attack: 1, magic: .98, hp: 1, defense: 1.03, resist: 1, crit: 0, tier: 1, level: 10, requires: { vit: 12, str: 10 }, mastery: 0, role: '독립·물리 방어', tree: 'defense', branchless: true, penalties: { speed: -2 }, masteryTarget: 800, masteryBoost: .08 },
    { id: 'lifeTender', name: '해양 생명지기', title: '작은 생명을 품는다', desc: '바다의 생명력 하나를 익히는 독립 직업. 체력 비례 공격과 조합할 기반을 만듭니다.', attack: .98, magic: 1, hp: 1.03, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { vit: 14, wis: 10 }, mastery: 0, role: '독립·최대 체력', tree: 'defense', branchless: true, penalties: { mana: -4 }, masteryTarget: 1400, masteryBoost: .12 },
    { id: 'coralBuilder', name: '산호 축성가', title: '파도 앞에 성을 세운다', desc: '산호의 의지를 전담하는 회복형 방어 직업. 방어 수치와 회복 발동을 따로 조합할 수 있습니다.', attack: .98, magic: 1, hp: 1.1, defense: 1.08, resist: 1.02, crit: 0, tier: 2, level: 25, parent: 'warden', requires: { vit: 28, wis: 22 }, mastery: 450, requiresSkillMastery: { anchor: 1 }, role: '회복·장기전', tree: 'defense', penalties: { speed: -3 }, masteryTarget: 4500, masteryBoost: .2 },
    { id: 'barbSkirmisher', name: '미늘 척후병', title: '상처를 남기고 물러난다', desc: '갈고리 상처로 출혈을 남기는 독립 직업. 확률형 공격과 지속 피해를 엮습니다.', attack: 1.02, magic: 1, hp: .98, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { str: 10, dex: 12 }, mastery: 0, role: '독립·출혈', tree: 'physical', branchless: true, penalties: { defense: -2 }, masteryTarget: 1200, masteryBoost: .1 },
    { id: 'wakeRunner', name: '물결 달림꾼', title: '파도보다 한 걸음 먼저', desc: '질주하는 물결로 가속을 얻습니다. 낮은 위력 대신 다음 라운드의 선공을 준비합니다.', attack: 1, magic: 1, hp: .98, defense: 1, resist: 1, crit: .01, tier: 1, level: 10, requires: { dex: 14 }, mastery: 0, role: '독립·가속', tree: 'physical', branchless: true, penalties: { defense: -2 }, masteryTarget: 1500, masteryBoost: .1 },
    { id: 'bubbleMage', name: '포말 마도사', title: '한 방울의 마법', desc: '해류 탄환 하나를 연마하는 기초 마법 직업. 낮은 비용의 주문을 다른 직업에 넘깁니다.', attack: .98, magic: 1.03, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { int: 12, wis: 10 }, mastery: 0, role: '독립·기초 주문', tree: 'magic', branchless: true, penalties: { attack: -2 }, masteryTarget: 1000, masteryBoost: .08 },
    { id: 'stillwaterBinder', name: '정수 봉인사', title: '움직이지 않는 수면', desc: '침묵의 조류와 끌어내리는 저류를 전담합니다. 액티브 차단과 선공 제어를 선택하는 방해형 직업입니다.', attack: 1, magic: 1.02, hp: .98, defense: 1, resist: 1.02, crit: 0, tier: 1, level: 10, requires: { int: 12, wis: 12 }, mastery: 0, role: '침묵·감속', tree: 'magic', penalties: { mana: -4 }, masteryTarget: 2200, masteryBoost: .12 },
    { id: 'manaScribe', name: '마나 서기관', title: '흐름을 잊지 않는 기록', desc: '조류 통찰과 마나 순환을 익히는 패시브 전용 직업. 다른 직업의 공격 주문을 받쳐 줄 기반을 만듭니다.', attack: .98, magic: 1.02, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { int: 10, wis: 14 }, mastery: 0, role: '독립·마나 패시브', tree: 'magic', branchless: true, penalties: { attack: -2 }, masteryTarget: 1800, masteryBoost: .1 },
    { id: 'twinAngler', name: '쌍줄 낚시꾼', title: '한 번의 챔질, 두 번의 상처', desc: '쌍갈고리의 추가타를 전담합니다. 큰 단일타와 짧은 연타 사이에서 빌드 방향을 고릅니다.', attack: 1.08, magic: 1, hp: 1, defense: .98, resist: 1, crit: .02, tier: 2, level: 25, parent: 'tidalBrawler', requires: { str: 22, dex: 28 }, mastery: 450, requiresSkillMastery: { wakeFist: 2 }, role: '추가타·연속 공격', tree: 'physical', penalties: { accuracy: -.02 }, masteryTarget: 5500, masteryBoost: .2 },
    { id: 'eternalNavigator', name: '영겁의 항로술사', title: '세 번째 삶에 만난 해류', desc: '환생으로 영원의 해류에 도달하는 상위 직업. 긴 숙련을 거쳐 강한 주문을 계승합니다.', attack: .94, magic: 1.3, hp: 1, defense: .98, resist: 1.15, crit: .04, tier: 3, level: 40, rebirth: 3, parent: 'tempest', requires: { int: 45, wis: 40 }, mastery: 3000, requiresSkillMastery: { maelstrom: 3 }, role: '환생·상위 주문', tree: 'magic', hidden: true, penalties: { mana: -8 }, masteryTarget: 60000, masteryBoost: .36 },
    { id: 'memoryMerchant', name: '기억의 환전상', title: '지난 생의 금빛 장부', desc: '황금의 기억을 보관하는 경제형 분기. 직접 전투보다 장기 포획 보상에 투자합니다.', attack: .98, magic: .98, hp: 1, defense: 1, resist: 1, crit: 0, tier: 2, level: 25, rebirth: 1, parent: 'salvageMerchant', requires: { luk: 28, wis: 22 }, mastery: 600, requiresSkillMastery: { salvageContract: 2 }, role: '환생·골드', tree: 'support', penalties: { defense: -3 }, masteryTarget: 10000, masteryBoost: .22 },
    { id: 'rebirthFisher', name: '윤회의 뱃사공', title: '다시 던지는 첫 낚싯줄', desc: '윤회의 챔질을 배우는 환생 전용 독립 직업. 회복을 동반하는 공격기를 다음 삶의 편성에 남깁니다.', attack: 1.02, magic: 1, hp: 1.02, defense: 1, resist: .98, crit: 0, tier: 1, level: 10, rebirth: 1, requires: { str: 10, wis: 12 }, mastery: 0, role: '독립·환생 흡혈', tree: 'mystery', branchless: true, penalties: { mana: -3 }, masteryTarget: 6000, masteryBoost: .15 },
);

// 경험치·조건부 숙련·보스 기술을 분리한 탐구 계열입니다.
JOBS.push(
    { id: 'voyageScribe', name: '항해 수습기록사', title: '한 번의 포획도 기록으로', desc: '전투력을 조금 포기하고 경험치를 더 얻습니다. 항해 복기를 계승해 다음 직업의 성장에 보탬이 됩니다.', attack: .98, magic: .98, hp: 1, defense: 1, resist: 1, crit: 0, expBonus: .03, tier: 1, level: 10, requires: { int: 12, wis: 12 }, mastery: 0, role: '경험치·기록', tree: 'support', masteryTarget: 3000, masteryBoost: .1 },
    { id: 'chronicleNavigator', name: '항로 연대기술사', title: '여러 항해를 한 권에', desc: '항해 기록을 쌓아 경험치 획득을 높이는 상위 기록사. 빠른 레벨업과 전투용 AP 사이에서 균형을 고릅니다.', attack: .96, magic: .98, hp: 1, defense: .98, resist: 1.02, crit: 0, expBonus: .06, tier: 2, level: 25, parent: 'voyageScribe', requires: { int: 26, wis: 28 }, mastery: 1200, requiresSkillMastery: { voyageReview: 2 }, role: '경험치·장기 성장', tree: 'support', masteryTarget: 18000, masteryBoost: .2 },
    { id: 'bossNaturalist', name: '거수 생태학자', title: '거대한 적이 남긴 배움', desc: '보스 승리에서 직업과 장착 스킬의 숙련도를 더 얻습니다. 일반 어종에는 보너스가 없으며 전투 보정도 받지 않습니다.', attack: .98, magic: .98, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { wis: 12, vit: 12 }, mastery: 0, role: '보스·숙련', tree: 'support', masteryTarget: 6000, masteryBoost: .12 },
    { id: 'speciesChronicler', name: '어종 문양학자', title: '같은 흔적을 깊게 읽는다', desc: '뱀장어·곰치 계열의 지정 어종을 연구합니다. 지정 어종 승리에서만 숙련도를 크게 얻습니다.', attack: 1, magic: 1.02, hp: .98, defense: 1, resist: 1, crit: 0, tier: 2, level: 25, parent: 'bossNaturalist', requires: { int: 25, wis: 28 }, mastery: 1000, requiresSkillMastery: { titanFieldNotes: 1 }, role: '지정 어종·숙련', tree: 'support', masteryTarget: 24000, masteryBoost: .2 },
    { id: 'echoTamer', name: '메아리 조련사', title: '포효를 말로 바꾸는 자', desc: '메아리 조련사 숙련도 6,000에서 보스의 무음의 포효를 해금합니다. 그전에는 메아리 복기와 계승 기술로 수련합니다.', attack: .96, magic: 1.06, hp: .98, defense: 1, resist: 1.04, crit: 0, tier: 2, level: 25, parent: 'fishWhisperer', requires: { int: 28, wis: 28 }, mastery: 1200, requiresSkillMastery: { fishWhisper: 1 }, role: '보스 기술·침묵', tree: 'magic', masteryTarget: 30000, masteryBoost: .24 },
    { id: 'abyssMimic', name: '심연 모사체', title: '심연의 몸짓을 내 것으로', desc: '심연 모사체 숙련도 20,000에서 보스의 촉수 난무를 해금합니다. 심연 보스의 행동을 오랫동안 관찰하는 대기만성 직업입니다.', attack: 1.12, magic: 1.06, hp: 1.08, defense: .96, resist: 1.06, crit: .02, tier: 3, level: 40, rebirth: 1, parent: 'echoTamer', requires: { str: 35, int: 35, wis: 30 }, mastery: 12000, requiresSkillMastery: { sovereignSilence: 2 }, role: '보스 기술·추가타', tree: 'magic', hidden: true, penalties: { accuracy: -.03 }, masteryTarget: 100000, masteryBoost: .38 },
);

// 이형 항해자 계열 상위직: 여섯 능력치를 고르게 배분할수록 강해지는 복합 피해 직업. 수치는 검증 초안입니다.
JOBS.push(
    { id: 'allRounder', name: '만능 항해사', title: '여섯 물결을 고르게 다루는 자', desc: '직접 배분한 여섯 능력치가 고를수록 강해지는 복합 피해 직업. 순간 화력 대신 균형 잡힌 생존력과 안정적인 물리·마법 복합 피해로 싸웁니다.', attack: 1.05, magic: 1.05, hp: 1.4, defense: 1.45, resist: 1.45, crit: .03, tier: 2, level: 40, parent: 'wanderer', requires: {}, requiresAllocated: { str: 15, dex: 15, int: 15, vit: 15, wis: 15, luk: 15 }, mastery: 2400, role: '올스탯·복합', tree: 'hybrid' },
);

// v21 직업 확장: 계열별 5차 최상위 직업과 능력치 패시브 직업. 자세한 설계는 expansion.ts.
JOBS.push(...(EXPANSION_JOBS as Job[]));

// v21 회복 직업: 체력이 충분할 때 쓴 회복 기술도 피해가 줄지 않습니다.
for (const id of ['oracle', 'lunarOracle', 'coralSaint', 'seagrassKeeper', 'reefMedic', 'tideMender', 'coralBuilder', 'lifeTender']) JOBS.find(j => j.id === id)!.healer = true;

// 특정 스킬/직업을 마스터해야만 열리는 교차 전직 조건입니다.
// 값은 스킬 숙련 단계(1~4) 또는 직업 숙련 승수로 작성합니다.
const advancedRequirements: Record<string, Pick<Job, 'requiresSkillMastery' | 'requiresJobMastery'>> = {
    reefBrawler: { requiresSkillMastery: { wakeFist: 3 } },
    lineBreaker: { requiresSkillMastery: { wakeFist: 3 } },
    krakenSlayer: { requiresSkillMastery: { whaleStrike: 4 }, requiresJobMastery: { harpoon: 150 } },
    needleDancer: { requiresSkillMastery: { razor: 4 }, requiresJobMastery: { corsair: 150 } },
    runeSwell: { requiresSkillMastery: { wave: 3 } },
    saltAlchemist: { requiresSkillMastery: { rippleGlyph: 3 } },
    stormScribe: { requiresSkillMastery: { maelstrom: 4 }, requiresJobMastery: { tempest: 150 } },
    lunarOracle: { requiresSkillMastery: { pearlPrayer: 3 }, requiresJobMastery: { oracle: 150 } },
    reefMedic: { requiresSkillMastery: { greenTide: 3 } },
    bellTurtle: { requiresSkillMastery: { anchor: 3 } },
    coralSaint: { requiresSkillMastery: { soulTide: 4 }, requiresJobMastery: { warden: 150 } },
    brineThorn: { requiresSkillMastery: { ironWill: 4 } },
    clockworkAngler: { requiresSkillMastery: { precision: 3 } },
    gambler: { requiresSkillMastery: { inkTrick: 3 } },
    bloodTide: { requiresSkillMastery: { vitalSurge: 4 }, requiresJobMastery: { wanderer: 150 } },
    manaLeviathan: { requiresSkillMastery: { voidLance: 4 }, requiresJobMastery: { tide: 150 } },
    soulHarvester: { requiresSkillMastery: { marrowGuard: 4, boneLegacy: 3 }, requiresJobMastery: { undead: 150 } },
    pearlBroker: { requiresSkillMastery: { fishWhisper: 3 }, requiresJobMastery: { fishWhisperer: 75 } },
    rareTracker: { requiresSkillMastery: { salvageSense: 3 }, requiresJobMastery: { relicScavenger: 75 } },
    stormEel: { requiresSkillMastery: { wakeFist: 2 } },
    abyssArchivist: { requiresSkillMastery: { pearlLedger: 4 }, requiresJobMastery: { pearlBroker: 150 } },
    krakenkin: { requiresSkillMastery: { electricBite: 4 }, requiresJobMastery: { stormEel: 150 } },
};
for (const job of JOBS)
    Object.assign(job, advancedRequirements[job.id] || {});

/**
 * Job mastery is intentionally not a single 150-win switch.  The target and
 * the reward are part of the job data so a late/hidden vocation can feel like
 * a long-term discovery without changing the save format or combat engine.
 *
 * The values below are a tuning table, not magic numbers in the UI.  Adjust a
 * single entry when a job needs a shorter or longer runway during testing.
 */
const JOB_MASTERY_TUNING: Record<string, { target: number; boost: number }> = {
    fisher: { target: 150, boost: 0 },
    harpoon: { target: 180, boost: .06 }, tide: { target: 180, boost: .06 }, warden: { target: 180, boost: .06 }, wanderer: { target: 1200, boost: .1 },
    tidalBrawler: { target: 260, boost: .07 }, currentScholar: { target: 260, boost: .07 }, seagrassKeeper: { target: 300, boost: .08 }, squidJester: { target: 420, boost: .09 },
    undead: { target: 2400, boost: .16 }, netWeaver: { target: 800, boost: .12 }, fishWhisperer: { target: 900, boost: .12 }, driftwoodHermit: { target: 850, boost: .12 }, relicScavenger: { target: 1200, boost: .14 }, tideSurveyor: { target: 1500, boost: .16 }, salvageMerchant: { target: 1700, boost: .17 },
    whaler: { target: 1200, boost: .14 }, corsair: { target: 1200, boost: .14 }, tempest: { target: 1400, boost: .16 }, oracle: { target: 1500, boost: .17 }, bulwark: { target: 1600, boost: .17 }, paladin: { target: 1800, boost: .18 },
    chimera: { target: 6500, boost: .24 }, voidcaller: { target: 12000, boost: .28 }, skeleton: { target: 9000, boost: .26 }, bonecaster: { target: 10000, boost: .28 },
    reefBrawler: { target: 2400, boost: .18 }, lineBreaker: { target: 2800, boost: .19 }, runeSwell: { target: 2800, boost: .19 }, saltAlchemist: { target: 3300, boost: .2 }, reefMedic: { target: 3200, boost: .2 }, bellTurtle: { target: 3600, boost: .21 }, clockworkAngler: { target: 5200, boost: .23 }, gambler: { target: 9000, boost: .27 }, pearlBroker: { target: 8000, boost: .26 }, rareTracker: { target: 8500, boost: .27 }, stormEel: { target: 7000, boost: .25 },
    krakenSlayer: { target: 9000, boost: .3 }, needleDancer: { target: 8500, boost: .29 }, stormScribe: { target: 11000, boost: .32 }, lunarOracle: { target: 10000, boost: .3 }, coralSaint: { target: 12000, boost: .33 }, brineThorn: { target: 13000, boost: .34 }, bloodTide: { target: 45000, boost: .38 }, manaLeviathan: { target: 90000, boost: .4 }, soulHarvester: { target: 70000, boost: .4 }, abyssArchivist: { target: 100000, boost: .42 }, krakenkin: { target: 100000, boost: .42 },
};
for (const job of JOBS) {
    const tuning = JOB_MASTERY_TUNING[job.id] || { target: job.tier >= 3 ? 12000 : job.tier === 2 ? 3000 : 300, boost: job.tier >= 3 ? .3 : job.tier === 2 ? .18 : .08 };
    job.masteryTarget ??= tuning.target;
    job.masteryBoost ??= tuning.boost;
}

/** 히든·??? 문 직업의 힌트. 이름·조건을 숨긴 실루엣 카드에 한 줄로 보입니다. */
const JOB_HINTS: Record<string, string> = {
    voidcaller: '한 번의 윤회를 넘긴 이형 항해자에게 윤회의 문이 속삭입니다.',
    undead: '새벽의 고요 속에서만 문이 열립니다.',
    skeleton: '망인의 뼈가 단단해질 때 드러납니다.',
    bonecaster: '망인의 뼈에 마나를 새길 때 드러납니다.',
    manaLeviathan: '공허와 조류를 모두 익히고 두 번의 윤회를 건넌 자에게.',
    soulHarvester: '해골 기사와 망인의 기억이 깊이 쌓일 때.',
    abyssArchivist: '진주 장부를 끝까지 적은 중개인에게 열립니다.',
    krakenkin: '폭풍 곰치의 피가 짙어진 날, 방문자가 찾아옵니다.',
    eternalNavigator: '세 번의 윤회와 폭풍을 모두 건넌 술사에게.',
    rebirthFisher: '환생 뒤, 윤회의 문이 이 이름을 부를 때.',
    abyssMimic: '메아리를 오래 길들인 자에게 보스의 그림자가 닿습니다.',
};
for (const job of JOBS) job.hint ??= JOB_HINTS[job.id];

/** 직업 계보. 계열(tree) 안에서 한 루트 직업과 그 후속 직업을 묶습니다. 계열마다 상위·하위가 없는 1차 직업은 '독립 수련'으로 모읍니다. */
export type Lineage = { id: string; name: string; tree: JobTreeId; summary: string };
const independent = (tree: JobTreeId): Lineage => ({ id: `${tree}-independent`, name: '독립 수련', tree, summary: '상위·하위 직업 없이 1차로 완결되는 직업들입니다. 다른 계보의 기술을 계승해 빈틈을 채우기 좋습니다.' });
export const LINEAGES: Lineage[] = [
    { id: 'harpoon', name: '작살 사냥꾼 계보', tree: 'physical', summary: '관통·치명·출혈로 갈라지는 물리 폭발 계보입니다.' },
    { id: 'tidalBrawler', name: '조수 투사 계보', tree: 'physical', summary: '근접 연타와 추가타, 관통·감속을 연구하는 계보입니다.' },
    { id: 'ronin', name: '낭인 계보', tree: 'physical', summary: '검술의 연타·관통·돌격을 거쳐 5차 용사에 이르는 계보입니다.' },
    { id: 'martialArtist', name: '무투가 계보', tree: 'physical', summary: '다단 연타와 기절·감속 제어를 잇는 격투 계보입니다.' },
    independent('physical'),
    { id: 'tide', name: '조류 술사 계보', tree: 'magic', summary: '폭발 주문·회복·약화로 갈라지는 조류 마법 계보입니다.' },
    { id: 'currentScholar', name: '해류 연구자 계보', tree: 'magic', summary: '마나와 약화 주문, 출혈·관통 연금을 실험하는 계보입니다.' },
    { id: 'fishWhisperer', name: '물고기 속삭임꾼 계보', tree: 'magic', summary: '보스 기술 모사와 환생·기록 경제로 이어지는 계보입니다.' },
    { id: 'apprentice', name: '견습 마법사 계보', tree: 'magic', summary: '화염·메테오·연속 주문을 거쳐 5차 대마도사에 이르는 계보입니다.' },
    independent('magic'),
    { id: 'warden', name: '산호 수호자 계보', tree: 'defense', summary: '방어·기절·회복·반격과 복합 흡혈로 갈라지는 수호 계보입니다.' },
    { id: 'seagrassKeeper', name: '해초 돌봄꾼 계보', tree: 'defense', summary: '회복과 흡혈로 편성을 지탱하는 보조 방어 계보입니다.' },
    { id: 'shieldbearer', name: '방패병 계보', tree: 'defense', summary: '반격·약화 탱커를 거쳐 5차 수호신에 이르는 계보입니다.' },
    independent('defense'),
    { id: 'poisoner', name: '독술사 계보', tree: 'status', summary: '중독·역병을 쌓아 5차 파멸의 사도에 이르는 계보입니다.' },
    { id: 'shaman', name: '주술사 계보', tree: 'status', summary: '약화·감속·침묵 저주로 적의 행동을 묶는 계보입니다.' },
    independent('status'),
    { id: 'fisher', name: '견습 낚시꾼', tree: 'hybrid', summary: '모든 항해의 출발점입니다. 공용 기술로 첫 전직을 준비합니다.' },
    { id: 'wanderer', name: '이형 항해자 계보', tree: 'hybrid', summary: '체력·마나·속도·올스탯을 섞어 쓰는 복합 계보입니다.' },
    { id: 'spellbladeNovice', name: '마검 수련생 계보', tree: 'hybrid', summary: '물리와 마법을 함께 싣는 검술로 5차 천검에 이르는 계보입니다.' },
    independent('hybrid'),
    { id: 'squidJester', name: '오징어 광대 계보', tree: 'support', summary: '확률과 치명으로 보상을 불리는 계보입니다.' },
    { id: 'relicScavenger', name: '난파선 수집가 계보', tree: 'support', summary: '장비와 희귀어를 찾아내는 파밍 계보입니다.' },
    { id: 'salvageMerchant', name: '인양 상인 계보', tree: 'support', summary: '골드와 환생 보상을 굴리는 경제 계보입니다.' },
    { id: 'voyageScribe', name: '항해 수습기록사 계보', tree: 'support', summary: '경험치와 장기 성장을 돕는 기록 계보입니다.' },
    { id: 'bossNaturalist', name: '거수 생태학자 계보', tree: 'support', summary: '보스와 지정 어종의 숙련을 빠르게 쌓는 계보입니다.' },
    { id: 'bard', name: '방랑 음유시인 계보', tree: 'support', summary: '가속·경험치·보상으로 성장을 보조하는 계보입니다.' },
    independent('support'),
    { id: 'undead', name: '망인 계보', tree: 'mystery', summary: '불리한 몸을 숙련으로 극복하는 골격·골령 계보입니다.' },
    { id: 'voidcaller', name: '공허의 기록자 계보', tree: 'mystery', summary: '환생 이후에 드러나는 마나 비례 히든 계보입니다.' },
    { id: 'krakenkin', name: '크라켄 혈족', tree: 'mystery', summary: '몬스터의 피를 이은 추가타 직업입니다.' },
    independent('mystery'),
];
/** 직업의 계보 id. lineage가 있으면 그 값, 상위·하위가 없는 1차 직업은 `${tree}-independent`, 그 밖에는 루트 조상 id. */
export function lineageOf(job: Job): string {
    if (job.lineage) return job.lineage;
    if (!job.parent && job.tier === 1 && !JOBS.some(j => j.parent === job.id)) return `${job.tree}-independent`;
    let root = job;
    for (let parent = JOBS.find(j => j.id === root.parent); parent; parent = JOBS.find(j => j.id === root.parent)) root = parent;
    return root.id;
}
/** 직업 성격 태그. tags가 없으면 role을 '·'로 나눕니다. */
export const jobTags = (job: Job) => job.tags ?? job.role.split('·').map(x => x.trim()).filter(Boolean);

/** id로 찾기(첫 항목 우선, JOBS.find와 같은 결과). 모듈 초기화가 끝난 뒤 처음 부를 때 한 번 만듭니다. */
let jobByIdMap: Map<string, Job> | undefined;
export function jobById(id: string | undefined) {
    if (!jobByIdMap) { jobByIdMap = new Map(); for (const x of JOBS) if (!jobByIdMap.has(x.id)) jobByIdMap.set(x.id, x); }
    return id === undefined ? undefined : jobByIdMap.get(id);
}
