/**
 * v3.61 직업 역할(docs/concept.md 11장): 딜러 · 탱커 · 버퍼와 세부 역할. 역할은 직업마다 달고(계보 기본값 + 직업별 덮어쓰기),
 * 측정 도구(scripts/check-roles.mjs)와 화면 역할 표시가 씁니다. 게임 판정에는 쓰지 않습니다.
 * 비밀 직업(game/secret/jobs.ts)은 직업 데이터에 subRole을 직접 적습니다(계보 id만 여기 있음).
 */
import type { Job } from './classes';

export type RoleId = 'dealer' | 'tank' | 'buffer' | 'border' | 'none';
export type SubRoleId = 'physical' | 'magic' | 'status' | 'reflect' | 'control' | 'drain' | 'healer' | 'utility' | 'border' | 'borderBuffer' | 'borderReflect' | 'borderStand' | 'borderBuff' | 'borderHarmony' | 'borderTempo' | 'borderRecoil' | 'morph' | 'absorb' | 'training' | 'none';
export const SUB_ROLES: Record<SubRoleId, { role: RoleId; name: string }> = {
    physical: { role: 'dealer', name: '물리 딜러' },
    magic: { role: 'dealer', name: '마법 딜러' },
    status: { role: 'dealer', name: '상태이상 딜러' },
    reflect: { role: 'tank', name: '반사 탱커' },
    control: { role: 'tank', name: '제어 탱커' },
    drain: { role: 'tank', name: '흡혈 탱커' },
    healer: { role: 'buffer', name: '힐러' },
    utility: { role: 'buffer', name: '유틸리티' },
    /** 일부러 역할 경계에 선 히든 직업(제로). */
    border: { role: 'border', name: '경계: 딜러 · 제어 탱커' },
    /** v3.80 일부러 힐러와 유틸리티 경계에 선 직업(아이돌 연습생: 회복 + 경험치). */
    borderBuffer: { role: 'border', name: '경계: 힐러 · 유틸리티' },
    /** v3.143 반사 탱커와 마법 딜러 경계(메카닉: 약화 → 방어 비례 마법 피해로 충전 → 전탄발사). */
    borderReflect: { role: 'border', name: '경계: 반사 탱커 · 마법 딜러' },
    /** v3.144 딜러와 불굴 탱커 경계(다크나이트: 쓰러진 횟수 · 보낸 턴에 비례해 강해지고, 5차 리인카네이션으로 한 번 버팀). */
    borderStand: { role: 'border', name: '경계: 딜러 · 불굴 탱커' },
    /** v3.155 자기 버프 지원과 물리 딜러 경계(카데나: 체인아츠마다 서로 다른 자기 버프, 살아 있는 버프 수만큼 피해). */
    borderBuff: { role: 'border', name: '경계: 자기 버프 · 물리 딜러' },
    /** v3.163 조화 딜러와 회피 탱커 경계(제논: 여섯 능력치가 고를수록 세지고, 명중 · 회피 패시브로 버티며, 메가 스매셔는 회피 무시 고정 피해). */
    borderHarmony: { role: 'border', name: '경계: 조화 딜러 · 회피 탱커' },
    /** v3.164 추가타 딜러와 가속 지원 경계(스트라이커: 추가타가 명중할 때마다 전류 자기 버프가 길어지고, 전류 중 추가타가 늘어남). */
    borderTempo: { role: 'border', name: '경계: 추가타 딜러 · 가속 지원' },
    /** v3.172 반동 탱커와 체질 딜러 경계(블래스터: 받은 피해가 반동 게이지(충전)로 쌓이고, 실린더 버스트 · 벙커 버스터가 모두 소모해 터뜨림). */
    borderRecoil: { role: 'border', name: '경계: 반동 탱커 · 체질 딜러' },
    /** v3.163 변신 탱커(카이저: 맞을 때 충전이 쌓여 파이널 피규레이션으로 변신). */
    morph: { role: 'tank', name: '변신 탱커' },
    /** v3.172 흡수 탱커(라라: 행동마다 마나를 체력으로 바꿔 버팀). */
    absorb: { role: 'tank', name: '흡수 탱커' },
    /** 독립 수련(계승 재료). */
    training: { role: 'none', name: '수련' },
    none: { role: 'none', name: '역할 없음' },
};

