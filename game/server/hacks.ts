/**
 * v3.18 해커가 서버에 남기는 흔적(방송 탈취 · 크래킹)과 침투 작전 정답 키.
 * v3.25 해킹 II~V(이벤트 변조 · 서버 다운 · 패킷 스니핑 · 백도어)와 화이트 해커(되돌리기 · 패치 · 방화벽), 해커 순위표.
 * 서버 부하: 설정 하나(hacks)를 인스턴스마다 30초 캐시로 읽고, 쓰기는 해킹을 실행할 때와 운영 페이지에서 지울 때만 합니다.
 * 읽은 값은 이벤트 변조(setEventTamper)·서버 다운(setHackDown)으로 게임 계산에 바로 반영합니다.
 */
import { randomBytes } from 'node:crypto';
import { db } from './db';
import type { State, Snapshot } from '../types';
import { setPuzzleKey, gainHacker, isHacker, seasonScore, programOn } from '../systems/hacker';
import { addLog } from '../systems/state';
import { HACKER, HACK_BITS, FIREWALL_ID } from '../data/hacker';
import { currentEvents, setEventTamper, setHackEvents } from '../data/events';
import { STAGES, DUNGEONS, setHackDown, placeKey } from '../data/world';
import { gaugeCost, raidById, josa, type AltarGaugeId } from '../data/altar';
import { dayKey } from '../data/goals';
import { backdoorGauge, raidAlive, invalidateAltar } from './altar';

type Down = { kind: 'stage' | 'dungeon'; id: string; until: number; by: string; byId: string };
type Tamper = { minutes: number; rate: number; by: string; byId: string; at: number };
export type Hacks = {
    broadcast?: { text: string; by: string; byId: string; at: number; until: number };
    cracked: Record<string, number>;
    /** v3.25 이벤트 id → 변조(이벤트당 1회). */
    tamper: Record<string, Tamper>;
    down: Down[];
    /** placeKey → 패치가 끝나는 시각(그동안 서버 다운 면역). */
    patched: Record<string, number>;
    /** 모험가 id → 화이트 해커 방화벽이 크래킹을 막은 날(하루 한 번). */
    shielded: Record<string, string>;
    /** v3.26 신원 조작: 모험가 id → 숨김(공개 항목 show 말고는 ???)과 끝나는 시각. v3.27 until 0 = 무기한. */
    masked: Record<string, { until: number; show: string[]; by: string; byId: string; /** v3.28 미끼 정보(가린 항목 자리에 보여 줄 가짜 값). */ decoy?: { name?: string; job?: string; level?: number } }>;
    /** v3.27 해커끼리 견제: 모험가 id → 오늘 역추적 횟수(day 기준)와 과부하가 끝나는 시각. */
    rival: Record<string, { day?: string; trace?: number; overloadUntil?: number }>;
    /** v3.28 해킹 IX DDoS로 연 서버 이벤트(서버에 하나). */
    ddos?: { kind: string; rate: number; from: number; until: number; by: string; byId: string };
    /** v3.28 해킹 X 루트 권한 연출(모두에게 배너). */
    root?: { by: string; byId: string; until: number };
    /** v3.28 해킹 VII 세이브 스캠: 월드보스 세대 → 건 시각(보스 한 마리당 서버 전체 1회). */
    scummed: Record<string, number>;
    /** v3.33 조직 모듈 프록시 체인: 조직 id → 외부 역추적·과부하를 막은 날(조직 전체 하루 1회). */
    crewShield: Record<string, string>;
};
/** v3.27 신원 조작이 지금 걸려 있는지(until 0 = 무기한). */
const maskLive = (m: { until: number } | undefined, now: number) => !!m && (!m.until || m.until > now);
const KEY = 'hacks', TTL = 30_000, TAMPER_KEEP = 30 * 86400_000, SCUM_KEEP = 3 * 86400_000;
let cached: { at: number; hacks: Hacks } | null = null;
const obj = <T>(v: unknown): Record<string, T> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, T> : {};

