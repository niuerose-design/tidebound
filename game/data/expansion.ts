import type { Job } from './classes';
import type { Skill } from '../types';

/**
 * v21 직업 확장.
 *
 * 설계 원칙
 * - 1차에 가까울수록 단순한 능력치 패시브(공격·방어·체력 등)를 주고, 강함보다 조합 재료가 되도록 합니다.
 * - 2~3차는 기술의 다양성(연타·기절·중독·반격·복합 피해·처형)에 초점을 둡니다.
 * - 강함의 밸런스는 계열별 최상위(5차: 용사·플레임위자드 (5차)·천검·미하일 (5차)·아크메이지(불,독) (5차))끼리 맞춥니다.
 *   수치는 scripts/check-archetypes.mjs의 동일 투자 비교로 검증합니다.
 *
 * 액티브 기술의 발동률·배율·재사용 대기·마나는 여기 선언한 값이 그대로 밸런스 표(skill-balance.ts)에 들어갑니다.
 * 물리 액티브는 기본 발동률 30% 이하(최대 숙련 38% 이하), 마법·복합 액티브는 45% 이상이며 마나를 씁니다.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const T4 = { level: 55, rebirth: 1, mastery: 300, masteryTarget: 20000, masteryBoost: .32 };
const T5 = { level: 70, rebirth: 2, mastery: 600, masteryTarget: 30000, masteryBoost: .35 };
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };

export const EXPANSION_JOBS: NewJob[] = [
    // ── 검의 길 (물리 최상위: 용사) ─────────────────────────────
    { id: 'ronin', name: '낭인', title: '주인 없는 칼', desc: '떠돌며 익힌 발도술과 기백으로 물리 공격을 조금 끌어올리는 검의 첫걸음입니다.', ...neutral, bonus: { attack: 3 }, crit: .02, tier: 1, level: 10, requires: { str: 12, dex: 10 }, mastery: 0, role: '물리·검술 입문', tree: 'physical', masteryTarget: 400, masteryBoost: .08 },
    { id: 'swordsman', name: '검사', title: '형(形)을 갖춘 칼끝', desc: '브랜디쉬의 추가타와 안정적인 명중·치명타로 검술의 기본기를 완성합니다.', ...neutral, bonus: { attack: 38, hp: 20 }, crit: .1, tier: 2, level: 25, parent: 'ronin', requires: { str: 30, dex: 22 }, mastery: 75, requiresSkillMastery: { iaiDraw: 2 }, role: '물리·연타', tree: 'physical', masteryTarget: 2600, masteryBoost: .18 },
    { id: 'bladeMaster', name: '일류 칼잡이', title: '한 번 베면 끝난다', desc: '물리 계보의 3차 직업입니다. 일섬은 방어를 가르고, 패시브로 관통과 치명 피해를 올립니다.', ...neutral, bonus: { attack: 83, hp: 65, defense: 1 }, crit: .15, tier: 3, level: 40, parent: 'swordsman', requires: { str: 45, dex: 35 }, mastery: 150, requiresSkillMastery: { crossSlash: 3 }, role: '물리·관통', tree: 'physical', masteryTarget: 9500, masteryBoost: .3 },
    { id: 'knight', name: '기사', title: '검과 방패의 서약', desc: '돌격으로 적을 기절시키고 체력·방어까지 챙기는 환생 후 4차 직업입니다.', ...neutral, attack: 1.43, hp: 1.21, defense: 1.21, resist: 1.11, crit: .1, tier: 4, ...T4, parent: 'bladeMaster', requires: { str: 55, vit: 35 }, requiresSkillMastery: { flashCut: 3 }, role: '물리·돌격', tree: 'physical' },
    { id: 'hero', name: '용사', title: '끝을 내는 자', desc: '빈사의 적을 끝내는 일격과 추가타로 물리 계열의 정점에 선 5차 직업입니다.', ...neutral, attack: 1.53, hp: 1.25, defense: 1.14, resist: 1.14, crit: .15, tier: 5, ...T5, parent: 'knight', requires: { str: 70, vit: 40, dex: 40 }, requiresSkillMastery: { lanceCharge: 3 }, role: '물리 최상위·처형', tree: 'physical' },

    // ── 주먹의 길 (물리 제어 분기) ──────────────────────────────
    { id: 'martialArtist', name: '무투가', title: '맨손으로 파도를 친다', desc: '장타로 적을 잠시 멈추고 해적의 혼으로 버티는 격투 입문 직업입니다.', ...neutral, bonus: { attack: 1, hp: 10 }, tier: 1, level: 10, requires: { str: 10, vit: 12 }, mastery: 0, role: '물리·기절 입문', tree: 'physical', masteryTarget: 400, masteryBoost: .08 },
    { id: 'fistMaster', name: '권사', title: '멈추지 않는 연환', desc: '한 번에 세 번 치는 플래시 피스트와 속도 패시브로 연타를 익힙니다.', ...neutral, bonus: { attack: 33, hp: 35 }, crit: .06, tier: 2, level: 25, parent: 'martialArtist', requires: { str: 28, dex: 24 }, mastery: 75, requiresSkillMastery: { palmStrike: 2 }, role: '물리·다단 연타', tree: 'physical', masteryTarget: 2600, masteryBoost: .18 },
    { id: 'fistKing', name: '권왕', title: '하늘을 부수는 주먹', desc: '진각으로 적을 오래 감속시키고, 장타·진각으로 멈춘 적을 백스핀 블로우로 크게 치는 격투 3차 직업입니다.', ...neutral, bonus: { attack: 75, hp: 90, defense: 2 }, crit: .08, tier: 3, level: 40, parent: 'fistMaster', requires: { str: 45, dex: 40 }, mastery: 150, requiresSkillMastery: { comboFist: 3 }, role: '물리·제어 연계', tree: 'physical', masteryTarget: 9500, masteryBoost: .3 },

    // ── 마도의 길 (마법 최상위: 플레임위자드 (5차)) ───────────────────────
    { id: 'chantNovice', name: '겹영창 수습생', title: '두 입으로 외는 주문', desc: '동시 시전 주문 둘을 겹쳐 쓰는 영창 계보의 입문 직업. 상태이상 대신 순수 피해 주문을 한 행동에 쏟아붓습니다.', ...neutral, bonus: { magic: 4 }, tier: 1, level: 10, requires: { int: 12, wis: 12 }, mastery: 0, role: '마법·동시 시전', tree: 'magic', masteryTarget: 500, masteryBoost: .08 },
    { id: 'twinCaster', name: '이중 영창사', title: '서리와 불꽃을 한 호흡에', desc: '싸이킥 그랩을 더해 두 주문을 함께 외는 2차 직업입니다. 함께 나간 주문이 많을수록 대기와 마나가 늘어납니다.', ...neutral, bonus: { magic: 34, resist: 3 }, crit: .02, tier: 2, level: 25, parent: 'chantNovice', requires: { int: 32, wis: 24 }, mastery: 75, requiresSkillMastery: { twinSpark: 2 }, role: '마법·동시 시전', tree: 'magic', masteryTarget: 2800, masteryBoost: .2 },
    { id: 'tripleCaster', name: '삼중 영창사', title: '세 주문이 한 점에 모인다', desc: '얼티메이트-트레인까지 세 주문을 한 행동에 겹치는 3차 직업입니다. 마나 회복 패시브로 긴 영창을 버팁니다.', ...neutral, hp: 1, bonus: { magic: 98, resist: 6 }, crit: .04, tier: 3, level: 40, parent: 'twinCaster', requires: { int: 48, wis: 38 }, mastery: 150, requiresSkillMastery: { frostLance: 3 }, role: '마법·동시 시전', tree: 'magic', masteryTarget: 9000, masteryBoost: .28 },
    { id: 'chantMaster', name: '영창 대가', title: '폭풍을 노래하듯 외운다', desc: '환생 후 4차 마법 직업입니다. 얼티메이트-딥 임팩트를 쓰고, 패시브로 마나를 크게 올립니다. 네 주문을 한 행동에 겹칠 수 있습니다.', ...neutral, defense: 1.1, magic: 1.48, hp: 1.16, resist: 1.2, crit: .06, tier: 4, ...T4, parent: 'tripleCaster', requires: { int: 58, wis: 48 }, requiresSkillMastery: { voidRay: 3 }, role: '마법·동시 시전', tree: 'magic' },
    { id: 'thousandChants', name: '만 영창', title: '끝없이 겹치는 주문', desc: '싸이킥 토네이도로 동시 시전 계보의 정점에 선 5차 직업입니다.', ...neutral, magic: 1.75, hp: 1.25, defense: 1.07, resist: 1.28, crit: .08, tier: 5, ...T5, parent: 'chantMaster', requires: { int: 72, wis: 58 }, requiresSkillMastery: { stormChant: 3 }, role: '마법 최상위·동시 시전', tree: 'magic' },
    { id: 'apprentice', name: '견습 마법사', title: '첫 번째 주문서', desc: '오비탈 플레임 하나와 마법 공격 패시브를 익히는 마법 입문 직업입니다.', ...neutral, bonus: { magic: 4 }, tier: 1, level: 10, requires: { int: 12, wis: 10 }, mastery: 0, role: '마법 입문', tree: 'magic', masteryTarget: 400, masteryBoost: .08 },
    { id: 'mage', name: '마법사', title: '불꽃을 다루는 학도', desc: '화상을 남기는 플레임 디스차지와 마나 패시브로 주문 순환을 만듭니다.', ...neutral, bonus: { magic: 36, resist: 3 }, crit: .03, tier: 2, level: 25, parent: 'apprentice', requires: { int: 32, wis: 22 }, mastery: 75, requiresSkillMastery: { manaBolt: 2 }, role: '마법·화상', tree: 'magic', masteryTarget: 2800, masteryBoost: .18 },
    { id: 'archmage', name: '대마법사', title: '하늘에서 떨어지는 불', desc: '마법 계보의 3차 직업입니다. 블레이징 익스팅션으로 상대를 기절시키고, 패시브로 마법 관통을 올립니다.', ...neutral, hp: 1, bonus: { magic: 102, resist: 6 }, crit: .05, tier: 3, level: 40, parent: 'mage', requires: { int: 48, wis: 35 }, mastery: 150, requiresSkillMastery: { fireball: 3 }, role: '마법·폭발', tree: 'magic', masteryTarget: 10500, masteryBoost: .3 },
    { id: 'sage', name: '현자', title: '별의 흐름을 읽는다', desc: '환생 후 4차 마법 직업입니다. 피닉스 드라이브는 두 번 떨어지며 화상을 남깁니다. 패시브로 마나 회복과 마법 방어를 올립니다.', ...neutral, defense: 1.12, magic: 1.5, hp: 1.16, resist: 1.21, crit: .06, tier: 4, ...T4, parent: 'archmage', requires: { int: 58, wis: 45 }, requiresSkillMastery: { meteor: 3 }, role: '마법·연속 주문', tree: 'magic' },
    { id: 'grandMagus', name: '대마도사', title: '세계를 다시 쓰는 주문', desc: '쌓인 화상을 모두 터뜨리는 인피니티 플레임 서클(중첩당 +35%)로 마법 계열의 정점에 선 5차 직업입니다.', ...neutral, magic: 1.77, hp: 1.25, defense: 1.07, resist: 1.28, crit: .08, tier: 5, ...T5, parent: 'sage', requires: { int: 72, wis: 55 }, requiresSkillMastery: { starfall: 3 }, role: '마법 최상위', tree: 'magic' },

    // ── 마검의 길 (물리·마법 복합 최상위: 천검) ─────────────────
    // v3.145 데몬슬레이어 재개편: 마나 대신 체력을 바쳐 싸우는 피의 딜러. 액티브는 물리 피해 + 체력 소모, 패시브는 잃은 체력 비례 피해(피의 분노)와 흡혈.
    { id: 'spellbladeNovice', name: '마검 수련생', title: '피를 검에 싣는 법', desc: '마나 대신 체력을 바쳐 베는 데몬 슬래시를 익히는 입문 직업입니다. 피가 줄수록 세지는 계보의 시작.', ...neutral, bonus: { attack: 3, hp: 10 }, tier: 1, level: 10, requires: { str: 10, vit: 10 }, mastery: 0, role: '피의 딜러 입문', tree: 'hybrid', masteryTarget: 450, masteryBoost: .08 },
    { id: 'spellblade', name: '마검사', title: '피로 그린 칼날', desc: '데몬슬레이어 계보의 2차 직업입니다. 데몬 트레이스는 체력을 바쳐 상대를 약화시키고, 데빌 크라이로 바친 피의 일부를 되찾습니다.', ...neutral, bonus: { attack: 40, hp: 60 }, crit: .04, tier: 2, level: 25, parent: 'spellbladeNovice', requires: { str: 25, vit: 22 }, mastery: 75, requiresSkillMastery: { runeEdge: 2 }, role: '피의 딜러·약화', tree: 'hybrid', masteryTarget: 2800, masteryBoost: .18 },
    { id: 'runeKnight', name: '룬 기사', title: '갑옷에 새긴 문장', desc: '관통하는 데몬 임팩트와, 잃은 체력에 비례해 피해가 커지는 메탈 아머를 가진 3차 직업입니다.', ...neutral, bonus: { attack: 90, hp: 130, defense: 6, resist: 4 }, crit: .04, tier: 3, level: 40, parent: 'spellblade', requires: { str: 40, vit: 36 }, mastery: 150, requiresSkillMastery: { arcSlash: 3 }, role: '피의 딜러·관통', tree: 'hybrid', masteryTarget: 10000, masteryBoost: .3 },
    { id: 'swordSaint', name: '마검성', title: '두 개의 달을 벤다', desc: '추가타가 붙는 서버러스로 두 번 베고, 블루 블러드로 피의 분노와 흡혈을 키우는 환생 후 4차 직업입니다.', ...neutral, attack: 1.45, magic: 1, hp: 1.3, defense: 1.08, resist: 1.08, crit: .06, tier: 4, ...T4, parent: 'runeKnight', requires: { str: 48, vit: 40 }, requiresSkillMastery: { runeBurst: 3 }, role: '피의 딜러·연타', tree: 'hybrid' },
    { id: 'celestialBlade', name: '천검', title: '피를 다 바쳐 하늘을 가른다', desc: '현재 체력의 15%를 바쳐 기절을 거는 데몬 베인과, 잃은 체력에 비례해 피해가 크게 오르는 데몬 어웨이크닝으로 데몬슬레이어 계보의 정점에 선 5차 직업입니다.', ...neutral, attack: 1.6, magic: 1, hp: 1.45, defense: 1.12, resist: 1.12, crit: .08, tier: 5, ...T5, parent: 'swordSaint', requires: { str: 58, vit: 50 }, requiresSkillMastery: { twinMoon: 3 }, role: '피의 딜러 최상위', tree: 'hybrid' },


    // ── 역병의 길 (상태이상 최상위: 아크메이지(불,독) (5차)) ────────────────
    { id: 'poisoner', name: '독술사', title: '한 방울이면 충분하다', desc: '마법으로 방어를 무시하는 중독을 걸고 지속 피해 패시브를 익히는 상태이상 입문 직업입니다.', ...neutral, bonus: { magic: 4 }, crit: .02, tier: 1, level: 10, requires: { dex: 12, luk: 8 }, mastery: 0, role: '중독 입문', tree: 'status', masteryTarget: 400, masteryBoost: .08 },
    { id: 'venomAssassin', name: '독침 암살자', title: '상처는 작고 독은 깊다', desc: '화상을 남기는 파이어 애로우로 중독과 화상을 함께 쌓기 시작합니다.', ...neutral, bonus: { magic: 36 }, crit: .08, tier: 2, level: 25, parent: 'poisoner', requires: { dex: 32, luk: 20 }, mastery: 75, requiresSkillMastery: { venomDart: 2 }, role: '중독·치명', tree: 'status', masteryTarget: 2800, masteryBoost: .18 },
    { id: 'plagueDoctor', name: '역병술사', title: '병을 다루는 의사', desc: '독침·파이어 애로우로 걸어 둔 중독·화상에 포이즌 미스트로 큰 피해를 더하는 연계 3차 직업입니다.', ...neutral, bonus: { magic: 75, hp: 30 }, crit: .05, tier: 3, level: 40, parent: 'venomAssassin', requires: { dex: 45, int: 30 }, mastery: 150, requiresSkillMastery: { toxicFang: 3 }, role: '역병·연계', tree: 'status', masteryTarget: 10000, masteryBoost: .3 },
    { id: 'plagueLord', name: '역병의 군주', title: '썩어 가는 바다의 왕', desc: '미스트 이럽션으로 지속 피해와 연계를 함께 키우는 환생 후 4차 직업입니다.', ...neutral, magic: 1.5, hp: 1.11, crit: .06, tier: 4, ...T4, parent: 'plagueDoctor', requires: { dex: 52, int: 35, luk: 28 }, requiresSkillMastery: { miasma: 3 }, role: '역병·지속', tree: 'status' },
    { id: 'apostle', name: '파멸의 사도', title: '모든 것은 끝난다', desc: '중독·화상을 7턴 거는 포이즌 노바와 쌓인 중첩만큼 몰아치는 도트 퍼니셔로 상태이상 계열의 정점에 선 5차 마법 직업입니다.', ...neutral, magic: 1.55, hp: 1.18, crit: .06, tier: 5, ...T5, parent: 'plagueLord', requires: { dex: 65, int: 40, luk: 35 }, requiresSkillMastery: { rotBloom: 3 }, role: '상태이상 최상위', tree: 'status' },

    // ── 저주의 길 (마법 제어 분기) ──────────────────────────────
    { id: 'shaman', name: '주술사', title: '정령에게 묻는다', desc: '약화 보이드 러시와 마법 방어 패시브를 익히는 주술 입문 직업입니다.', ...neutral, bonus: { magic: 4, resist: 1 }, tier: 1, level: 10, requires: { int: 10, wis: 12 }, mastery: 0, role: '약화 입문', tree: 'status', masteryTarget: 400, masteryBoost: .08 },
    { id: 'hexer', name: '저주술사', title: '발을 묶는 속삭임', desc: '오래 지속되는 감속을 거는 아츠: 크레센텀으로 칼리 (3차)의 연계를 준비하는 저주 2차 직업입니다.', ...neutral, bonus: { magic: 36, resist: 4 }, crit: .03, tier: 2, level: 25, parent: 'shaman', requires: { int: 30, wis: 25 }, mastery: 75, requiresSkillMastery: { curseBolt: 2 }, role: '감속·연계', tree: 'status', masteryTarget: 2800, masteryBoost: .18 },
    { id: 'warlock', name: '흑주술사', title: '영혼을 찢는 계약', desc: '아츠: 플러리로 침묵을 걸고, 기절·침묵·감속 중인 적을 헥스: 판데모니움으로 크게 베는 마법 3차 직업입니다.', ...neutral, hp: 1, bonus: { magic: 83, resist: 8 }, crit: .05, tier: 3, level: 40, parent: 'hexer', requires: { int: 45, wis: 35 }, mastery: 150, requiresSkillMastery: { hexChain: 3 }, role: '침묵·연계', tree: 'status', masteryTarget: 10000, masteryBoost: .3 },

    // ── 노래의 길 (유틸리티) ─────────────────────────────────────
    { id: 'bard', name: '방랑 음유시인', title: '박자가 발을 이끈다', desc: '유틸리티 입문 직업입니다. 노래로 자신을 가속하고, 패시브로 경험치와 속도를 올립니다.', ...neutral, tier: 1, level: 10, requires: { luk: 12, wis: 10 }, mastery: 0, role: '가속·경험치', tree: 'support', masteryTarget: 400, masteryBoost: .08 },
    { id: 'minstrel', name: '궁정 악사', title: '박수는 금화가 된다', desc: '유틸리티 2차 직업입니다. 소울 시커로 상대를 침묵시키고, 패시브로 골드와 경험치를 올립니다.', ...neutral, expBonus: .04, bonus: { attack: 5, magic: 12 }, tier: 2, level: 25, parent: 'bard', requires: { luk: 28, wis: 24 }, mastery: 75, requiresSkillMastery: { tempoSong: 2 }, role: '침묵·보상', tree: 'support', masteryTarget: 2800, masteryBoost: .18 },
    { id: 'legendBard', name: '전설의 가객', title: '노래가 전설이 된다', desc: '가속 서사시와 경험치·드롭·명중·회피 패시브로 성장을 돕는 유틸리티 3차 직업입니다.', ...neutral, expBonus: .08, bonus: { magic: 37, hp: 30 }, tier: 3, level: 40, parent: 'minstrel', requires: { luk: 40, wis: 35 }, mastery: 150, requiresSkillMastery: { discord: 3 }, role: '성장 보조', tree: 'support', masteryTarget: 9000, masteryBoost: .28 },

    // ── 능력치 패시브 직업 (독립 1차) ───────────────────────────
    // 전투 보정은 없고 단순한 능력치 패시브 하나만 익힙니다. 올라운더가 여러 직업의 패시브를 빌려 오는 재료입니다.
    { id: 'woodcutter', name: '나무꾼', title: '도끼질로 다진 팔', desc: '물리 공격 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { str: 12 }, mastery: 0, role: '능력치·물리 공격', tree: 'physical', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'sapper', name: '공병', title: '성벽의 틈을 찾는다', desc: '방어 관통 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { str: 10, dex: 10 }, mastery: 0, role: '능력치·관통', tree: 'physical', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'hunter', name: '사냥꾼', title: '숨소리까지 읽는 눈', desc: '치명타·명중 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { dex: 12 }, mastery: 0, role: '능력치·치명·명중', tree: 'physical', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'gladiator', name: '검투사', title: '관중은 큰 한 방을 원한다', desc: '치명 피해 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { str: 12, luk: 10 }, mastery: 0, role: '능력치·치명 피해', tree: 'physical', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'scholar', name: '학자', title: '밤새 읽은 주문서', desc: '마법 공격 패시브 하나를 익히는 독립 1차 직업입니다. 마법 직업이라 마력 평타가 나갑니다.', ...neutral, bonus: { magic: 6 }, tier: 1, level: 10, requires: { int: 12 }, mastery: 0, role: '능력치·마법 공격', tree: 'magic', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'meditator', name: '명상가', title: '고요 속의 마나', desc: '마나와 마법 공격 패시브 하나를 익히는 독립 1차 직업입니다. 마법 직업이라 마력 평타가 나갑니다.', ...neutral, bonus: { magic: 6 }, tier: 1, level: 10, requires: { wis: 14 }, mastery: 0, role: '능력치·마나', tree: 'magic', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'blacksmithApprentice', name: '견습 대장장이', title: '불에 달군 살갗', desc: '물리 방어 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { str: 10, vit: 10 }, mastery: 0, role: '능력치·물리 방어', tree: 'defense', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'noviceMonk', name: '수련 승려', title: '호흡이 곧 생명', desc: '최대 체력 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { vit: 12, wis: 8 }, mastery: 0, role: '능력치·체력', tree: 'defense', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'herbalist', name: '약초꾼', title: '쓴 풀이 몸을 지킨다', desc: '마법 방어·마나 회복 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { wis: 12 }, mastery: 0, role: '능력치·마법 방어', tree: 'defense', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'apothecary', name: '약재상', title: '독과 약은 한 끗 차이', desc: '지속 피해 증가 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { int: 10, luk: 10 }, mastery: 0, role: '능력치·지속 피해', tree: 'status', branchless: true, masteryTarget: 500, masteryBoost: .08 },
    { id: 'acrobat', name: '곡예사', title: '줄 위에서도 넘어지지 않는다', desc: '회피·속도 패시브 하나를 익히는 독립 1차 직업입니다.', ...neutral, tier: 1, level: 10, requires: { dex: 14 }, mastery: 0, role: '능력치·회피·속도', tree: 'support', branchless: true, masteryTarget: 500, masteryBoost: .08 },
];

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };
/** v3.145 데몬슬레이어: 물리 피해, 마나 대신 체력을 바칩니다. */
const blood = { damageType: 'physical' as const, manaCost: 0 };
const M4 = [2500, 12000, 40000, 100000], M5 = [4000, 18000, 60000, 150000];