/** 계보 기본 역할(11.6-1). 독립 수련은 training. */
export const ROLE_BY_LINEAGE: Record<string, SubRoleId> = {
    harpoon: 'physical', tidalBrawler: 'borderTempo', krakenkin: 'physical', ronin: 'physical', brawnFisher: 'physical', nimbleAngler: 'physical', luckyAngler: 'physical',
    squidJester: 'physical', spellbladeNovice: 'physical', brawnMage: 'physical', nerveNeedler: 'borderBuff', tideLancer: 'borderStand',
    tide: 'magic', chantNovice: 'magic', apprentice: 'magic', manaDevotee: 'magic',
    poisoner: 'status', shaman: 'status', bloodAngler: 'status',
    /** v3.151 일리움: 마력 평타 마법사(부식 디버프를 걸지만 피해의 축은 평타). */
    currentScholar: 'magic',
    warden: 'reflect', saltWarden: 'reflect', bulkyFisher: 'borderRecoil',
    martialArtist: 'control', bellTurtle: 'morph', stillAngler: 'absorb', runesmith: 'borderReflect',
    wanderer: 'borderHarmony',
    /** v3.140 루미너스: 마법 공격 계수로 물리 피해를 주는 역전 딜러(지능 기반이라 마법 딜러로 셈). */
    paladin: 'magic',
    seagrassKeeper: 'healer',
    fishWhisperer: 'utility', salvageMerchant: 'utility', voyageScribe: 'utility', relicScavenger: 'utility', bard: 'utility', bossNaturalist: 'utility',
    fisher: 'none',
    'physical-independent': 'training', 'magic-independent': 'training', 'defense-independent': 'training',
    'status-independent': 'training', 'hybrid-independent': 'training', 'support-independent': 'training',
};
/** 계보 기본값과 다른 직업(갈림길·곁가지). */
export const ROLE_BY_JOB: Record<string, SubRoleId> = {
    oracle: 'healer', lunarOracle: 'healer', coralSaint: 'healer', tideMender: 'healer', tidalSinger: 'borderBuffer',
    reefBrawler: 'drain',
    glyphMonk: 'physical',
};
/** 직업의 세부 역할. 직업 데이터의 subRole(비밀 직업) → 직업별 덮어쓰기 → 계보 기본값 → none. */
export function subRoleOf(j: Pick<Job, 'id' | 'subRole'>, lineageId: string): SubRoleId {
    return j.subRole ?? ROLE_BY_JOB[j.id] ?? ROLE_BY_LINEAGE[lineageId] ?? 'none';
}
export const roleOf = (sub: SubRoleId) => SUB_ROLES[sub].role;

/** v3.182 역할 큰 묶음 이름 · 한 줄 설명(화면 표시용). */
export const ROLES: Record<RoleId, { name: string; desc: string }> = {
    dealer: { name: '딜러', desc: '처치 속도가 강점. 생존은 스스로 챙겨야 합니다.' },
    tank: { name: '탱커', desc: '안전성이 강점. 처치는 느린 대신 던전 · 보스 · 무리에서 버팁니다.' },
    buffer: { name: '버퍼', desc: '회복이나 획득량으로 성장을 돕습니다. 전투는 중간 이하.' },
    border: { name: '경계', desc: '두 역할의 사이에 일부러 선 직업. 고유 장치가 두 쪽을 잇습니다.' },
    none: { name: '역할 없음', desc: '수련 · 초보자 · 해커처럼 역할 체계 밖의 직업입니다.' },
};

/**
 * v3.182 세부 역할 안내(docs/concept.md 11.2 역할 정의): 강점 · 약점 · 잘하는 곳. 직업 상세와 도움말 ‘역할과 상성’에 보입니다.
 * 경계 · 변신 · 흡수처럼 뒤에 생긴 역할은 그 장치를 한 줄로 적습니다. 수련 · 역할 없음은 안내가 없습니다.
 */
