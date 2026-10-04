import type { Action, State } from '../types';
import { guildLevelXp } from '../data/guild';
const REMOVED_GUILD_ACTIONS = ['guildResearch', 'guildClaim', 'guildRaid'];
export const guildLevelProgress = (s: State) => ({
    current: s.guild?.xp || 0,
    next: guildLevelXp(Math.max(1, s.guild?.level || 1)),
});
/** v25.11 혼자 쓰던 길드 액션(창설·이름·기부)은 서버 공유 길드(/api/guild)로 옮겼습니다. 이전 기록(명예 레벨·기부 합계)은 세이브에 그대로 남겨 화면에 보여줍니다. */
const LEGACY_GUILD_ACTIONS = ['guildJoin', 'guildRename', 'guildDonate'];
export function guildAction(s: State, a: Action): string | null {
    if (REMOVED_GUILD_ACTIONS.includes(a.type) || LEGACY_GUILD_ACTIONS.includes(a.type))
        throw Error('길드는 길드 화면에서 다룹니다(서버 공유 길드).');
    void s;
    return null;
}