function parse(raw: string | null): Hacks {
    try {
        const v = raw ? JSON.parse(raw) : null;
        return { broadcast: v?.broadcast && typeof v.broadcast.text === 'string' ? v.broadcast : undefined, cracked: obj<number>(v?.cracked), tamper: obj<Tamper>(v?.tamper), down: Array.isArray(v?.down) ? v.down.filter((d: Down) => d && typeof d.id === 'string') : [], patched: obj<number>(v?.patched), shielded: obj<string>(v?.shielded), masked: obj<Hacks['masked'][string]>(v?.masked), rival: obj<Hacks['rival'][string]>(v?.rival),
            ddos: v?.ddos && (HACKER.ddos.kinds as readonly string[]).includes(v.ddos.kind) ? v.ddos : undefined, root: v?.root && typeof v.root.until === 'number' ? v.root : undefined, scummed: obj<number>(v?.scummed), crewShield: obj<string>(v?.crewShield) };
    }
    catch { return { cracked: {}, tamper: {}, down: [], patched: {}, shielded: {}, masked: {}, rival: {}, scummed: {}, crewShield: {} }; }
}
/** 게임 계산에 넣습니다(이벤트 변조 · 서버 다운 · 패치 · v3.28 DDoS 이벤트). */
function applyRuntime(h: Hacks) {
    setEventTamper(Object.fromEntries(Object.entries(h.tamper).map(([id, t]) => [id, { minutes: t.minutes, rate: t.rate }])));
    setHackDown(h.down, h.patched);
    const d = h.ddos;
    setHackEvents(d ? [{ id: 'hack-ddos', name: `DDoS(해커 ${d.by})`, from: new Date(d.from).toISOString(), until: new Date(d.until).toISOString(), [d.kind]: d.rate }] : []);
}
/** 30초 캐시. 읽기에 실패하면 지난 값(없으면 빈 값)을 씁니다. */
export async function readHacks(now: number): Promise<Hacks> {
    if (cached && now - cached.at < TTL) return cached.hacks;
    try { cached = { at: now, hacks: parse(await db().getSetting(KEY)) }; }
    catch (e) { console.error('Hack config read failed', e instanceof Error ? e.message : e); cached = { at: now, hacks: cached?.hacks || parse(null) }; }
    applyRuntime(cached.hacks);
    return cached.hacks;
}
async function writeHacks(h: Hacks, now: number) {
    const today = dayKey(now);
    for (const [id, until] of Object.entries(h.cracked)) if (!(until > now)) delete h.cracked[id];
    for (const [id, until] of Object.entries(h.patched)) if (!(until > now)) delete h.patched[id];
    for (const [id, m] of Object.entries(h.masked)) if (!maskLive(m, now)) delete h.masked[id];
    for (const [id, r] of Object.entries(h.rival)) if (r.day !== today && !((r.overloadUntil || 0) > now)) delete h.rival[id];
    for (const [id, t] of Object.entries(h.tamper)) if (!(now - t.at < TAMPER_KEEP)) delete h.tamper[id];
    for (const [id, day] of Object.entries(h.shielded)) if (day !== today) delete h.shielded[id];
    for (const [id, day] of Object.entries(h.crewShield)) if (day !== today) delete h.crewShield[id];
    for (const [gen, at] of Object.entries(h.scummed)) if (!(now - at < SCUM_KEEP)) delete h.scummed[gen];
    if (h.ddos && !(h.ddos.until > now)) delete h.ddos;
    if (h.root && !(h.root.until > now)) delete h.root;
    h.down = h.down.filter(d => d.until > now);
    if (h.broadcast && !(h.broadcast.until > now)) delete h.broadcast;
    await db().setSetting(KEY, JSON.stringify(h), now);
    cached = { at: now, hacks: h };
    applyRuntime(h);
}

let keyReady = false;
/** 침투 작전 정답 키: 환경 변수 TIDEBOUND_PUZZLE_SECRET, 없으면 DB 설정에 한 번 만든 무작위 키. 인스턴스마다 한 번만 읽습니다. */
export async function ensurePuzzleKey(now: number) {
    if (keyReady) return;
    let key = process.env.TIDEBOUND_PUZZLE_SECRET || '';
    if (!key) {
        const database = db();
        key = await database.getSetting('puzzleKey') || '';
        if (!key) { key = randomBytes(24).toString('hex'); await database.setSetting('puzzleKey', key, now); key = await database.getSetting('puzzleKey') || key; }
    }
    setPuzzleKey(key);
    keyReady = true;
}

/** 랭킹 행 id(duel:<시즌>:<모험가>, abyss:<모험가>, hacker:<모험가>)나 모험가 id에서 모험가 id만. */
export const playerOfRow = (rowId: string) => rowId.startsWith('duel:') ? rowId.split(':').slice(2).join(':') : rowId.startsWith('abyss:') ? rowId.slice(6) : rowId.startsWith('hacker:') ? rowId.slice(7) : rowId;