export const ROLE_GUIDE: Partial<Record<SubRoleId, { strong: string; weak: string; place: string }>> = {
    physical: { strong: '파밍 속도(시간당 처치). 치명 · 연타 · 관통', weak: '생존. 보스 · 던전에서 위험', place: '일반 사냥터' },
    magic: { strong: '파밍 속도. 고정 배율 · 마나 관리, 물리 방어가 높은 적에게 우위(회피를 절반만 받음)', weak: '생존, 마나가 마르면 약해짐. 마법 방어가 높은 적', place: '일반 사냥터, 단단한 껍질 몬스터' },
    status: { strong: '지속 피해(출혈 · 중독 · 화상)가 방어 · 회피 · 반격을 무시하고 체력에도 비례 → 체력 · 방어가 높은 상대(탱커 · 보스 · 무리)에 강함', weak: '체력이 낮은 일반 몬스터는 지속 피해가 다 들어가기 전에 끝나 빨리 못 잡음', place: '보스, 무리, 결투에서 탱커 상대' },
    reflect: { strong: '안전성. 방어 · 체력 · 반격(방어 비례)으로 추가타가 많은 적을 갈아 냄', weak: '처치 속도 느림, 방어를 무시하는 지속 피해에 약함', place: '던전, 보스, 무리 사냥' },
    control: { strong: '안전성. 기절 · 감속 · 침묵 · 약화로 맞을 일을 줄임', weak: '처치 속도 느림, 제어 면역(보스) 앞에서 약해짐', place: '던전, 위험한 적' },
    drain: { strong: '안전성. 흡혈 · 자가 회복으로 버팀', weak: '순간 피해에 약함', place: '장기전, 무리' },
    morph: { strong: '맞을 때마다 충전이 쌓여 변신하면 피해 · 흡혈 · 속도가 함께 오름', weak: '변신 전에는 평범한 탱커, 각성은 변신 중에만', place: '길게 맞는 보스 · 던전' },
    absorb: { strong: '행동마다 마나를 체력으로 바꿔 버팀, 침묵으로 적 액티브를 막음', weak: '마나가 마르면 회복도 멎음. 처치 속도가 매우 느림', place: '장기전, 마법 방어가 낮은 적' },
    healer: { strong: '회복 · 재생으로 생존, 넘친 회복은 피해로', weak: '처치 속도 중간 이하', place: '던전, 보스, 지속 피해를 거는 적' },
    utility: { strong: '획득량(골드 · 경험치 · 숙련 · 드롭 · 변종 · 황금) 증가, 능력치 고른 육각형', weak: '단일 최고치 없음', place: '어디든 무난, 장기 성장' },
    border: { strong: '딜러의 피해와 제어 탱커의 제어를 함께', weak: '어느 한쪽의 최고치는 아님', place: '던전, 위험한 적' },
    borderBuffer: { strong: '회복과 경험치 획득을 함께', weak: '회복량 · 획득량 모두 본가보다 낮음', place: '장기 성장' },
    borderReflect: { strong: '약화 → 방어 비례 마법 피해로 충전 → 전탄발사(고정 피해, 방어 무시)', weak: '충전이 차기 전에는 느림', place: '던전, 방어가 높은 보스' },
    borderStand: { strong: '쓰러진 횟수 · 보낸 턴에 비례해 강해지고 리인카네이션으로 한 번 버팀', weak: '기록이 없는 초반에는 평범함', place: '장기전, 보스' },
    borderBuff: { strong: '체인아츠마다 다른 자기 버프, 살아 있는 버프 수만큼 피해', weak: '버프가 끊기면 피해가 내려감', place: '긴 전투, 보스' },
    borderHarmony: { strong: '여섯 능력치가 고를수록 세지고 명중 · 회피로 버팀, 메가 스매셔는 회피 무시 고정 피해', weak: '한 능력치에 몰면 약함', place: '회피 · 명중이 갈리는 적' },
    borderTempo: { strong: '추가타가 명중할 때마다 전류 자기 버프가 길어지고 추가타가 늘어남', weak: '명중이 빗나가면 전류가 끊김', place: '회피가 낮은 적, 긴 전투' },
    borderRecoil: { strong: '받은 피해가 반동 게이지로 쌓이고 실린더 버스트 · 벙커 버스터가 모두 소모해 터뜨림', weak: '맞지 않으면 게이지가 차지 않음', place: '공격이 센 보스' },
};

/** v3.182 상성(결정, 11.2): 몬스터 유형 전략 안내의 기준. 결투 밸런스 목표는 아닙니다. */
export const MATCHUP = { order: ['status', 'tank', 'dealer'] as const, text: '상태이상 딜러 > 탱커 > 물리 · 마법 딜러 > 상태이상 딜러', why: '지속 피해는 방어 · 반격을 무시하고 체력에 비례해 탱커를 녹이고, 탱커는 딜러의 직접 피해를 방어 · 반격으로 받아 내고, 딜러는 체력이 낮은 상태이상 딜러를 지속 피해가 다 들어가기 전에 끝냅니다.' };

/**
 * v3.182 몬스터 유형(encounters.ts PROFILES의 성향)별 전략 안내: 유리한 세부 역할과 이유. 도감 · 전투 · 도움말에 보이고 판정에는 쓰지 않습니다.
 * 기준: 물리 방어가 높으면 마법 · 지속 피해, 마법 방어가 높으면 물리 · 지속 피해, 지속 피해를 걸면 회복(힐러 · 흡혈 · 흡수), 추가타가 잦으면 반격(반사 탱커), 제어를 걸면 제어 탱커(보스는 면역이라 제외).
 */
