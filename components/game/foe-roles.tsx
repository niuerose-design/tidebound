'use client';
import type { State } from '@/game/types';
import { jobById, lineageOf } from '@/game/data/classes';
import { SUB_ROLES, subRoleOf, foeStrategy, type SubRoleId } from '@/game/data/roles';

/** v3.182 지금 직업의 세부 역할(없으면 none). */
export function mySubRole(s: Pick<State, 'job'>): SubRoleId {
    const j = jobById(s.job);
    return j ? subRoleOf(j, lineageOf(j)) : 'none';
}

/** v3.182 몬스터 유형별 전략 안내 한 줄: 유리한 역할 목록. 내 역할이 들어 있으면 표시합니다(docs/concept.md 11.2 상성). */
export function FoeRoles({ s, profileId, tip = false }: { s: Pick<State, 'job'>; profileId: string; tip?: boolean }) {
    const st = foeStrategy(profileId);
    if (!st) return null;
    const mine = mySubRole(s), fits = st.good.includes(mine);
    return <em className={`foe-roles ${fits ? 'fits' : ''}`} title={st.tip}>
        유리한 역할 · {st.good.map(id => <span key={id} className={id === mine ? 'mine' : ''}>{SUB_ROLES[id].name}</span>)}{fits && <b>내 역할</b>}
        {tip && <small>{st.tip}</small>}
    </em>;
}
