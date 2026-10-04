/**
 * v27.27 운영 페이지에서 바꾼 서버 이벤트(settings.events)와 v27.31 닫은 낚시터·던전(settings.closures)을
 * DB에서 읽어 게임 계산에 넣습니다. 인스턴스마다 30초 캐시라 두 설정 모두 30초에 한 번만 읽습니다.
 */
import { db } from './db';
import { setRuntimeEvents, SERVER_EVENTS, type ServerEvent } from '../data/events';
import { DEFAULT_CLOSURES, DUNGEONS, STAGES, setClosures, type Closures } from '../data/world';

export type EventConfig = { extra: ServerEvent[]; disabled: string[] };
const KEY = 'events', TTL = 30_000;
let cached: { at: number; config: EventConfig } | null = null;

export async function readEventConfig(): Promise<EventConfig> {
    const raw = await db().getSetting(KEY);
    try { const v = raw ? JSON.parse(raw) : null; return { extra: Array.isArray(v?.extra) ? v.extra : [], disabled: Array.isArray(v?.disabled) ? v.disabled : [] }; }
    catch { return { extra: [], disabled: [] }; }
}
const CLOSURES_KEY = 'closures';
/** 저장한 적이 없으면 기본값(무한 심연 닫힘). 모르는 id와 첫 낚시터는 버립니다. */
export async function readClosures(): Promise<Closures> {
    const raw = await db().getSetting(CLOSURES_KEY);
    if (!raw) return { dungeons: [...DEFAULT_CLOSURES.dungeons], stages: [...DEFAULT_CLOSURES.stages] };
    try { const v = JSON.parse(raw); return cleanClosures({ dungeons: Array.isArray(v?.dungeons) ? v.dungeons : [], stages: Array.isArray(v?.stages) ? v.stages : [] }); }
    catch { return { dungeons: [...DEFAULT_CLOSURES.dungeons], stages: [...DEFAULT_CLOSURES.stages] }; }
}
export const cleanClosures = (c: Closures): Closures => ({ dungeons: [...new Set(c.dungeons)].filter(id => DUNGEONS.some(d => d.id === id)), stages: [...new Set(c.stages)].filter(id => id !== STAGES[0].id && STAGES.some(st => st.id === id)) });
/** 동기화·정산 전에 부릅니다. 30초 안에는 DB를 다시 읽지 않습니다. 읽기에 실패하면 지난 값(없으면 코드 기본값)을 씁니다. */
export async function refreshEvents(now = Date.now()) {
    if (cached && now - cached.at < TTL) return;
    try {
        const [config, closures] = await Promise.all([readEventConfig(), readClosures()]);
        cached = { at: now, config }; setRuntimeEvents(config.extra, config.disabled); setClosures(closures);
    }
    catch { cached = { at: now, config: cached?.config ?? { extra: [], disabled: [] } }; }
}
export async function writeClosures(c: Closures, now = Date.now()) {
    const clean = cleanClosures(c);
    await db().setSetting(CLOSURES_KEY, JSON.stringify(clean), now);
    setClosures(clean);
    return clean;
}
export async function writeEventConfig(config: EventConfig, now = Date.now()) {
    const clean: EventConfig = { extra: config.extra, disabled: config.disabled.filter(id => SERVER_EVENTS.some(e => e.id === id)) };
    await db().setSetting(KEY, JSON.stringify(clean), now);
    cached = { at: now, config: clean };
    setRuntimeEvents(clean.extra, clean.disabled);
}
