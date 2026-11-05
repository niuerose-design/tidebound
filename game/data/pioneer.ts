/**
 * v3.464 아제로스 개척(docs/balance-rebirth.md 15절): 승천자가 세계석을 바쳐 서버 전체에 영구로 여는 아제로스 지역.
 * 지역마다 아제로스 히든 계보 셋이 묶여 있고(어느 계보인지는 서버 전용 표 secret/pioneer.ts), 지역이 열리면 그 계보에 숨은 조건 없이 들어갈 수 있습니다.
 * 누가 들어갈 수 있는지는 승천자 투표로 정합니다(15.4). 투표 전에는 승천자 전용입니다.
 */
export type PioneerRegionId = 'elwynn' | 'blackrock' | 'dalaran';
export type PioneerAccess = 'ascended' | 'all';
export type PioneerRegionDef = { id: PioneerRegionId; name: string; subtitle: string; desc: string; cost: number };
/** 열리는 순서대로. 비용은 세계석. 지인 서버에서 한 지역이 몇 주에 열리도록 승천자 한 바퀴의 세계석 수입(환생 100회 약 3,500)에 맞췄습니다. */
export const PIONEER_REGIONS: PioneerRegionDef[] = [
    { id: 'elwynn', name: '엘윈 숲', subtitle: '사냥의 기록이 잠든 숲', desc: '특별한 몬스터를 오래 쫓은 모험가들의 계보 셋이 잠들어 있습니다.', cost: 1500 },
    { id: 'blackrock', name: '검은바위 산', subtitle: '군주들의 그림자가 깔린 산', desc: '던전과 보스, 무릉도장을 거듭 오른 모험가들의 계보 셋이 잠들어 있습니다.', cost: 2500 },
    { id: 'dalaran', name: '달라란', subtitle: '신과 정수와 세계석의 도시', desc: '제단과 정수, 세계석을 끝까지 파고든 모험가들의 계보 셋이 잠들어 있습니다.', cost: 4000 },
];
export const pioneerRegionById = (id: string) => PIONEER_REGIONS.find(r => r.id === id);
export const PIONEER = {
    /** 서버 공용 저장 캐시. */
    cacheMs: 30_000,
    /** 투표 기간 72시간, 개최자 유예 7일, 다시 투표 30일(15.4). */
    voteMs: 72 * 3600_000, openerGraceMs: 7 * 86400_000, revoteMs: 30 * 86400_000,
    /** 한 번에 바칠 수 있는 세계석. */
    minOffer: 1, maxOffer: 10_000,
    boardSize: 10,
} as const;
export const pioneerAccessName = (a: PioneerAccess) => a === 'all' ? '모두에게 공개' : '승천자 전용';
export type PioneerVote = { by: string; byName: string; openedAt: number; until: number; choice: PioneerAccess; votes: Record<string, PioneerAccess> };
export type PioneerVoteResult = { by: string; byName: string; access: PioneerAccess; at: number; all: number; ascended: number; sole?: boolean };
/** 화면에 보내는 지역 정보. lineages는 이 모험가에게 드러난 계보 이름만 적고 아직 숨은 계보는 null입니다. */
export type PioneerRegionInfo = PioneerRegionDef & {
    points: number; open: boolean; openedAt?: number; openedBy?: string; access: PioneerAccess;
    lineages: (string | null)[];
    board: { name: string; points: number; self: boolean }[]; mine: number;
    vote: (PioneerVote & { mine?: PioneerAccess; all: number; ascended: number }) | null;
    result: PioneerVoteResult | null;
    /** 내가 지금 투표를 열 수 있는지. 못 열면 이유. */
    canOpenVote: boolean; openVoteWhy?: string;
};
export type PioneerInfo = { ascended: boolean; ascendedCount: number; regions: PioneerRegionInfo[]; next: PioneerRegionId | null };
/** 세이브에 동기화하는 개척 상태(서버가 채움): 열린 지역과 공개 범위. 전직 조건 판정이 읽습니다. */
export type PioneerStatus = { at: number; open: Partial<Record<PioneerRegionId, PioneerAccess>> };
