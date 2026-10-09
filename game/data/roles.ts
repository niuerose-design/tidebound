/**
 * v3.61 직업 역할(docs/concept.md 11장): 딜러 · 탱커 · 버퍼와 세부 역할. 역할은 직업마다 달고(계보 기본값 + 직업별 덮어쓰기),
 * 측정 도구(scripts/check-roles.mjs)와 화면 역할 표시가 씁니다. 게임 판정에는 쓰지 않습니다.
 * 비밀 직업(game/secret/jobs.ts)은 직업 데이터에 subRole을 직접 적습니다(계보 id만 여기 있음).
 */
import type { Job } from './classes';

export type RoleId = 'dealer' | 'tank' | 'buffer' | 'border' | 'none';
export type SubRoleId = 'physical' | 'magic' | 'status' | 'reflect' | 'control' | 'drain' | 'healer' | 'utility' | 'border' | 'borderBuffer' | 'borderReflect' | 'borderStand' | 'borderBuff' | 'borderHarmony' | 'borderTempo' | 'borderRecoil' | 'borderCore' | 'morph' | 'absorb' | 'training' | 'none';
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
    /** v3.221 코어 자기 버프와 모든 딜러 경계(어둠의 추종자: 보스 코어 수만큼 직접 피해 · 지속 피해 · 회복이 함께 커지는 자기 버프, 물리 · 마법 · 상태이상 · 회복 빌드 모두). */
    borderCore: { role: 'border', name: '경계: 코어 자기 버프 · 모든 딜러' },
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
