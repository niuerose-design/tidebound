/**
 * v27.62 동기화 응답의 로그 줄이기. 로그는 한 번 쓰이면 바뀌지 않고 뒤에 붙거나(최대 70줄) 앞에서 빠지기만 합니다.
 * 클라이언트가 마지막으로 받은 로그의 키를 보내면, 서버는 그 로그가 아직 목록에 있을 때만 그 뒤 로그만 보냅니다.
 * 환생 등으로 로그 번호가 처음부터 다시 시작하면 키가 맞지 않아 전체를 보냅니다. 동기화 응답의 약 절반이 로그였습니다.
 */
import type { Log } from '../types';

/** 로그 하나를 가리키는 키: 번호·턴·문구 길이. 번호가 다시 시작해도 다른 로그와 거의 겹치지 않습니다. */
export const logKey = (log: Pick<Log, 'id' | 'turn' | 'text'>) => `${log.id}:${log.turn ?? ''}:${log.text.length}`;
/** 응답에 붙는 정보: after까지는 클라이언트가 이미 가진 로그, first는 서버 목록의 첫 번호. */
export type LogDelta = { after: number; first: number };

/** 서버: 클라이언트가 가진 마지막 로그(key) 뒤의 로그만 남깁니다. 이어지지 않으면 null(전체 전송). */
export function trimLogs(logs: Log[], key: unknown): { logs: Log[]; delta: LogDelta } | null {
    if (typeof key !== 'string' || !logs.length) return null;
    const at = logs.findIndex(l => logKey(l) === key);
    if (at < 0) return null;
    return { logs: logs.slice(at + 1), delta: { after: logs[at].id, first: logs[0].id } };
}
/** 클라이언트: 가진 로그와 새 로그를 합쳐 서버 목록과 같게 만듭니다. 가진 로그에 이어 붙일 자리가 없으면 새 로그만 씁니다. */
export function mergeLogs(prev: Log[] | undefined, fresh: Log[], delta: LogDelta): Log[] {
    const kept = (prev || []).filter(l => l.id >= delta.first && l.id <= delta.after);
    return kept.at(-1)?.id === delta.after ? [...kept, ...fresh] : fresh;
}
