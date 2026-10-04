/**
 * v26.1 서버 이벤트: 기간 동안 모든 모험가의 경험치·골드·드롭 배율을 올립니다.
 * 목록은 이 파일에서 관리하고(배포로 적용), 서버가 동기화·정산 때 activeEvent(now)를 State.event에 적어 둡니다.
 * 틱 계산은 State.event만 보므로 오프라인 정산에도 같은 배율이 붙습니다. 시각은 ISO(한국 시간 +09:00) 문자열로 적습니다.
 */
export type ServerEvent = { id: string; name: string; from: string; until: string; exp?: number; gold?: number; drop?: number; mastery?: number; /** v27.43 숙련의 까미 출현 배율(제단 축복). */ mimic?: number };
/** State에 적히는 이벤트 요약(배율과 종료 시각만). */
export type ActiveEvent = { id: string; name: string; until: number; exp: number; gold: number; drop: number; mastery?: number; mimic?: number };

export const SERVER_EVENTS: ServerEvent[] = [
    { id: 'openbeta-exp', name: '오픈베타 기념', from: '2026-10-03T00:00:00+09:00', until: '2026-10-18T23:59:59+09:00', exp: 2 },
    // 이름은 배너 앞머리에 한 번씩만 붙습니다(배율은 뒤에 따로 나오므로 이름에 적지 않습니다). 빈 이름은 생략. 배율 없는 공지형 이벤트도 됩니다.
    { id: 'glyph-open', name: '숨겨진 직업 하나가 개방되었습니다', from: '2026-10-03T00:00:00+09:00', until: '2026-10-18T23:59:59+09:00' },
    { id: 'mastery-x2', name: '', from: '2026-10-03T00:00:00+09:00', until: '2026-10-18T23:59:59+09:00', mastery: 2 },
];

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
export const currentEvents = (withAltar = true) => [...SERVER_EVENTS.filter(e => !runtime.disabled.includes(e.id)), ...runtime.extra, ...(withAltar ? altar : [])];
export function activeEvent(now: number, events: ServerEvent[] = currentEvents()): ActiveEvent | null {
    const live = events.filter(e => Date.parse(e.from) <= now && now <= Date.parse(e.until));
    if (!live.length) return null;
    // 겹치면 배율은 곱하고, 이름은 이어 붙이고, 종료는 가장 이른 것으로 둡니다.
    return {
        id: live.map(e => e.id).join('+'), name: [...new Set(live.map(e => e.name).filter(Boolean))].join(' · '), until: Math.min(...live.map(e => Date.parse(e.until))),
        exp: live.reduce((m, e) => m * (e.exp ?? 1), 1), gold: live.reduce((m, e) => m * (e.gold ?? 1), 1), drop: live.reduce((m, e) => m * (e.drop ?? 1), 1), mastery: live.reduce((m, e) => m * (e.mastery ?? 1), 1), mimic: live.reduce((m, e) => m * (e.mimic ?? 1), 1),
    };
}
/** 이벤트 배너 문구: 배율과 종료일. */
export function eventLabel(e: ActiveEvent) {
    const parts = [e.exp !== 1 ? `경험치 ×${e.exp}` : '', e.gold !== 1 ? `골드 ×${e.gold}` : '', e.drop !== 1 ? `장비 드롭 ×${e.drop}` : '', (e.mastery ?? 1) !== 1 ? `숙련 ×${e.mastery}` : '', (e.mimic ?? 1) !== 1 ? `까미 출현 ×${e.mimic}` : ''].filter(Boolean);
    const d = new Date(e.until + 9 * 3600_000);
    return [e.name, ...parts, `${d.getUTCMonth() + 1}/${d.getUTCDate()}까지`].join(' · ');
}
