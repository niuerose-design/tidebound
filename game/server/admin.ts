/**
 * v27.26 운영자 도구(서버 전용). /admin 페이지와 /api/admin 이 씁니다.
 * 운영자 키는 Vercel 환경 변수 TIDEBOUND_ADMIN_KEY 에 둡니다. 키가 없으면 도구 전체가 꺼집니다.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { ApiError } from './store';
import { allow, clientIp } from './throttle';
import { migrateState } from '../systems/migrations';
import { restartLife } from '../systems/actions/lifecycle';
import { jobById } from '../data/classes';
import { BOSS_RESEARCH } from '../data/specializations';
import { DUNGEONS } from '../data/world';
import { PROGRESSION } from '../data/progression';
import { skillById } from '../data/skills';
import type { State } from '../types';
import { SERVER_EVENTS, activeEvent, eventLabel, type ServerEvent } from '../data/events';
import { readEventConfig, writeEventConfig } from './events-config';

const digest = (v: string) => createHash('sha256').update(v).digest();
/** 운영자 키 확인. 실패는 IP당 10분에 10번까지만 받습니다. */
export function requireAdmin(req: Request) {
    const key = process.env.TIDEBOUND_ADMIN_KEY;
    if (!key || key.length < 12) throw new ApiError('운영자 키(TIDEBOUND_ADMIN_KEY)가 설정되지 않아 운영 도구가 꺼져 있습니다.', 503);
    const ip = clientIp(req), given = req.headers.get('x-admin-key') || '';
    if (!allow(`admin-try:${ip}`, 30, 10 * 60_000)) throw new ApiError('요청이 너무 잦습니다. 잠시 뒤 다시 시도하세요.', 429);
    if (!timingSafeEqual(digest(given), digest(key))) {
        if (!allow(`admin-fail:${ip}`, 10, 10 * 60_000)) throw new ApiError('운영자 키가 여러 번 틀려 잠시 막았습니다.', 429);
        throw new ApiError('운영자 키가 맞지 않습니다.', 401);
    }
}

/** v27.28 SP 확인용: 보유 SP, 보스 첫 정복 연구 상태, 스킬에 쓴 SP, 남아 있는 SP 기록. */
export type AdminSp = { have: number; research: { name: string; sp: number; claimed: boolean }[]; spentSkills: { name: string; sp: number }[]; limitBreaks: { name: string; sp: number }[]; logs: string[] };
export type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rebirths: number; pearls: number; gold: number; sp: AdminSp; inDungeon: boolean; revision: number; updatedAt: number };
const spView = (s: State): AdminSp => ({
    have: s.sp || 0,
    research: DUNGEONS.filter(d => BOSS_RESEARCH[d.id] && (s.clears?.[d.id] || 0) > 0).map(d => ({ name: d.name, sp: BOSS_RESEARCH[d.id].sp, claimed: !!s.bossResearchClaims?.[d.id] })),
    spentSkills: Object.entries(s.skillSpent || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ name: skillById(id)?.name || id, sp: n })),
    limitBreaks: Object.entries(s.limitBreaks || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ name: `${skillById(id)?.name || id} ${n}단계`, sp: PROGRESSION.limitBreak.sp.slice(0, n).reduce((a, b) => a + b, 0) })),
    logs: (s.logs || []).filter(l => /SP [+-]|SP 계승/.test(l.text)).slice(-10).map(l => l.text),
});
const view = (id: string, username: string, revision: number, updatedAt: number, s: State): AdminPlayer => {
    const [, slot] = id.split('#');
    return { id, username, slot: Number(slot || 1), name: s.name, level: s.level, job: jobById(s.job)?.name || s.job, rebirths: s.rebirths || 0, pearls: s.pearls || 0, gold: Math.floor(s.gold || 0), sp: spView(s), inDungeon: !!s.dungeon, revision, updatedAt };
};

/** 낚시꾼 이름(부분 일치) 또는 로그인 아이디(정확히)로 찾습니다. 최대 30명. */
export async function searchPlayers(query: string) {
    const q = query.trim();
    if (q.length < 1 || q.length > 40) throw new ApiError('검색어는 1~40자입니다.');
    const database = db();
    const accounts = new Map((await database.listAccounts()).map(a => [a.id, a.username]));
    const lower = q.toLowerCase(), out: AdminPlayer[] = [];
    for (const row of await database.listPlayers()) {
        let s: State; try { s = JSON.parse(row.state); } catch { continue; }
        const username = accounts.get(row.id.split('#')[0]) || '';
        if (username === lower || (typeof s.name === 'string' && s.name.toLowerCase().includes(lower))) out.push(view(row.id, username, row.revision, row.updated_at, s));
    }
    return out.sort((a, b) => Number(b.name === q) - Number(a.name === q) || b.updatedAt - a.updatedAt).slice(0, 30);
}

async function load(id: string) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}(#[1-3])?$/.test(id)) throw new ApiError('대상이 올바르지 않습니다.');
    const row = await db().getPlayer(id);
    if (!row) throw new ApiError('세이브를 찾지 못했습니다.', 404);
    return row;
}
const usernameOf = async (id: string) => (await db().listAccounts()).find(a => a.id === id.split('#')[0])?.username || '';

/** 이번 생 초기화 미리 보기: 저장하지 않고 전/후만 돌려줍니다. */
export async function previewRestart(id: string) {
    const row = await load(id), now = Date.now(), username = await usernameOf(id);
    const s = migrateState(JSON.parse(row.state) as State, now), before = view(id, username, row.revision, now, s);
    restartLife(s, now);
    return { before, after: view(id, username, row.revision, now, s) };
}

