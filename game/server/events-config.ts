/** v27.27 운영 페이지에서 바꾼 서버 이벤트를 DB(settings.events)에서 읽어 게임 계산에 넣습니다. 인스턴스마다 30초 캐시. */
import { db } from './db';
import { setRuntimeEvents, SERVER_EVENTS, type ServerEvent } from '../data/events';

export type EventConfig = { extra: ServerEvent[]; disabled: string[] };
const KEY = 'events', TTL = 30_000;
let cached: { at: number; config: EventConfig } | null = null;

export async function readEventConfig(): Promise<EventConfig> {
    const raw = await db().getSetting(KEY);
    try { const v = raw ? JSON.parse(raw) : null; return { extra: Array.isArray(v?.extra) ? v.extra : [], disabled: Array.isArray(v?.disabled) ? v.disabled : [] }; }
    catch { return { extra: [], disabled: [] }; }
}
/** 동기화·정산 전에 부릅니다. 30초 안에는 DB를 다시 읽지 않습니다. 읽기에 실패하면 지난 값(없으면 코드 이벤트만)을 씁니다. */
export async function refreshEvents(now = Date.now()) {
    if (cached && now - cached.at < TTL) return;
    try { const config = await readEventConfig(); cached = { at: now, config }; setRuntimeEvents(config.extra, config.disabled); }
    catch { cached = { at: now, config: cached?.config ?? { extra: [], disabled: [] } }; }
}
export async function writeEventConfig(config: EventConfig, now = Date.now()) {
    const clean: EventConfig = { extra: config.extra, disabled: config.disabled.filter(id => SERVER_EVENTS.some(e => e.id === id)) };
    await db().setSetting(KEY, JSON.stringify(clean), now);
    cached = { at: now, config: clean };
    setRuntimeEvents(clean.extra, clean.disabled);
}
