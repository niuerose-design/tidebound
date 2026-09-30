// 길드는 이름·가입·명예 기부 기록만 남깁니다. research·mission·raid·medals 필드는 이전 기록 보존용입니다.
export const guildLevelXp = (level: number) => level * 1000;
export const newGuild = () => ({
    name: '', level: 0, xp: 0, treasury: 0, contribution: 0, medals: 0,
    research: {} as Record<string, number>, missionKills: 0, missionDungeons: 0,
    missionClaimed: {} as Record<string, boolean>, raidTier: 1, raidBest: 0, lastRaid: 0,
});
