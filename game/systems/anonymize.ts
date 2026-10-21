/**
 * v3.375 세이브 익명화(재설계 3단계 픽스처용). 운영 세이브를 테스트 픽스처로 내보낼 때 사람을 알아볼 수 있는 값을 지웁니다.
 * - 모험가 이름 → 표본N, 계정 요약(account) · 길드(guildMember · guildStats) · 원정대 공유 코드(작성자 이름이 들어감) · 고스트 계정 기록 · 결투 상대 기록 삭제.
 * - 어디에 있든 author · memo · opponent · username · email 키의 문자열은 지웁니다(상대 이름 · 메모).
 * 게임 규칙 값(레벨 · 장비 · 도감 · 숙련 · 로그 문장)은 그대로라 마이그레이션 · 골든 테스트 입력으로 쓸 수 있습니다.
 */
import type { State } from '../types';

const WIPE_KEYS = new Set(['author', 'memo', 'opponent', 'username', 'email']);
const DROP_TOP: (keyof State)[] = ['account', 'guildMember', 'guildStats', 'expeditionTarget', 'duelDay'];

function scrub(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
            if (WIPE_KEYS.has(k)) { if (typeof x === 'string') out[k] = k === 'opponent' ? '상대' : ''; continue; }
            if (k === 'ghostSeen' || k === 'opponents') { out[k] = {}; continue; }
            out[k] = scrub(x);
        }
        return out;
    }
    return v;
}

/** 익명화한 복사본. n 은 표본 번호(이름 표본1 · 표본2 …). */
export function anonymizeState(s: State, n: number): State {
    const copy = scrub(s) as State;
    for (const k of DROP_TOP) delete (copy as Record<string, unknown>)[k as string];
    copy.name = `표본${n}`;
    if (copy.expeditionShareMemo !== undefined) copy.expeditionShareMemo = '';
    if (copy.expeditionRecent) copy.expeditionRecent = copy.expeditionRecent.map(r => { const { code: _code, ...rest } = r; void _code; return rest; });
    return copy;
}

/** 픽스처 파일 형식(tests/fixtures/saves/*.json). */
export type SaveFixtureFile = { kind: 'tidebound-save-fixtures'; build: string; saveVersion: number; exportedAt: string; count: number; saves: { id: string; slot: number; revision: number; updatedAt: number; level: number; rebirths: number; job: string; state: State }[] };
