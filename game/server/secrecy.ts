/**
 * v3.40 정보 비공개 스위치(docs/concept.md 10.2-5). 오픈 베타 동안은 꺼 두고, 정식 오픈 때 운영 페이지에서 켭니다.
 * 환경 변수 TIDEBOUND_SECRECY(on · off)가 있으면 그것을 따르고, 없으면 서버 설정 secrecy를 인스턴스마다 30초 캐시로 읽습니다.
 * 쓰기는 운영 페이지에서 바꿀 때만 합니다.
 */
import { db } from './db';
import type { State } from '../types';
import type { Catalog } from '../data/catalog';
import { doorView } from '../data/doors';
import { revealedSecretJobs } from '../systems/reveal';

const KEY = 'secrecy', TTL = 30_000;
let cached: { at: number; on: boolean } | null = null;
export async function secrecyOn(now: number) {
    const env = process.env.TIDEBOUND_SECRECY;
    if (env === 'on' || env === 'off') return env === 'on';
    if (cached && now - cached.at < TTL) return cached.on;
    try { cached = { at: now, on: (await db().getSetting(KEY)) === 'on' }; }
    catch { cached = { at: now, on: cached?.on ?? false }; }
    return cached.on;
}
export async function setSecrecy(on: boolean, now: number) {
    await db().setSetting(KEY, on ? 'on' : 'off', now);
    cached = { at: now, on };
    return { on, env: process.env.TIDEBOUND_SECRECY || null };
}
/** 모험가마다 화면에 보낼 카탈로그. v3.41 문 상태와 드러난 비밀 직업(조건 판정은 서버에서만). */
export async function buildCatalog(s: State, now: number): Promise<Catalog> {
    return { secret: await secrecyOn(now), doors: doorView(s), revealed: revealedSecretJobs(s) };
}
