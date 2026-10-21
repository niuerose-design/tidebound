import { describe, it, expect } from 'vitest';
import { anonymizeState } from '@/game/systems/anonymize';
import type { State } from '@/game/types';

describe('anonymizeState (v3.375)', () => {
    const s = {
        version: 8, name: '진짜이름', level: 44, gold: 10, job: 'wanderer', logs: [{ id: 1, text: '달팽이를 처치했습니다.', type: 'battle' }],
        account: { slot: 1, slots: [{ slot: 1, name: '진짜이름' }] }, guildMember: { id: 'g1', name: '길드' }, guildStats: { key: 'w' },
        expedition: { round: 2, last: { won: true, opponent: '남의이름', log: [] }, ghostSeen: { acct_x: 2 } },
        expeditionRecent: [{ at: 1, round: 3, wins: 2, cleared: false, abyss: 0, reward: 1, why: 'x', code: 'TB1.abc' }],
        expeditionTarget: { code: 'TB1.x', units: [], author: '남', memo: '메모' }, expeditionShareMemo: '내 메모', duelDay: { key: 'd', count: 1, opponents: { 남: 1 } },
        enemy: { id: 'minnow', name: '달팽이', hp: 1, maxHp: 1 },
    } as unknown as State;
    it('removes names, account, guild, opponents and memos but keeps game values', () => {
        const a = anonymizeState(s, 3);
        expect(a.name).toBe('표본3'); expect(a.account).toBeUndefined(); expect(a.guildMember).toBeUndefined(); expect(a.guildStats).toBeUndefined(); expect(a.expeditionTarget).toBeUndefined(); expect(a.duelDay).toBeUndefined();
        expect(a.expedition?.last?.opponent).toBe('상대'); expect(a.expedition?.ghostSeen).toEqual({}); expect(a.expeditionShareMemo).toBe(''); expect(a.expeditionRecent?.[0]).not.toHaveProperty('code');
        expect(a.enemy?.name).toBe('달팽이'); expect(a.level).toBe(44); expect(a.logs[0].text).toContain('달팽이');
        expect(JSON.stringify(a)).not.toContain('진짜이름'); expect(JSON.stringify(a)).not.toContain('남의이름'); expect(JSON.stringify(a)).not.toContain('메모');
    });
    it('does not mutate the input', () => { anonymizeState(s, 1); expect(s.name).toBe('진짜이름'); expect(s.account).toBeDefined(); });
});
