/**
 * v3.43 정보 비공개 스위치(docs/concept.md 10.2-5). 오픈 베타 동안은 꺼 두고, 정식 오픈 때 운영 페이지에서 켭니다.
 * 환경 변수 TIDEBOUND_SECRECY(on · off)가 있으면 그것을 따르고, 없으면 서버 설정 secrecy를 인스턴스마다 30초 캐시로 읽습니다.
 * 쓰기는 운영 페이지에서 바꿀 때만 합니다.
 */
import { db } from './db';
import type { State } from '../types';
import type { Catalog } from '../data/catalog';
import { createHash } from 'node:crypto';
import { doorView } from '../data/doors';
import { revealedSecretJobs } from '../systems/reveal';
import { jobById, lineageOf, type Job, type Lineage } from '../data/classes';
import { SECRET_JOBS, SECRET_LINEAGES } from '../secret/jobs';

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
/** v3.44 실루엣: 계보 안 자리(차수·상위·계보)와 힌트만 남기고 이름·설명·조건·능력치는 뺍니다. */
export const veil = (j: Job): Job => ({ id: j.id, name: '???', title: '', desc: '', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: j.tier, level: 1, mastery: 0, requires: {}, role: '', tree: j.tree,
    ...(j.parent ? { parent: j.parent } : {}), ...(j.lineage ? { lineage: j.lineage } : {}), hidden: true, ...(j.hint ? { hint: j.hint } : {}), masteryTarget: 1, masteryBoost: 0, veiled: true });
const veilLineage = (l: Lineage): Lineage => ({ id: l.id, name: '???', tree: l.tree, summary: '아직 드러나지 않은 계보입니다.' });
/**
 * 모험가마다 화면에 보낼 카탈로그. v3.44 문 상태 · 드러난 비밀 직업 · 비밀 직업(드러난 것만 전체, 나머지 실루엣)·계보.
 * 비공개가 꺼져 있으면(오픈 베타) 비밀 직업도 모두 전체로 보내 지금 화면과 같습니다. 조건 판정은 서버에서만 합니다.
 * known이 지금 내용 키와 같으면 null(다시 보내지 않음).
 */
export async function buildCatalog(s: State, now: number, known?: unknown): Promise<Catalog | null> {
    const secret = await secrecyOn(now), revealed = revealedSecretJobs(s), shown = new Set(revealed);
    const jobs = SECRET_JOBS.map(raw => jobById(raw.id) || raw).map(j => !secret || shown.has(j.id) ? j : veil(j));
    const lineages = SECRET_LINEAGES.map(l => !secret || SECRET_JOBS.some(j => shown.has(j.id) && lineageOf(jobById(j.id) || j) === l.id) ? l : veilLineage(l));
    const body: Catalog = { secret, doors: doorView(s), revealed, jobs, lineages };
    const key = createHash('sha1').update(JSON.stringify(body)).digest('base64url').slice(0, 16);
    return key === known ? null : { ...body, key };
}
