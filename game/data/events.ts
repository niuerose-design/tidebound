/**
 * v26.1 서버 이벤트: 기간 동안 모든 낚시꾼의 경험치·골드·드롭 배율을 올립니다.
 * 목록은 이 파일에서 관리하고(배포로 적용), 서버가 동기화·정산 때 activeEvent(now)를 State.event에 적어 둡니다.
 * 틱 계산은 State.event만 보므로 오프라인 정산에도 같은 배율이 붙습니다. 시각은 ISO(한국 시간 +09:00) 문자열로 적습니다.
 */
export type ServerEvent = { id: string; name: string; from: string; until: string; exp?: number; gold?: number; drop?: number; mastery?: number };
/** State에 적히는 이벤트 요약(배율과 종료 시각만). */
export type ActiveEvent = { id: string; name: string; until: number; exp: number; gold: number; drop: number; mastery?: number };

export const SERVER_EVENTS: ServerEvent[] = [
    { id: 'openbeta-exp', name: '오픈베타 기념 경험치 2배', from: '2026-10-03T00:00:00+09:00', until: '2026-10-18T23:59:59+09:00', exp: 2 },
    // 배율 없는 공지형 이벤트: 玄 상시 개방 안내.
    { id: 'glyph-open', name: '숨겨진 직업 하나가 개방되었습니다', from: '2026-10-03T00:00:00+09:00', until: '2026-10-18T23:59:59+09:00' },
    { id: 'mastery-x2', name: '숙련도 2배', from: '2026-10-03T00:00:00+09:00', until: '2026-10-18T23:59:59+09:00', mastery: 2 },
];

export function activeEvent(now: number, events: ServerEvent[] = SERVER_EVENTS): ActiveEvent | null {
    const live = events.filter(e => Date.parse(e.from) <= now && now <= Date.parse(e.until));
    if (!live.length) return null;
    // 겹치면 배율은 곱하고, 이름은 이어 붙이고, 종료는 가장 이른 것으로 둡니다.
    return {
        id: live.map(e => e.id).join('+'), name: live.map(e => e.name).join(' · '), until: Math.min(...live.map(e => Date.parse(e.until))),
        exp: live.reduce((m, e) => m * (e.exp ?? 1), 1), gold: live.reduce((m, e) => m * (e.gold ?? 1), 1), drop: live.reduce((m, e) => m * (e.drop ?? 1), 1), mastery: live.reduce((m, e) => m * (e.mastery ?? 1), 1),
    };
}
/** 이벤트 배너 문구: 배율과 종료일. */
export function eventLabel(e: ActiveEvent) {
    const parts = [e.exp !== 1 ? `경험치 ×${e.exp}` : '', e.gold !== 1 ? `골드 ×${e.gold}` : '', e.drop !== 1 ? `장비 드롭 ×${e.drop}` : '', (e.mastery ?? 1) !== 1 ? `숙련 ×${e.mastery}` : ''].filter(Boolean);
    const d = new Date(e.until + 9 * 3600_000);
    return [e.name, ...parts, `${d.getUTCMonth() + 1}/${d.getUTCDate()}까지`].join(' · ');
}
