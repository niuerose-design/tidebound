import type { Job } from './classes';
import type { Skill } from '../types';

/**
 * v24 계보 완성: 3차(조수 투사는 2차, 일부는 4차)에서 끝나던 계보를 5차까지 잇습니다.
 *
 * - 계보마다 한 갈래(대표 3차)에서 4·5차가 이어집니다. 4차는 환생 1회, 5차는 환생 2회부터입니다.
 * - 4·5차 기술은 피해와 상태이상을 함께 줄 수 있습니다(1~3차는 skill-balance.ts의 분리 규칙).
 * - 환생 비례: 물고기 속삭임꾼 계보의 4·5차 패시브는 환생 1회마다 능력치가 쌓입니다(perRebirth).
 * - 대기만성: 5차 일부가 숙련 10,000 / 100,000 / 500,000의 패시브를 갖습니다. 처음에는 AP가 크고 효과가 작지만,
 *   단계마다 AP가 줄고 보상이 크게 오릅니다.
 * - 직업 배율은 4·5차 공통 범위(v24에서 상승분 ×0.7로 낮춘 값)에 맞췄습니다.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const T3 = { tier: 3, level: 40, mastery: 150, masteryTarget: 9500, masteryBoost: .3 };
const T4 = { tier: 4, level: 55, rebirth: 1, mastery: 300, masteryTarget: 20000, masteryBoost: .32 };
const T5 = { tier: 5, level: 70, rebirth: 2, mastery: 600, masteryTarget: 30000, masteryBoost: .35 };

export const V24_JOBS: NewJob[] = [
    // ── 물리 ──────────────────────────────────────────────
    { id: 'abyssHarpooner', name: '심해 작살왕', title: '해구 끝까지 닿는 작살', desc: '작살 계보의 환생 후 4차 직업입니다. 심연 작살은 방어를 크게 꿰뚫고, 패시브로 관통과 치명 피해를 올립니다.', ...neutral, attack: 1.45, hp: 1.12, crit: .12, ...T4, parent: 'krakenSlayer', requires: { str: 56, dex: 40 }, requiresSkillMastery: { krakenBore: 3 }, role: '물리·관통', tree: 'physical' },
    { id: 'seaPiercer', name: '바다를 꿰는 자', title: '한 번 던지면 바다가 갈라진다', desc: '작살 계보의 5차 직업입니다. 해구 관통은 출혈을 남깁니다. 심연의 인내는 대기만성 패시브라 처음에는 명중이 낮고 4차와 비슷하지만, 수십만 번의 숙련 끝에 진가를 냅니다.', ...neutral, attack: 1.28, hp: 1.06, defense: 1.02, crit: .12, ...T5, parent: 'abyssHarpooner', penalties: { accuracy: -.05 }, requires: { str: 70, dex: 50 }, requiresSkillMastery: { abyssHarpoon: 3 }, role: '물리 최상위·대기만성', tree: 'physical' },
    { id: 'surgeFighter', name: '연파 권사', title: '파도처럼 끊이지 않는다', desc: '조수 투사 계보의 3차 직업입니다. 연파로 세 번 이어 치고, 패시브로 속도와 공격을 올려 연타를 완성합니다.', ...neutral, bonus: { attack: 70, hp: 60 }, crit: .06, ...T3, parent: 'twinAngler', requires: { str: 40, dex: 44 }, requiresSkillMastery: { twinHook: 3 }, role: '물리·연타', tree: 'physical' },
    { id: 'tsunamiBrawler', name: '해일 투신', title: '몸으로 해일을 일으킨다', desc: '조수 투사 계보의 환생 후 4차 직업입니다. 해일 돌진으로 연타를 퍼부으며 상대를 감속시키고, 패시브로 체력과 공격을 올립니다.', ...neutral, attack: 1.42, hp: 1.2, defense: 1.05, crit: .08, ...T4, parent: 'surgeFighter', requires: { str: 54, dex: 52 }, requiresSkillMastery: { surgeCombo: 3 }, role: '물리·연타 제어', tree: 'physical' },
    { id: 'oceanFist', name: '대양권', title: '주먹 하나에 바다가 운다', desc: '조수 투사 계보의 5차 직업입니다. 대양 연권으로 상대를 기절시키고, 패시브로 추가타 위력을 올려 연타의 정점에 섭니다.', ...neutral, attack: 1.52, hp: 1.25, defense: 1.08, crit: .1, ...T5, parent: 'tsunamiBrawler', requires: { str: 68, dex: 62 }, requiresSkillMastery: { tsunamiRush: 3 }, role: '물리 최상위·연타', tree: 'physical' },
    { id: 'tideWarGod', name: '파도 무신', title: '흔들리지 않는 중심', desc: '무투가 계보의 환생 후 4차 직업입니다. 천해장은 상대를 기절시키고 제어된 적을 크게 칩니다. 패시브로 체력과 기절 지속을 올립니다.', ...neutral, attack: 1.42, hp: 1.22, defense: 1.08, crit: .08, ...T4, parent: 'fistKing', requires: { str: 55, dex: 48 }, requiresSkillMastery: { skyBreaker: 3 }, role: '물리·제어 연계', tree: 'physical' },
    { id: 'fistSaint', name: '무극권성', title: '끝이 없는 주먹', desc: '무투가 계보의 5차 직업입니다. 무극권은 상대를 감속시키고 제어된 적을 끝냅니다. 패시브로 공격과 관통을 올립니다.', ...neutral, attack: 1.53, hp: 1.25, defense: 1.1, crit: .1, ...T5, parent: 'tideWarGod', requires: { str: 70, dex: 58 }, requiresSkillMastery: { heavenPalm: 3 }, role: '물리 최상위·제어 연계', tree: 'physical' },

    // ── 마법 ──────────────────────────────────────────────
    { id: 'currentLord', name: '해류의 지배자', title: '바다의 흐름을 쥔 자', desc: '조류 술사 계보의 환생 후 4차 직업입니다. 해류 붕괴로 상대를 약화시키고, 패시브로 마법 공격과 마나 회복을 올립니다.', ...neutral, defense: 1.12, magic: 1.58, hp: 1.16, resist: 1.18, crit: .06, ...T4, parent: 'stormScribe', requires: { int: 58, wis: 44 }, requiresSkillMastery: { thunderPsalm: 3 }, role: '마법·약화', tree: 'magic' },
    { id: 'oceanWill', name: '대해의 의지', title: '바다가 직접 답한다', desc: '조류 술사 계보의 5차 직업입니다. 대해의 분노로 상대를 기절시킵니다. 세월의 조류는 대기만성 패시브라 처음에는 명중이 낮고 4차와 비슷하지만, 숙련이 쌓일수록 강해집니다.', ...neutral, magic: 1.42, hp: 1.06, defense: 1.02, resist: 1.1, crit: .06, ...T5, parent: 'currentLord', penalties: { accuracy: -.05 }, requires: { int: 72, wis: 55 }, requiresSkillMastery: { tidalCollapse: 3 }, role: '마법 최상위·대기만성', tree: 'magic' },
    { id: 'abyssTransmuter', name: '심연 연성사', title: '깊은 물로 금속을 녹인다', desc: '해류 연구자 계보의 환생 후 4차 직업입니다. 심연 연성은 출혈을 남기고, 이미 출혈 중인 적을 크게 태웁니다. 패시브로 마법 공격과 지속 피해를 올립니다.', ...neutral, defense: 1.12, magic: 1.56, hp: 1.16, resist: 1.1, crit: .07, ...T4, parent: 'brineSavant', requires: { int: 56, luk: 42 }, requiresSkillMastery: { corrosiveBloom: 3 }, role: '마법·출혈 연계', tree: 'magic' },
    { id: 'grandAlchemist', name: '대연금술사', title: '바다 전체를 시약으로', desc: '해류 연구자 계보의 5차 직업입니다. 대연성은 중첩되는 부식을 남깁니다. 패시브로 마법 공격·지속 피해·체력을 올립니다.', ...neutral, magic: 1.68, hp: 1.15, resist: 1.18, crit: .08, ...T5, parent: 'abyssTransmuter', requires: { int: 70, luk: 52 }, requiresSkillMastery: { transmute: 3 }, role: '마법 최상위·지속 피해', tree: 'magic' },
    { id: 'samsaraArchivist', name: '윤회 기록관', title: '지난 생을 모두 적어 둔다', desc: '물고기 속삭임꾼 계보의 환생 후 4차 직업입니다. 업보의 기록은 환생할 때마다 마법 공격과 체력이 쌓이고, 전생의 메아리로 때립니다. 환생 횟수가 많을수록 강해집니다.', ...neutral, defense: 1.12, magic: 1.45, hp: 1.16, resist: 1.12, crit: .04, ...T4, parent: 'abyssArchivist', requires: { int: 54, wis: 44, luk: 34 }, requiresSkillMastery: { memoryOfTides: 3 }, role: '환생 비례·마법', tree: 'magic' },
    { id: 'aeonChronicler', name: '영겁의 기록자', title: '모든 생이 한 권에 담긴다', desc: '물고기 속삭임꾼 계보의 5차 직업입니다. 영겁의 장부는 환생할 때마다 두 공격과 체력이 쌓입니다. 영겁의 통찰은 대기만성 패시브라 처음에는 명중이 낮고 4차와 비슷하지만, 환생과 숙련이 쌓일수록 끝없이 강해집니다.', ...neutral, defense: 1.02, magic: 1.3, attack: 1.12, hp: 1.06, resist: 1.06, crit: .05, ...T5, rebirth: 3, parent: 'samsaraArchivist', penalties: { accuracy: -.05 }, requires: { int: 66, wis: 54, luk: 42 }, requiresSkillMastery: { pastLifeEcho: 3 }, role: '환생 비례·대기만성', tree: 'magic' },

    // ── 방어 ──────────────────────────────────────────────
    { id: 'coralCitadel', name: '산호 요새', title: '살아 있는 성벽', desc: '산호 수호자 계보의 환생 후 4차 직업입니다. 요새 붕괴는 방어에 비례해 때리고 상대를 기절시킵니다. 패시브로 반격·방어·체력을 올립니다.', ...neutral, attack: 1.05, hp: 1.45, defense: 1.55, resist: 1.25, ...T4, parent: 'brineThorn', requires: { vit: 60, str: 42 }, requiresSkillMastery: { thornCounter: 3 }, role: '탱커·반격', tree: 'defense', penalties: { speed: -5 } },
    { id: 'abyssBastion', name: '심해의 성벽', title: '심연 앞에 선 마지막 벽', desc: '산호 수호자 계보의 5차 직업입니다. 성벽 진동은 방어로 짓누르며 상대를 약화시킵니다. 억겁의 산호는 대기만성 패시브라 처음에는 느리고 4차와 비슷하지만, 숙련이 쌓일수록 강해집니다.', ...neutral, attack: 1.02, hp: 1.32, defense: 1.45, resist: 1.18, ...T5, parent: 'coralCitadel', requires: { vit: 74, str: 48 }, requiresSkillMastery: { citadelCrash: 3 }, role: '탱커 최상위·대기만성', tree: 'defense', penalties: { speed: -10 } },
    { id: 'tideSaint', name: '조수의 성자', title: '물결마다 축복을 싣는다', desc: '해초 돌봄꾼 계보의 환생 후 4차 회복 직업입니다. 조수의 축복으로 크게 회복하고, 패시브로 회복량과 체력을 올립니다.', ...neutral, magic: 1.3, hp: 1.35, defense: 1.12, resist: 1.25, ...T4, parent: 'tideHealer', requires: { vit: 52, wis: 50 }, requiresSkillMastery: { tidalRenewal: 3 }, role: '회복·유지', tree: 'defense' },
    { id: 'lifeOcean', name: '생명의 바다', title: '바다 전체가 상처를 감싼다', desc: '해초 돌봄꾼 계보의 5차 회복 직업입니다. 생명의 바다는 회복과 흡혈을 함께 합니다. 패시브로 회복량·체력·흡혈을 올립니다.', ...neutral, magic: 1.42, hp: 1.45, defense: 1.15, resist: 1.32, ...T5, parent: 'tideSaint', requires: { vit: 66, wis: 62 }, requiresSkillMastery: { tidalBlessing: 3 }, role: '회복 최상위', tree: 'defense' },

    // ── 상태이상 ──────────────────────────────────────────
    { id: 'bloodSeaLord', name: '혈해의 군주', title: '바다를 붉게 물들인다', desc: '피낚시꾼 계보의 환생 후 4차 직업입니다. 혈조는 출혈을 걸고, 이미 출혈 중인 적을 크게 벱니다. 패시브로 지속 피해와 치명타를 올립니다.', ...neutral, attack: 1.42, hp: 1.1, crit: .12, ...T4, parent: 'crimsonExecutioner', requires: { str: 54, dex: 44 }, requiresSkillMastery: { crimsonVerdict: 3 }, role: '출혈·연계', tree: 'status' },
    { id: 'crimsonAvatar', name: '선혈의 화신', title: '흐르는 피가 곧 칼날', desc: '피낚시꾼 계보의 5차 직업입니다. 붉은 종말은 5턴 중첩 출혈과 출혈 연계 피해를 한 번에 줍니다. 패시브로 지속 피해와 공격을 올립니다.', ...neutral, attack: 1.52, hp: 1.15, crit: .14, ...T5, parent: 'bloodSeaLord', requires: { str: 68, dex: 54 }, requiresSkillMastery: { crimsonTide: 3 }, role: '출혈 최상위', tree: 'status' },
    { id: 'stillLord', name: '정적의 군주', title: '모든 움직임이 멈춘다', desc: '마비 침술사 계보의 환생 후 4차 직업입니다. 정적의 판결은 상대를 기절시키고 제어된 적을 처형합니다. 패시브로 제어 지속과 공격을 올립니다.', ...neutral, attack: 1.42, magic: 1.1, hp: 1.1, crit: .1, ...T4, parent: 'silenceWarden', requires: { dex: 54, int: 42 }, requiresSkillMastery: { deadCalm: 3 }, role: '기절·처형', tree: 'status' },
    { id: 'silenceDeity', name: '침묵의 신', title: '세상이 숨을 멈춘다', desc: '마비 침술사 계보의 5차 직업입니다. 세계의 정적은 상대를 침묵시키고 제어된 적을 끝냅니다. 패시브로 기절 지속과 공격을 올립니다.', ...neutral, attack: 1.52, magic: 1.15, hp: 1.15, crit: .12, ...T5, parent: 'stillLord', requires: { dex: 68, int: 52 }, requiresSkillMastery: { stillVerdict: 3 }, role: '제어 최상위', tree: 'status' },

    // ── 복합 ──────────────────────────────────────────────
    { id: 'abyssHybrid', name: '심연 혼합체', title: '피와 마나가 한 몸에서 끓는다', desc: '이형 항해자 계보의 환생 후 4차 직업입니다. 생명 급류는 최대 체력에 비례해 때리고 흡혈합니다. 패시브로 체력과 물리·마법 공격을 올립니다.', ...neutral, attack: 1.35, magic: 1.2, hp: 1.35, defense: 1.08, ...T4, parent: 'bloodTide', requires: { str: 52, vit: 46 }, requiresSkillMastery: { redWake: 3 }, role: 'HP·흡혈', tree: 'hybrid' },
    { id: 'aberrantKing', name: '이형의 왕', title: '어느 바다에도 속하지 않는 왕', desc: '이형 항해자 계보의 5차 직업입니다. 이형 쇄도는 체력과 마나를 함께 실어 때립니다. 패시브로 체력·마나·흡혈을 올립니다.', ...neutral, attack: 1.42, magic: 1.3, hp: 1.45, defense: 1.1, resist: 1.08, ...T5, parent: 'abyssHybrid', requires: { str: 64, vit: 56, int: 40 }, requiresSkillMastery: { lifeTorrent: 3 }, role: 'HP·MP 최상위', tree: 'hybrid' },
    { id: 'resonanceMaster', name: '공명 장인', title: '쇠와 룬이 함께 운다', desc: '룬 대장장이 계보의 환생 후 4차 직업입니다. 공명 폭발로 상대를 약화시키고, 패시브로 두 공격과 두 방어를 함께 올립니다.', ...neutral, attack: 1.38, magic: 1.38, hp: 1.18, defense: 1.12, resist: 1.12, ...T4, parent: 'resonanceEngineer', requires: { int: 50, vit: 44, str: 34 }, requiresSkillMastery: { resonantCannon: 3 }, role: '복합·약화', tree: 'hybrid' },
    { id: 'runeCreator', name: '룬의 창조주', title: '새 문자를 바다에 새긴다', desc: '기절을 거는 창세 룬과 두 공격·관통 패시브로 룬 대장장이 계보의 정점에 선 5차 직업입니다.', ...neutral, attack: 1.5, magic: 1.5, hp: 1.22, defense: 1.12, resist: 1.12, crit: .05, ...T5, parent: 'resonanceMaster', requires: { int: 62, vit: 52, str: 42 }, requiresSkillMastery: { resonanceBurst: 3 }, role: '복합 최상위', tree: 'hybrid' },

    // ── 보조 ──────────────────────────────────────────────
    { id: 'fateGambler', name: '운명 도박사', title: '판돈은 언제나 전부', desc: '오징어 광대 계보의 환생 후 4차 직업입니다. 운명의 주사위는 치명타로 판을 뒤집습니다. 패시브로 치명 피해와 골드를 올립니다.', ...neutral, attack: 1.3, magic: 1.2, hp: 1.05, crit: .15, ...T4, parent: 'highRoller', requires: { luk: 58, dex: 42 }, requiresSkillMastery: { allIn: 3 }, role: '치명·경제', tree: 'support', penalties: { accuracy: -.04 } },
    { id: 'luckDeity', name: '확률의 신', title: '주사위가 스스로 굴러온다', desc: '오징어 광대 계보의 5차 직업입니다. 잭팟 일격을 쓰고, 패시브로 치명타·치명 피해·골드를 올려 확률의 정점에 섭니다.', ...neutral, attack: 1.42, magic: 1.3, hp: 1.1, crit: .2, ...T5, parent: 'fateGambler', requires: { luk: 72, dex: 52 }, requiresSkillMastery: { fateRoll: 3 }, role: '치명 최상위·경제', tree: 'support', penalties: { accuracy: -.04 } },
    { id: 'treasureKing', name: '심해 보물왕', title: '가라앉은 모든 것의 주인', desc: '난파선 수집가 계보의 환생 후 4차 파밍 직업입니다. 보물 강타를 쓰고, 패시브로 장비 드롭과 골드를 올립니다.', ...neutral, attack: 1.3, hp: 1.1, crit: .06, ...T4, parent: 'treasureDiver', requires: { dex: 52, luk: 50 }, requiresSkillMastery: { spoilsStrike: 3 }, role: '파밍·드롭', tree: 'support' },
    { id: 'seaTreasury', name: '바다의 보고', title: '바다가 보물을 내어준다', desc: '난파선 수집가 계보의 5차 직업입니다. 보물 더미 낙하를 쓰고, 패시브로 장비 드롭과 골드를 올려 파밍의 정점에 섭니다.', ...neutral, attack: 1.4, hp: 1.15, crit: .08, ...T5, parent: 'treasureKing', requires: { dex: 64, luk: 62 }, requiresSkillMastery: { treasureStrike: 3 }, role: '파밍 최상위', tree: 'support' },
    { id: 'seaTradeKing', name: '해상 무역왕', title: '모든 항로에 깃발을 꽂는다', desc: '인양 상인 계보의 환생 후 4차 경제 직업입니다. 금화 폭풍을 쓰고, 패시브로 골드와 던전 골드를 올립니다.', ...neutral, magic: 1.45, hp: 1.1, resist: 1.08, ...T4, parent: 'tradePrince', requires: { luk: 58, int: 42 }, requiresSkillMastery: { coinBarrage: 3 }, role: '경제·골드', tree: 'support' },
    { id: 'goldEmperor', name: '황금 제국의 군주', title: '바다의 모든 금이 모인다', desc: '인양 상인 계보의 5차 직업입니다. 황금 해일을 쓰고, 패시브로 골드·던전 골드·환생 진주를 올려 경제의 정점에 섭니다.', ...neutral, magic: 1.58, hp: 1.15, resist: 1.1, ...T5, parent: 'seaTradeKing', requires: { luk: 70, int: 52 }, requiresSkillMastery: { goldenStorm: 3 }, role: '경제 최상위', tree: 'support' },
    { id: 'starNavigator', name: '별의 항해사', title: '별이 길을 알려 준다', desc: '항해 수습기록사 계보의 환생 후 4차 성장 직업입니다. 별빛 탄환을 쓰고, 패시브로 경험치를 올립니다.', ...neutral, magic: 1.48, resist: 1.1, crit: .05, expBonus: .06, ...T4, parent: 'starCartographer', requires: { int: 54, wis: 46 }, requiresSkillMastery: { constellationBolt: 3 }, role: '경험치·마법', tree: 'support' },
    { id: 'routeDeity', name: '항로의 신', title: '모든 항로가 이 손에서 시작된다', desc: '항해 수습기록사 계보의 5차 직업입니다. 은하 낙하를 쓰고, 패시브로 경험치와 마법 공격을 올려 성장 보조의 정점에 섭니다.', ...neutral, magic: 1.62, hp: 1.1, resist: 1.15, crit: .06, expBonus: .1, ...T5, parent: 'starNavigator', requires: { int: 66, wis: 56 }, requiresSkillMastery: { starBolt: 3 }, role: '경험치 최상위', tree: 'support' },
    { id: 'titanAnatomist', name: '거수 해부학자', title: '거대한 몸의 약점을 안다', desc: '거수 생태학자 계보의 환생 후 4차 직업입니다. 약점 절개는 빈사의 적을 크게 벱니다. 패시브로 치명 피해와 처형 기준을 올립니다.', ...neutral, attack: 1.3, magic: 1.3, hp: 1.1, crit: .08, ...T4, parent: 'titanScholar', requires: { int: 50, str: 46 }, requiresSkillMastery: { weakpointThesis: 3 }, role: '보스·처형', tree: 'support' },
    { id: 'beastKing', name: '해수 사냥왕', title: '가장 큰 짐승을 쓰러뜨린 자', desc: '거수 생태학자 계보의 5차 직업입니다. 거수 쓰러뜨리기를 쓰고, 패시브로 처형 기준과 두 공격을 올려 보스 사냥의 정점에 섭니다.', ...neutral, attack: 1.42, magic: 1.42, hp: 1.15, crit: .1, ...T5, parent: 'titanAnatomist', requires: { int: 62, str: 58 }, requiresSkillMastery: { weakpointCut: 3 }, role: '보스 최상위', tree: 'support' },
    { id: 'balladKing', name: '바다의 음유왕', title: '파도가 박자를 맞춘다', desc: '방랑 음유시인 계보의 환생 후 4차 직업입니다. 조류 찬가로 자신을 가속하고, 패시브로 경험치와 속도를 올립니다.', ...neutral, magic: 1.46, hp: 1.08, expBonus: .06, ...T4, parent: 'legendBard', requires: { luk: 52, wis: 46 }, requiresSkillMastery: { epicBallad: 3 }, role: '가속·경험치', tree: 'support' },
    { id: 'siren', name: '세이렌', title: '노래 한 소절에 바다가 잠든다', desc: '방랑 음유시인 계보의 5차 직업입니다. 세이렌의 노래로 상대를 침묵시키고, 패시브로 경험치·드롭·마법 공격을 올려 노래의 정점에 섭니다.', ...neutral, magic: 1.6, hp: 1.12, resist: 1.1, expBonus: .08, ...T5, parent: 'balladKing', requires: { luk: 64, wis: 58 }, requiresSkillMastery: { tideAnthem: 3 }, role: '침묵·성장 보조', tree: 'support' },

    // ── 4차에서 끝나던 계보의 5차 ─────────────────────────
    { id: 'curseQueen', name: '저주의 여왕', title: '모든 저주가 무릎 꿇는다', desc: '침묵을 걸며 제어된 적을 무너뜨리는 파멸의 저주와 마법 공격·지속 피해 패시브로 주술사 계보의 정점에 선 5차 직업입니다.', ...neutral, defense: 1.08, magic: 1.7, hp: 1.2, resist: 1.3, crit: .08, ...T5, parent: 'calamityShrine', requires: { int: 70, wis: 54 }, requiresSkillMastery: { calamityRite: 3 }, role: '저주 최상위', tree: 'status' },
    { id: 'seaDragonGod', name: '해룡신', title: '바다를 감고 하늘에 오른다', desc: '기절을 거는 해룡신의 창과 두 공격·체력 패시브로 조류 창기병 계보의 정점에 선 5차 직업입니다.', ...neutral, attack: 1.5, magic: 1.5, hp: 1.25, defense: 1.08, resist: 1.08, crit: .06, ...T5, parent: 'abyssDragonLord', requires: { str: 64, wis: 62 }, requiresSkillMastery: { leviathanCharge: 3 }, role: '복합 최상위·해룡', tree: 'hybrid' },
    { id: 'deathEmperor', name: '불멸의 사령제', title: '죽음조차 거느리는 황제', desc: '영혼을 거두며 흡혈하는 영혼 수확 일격과 치명·흡혈·공격 패시브로 망인 계보의 정점에 선 히든 5차 직업입니다.', ...neutral, attack: 1.55, magic: 1.1, hp: 1.12, defense: 1.15, crit: .2, ...T5, parent: 'lichKing', requires: { str: 68, luk: 54 }, requiresSkillMastery: { soulTyranny: 3 }, role: '치명·영혼 최상위', tree: 'mystery', lineage: 'undead', hidden: true },
    { id: 'voidIncarnate', name: '공허의 화신', title: '아무것도 없는 곳에서 모든 것이', desc: '최대 마나에 비례하는 공허 붕괴와 거대한 마나·마법 공격 패시브로 공허의 기록자 계보의 정점에 선 히든 5차 직업입니다.', ...neutral, defense: 1.08, magic: 1.75, hp: 1.18, resist: 1.3, crit: .12, ...T5, rebirth: 3, parent: 'voidSovereign', requires: { int: 74, wis: 56 }, requiresSkillMastery: { abyssDecree: 3 }, role: 'MP 최상위·히든', tree: 'mystery', lineage: 'voidcaller', hidden: true },
];

/** 히든 직업 실루엣 카드의 힌트. */
export const V24_HINTS: Record<string, string> = {
    samsaraArchivist: '진주 장부를 끝까지 적은 기록관이 지난 생을 세기 시작할 때.',
    aeonChronicler: '세 번의 윤회를 넘어 전생의 메아리가 짙어질 때.',
    deathEmperor: '사령왕이 영혼의 폭정을 완성한 날.',
    voidIncarnate: '세 번의 윤회 끝에 공허의 칙령이 완성될 때.',
};

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };
const dual = { damageType: 'split' as const, scaling: 'dual' as const };
const M4 = [2500, 12000, 40000, 100000], M5 = [4000, 18000, 60000, 150000];
/** 대기만성: 숙련 10,000 / 100,000 / 500,000. 단계마다 AP가 줄고 보상이 크게 오릅니다. */
const LATE = [10000, 100000, 500000];