const placeName = (kind: string, id: string) => (kind === 'stage' ? STAGES.find(st => st.id === id)?.name : DUNGEONS.find(d => d.id === id)?.name) || id;
/** 이벤트 변조 대상: 운영 이벤트(제단 축복 제외) 중 지금 진행 중인 것. 변조 뒤의 종료 시각으로 봅니다. */
const liveEvents = (now: number) => currentEvents(false).filter(e => !e.id.startsWith('altar-') && !e.id.startsWith('hack-') && Date.parse(e.from) <= now && now <= Date.parse(e.until));

/** 동기화 때 화면에 보여 줄 해킹 소식을 상태에 적습니다(캐시만 읽음). 해커 계열에게는 변조·다운·패치 정보도 적습니다. */
export async function syncHackFeed(s: State, id: string, now: number) {
    const h = await readHacks(now);
    const broadcast = h.broadcast && h.broadcast.until > now ? { text: h.broadcast.text, by: h.broadcast.by, until: h.broadcast.until } : undefined;
    const crackedUntil = (h.cracked[id] || 0) > now ? h.cracked[id] : undefined;
    const hacker = isHacker(s) ? {
        events: liveEvents(now).map(e => ({ id: e.id, name: e.name || e.id, until: Date.parse(e.until), ...(h.tamper[e.id] ? { tampered: true } : {}) })),
        down: h.down.filter(d => d.until > now).map(d => ({ kind: d.kind, id: d.id, until: d.until, by: d.by, ...((h.patched[placeKey(d.kind, d.id)] || 0) > now ? { patched: true } : {}) })),
        patched: Object.fromEntries(Object.entries(h.patched).filter(([, until]) => until > now)),
        masks: Object.entries(h.masked).filter(([, m]) => maskLive(m, now)).map(([target, m]) => ({ target, until: m.until, by: m.by, ...(m.byId === id ? { mine: true, ...(m.decoy?.name ? { decoy: m.decoy.name } : {}) } : {}) })),
        scummed: Object.keys(h.scummed).map(Number),
    } : {};
    // v3.28 루트 권한 연출과 DDoS 이벤트는 모두에게 보입니다.
    const root = h.root && h.root.until > now ? { root: { by: h.root.by, until: h.root.until } } : {}, ddos = h.ddos && h.ddos.until > now ? { ddos: { kind: h.ddos.kind, by: h.ddos.by, until: h.ddos.until } } : {};
    // v3.27 다른 해커가 나에게 건 견제(역추적·과부하). 틱 계산과 침투 입장 한도가 이 값을 봅니다.
    const r = h.rival[id], rival = { ...(r?.day === dayKey(now) && r.trace ? { traced: { day: r.day, n: r.trace } } : {}), ...((r?.overloadUntil || 0) > now ? { overloadUntil: r!.overloadUntil } : {}) };
    if (broadcast || crackedUntil || isHacker(s) || root.root || ddos.ddos) s.hackFeed = { ...(broadcast ? { broadcast } : {}), ...(crackedUntil ? { crackedUntil } : {}), ...hacker, ...rival, ...root, ...ddos };
    else delete s.hackFeed;
}

