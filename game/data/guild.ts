// 길드는 이름·가입·명예 기부 기록만 남깁니다. research·mission·raid·medals 필드는 이전 기록 보존용입니다.
export const guildLevelXp = (level: number) => level * 1000;
export const newGuild = () => ({
    name: '', level: 0, xp: 0, treasury: 0, contribution: 0, medals: 0,
    research: {} as Record<string, number>, missionKills: 0, missionDungeons: 0,
    missionClaimed: {} as Record<string, boolean>, raidTier: 1, raidBest: 0, lastRaid: 0,
});

/**
 * v25.11 공유 길드: 서버의 guilds·guild_members 테이블에 사는 진짜 길드입니다(계정 단위, 최대 20명).
 * 개인 능력치 보너스는 없고(v20.7 결정 유지), 주간 길드 목표 달성 시 길드원 각자가 진주를 받습니다.
 * 아래는 서버와 화면이 함께 쓰는 순수 계산입니다.
 */
export const GUILD_MAX_MEMBERS = 20;
export const GUILD_CREATE_COST = 1000, GUILD_RENAME_COST = 500;
export const GUILD_DONATIONS = [1000, 5000, 50000, 500000];
/** 주간 합산 기록. abyss는 길드원 중 최고 깊이(최대값), 나머지는 합계. */
export type GuildTotals = { catches: number; clears: number; bosses: number; abyss: number; donated: number };
export const emptyTotals = (): GuildTotals => ({ catches: 0, clears: 0, bosses: 0, abyss: 0, donated: 0 });
/** 주간 길드 점수(기록판 정렬). 포획 1 · 던전 정복 20 · 보스 5 · 무릉도장 최고 층 10 · 기부 1,000G당 1. */
export const guildPoints = (t: GuildTotals) => t.catches + t.clears * 20 + t.bosses * 5 + t.abyss * 10 + Math.floor(t.donated / 1000);
export type GuildGoal = { id: 'catches' | 'clears' | 'bosses' | 'abyss'; title: string; target: number; pearls: number };
/** 주간 길드 목표: 길드원 수(최소 3명 기준)에 비례하는 합산 목표 3개와 고정 심연 목표 1개. 길드원 각자가 한 번씩 받습니다. */
export function makeGuildGoals(memberCount: number): GuildGoal[] {
    const n = Math.max(3, memberCount);
    return [
        { id: 'catches', title: `길드 합산 포획 ${(400 * n).toLocaleString()}마리`, target: 400 * n, pearls: 5 },
        { id: 'clears', title: `길드 합산 던전 정복 ${12 * n}회`, target: 12 * n, pearls: 6 },
        { id: 'bosses', title: `길드 합산 보스 ${20 * n}마리`, target: 20 * n, pearls: 5 },
        { id: 'abyss', title: '길드원 중 무릉도장 20층', target: 20, pearls: 4 },
    ];
}
export const guildGoalProgress = (g: GuildGoal, t: GuildTotals) => Math.min(g.target, t[g.id]);
/** 가입 코드: 헷갈리는 글자(0·O·1·I)를 뺀 6자. */
export const GUILD_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normalizeGuildCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
