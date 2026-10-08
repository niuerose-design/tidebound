/**
 * v3.61 직업 역할(docs/concept.md 11장): 딜러 · 탱커 · 버퍼와 세부 역할. 역할은 직업마다 달고(계보 기본값 + 직업별 덮어쓰기),
 * 측정 도구(scripts/check-roles.mjs)와 화면 역할 표시가 씁니다. 게임 판정에는 쓰지 않습니다.
 * 비밀 직업(game/secret/jobs.ts)은 직업 데이터에 subRole을 직접 적습니다(계보 id만 여기 있음).
 */
import type { Job } from './classes';

export type RoleId = 'dealer' | 'tank' | 'buffer' | 'border' | 'none';
export type SubRoleId = 'physical' | 'magic' | 'status' | 'reflect' | 'control' | 'drain' | 'healer' | 'utility' | 'border' | 'borderBuffer' | 'borderReflect' | 'borderStand' | 'borderBuff' | 'training' | 'none';
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
    /** 독립 수련(계승 재료). */
    training: { role: 'none', name: '수련' },
    none: { role: 'none', name: '역할 없음' },
};

/** 계보 기본 역할(11.6-1). 독립 수련은 training. */
export const ROLE_BY_LINEAGE: Record<string, SubRoleId> = {
    harpoon: 'physical', tidalBrawler: 'physical', krakenkin: 'physical', ronin: 'physical', brawnFisher: 'physical', nimbleAngler: 'physical', luckyAngler: 'physical',
    squidJester: 'physical', spellbladeNovice: 'physical', brawnMage: 'physical', nerveNeedler: 'borderBuff', tideLancer: 'borderStand',
    tide: 'magic', chantNovice: 'magic', apprentice: 'magic', manaDevotee: 'magic',
    poisoner: 'status', shaman: 'status', bloodAngler: 'status',
    /** v3.151 일리움: 마력 평타 마법사(부식 디버프를 걸지만 피해의 축은 평타). */
    currentScholar: 'magic',
    warden: 'reflect', saltWarden: 'reflect', bulkyFisher: 'reflect',
    martialArtist: 'control', bellTurtle: 'control', stillAngler: 'control', runesmith: 'borderReflect',
    wanderer: 'drain',
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
    reefBrawler: 'drain', inkMime: 'utility', clockworkAngler: 'physical', allRounder: 'physical',
    glyphMonk: 'physical',
};
/** 직업의 세부 역할. 직업 데이터의 subRole(비밀 직업) → 직업별 덮어쓰기 → 계보 기본값 → none. */
export function subRoleOf(j: Pick<Job, 'id' | 'subRole'>, lineageId: string): SubRoleId {
    return j.subRole ?? ROLE_BY_JOB[j.id] ?? ROLE_BY_LINEAGE[lineageId] ?? 'none';
}
export const roleOf = (sub: SubRoleId) => SUB_ROLES[sub].role;
