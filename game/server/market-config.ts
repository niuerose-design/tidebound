/**
 * v3.213 증권거래소 운영 스위치(settings.market): 장 폐쇄(closed)와 서킷브레이커(haltUntil까지 거래 중단), 유저에게 보일 사유(reason).
 * refreshEvents(events-config.ts)가 다른 서버 설정과 함께 30초 캐시로 읽고, 운영 페이지에서 바꾸면 그 인스턴스는 바로, 다른 인스턴스는 최대 30초 뒤 반영됩니다.
 * 시세는 멈추지 않습니다(계산식이라 계속 흐름). 막는 것은 매수 · 매도입니다.
 */
import { db } from './db';
import { setMarketControl, marketWindow, type MarketControl } from '../systems/market';
import { STOCKS } from '../data/market';
import { ensurePuzzleKey } from './hacks';

const KEY = 'market';
export async function readMarketControl(): Promise<MarketControl> {
    const raw = await db().getSetting(KEY);
    try { const v = raw ? JSON.parse(raw) : null; return { closed: !!v?.closed, haltUntil: Number(v?.haltUntil) || 0, reason: typeof v?.reason === 'string' ? v.reason.slice(0, 100) : '' }; }
    catch { return { closed: false, haltUntil: 0, reason: '' }; }
}
export async function writeMarketControl(c: MarketControl, now = Date.now()) {
    const clean: MarketControl = { closed: !!c.closed, haltUntil: c.haltUntil > now ? Math.floor(c.haltUntil) : 0, reason: String(c.reason || '').slice(0, 100) };
    await db().setSetting(KEY, JSON.stringify(clean), now);
    setMarketControl(clean);
    return clean;
}

/** 운영 페이지 보기: 지금 스위치와 종목별 현재가 · 24시간 등락(이 인스턴스의 하루치 시세 창). */
export async function adminMarket(now = Date.now()) {
    // 시세 키는 게임 행동(mutate)에서만 넣으므로 운영 페이지에서도 먼저 넣습니다(안 넣으면 로컬 기본 키 시세가 보임).
    await ensurePuzzleKey(now);
    const control = await readMarketControl(), w = marketWindow(now), first = w.rows[0], last = w.rows[w.rows.length - 1];
    setMarketControl(control);
    return { control: { ...control, haltUntil: control.haltUntil > now ? control.haltUntil : 0 }, tick: w.tick, stocks: STOCKS.map((d, i) => ({ id: d.id, name: d.name, risk: d.risk, base: d.base, price: last[i], change: last[i] / first[i] - 1 })) };
}
/** 운영 페이지 바꾸기: closed(장 폐쇄 켜기/끄기) · haltMinutes(지금부터 N분 서킷브레이커, 0이면 해제) · reason(사유, 없으면 그대로). */
export async function setAdminMarket(body: { closed?: unknown; haltMinutes?: unknown; reason?: unknown }, now = Date.now()) {
    const cur = await readMarketControl(), next = { ...cur };
    if (body.closed !== undefined) next.closed = !!body.closed;
    if (body.haltMinutes !== undefined) {
        // 0이면 해제, 최대 7일. 숫자가 아니면 그대로 둡니다.
        const m = Math.min(7 * 24 * 60, Math.max(0, Number(body.haltMinutes)));
        if (Number.isFinite(m)) next.haltUntil = m > 0 ? now + Math.round(m * 60_000) : 0;
    }
    if (typeof body.reason === 'string') next.reason = body.reason.trim();
    await writeMarketControl(next, now);
    return adminMarket(now);
}