export const FOE_STRATEGY: Record<string, { good: SubRoleId[]; tip: string }> = {
    swift: { good: ['magic', 'physical', 'healer'], tip: '회피가 높아 마법 기술(회피 절반)과 명중 패시브가 안정적입니다. 가시 출혈은 회복으로 버팁니다.' },
    armored: { good: ['magic', 'status'], tip: '물리 방어는 2.2배, 마법 방어는 절반 수준입니다. 마법 피해와 방어를 무시하는 지속 피해가 통합니다.' },
    arcane: { good: ['physical', 'status'], tip: '마법 방어가 2.1배라 마법 딜러가 막힙니다. 물리 피해 · 지속 피해로 뚫고 마법 방어로 마력 평타를 받습니다.' },
    venom: { good: ['healer', 'drain', 'absorb'], tip: '출혈 틱은 방어로 줄지 않으니 회복 · 흡혈로 되찾는 쪽이 유리합니다.' },
    silencer: { good: ['physical', 'reflect'], tip: '침묵이 액티브를 봉인하니 기본 공격 비중이 큰 물리 딜러와 침묵과 무관한 반격이 유리합니다. 마법 피해는 마법 방어로.' },
    controller: { good: ['status', 'reflect', 'control'], tip: '감속 · 기절로 턴을 빼앗습니다. 지속 피해는 기절 중에도 들어가고, 탱커는 버티며 기절로 되갚습니다.' },
    blaze: { good: ['healer', 'absorb', 'reflect'], tip: '화상 중에는 받는 직접 피해가 커지니 회복과 마법 방어로 버티고, 추가타는 반격으로 갈아 냅니다.' },
    frenzy: { good: ['reflect', 'control'], tip: '추가타가 잦아 맞을 때마다 돌려주는 반격이 많이 터지고, 기절 · 감속이 연타를 끊습니다.' },
    venomBoss: { good: ['healer', 'status'], tip: '출혈 · 감속 보스. 회복으로 버티고 큰 체력은 지속 피해로 녹입니다. 제어는 면역입니다.' },
    arcaneBoss: { good: ['physical', 'reflect'], tip: '마법 공격 · 침묵 보스. 마법 방어로 받고 침묵과 무관한 기본 공격 · 반격이 통합니다. 제어는 면역입니다.' },
    boss: { good: ['status', 'reflect', 'healer'], tip: '체력이 커 지속 피해 몫이 크고, 추가타 · 복합 강타는 반격 · 회복으로 받습니다. 제어는 면역입니다.' },
    tidal: { good: ['reflect', 'healer'], tip: '기본 공격이 복합 피해라 물리 · 마법 방어를 고루 갖춘 탱커와 회복이 안정적입니다.' },
    stormEel: { good: ['physical', 'reflect'], tip: '마법(전격) 피해와 감속. 마법 방어로 받고 물리 피해로 뚫습니다.' },
    onyxDusk: { good: ['healer', 'reflect'], tip: '약화 · 출혈 · 기절을 거는 물리 보스. 상태이상 저항과 회복, 방어로 버팁니다.' },
    onyxDunkel: { good: ['reflect', 'healer'], tip: '빠르고 추가타가 잦은 물리 보스. 반격이 많이 터지고, 연타는 회복으로 버팁니다(제어는 면역).' },
    onyxWill: { good: ['status', 'reflect'], tip: '복합 피해에 감속 · 기절 · 침묵. 기절 중에도 들어가는 지속 피해와 두 방어를 갖춘 탱커.' },
    onyxLucid: { good: ['physical', 'reflect'], tip: '마법 피해만 주고 침묵 · 약화를 겁니다. 마법 방어로 받고 기본 공격 · 반격으로 때립니다.' },
    onyxHilla: { good: ['physical', 'magic', 'healer'], tip: '중독을 걸고 흡혈로 되찾는 보스. 빨리 끝내는 딜러나 중독을 버티는 회복이 유리합니다.' },
    onyxSeren: { good: ['healer', 'absorb'], tip: '화상을 쌓고 가속으로 몰아치는 마법 보스. 회복과 마법 방어로 버팁니다.' },
    onyxBlackMage: { good: ['status', 'healer'], tip: '침묵 · 감속 · 약화 · 복합 강타를 모두 씁니다. 큰 체력은 지속 피해로, 공세는 회복으로.' },
};
/** 몬스터 유형 id로 전략 안내를 찾습니다(없는 유형은 undefined). */
export const foeStrategy = (profileId: string) => FOE_STRATEGY[profileId];
