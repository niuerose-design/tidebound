/**
 * v3.231 제3장 이계(세계: otherworld). 세계석을 내면 다른 조건 없이 들어오는 세계입니다(Job.pearlCost, progression.jobRequirements).
 * 첫 계보는 해커 계보: 전에는 비밀 표(secret/)의 히든 직업(환생 5회)이었고, 이계로 옮기며 공개했습니다. 해킹 정답 · 확률 같은 서버 키는 그대로 서버에 둡니다.
 */
import type { Skill } from '../types';
import type { Job, Lineage } from './classes';

export const HACKER_LINEAGE: Lineage = {id: 'hacker', name: '해커 계보', tree: 'mystery', world: 'otherworld', summary: '전투 대신 침투 작전과 해킹으로 자라는 계보입니다. 화이트 해커는 해킹을 되돌리고 서버를 지키고, 블랙 해커는 더 자주·더 비싸게 해킹하다 추적당할 위험을 집니다.'};
export const OTHERWORLD_JOBS: Job[] = [
    {id: 'hacker', pearlCost: 3000, subRole: 'none', name: '해커', title: '게임의 헛점을 파고든다', desc: '전투 능력은 전무합니다. 사냥·던전·결투·월드보스·신 도전에 참여할 수 없고, 능력치 투자와 해커 전용이 아닌 스킬 장착이 막히며, 해커로 있는 동안 레벨·경험치가 멈춥니다. 대신 침투 작전으로 비트와 권한을 쌓고, 서버의 방송을 탈취하고 다른 모험가의 숨김을 깨뜨립니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 30, mastery: 0, requires: {}, role: '해킹·서버', tree: 'mystery', lineage: 'hacker', masteryTarget: 3000, masteryBoost: 0},
    {id: 'blackHacker', pearlCost: 10000, subRole: 'none', name: '블랙 해커', title: '흔적을 남기지 않는 자', desc: '해커와 같은 제약(전투 불가, 레벨·경험치 정지)을 받습니다. 해킹의 하루 횟수가 두 배(쿨다운 절반)지만 비트도 두 배로 들고, 해킹마다 실패 확률(35% − 단계×3%, 최소 5%)이 있습니다. 실패하면 비트·횟수만 쓰이고, 추적되어 소식에 이름이 공지되며 6시간 동안 해킹할 수 없습니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 2, level: 30, parent: 'hacker', mastery: 1500, requires: {}, role: '고위험 해킹', tree: 'mystery', lineage: 'hacker', masteryTarget: 6000, masteryBoost: 0},
    {id: 'whiteHacker', pearlCost: 10000, subRole: 'none', name: '화이트 해커', title: '뚫린 곳을 막는 자', desc: '해커와 같은 제약(전투 불가, 레벨·경험치 정지)을 받습니다. 공격 해킹(방송 탈취·크래킹·이벤트 변조·서버 다운) 대신 다른 해커의 해킹을 되돌리고(현상금으로 비트), 사냥터·던전을 패치해 한 시간 동안 서버 다운을 막습니다. 전용 패시브 방화벽은 하루 한 번 크래킹을 막아 냅니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 2, level: 30, parent: 'hacker', mastery: 1500, requires: {}, role: '복구·패치', tree: 'mystery', lineage: 'hacker', masteryTarget: 6000, masteryBoost: 0},
];
export const OTHERWORLD_SKILLS: Skill[] = [
    {id: 'adGuard', name: '신원 조작', desc: '해커 전용. 고른 모험가 한 명(나도 가능)의 랭킹 정보 공개 여부를 바꿉니다. 숙련 1단계: 이름과 모든 정보를 ???로 1시간 가림. 숙련 2단계: 가릴 항목을 고름. 숙련 3단계: 가린 이름·직업·레벨 자리에 미끼 정보(가짜 값)를 보여 줌. 하루 횟수는 숙련 단계만큼. 크래킹을 당하면 그동안 풀립니다.', type: 'passive', level: 30, job: 'hacker', chance: 0, cooldown: 0, multiplier: 0, cost: 5, bonus: {}, masteryMilestones: [250, 1200, 4500, 14000], rankEffects: undefined},
    {id: 'firewall', name: '방화벽', desc: '하루 한 번, 나를 노린 크래킹을 막아 냅니다. 숙련은 해커 활동으로 오릅니다.', type: 'passive', level: 30, job: 'whiteHacker', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: {}, masteryMilestones: [250, 1200, 4500, 14000], rankEffects: undefined},
    {id: 'wipeTrace', name: '흔적 지우기', desc: '해킹에 실패해 추적당했을 때 해킹할 수 없는 시간이 6시간에서 3시간으로 줄어듭니다.', type: 'passive', level: 30, job: 'blackHacker', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: {}, masteryMilestones: [250, 1200, 4500, 14000], rankEffects: undefined},
];

/**
 * v3.231 이계 연료(배터리): 세계석 1 = 연료 100. 이계 전투 직업(Job.fuelJob)의 이계 액티브는 쓸 때 연료(Skill.fuelCost)를 태웁니다.
 * 연료가 0이면 절전 모드: 이계 액티브가 나가지 않고 두 공격 × powerSave. 연료 상한은 세계석 1,000개 분.
 * 자동 충전: 연료가 autoBelow 아래로 내려가면 세계석 autoPearls개씩 충전하되, 세계석이 s.fuelAuto개 아래로는 쓰지 않습니다.
 */
export const FUEL = { perPearl: 100, cap: 100_000, powerSave: .4, autoBelow: 500, autoPearls: 20 } as const;
/** v3.231 트레이더: 보유 종목 평가 손익률 r → 두 공격 ×(1 + r)(±25%에서 자름). 평가액이 positionFull 주화 아래면 비례로 줄어듭니다. */
export const TRADER = { cap: .25, floor: -.25, positionFull: 5000, feeScale: .5 } as const;

const M1 = [1200, 6000, 24000, 80000], M4 = [25000, 120000, 400000, 1000000], M5 = [100000, 450000, 1500000, 3750000];
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1 };
// v3.231 요원 계보: 탄창(Job.magazine). 액티브가 발동 확률 · 대기 턴 없이 장착 순서대로 한 발씩 나가고, 다 쏘면 한 행동을 재장전에 씁니다.
export const AGENT_LINEAGE: Lineage = { id: 'agent', name: '요원 계보', tree: 'physical', world: 'otherworld', summary: '탄창에 담긴 기술을 순서대로 확정 발사하는 이계 계보입니다. 다 쏘면 재장전에 한 행동을 씁니다. 총알은 세계석 연료입니다.' };
// v3.231 트레이더 계보: 증권거래소 평가 손익이 곧 공격 배율.
export const TRADER_LINEAGE: Lineage = { id: 'trader', name: '트레이더 계보', tree: 'magic', world: 'otherworld', summary: '증권거래소에 건 주화의 평가 손익이 전투력이 되는 이계 계보입니다. 시장이 좋으면 강하고, 나쁘면 약합니다.' };
export const OTHERWORLD_COMBAT_JOBS: Job[] = [
    { id: 'agentRookie', pearlCost: 3000, fuelJob: true, magazine: 6, fullKit: true, subRole: 'physical', name: '신입 요원', title: '방아쇠는 가볍게, 판단은 무겁게', desc: '이계의 1차 직업. 액티브가 발동 확률 · 대기 턴 없이 장착 순서대로 한 발씩 확정으로 나갑니다(탄창 6발, 다 쏘면 재장전 1행동). 총알은 세계석 연료이고, 연료가 없으면 절전 모드로 약해집니다.', ...neutral, bonus: { attack: 8, hp: 20 }, crit: .05, tier: 1, level: 10, mastery: 0, requires: {}, role: '이계·탄창', tree: 'physical', lineage: 'agent', masteryTarget: 3000, masteryBoost: .1 },
    { id: 'specialAgent', pearlCost: 20000, fuelJob: true, magazine: 8, subRole: 'physical', name: '특수요원', title: '한 발이면 충분하다', desc: '이계의 4차 직업. 탄창 8발. 저격 · 철갑탄 · 제압 사격을 장착 순서대로 확정 발사합니다. 핵심 패시브 전술 훈련(이계 계보 전용)이 물리 공격을 크게 올립니다. 연료가 없으면 절전 모드.', ...neutral, attack: 1.06, crit: .14, tier: 4, level: 55, mastery: 0, requires: {}, role: '이계·탄창', tree: 'physical', lineage: 'agent', parent: 'agentRookie', masteryTarget: 300000, masteryBoost: .1 },
    { id: 'retailInvestor', pearlCost: 3000, fuelJob: true, trader: true, fullKit: true, marketFeeScale: TRADER.feeScale, subRole: 'magic', name: '개미 투자자', title: '오늘은 오른다', desc: '이계의 1차 직업. 증권거래소 보유 종목의 평가 손익률만큼 두 공격이 오르내립니다(±25%). 이 직업으로 있는 동안 거래 수수료가 절반입니다. 액티브는 세계석 연료를 쓰고, 연료가 없으면 절전 모드.', ...neutral, bonus: { magic: 8, hp: 20 }, crit: .05, tier: 1, level: 10, mastery: 0, requires: {}, role: '이계·시장', tree: 'magic', lineage: 'trader', masteryTarget: 3000, masteryBoost: .1 },
    { id: 'fundManager', pearlCost: 20000, fuelJob: true, trader: true, marketFeeScale: TRADER.feeScale, subRole: 'magic', name: '펀드매니저', title: '남의 돈도 내 돈처럼', desc: '이계의 4차 직업. 평가 손익률만큼 두 공격이 오르내리고(±25%), 레버리지는 손익을 두 배로 피해에 싣습니다. 거래 수수료 절반. 핵심 패시브 복리(이계 계보 전용)가 마법 공격을 크게 올립니다. 연료가 없으면 절전 모드.', ...neutral, magic: 1.06, crit: .08, tier: 4, level: 55, mastery: 0, requires: {}, role: '이계·시장', tree: 'magic', lineage: 'trader', parent: 'retailInvestor', masteryTarget: 300000, masteryBoost: .1 },
    // v3.231 5차: 유령 요원(탄창 10 · 풀오토 · 고폭 유탄 · 각성기 데드아이), 마켓 메이커(숏 스퀴즈 · 서킷 브레이커 · 각성기 블랙 스완).
    { id: 'ghostOperative', pearlCost: 60000, fuelJob: true, magazine: 10, subRole: 'physical', name: '유령 요원', title: '보이지 않는 곳에서 끝낸다', desc: '이계의 5차 직업. 탄창 10발. 풀오토 · 고폭 유탄을 장착 순서대로 확정 발사하고, 각성기 데드아이가 표적을 꿰뚫습니다. 계보 전용 패시브로 치명타 확률과 방어 관통이 매우 높습니다. 연료가 없으면 절전 모드.', ...neutral, attack: 1.09, crit: .18, tier: 5, level: 70, mastery: 300000, requires: {}, role: '이계·탄창', tree: 'physical', lineage: 'agent', parent: 'specialAgent', masteryTarget: 1500000, masteryBoost: .1 },
    { id: 'marketMaker', pearlCost: 60000, fuelJob: true, trader: true, marketFeeScale: TRADER.feeScale, subRole: 'magic', name: '마켓 메이커', title: '시장은 내가 만든다', desc: '이계의 5차 직업. 평가 손익률만큼 두 공격이 오르내리고(마켓 메이커는 ±35%), 숏 스퀴즈는 시장이 떨어질수록, 각성기 블랙 스완은 손익이 어느 쪽으로든 크게 벌어질수록 강해집니다. 거래 수수료 절반. 연료가 없으면 절전 모드.', ...neutral, magic: 1.09, crit: .1, tier: 5, level: 70, mastery: 300000, requires: {}, role: '이계·시장', tree: 'magic', lineage: 'trader', parent: 'fundManager', masteryTarget: 1500000, masteryBoost: .1 },
];
const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0 };
const A = { type: 'active' as const };
export const OTHERWORLD_COMBAT_SKILLS: Skill[] = [
    // 요원(탄창: chance · cooldown은 탄창 직업에서 쓰지 않음. 다른 직업은 연료 장치가 없어 쓰지 못함).
    { ...A, id: 'pistolBurst', name: '권총 연사', desc: '물리 공격 × 1.2 피해 뒤 한 발 더(60%). 연료 2.', level: 10, job: 'agentRookie', chance: .6, cooldown: 1, multiplier: 1.2, extraAttacks: 1, extraAttackMultiplier: .6, damageType: 'physical', fuelCost: 2, cost: 3, manaCost: 6, masteryMilestones: M1 },
    { ...A, id: 'shotgunBlast', name: '산탄', desc: '물리 공격 × 1.8 피해. 연료 1.', level: 10, job: 'agentRookie', chance: .5, cooldown: 2, multiplier: 1.8, damageType: 'physical', fuelCost: 1, cost: 3, manaCost: 8, masteryMilestones: M1 },
    { ...A, id: 'flashbang', name: '섬광탄', desc: '물리 공격 × 0.6 피해, 맞히면 기절 1턴. 연료 1.', level: 10, job: 'agentRookie', chance: .4, cooldown: 3, multiplier: .6, effect: 'stun', statusTurns: 1, damageType: 'physical', fuelCost: 1, cost: 3, manaCost: 8, masteryMilestones: M1 },
    { ...P, id: 'extendedMag', name: '확장 탄창', desc: '탄창 +2발. 물리 공격 · 치명타 확률 · 방어 관통이 오릅니다. 요원 계보 전용.', level: 10, job: 'agentRookie', cost: 2, bonus: { attack: 6, crit: .08, penetration: .08 }, magazineBonus: 2, exclusiveLineage: 'agentRookie', masteryMilestones: M1 },
    { ...A, id: 'snipe', name: '저격', desc: '물리 공격 × 4.5 피해. 반드시 명중. 연료 3.', level: 55, job: 'specialAgent', chance: .4, cooldown: 4, multiplier: 4.5, sureHit: true, damageType: 'physical', fuelCost: 3, cost: 5, manaCost: 26, masteryMilestones: M4 },
    { ...A, id: 'armorPiercer', name: '철갑탄', desc: '물리 공격 × 2.4 피해, 맞히면 부식 2턴(방어 · 속도 감소). 연료 2.', level: 55, job: 'specialAgent', chance: .5, cooldown: 3, multiplier: 2.4, effect: 'corrode', statusTurns: 2, damageType: 'physical', fuelCost: 2, cost: 4, manaCost: 20, masteryMilestones: M4 },
    { ...A, id: 'suppressFire', name: '제압 사격', desc: '물리 공격 × 1.5 피해, 맞히면 약화 2턴. 연료 2.', level: 55, job: 'specialAgent', chance: .5, cooldown: 3, multiplier: 1.5, effect: 'weaken', statusTurns: 2, damageType: 'physical', fuelCost: 2, cost: 4, manaCost: 18, masteryMilestones: M4 },
    { ...P, id: 'tacticalTraining', name: '전술 훈련', desc: '물리 공격 · 명중 · 치명타 확률 · 방어 관통이 크게 오릅니다. 요원 계보 전용.', level: 55, job: 'specialAgent', cost: 3, bonus: { attack: 50, accuracy: .05, crit: .15, penetration: .15 }, exclusiveLineage: 'agentRookie', core: { scale: { attack: .28 } }, masteryMilestones: M4 },
    { ...P, id: 'quickReload', name: '빠른 재장전', desc: '재장전할 때 50% 확률로 행동을 쓰지 않고 바로 쏩니다.', level: 55, job: 'specialAgent', cost: 2, reloadSkip: .5, bonus: { speed: 4 }, masteryMilestones: M4 },
    // 트레이더.
    { ...A, id: 'buyOrder', name: '매수 주문', desc: '마법 공격 × 2 피해, 자기 버프 ‘매수세’ 3턴(주는 피해 ×1.1). 연료 2.', level: 10, job: 'retailInvestor', chance: .5, cooldown: 3, multiplier: 2, damageType: 'magic', selfBuff: { id: 'bullRun', name: '매수세', turns: 3, damageMultiplier: 1.1 }, fuelCost: 2, cost: 3, manaCost: 10, masteryMilestones: M1 },
    { ...A, id: 'shortSell', name: '공매도', desc: '마법 공격 × 1.6 피해, 맞히면 약화 2턴. 연료 1.', level: 10, job: 'retailInvestor', chance: .5, cooldown: 2, multiplier: 1.6, effect: 'weaken', statusTurns: 2, damageType: 'magic', fuelCost: 1, cost: 3, manaCost: 8, masteryMilestones: M1 },
    { ...P, id: 'diversify', name: '분산 투자', desc: '최대 체력 · 최대 마나 · 마법 공격이 조금 오릅니다.', level: 10, job: 'retailInvestor', cost: 2, bonus: { hp: 60, mana: 40, magic: 6 }, masteryMilestones: M1 },
    { ...A, id: 'leverage', name: '레버리지', desc: '마법 공격 × 5 피해. 평가 손익률의 두 배만큼 이 피해가 더해지거나 빠집니다(손익 +20%면 ×1.4, −20%면 ×0.6). 연료 4.', level: 55, job: 'fundManager', chance: .45, cooldown: 4, multiplier: 5, pnlScale: 2, damageType: 'magic', fuelCost: 4, cost: 5, manaCost: 30, masteryMilestones: M4 },
    { ...A, id: 'stopLoss', name: '손절', desc: '마법 공격 × 0.8 피해, 지속 피해 · 감속을 털어 내고 자기 버프 ‘손절선’ 3턴(물리 · 마법 방어 +60)을 겁니다. 연료 2.', level: 55, job: 'fundManager', chance: .3, cooldown: 6, multiplier: .8, cleanseSelf: true, selfBuff: { id: 'stopLine', name: '손절선', turns: 3, stats: { defense: 60, resist: 60 } }, damageType: 'magic', fuelCost: 2, cost: 3, manaCost: 20, masteryMilestones: M4 },
    { ...P, id: 'compounding', name: '복리', desc: '마법 공격 · 최대 마나가 오릅니다.', level: 55, job: 'fundManager', cost: 3, bonus: { magic: 50, mana: 100 }, core: { scale: { magic: .71 } }, masteryMilestones: M4 },
    { ...P, id: 'hedge', name: '헤지', desc: '평가 손실일 때 공격 배율의 하한이 −25%에서 −10%로 올라갑니다.', level: 55, job: 'fundManager', cost: 2, pnlFloor: -.1, bonus: { resist: 20 }, masteryMilestones: M4 },
    // 5차.
    { ...A, id: 'fullAuto', name: '풀오토', desc: '물리 공격 × 1 피해 뒤 추가 사격 5회(각 70%). 연료 4.', level: 70, job: 'ghostOperative', chance: .5, cooldown: 3, multiplier: 1, extraAttacks: 5, extraAttackMultiplier: .7, damageType: 'physical', fuelCost: 4, cost: 5, manaCost: 30, masteryMilestones: M5 },
    { ...A, id: 'grenadeLauncher', name: '고폭 유탄', desc: '물리 공격 × 3.4 피해, 맞히면 화상 한 중첩. 연료 3.', level: 70, job: 'ghostOperative', chance: .5, cooldown: 3, multiplier: 3.4, effect: 'burn', statusTurns: 3, damageType: 'physical', fuelCost: 3, cost: 5, manaCost: 30, masteryMilestones: M5 },
    { ...A, id: 'deadEye', name: '데드아이', desc: '물리 공격 × 9 피해. 반드시 명중. 요원 계보 전용. 연료 6.', level: 70, job: 'ghostOperative', chance: .45, cooldown: 5, multiplier: 9, sureHit: true, damageType: 'physical', exclusiveLineage: 'agentRookie', fuelCost: 6, cost: 6, manaCost: 40, masteryMilestones: M5 },
    { ...P, id: 'ghostProtocol', name: '유령 프로토콜', desc: '물리 공격 · 치명타 확률 · 치명 피해 · 방어 관통이 크게 오릅니다. 요원 계보 전용.', level: 70, job: 'ghostOperative', cost: 3, bonus: { attack: 80, crit: .1, critDamage: .2, penetration: .1 }, exclusiveLineage: 'agentRookie', core: { scale: { attack: .25 } }, masteryMilestones: M5 },
    { ...A, id: 'shortSqueeze', name: '숏 스퀴즈', desc: '마법 공격 × 3.5 피해. 평가 손실일수록 커지고 이익일수록 줄어듭니다(손익 −20%면 ×1.4). 연료 3.', level: 70, job: 'marketMaker', chance: .5, cooldown: 3, multiplier: 3.5, pnlScale: -2, damageType: 'magic', fuelCost: 3, cost: 5, manaCost: 30, masteryMilestones: M5 },
    { ...A, id: 'circuitBreaker', name: '서킷 브레이커', desc: '마법 공격 × 1.5 피해, 맞히면 기절 1턴(거래 정지). 연료 3.', level: 70, job: 'marketMaker', chance: .3, cooldown: 4, multiplier: 1.5, effect: 'stun', statusTurns: 1, damageType: 'magic', fuelCost: 3, cost: 4, manaCost: 30, masteryMilestones: M5 },
    { ...A, id: 'blackSwan', name: '블랙 스완', desc: '마법 공격 × 8 피해. 평가 손익이 어느 쪽으로든 벌어질수록 커집니다(손익 ±20%면 ×1.6). 트레이더 계보 전용. 연료 6.', level: 70, job: 'marketMaker', chance: .45, cooldown: 5, multiplier: 8, pnlScale: 3, pnlAbs: true, damageType: 'magic', exclusiveLineage: 'retailInvestor', fuelCost: 6, cost: 6, manaCost: 40, masteryMilestones: M5 },
    { ...P, id: 'liquidity', name: '유동성 공급', desc: '마법 공격 · 최대 마나가 크게 오르고, 평가 손익 배율의 범위가 ±25%에서 ±35%로 넓어집니다. 트레이더 계보 전용.', level: 70, job: 'marketMaker', cost: 3, bonus: { magic: 120, mana: 200 }, pnlCap: .35, exclusiveLineage: 'retailInvestor', core: { scale: { magic: .6 } }, masteryMilestones: M5 },
];
