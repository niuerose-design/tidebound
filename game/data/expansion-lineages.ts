import type { Job } from './classes';
import type { Skill } from '../types';

/**
 * v23 계보 보강: 계열·계보 사이의 직업 수 차이를 줄입니다.
 *
 * - 일반 계열은 21~28개, 이름 있는 계보는 4~8개가 되도록 짧은 계보에 후속 차수·분기를 더하고,
 *   상태이상(출혈·마비)과 복합(드래곤나이트·메카닉 (1차))에 새 계보를 둡니다.
 * - ??? 계열은 문이 걸린 기존 첫 직업의 후속 차수만 더합니다. 새 첫 직업을 만들지 않으므로 문 규칙은 그대로입니다.
 * - 수치는 같은 차수의 기존 직업을 기준으로 잡고 scripts/check-job-balance.mjs로 중앙값 근처에 맞췄습니다.
 *   액티브의 발동률·배율·재사용 대기·마나는 expansion.ts와 같은 규칙(물리 30% 이하·마나 없음, 마법·복합 45% 이상·마나 사용)을 따릅니다.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const T1 = { tier: 1, level: 10, mastery: 0 };
const T2 = { tier: 2, level: 25, mastery: 75 };
const T3 = { tier: 3, level: 40, mastery: 150 };
const T4 = { tier: 4, level: 55, rebirth: 1, mastery: 300, masteryTarget: 20000, masteryBoost: .32 };
/** 상위 전직 없이 능력치 패시브 하나를 익히는 독립 1차 직업. */
const STAT_T1 = { ...neutral, ...T1, branchless: true, masteryTarget: 500, masteryBoost: .08 };