/** 이번 생 초기화 적용. 미리 보기 때의 revision과 다르면(그사이 게임이 저장) 덮어쓰지 않습니다. */
export async function applyRestart(id: string, revision: number) {
    const row = await load(id), now = Date.now(), username = await usernameOf(id);
    if (!Number.isInteger(revision) || row.revision !== revision) throw new ApiError('미리 본 뒤에 게임이 저장되었습니다. 미리 보기를 다시 눌러 주세요.', 409);
    const s = migrateState(JSON.parse(row.state) as State, now), before = view(id, username, row.revision, now, s);
    restartLife(s, now);
    if (!await db().updatePlayer(id, JSON.stringify(s), now, revision)) throw new ApiError('그사이 게임이 저장되었습니다. 미리 보기를 다시 눌러 주세요.', 409);
    console.info('admin restartLife', { id, username, from: before.level });
    return { before, after: view(id, username, revision + 1, now, s) };
}

// ---------- v27.27 골드·진주 조정 ----------
export const ADMIN_LIMITS = { gold: 1e15, pearls: 1e7 };
const amount = (v: unknown, max: number, label: string) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > max) throw new ApiError(`${label} 값은 0 이상 ${max.toLocaleString()} 이하의 정수로 입력하세요.`);
    return n;
};
/** 골드·진주를 입력한 값으로 맞춥니다. 그사이 게임이 저장되면 최신 세이브에 다시 적용합니다(최대 3번). */
export async function adjustCurrency(id: string, input: { gold?: unknown; pearls?: unknown }) {
    const gold = amount(input.gold, ADMIN_LIMITS.gold, '골드'), pearls = amount(input.pearls, ADMIN_LIMITS.pearls, '진주');
    if (gold === undefined && pearls === undefined) throw new ApiError('바꿀 골드나 진주 값을 입력하세요.');
    const username = await usernameOf(id);
    for (let attempt = 0; attempt < 3; attempt++) {
        const row = await load(id), now = Date.now();
        const s = migrateState(JSON.parse(row.state) as State, now), before = view(id, username, row.revision, now, s);
        if (gold !== undefined) s.gold = gold;
        if (pearls !== undefined) s.pearls = pearls;
        if (await db().updatePlayer(id, JSON.stringify(s), now, row.revision)) {
            console.info('admin adjustCurrency', { id, username, gold: [before.gold, s.gold], pearls: [before.pearls, s.pearls] });
            return { before, after: view(id, username, row.revision + 1, now, s) };
        }
    }
    throw new ApiError('게임이 계속 저장되고 있어 적용하지 못했습니다. 잠시 뒤 다시 시도하세요.', 409);
}

// ---------- v27.27 서버 이벤트 설정 ----------

const MULTS = ['exp', 'gold', 'drop', 'mastery'] as const;
/** 이벤트 목록: 코드 이벤트(끔 여부)와 운영 페이지 이벤트, 지금 배너 문구. */
export async function listEvents(now = Date.now()) {
    const config = await readEventConfig();
    const live = (e: ServerEvent) => Date.parse(e.from) <= now && now <= Date.parse(e.until);
    const all = [...SERVER_EVENTS.filter(e => !config.disabled.includes(e.id)), ...config.extra];
    const active = activeEvent(now, all);
    return {
        code: SERVER_EVENTS.map(e => ({ ...e, disabled: config.disabled.includes(e.id), live: live(e) })),
        extra: config.extra.map(e => ({ ...e, live: live(e) })),
        banner: active ? eventLabel(active) : '',
    };
}
/** 운영 페이지 이벤트 추가·수정. 배율은 1~10, 이름 40자, 시작 < 종료, 기간 최대 60일. */
export async function saveEvent(input: Record<string, unknown>) {
    const name = String(input.name ?? '').trim().slice(0, 40);
    const from = String(input.from ?? ''), until = String(input.until ?? '');
    const a = Date.parse(from), b = Date.parse(until);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) throw new ApiError('시작·종료 시각을 확인하세요(시작이 종료보다 앞이어야 합니다).');
    if (b - a > 60 * 86400_000) throw new ApiError('이벤트 기간은 최대 60일입니다.');
    const event: ServerEvent = { id: typeof input.id === 'string' && /^admin-[a-z0-9]{6,20}$/.test(input.id) ? input.id : `admin-${Date.now().toString(36)}`, name, from: new Date(a).toISOString(), until: new Date(b).toISOString() };
    for (const k of MULTS) {
        const v = Number(input[k] ?? 1);
        if (!Number.isFinite(v) || v < 1 || v > 10) throw new ApiError('배율은 1~10 사이로 입력하세요.');
        if (v !== 1) event[k] = Math.round(v * 100) / 100;
    }
    if (!event.name && MULTS.every(k => event[k] === undefined)) throw new ApiError('이름이나 배율 중 하나는 있어야 합니다.');
    const config = await readEventConfig();
    const extra = [...config.extra.filter(e => e.id !== event.id), event].slice(-20);
    await writeEventConfig({ ...config, extra });
    console.info('admin event saved', { id: event.id, from: event.from, until: event.until });
    return listEvents();
}
export async function deleteEvent(id: string) {
    const config = await readEventConfig();
    await writeEventConfig({ ...config, extra: config.extra.filter(e => e.id !== id) });
    return listEvents();
}
/** 코드에 들어 있는 이벤트를 끄거나 다시 켭니다. */
export async function toggleCodeEvent(id: string, disabled: boolean) {
    if (!SERVER_EVENTS.some(e => e.id === id)) throw new ApiError('없는 이벤트입니다.');
    const config = await readEventConfig();
    const set = new Set(config.disabled); if (disabled) set.add(id); else set.delete(id);
    await writeEventConfig({ ...config, disabled: [...set] });
    return listEvents();
}
