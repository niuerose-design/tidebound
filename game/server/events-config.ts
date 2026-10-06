/**
 * v27.27 운영 페이지에서 바꾼 서버 이벤트(settings.events)와 v27.31 닫은 사냥터·던전(settings.closures)을
 * DB에서 읽어 게임 계산에 넣습니다. 인스턴스마다 30초 캐시라 두 설정 모두 30초에 한 번만 읽습니다.
 * v27.43 제단 축복(altar_gauges의 until)도 같은 30초 캐시로 읽습니다.
 */
import { db } from './db';
import { setRuntimeEvents, setAltarEvents, SERVER_EVENTS, type ServerEvent } from '../data/events';
import { BLESSINGS, blessingEffect } from '../data/altar';
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
/** 저장한 적이 없으면 기본값(무릉도장 닫힘). 모르는 id와 첫 사냥터는 버립니다. */
export async function readClosures(): Promise<Closures> {
    const raw = await db().getSetting(CLOSURES_KEY);
    if (!raw) return { dungeons: [...DEFAULT_CLOSURES.dungeons], stages: [...DEFAULT_CLOSURES.stages] };
    try { const v = JSON.parse(raw); return cleanClosures({ dungeons: Array.isArray(v?.dungeons) ? v.dungeons : [], stages: Array.isArray(v?.stages) ? v.stages : [] }); }
    catch { return { dungeons: [...DEFAULT_CLOSURES.dungeons], stages: [...DEFAULT_CLOSURES.stages] }; }
}
const cleanClosures = (c: Closures): Closures => ({ dungeons: [...new Set(c.dungeons)].filter(id => DUNGEONS.some(d => d.id === id)), stages: [...new Set(c.stages)].filter(id => id !== STAGES[0].id && STAGES.some(st => st.id === id)) });
/** 동기화·정산 전에 부릅니다. 30초 안에는 DB를 다시 읽지 않습니다. 읽기에 실패하면 지난 값(없으면 코드 기본값)을 씁니다. */
export async function refreshEvents(now = Date.now()) {
    if (cached && now - cached.at < TTL) return;
    try {
        const [config, closures, blessings] = await Promise.all([readEventConfig(), readClosures(), altarBlessingEvents(now)]);
        cached = { at: now, config }; setRuntimeEvents(config.extra, config.disabled); setClosures(closures); setAltarEvents(blessings);
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
/** 열려 있는 제단 축복을 서버 이벤트 형식으로. 시작 시각은 쓰지 않으므로 과거로 둡니다. 이름은 비워 이벤트 배너에 겹쳐 쓰지 않고, 제단 알림 줄이 따로 보여 줍니다. */
export async function altarBlessingEvents(now: number): Promise<ServerEvent[]> {
    const gauges = await db().listAltarGauges();
    return BLESSINGS.flatMap(b => {
        const g = gauges.find(x => x.id === b.id), until = g?.until || 0;
        // v27.48 축복 단계별 효과(단계가 없던 옛 행은 1단계).
        return until > now ? [{ id: `altar-${b.id}`, name: '', from: '2026-01-01T00:00:00+09:00', until: new Date(until).toISOString(), ...blessingEffect(b, Math.max(1, g?.level || 1)) }] : [];
    });
}
/** 축복이 막 열렸을 때 이 인스턴스는 30초를 기다리지 않고 바로 반영합니다. */
export async function refreshAltarEvents(now = Date.now()) { try { setAltarEvents(await altarBlessingEvents(now)); } catch { /* 다음 30초 갱신에서 반영 */ } }
