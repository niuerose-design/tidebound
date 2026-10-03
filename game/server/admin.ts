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
import type { State } from '../types';

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

export type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rebirths: number; pearls: number; gold: number; inDungeon: boolean; revision: number; updatedAt: number };
const view = (id: string, username: string, revision: number, updatedAt: number, s: State): AdminPlayer => {
    const [, slot] = id.split('#');
    return { id, username, slot: Number(slot || 1), name: s.name, level: s.level, job: jobById(s.job)?.name || s.job, rebirths: s.rebirths || 0, pearls: s.pearls || 0, gold: Math.floor(s.gold || 0), inDungeon: !!s.dungeon, revision, updatedAt };
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
