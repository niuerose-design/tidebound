import type { State } from '../types';
import { db, type GuildRow, type GuildMemberRow } from './db';
import { ApiError } from './store';
import { addLog } from '../systems/state';
import { guildStatsFor } from '../systems/progress';
import { GUILD_MAX_MEMBERS, GUILD_CREATE_COST, GUILD_RENAME_COST, GUILD_DONATIONS, GUILD_CODE_LENGTH, randomInviteCode, normalizeGuildCode, makeGuildGoals, guildGoalProgress, guildPoints, emptyTotals, type GuildTotals } from '../data/guild';
import { weekKey } from '../data/time';

/**
 * v25.11 공유 길드 서비스. 길드는 계정 단위(캐릭터 슬롯 공통)이고, 세이브에는 소속 캐시(guildMember)와 이번 주 기여(guildStats)만 둡니다.
 * 기여 업로드는 5분에 한 번(v25.21), 소속 캐시 갱신은 10분에 한 번이라 평소 동기화에는 추가 질의가 없습니다.
 */
const UPLOAD_MS = 5 * 60_000, REFRESH_MS = 10 * 60_000, BOARD_SIZE = 20;
const cleanName = (name: unknown) => String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 16);
const randomCode = () => randomInviteCode(GUILD_CODE_LENGTH);
const totalsOf = (g: { week: string } & GuildTotals, week: string): GuildTotals => g.week === week ? { catches: g.catches, clears: g.clears, bosses: g.bosses, abyss: g.abyss, donated: g.donated } : emptyTotals();
const claimsOf = (m: GuildMemberRow, week: string) => m.week === week && m.claimed ? m.claimed.split(',').filter(Boolean) : [];
/** 채팅 채널 판정용 소속 캐시(인스턴스 메모리, 5분). 탈퇴·추방은 즉시 지웁니다. */
const channelCache = new Map<string, { guildId: string | null; until: number }>();
export async function guildIdOf(account: string, now: number) {
    const hit = channelCache.get(account);
    if (hit && hit.until > now) return hit.guildId;
    const m = await db().getGuildMember(account);
    if (channelCache.size > 5000) channelCache.clear();
    channelCache.set(account, { guildId: m?.guild_id || null, until: now + UPLOAD_MS });
    return m?.guild_id || null;
}
const forget = (account: string) => channelCache.delete(account);
const cacheMember = (s: State, g: GuildRow, account: string, now: number) => { s.guildMember = { id: g.id, name: g.name, code: g.leader === account ? g.code : undefined, leader: g.leader === account, syncedAt: now }; };

export type GuildInfo = {
    week: string;
    guild: null | { id: string; name: string; code?: string; leader: boolean; treasury: number; totals: GuildTotals; points: number; goals: { id: string; title: string; target: number; pearls: number; progress: number; claimed: boolean }[]; members: { account: string; name: string; leader: boolean; self: boolean; joinedAt: number; totals: GuildTotals; points: number }[] };
    board: { rank: number; id: string; name: string; points: number; self: boolean }[];
};
export async function guildInfo(account: string, now: number): Promise<GuildInfo> {
    // v3.94 내 소속과 주간 순위표, 길드와 길드원을 함께 읽습니다(DB 차례 대기 4번 → 2번).
    const database = db(), week = weekKey(now), [member, rows] = await Promise.all([database.getGuildMember(account), database.listGuildBoard(week, BOARD_SIZE)]);
    const board = rows.map((g, i) => ({ rank: i + 1, id: g.id, name: g.name, points: g.points, self: g.id === member?.guild_id }));
    if (!member) return { week, guild: null, board };
    const [g, members] = await Promise.all([database.getGuild(member.guild_id), database.listGuildMembers(member.guild_id)]);
    if (!g) { await database.removeGuildMember(account); forget(account); return { week, guild: null, board }; }
    const totals = totalsOf(g, week), claimed = claimsOf(member, week);
    return { week, board, guild: { id: g.id, name: g.name, code: g.leader === account ? g.code : undefined, leader: g.leader === account, treasury: g.treasury, totals, points: guildPoints(totals),
        goals: makeGuildGoals(members.length).map(goal => ({ ...goal, progress: guildGoalProgress(goal, totals), claimed: claimed.includes(goal.id) })),
        members: members.map(m => { const t = totalsOf(m, week); return { account: m.account_id, name: m.name, leader: m.account_id === g.leader, self: m.account_id === account, joinedAt: m.joined_at, totals: t, points: guildPoints(t) }; }) } };
}
/** 저장 전에 한 번: 소속이면 5분마다 이번 주 기여 차이를 올리고, 10분마다 소속 캐시(이름·리더·탈퇴 여부)를 맞춥니다. 무소속이면 질의 0. */
export async function syncGuild(account: string, s: State, now: number) {
    const cache = s.guildMember;
    if (!cache) return;
    const database = db();
    if (now - cache.syncedAt >= REFRESH_MS) {
        const m = await database.getGuildMember(account), g = m && await database.getGuild(m.guild_id);
        if (!m || !g) { delete s.guildMember; forget(account); return; }
        cacheMember(s, g, account, now);
        if (m.name !== s.name) await database.renameGuildMember(account, s.name);
    }
    const st = guildStatsFor(s, now), delta = { catches: st.catches - st.sentCatches, clears: st.clears - st.sentClears, bosses: st.bosses - st.sentBosses, abyss: st.abyss > st.sentAbyss ? st.abyss : 0 };
    if ((delta.catches || delta.clears || delta.bosses || delta.abyss) && now - st.sentAt >= UPLOAD_MS) await uploadStats(account, s, now);
}
async function uploadStats(account: string, s: State, now: number) {
    const st = guildStatsFor(s, now), week = st.key, database = db();
    const delta = { catches: st.catches - st.sentCatches, clears: st.clears - st.sentClears, bosses: st.bosses - st.sentBosses, abyss: st.abyss };
    if (s.guildMember) await Promise.all([database.bumpGuild(s.guildMember.id, week, delta), database.bumpGuildMember(account, week, delta)]);
    st.sentCatches = st.catches; st.sentClears = st.clears; st.sentBosses = st.bosses; st.sentAbyss = st.abyss; st.sentAt = now;
}
const requireMember = async (account: string) => { const m = await db().getGuildMember(account); if (!m) throw new ApiError('길드에 가입되어 있지 않습니다.'); const g = await db().getGuild(m.guild_id); if (!g) throw new ApiError('길드를 찾을 수 없습니다.'); return { m, g }; };