export const LINEAGE_JOBS: NewJob[] = [
    // ── 물리: 바이퍼 계보 분기 ──────────────────────────────────
    { id: 'grappler', name: '유술가', title: '붙잡으면 놓지 않는다', desc: '해적의 장타로 멈춘 적의 관절을 꺾어, 제어된 적에게 큰 피해를 주는 격투 2차 직업입니다.', ...neutral, bonus: { attack: 27, hp: 50, defense: 2 }, crit: .04, ...T2, parent: 'martialArtist', requires: { str: 26, vit: 26 }, requiresSkillMastery: { palmStrike: 2 }, role: '물리·관절 제어', tree: 'physical' },

    // ── 마법: 일리움 계보 보강 ─────────────────────────────
    { id: 'brineSavant', name: '염해 연금술사', title: '바다를 녹이는 공식', desc: '마력 평타에 부식을 붙이는 소울 오브 크리스탈과, 평타 계수를 기준값으로 쓰는 크래프트: 롱기누스를 가진 3차 직업입니다.', ...neutral, hp: 1, bonus: { magic: 92, resist: 4 }, crit: .07, ...T3, parent: 'saltAlchemist', requires: { int: 46, luk: 34 }, requiresSkillMastery: { saltCatalyst: 3 }, role: '마력 평타·부식', tree: 'magic' },

    // ── 방어: 비숍 계보 보강 ─────────────────────────────
    { id: 'tideHealer', name: '해류 치유사', title: '물결로 상처를 씻는다', desc: '큰 회복 주문과 체력·마법 방어 패시브로 오래 버티는 회복 3차 직업입니다.', ...neutral, bonus: { magic: 37, hp: 185, defense: 9, resist: 10 }, ...T3, parent: 'reefMedic', requires: { vit: 45, wis: 38 }, requiresSkillMastery: { reefPulse: 3 }, role: '회복·지속전', tree: 'defense' },
    { id: 'shoreApothecary', name: '조간대 약사', title: '밀물과 썰물 사이의 약초', desc: '회복하며 자신의 출혈·감속을 풀어내는 해독형 2차 직업입니다.', ...neutral, bonus: { magic: 18, hp: 75, defense: 3, resist: 3 }, ...T2, parent: 'seagrassKeeper', requires: { vit: 26, int: 22 }, requiresSkillMastery: { greenTide: 2 }, role: '회복·해독', tree: 'defense' },
    { id: 'deepCaretaker', name: '등대 요양사', title: '깊은 곳에서 생명을 돌본다', desc: '입힌 피해를 크게 흡수하고 두 방어를 함께 올리는 흡혈형 3차 직업입니다.', ...neutral, bonus: { magic: 55, hp: 220, defense: 7, resist: 12 }, ...T3, parent: 'shoreApothecary', requires: { vit: 45, wis: 40 }, requiresSkillMastery: { kelpPoultice: 3 }, role: '회복·흡혈', tree: 'defense' },

    // ── 상태이상: 칼리 계보 보강 ──────────────────────────────
    { id: 'calamityShrine', name: '재앙의 무녀', title: '불길한 조류를 부른다', desc: '저주(지속 피해)를 새기고, 적에게 걸린 상태이상 종류 수만큼 세지는 헥스: 차크람 스플릿(1종마다 +20%)을 쓰는 환생 후 4차 헥스 직업입니다.', ...neutral, magic: 1.52, hp: 1.2, defense: 1.12, resist: 1.18, crit: .06, ...T4, parent: 'warlock', requires: { int: 56, wis: 42 }, requiresSkillMastery: { soulRend: 3 }, role: '침묵·재앙', tree: 'status' },
    // ── 상태이상: 데몬어벤져 계보(출혈) ───────────────────────────
    { id: 'bloodAngler', name: '피낚시꾼', title: '상처에서 흐름을 읽는다', desc: '출혈을 거는 갈고리와 지속 피해 패시브를 익히는 출혈 입문 직업입니다.', ...neutral, bonus: { attack: 1 }, crit: .02, ...T1, requires: { str: 12, dex: 10 }, role: '출혈 입문', tree: 'status', masteryTarget: 400, masteryBoost: .08 },
    { id: 'gashTracker', name: '혈흔 추적자', title: '핏자국은 사라지지 않는다', desc: '데몬어벤져 (1차)의 엑시드 블레이드로 출혈시킨 적을 더 깊이 베는 연계형 2차 직업입니다.', ...neutral, bonus: { attack: 24, hp: 10 }, crit: .08, ...T2, parent: 'bloodAngler', requires: { dex: 30, str: 24 }, requiresSkillMastery: { gashHook: 2 }, role: '출혈·연계', tree: 'status' },
    { id: 'crimsonExecutioner', name: '선혈 처형인', title: '마지막 한 방울까지', desc: '엑시드 블레이드로 걸어 둔 출혈에 엑시드: 엑스큐션으로 큰 연계 피해를 더해 적을 끝내는 3차 직업입니다. 방어가 조금 낮습니다.', ...neutral, bonus: { attack: 80, hp: 30 }, crit: .15, ...T3, parent: 'gashTracker', requires: { str: 46, dex: 36 }, requiresSkillMastery: { openVein: 3 }, role: '출혈·처형', tree: 'status' },
    { id: 'bloodDancer', name: '혈무사', title: '붉은 물결 위의 춤', desc: '오래 가는 출혈을 거는 블러드 왈츠와 속도 패시브로 적을 갉아먹는 2차 직업입니다.', ...neutral, bonus: { attack: 26 }, crit: .08, ...T2, parent: 'bloodAngler', requires: { dex: 32, luk: 20 }, requiresSkillMastery: { gashHook: 2 }, role: '출혈·연타', tree: 'status' },
    // ── 상태이상: 카데나 계보(기절·감속) ───────────────────
    { id: 'nerveNeedler', name: '마비 침술사', title: '한 점을 찌르면 멈춘다', desc: '체인아츠: 스트로크로 때리며 자기 버프(치명타)를 걸고, 패시브 웨폰 버라이어티로 버프 수만큼 세지는 입문 직업입니다.', ...neutral, bonus: { attack: 1, magic: 1 }, ...T1, requires: { dex: 10, int: 12 }, role: '자기 버프 입문', tree: 'status', masteryTarget: 400, masteryBoost: .08 },
    { id: 'nerveSeverer', name: '처형인', title: '움직임의 줄을 끊는다', desc: '체인아츠: 크러시로 관통 자기 버프를 더 거는 2차 직업입니다. 버프가 겹칠수록 모든 체인아츠가 세집니다.', ...neutral, bonus: { attack: 30 }, crit: .08, ...T2, parent: 'nerveNeedler', requires: { dex: 30, int: 22 }, requiresSkillMastery: { numbNeedle: 2 }, role: '자기 버프 · 연계', tree: 'status' },
    { id: 'silenceWarden', name: '정적의 집행자', title: '고요 속에서 끝낸다', desc: '서먼 커팅 시미터로 치명 피해 자기 버프를 더 거는 3차 직업입니다. 세 버프를 겹쳐 두고 때립니다.', ...neutral, bonus: { attack: 75, hp: 40 }, crit: .1, ...T3, parent: 'nerveSeverer', requires: { dex: 44, int: 34 }, requiresSkillMastery: { severNerve: 3 }, role: '자기 버프 · 처형', tree: 'status' },
    // ── 상태이상: 독립 수련 ─────────────────────────────────────
    { id: 'toadstoolForager', name: '독버섯 채집가', title: '먹지 말고 쓴다', desc: '지속 피해와 마법 방어 패시브 하나를 익히는 독립 1차 직업입니다.', ...STAT_T1, requires: { int: 10, vit: 10 }, role: '능력치·중독', tree: 'status' },
    { id: 'inkThrower', name: '먹물 투척수', title: '먼저 눈을 가린다', desc: '명중·회피 패시브 하나를 익히는 독립 1차 직업입니다.', ...STAT_T1, requires: { dex: 12, luk: 8 }, role: '능력치·명중', tree: 'status' },

    // ── 복합: 다크나이트 계보(좀비 루팡) ────────────────────────────
    // v3.144 다크나이트 재개편: 경계(딜러 · 불굴 탱커). 물리 창술 한 줄, 쓰러진 횟수 · 보낸 턴에 비례해 강해지고 5차 리인카네이션으로 한 번 버팁니다.
    { id: 'tideLancer', name: '조류 창기병', title: '물살을 창끝에 싣는다', desc: '물리 창술과 체력 · 마나 패시브를 익히는 경계 입문 직업입니다. 이 계보는 쓰러질수록, 오래 싸울수록 강해집니다.', ...neutral, bonus: { attack: 3, hp: 8 }, ...T1, requires: { str: 10, vit: 12 }, role: '경계 입문·창', tree: 'hybrid', masteryTarget: 450, masteryBoost: .08 },
    { id: 'seaDragoon', name: '좀비 루팡 기수', title: '바다뱀의 등에 오른다', desc: '다크나이트 계보의 2차 직업입니다. 급강하로 상대를 오래 약화시키고, 패시브는 체력 · 방어에 더해 보낸 턴 1,000마다 체력이 오릅니다.', ...neutral, bonus: { attack: 40, hp: 80, defense: 4 }, crit: .03, ...T2, parent: 'tideLancer', requires: { str: 26, vit: 24 }, requiresSkillMastery: { currentThrust: 2 }, role: '경계·약화', tree: 'hybrid' },
    { id: 'stormDragoon', name: '폭풍 용기사', title: '번개를 두른 창', desc: '방어를 꿰뚫는 뇌창과, 쓰러진 횟수마다 물리 공격이 오르는 패시브로 싸우는 3차 직업입니다.', ...neutral, bonus: { attack: 80, hp: 120, defense: 6, resist: 3 }, crit: .04, ...T3, parent: 'seaDragoon', requires: { str: 40, vit: 36 }, requiresSkillMastery: { dragonDive: 3 }, role: '경계·관통', tree: 'hybrid' },
    { id: 'abyssDragonLord', name: '해구 용왕', title: '파도의 왕좌', desc: '다크나이트 계보의 환생 후 4차 직업입니다. 대돌격으로 상대를 기절시키고, 패시브는 체력 · 물리 공격에 더해 쓰러진 횟수마다 치명 피해, 보낸 턴 1,000마다 물리 방어가 오릅니다.', ...neutral, attack: 1.25, magic: 1, hp: 1.3, defense: 1.2, resist: 1.1, crit: .06, ...T4, parent: 'stormDragoon', requires: { str: 50, vit: 44 }, requiresSkillMastery: { thunderLance: 3 }, role: '경계·불굴', tree: 'hybrid' },
    // ── 복합: 메카닉 계보 ──────────────────────────────────
    // v3.143 메카닉 재개편: 경계(반사 탱커 · 마법 딜러). 약화를 걸고 방어 비례 마법 피해로 때리며 충전, 충전이 쌓이면 전탄발사.
    { id: 'runesmith', name: '룬 대장장이', title: '쇠에 문장을 새긴다', desc: '약화를 걸며 충전을 쌓는 플레임 런처와 두 방어 · 반격 패시브를 익히는 경계 입문 직업입니다.', ...neutral, bonus: { magic: 2, defense: 2 }, ...T1, requires: { int: 12, vit: 10 }, role: '경계 입문·충전', tree: 'hybrid', masteryTarget: 450, masteryBoost: .08 },
    { id: 'arcArtificer', name: '마갑 장인', title: '갑옷이 곧 무기', desc: '물리 방어에 비례한 마법 피해로 충전을 쌓는 호밍 미사일과 두 방어 · 반격 패시브로 버티며 싸우는 2차 직업입니다.', ...neutral, bonus: { magic: 30, hp: 60, defense: 8, resist: 4 }, ...T2, parent: 'runesmith', requires: { int: 26, vit: 24 }, requiresSkillMastery: { runeHammer: 2 }, role: '경계·방어 비례 충전', tree: 'hybrid' },
    { id: 'resonanceEngineer', name: '공명 기공사', title: '공명하는 포신', desc: '메카닉 계보의 3차 직업입니다. 마그네틱 필드는 약화된 적을 더 세게 때리며 충전을 쌓고, 패시브로 체력 · 방어 · 반격을 받칩니다.', ...neutral, bonus: { magic: 80, hp: 130, defense: 14, resist: 7 }, crit: .03, ...T3, parent: 'arcArtificer', requires: { int: 40, vit: 36 }, requiresSkillMastery: { plateSurge: 3 }, role: '경계·약화 연계', tree: 'hybrid' },
    // ── 복합: 독립 수련 ─────────────────────────────────────────
    { id: 'sellsword', name: '떠돌이 용병', title: '값만 맞으면 무엇이든', desc: '물리·마법 공격 패시브 하나를 익히는 독립 1차 직업입니다.', ...STAT_T1, requires: { str: 10, int: 10 }, role: '능력치·양 공격', tree: 'hybrid' },
    { id: 'tinkerApprentice', name: '견습 수선공', title: '고치며 배운다', desc: '최대 체력·마나 패시브 하나를 익히는 독립 1차 직업입니다.', ...STAT_T1, requires: { int: 10, vit: 10 }, role: '능력치·체력·마나', tree: 'hybrid' },
    { id: 'ambiAngler', name: '양손 낚시꾼', title: '두 줄을 함께 던진다', desc: '명중·속도 패시브 하나를 익히는 독립 1차 직업입니다.', ...STAT_T1, requires: { str: 10, dex: 10 }, role: '능력치·명중·속도', tree: 'hybrid' },

    // ── 보조: 짧은 계보에 후속 차수와 분기 ──────────────────────
    { id: 'highRoller', name: '도박왕', title: '판돈은 목숨', desc: '도박 계보의 3차 직업입니다. 올인 한 방은 체력과 마나를 걸고 때린 만큼 흡혈합니다. 패시브로 골드와 치명 피해를 올립니다. 위험이 큰 만큼 보상도 큽니다.', ...neutral, hp: 1, bonus: { attack: 33, magic: 37 }, crit: .18, ...T3, parent: 'gambler', requires: { luk: 48, dex: 36 }, requiresSkillMastery: { loadedHook: 3 }, role: '치명·경제', tree: 'support', penalties: { accuracy: -.04 } },
    { id: 'inkMime', name: '먹물 광대', title: '보이지 않는 손', desc: '광대 계보의 2차 직업입니다. 스모크 스크린으로 상대를 약화시키고, 패시브로 회피와 속도를 올립니다.', ...neutral, bonus: { attack: 22, magic: 12 }, crit: .08, ...T2, parent: 'squidJester', requires: { dex: 30, luk: 24 }, requiresSkillMastery: { inkTrick: 2 }, role: '약화·회피', tree: 'support' },
    { id: 'treasureDiver', name: '보물 잠영가', title: '가장 깊은 상자를 연다', desc: '보유 골드 1%(최대 물리 공격 × 0.4)를 태우는 새비지 블로우와 처치 골드 · 두 방어를 올리는 메소 가드를 가진 3차 직업입니다.', ...neutral, bonus: { attack: 47, hp: 15 }, crit: .1, ...T3, parent: 'rareTracker', requires: { dex: 44, luk: 42 }, requiresSkillMastery: { rareSense: 3 }, role: '골드 연소 · 치명', tree: 'support' },
    { id: 'tradePrince', name: '무역 군주', title: '바다의 모든 항구가 내 장부', desc: '경제 계보의 환생 후 3차 직업입니다. 배틀쉽 봄버 주문을 쓰고, 패시브로 골드와 던전 골드를 올립니다.', ...neutral, bonus: { attack: 17, magic: 65, hp: 75, resist: 3 }, crit: .06, ...T3, rebirth: 1, parent: 'memoryMerchant', requires: { luk: 48, int: 34 }, requiresSkillMastery: { goldMemory: 3 }, role: '골드·경제', tree: 'support' },
    { id: 'harborBroker', name: '항구 중개상', title: '흥정은 싸움이다', desc: '경제 계보의 2차 직업입니다. 흥정 갈고리로 상대를 약화시키고, 패시브로 골드와 명중을 올립니다.', ...neutral, bonus: { attack: 19, magic: 14 }, crit: .05, ...T2, parent: 'salvageMerchant', requires: { luk: 28, int: 22 }, requiresSkillMastery: { salvageContract: 2 }, role: '골드·약화', tree: 'support' },
    { id: 'starCartographer', name: '별자리 항도사', title: '밤하늘에 항로를 긋는다', desc: '기록 계보의 3차 직업입니다. 별빛 주문을 쓰고, 패시브로 경험치와 마법 공격을 올립니다.', ...neutral, bonus: { magic: 55, resist: 3 }, crit: .04, expBonus: .08, ...T3, parent: 'chronicleNavigator', requires: { int: 44, wis: 36 }, requiresSkillMastery: { chronicleStudy: 3 }, role: '경험치·마법', tree: 'support' },
    { id: 'logbookRunner', name: '항해일지 전령', title: '기록을 가장 먼저 전한다', desc: '기록 계보의 2차 직업입니다. 길 안내 질주로 자신을 가속하고, 패시브로 속도와 경험치를 올립니다.', ...neutral, bonus: { attack: 24 }, crit: .04, expBonus: .03, ...T2, parent: 'voyageScribe', requires: { dex: 28, wis: 22 }, requiresSkillMastery: { voyageReview: 2 }, role: '경험치·가속', tree: 'support' },
    { id: 'titanScholar', name: '거수 박물학자', title: '거대한 몸의 약점을 안다', desc: '보스 연구 계보의 3차 직업입니다. 와일드 발칸은 방어를 꿰뚫고, 패시브로 치명 피해와 관통을 올립니다.', ...neutral, bonus: { attack: 42, magic: 46, hp: 40 }, crit: .04, ...T3, parent: 'speciesChronicler', requires: { int: 40, str: 36 }, requiresSkillMastery: { serpentFolklore: 3 }, role: '보스·숙련', tree: 'support' },
    { id: 'beastTracker', name: '거수 추적자', title: '큰 발자국을 따른다', desc: '보스 사냥 계보의 2차 직업입니다. 창격으로 방어를 꿰뚫고, 패시브로 물리 공격과 명중을 올립니다.', ...neutral, bonus: { attack: 30 }, crit: .08, ...T2, parent: 'bossNaturalist', requires: { str: 26, dex: 26 }, requiresSkillMastery: { titanFieldNotes: 2 }, role: '보스·물리', tree: 'support' },
    { id: 'tidalSinger', name: '해조 가수', title: '파도가 따라 부른다', desc: '노래 계보의 2차 직업입니다. 합창으로 체력을 회복하고, 패시브로 경험치와 마나 회복을 올립니다.', ...neutral, bonus: { magic: 36, hp: 15, resist: 2 }, ...T2, parent: 'bard', requires: { wis: 30, int: 22 }, requiresSkillMastery: { tempoSong: 2 }, role: '회복·노래', tree: 'support' },

    // ── ???: 문 직업의 후속 차수만 ──────────────────────────────
];

