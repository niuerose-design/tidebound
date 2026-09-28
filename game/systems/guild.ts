import type { Action, State } from '../types';
import { guildLevelXp } from '../data/guild';
export const guildHasJoined = (s: State) => Boolean(s.guild?.name);
export const REMOVED_GUILD_ACTIONS = ['guildResearch', 'guildClaim', 'guildRaid'];
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
        return `길드 금고에 ${amount.toLocaleString()} G 기부 · 명예 공헌도 +${amount}`;
    }
    // v20.7: 길드 연구·임무·레이드는 개인 성장 보상이 있어 삭제했습니다. 이전 기록(연구 단계·메달·최고 단계)은 보존합니다.
    if (REMOVED_GUILD_ACTIONS.includes(a.type))
        throw Error('삭제된 길드 기능입니다.');
    return null;
}
