import type { Action, State } from '../types';
import { GUILD_MISSIONS, GUILD_RESEARCH, guildLevelXp, guildResearchCost } from '../data/guild';
import { stats, power, goldMultiplier } from './stats';
export const guildHasJoined = (s: State) => Boolean(s.guild?.name);
export const guildBonus = (s: State, id: string) => (s.guild?.research?.[id] || 0);
export const guildLevelProgress = (s: State) => ({
    current: s.guild?.xp || 0,
    next: guildLevelXp(Math.max(1, s.guild?.level || 1)),
});
function requireGuild(s: State) {
    if (!guildHasJoined(s))
        throw Error('먼저 길드를 창설하세요.');
}
function grantXp(s: State, amount: number) {
    const g = s.guild;
    g.xp += amount;
    while (g.level < 20 && g.xp >= guildLevelXp(Math.max(1, g.level))) {
        g.xp -= guildLevelXp(Math.max(1, g.level));
        g.level++;
        g.medals += 2;
    }
}
export function guildAction(s: State, a: Action, now: number): string | null {
    const id = a.id || '';
    if (a.type === 'guildJoin') {
        if (guildHasJoined(s))
            throw Error('이미 길드에 가입되어 있습니다.');
        if (s.gold < 1000)
            throw Error('길드 창설에는 1,000 G가 필요합니다.');
        const name = (a.value || '심해개척단').trim().slice(0, 16);
        if (name.length < 2)
            throw Error('길드 이름은 2자 이상이어야 합니다.');
        s.gold -= 1000;
        s.guild.name = name;
        s.guild.level = 1;
        return `${name} 창설 · 길드 금고에 1,000 G를 넣었습니다.`;
    }
    if (a.type === 'guildRename') {
        requireGuild(s);
        const name = (a.value || '').trim().slice(0, 16);
        if (name.length < 2)
            throw Error('길드 이름은 2자 이상이어야 합니다.');
        if (name === s.guild.name)
            throw Error('현재 길드 이름과 같습니다.');
        if (s.gold < 500)
            throw Error('길드 이름 변경에는 500 G가 필요합니다.');
        s.gold -= 500;
        const previous = s.guild.name;
        s.guild.name = name;
        return `길드 이름 변경 · ${previous} → ${name} · -500 G`;
    }
    if (a.type === 'guildDonate') {
        requireGuild(s);
        const amount = Number(id);
        if (![100, 500, 1000, 5000].includes(amount))
            throw Error('기부 금액을 확인하세요.');
        if (s.gold < amount)
            throw Error('골드가 부족합니다.');
        s.gold -= amount;
        s.guild.treasury += amount;
        s.guild.contribution += amount;
        grantXp(s, Math.floor(amount / 10));
        return `길드 금고에 ${amount.toLocaleString()} G 기부 · 공헌도 +${amount}`;
    }
    if (a.type === 'guildResearch') {
        requireGuild(s);
        const r = GUILD_RESEARCH.find(x => x.id === id), rank = s.guild.research[id] || 0;
        if (!r || rank >= r.max)
            throw Error('길드 연구 한도를 확인하세요.');
        if (s.guild.level < Math.ceil((rank + 1) / 2))
            throw Error('길드 레벨이 부족합니다.');
        const cost = guildResearchCost(id, rank);
        if (s.guild.treasury < cost)
            throw Error('길드 금고가 부족합니다.');
        s.guild.treasury -= cost;
        s.guild.research[id] = rank + 1;
        return `${r.name} ${rank + 1}단계 연구 · 금고 -${cost.toLocaleString()} G`;
    }
    if (a.type === 'guildClaim') {
        requireGuild(s);
        const mission = GUILD_MISSIONS.find(x => x.id === id);
        if (!mission || s.guild.missionClaimed[id])
            throw Error('이미 받은 길드 임무 보상입니다.');
        const progress = id === 'kills' ? s.guild.missionKills : s.guild.missionDungeons;
        if (progress < mission.goal)
            throw Error('길드 임무 조건이 아직 부족합니다.');
        s.guild.missionClaimed[id] = true;
        s.guild.medals += mission.reward;
        grantXp(s, mission.reward * 100);
        return `${mission.name} 완료 · 길드 메달 +${mission.reward}`;
    }
    if (a.type === 'guildRaid') {
        requireGuild(s);
        if (s.guild.lastRaid > 0 && now - s.guild.lastRaid < 60 * 60 * 1000)
            throw Error('길드 레이드 입장권은 1시간마다 충전됩니다.');
        const tier = s.guild.raidTier;
        const entry = 1000 + tier * 500;
        if (s.guild.treasury < entry)
            throw Error(`길드 금고에 ${entry.toLocaleString()} G가 필요합니다.`);
        s.guild.treasury -= entry;
        s.guild.lastRaid = now;
        const damage = Math.floor(power(stats(s)) * (1 + s.guild.level * .08));
        const bossHp = 1800 * tier;
        if (damage >= bossHp) {
            const reward = Math.floor((3000 + tier * 1200) * goldMultiplier(s));
            s.gold += reward;
            s.guild.medals += 3 + Math.floor(tier / 5);
            s.guild.raidBest = Math.max(s.guild.raidBest, tier);
            s.guild.raidTier++;
            grantXp(s, tier * 200);
            return `길드 레이드 ${tier}단계 정복 · +${reward.toLocaleString()} G · 메달 +${3 + Math.floor(tier / 5)}`;
        }
        s.guild.medals += 1;
        grantXp(s, tier * 50);
        return `길드 레이드 ${tier}단계에 ${damage.toLocaleString()} 피해 · 메달 +1 (보스 HP ${bossHp.toLocaleString()})`;
    }
    return null;
}