/** level은 직업 레벨로 다시 맞춰지고, 액티브의 desc는 밸런스 표를 적용할 때 실제 수치로 다시 씁니다. */
export const EXPANSION_SKILLS: Skill[] = [
    // 검의 길
    { ...A, ...physical, id: 'iaiDraw', name: '발도', desc: '', level: 10, job: 'ronin', chance: .28, cooldown: 3, multiplier: 1.35, cost: 2, accuracyBonus: .08 },
    { ...P, id: 'roninGrit', name: '낭인의 기백', desc: '물리 공격이 오르고, 상대를 쓰러뜨리면 모든 재사용 대기가 초기화됩니다.', level: 10, job: 'ronin', cost: 2, bonus: { attack: 14 }, cooldownReset: { on: 'kill', chance: 1, pick: 'all' } },
    { ...A, ...physical, id: 'crossSlash', name: '십자베기', desc: '', level: 25, job: 'swordsman', chance: .28, cooldown: 3, multiplier: 1.2, cost: 3, extraAttacks: 1, extraAttackMultiplier: .6 },
    { ...P, id: 'swordForm', name: '검의 형', desc: '치명타와 명중이 오릅니다.', level: 25, job: 'swordsman', cost: 2, bonus: { crit: .04, accuracy: .05 } },
    { ...A, ...physical, id: 'flashCut', name: '일섬', desc: '', level: 40, job: 'bladeMaster', chance: .26, cooldown: 4, multiplier: 2.3, cost: 4, penetrationBonus: .15, accuracyBonus: .08 },
    { ...P, id: 'edgeSense', name: '칼날 감각', desc: '방어 관통과 치명 피해가 오릅니다.', level: 40, job: 'bladeMaster', cost: 3, bonus: { penetration: .05, critDamage: .15 } },
    { ...A, ...physical, id: 'lanceCharge', name: '창 돌격', desc: '', level: 55, job: 'knight', chance: .26, cooldown: 4, multiplier: 2.5, cost: 5, effect: 'stun', masteryMilestones: M4 },
    { ...P, id: 'knightVow', name: '기사의 서약', desc: '체력·물리 방어·물리 공격이 함께 오릅니다.', level: 55, job: 'knight', cost: 3, bonus: { hp: 220, defense: 30, attack: 24 }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'braveSlash', name: '용사의 일격', desc: '', level: 70, job: 'hero', chance: .27, cooldown: 4, multiplier: 3, cost: 6, extraAttacks: 1, extraAttackMultiplier: .5, damageBonusCondition: 'lowHp', conditionalDamageBonus: .6, masteryMilestones: M5 },
    { ...P, id: 'heroSoul', name: '용사의 혼', desc: '물리 공격·치명타·치명 피해가 크게 오릅니다.', level: 70, job: 'hero', cost: 3, bonus: { attack: 70, crit: .05, critDamage: .2 }, masteryMilestones: M5 },
    // 주먹의 길
    { ...A, ...physical, id: 'palmStrike', name: '장타', desc: '', level: 10, job: 'martialArtist', chance: .24, cooldown: 4, multiplier: 1.2, cost: 2, effect: 'stun' },
    { ...P, id: 'ironBody', name: '단련된 몸', desc: '체력과 물리 방어가 오릅니다.', level: 10, job: 'martialArtist', cost: 2, bonus: { hp: 70, defense: 15, resist: 5 } },
    { ...A, ...physical, id: 'comboFist', name: '연환권', desc: '', level: 25, job: 'fistMaster', chance: .28, cooldown: 3, multiplier: .95, cost: 3, extraAttacks: 2, extraAttackMultiplier: .45 },
    { ...P, id: 'qiFlow', name: '기의 흐름', desc: '속도와 물리 공격이 오릅니다.', level: 25, job: 'fistMaster', cost: 2, bonus: { speed: 10, attack: 14 } },
    { ...A, ...physical, id: 'skyBreaker', name: '파천권', desc: '', level: 40, job: 'fistKing', chance: .26, cooldown: 4, multiplier: 2.2, cost: 4, effect: 'slow', damageBonusCondition: 'controlled', conditionalDamageBonus: .4 },
    { ...A, ...physical, id: 'quakeStep', name: '진각', desc: '', level: 40, job: 'fistKing', chance: .28, cooldown: 4, multiplier: 1, cost: 2, effect: 'slow' },
    { ...P, id: 'kingAura', name: '권왕의 기세', desc: '물리 공격과 방어 관통이 오릅니다.', level: 40, job: 'fistKing', cost: 3, bonus: { attack: 30, penetration: .04 } },
    // 마도의 길
    { ...A, ...magic, id: 'twinSpark', name: '이중 불꽃', desc: '', level: 10, job: 'chantNovice', chance: .5, cooldown: 2, multiplier: 1.35, cost: 2, manaCost: 7, multicast: true },
    { ...A, ...magic, id: 'emberVerse', name: '잔불 영창', desc: '', level: 10, job: 'chantNovice', chance: .5, cooldown: 2, multiplier: 1.2, cost: 2, manaCost: 6, multicast: true },
    { ...A, ...magic, id: 'frostLance', name: '서리 창', desc: '', level: 25, job: 'twinCaster', chance: .5, cooldown: 3, multiplier: 1.85, cost: 3, manaCost: 12, multicast: true },
    { ...P, id: 'chantFocus', name: '겹영창 집중', desc: '마법 공격과 최대 마나가 오릅니다.', level: 25, job: 'twinCaster', cost: 2, bonus: { magic: 26, mana: 30 } },
    { ...A, ...magic, id: 'voidRay', name: '공허 광선', desc: '', level: 40, job: 'tripleCaster', chance: .5, cooldown: 4, multiplier: 2.6, cost: 4, manaCost: 18, multicast: true },
    { ...P, id: 'chantReservoir', name: '영창 저수지', desc: '마법 공격·최대 마나·마나 회복이 오릅니다.', level: 40, job: 'tripleCaster', cost: 3, bonus: { magic: 45, mana: 40, manaRegen: 2 } },
    { ...A, ...magic, id: 'stormChant', name: '폭풍 영창', desc: '', level: 55, job: 'chantMaster', chance: .55, cooldown: 4, multiplier: 3.6, cost: 5, manaCost: 24, multicast: true, masteryMilestones: M4 },
    { ...P, id: 'masterCadence', name: '대가의 운율', desc: '마법 공격·최대 마나·마나 회복이 크게 오릅니다.', level: 55, job: 'chantMaster', cost: 3, bonus: { magic: 50, mana: 60, manaRegen: 3 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'infiniteChant', name: '무한 영창', desc: '', level: 70, job: 'thousandChants', chance: .6, cooldown: 5, multiplier: 5.2, cost: 6, manaCost: 34, multicast: true, masteryMilestones: M5 },
    { ...P, id: 'endlessVerse', name: '끝없는 절', desc: '마법 공격·최대 마나·마나 회복·치명 피해가 크게 오릅니다.', level: 70, job: 'thousandChants', cost: 3, bonus: { magic: 110, mana: 120, manaRegen: 4, critDamage: .15 }, masteryMilestones: M5 },
    { ...A, ...magic, id: 'manaBolt', name: '마력 화살', desc: '', level: 10, job: 'apprentice', chance: .55, cooldown: 2, multiplier: 1.45, cost: 2, manaCost: 8 },
    { ...P, id: 'arcaneStudy', name: '마법 이론', desc: '마법 공격이 오릅니다.', level: 10, job: 'apprentice', cost: 2, bonus: { magic: 16 } },
    { ...A, ...magic, id: 'fireball', name: '화염구', desc: '', level: 25, job: 'mage', chance: .55, cooldown: 3, multiplier: 1.5, cost: 3, manaCost: 14, effect: 'burn' },
    { ...P, id: 'spellFocus', name: '주문 집중', desc: '마법 공격과 최대 마나가 오릅니다.', level: 25, job: 'mage', cost: 2, bonus: { magic: 22, mana: 20 } },
    { ...A, ...magic, id: 'meteor', name: '메테오', desc: '', level: 40, job: 'archmage', chance: .5, cooldown: 5, multiplier: 2.9, cost: 5, manaCost: 26, effect: 'stun' },
    { ...P, id: 'arcanePierce', name: '마력 관통', desc: '방어 관통과 마법 공격이 오릅니다.', level: 40, job: 'archmage', cost: 3, bonus: { penetration: .06, magic: 30 } },
    // v3.148 플레임위자드 재개편: 화상을 쌓아(플레임 디스차지 · 피닉스 드라이브) 인피니티 플레임 서클로 터뜨립니다(화상 폭발, 중첩당 +35%). 5차의 최대 마나 비례는 아델 계보 장치라 뺐습니다.
    { ...A, ...magic, id: 'starfall', name: '별의 비', desc: '', level: 55, job: 'sage', chance: .55, cooldown: 4, multiplier: 2.5, cost: 5, manaCost: 30, effect: 'burn', extraAttacks: 1, extraAttackMultiplier: .6, masteryMilestones: M4 },
    { ...P, id: 'sageWisdom', name: '현자의 지혜', desc: '마나 회복·마법 공격·마법 방어가 오릅니다.', level: 55, job: 'sage', cost: 3, bonus: { manaRegen: 4, magic: 45, resist: 30 }, masteryMilestones: M4 },
    { ...A, ...magic, id: 'genesis', name: '창세의 빛', desc: '', level: 70, job: 'grandMagus', chance: .55, cooldown: 5, multiplier: 3.4, cost: 6, manaCost: 40, burnConsume: .35, masteryMilestones: M5 },
    { ...P, id: 'magusDomain', name: '대마도사의 영역', desc: '마법 공격과 치명 피해가 크게 오릅니다.', level: 70, job: 'grandMagus', cost: 3, bonus: { magic: 120, critDamage: .2, hp: 300 }, masteryMilestones: M5 },
    // 마검의 길
    // v3.145 데몬슬레이어 재개편: 마나 0, 현재 체력 비율 소모(hpCost) · 물리 피해 · 피의 분노(bloodRage, 잃은 체력 비례) · 흡혈로 되찾기.
    { ...A, ...blood, id: 'runeEdge', name: '룬 베기', desc: '', level: 10, job: 'spellbladeNovice', chance: .5, cooldown: 3, multiplier: 1.45, cost: 2, hpCost: .06 },
    { ...P, id: 'dualTraining', name: '쌍수 수련', desc: '물리 공격이 오릅니다.', level: 10, job: 'spellbladeNovice', cost: 2, bonus: { attack: 16 } },
    { ...A, ...blood, id: 'arcSlash', name: '마력 참격', desc: '', level: 25, job: 'spellblade', chance: .5, cooldown: 3, multiplier: 1.7, cost: 3, hpCost: .08, effect: 'weaken' },
    { ...P, id: 'bladeChannel', name: '칼날 공명', desc: '물리 공격·최대 체력·흡혈이 오릅니다.', level: 25, job: 'spellblade', cost: 2, bonus: { attack: 28, hp: 60, lifesteal: .04 } },
    { ...A, ...blood, id: 'runeBurst', name: '룬 폭발', desc: '', level: 40, job: 'runeKnight', chance: .5, cooldown: 4, multiplier: 2.9, cost: 4, hpCost: .1, penetrationBonus: .1 },
    { ...P, id: 'runeArmor', name: '룬 갑주', desc: '두 방어와 체력이 오르고, 잃은 체력에 비례해 피해가 커집니다.', level: 40, job: 'runeKnight', cost: 3, bonus: { defense: 25, resist: 25, hp: 150 }, bloodRage: .1 },
    { ...A, ...blood, id: 'twinMoon', name: '쌍월', desc: '', level: 55, job: 'swordSaint', chance: .5, cooldown: 4, multiplier: 2.35, cost: 5, hpCost: .1, extraAttacks: 1, extraAttackMultiplier: .7, masteryMilestones: M4 },
    { ...P, id: 'saintEdge', name: '검성의 날', desc: '물리 공격·방어 관통·흡혈이 오르고, 잃은 체력에 비례해 피해가 커집니다.', level: 55, job: 'swordSaint', cost: 3, bonus: { attack: 60, penetration: .05, lifesteal: .04 }, bloodRage: .15, masteryMilestones: M4 },
    { ...A, ...blood, id: 'heavenSplit', name: '천지개벽', desc: '', level: 70, job: 'celestialBlade', chance: .5, cooldown: 5, multiplier: 4.3, cost: 6, hpCost: .15, effect: 'stun', statusTurns: 3, masteryMilestones: M5 },
    { ...P, id: 'celestialAura', name: '천검의 기운', desc: '물리 공격과 치명타가 크게 오르고, 잃은 체력에 비례해 피해가 크게 커집니다.', level: 70, job: 'celestialBlade', cost: 3, bonus: { attack: 300, crit: .05 }, bloodRage: .2, masteryMilestones: M5 },
    // 역병의 길
    // v3.132 아크메이지(불,독) 리메이크: 계보 전체를 마법 피해로 바꿉니다(직업 배율도 마법 쪽으로).
    { ...A, ...magic, id: 'venomDart', name: '독침', desc: '', level: 10, job: 'poisoner', chance: .3, cooldown: 3, multiplier: 1, cost: 2, manaCost: 4, effect: 'poison', dotRatio: .12 },
    { ...P, id: 'toxinLore', name: '독물학', desc: '지속 피해가 늘어납니다.', level: 10, job: 'poisoner', cost: 2, bonus: { dotBonus: .1 } },
    { ...A, ...magic, id: 'toxicFang', name: '맹독 송곳니', desc: '', level: 25, job: 'venomAssassin', chance: .3, cooldown: 3, multiplier: 1.25, cost: 3, manaCost: 5, effect: 'burn' },
    { ...P, id: 'lethalDose', name: '치사량', desc: '지속 피해와 치명타가 오릅니다.', level: 25, job: 'venomAssassin', cost: 2, bonus: { dotBonus: .15, crit: .03 } },
    { ...A, ...magic, id: 'miasma', name: '역병 안개', desc: '', level: 40, job: 'plagueDoctor', chance: .5, cooldown: 4, multiplier: 1.5, cost: 4, manaCost: 12, effect: 'poison', dotRatio: .15, statusTurns: 4, damageBonusCondition: 'bleeding', conditionalDamageBonus: .4 },
    { ...P, id: 'plagueVessel', name: '역병의 그릇', desc: '지속 피해와 방어 관통이 오릅니다.', level: 40, job: 'plagueDoctor', cost: 3, bonus: { dotBonus: .2, penetration: .04 } },
    { ...A, ...magic, id: 'rotBloom', name: '부패의 꽃', desc: '', level: 55, job: 'plagueLord', chance: .5, cooldown: 4, multiplier: 1.8, cost: 5, manaCost: 16, effect: 'poison', dotRatio: .16, statusTurns: 4, damageBonusCondition: 'bleeding', conditionalDamageBonus: .5, masteryMilestones: M4 },
    { ...P, id: 'pestilence', name: '만연', desc: '지속 피해와 체력이 오릅니다.', level: 55, job: 'plagueLord', cost: 3, bonus: { dotBonus: .15, hp: 250 }, masteryMilestones: M4 },
    // v3.132 포이즌 노바(각성기): 중독과 화상을 함께 7턴(+지속 턴 옵션) 겁니다. 계보 밖에서 계승하면 발동률 절반(outsiderChance). 각성 지속 배율 없이 적힌 턴 그대로.
    { ...A, ...magic, id: 'doomMark', name: '파멸의 낙인', desc: '', level: 70, job: 'apostle', chance: .5, cooldown: 4, multiplier: 2.3, cost: 6, manaCost: 22, effect: 'poison', alsoEffect: 'burn', dotRatio: .2, statusTurns: 7, outsiderChance: .5, damageBonusCondition: 'bleeding', conditionalDamageBonus: .6, masteryMilestones: M5 },
    // v3.132 도트 퍼니셔: 패시브 → 일반 액티브(대기 0 · 비용 6, AP 부담이 대가). 적의 중독·화상 중첩만큼 추가타, 둘 다 최대 중첩이면 기절 2턴 · 일부면 1턴 · 없으면 피해만.
    { ...A, ...magic, id: 'endOfAll', name: '만물의 끝', desc: '', level: 70, job: 'apostle', chance: .5, cooldown: 0, multiplier: 2.4, cost: 6, manaCost: 20, dotFinisher: { maxHits: 4, hitMultiplier: .7, fullStun: 2, partStun: 1 }, damageBonusCondition: 'bleeding', conditionalDamageBonus: .5, masteryMilestones: M5 },
    // 저주의 길
    { ...A, ...magic, id: 'curseBolt', name: '저주탄', desc: '', level: 10, job: 'shaman', chance: .5, cooldown: 3, multiplier: 1.2, cost: 2, manaCost: 9, effect: 'weaken' },
    { ...P, id: 'spiritWard', name: '정령의 가호', desc: '마법 방어·최대 마나와 마력 평타 계수가 오릅니다.', level: 10, job: 'shaman', cost: 2, bonus: { resist: 14, mana: 15, arcaneRatioBonus: .5 } },
    { ...A, ...magic, id: 'hexChain', name: '속박의 저주', desc: '', level: 25, job: 'hexer', chance: .5, cooldown: 3, multiplier: 1.4, cost: 3, manaCost: 13, effect: 'slow', damageBonusCondition: 'controlled', conditionalDamageBonus: .35 },
    { ...P, id: 'malice', name: '악의', desc: '마법 공격·지속 피해와 마력 평타 계수가 오릅니다.', level: 25, job: 'hexer', cost: 2, bonus: { magic: 18, dotBonus: .1, arcaneRatioBonus: .3 } },
    { ...A, ...magic, id: 'soulRend', name: '영혼 찢기', desc: '', level: 40, job: 'warlock', chance: .5, cooldown: 4, multiplier: 2.1, cost: 4, manaCost: 20, effect: 'silence', damageBonusCondition: 'controlled', conditionalDamageBonus: .5 },
    { ...A, ...magic, id: 'sealHex', name: '봉인의 주문', desc: '', level: 40, job: 'warlock', chance: .5, cooldown: 4, multiplier: 1, cost: 2, manaCost: 8, effect: 'silence' },
    { ...P, id: 'darkPact', name: '어둠의 계약', desc: '마법 공격과 방어 관통이 오릅니다.', level: 40, job: 'warlock', cost: 3, bonus: { magic: 35, penetration: .05 } },
    // 노래의 길
    { ...A, ...physical, id: 'tempoSong', name: '박자의 노래', desc: '', level: 10, job: 'bard', chance: .28, cooldown: 4, multiplier: .9, cost: 2, effect: 'haste' },
    { ...P, id: 'lullaby', name: '길 위의 노래', desc: '경험치 획득과 속도가 오릅니다.', level: 10, job: 'bard', cost: 2, bonus: { expBonus: .05, speed: 6 } },
    { ...A, ...magic, id: 'discord', name: '불협화음', desc: '', level: 25, job: 'minstrel', chance: .5, cooldown: 4, multiplier: 1.2, cost: 3, manaCost: 12, effect: 'silence' },
    { ...P, id: 'encore', name: '앙코르', desc: '골드·경험치 획득과 마력 평타 계수가 오릅니다.', level: 25, job: 'minstrel', cost: 2, bonus: { goldBonus: .08, expBonus: .06, arcaneRatioBonus: .3 } },
    { ...A, ...magic, id: 'epicBallad', name: '영웅 서사시', desc: '', level: 40, job: 'legendBard', chance: .5, cooldown: 4, multiplier: 1.6, cost: 4, manaCost: 18, effect: 'haste' },
    { ...P, id: 'legendAura', name: '전설의 울림', desc: '경험치·드롭·명중·회피가 오릅니다.', level: 40, job: 'legendBard', cost: 3, bonus: { expBonus: .1, dropBonus: .03, accuracy: .06, evasion: .04 } },
    // 능력치 패시브 직업
    { ...P, id: 'axeArm', name: '도끼 팔', desc: '물리 공격이 오릅니다.', level: 10, job: 'woodcutter', cost: 2, bonus: { attack: 30 } },
    { ...P, id: 'breachTools', name: '공성 도구', desc: '방어 관통이 오릅니다.', level: 10, job: 'sapper', cost: 2, bonus: { penetration: .08, attack: 10 } },
    { ...P, id: 'keenEye', name: '매의 눈', desc: '치명타와 명중이 오릅니다.', level: 10, job: 'hunter', cost: 2, bonus: { crit: .07, accuracy: .07 } },
    { ...P, id: 'showmanship', name: '관중의 환호', desc: '치명 피해가 오르고, 치명타가 터지면 30% 확률로 가장 긴 재사용 대기를 초기화합니다.', level: 10, job: 'gladiator', cost: 2, bonus: { critDamage: .35, crit: .02 }, cooldownReset: { on: 'crit', chance: .3, pick: 'longest' } },
    { ...P, id: 'bookwise', name: '박식', desc: '마법 공격과 마력 평타 계수가 오릅니다.', level: 10, job: 'scholar', cost: 2, bonus: { magic: 30, arcaneRatioBonus: .3 } },
    { ...P, id: 'stillMind', name: '고요한 마음', desc: '최대 마나·마나 회복과 마법 공격, 마력 평타 계수가 오릅니다.', level: 10, job: 'meditator', cost: 2, bonus: { mana: 40, manaRegen: 2.5, magic: 16, arcaneRatioBonus: .3 } },
    { ...P, id: 'temperedSkin', name: '담금질한 피부', desc: '물리 방어가 오릅니다.', level: 10, job: 'blacksmithApprentice', cost: 2, bonus: { defense: 26, hp: 40 } },
    { ...P, id: 'innerBreath', name: '내공 호흡', desc: '최대 체력과 턴당 체력 회복이 오릅니다.', level: 10, job: 'noviceMonk', cost: 2, bonus: { hp: 180, hpRegen: 2 } },
    { ...P, id: 'herbWard', name: '약초 방부', desc: '마법 방어와 마나 회복이 오릅니다.', level: 10, job: 'herbalist', cost: 2, bonus: { resist: 26, manaRegen: 1, hp: 40 } },
    { ...P, id: 'bitterBrew', name: '쓴 달임약', desc: '지속 피해와 명중이 오릅니다.', level: 10, job: 'apothecary', cost: 2, bonus: { dotBonus: .2, accuracy: .03 } },
    { ...P, id: 'nimbleStep', name: '가벼운 발', desc: '회피와 속도가 오르고, 연속 행동마다 40% 확률로 가장 긴 재사용 대기를 초기화합니다.', level: 10, job: 'acrobat', cost: 2, bonus: { evasion: .06, speed: 8 }, cooldownReset: { on: 'chain', chance: .4, pick: 'longest' } },
    // 기존 직업 보강 (은월 (3차) 물리 경로)
    // v3.146 은월 재개편: 패시브가 정령을 불러 모든 공격에 추가타를 붙입니다(2차 1회 25% → 3차 35% → 4차 40% → 5차 2회 35%).
    { ...P, id: 'galvanicScales', name: '전류 비늘', desc: '물리 공격과 속도가 오르고, 정령이 모든 공격에 추가타 1회(위력 25%)를 붙입니다.', level: 25, job: 'stormEel', cost: 2, bonus: { attack: 16, speed: 8 }, companion: { hits: 1, power: .25 } },
];

/** 액티브 밸런스 표 행: 선언한 발동률·배율·재사용 대기·마나를 그대로 사용합니다. */
export const EXPANSION_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    EXPANSION_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
