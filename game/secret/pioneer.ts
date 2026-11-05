/** v3.464 아제로스 개척 지역 ↔ 히든 계보(직업) 표. 계보 이름이 비밀이라 서버 전용입니다(docs/concept.md 10.2). */
import 'server-only';
import type { State } from '../types';
import type { PioneerRegionId } from '../data/pioneer';
import { ascended } from '../data/ascension';

export const PIONEER_REGION_JOBS: Record<PioneerRegionId, string[]> = {
    elwynn: ['kkamiHunter', 'nuriTracker', 'variantScholar'],
    blackrock: ['darkFollower', 'onyxAvatar', 'abyssAscetic'],
    dalaran: ['altarPilgrim', 'essenceDevourer', 'pearlMiner'],
    stormwind: ['lightbringer', 'felcaller', 'deathKnight'],
    /** 코프룰루는 히든 직업이 아니라 환생 조건을 푸는 지역이라 직업 표가 비어 있습니다(공개 계보는 server/pioneer가 이름을 그대로 적음). */
    koprulu: [],
};
export const pioneerRegionOf = (jobId: string): PioneerRegionId | null => (Object.entries(PIONEER_REGION_JOBS).find(([, jobs]) => jobs.includes(jobId))?.[0] as PioneerRegionId | undefined) ?? null;
/** 개척으로 열린 지역의 계보인지: 세이브에 동기화된 개척 상태(pioneerStatus)와 공개 범위로 판정합니다. 승천자 전용이면 승천자만. */
export function pioneerOpen(s: Partial<State>, jobId: string) {
    const region = pioneerRegionOf(jobId); if (!region) return false;
    const access = s.pioneerStatus?.open?.[region];
    return !!access && (access === 'all' || ascended(s as { ascension?: number }));
}
