/**
 * v3.43 정보 비공개 스위치(docs/concept.md 10.2-5). 오픈 베타 동안은 꺼 두고, 정식 오픈 때 운영 페이지에서 켭니다.
 * 환경 변수 TIDEBOUND_SECRECY(on · off)가 있으면 그것을 따르고, 없으면 서버 설정 secrecy를 인스턴스마다 30초 캐시로 읽습니다.
 * 쓰기는 운영 페이지에서 바꿀 때만 합니다.
 */
import { db } from './db';
import type { State } from '../types';
import type { Catalog } from '../data/catalog';
import { createHash } from 'node:crypto';
import { unlockStates } from '../secret/unlocks';
import { revealedSecretJobs } from '../systems/reveal';
import { jobById, lineageOf, type Job, type Lineage } from '../data/classes';
import { SECRET_JOBS, SECRET_LINEAGES } from '../secret/jobs';
import { SECRET_SKILLS } from '../secret/skills';
import { SERVER_ODDS } from '../secret/odds';
import { stageRewardAvgTable } from '../data/world';

const KEY = 'secrecy', TTL = 30_000;
const ODDS_KEY = createHash('sha1').update(JSON.stringify(SERVER_ODDS)).digest('base64url');
/** v3.55 사냥터별 평균 보상 배율 표: 바뀌지 않으므로 처음 한 번 만들고, 키에는 지문만 더합니다. */
let stageAvg: { table: ReturnType<typeof stageRewardAvgTable>; key: string } | undefined;
let secretTables: string | undefined;
/** 비밀 직업 · 계보 · 스킬 표의 지문(배포마다 한 번). */
const secretTablesKey = () => secretTables ??= createHash('sha1').update(JSON.stringify([SECRET_JOBS.map(raw => jobById(raw.id) || raw), SECRET_LINEAGES, SECRET_SKILLS])).digest('base64url');
const stageAvgOnce = () => stageAvg ??= (t => ({ table: t, key: createHash('sha1').update(JSON.stringify(t)).digest('base64url') }))(stageRewardAvgTable());
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
const veilLineage = (l: Lineage): Lineage => ({ id: l.id, name: '???', tree: l.tree, summary: '아직 드러나지 않은 계보입니다.', ...(l.world ? { world: l.world } : {}) });
/**
 * 모험가마다 화면에 보낼 카탈로그. v3.62 숨은 조건 만족 여부(옛 문 상태) · 드러난 비밀 직업 · 비밀 직업(드러난 것만 전체, 나머지 실루엣)·계보.
 * v3.47 비밀 직업의 스킬: 드러난 직업 것과 내가 배운·장착한 것(실루엣 직업의 스킬은 보내지 않음).
 * 비공개가 꺼져 있으면(오픈 베타) 비밀 직업도 모두 전체로 보내 지금 화면과 같습니다. 조건 판정은 서버에서만 합니다.
 * known이 지금 내용 키와 같으면 null(다시 보내지 않음).
 */
export async function buildCatalog(s: State, now: number, known?: unknown): Promise<Catalog | null> {
    const secret = await secrecyOn(now), revealed = revealedSecretJobs(s), shown = new Set(revealed);
    const jobs = SECRET_JOBS.map(raw => jobById(raw.id) || raw).map(j => !secret || shown.has(j.id) ? j : veil(j));
    const lineages = SECRET_LINEAGES.map(l => !secret || SECRET_JOBS.some(j => shown.has(j.id) && lineageOf(jobById(j.id) || j) === l.id) ? l : veilLineage(l));
    const mine = (id: string) => s.skills.includes(id) || (s.learned?.[id] || 0) > 0;
    const skills = SECRET_SKILLS.filter(sk => !secret || (sk.job && shown.has(sk.job)) || mine(sk.id));
    const body: Catalog = { secret, unlocks: unlockStates(s), revealed, jobs, lineages, skills };
    // 키: 본문을 정하는 입력(비공개 여부 · 숨은 조건 · 드러난 직업 · 보낼 스킬 id)과 표 자체의 지문. 표 · 확률 수치는 바뀌지 않으므로 지문은 한 번만 만듭니다(요청마다 30KB 본문을 다시 해시하지 않음).
    const avg = stageAvgOnce();
    const key = createHash('sha1').update(JSON.stringify([secret, body.unlocks, revealed, skills.map(sk => sk.id)])).update(secretTablesKey()).update(secret ? '' : ODDS_KEY).update(avg.key).digest('base64url').slice(0, 16);
    return key === known ? null : { ...body, ...(secret ? {} : { odds: SERVER_ODDS }), stageAvg: avg.table, key };
}
