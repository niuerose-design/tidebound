export const GUILD_RESEARCH = [
    { id: 'might', name: '길드의 깃발', desc: '물리·마법 공격 +2%', max: 10, base: 1000, step: 750 },
    { id: 'bastion', name: '산호 요새', desc: '최대 체력 +3%', max: 10, base: 1000, step: 750 },
    { id: 'treasury', name: '공동 금고', desc: '포획·던전 골드 +4%', max: 10, base: 1200, step: 900 },
    { id: 'scouting', name: '정찰망', desc: '장비 드롭 확률 +0.5%p', max: 10, base: 1400, step: 1000 },
] as const;
export const GUILD_MISSIONS = [
    { id: 'kills', name: '파도 정리', goal: 100, reward: 3, desc: '물고기 100마리 포획' },
    { id: 'dungeons', name: '심해 원정', goal: 1, reward: 5, desc: '던전 1회 정복' },
] as const;
export const guildResearchCost = (id: string, rank: number) => {
    const r = GUILD_RESEARCH.find(x => x.id === id);
    return r ? r.base + r.step * rank : Infinity;
};
export const guildLevelXp = (level: number) => level * 1000;
export const newGuild = () => ({
    name: '', level: 0, xp: 0, treasury: 0, contribution: 0, medals: 0,
    research: {} as Record<string, number>, missionKills: 0, missionDungeons: 0,
    missionClaimed: {} as Record<string, boolean>, raidTier: 1, raidBest: 0, lastRaid: 0,
});