/** 새 계보. 계열 안의 위치는 classes.ts의 LINEAGES 순서를 따릅니다. */
export const NEW_LINEAGES = {
    bloodAngler: { id: 'bloodAngler', name: '피낚시꾼 계보', tree: 'status' as const, summary: '출혈을 쌓고 출혈 중인 적을 처형하는 계보입니다.' },
    nerveNeedler: { id: 'nerveNeedler', name: '마비 침술사 계보', tree: 'status' as const, summary: '체인아츠마다 서로 다른 자기 버프를 걸고, 살아 있는 버프 수만큼 세지는 자기 버프 계보입니다.' },
    tideLancer: { id: 'tideLancer', name: '조류 창기병 계보', tree: 'hybrid' as const, summary: '딜러와 불굴 탱커의 경계에 선 창술 계보입니다. 쓰러진 횟수와 보낸 턴에 비례해 강해지고, 5차에서는 쓰러질 피해를 한 번 버텨 냅니다.' },
    runesmith: { id: 'runesmith', name: '룬 대장장이 계보', tree: 'hybrid' as const, summary: '반사 탱커와 마법 딜러의 경계에 선 계보입니다. 약화를 걸고 물리 방어에 비례한 마법 피해로 때리며 충전을 쌓고, 충전이 차면 전탄발사로 쏟아냅니다.' },
};