/** 아래 변경 함수들은 mutate의 extra 안에서 호출됩니다. DB 쓰기는 한 번만 일어나도록 호출자가 보장합니다(저장 충돌 재시도 시 상태만 다시 적용). */
export async function createGuild(account: string, s: State, rawName: unknown, now: number) {
    if (await db().getGuildMember(account)) throw new ApiError('이미 길드에 가입되어 있습니다.');
    const name = cleanName(rawName);
    if (name.length < 2) throw new ApiError('길드 이름은 2~16자입니다.');
    if (s.gold < GUILD_CREATE_COST) throw new ApiError(`길드 창설에는 ${GUILD_CREATE_COST.toLocaleString()} G가 필요합니다.`);
    const week = weekKey(now);
    let row: GuildRow | null = null;
    for (let attempt = 0; attempt < 5 && !row; attempt++) {
        const candidate: GuildRow = { id: `g_${randomCode()}${randomCode()}`.toLowerCase(), name, code: randomCode(), leader: account, treasury: 0, created_at: now, week, catches: 0, clears: 0, bosses: 0, abyss: 0, donated: 0, points: 0 };
        if (await db().getGuildByCode(candidate.code)) continue;
        if (await db().createGuild(candidate)) row = candidate;
        else if (attempt === 0 && !(await db().getGuildByCode(candidate.code))) throw new ApiError('이미 있는 길드 이름입니다.');
    }
    if (!row) throw new ApiError('길드를 만들지 못했습니다. 다시 시도하세요.', 503);
    await db().addGuildMember({ account_id: account, guild_id: row.id, name: s.name, joined_at: now, week, catches: 0, clears: 0, bosses: 0, abyss: 0, donated: 0, claimed: '' });
    forget(account);
    s.gold -= GUILD_CREATE_COST;
    cacheMember(s, row, account, now);
    addLog(s, `길드 ‘${name}’ 창설 · -${GUILD_CREATE_COST.toLocaleString()} G · 가입 코드 ${row.code}`, 'reward');
    return row.code;
}
export async function joinGuild(account: string, s: State, rawCode: unknown, now: number) {
    if (await db().getGuildMember(account)) throw new ApiError('이미 길드에 가입되어 있습니다.');
    const code = normalizeGuildCode(String(rawCode ?? ''));
    const g = code.length === 6 ? await db().getGuildByCode(code) : null;
    if (!g) throw new ApiError('가입 코드가 맞지 않습니다.');
    const members = await db().listGuildMembers(g.id);
    if (members.length >= GUILD_MAX_MEMBERS) throw new ApiError(`길드 정원(${GUILD_MAX_MEMBERS}명)이 찼습니다.`);
    await db().addGuildMember({ account_id: account, guild_id: g.id, name: s.name, joined_at: now, week: weekKey(now), catches: 0, clears: 0, bosses: 0, abyss: 0, donated: 0, claimed: '' });
    forget(account);
    cacheMember(s, g, account, now);
    const st = guildStatsFor(s, now); st.sentCatches = st.catches; st.sentClears = st.clears; st.sentBosses = st.bosses; st.sentAbyss = st.abyss; // 가입 전 기록은 올리지 않습니다.
    addLog(s, `길드 ‘${g.name}’ 가입`, 'reward');
}
export async function leaveGuild(account: string, s: State) {
    const { m, g } = await requireMember(account);
    await db().removeGuildMember(account); forget(account);
    if (g.leader === account) {
        const rest = (await db().listGuildMembers(g.id)).filter(x => x.account_id !== m.account_id);
        if (rest.length) await db().setGuildLeader(g.id, rest[0].account_id); else await db().deleteGuild(g.id);
    }
    delete s.guildMember;
    addLog(s, `길드 ‘${g.name}’ 탈퇴`, 'system');
}
export async function kickMember(account: string, target: unknown) {
    const { g } = await requireMember(account);
    if (g.leader !== account) throw new ApiError('길드장만 내보낼 수 있습니다.', 403);
    const t = String(target ?? ''); const tm = await db().getGuildMember(t);
    if (!tm || tm.guild_id !== g.id || t === account) throw new ApiError('대상을 확인하세요.');
    await db().removeGuildMember(t); forget(t);
}
export async function renameGuild(account: string, s: State, rawName: unknown, now: number) {
    const { g } = await requireMember(account);
    if (g.leader !== account) throw new ApiError('길드장만 이름을 바꿀 수 있습니다.', 403);
    const name = cleanName(rawName);
    if (name.length < 2) throw new ApiError('길드 이름은 2~16자입니다.');
    if (name === g.name) throw new ApiError('현재 길드 이름과 같습니다.');
    if (s.gold < GUILD_RENAME_COST) throw new ApiError(`이름 변경에는 ${GUILD_RENAME_COST} G가 필요합니다.`);
    if (!(await db().renameGuild(g.id, name))) throw new ApiError('이미 있는 길드 이름입니다.');
    s.gold -= GUILD_RENAME_COST;
    cacheMember(s, { ...g, name }, account, now);
    addLog(s, `길드 이름 변경 · ${g.name} → ${name} · -${GUILD_RENAME_COST} G`, 'reward');
}
export async function donate(account: string, s: State, rawAmount: unknown, now: number) {
    const { g } = await requireMember(account);
    const amount = Number(rawAmount);
    if (!GUILD_DONATIONS.includes(amount)) throw new ApiError('기부 금액을 확인하세요.');
    if (s.gold < amount) throw new ApiError('골드가 부족합니다.');
    const week = weekKey(now);
    await Promise.all([db().bumpGuild(g.id, week, { donated: amount }), db().bumpGuildMember(account, week, { donated: amount })]);
    s.gold -= amount;
    addLog(s, `길드 금고 기부 · -${amount.toLocaleString()} G · 이번 주 길드 점수 +${Math.floor(amount / 1000)}`, 'reward');
}
export async function claimGoal(account: string, s: State, goalId: unknown, now: number) {
    const { m, g } = await requireMember(account);
    await uploadStats(account, s, now); // 내 기록을 먼저 반영한 뒤 판정합니다.
    // v3.94 갱신된 길드 · 길드원 수 · 내 수령 기록을 함께 읽습니다.
    const week = weekKey(now), [freshRow, members, mine] = await Promise.all([db().getGuild(g.id), db().listGuildMembers(g.id), db().getGuildMember(account)]), fresh = freshRow || g;
    const goal = makeGuildGoals(members.length).find(x => x.id === goalId);
    if (!goal) throw new ApiError('없는 목표입니다.');
    const totals = totalsOf(fresh, week), claimed = claimsOf(mine || m, week);
    if (guildGoalProgress(goal, totals) < goal.target) throw new ApiError('아직 목표에 닿지 않았습니다.');
    if (claimed.includes(goal.id)) throw new ApiError('이번 주에 이미 받았습니다.');
    await db().bumpGuildMember(account, week, {}, [...claimed, goal.id].join(','));
    s.pearls += goal.pearls;
    addLog(s, `주간 길드 목표 달성 · ${goal.title} · 세계석 +${goal.pearls}`, 'reward');
    return goal.pearls;
}