export const V24_SKILLS: Skill[] = [
    // 물리
    { ...A, ...physical, id: 'abyssHarpoon', name: '심연 작살', desc: '', level: 55, job: 'abyssHarpooner', chance: .26, cooldown: 4, multiplier: 2.7, cost: 5, penetrationBonus: .25, masteryMilestones: M4 },
    { ...P, id: 'harpoonKingEye', name: '작살왕의 눈', desc: '방어 관통과 치명 피해가 오릅니다.', level: 55, job: 'abyssHarpooner', cost: 3, bonus: { penetration: .06, critDamage: .2 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'trenchPierce', name: '해구 관통', desc: '', level: 70, job: 'seaPiercer', chance: .27, cooldown: 5, multiplier: 3.4, cost: 6, penetrationBonus: .35, effect: 'bleed', statusTurns: 4, masteryMilestones: M5 },
    { ...P, id: 'pierceAura', name: '꿰뚫는 자의 기세', desc: '물리 공격과 치명타가 오릅니다.', level: 70, job: 'seaPiercer', cost: 3, bonus: { attack: 60, crit: .05 }, masteryMilestones: M5 },
    { ...P, id: 'abyssalPatience', name: '심연의 인내', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 물리 공격·치명이 크게 오릅니다.', level: 70, job: 'seaPiercer', cost: 8, bonus: { attack: 20 }, masteryMilestones: LATE,
        levelEffects: [{ cost: 8, bonus: { attack: 20 } }, { cost: 7, bonus: { attack: 90, crit: .03 } }, { cost: 5, bonus: { attack: 220, crit: .07, critDamage: .3 } }, { cost: 2, bonus: { attack: 400, crit: .12, critDamage: .6, penetration: .08 } }] },
    { ...A, ...physical, id: 'surgeCombo', name: '연파', desc: '', level: 40, job: 'surgeFighter', chance: .28, cooldown: 3, multiplier: 1.05, cost: 4, extraAttacks: 2, extraAttackMultiplier: .5 },
    { ...P, id: 'flowingFists', name: '흐르는 주먹', desc: '속도와 물리 공격이 오릅니다.', level: 40, job: 'surgeFighter', cost: 3, bonus: { speed: 10, attack: 22 } },
    { ...A, ...physical, id: 'tsunamiRush', name: '해일 돌진', desc: '', level: 55, job: 'tsunamiBrawler', chance: .27, cooldown: 4, multiplier: 1.7, cost: 5, extraAttacks: 2, extraAttackMultiplier: .5, effect: 'slow', masteryMilestones: M4 },
    { ...P, id: 'stormBody', name: '폭풍의 몸', desc: '체력과 물리 공격이 오릅니다.', level: 55, job: 'tsunamiBrawler', cost: 3, bonus: { hp: 220, attack: 30 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'oceanCombo', name: '대양 연권', desc: '', level: 70, job: 'oceanFist', chance: .27, cooldown: 4, multiplier: 2.2, cost: 6, extraAttacks: 2, extraAttackMultiplier: .55, effect: 'stun', masteryMilestones: M5 },
    { ...P, id: 'endlessCombo', name: '끝없는 연타', desc: '추가타 위력과 물리 공격이 오릅니다.', level: 70, job: 'oceanFist', cost: 3, bonus: { followUpBonus: .1, attack: 60 }, masteryMilestones: M5 },
    { ...A, ...physical, id: 'heavenPalm', name: '천해장', desc: '', level: 55, job: 'tideWarGod', chance: .26, cooldown: 4, multiplier: 2.5, cost: 5, effect: 'stun', damageBonusCondition: 'controlled', conditionalDamageBonus: .5, masteryMilestones: M4 },
    { ...P, id: 'unshakable', name: '흔들리지 않는 중심', desc: '체력이 오르고 기절이 1턴 더 이어집니다.', level: 55, job: 'tideWarGod', cost: 3, bonus: { hp: 220, stunBonus: 1 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'limitlessFist', name: '무극권', desc: '', level: 70, job: 'fistSaint', chance: .26, cooldown: 4, multiplier: 3.4, cost: 6, effect: 'slow', damageBonusCondition: 'controlled', conditionalDamageBonus: .6, masteryMilestones: M5 },
    { ...P, id: 'fistSaintAura', name: '권성의 기세', desc: '물리 공격과 방어 관통이 오릅니다.', level: 70, job: 'fistSaint', cost: 3, bonus: { attack: 70, penetration: .06 }, masteryMilestones: M5 },
    // 마법
    { ...A, ...magic, id: 'tidalCollapse', name: '해류 붕괴', desc: '', level: 55, job: 'currentLord', chance: .55, cooldown: 4, multiplier: 2.7, cost: 5, manaCost: 28, effect: 'weaken', masteryMilestones: M4 },
    { ...P, id: 'currentDominion', name: '해류 지배', desc: '마법 공격과 마나 회복이 오릅니다.', level: 55, job: 'currentLord', cost: 3, bonus: { magic: 60, manaRegen: 5 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'oceanWrath', name: '대해의 분노', desc: '', level: 70, job: 'oceanWill', chance: .55, cooldown: 5, multiplier: 4.3, cost: 6, manaCost: 38, effect: 'stun', masteryMilestones: M5 },
    { ...P, id: 'willOfSea', name: '바다의 뜻', desc: '마법 공격과 마법 방어가 크게 오릅니다.', level: 70, job: 'oceanWill', cost: 3, bonus: { magic: 100, resist: 50 }, masteryMilestones: M5 },
    { ...P, id: 'tideOfAges', name: '세월의 조류', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 마법 공격·마나가 크게 오릅니다.', level: 70, job: 'oceanWill', cost: 8, bonus: { magic: 25 }, masteryMilestones: LATE,
        levelEffects: [{ cost: 8, bonus: { magic: 25 } }, { cost: 7, bonus: { magic: 100, mana: 40 } }, { cost: 5, bonus: { magic: 240, mana: 100, manaRegen: 3 } }, { cost: 2, bonus: { magic: 440, mana: 180, manaRegen: 6, penetration: .08 } }] },
    { ...A, ...magic, id: 'transmute', name: '심연 연성', desc: '', level: 55, job: 'abyssTransmuter', chance: .52, cooldown: 4, multiplier: 2.4, cost: 5, manaCost: 26, effect: 'bleed', dotName: '부식', dotRatio: .2, damageBonusCondition: 'bleeding', conditionalDamageBonus: .4, masteryMilestones: M4 },
    { ...P, id: 'philosopherBrine', name: '현자의 염수', desc: '마법 공격과 지속 피해가 오릅니다.', level: 55, job: 'abyssTransmuter', cost: 3, bonus: { magic: 45, dotBonus: .15 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'grandTransmutation', name: '대연성', desc: '', level: 70, job: 'grandAlchemist', chance: .52, cooldown: 5, multiplier: 3.6, cost: 6, manaCost: 36, effect: 'bleed', dotName: '부식', dotRatio: .24, dotStacks: true, statusTurns: 5, masteryMilestones: M5 },
    { ...P, id: 'elixirOfDepth', name: '심연의 영약', desc: '마법 공격·지속 피해·체력이 오릅니다.', level: 70, job: 'grandAlchemist', cost: 3, bonus: { magic: 90, dotBonus: .2, hp: 200 }, masteryMilestones: M5 },
    { ...A, ...magic, id: 'pastLifeEcho', name: '전생의 메아리', desc: '', level: 55, job: 'samsaraArchivist', chance: .5, cooldown: 4, multiplier: 2.7, cost: 4, manaCost: 22, masteryMilestones: M4 },
    { ...P, id: 'karmaRecord', name: '업보의 기록', desc: '마법 공격이 오르고, 환생할 때마다 마법 공격과 체력이 쌓입니다.', level: 55, job: 'samsaraArchivist', cost: 3, bonus: { magic: 50 }, perRebirth: { magic: 3, hp: 15 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'aeonRecall', name: '영겁 회상', desc: '', level: 70, job: 'aeonChronicler', chance: .5, cooldown: 4, multiplier: 3.8, cost: 5, manaCost: 30, masteryMilestones: M5 },
    { ...P, id: 'aeonLedger', name: '영겁의 장부', desc: '마법 공격이 오르고, 환생할 때마다 두 공격과 체력이 쌓이며, 환생 진주가 늘어납니다.', level: 70, job: 'aeonChronicler', cost: 3, bonus: { rebirthBonus: 1, magic: 60 }, perRebirth: { magic: 6, attack: 6, hp: 30 }, masteryMilestones: M5 },
    { ...P, id: 'aeonsInsight', name: '영겁의 통찰', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 두 공격과 경험치 획득이 크게 오릅니다.', level: 70, job: 'aeonChronicler', cost: 8, bonus: { attack: 15, magic: 15, expBonus: .05 }, masteryMilestones: LATE,
        levelEffects: [{ cost: 8, bonus: { attack: 15, magic: 15, expBonus: .05 } }, { cost: 7, bonus: { attack: 60, magic: 60, expBonus: .1 } }, { cost: 5, bonus: { attack: 150, magic: 150, expBonus: .2 } }, { cost: 2, bonus: { attack: 280, magic: 280, expBonus: .3 } }] },
    // 방어
    { ...A, ...physical, id: 'citadelCrash', name: '요새 붕괴', desc: '', level: 55, job: 'coralCitadel', chance: .26, cooldown: 4, multiplier: 1.8, cost: 5, effect: 'stun', scaling: 'defense', scalingRatio: 1.8, masteryMilestones: M4 },
    { ...P, id: 'livingReef', name: '살아 있는 산호', desc: '반격·물리 방어·체력이 오릅니다.', level: 55, job: 'coralCitadel', cost: 3, bonus: { thorns: .4, defense: 50, hp: 200 , swarmFind: 1}, masteryMilestones: M4 },
    { ...A, ...physical, id: 'bastionQuake', name: '성벽 진동', desc: '', level: 70, job: 'abyssBastion', chance: .26, cooldown: 5, multiplier: 2.2, cost: 6, effect: 'weaken', scaling: 'defense', scalingRatio: 3, masteryMilestones: M5 },
    { ...P, id: 'eternalReef', name: '영원의 산호', desc: '반격과 두 방어가 크게 오릅니다.', level: 70, job: 'abyssBastion', cost: 3, bonus: { thorns: .45, defense: 90, resist: 50 , swarmFind: 1.2}, masteryMilestones: M5 },
    { ...P, id: 'reefOfEons', name: '억겁의 산호', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 체력·물리 방어가 크게 오릅니다.', level: 70, job: 'abyssBastion', cost: 8, bonus: { hp: 150, defense: 15 }, masteryMilestones: LATE,
        levelEffects: [{ cost: 8, bonus: { hp: 150, defense: 15 } }, { cost: 7, bonus: { hp: 600, defense: 60 } }, { cost: 5, bonus: { hp: 1500, defense: 140, resist: 60 } }, { cost: 2, bonus: { hp: 3000, defense: 260, resist: 120, thorns: .2 } }] },
    { ...A, ...magic, id: 'tidalBlessing', name: '조수의 축복', desc: '', level: 55, job: 'tideSaint', chance: .55, cooldown: 4, multiplier: 2, cost: 5, manaCost: 24, effect: 'heal', healRatio: .25, masteryMilestones: M4 },
    { ...P, id: 'saintWater', name: '성자의 물', desc: '회복량과 체력이 오릅니다.', level: 55, job: 'tideSaint', cost: 3, bonus: { healBonus: .2, hp: 250 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'oceanOfLife', name: '생명의 바다', desc: '', level: 70, job: 'lifeOcean', chance: .55, cooldown: 4, multiplier: 2.9, cost: 6, manaCost: 32, effect: 'heal', healRatio: .3, masteryMilestones: M5 },
    { ...P, id: 'endlessTide', name: '끝나지 않는 조수', desc: '회복량·체력·흡혈이 오릅니다.', level: 70, job: 'lifeOcean', cost: 3, bonus: { healBonus: .3, hp: 400, lifesteal: .03 }, masteryMilestones: M5 },
    // 상태이상
    { ...A, ...physical, id: 'crimsonTide', name: '혈조', desc: '', level: 55, job: 'bloodSeaLord', chance: .27, cooldown: 4, multiplier: 2.1, cost: 5, effect: 'bleed', dotRatio: .2, damageBonusCondition: 'bleeding', conditionalDamageBonus: .5, masteryMilestones: M4 },
    { ...P, id: 'bloodFrenzy', name: '피의 광란', desc: '지속 피해와 치명타가 오릅니다.', level: 55, job: 'bloodSeaLord', cost: 3, bonus: { dotBonus: .2, crit: .04 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'redApocalypse', name: '붉은 종말', desc: '', level: 70, job: 'crimsonAvatar', chance: .27, cooldown: 4, multiplier: 2.9, cost: 6, effect: 'bleed', dotRatio: .24, dotStacks: true, statusTurns: 5, damageBonusCondition: 'bleeding', conditionalDamageBonus: .6, masteryMilestones: M5 },
    { ...P, id: 'endlessBleed', name: '마르지 않는 피', desc: '지속 피해와 물리 공격이 오릅니다.', level: 70, job: 'crimsonAvatar', cost: 3, bonus: { dotBonus: .25, attack: 50 }, masteryMilestones: M5 },
    { ...A, ...physical, id: 'stillVerdict', name: '정적의 판결', desc: '', level: 55, job: 'stillLord', chance: .26, cooldown: 4, multiplier: 2.4, cost: 5, effect: 'stun', damageBonusCondition: 'controlled', conditionalDamageBonus: .5, masteryMilestones: M4 },
    { ...P, id: 'stillAura', name: '정적의 기운', desc: '침묵·감속 지속과 물리 공격이 오릅니다.', level: 55, job: 'stillLord', cost: 3, bonus: { controlBonus: 1, attack: 30 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'worldStill', name: '세계의 정적', desc: '', level: 70, job: 'silenceDeity', chance: .26, cooldown: 4, multiplier: 3.3, cost: 6, effect: 'silence', statusTurns: 3, damageBonusCondition: 'controlled', conditionalDamageBonus: .6, masteryMilestones: M5 },
    { ...P, id: 'absoluteStill', name: '절대 정적', desc: '기절이 1턴 더 이어지고 물리 공격이 오릅니다.', level: 70, job: 'silenceDeity', cost: 3, bonus: { stunBonus: 1, attack: 60 }, masteryMilestones: M5 },
    // 복합
    { ...A, ...physical, id: 'lifeTorrent', name: '생명 급류', desc: '', level: 55, job: 'abyssHybrid', chance: .25, cooldown: 4, multiplier: 1.8, cost: 5, scaling: 'hp', scalingRatio: .09, effect: 'drain', drainRatio: .2, masteryMilestones: M4 },
    { ...P, id: 'hybridCore', name: '혼합 핵', desc: '체력과 두 공격이 오릅니다.', level: 55, job: 'abyssHybrid', cost: 3, bonus: { hp: 300, attack: 30, magic: 30 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'aberrantSurge', name: '이형 쇄도', desc: '', level: 70, job: 'aberrantKing', chance: .25, cooldown: 4, multiplier: 2.4, cost: 6, scaling: 'hybrid', scalingRatio: .05, effect: 'drain', drainRatio: .2, masteryMilestones: M5 },
    { ...P, id: 'aberrantBody', name: '이형의 몸', desc: '체력·최대 마나·흡혈이 오릅니다.', level: 70, job: 'aberrantKing', cost: 3, bonus: { hp: 500, mana: 80, lifesteal: .03 }, masteryMilestones: M5 },
    { ...A, ...dual, id: 'resonanceBurst', name: '공명 폭발', desc: '', level: 55, job: 'resonanceMaster', chance: .5, cooldown: 4, multiplier: 2.6, cost: 5, manaCost: 16, effect: 'weaken', masteryMilestones: M4 },
    { ...P, id: 'harmonicPlate', name: '공명 갑판', desc: '두 공격과 두 방어가 오릅니다.', level: 55, job: 'resonanceMaster', cost: 3, bonus: { attack: 25, magic: 25, defense: 30, resist: 30 }, masteryMilestones: M4 },
    { ...A, ...dual, id: 'genesisRune', name: '창세 룬', desc: '', level: 70, job: 'runeCreator', chance: .5, cooldown: 5, multiplier: 4.2, cost: 6, manaCost: 20, effect: 'stun', masteryMilestones: M5 },
    { ...P, id: 'creatorRune', name: '창조주의 문장', desc: '두 공격과 방어 관통이 오릅니다.', level: 70, job: 'runeCreator', cost: 3, bonus: { attack: 55, magic: 55, penetration: .05 }, masteryMilestones: M5 },
    // 보조
    { ...A, ...physical, id: 'fateRoll', name: '운명의 주사위', desc: '', level: 55, job: 'fateGambler', chance: .27, cooldown: 4, multiplier: 2.5, cost: 5, accuracyBonus: .06, masteryMilestones: M4 },
    { ...P, id: 'fortuneFavor', name: '행운의 총애', desc: '치명 피해와 골드 획득이 오릅니다.', level: 55, job: 'fateGambler', cost: 3, bonus: { critDamage: .3, goldBonus: .15 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'jackpotStrike', name: '잭팟 일격', desc: '', level: 70, job: 'luckDeity', chance: .27, cooldown: 4, multiplier: 3.5, cost: 6, accuracyBonus: .08, masteryMilestones: M5 },
    { ...P, id: 'divineLuck', name: '신의 행운', desc: '치명타·치명 피해·골드 획득이 오릅니다.', level: 70, job: 'luckDeity', cost: 3, bonus: { crit: .08, critDamage: .35, goldBonus: .2 }, masteryMilestones: M5 },
    { ...A, ...physical, id: 'treasureStrike', name: '보물 강타', desc: '', level: 55, job: 'treasureKing', chance: .27, cooldown: 4, multiplier: 2.2, cost: 5, masteryMilestones: M4 },
    { ...P, id: 'kingsHoard', name: '보물왕의 창고', desc: '장비 드롭과 골드 획득이 오릅니다.', level: 55, job: 'treasureKing', cost: 3, bonus: { dropBonus: .06, goldBonus: .1 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'hoardCrush', name: '보물 더미 낙하', desc: '', level: 70, job: 'seaTreasury', chance: .27, cooldown: 4, multiplier: 3, cost: 6, masteryMilestones: M5 },
    { ...P, id: 'legendHoard', name: '전설의 보고', desc: '장비 드롭과 골드 획득이 크게 오릅니다.', level: 70, job: 'seaTreasury', cost: 3, bonus: { dropBonus: .1, goldBonus: .15 }, masteryMilestones: M5 },
    { ...A, ...magic, id: 'goldenTempest', name: '금화 폭풍', desc: '', level: 55, job: 'seaTradeKing', chance: .5, cooldown: 4, multiplier: 2.8, cost: 5, manaCost: 20, masteryMilestones: M4 },
    { ...P, id: 'tradeEmpire', name: '무역 제국', desc: '골드·던전 골드 획득과 마법 공격이 오릅니다.', level: 55, job: 'seaTradeKing', cost: 3, bonus: { goldBonus: .2, dungeonGoldBonus: .15, magic: 60 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'goldenStorm', name: '황금 해일', desc: '', level: 70, job: 'goldEmperor', chance: .5, cooldown: 4, multiplier: 3.8, cost: 6, manaCost: 28, masteryMilestones: M5 },
    { ...P, id: 'goldenEmpire', name: '황금 제국', desc: '골드·던전 골드·환생 진주와 마법 공격이 오릅니다.', level: 70, job: 'goldEmperor', cost: 3, bonus: { goldBonus: .3, dungeonGoldBonus: .2, rebirthBonus: 1, magic: 110 }, masteryMilestones: M5 },
    { ...A, ...magic, id: 'starBolt', name: '별빛 탄환', desc: '', level: 55, job: 'starNavigator', chance: .5, cooldown: 4, multiplier: 3.0, cost: 5, manaCost: 22, masteryMilestones: M4 },
    { ...P, id: 'starChart', name: '별의 해도', desc: '경험치 획득과 마법 공격이 오릅니다.', level: 55, job: 'starNavigator', cost: 3, bonus: { expBonus: .15, magic: 60 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'galaxyFall', name: '은하 낙하', desc: '', level: 70, job: 'routeDeity', chance: .5, cooldown: 4, multiplier: 4.2, cost: 6, manaCost: 32, masteryMilestones: M5 },
    { ...P, id: 'cosmicChart', name: '우주의 해도', desc: '경험치 획득과 마법 공격이 오릅니다.', level: 70, job: 'routeDeity', cost: 3, bonus: { expBonus: .25, magic: 110 }, masteryMilestones: M5 },
    { ...A, ...dual, id: 'weakpointCut', name: '약점 절개', desc: '', level: 55, job: 'titanAnatomist', chance: .5, cooldown: 4, multiplier: 2.3, cost: 5, manaCost: 18, damageBonusCondition: 'lowHp', conditionalDamageBonus: .5, masteryMilestones: M4 },
    { ...P, id: 'titanLore', name: '거수학', desc: '치명 피해와 빈사 기준이 오릅니다.', level: 55, job: 'titanAnatomist', cost: 3, bonus: { critDamage: .2, executeBonus: .05 }, masteryMilestones: M4 },
    { ...A, ...dual, id: 'titanFell', name: '거수 쓰러뜨리기', desc: '', level: 70, job: 'beastKing', chance: .5, cooldown: 4, multiplier: 3.3, cost: 6, manaCost: 24, damageBonusCondition: 'lowHp', conditionalDamageBonus: .6, masteryMilestones: M5 },
    { ...P, id: 'apexLore', name: '정점의 사냥법', desc: '빈사 기준과 두 공격이 오릅니다.', level: 70, job: 'beastKing', cost: 3, bonus: { executeBonus: .08, attack: 50, magic: 50 }, masteryMilestones: M5 },
    { ...A, ...magic, id: 'tideAnthem', name: '조류 찬가', desc: '', level: 55, job: 'balladKing', chance: .5, cooldown: 4, multiplier: 2.6, cost: 5, manaCost: 20, effect: 'haste', masteryMilestones: M4 },
    { ...P, id: 'anthemAura', name: '찬가의 울림', desc: '경험치 획득·속도·마법 공격이 오릅니다.', level: 55, job: 'balladKing', cost: 3, bonus: { expBonus: .12, speed: 10, magic: 60 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'sirenSong', name: '세이렌의 노래', desc: '', level: 70, job: 'siren', chance: .5, cooldown: 5, multiplier: 3.8, cost: 6, manaCost: 28, effect: 'silence', statusTurns: 3, masteryMilestones: M5 },
    { ...P, id: 'sirenVoice', name: '세이렌의 목소리', desc: '경험치·장비 드롭·마법 공격이 오릅니다.', level: 70, job: 'siren', cost: 3, bonus: { expBonus: .18, dropBonus: .04, magic: 110 }, masteryMilestones: M5 },
    // 4차에서 끝나던 계보의 5차
    { ...A, ...magic, id: 'doomCurse', name: '파멸의 저주', desc: '', level: 70, job: 'curseQueen', chance: .5, cooldown: 4, multiplier: 3.9, cost: 6, manaCost: 36, effect: 'silence', damageBonusCondition: 'controlled', conditionalDamageBonus: .6, masteryMilestones: M5 },
    { ...P, id: 'queenOfCurses', name: '저주의 왕관', desc: '마법 공격과 지속 피해가 크게 오릅니다.', level: 70, job: 'curseQueen', cost: 3, bonus: { magic: 110, dotBonus: .2 }, masteryMilestones: M5 },
    { ...A, ...dual, id: 'dragonGodSpear', name: '해룡신의 창', desc: '', level: 70, job: 'seaDragonGod', chance: .5, cooldown: 5, multiplier: 4.5, cost: 6, manaCost: 20, effect: 'stun', masteryMilestones: M5 },
    { ...P, id: 'dragonGodScale', name: '해룡신의 비늘', desc: '두 공격과 체력이 크게 오릅니다.', level: 70, job: 'seaDragonGod', cost: 3, bonus: { attack: 55, magic: 55, hp: 300 }, masteryMilestones: M5 },
    { ...A, ...physical, id: 'soulReap', name: '영혼 수확 일격', desc: '', level: 70, job: 'deathEmperor', chance: .27, cooldown: 4, multiplier: 3.5, cost: 6, effect: 'drain', drainRatio: .2, masteryMilestones: M5 },
    { ...P, id: 'undeathThrone', name: '불멸의 옥좌', desc: '치명타·흡혈·물리 공격이 오릅니다.', level: 70, job: 'deathEmperor', cost: 3, bonus: { crit: .08, lifesteal: .04, attack: 70 }, masteryMilestones: M5 },
    { ...A, ...magic, id: 'voidCollapse', name: '공허 붕괴', desc: '', level: 70, job: 'voidIncarnate', chance: .55, cooldown: 5, multiplier: 3.9, cost: 6, manaCost: 40, scaling: 'mana', scalingRatio: .3, masteryMilestones: M5 },
    { ...P, id: 'endlessVoid', name: '끝없는 공허', desc: '최대 마나와 마법 공격이 크게 오릅니다.', level: 70, job: 'voidIncarnate', cost: 3, bonus: { mana: 150, magic: 100 }, masteryMilestones: M5 },
];

/** 액티브 밸런스 표 행: 선언한 발동률·배율·재사용 대기·마나를 그대로 사용합니다. */
export const V24_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    V24_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