/** 새 히든 직업의 실루엣 힌트. */
export const LINEAGE_HINTS: Record<string, string> = {
};

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };
const dual = { damageType: 'split' as const, scaling: 'dual' as const };
/** v3.144 다크나이트: 물리 피해(마나는 그대로 씀). */
const spear = { damageType: 'physical' as const };
/** v3.143 메카닉: 마법 피해 + 물리 방어 비례(방어 친화도 적용). */
const forgeBlast = { damageType: 'magic' as const, scaling: 'defense' as const };
const M4 = [2500, 12000, 40000, 100000];

/** level은 직업 레벨로 다시 맞춰지고, 액티브의 desc는 밸런스 표를 적용할 때 실제 수치로 다시 씁니다. */
export const LINEAGE_SKILLS: Skill[] = [
    // 물리
    { ...A, ...physical, id: 'jointLock', name: '관절 꺾기', desc: '', level: 25, job: 'grappler', chance: .26, cooldown: 3, multiplier: 1.5, cost: 3, effect: 'slow', statusTurns: 2, damageBonusCondition: 'controlled', conditionalDamageBonus: .3 },
    { ...P, id: 'lifeCurrentFlow', name: '생명의 흐름', desc: '턴마다 체력이 회복되고 회복량이 오릅니다.', level: 25, job: 'tideMender', cost: 2, bonus: { hpRegen: 3, healBonus: .1 } },
    { ...P, id: 'grappleStance', name: '붙잡는 자세', desc: '최대 체력과 물리 방어가 오릅니다.', level: 25, job: 'grappler', cost: 2, bonus: { hp: 90, defense: 15, resist: 5 } },
    // 마법
    { ...A, ...magic, id: 'corrosiveBloom', name: '부식의 개화', desc: '', level: 40, job: 'brineSavant', chance: .52, cooldown: 4, multiplier: 1.2, cost: 4, manaCost: 20, scaling: 'arcane' },
    { ...P, id: 'philosopherSalt', name: '현자의 소금', desc: '마법 공격이 오르고, 기본 공격(마력 평타)이 명중하면 부식을 겁니다.', level: 40, job: 'brineSavant', cost: 3, bonus: { magic: 30 }, basicEffect: 'corrode' },
    // 방어
    { ...A, ...magic, id: 'tidalRenewal', name: '조류의 소생', desc: '', level: 40, job: 'tideHealer', chance: .55, cooldown: 4, multiplier: 1.8, cost: 4, manaCost: 18, effect: 'heal' },
    { ...P, id: 'deepCurrentBalm', name: '등대 연고', desc: '최대 체력과 마법 방어가 오릅니다.', level: 40, job: 'tideHealer', cost: 3, bonus: { hp: 200, resist: 18 } },
    { ...A, ...magic, id: 'kelpPoultice', name: '해초 찜질', desc: '', level: 25, job: 'shoreApothecary', chance: .55, cooldown: 3, multiplier: 1.3, cost: 3, manaCost: 12, effect: 'heal', cleanseSelf: true },
    { ...P, id: 'tidepoolTonic', name: '조수 웅덩이 강장제', desc: '최대 체력과 마나 회복이 오릅니다.', level: 25, job: 'shoreApothecary', cost: 2, bonus: { hp: 80, manaRegen: 1 } },
    { ...A, ...magic, id: 'abyssalMend', name: '등대 봉합', desc: '', level: 40, job: 'deepCaretaker', chance: .55, cooldown: 4, multiplier: 1.9, cost: 4, manaCost: 18, effect: 'drain', drainRatio: .3 },
    { ...P, id: 'stillWaterVigil', name: '고요한 물의 간병', desc: '물리·마법 방어가 오릅니다.', level: 40, job: 'deepCaretaker', cost: 3, bonus: { defense: 20, resist: 20 } },
    // 상태이상: 칼리 (1차)
    // v3.123 칼리 지속 피해: 헥스: 차크람 스플릿의 침묵을 저주(출혈, 비율 0.2 · 일리움 4차 크리스탈 스킬: 데우스와 같음)로 바꿉니다. 제어 연계는 아츠: 플러리 · 보이드 버스트의 침묵이 받칩니다.
    { ...A, ...magic, id: 'calamityRite', name: '재앙의 의식', desc: '', level: 55, job: 'calamityShrine', chance: .5, cooldown: 4, multiplier: 2.9, cost: 5, manaCost: 26, effect: 'bleed', dotName: '저주', dotRatio: .2, damageBonusCondition: 'statuses', conditionalDamageBonus: .2, masteryMilestones: M4 },
    { ...P, id: 'omenVeil', name: '흉조의 장막', desc: '마법 공격과 마법 방어가 오릅니다.', level: 55, job: 'calamityShrine', cost: 3, bonus: { magic: 40, resist: 25 }, masteryMilestones: M4 },
    // 상태이상: 출혈
    { ...A, ...physical, id: 'gashHook', name: '베는 갈고리', desc: '', level: 10, job: 'bloodAngler', chance: .26, cooldown: 3, multiplier: 1, cost: 2, effect: 'bleed' },
    { ...P, id: 'bloodScent', name: '피 냄새', desc: '치명타와 지속 피해가 오릅니다.', level: 10, job: 'bloodAngler', cost: 2, bonus: { crit: .02, dotBonus: .03 } },
    { ...A, ...physical, id: 'openVein', name: '혈관 가르기', desc: '', level: 25, job: 'gashTracker', chance: .27, cooldown: 3, multiplier: 1.55, cost: 3, effect: 'bleed', damageBonusCondition: 'bleeding', conditionalDamageBonus: .35 },
    { ...P, id: 'trailOfRed', name: '붉은 흔적', desc: '지속 피해와 명중이 오릅니다.', level: 25, job: 'gashTracker', cost: 2, bonus: { dotBonus: .12, accuracy: .04 } },
    { ...A, ...physical, id: 'crimsonVerdict', name: '선혈 판결', desc: '', level: 40, job: 'crimsonExecutioner', chance: .26, cooldown: 4, multiplier: 2.2, cost: 4, effect: 'bleed', dotRatio: .2, damageBonusCondition: 'bleeding', conditionalDamageBonus: .45 },
    { ...P, id: 'hemorrhage', name: '대출혈', desc: '지속 피해와 치명 피해가 오릅니다.', level: 40, job: 'crimsonExecutioner', cost: 3, bonus: { dotBonus: .18, critDamage: .1 } },
    { ...A, ...physical, id: 'redWaltz', name: '붉은 왈츠', desc: '', level: 25, job: 'bloodDancer', chance: .28, cooldown: 3, multiplier: .95, cost: 3, effect: 'bleed', extraAttacks: 1, extraAttackMultiplier: .6 },
    { ...P, id: 'quickCuts', name: '잔 베기', desc: '속도와 치명타가 오릅니다.', level: 25, job: 'bloodDancer', cost: 2, bonus: { speed: 8, crit: .03 } },
    // 상태이상: 마비
    { ...A, ...physical, id: 'numbNeedle', name: '마비 침', desc: '', level: 10, job: 'nerveNeedler', chance: .26, cooldown: 4, multiplier: 1.1, cost: 3, selfBuff: { id: 'stroke', name: '스트로크', turns: 4, stats: { crit: .05 } } },
    { ...P, id: 'pressurePoints', name: '경혈 지식', desc: '명중과 치명타가 오르고, 살아 있는 자기 버프 1개마다 피해가 오릅니다.', level: 10, job: 'nerveNeedler', cost: 2, bonus: { accuracy: .04, crit: .02, varietyBonus: .015 } },
    { ...A, ...physical, id: 'severNerve', name: '처형', desc: '', level: 25, job: 'nerveSeverer', chance: .26, cooldown: 4, multiplier: 1.4, cost: 4, selfBuff: { id: 'crush', name: '크러시', turns: 4, stats: { penetration: .08 } } },
    { ...P, id: 'stillHands', name: '흔들리지 않는 손', desc: '물리 공격과 명중이 오르고, 살아 있는 자기 버프 1개마다 피해가 오릅니다.', level: 25, job: 'nerveSeverer', cost: 2, bonus: { attack: 14, accuracy: .04, varietyBonus: .02 } },
    { ...A, ...physical, id: 'deadCalm', name: '죽은 고요', desc: '', level: 40, job: 'silenceWarden', chance: .26, cooldown: 4, multiplier: 1.8, cost: 5, selfBuff: { id: 'scimitar', name: '시미터', turns: 4, stats: { critDamage: .2 } } },
    { ...P, id: 'numbingAura', name: '마비의 기운', desc: '물리 공격과 방어 관통이 오르고, 살아 있는 자기 버프 1개마다 피해가 오릅니다.', level: 40, job: 'silenceWarden', cost: 3, bonus: { attack: 26, penetration: .04, varietyBonus: .025 } },
    // 상태이상: 독립
    // v25.25 독립 1차 보조기: 발동률은 낮고(18%) 상태이상은 길게. 계보 밖 연계기(제어·약화·출혈 추가 피해)의 조건을 채우는 용도.
    { ...A, ...physical, id: 'driftwoodShove', name: '유목 밀치기', desc: '', level: 10, job: 'driftwoodHermit', chance: .18, cooldown: 5, multiplier: 1, cost: 2, effect: 'stun', statusTurns: 2 },
    { ...A, ...physical, id: 'currentJam', name: '해류 교란', desc: '', level: 10, job: 'tideSurveyor', chance: .18, cooldown: 5, multiplier: 1, cost: 2, effect: 'weaken', statusTurns: 6 },
    { ...A, ...physical, id: 'netThrow', name: '그물 던지기', desc: '', level: 10, job: 'netWeaver', chance: .18, cooldown: 5, multiplier: 1, cost: 2, effect: 'slow', statusTurns: 6 },
    { ...A, ...physical, id: 'oathShout', name: '맹세의 함성', desc: '', level: 10, job: 'oathAngler', chance: .18, cooldown: 5, multiplier: 1, cost: 2, effect: 'silence', statusTurns: 3 },
    { ...A, ...physical, id: 'rottenBait', name: '썩은 미끼', desc: '', level: 10, job: 'barbSkirmisher', chance: .18, cooldown: 5, multiplier: 1, cost: 2, effect: 'poison', dotRatio: .1, statusTurns: 6 },
    { ...P, id: 'sporePouch', name: '포자 주머니', desc: '지속 피해와 마법 방어가 오릅니다.', level: 10, job: 'toadstoolForager', cost: 2, bonus: { dotBonus: .08, resist: 6 } },
    { ...P, id: 'inkSplash', name: '먹물 세례', desc: '명중과 회피가 오릅니다.', level: 10, job: 'inkThrower', cost: 2, bonus: { accuracy: .05, evasion: .02 } },
    // 복합: 창기병
    // v3.144 다크나이트 재개편: 액티브는 물리 창술(spear), 패시브는 쓰러진 횟수(deaths) · 보낸 턴(turns) 비례 성장.
    { ...A, ...spear, id: 'currentThrust', name: '해류 찌르기', desc: '', level: 10, job: 'tideLancer', chance: .5, cooldown: 3, multiplier: 1.2, cost: 2, manaCost: 8 },
    { ...P, id: 'lancerPoise', name: '창기병의 균형', desc: '최대 체력과 최대 마나가 오릅니다.', level: 10, job: 'tideLancer', cost: 2, bonus: { hp: 60, mana: 10 } },
    { ...A, ...spear, id: 'dragonDive', name: '좀비 루팡 급강하', desc: '', level: 25, job: 'seaDragoon', chance: .5, cooldown: 3, multiplier: 1.3, cost: 3, manaCost: 13, effect: 'weaken' },
    { ...P, id: 'wyrmScale', name: '용린', desc: '최대 체력과 물리 방어가 오르고, 보낸 턴 1,000마다 최대 체력이 오릅니다.', level: 25, job: 'seaDragoon', cost: 2, bonus: { hp: 120, defense: 10 }, perCount: [{ source: 'turns', per: 1000, bonus: { hp: 3 }, cap: 100 }] },
    // v3.98 다크나이트 상향: 드래곤 퓨리 배율 2.1 → 2.8, 비홀더 임팩트 배율 2.5 → 2.8 · 추가 공격 1회(비홀더가 함께 때림).
    { ...A, ...spear, id: 'thunderLance', name: '뇌창', desc: '', level: 40, job: 'stormDragoon', chance: .5, cooldown: 4, multiplier: 2.1, cost: 4, manaCost: 20, penetrationBonus: .15 },
    { ...P, id: 'stormRider', name: '폭풍 기수', desc: '물리 공격과 속도가 오르고, 쓰러진 횟수마다 물리 공격이 오릅니다.', level: 40, job: 'stormDragoon', cost: 3, bonus: { attack: 24, speed: 6 }, perCount: [{ source: 'deaths', per: 1, bonus: { attack: 1 }, cap: 100 }] },
    { ...A, ...spear, id: 'leviathanCharge', name: '용왕 대돌격', desc: '', level: 55, job: 'abyssDragonLord', chance: .5, cooldown: 4, multiplier: 2.1, cost: 5, manaCost: 26, effect: 'stun', extraAttacks: 1, masteryMilestones: M4 },
    { ...P, id: 'dragonKingAura', name: '용왕의 위엄', desc: '최대 체력과 물리 공격이 오르고, 쓰러진 횟수마다 치명 피해, 보낸 턴 1,000마다 물리 방어가 오릅니다.', level: 55, job: 'abyssDragonLord', cost: 3, bonus: { hp: 260, attack: 30 }, perCount: [{ source: 'deaths', per: 1, bonus: { critDamage: .005 }, cap: 100 }, { source: 'turns', per: 1000, bonus: { defense: 1 }, cap: 100 }], masteryMilestones: M4 },
    // 복합: 메카닉 (1차)
    // v3.143 메카닉 재개편: 약화(룬 망치) → 방어 비례 마법 피해(forgeBlast)로 충전 → 전탄발사(창세 룬). 패시브는 두 방어 + 반격.
    { ...A, ...dual, id: 'runeHammer', name: '룬 망치', desc: '', level: 10, job: 'runesmith', chance: .48, cooldown: 3, multiplier: 1.15, cost: 2, manaCost: 8, effect: 'weaken', charge: 1 },
    { ...P, id: 'forgeRune', name: '대장간 룬', desc: '물리·마법 방어와 반격이 오릅니다.', level: 10, job: 'runesmith', cost: 2, bonus: { defense: 12, resist: 12, thorns: .1 } },
    { ...A, ...forgeBlast, id: 'plateSurge', name: '갑주 충격', desc: '', level: 25, job: 'arcArtificer', chance: .4, cooldown: 3, multiplier: 1.4, cost: 3, manaCost: 8, scalingRatio: .6, charge: 1 },
    { ...P, id: 'arcaneArmor', name: '마력 갑주', desc: '물리·마법 방어와 반격이 오릅니다.', level: 25, job: 'arcArtificer', cost: 2, bonus: { defense: 25, resist: 25, thorns: .15 } },
    // v3.110 메카닉 상향: 마그네틱 필드 배율 2 → 2.8(복합 피해라 기술 한 번이 공격력의 1.5배에 그쳤음).
    { ...A, ...forgeBlast, id: 'resonantCannon', name: '공명포', desc: '', level: 40, job: 'resonanceEngineer', chance: .5, cooldown: 4, multiplier: 2.4, cost: 4, manaCost: 20, scalingRatio: .7, penetrationBonus: .1, charge: 1, damageBonusCondition: 'weakened', conditionalDamageBonus: .3 },
    { ...P, id: 'tunedFrame', name: '조율된 골격', desc: '최대 체력 · 물리 방어 · 반격이 오릅니다.', level: 40, job: 'resonanceEngineer', cost: 3, bonus: { hp: 180, defense: 30, resist: 12, thorns: .2 } },
    // 복합: 독립
    { ...P, id: 'mercenaryCraft', name: '용병의 요령', desc: '물리·마법 공격이 오릅니다.', level: 10, job: 'sellsword', cost: 2, bonus: { attack: 9, magic: 9 } },
    { ...P, id: 'patchwork', name: '덧댄 솜씨', desc: '최대 체력과 최대 마나가 오릅니다.', level: 10, job: 'tinkerApprentice', cost: 2, bonus: { hp: 60, mana: 20 } },
    { ...P, id: 'twoHanded', name: '양손 챔질', desc: '명중과 속도가 오릅니다.', level: 10, job: 'ambiAngler', cost: 2, bonus: { accuracy: .03, speed: 5 } },
    // 보조
    { ...A, ...physical, id: 'allIn', name: '올인', desc: '', level: 40, job: 'highRoller', chance: .26, cooldown: 4, multiplier: 2, cost: 4, effect: 'drain', drainRatio: .15 },
    { ...P, id: 'jackpot', name: '한탕', desc: '골드 획득과 치명 피해가 오릅니다.', level: 40, job: 'highRoller', cost: 3, bonus: { goldBonus: .12, critDamage: .15 } },
    { ...A, ...physical, id: 'smokeVeil', name: '연막 찌르기', desc: '', level: 25, job: 'inkMime', chance: .27, cooldown: 3, multiplier: 1.35, cost: 3, effect: 'weaken' },
    { ...P, id: 'slipperyStep', name: '미끄러운 발', desc: '회피와 속도가 오릅니다.', level: 25, job: 'inkMime', cost: 2, bonus: { evasion: .06, speed: 5 } },
    { ...A, ...physical, id: 'spoilsStrike', name: '전리품 일격', desc: '', level: 40, job: 'treasureDiver', chance: .26, cooldown: 4, multiplier: 1.9, cost: 4 },
    { ...P, id: 'deepSalvage', name: '난파선 인양', desc: '처치 골드와 두 방어가 오릅니다.', level: 40, job: 'treasureDiver', cost: 3, bonus: { goldBonus: .15, defense: 20, resist: 20 } },
    { ...A, ...magic, id: 'coinBarrage', name: '금화 폭풍', desc: '', level: 40, job: 'tradePrince', chance: .5, cooldown: 4, multiplier: 2.1, cost: 4, manaCost: 18 },
    { ...P, id: 'tradeWind', name: '무역풍', desc: '골드와 던전 골드 획득이 오릅니다.', level: 40, job: 'tradePrince', cost: 3, bonus: { goldBonus: .15, dungeonGoldBonus: .1 } },
    { ...A, ...physical, id: 'hagglingHook', name: '흥정 갈고리', desc: '', level: 25, job: 'harborBroker', chance: .26, cooldown: 3, multiplier: 1.35, cost: 3, effect: 'weaken' },
    { ...P, id: 'portLedger', name: '항구 장부', desc: '골드 획득과 명중이 오릅니다.', level: 25, job: 'harborBroker', cost: 2, bonus: { goldBonus: .08, accuracy: .03 } },
    { ...A, ...magic, id: 'constellationBolt', name: '별자리 화살', desc: '', level: 40, job: 'starCartographer', chance: .5, cooldown: 4, multiplier: 1.9, cost: 4, manaCost: 18 },
    { ...P, id: 'starLog', name: '별의 항해일지', desc: '경험치 획득과 마법 공격이 오릅니다.', level: 40, job: 'starCartographer', cost: 3, bonus: { expBonus: .06, magic: 16 } },
    { ...A, ...physical, id: 'dispatchDash', name: '전령 질주', desc: '', level: 25, job: 'logbookRunner', chance: .28, cooldown: 3, multiplier: 1.35, cost: 3, effect: 'haste' },
    { ...P, id: 'swiftQuill', name: '빠른 펜', desc: '속도와 경험치 획득이 오릅니다.', level: 25, job: 'logbookRunner', cost: 2, bonus: { speed: 6, expBonus: .03 } },
    // v3.108 와일드헌터 상향: 와일드 발칸 배율 1.9 → 2.4(중간 몸에서 복합 피해가 낮은 관통에 크게 깎임).
    { ...A, ...dual, id: 'weakpointThesis', name: '약점 논증', desc: '', level: 40, job: 'titanScholar', chance: .5, cooldown: 4, multiplier: 2.4, cost: 4, manaCost: 18, penetrationBonus: .1 },
    { ...P, id: 'titanAnatomy', name: '거수 해부학', desc: '치명 피해와 방어 관통이 오릅니다.', level: 40, job: 'titanScholar', cost: 3, bonus: { critDamage: .12, penetration: .04 } },
    { ...A, ...physical, id: 'trackersSpear', name: '추적자의 창', desc: '', level: 25, job: 'beastTracker', chance: .26, cooldown: 3, multiplier: 1.5, cost: 3, penetrationBonus: .1 },
    { ...P, id: 'huntersPatience', name: '사냥꾼의 인내', desc: '물리 공격과 명중이 오릅니다.', level: 25, job: 'beastTracker', cost: 2, bonus: { attack: 14, accuracy: .04 } },
    { ...A, ...magic, id: 'sirenChorus', name: '세이렌 합창', desc: '', level: 25, job: 'tidalSinger', chance: .55, cooldown: 3, multiplier: 1.35, cost: 3, manaCost: 12, effect: 'heal' },
    { ...P, id: 'harmonics', name: '화음', desc: '경험치 획득과 마나 회복이 오릅니다.', level: 25, job: 'tidalSinger', cost: 2, bonus: { expBonus: .04, manaRegen: 1 } },
];

/** 액티브 밸런스 표 행: 선언한 발동률·배율·재사용 대기·마나를 그대로 사용합니다. */
export const LINEAGE_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    LINEAGE_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
