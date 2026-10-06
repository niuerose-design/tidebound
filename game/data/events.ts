/**
 * v26.1 서버 이벤트: 기간 동안 모든 모험가의 경험치·골드·드롭 배율을 올립니다.
 * v27.73부터 목록은 운영 페이지에서만 관리합니다(코드 목록은 비움). 서버가 동기화·정산 때 activeEvent(now)를 State.event에 적어 둡니다.
 * 틱 계산은 State.event만 보므로 오프라인 정산에도 같은 배율이 붙습니다. 시각은 ISO(한국 시간 +09:00) 문자열로 적습니다.
 */
export type ServerEvent = { id: string; name: string; from: string; until: string; exp?: number; gold?: number; drop?: number; mastery?: number; /** v27.43 숙련의 까미 출현 배율(제단 축복). */ mimic?: number; /** v27.70 경험의 누리 출현 배율(제단 축복). */ nuri?: number };
/** State에 적히는 이벤트 요약(배율과 종료 시각만). */
export type ActiveEvent = { id: string; name: string; until: number; exp: number; gold: number; drop: number; mastery?: number; mimic?: number; nuri?: number; /** v27.44 제단 축복이 섞였을 때 배너용(축복을 뺀 이벤트, 없으면 null). 축복은 제단 알림이 따로 보여 줍니다. */ banner?: ActiveEvent | null };

/**
 * v27.51 오프라인 정산(1분 넘게 밀린 정산) 배율: 정산하는 순간 열려 있는 이벤트·제단 축복 배율의 절반만큼(×m → ×(1 + (m − 1) × OFFLINE_EVENT_SCALE)).
 * 백그라운드 탭에서는 동기화가 멈춰 오프라인 정산이 되므로, 탭을 화면에 띄워 두지 않아도 이벤트를 일부 받습니다. 계산량은 같습니다.
 */
export const OFFLINE_EVENT_SCALE = .5;
const halfOf = (m: number | undefined) => m === undefined ? undefined : 1 + (m - 1) * OFFLINE_EVENT_SCALE;
export function offlineEvent(e: ActiveEvent | null): ActiveEvent | null {
    if (!e) return null;
    return { ...e, exp: halfOf(e.exp)!, gold: halfOf(e.gold)!, drop: halfOf(e.drop)!, mastery: halfOf(e.mastery), mimic: halfOf(e.mimic), nuri: halfOf(e.nuri) };
}

/**
 * v27.73 코드에 든 이벤트는 없습니다. 이벤트·서버 메시지(배율 없는 공지)는 모두 운영 페이지(/admin)에서 만들어 DB 설정으로 적용합니다.
 * 코드 이벤트가 다시 필요하면 여기에 적습니다. 이름은 배너 앞머리에 한 번씩만 붙고(배율은 뒤에 따로), 빈 이름은 생략됩니다.
 */
export const SERVER_EVENTS: ServerEvent[] = [];

/** v27.27 운영 페이지에서 추가·끈 이벤트. 서버가 DB 설정을 읽어 채웁니다(코드 이벤트는 disabled로만 끌 수 있음). */
let runtime: { extra: ServerEvent[]; disabled: string[] } = { extra: [], disabled: [] };
export function setRuntimeEvents(extra: ServerEvent[], disabled: string[]) { runtime = { extra, disabled }; }
/** v27.43 제단 축복. 서버가 제단 게이지 표를 읽어 채웁니다(운영 설정과 따로 둬서 서로 덮어쓰지 않음). */
let altar: ServerEvent[] = [];
export function setAltarEvents(list: ServerEvent[]) { altar = list; }
/**
 * 지금 적용 대상인 이벤트 목록: 코드 이벤트(끈 것 제외) + 운영 페이지 이벤트 + 제단 축복.
 * 제단 축복은 1시간 남짓이라 오프라인 정산(최대 수십 시간)에는 넣지 않습니다(withAltar = false).
 */
/** v3.25 해킹 II 이벤트 변조: 이벤트 id → 남은 시간(분)·배율(%p) 조정. 서버가 해킹 설정(hacks)을 읽어 채웁니다. 제단 축복은 변조할 수 없습니다. */
let tamper: Record<string, { minutes: number; rate: number }> = {};
export function setEventTamper(t: Record<string, { minutes: number; rate: number }>) { tamper = t; }
const tweak = (m: number | undefined, rate: number) => m === undefined || m === 1 ? m : Math.max(1, Math.round((m + rate) * 100) / 100);
/** 변조를 적용한 이벤트. 배율은 정해진 배율(경험치·골드·드롭·숙련)에만 더하고 ×1.0 아래로는 내리지 않습니다. */
export function tamperedEvent(e: ServerEvent): ServerEvent {
    const t = tamper[e.id];
    if (!t) return e;
    return { ...e, until: new Date(Date.parse(e.until) + t.minutes * 60_000).toISOString(), exp: tweak(e.exp, t.rate), gold: tweak(e.gold, t.rate), drop: tweak(e.drop, t.rate), mastery: tweak(e.mastery, t.rate) };
}
/** v3.28 해킹 IX DDoS로 열린 이벤트(id는 hack-로 시작). 서버가 해킹 설정(hacks)을 읽어 채웁니다. 변조 대상이 아닙니다. */
let hacked: ServerEvent[] = [];
export function setHackEvents(list: ServerEvent[]) { hacked = list; }
export const currentEvents = (withAltar = true) => [...SERVER_EVENTS.filter(e => !runtime.disabled.includes(e.id)), ...runtime.extra].map(tamperedEvent).concat(hacked, withAltar ? altar : []);
export function activeEvent(now: number, events: ServerEvent[] = currentEvents()): ActiveEvent | null {
    const live = events.filter(e => Date.parse(e.from) <= now && now <= Date.parse(e.until));
    if (!live.length) return null;
    const others = live.filter(e => !e.id.startsWith('altar-'));
    const banner = others.length < live.length ? { banner: others.length ? activeEvent(now, others) : null } : {};
    // 겹치면 배율은 곱하고, 이름은 이어 붙이고, 종료는 가장 이른 것으로 둡니다.
    return {
        id: live.map(e => e.id).join('+'), name: [...new Set(live.map(e => e.name).filter(Boolean))].join(' · '), until: Math.min(...live.map(e => Date.parse(e.until))),
        exp: live.reduce((m, e) => m * (e.exp ?? 1), 1), gold: live.reduce((m, e) => m * (e.gold ?? 1), 1), drop: live.reduce((m, e) => m * (e.drop ?? 1), 1), mastery: live.reduce((m, e) => m * (e.mastery ?? 1), 1), mimic: live.reduce((m, e) => m * (e.mimic ?? 1), 1), nuri: live.reduce((m, e) => m * (e.nuri ?? 1), 1), ...banner,
    };
}
/** 이벤트 배너 문구: 배율과 종료일. */
export function eventLabel(e: ActiveEvent) {
    const parts = [e.exp !== 1 ? `경험치 ×${e.exp}` : '', e.gold !== 1 ? `골드 ×${e.gold}` : '', e.drop !== 1 ? `장비 드롭 ×${e.drop}` : '', (e.mastery ?? 1) !== 1 ? `숙련 ×${e.mastery}` : '', (e.mimic ?? 1) !== 1 ? `까미 출현 ×${e.mimic}` : '', (e.nuri ?? 1) !== 1 ? `누리 출현 ×${e.nuri}` : ''].filter(Boolean);
    const d = new Date(e.until + 9 * 3600_000);
    return [e.name, ...parts, `${d.getUTCMonth() + 1}/${d.getUTCDate()}까지`].join(' · ');
}