/** 저장 직전: 해킹 실행(h.pending)을 서버 설정에 반영합니다. 실패하면 던져서 상태(비트 차감)도 저장되지 않습니다. */
export async function applyPendingHack(s: State, id: string, now: number) {
    const pending = s.hacker?.pending;
    if (!pending) return;
    const database = db(), h = parse(await database.getSetting(KEY)), hk = s.hacker!;
    // v3.25 루트킷: 서명·공지에 이름 대신 ???. v3.34 조직원이면 이름 뒤에 [조직 이름](루트킷이면 태그도 숨김).
    const by = programOn(s, 'rootkit') ? '???' : hk.crew ? `${s.name} [${hk.crew.name}]` : s.name, n = pending.n || hk.tier;
    let write = true;
    if (pending.kind === 'broadcast') {
        if (h.broadcast && h.broadcast.until > now && h.broadcast.byId !== id) throw Error(`다른 해커(${h.broadcast.by})의 방송이 ${Math.ceil((h.broadcast.until - now) / 60000)}분 남았습니다.`);
        h.broadcast = { text: pending.value, by, byId: id, at: now, until: now + pending.minutes * 60_000 };
    }
    else if (pending.kind === 'crack') {
        const target = playerOfRow(pending.value);
        if (!target || target === id) throw Error('크래킹할 대상을 확인하세요.');
        // v3.25 화이트 해커 패시브 방화벽은 하루 한 번 크래킹을 막아 냅니다(비트·횟수는 그대로 씀).
        const row = await database.getPlayer(target), victim = row ? JSON.parse(row.state) as State : null;
        sameCrew(s, victim);
        if (victim?.skills?.includes(FIREWALL_ID) && h.shielded[target] !== dayKey(now)) {
            h.shielded[target] = dayKey(now);
            addLog(s, '크래킹이 화이트 해커의 방화벽에 막혔습니다. 오늘은 방어막이 사라졌으니 다시 시도할 수 있습니다.', 'system');
        }
        else h.cracked[target] = now + pending.minutes * 60_000;
    }
    else if (pending.kind === 'spoof') {
        const [raw, fields, dName, dJob, dLevel] = pending.value.split('|'), target = raw === 'self' ? id : playerOfRow(raw);
        if (!target) throw Error('신원을 조작할 대상을 확인하세요.');
        const decoy = { ...(dName ? { name: dName } : {}), ...(dJob ? { job: dJob } : {}), ...(Number(dLevel) > 0 ? { level: Number(dLevel) } : {}) };
        h.masked[target] = { until: pending.minutes ? now + pending.minutes * 60_000 : 0, show: (fields || '').split(',').filter(Boolean), by, byId: id, ...(Object.keys(decoy).length ? { decoy } : {}) };
        addLog(s, `신원 조작 · ${target === id ? '내 정보' : '대상의 정보'}를 ${pending.minutes ? `${Math.round(pending.minutes / 60)}시간 동안` : '무기한으로'} 가렸습니다${fields ? `(공개: ${fields})` : ''}.`, 'reward');
    }
    else if (pending.kind === 'unspoof') {
        const target = pending.value === 'self' ? id : playerOfRow(pending.value), m = h.masked[target];
        if (!maskLive(m, now)) throw Error('걸려 있는 신원 조작이 없습니다.');
        if (m.byId !== id) throw Error('내가 건 신원 조작만 거둘 수 있습니다.');
        delete h.masked[target];
        addLog(s, '신원 조작을 거뒀습니다.', 'system');
    }
    else if (pending.kind === 'trace' || pending.kind === 'overload') {
        const target = playerOfRow(pending.value);
        if (!target || target === id) throw Error('다른 해커를 고르세요.');
        const row = await database.getPlayer(target), victim = row ? JSON.parse(row.state) as State : null;
        if (!victim?.hacker) throw Error('해커 기록이 있는 모험가만 견제할 수 있습니다.');
        const today = dayKey(now), r = h.rival[target] ??= {}, vc = victim.hacker.crew;
        sameCrew(s, victim);
        if (vc?.modules?.includes('proxyChain') && h.crewShield[vc.id] !== today) {
            // v3.33 프록시 체인: 대상 조직 전체에서 하루 한 번 외부 견제를 막습니다(비트·횟수는 그대로 씀).
            h.crewShield[vc.id] = today;
            addLog(s, `${pending.kind === 'trace' ? '역추적' : '과부하'}이(가) 대상 조직의 프록시 체인에 막혔습니다.`, 'system');
        }
        else if (victim.skills?.includes(FIREWALL_ID) && h.shielded[target] !== today) {
            h.shielded[target] = today;
            addLog(s, `${pending.kind === 'trace' ? '역추적' : '과부하'}이(가) 화이트 해커의 방화벽에 막혔습니다.`, 'system');
        }
        else if (pending.kind === 'trace') {
            if (r.day !== today) { r.day = today; r.trace = 0; }
            if ((r.trace || 0) >= HACKER.trace.maxPerDay) throw Error('이 해커는 오늘 더 역추적할 수 없습니다.');
            r.trace = (r.trace || 0) + 1;
            addLog(s, `역추적 · 대상의 오늘 침투 작전 입장 −1 (오늘 ${r.trace}회째)`, 'reward');
        }
        else {
            r.overloadUntil = Math.max(r.overloadUntil || 0, now) + pending.minutes * 60_000;
            addLog(s, `과부하 · 대상의 브루트포스 비트가 ${pending.minutes}분 동안 절반이 됩니다.`, 'reward');
        }
    }
    else if (pending.kind === 'tamper') {
        const [eventId, timeSign, rateSign] = pending.value.split('|'), ev = liveEvents(now).find(e => e.id === eventId);
        if (!ev) throw Error('지금 진행 중인 이벤트가 아닙니다.');
        if (h.tamper[eventId]) throw Error('이미 변조된 이벤트입니다(이벤트당 1회).');
        h.tamper[eventId] = { minutes: Number(timeSign) * HACKER.tamper.minutes(n), rate: Number(rateSign) * HACKER.tamper.rate(n), by, byId: id, at: now };
        addLog(s, `이벤트 변조 · ${ev.name || ev.id} · 남은 시간 ${Number(timeSign) > 0 ? '+' : '−'}${HACKER.tamper.minutes(n)}분 · 배율 ${Number(rateSign) > 0 ? '+' : '−'}${Math.round(HACKER.tamper.rate(n) * 100)}%p`, 'reward');
    }
    else if (pending.kind === 'down') {
        const [kind, ...rest] = pending.value.split(':'), place = rest.join(':'), k = kind as 'stage' | 'dungeon';
        if ((h.patched[placeKey(k, place)] || 0) > now) throw Error(`${placeName(k, place)}은(는) 화이트 해커가 패치해 지금은 다운시킬 수 없습니다.`);
        if (h.down.some(d => d.kind === k && d.id === place && d.until > now)) throw Error(`${placeName(k, place)}은(는) 이미 다운되어 있습니다.`);
        h.down.push({ kind: k, id: place, until: now + pending.minutes * 60_000, by, byId: id });
        addLog(s, `서버 다운 · ${placeName(k, place)} · ${pending.minutes}분 동안 새 입장 불가`, 'reward');
    }
    else if (pending.kind === 'sniffClaim') {
        // v3.28 봇넷 중에 시작한 스니핑은 ×2(상한도 ×2). 배수는 pending.bits에 실려 옵니다.
        const mult = pending.bits || 1, players = await database.countActivePlayers(Number(pending.value), id), exp = Math.min(HACKER.sniff.cap(n) * mult, players * HACKER.sniff.perPlayer(n) * mult), bits = Math.min(HACKER.sniff.bitsCap(n) * mult, players * HACKER.sniff.bitsPerPlayer(n) * mult);
        hk.sniff = null;
        gainHacker(s, bits, exp);
        addLog(s, `패킷 스니핑 정산 · 활동한 모험가 ${players}명 · 권한 경험치 +${exp} · 비트 +${bits}${mult > 1 ? ' (봇넷 ×2)' : ''}`, 'reward');
        write = false;
    }
    else if (pending.kind === 'intercept') {
        // v3.28 해킹 VI: 떠 있는 보스의 세대를 적어 둡니다. 월드보스 표는 해킹할 때만 한 번 읽습니다.
        const r = (await database.listAltarRaids()).find(x => x.id === pending.value), raid = raidById(pending.value);
        if (!raid || !raidAlive(r, now)) throw Error('그 월드보스는 지금 나타나 있지 않습니다.');
        hk.intercept = { raid: raid.id, gen: r!.gen, n };
        addLog(s, `패킷 가로채기 · ${raid.name} 격파 보상의 ${Math.round(HACKER.intercept.share(n) * 100)}%를 노립니다. 쓰러진 뒤 정산하세요.`, 'system');
        write = false;
    }
    else if (pending.kind === 'interceptClaim') {
        const ic = hk.intercept!, raid = raidById(ic.raid), r = (await database.listAltarRaids()).find(x => x.id === ic.raid);
        if (r && r.gen === ic.gen && raidAlive(r, now)) throw Error(`${raid?.name || '월드보스'}이(가) 아직 쓰러지지 않았습니다.`);
        hk.intercept = null;
        if (raid && r && r.gen === ic.gen && r.state === 'slain') {
            const bits = Math.max(1, Math.floor(HACKER.intercept.value(raid.reward) * HACKER.intercept.share(ic.n)));
            gainHacker(s, bits, 0);
            addLog(s, `패킷 가로채기 정산 · ${raid.name} 격파 보상에서 비트 +${bits}`, 'reward');
        }
        else addLog(s, `패킷 가로채기 실패 · ${raid?.name || '월드보스'}이(가) 쓰러지지 않고 떠났습니다.`, 'system');
        write = false;
    }
    else if (pending.kind === 'savescum') {
        // v3.28 해킹 VII: 체력은 한 문장 UPDATE로 1 ~ 최대 체력 안에서만 바꿉니다(쓰러뜨리지 않음). 보스 한 마리당 서버 전체 1회.
        const [raidId, mode] = pending.value.split('|'), raid = raidById(raidId), r = (await database.listAltarRaids()).find(x => x.id === raidId);
        if (!raid || !r || !raidAlive(r, now)) throw Error('그 월드보스는 지금 나타나 있지 않습니다.');
        if (h.scummed[String(r.gen)]) throw Error(`${raid.name}은(는) 이미 세이브 스캠당했습니다(보스당 1회).`);
        const rewind = mode === 'rewind', delta = rewind ? Math.floor((r.hp_max - r.hp) * HACKER.savescum.rewind(n)) : -Math.floor(r.hp * HACKER.savescum.forward(n));
        if (!delta) throw Error(rewind ? '되감을 체력이 없습니다(아직 깎인 체력이 없음).' : '빨리감을 체력이 없습니다.');
        const hp = await database.shiftAltarRaid(raidId, r.gen, delta);
        if (hp === null) throw Error('그 월드보스는 지금 나타나 있지 않습니다.');
        h.scummed[String(r.gen)] = now;
        invalidateAltar();
        const text = `세이브 스캠 · ${raid.name} 체력 ${rewind ? '되감기' : '빨리감기'} ${rewind ? '+' : '−'}${Math.abs(hp - r.hp).toLocaleString()}`;
        addLog(s, text, 'reward');
        await hackNotice(`[해커 ${by}] ${text}`, now);
    }
    else if (pending.kind === 'ddos') {
        // v3.28 해킹 IX: 서버 이벤트 하나를 강제로 엽니다(서버에 하나). 30초 캐시로 모든 인스턴스에 퍼집니다.
        if (h.ddos && h.ddos.until > now) throw Error(`다른 DDoS 이벤트가 ${Math.ceil((h.ddos.until - now) / 60000)}분 남았습니다.`);
        h.ddos = { kind: pending.value, rate: HACKER.ddos.rate, from: now, until: now + pending.minutes * 60_000, by, byId: id };
        const label = { exp: '경험치', gold: '골드', drop: '장비 드롭' }[pending.value] || pending.value;
        addLog(s, `DDoS · ${label} ×${HACKER.ddos.rate} 이벤트를 ${pending.minutes / 60}시간 동안 열었습니다.`, 'reward');
        await hackNotice(`[해커 ${by}] DDoS · 서버 이벤트 ${label} ×${HACKER.ddos.rate}이(가) ${pending.minutes / 60}시간 동안 열렸습니다.`, now);
    }
    else if (pending.kind === 'busted') {
        // v3.28 블랙 해커 실패: 루트킷이 있어도 진짜 이름을 공지합니다.
        // v3.33 조직 모듈 세탁이면 이름 대신 조직 이름(값 = 해킹 이름|조직 이름).
        const [label, crew] = pending.value.split('|'), who = crew ? `[${crew}] 소속 블랙 해커` : `블랙 해커 ${s.name}`;
        await hackNotice(`🚨 ${josa(who, '이가')} ${label} 중 추적당했습니다. ${pending.minutes / 60}시간 동안 해킹할 수 없습니다.`, now);
        write = false;
    }
    else if (pending.kind === 'root') {
        h.root = { by, byId: id, until: now + pending.minutes * 60_000 };
        await hackNotice(`⚠ ROOT ACCESS · ${josa(`해커 ${by}`, '이가')} 서버의 루트 권한을 얻었습니다.`, now);
    }
    else if (pending.kind === 'backdoor') {
        const gauge = pending.value as AltarGaugeId, points = Math.max(1, Math.floor(gaugeCost(gauge, 0) * HACKER.backdoor.share(n)));
        await backdoorGauge(gauge, points, now);
        addLog(s, `백도어 · 제단 게이지 +${points.toLocaleString()} (기여 순위 제외)`, 'reward');
        write = false;
    }
    else if (pending.kind === 'restore') {
        const [kind, ...rest] = pending.value.split(':');
        let bounty = 0, label = '';
        if (kind === 'broadcast') {
            if (!h.broadcast || h.broadcast.until <= now) throw Error('되돌릴 방송 탈취가 없습니다.');
            if (h.broadcast.byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            delete h.broadcast; bounty = HACK_BITS.broadcast; label = '방송 탈취';
        }
        else if (kind === 'down') {
            const [k, ...p] = rest, place = p.join(':'), i = h.down.findIndex(d => d.kind === k && d.id === place && d.until > now);
            if (i < 0) throw Error('되돌릴 서버 다운이 없습니다.');
            if (h.down[i].byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            h.down.splice(i, 1); bounty = HACK_BITS.down; label = `서버 다운(${placeName(k, place)})`;
        }
        else if (kind === 'ddos') {
            if (!h.ddos || h.ddos.until <= now) throw Error('되돌릴 DDoS 이벤트가 없습니다.');
            if (h.ddos.byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            delete h.ddos; bounty = HACK_BITS.ddos; label = 'DDoS 이벤트';
        }
        else if (kind === 'mask') {
            const target = rest.join(':'), m = h.masked[target];
            if (!maskLive(m, now)) throw Error('되돌릴 신원 조작이 없습니다.');
            if (m.byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            delete h.masked[target]; bounty = HACKER.spoof.bits; label = '신원 조작';
        }
        else {
            const eventId = rest.join(':'), t = h.tamper[eventId];
            if (!t) throw Error('되돌릴 이벤트 변조가 없습니다.');
            if (t.byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            delete h.tamper[eventId]; bounty = HACK_BITS.tamper; label = '이벤트 변조';
        }
        const bits = Math.floor(bounty * HACKER.white.restore.bounty);
        hk.bits += bits;
        addLog(s, `${label}을(를) 되돌렸습니다 · 현상금 비트 +${bits}`, 'reward');
    }
    else if (pending.kind === 'patch') {
        const [kind, ...rest] = pending.value.split(':'), place = rest.join(':');
        h.patched[placeKey(kind as 'stage' | 'dungeon', place)] = now + pending.minutes * 60_000;
        addLog(s, `패치 · ${placeName(kind, place)} · ${pending.minutes}분 동안 서버 다운 면역`, 'reward');
    }
    if (write) await writeHacks(h, now);
    delete hk.pending;
}

/** v3.33 조직 모듈 프록시 체인: 같은 조직원끼리는 크래킹·역추적·과부하를 걸 수 없습니다. */
function sameCrew(s: State, victim: State | null) {
    const mine = s.hacker?.crew;
    if (mine?.modules?.includes('proxyChain') && victim?.hacker?.crew?.id === mine.id) throw Error('같은 조직원은 노릴 수 없습니다(프록시 체인).');
}
/** v3.28 해킹 공지(세이브 스캠 · DDoS · 루트 권한)를 빨간 줄로 남깁니다(v3.39 소식 채널, 실패해도 해킹은 그대로). */
async function hackNotice(text: string, now: number) {
    // v3.39 전체 채팅 대신 소식 채널에 올립니다.
    try { await db().postChat({ channel: 'news', account_id: 'system-hacker', name: '시스템', text, created_at: now }); } catch { /* 소식은 부가 기능 */ }
}
/** v3.26 해커 계열 전직을 전체 채팅에 알립니다(이름은 밝히지 않음). 채팅 화면은 account_id 'system-hacker'를 빨간 줄로 그립니다. */
export const hackerJobNews = (job: string) => `누군가가 ${job === 'whiteHacker' ? '화이트 해커' : job === 'blackHacker' ? '블랙 해커' : '해커'}로 전직했습니다.`;
export async function announceHacker(job: string, now: number) {
    const text = hackerJobNews(job);
    // v3.39 전체 채팅 대신 소식 채널에 올립니다.
    try { await db().postChat({ channel: 'news', account_id: 'system-hacker', name: '시스템', text, created_at: now }); } catch { /* 소식은 부가 기능 */ }
}
/** 운영 페이지: 진행 중인 방송 탈취를 지웁니다. */
export async function clearBroadcast(now: number) {
    const h = parse(await db().getSetting(KEY));
    delete h.broadcast;
    await writeHacks(h, now);
}
/** v3.25 운영 페이지: 이벤트 변조·서버 다운·패치를 모두 지웁니다. */
export async function clearHackEffects(now: number) {
    const h = parse(await db().getSetting(KEY));
    h.tamper = {}; h.down = []; h.patched = {}; delete h.ddos;
    await writeHacks(h, now);
}

/** v3.25 해커 순위(월). 시즌 키는 20,000,000 + YYYYMM이라 다른 기록판과 섞이지 않습니다. 행 id는 hacker:<모험가>. */
export const hackerSeason = (key: string) => 20_000_000 + Number(key.replace('-', ''));
export async function syncHackerBoard(id: string, s: State, now: number) {
    const x = s.hacker?.season;
    if (!x?.dirty) return;
    delete x.dirty;
    const score = seasonScore(x);
    // v3.34 조직 이름도 싣습니다(신원 조작으로 이름을 가리면 함께 가림).
    await db().upsertRanking({ id: `hacker:${id}`, snapshot: JSON.stringify({ season: hackerSeason(x.key), board: 'hacker', account: id, name: s.name, job: s.job, depth: x.depth, hacks: x.hacks, restores: x.restores, grade: s.hacker?.grade || 1, ...(s.hacker?.crew ? { crew: s.hacker.crew.name } : {}) }), rating: score, power: x.depth, updated_at: now });
}
export async function listHackerBoard(key: string) {
    const rows = await db().listRankings(hackerSeason(key), 50);
    return rows.map((r, i) => { const snap = JSON.parse(r.snapshot) as { account: string; name: string; job: string; depth: number; hacks: number; restores: number; grade: number; crew?: string; privacy?: { show: string[] } }; return { rank: i + 1, id: snap.account, name: snap.name, job: snap.job, depth: snap.depth, hacks: snap.hacks, restores: snap.restores, grade: snap.grade, score: r.rating, ...(snap.crew ? { crew: snap.crew } : {}), ...(snap.privacy ? { privacy: snap.privacy } : {}) }; });
}

/**
 * 순위표에 보낼 스냅샷에서 숨긴 정보를 가립니다(크래킹당한 동안은 그대로). 결투 계산용 원본은 DB에 그대로 둡니다.
 * v3.26 숨김은 스냅샷의 privacy(옛 애드가드)가 아니라 해커의 신원 조작(hacks.masked)에서 옵니다. 옛 privacy는 버립니다.
 */
export function maskSnapshot<T extends Partial<Snapshot> & { name?: string }>(snap: T, playerId: string, hacks: Hacks, now: number): T & { masked?: string[] } {
    const m = hacks.masked[playerId], privacy = maskLive(m, now) ? { show: m.show } : null;
    if ('privacy' in snap) { snap = { ...snap }; delete snap.privacy; }
    if (!privacy || (hacks.cracked[playerId] || 0) > now) return snap;
    // 값은 지우고(브라우저에서도 못 보게) 0·빈 값으로 채운 뒤, 화면은 masked 목록을 보고 ???로 그립니다.
    // v3.28 미끼 정보가 있는 항목은 ??? 대신 가짜 값을 싣고 masked 목록에서도 뺍니다(진짜 정보처럼 보임).
    // v3.34 이름을 가리면(미끼 이름 포함) 조직 이름도 함께 지웁니다.
    const show = new Set(privacy.show || []), decoy = m.decoy || {}, out: Record<string, unknown> = { ...snap, name: decoy.name || '???' };
    if ('crew' in out) delete out.crew;
    const masked = [...(decoy.name ? [] : ['name']), ...PRIVACY_KEYS.filter(f => !show.has(f) && !(f === 'job' && decoy.job) && !(f === 'level' && decoy.level))];
    if (masked.length) out.masked = masked;
    if (!show.has('job')) out.job = decoy.job || '';
    if (!show.has('level')) { out.level = decoy.level || 0; out.rebirths = 0; }
    if (!show.has('gear')) { out.stats = {}; out.power = 0; }
    if (!show.has('skills')) { out.skills = []; out.skillRanks = {}; out.skillMastery = {}; out.skillPractice = {}; }
    if (!show.has('title')) out.title = undefined;
    if (!show.has('guild')) out.guild = '';
    delete out.privacy;
    return out as T & { masked?: string[] };
}
const PRIVACY_KEYS = ['job', 'level', 'gear', 'skills', 'title', 'guild'];
/** v3.39 소식에 쓸 이름: 신원 조작으로 이름을 가린 동안(크래킹당하지 않았으면)은 미끼 이름 또는 ‘누군가’. */
export function newsName(playerId: string, name: string, hacks: Hacks, now: number) {
    const m = hacks.masked[playerId];
    if (!maskLive(m, now) || (hacks.cracked[playerId] || 0) > now) return name;
    return m.decoy?.name || '누군가';
}
