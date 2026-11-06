import 'server-only';
/**
 * v3.464 아제로스 개척 서버(docs/balance-rebirth.md 15절): 승천자가 세계석을 바쳐 채우는 서버 공용 게이지와, 열린 지역의 공개 범위를 정하는 승천자 투표.
 * 제단처럼 settings 한 칸(JSON)에 두고 30초 캐시로 읽습니다. 쓰기는 바치기 · 투표 열기 · 투표 · 승천자 등록에서만 일어납니다.
 */
import { db } from './db';
import { PIONEER, PIONEER_REGIONS, pioneerRegionById, pioneerAccessName, LINEAGE_KEY_COST, type PioneerLineageInfo, type PioneerRegionId, type PioneerAccess, type PioneerVote, type PioneerVoteResult, type PioneerInfo, type PioneerRegionInfo, type PioneerStatus } from '../data/pioneer';
import { PIONEER_REGION_JOBS, pioneerOpen, pioneerRegionOf } from '../secret/pioneer';
import { ascended } from '../data/ascension';
import { jobById, lineageOf, LINEAGES } from '../data/classes';
import { jobRevealed } from '../systems/reveal';
import { addLog } from '../systems/state';
import { ApiError } from './store';
import type { State } from '../types';

type RegionState = { points: number; contributions: Record<string, { name: string; points: number }>; openedAt?: number; openedBy?: string; access: PioneerAccess; vote?: PioneerVote; result?: PioneerVoteResult };
type Store = { regions: Partial<Record<PioneerRegionId, RegionState>>; ascended: Record<string, { name: string; at: number }> };
const KEY = 'pioneer';
let cached: { at: number; store: Store } | null = null;
const blank = (): RegionState => ({ points: 0, contributions: {}, access: 'ascended' });
function parse(raw: string | null): Store {
    try { const v = raw ? JSON.parse(raw) as Partial<Store> : {}; return { regions: v.regions || {}, ascended: v.ascended || {} }; }
    catch { return { regions: {}, ascended: {} }; }
}
const regionState = (store: Store, id: PioneerRegionId) => store.regions[id] ??= blank();
async function write(store: Store, now: number) { await db().setSetting(KEY, JSON.stringify(store), now); cached = { at: now, store }; }
async function announce(text: string, now: number) {
    try { await db().postChat({ channel: 'news', account_id: 'system', name: '개척', text, created_at: now }); } catch { /* 소식은 부가 기능 */ }
}
/** 테스트용: 캐시와 저장을 비웁니다. */
export async function resetPioneer(now: number) { cached = null; await write({ regions: {}, ascended: {} }, now); }
/** 30초 캐시. 읽는 김에 기간이 끝난 투표를 정산합니다. */
export async function readPioneer(now: number, force = false): Promise<Store> {
    if (!force && cached && now - cached.at < PIONEER.cacheMs) return cached.store;
    const store = parse(await db().getSetting(KEY));
    if (await settleVotes(store, now)) await write(store, now); else cached = { at: now, store };
    return store;
}
const tally = (vote: PioneerVote) => { let all = 0, asc = 0; for (const c of Object.values(vote.votes)) if (c === 'all') all++; else asc++; return { all, ascended: asc }; };
/** 기간이 끝난 투표: 과반, 동률이거나 표가 없으면 개최자의 선택(15.4). */
async function settleVotes(store: Store, now: number) {
    let changed = false;
    for (const def of PIONEER_REGIONS) {
        const r = store.regions[def.id]; if (!r?.vote || r.vote.until > now) continue;
        const { all, ascended: asc } = tally(r.vote), access: PioneerAccess = all > asc ? 'all' : asc > all ? 'ascended' : r.vote.choice;
        r.result = { by: r.vote.by, byName: r.vote.byName, access, at: now, all, ascended: asc }; r.access = access; delete r.vote; changed = true;
        await announce(`${def.name} 투표가 끝났습니다 · ${pioneerAccessName(access)} · 모두에게 공개 ${all}표, 승천자 전용 ${asc}표`, now);
    }
    return changed;
}
/** 아직 열리지 않은 첫 지역. 모두 열렸으면 null. */
export const nextRegion = (store: Store): PioneerRegionId | null => PIONEER_REGIONS.find(def => !store.regions[def.id]?.openedAt)?.id ?? null;
/** 승천자 명부: 개척 화면을 연 승천자를 한 번 적어 둡니다(‘서버에 승천자가 한 명뿐’ 판정). */
export async function registerAscended(id: string, s: State, now: number) {
    if (!ascended(s)) return;
    const store = await readPioneer(now);
    if (store.ascended[id]?.name === s.name) return;
    store.ascended[id] = { name: s.name, at: now }; await write(store, now);
}
const sorted = (r: RegionState) => Object.entries(r.contributions).map(([id, c]) => ({ id, ...c })).sort((a, b) => b.points - a.points);
/** 바치기 전 검사(세이브 쪽). */
export function offerCheck(s: State, pearls: number, store: Store) {
    if (!ascended(s)) throw new ApiError('개척에는 승천한 모험가만 세계석을 바칠 수 있습니다.');
    if (!Number.isFinite(pearls) || pearls < PIONEER.minOffer || pearls > PIONEER.maxOffer || Math.floor(pearls) !== pearls) throw new ApiError(`세계석은 ${PIONEER.minOffer}개부터 ${PIONEER.maxOffer.toLocaleString()}개까지 바칠 수 있습니다.`);
    if ((s.pearls || 0) < pearls) throw new ApiError('세계석이 모자랍니다.');
    if (!nextRegion(store)) throw new ApiError('아제로스의 모든 지역이 열렸습니다.');
}
/** 세이브에서 세계석을 빼고 기록합니다(저장이 끝난 뒤 commitOffer로 게이지에 더함). */
export function applyOffer(s: State, pearls: number, region: PioneerRegionId) {
    s.pearls -= pearls; s.pioneer = { points: (s.pioneer?.points || 0) + pearls };
    addLog(s, `아제로스 개척 · ${pioneerRegionById(region)?.name || region}에 세계석 ${pearls.toLocaleString()}개를 바쳤습니다 · 누적 ${s.pioneer.points.toLocaleString()}개`, 'reward');
}
/** 게이지에 더하고, 비용이 차면 지역을 엽니다. 넘친 세계석은 다음 지역으로 넘어갑니다. */
export async function commitOffer(id: string, name: string, pearls: number, now: number) {
    const store = await readPioneer(now, true);
    const opened: PioneerRegionId[] = []; let left = pearls;
    for (const def of PIONEER_REGIONS) {
        if (left <= 0) break;
        const r = regionState(store, def.id); if (r.openedAt) continue;
        const take = Math.min(left, def.cost - r.points); left -= take; r.points += take;
        const c = r.contributions[id] ??= { name, points: 0 }; c.points += take; c.name = name;
        if (r.points >= def.cost) {
            r.openedAt = now; r.openedBy = sorted(r)[0]?.name || name; r.access = 'ascended'; opened.push(def.id);
            await announce(`승천자들이 아제로스 ${josa(def.name)} 열었습니다 · 가장 많이 바친 ${r.openedBy} · 지금은 승천자 전용이고 투표로 공개 범위를 정합니다`, now);
        }
    }
    await write(store, now);
    return { opened, left };
}
const josa = (word: string) => { const code = word.charCodeAt(word.length - 1); const final = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0; return `${word}${final ? '을' : '를'}`; };
/** 투표를 열 수 있는지: 지역이 열려 있고 진행 중인 투표가 없어야 하며, 최다 기여자이거나 유예 7일이 지난 뒤의 2위입니다. 결과가 난 뒤에는 30일이 지나야 합니다. */
export function voteOpener(store: Store, region: PioneerRegionId, id: string, s: State, now: number): { ok: boolean; why?: string } {
    const r = store.regions[region], def = pioneerRegionById(region);
    if (!r?.openedAt || !def) return { ok: false, why: '아직 열리지 않은 지역입니다.' };
    if (!ascended(s)) return { ok: false, why: '승천한 모험가만 투표를 열 수 있습니다.' };
    if (r.vote) return { ok: false, why: '투표가 진행 중입니다.' };
    const since = r.result ? r.result.at + PIONEER.revoteMs : r.openedAt;
    if (r.result && now < since) return { ok: false, why: `다시 투표는 ${new Date(since).toLocaleDateString('ko-KR')}부터 열 수 있습니다.` };
    const rank = sorted(r).findIndex(c => c.id === id);
    if (rank === 0) return { ok: true };
    if (rank === 1 && now - since >= PIONEER.openerGraceMs) return { ok: true };
    if (rank === 1) return { ok: false, why: '최다 기여자가 7일 안에 열지 않으면 두 번째 기여자가 열 수 있습니다.' };
    return { ok: false, why: '이 지역에 가장 많이 바친 승천자가 엽니다.' };
}
export async function openVote(id: string, s: State, region: PioneerRegionId, choice: PioneerAccess, now: number) {
    const store = await readPioneer(now, true), def = pioneerRegionById(region);
    if (!def) throw new ApiError('없는 지역입니다.');
    const can = voteOpener(store, region, id, s, now); if (!can.ok) throw new ApiError(can.why || '투표를 열 수 없습니다.');
    const r = regionState(store, region);
    if (Object.keys(store.ascended).filter(x => x !== id).length === 0) {
        r.result = { by: id, byName: s.name, access: choice, at: now, all: choice === 'all' ? 1 : 0, ascended: choice === 'ascended' ? 1 : 0, sole: true }; r.access = choice;
        await write(store, now);
        await announce(`${def.name} · 서버의 유일한 승천자 ${s.name}이(가) 공개 범위를 ${pioneerAccessName(choice)}으로 정했습니다`, now);
        return { settled: true as const, access: choice };
    }
    r.vote = { by: id, byName: s.name, openedAt: now, until: now + PIONEER.voteMs, choice, votes: { [id]: choice } };
    await write(store, now);
    await announce(`${s.name}이(가) ${def.name}의 공개 범위 투표를 열었습니다 · 제안 ${pioneerAccessName(choice)} · 72시간 동안 승천자 1인 1표`, now);
    return { settled: false as const };
}
export async function castVote(id: string, s: State, region: PioneerRegionId, choice: PioneerAccess, now: number) {
    if (!ascended(s)) throw new ApiError('승천한 모험가만 투표할 수 있습니다.');
    const store = await readPioneer(now, true), r = store.regions[region];
    if (!r?.vote) throw new ApiError('진행 중인 투표가 없습니다.');
    r.vote.votes[id] = choice; await write(store, now);
}
/** v3.468 계보 입문권 사기(세이브 쪽, mutate 안에서). 지역이 열려 있고, 아직 들어갈 수 없는 계보여야 하며, 세계석을 냅니다. 승천 여부는 보지 않습니다. */
export function buyLineageKey(s: State, jobId: string, store: Store) {
    const region = pioneerRegionOf(jobId), def = region && pioneerRegionById(region), job = jobById(jobId);
    if (!region || !def || !job) throw new ApiError('없는 계보입니다.');
    const cost = LINEAGE_KEY_COST[region];
    if (!cost) throw new ApiError('입문권이 없는 지역입니다.');
    if (!store.regions[region]?.openedAt) throw new ApiError(`${def.name}이(가) 아직 열리지 않았습니다.`);
    if (s.lineageKeys?.includes(jobId) || s.unlockedJobs.includes(jobId)) throw new ApiError('이미 들어간 계보입니다.');
    if (pioneerOpen(s, jobId)) throw new ApiError('지금도 들어갈 수 있는 계보라 입문권이 필요 없습니다.');
    if ((s.pearls || 0) < cost) throw new ApiError(`세계석이 모자랍니다. ${cost.toLocaleString()}개가 필요합니다.`);
    s.pearls -= cost; (s.lineageKeys ??= []).push(jobId);
    const lineage = LINEAGES.find(x => x.id === lineageOf(job));
    addLog(s, `세계석 ${cost.toLocaleString()}개로 ${lineage?.name || job.name}의 입문권을 샀습니다. 승천해도 남습니다.`, 'reward');
    return { cost, name: lineage?.name || job.name };
}
/** 화면 정보. 계보 이름은 이 모험가에게 드러난 것만 적습니다. */
export async function pioneerInfo(id: string, s: State, now: number): Promise<PioneerInfo> {
    const store = await readPioneer(now);
    const regions: PioneerRegionInfo[] = PIONEER_REGIONS.map(def => {
        const r = store.regions[def.id] || blank(), board = sorted(r);
        const lineages: PioneerLineageInfo[] = def.id === 'koprulu' ? LINEAGES.filter(l => l.world === 'koprulu').map(l => ({ job: l.id, name: l.name, owned: false, open: !!r.openedAt, cost: 0 }))
            : PIONEER_REGION_JOBS[def.id].map(jobId => { const j = jobById(jobId), l = j && LINEAGES.find(x => x.id === lineageOf(j)); const owned = !!s.lineageKeys?.includes(jobId) || !!s.unlockedJobs?.includes(jobId); return { job: jobId, name: j && l && jobRevealed(s, j) ? l.name : null, owned, open: owned || pioneerOpen(s, jobId), cost: LINEAGE_KEY_COST[def.id] }; });
        const can = voteOpener(store, def.id, id, s, now);
        return {
            ...def, points: Math.min(def.cost, r.points), open: !!r.openedAt, openedAt: r.openedAt, openedBy: r.openedBy, access: r.access, lineages,
            board: board.slice(0, PIONEER.boardSize).map(c => ({ name: c.name, points: c.points, self: c.id === id })), mine: r.contributions[id]?.points || 0,
            vote: r.vote ? { ...r.vote, mine: r.vote.votes[id], ...tally(r.vote) } : null, result: r.result || null,
            canOpenVote: can.ok, ...(can.why ? { openVoteWhy: can.why } : {}),
        };
    });
    return { ascended: ascended(s), ascendedCount: Object.keys(store.ascended).length, regions, next: nextRegion(store) };
}
/** 게임 동기화마다 세이브에 열린 지역과 공개 범위를 적습니다(전직 조건 판정용). 바뀐 것이 없으면 그대로 둡니다. */
export async function syncPioneerStatus(s: State, now: number) {
    try {
        const store = await readPioneer(now), open: PioneerStatus['open'] = {};
        for (const def of PIONEER_REGIONS) { const r = store.regions[def.id]; if (r?.openedAt) open[def.id] = r.access; }
        if (JSON.stringify(s.pioneerStatus?.open || {}) !== JSON.stringify(open)) s.pioneerStatus = { at: now, open };
    }
    catch (e) { if (process.env.TIDEBOUND_DEBUG) console.error('pioneer status', e); }
}
