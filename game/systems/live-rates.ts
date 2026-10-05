/**
 * v3.13 실시간 효율 측정(순수 계산). 서버에 아무것도 더 묻지 않고, 클라이언트가 이미 3초마다 받는 상태의 로그·처치 수 차이만 더합니다.
 * 지난 RATE_WINDOW_MS(5분) 창의 실측으로 시간당 경험치·골드·처치·숙련과 DPS를 내고, 1시간·6시간·24시간 예상치는 그 배수입니다.
 * 동기화가 GAP_RESET_MS 넘게 끊기면(탭 숨김·부재중 정산) 창을 새로 시작해 정산 몫이 실측에 섞이지 않습니다. 환생하면 창을 새로 시작합니다.
 */
import type { Log, State } from '../types';
import { xpNeeded , type XpTargetWall } from '../data/balance';
/** 플레이어 최대 레벨(encounter의 레벨업 상한과 같음). */
export const LEVEL_CAP = 100;

export const RATE_WINDOW_MS = 5 * 60_000;
/** 측정값을 보여 주기 시작하는 최소 실측 시간. */
export const RATE_MIN_MS = 30_000;
export const GAP_RESET_MS = 90_000;
type Totals = { at: number; exp: number; gold: number; kills: number; dmg: number; mastery: number };
export type LiveRates = {
    /** 창 안의 실측 시간(ms). */
    elapsedMs: number;
    ready: boolean;
    perHour: { exp: number; gold: number; kills: number; mastery: number };
    dps: number;
    /** 창 안 실측 합계. */
    total: Omit<Totals, 'at'>;
};
export const EMPTY_RATES: LiveRates = { elapsedMs: 0, ready: false, perHour: { exp: 0, gold: 0, kills: 0, mastery: 0 }, dps: 0, total: { exp: 0, gold: 0, kills: 0, dmg: 0, mastery: 0 } };
const num = (m: RegExpMatchArray | null) => m ? Number(m[1].replace(/,/g, '')) : 0;
type RateState = Pick<State, 'lastTick' | 'logs' | 'kills' | 'rebirths' | 'name' | 'jobMastery'>;
/** 숙련은 로그가 아니라 상태로 잽니다(일반 처치 숙련은 로그에 남지 않음): 모든 직업 단련치의 합. */
const masteryOf = (s: RateState) => Object.values(s.jobMastery || {}).reduce((a, n) => a + (n || 0), 0);
/** 로그 한 줄에서 얻은 경험치·골드·숙련·내가 준 피해. 처치 줄(+G · +EXP), 누리(경험치 +N), 숙련 줄(숙련 +N), 전투 이벤트(total). */
export function gainsOf(log: Log, player: string) {
    const exp = log.type === 'reward' ? num(log.text.match(/\+([\d,]+) EXP/)) + num(log.text.match(/경험치 \+([\d,]+)/)) : 0;
    const gold = log.type === 'reward' ? num(log.text.match(/\+([\d,]+) G(?![a-zA-Z])/)) : 0;
    const mastery = log.type === 'skill' ? num(log.text.match(/숙련 \+([\d,]+)/)) : 0;
    const dmg = log.type === 'battle' && log.event && log.event.actor === player ? log.event.total || 0 : 0;
    return { exp, gold, mastery, dmg };
}
export function createLiveRates() {
    let samples: Totals[] = [], lastLogId = -1, lastKills = 0, lastRebirths = -1, snapshot: LiveRates = EMPTY_RATES;
    const subs = new Set<() => void>();
    const compute = (): LiveRates => {
        if (samples.length < 2) return EMPTY_RATES;
        const a = samples[0], b = samples[samples.length - 1], elapsedMs = b.at - a.at;
        if (elapsedMs <= 0) return EMPTY_RATES;
        const total = { exp: b.exp - a.exp, gold: b.gold - a.gold, kills: b.kills - a.kills, dmg: b.dmg - a.dmg, mastery: b.mastery - a.mastery };
        const k = 3_600_000 / elapsedMs;
        return { elapsedMs, ready: elapsedMs >= RATE_MIN_MS, perHour: { exp: total.exp * k, gold: total.gold * k, kills: total.kills * k, mastery: total.mastery * k }, dps: total.dmg / elapsedMs * 1000, total };
    };
    let lastMastery = 0;
    const restart = (s: RateState) => {
        samples = [{ at: s.lastTick, exp: 0, gold: 0, kills: 0, dmg: 0, mastery: 0 }];
        lastLogId = s.logs.length ? Math.max(...s.logs.map(l => l.id)) : -1; lastKills = s.kills; lastRebirths = s.rebirths; lastMastery = masteryOf(s);
    };
    /** 새 상태가 올 때마다 호출. 같은 lastTick이면(턴이 안 돌았으면) 아무것도 더하지 않습니다. */
    const feed = (s: RateState) => {
        const last = samples[samples.length - 1];
        if (!last || s.lastTick < last.at || s.lastTick - last.at > GAP_RESET_MS || s.rebirths !== lastRebirths) restart(s);
        else if (s.lastTick > last.at) {
            const next = { ...last, at: s.lastTick };
            for (const l of s.logs) if (l.id > lastLogId) { const g = gainsOf(l, s.name); next.exp += g.exp; next.gold += g.gold; next.dmg += g.dmg; }
            const mastery = masteryOf(s); next.mastery += Math.max(0, mastery - lastMastery); lastMastery = mastery;
            lastLogId = s.logs.length ? Math.max(lastLogId, ...s.logs.map(l => l.id)) : lastLogId;
            next.kills += Math.max(0, s.kills - lastKills); lastKills = s.kills;
            samples.push(next);
            const edge = s.lastTick - RATE_WINDOW_MS;
            while (samples.length > 2 && samples[1].at <= edge) samples.shift();
        } else return;
        snapshot = compute();
        subs.forEach(fn => fn());
    };
    const reset = () => { samples = []; lastLogId = -1; lastKills = 0; lastRebirths = -1; snapshot = EMPTY_RATES; subs.forEach(fn => fn()); };
    return { feed, reset, get: () => snapshot, subscribe: (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; } };
}

/** 경험치 gain을 받으면 어디까지 가는지(최대 레벨에서 멈춤). 시간당 레벨·N시간 뒤 예상 레벨에 씁니다. */
export function projectLevel(level: number, exp: number, rebirths: number, gain: number, wall?: XpTargetWall) {
    let lv = Math.max(1, level), xp = Math.max(0, exp) + Math.max(0, gain);
    while (lv < LEVEL_CAP && xp >= xpNeeded(lv, rebirths, wall)) { xp -= xpNeeded(lv, rebirths, wall); lv++; }
    if (lv >= LEVEL_CAP) return { level: LEVEL_CAP, exp: 0, capped: true, progress: 1 };
    return { level: lv, exp: xp, capped: false, progress: xp / xpNeeded(lv, rebirths, wall) };
}
/** 지금 경험치 속도로 최대 레벨까지 걸리는 시간(ms). 0 속도면 Infinity. */
export function msToCap(level: number, exp: number, rebirths: number, perHour: number, wall?: XpTargetWall) {
    if (perHour <= 0) return Infinity;
    let need = -Math.max(0, exp);
    for (let lv = Math.max(1, level); lv < LEVEL_CAP; lv++) need += xpNeeded(lv, rebirths, wall);
    return Math.max(0, need) / perHour * 3_600_000;
}
