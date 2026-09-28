/** 환생과 전체 초기화 */
import { deepVoyagePearls, nextLifeBonus, TAILWIND_EXP, rebirthLevel, rebirthReward } from '../meta';
import { stats } from '../stats';
import type { ActionHandlers } from './types';
import { addLog, newState } from '../state';

export const lifecycleActions: ActionHandlers = {
    rebirth(s, { now }) {
        if (s.level < rebirthLevel(s))
            throw Error(`레벨 ${rebirthLevel(s)}부터 환생할 수 있습니다.`);
        const pearls = rebirthReward(s, stats(s).rebirthBonus || 0), deepPearls = deepVoyagePearls(s), lifeBonus = nextLifeBonus(s);
        const fresh = newState(now);
        fresh.gold = 100 + (s.permanent.starting || 0) * 500;
        fresh.inventory = s.inventory.filter(i => i.relic);
        for (const [slot, item] of Object.entries(s.equipment)) {
            if (item?.relic)
                fresh.equipment[slot] = item;
        }
        fresh.abyssBest = s.abyssBest;
        fresh.shopSerial = s.shopSerial;
        Object.assign(s, { ...fresh, skillSpecializations: s.skillSpecializations, bossResearchClaims: s.bossResearchClaims, abyssMilestones: s.abyssMilestones, lifeBonus, growthGoal: s.growthGoal, name: s.name, pearls: s.pearls + pearls, rebirths: s.rebirths + 1, permanent: s.permanent, book: s.book, clears: s.clears, kills: s.kills, deaths: s.deaths, rating: s.rating, wins: s.wins, losses: s.losses, lastDuel: s.lastDuel, bestStage: s.bestStage, sp: s.sp, peakLevel: s.peakLevel, learned: s.learned, skillSpent: s.skillSpent, skillInheritances: s.skillInheritances, skillPractice: s.skillPractice, jobMastery: s.jobMastery, unlockedJobs: s.unlockedJobs, bookClaims: s.bookClaims, itemBook: s.itemBook, presets: s.presets, guild: s.guild, voyage: s.voyage, tutorial: s.tutorial });
        s.hp = stats(s).hp;
        s.mana = stats(s).mana;
        addLog(s, `새로운 항해가 시작됩니다. 환생 진주 +${pearls}${deepPearls ? ` (깊은 항해 +${deepPearls} 포함)` : ''}`);
        if (lifeBonus === 'deep') addLog(s, 'Lv.100 완주 · 이번 생 동안 직업·스킬 숙련 기본 획득 +2', 'reward');
        if (lifeBonus === 'tailwind') addLog(s, `순풍 · Lv.${rebirthLevel(s)}까지 경험치 +${TAILWIND_EXP * 100}%`, 'reward');
    },
    resetData(s, { now }) {
        if (s.running || s.dungeon)
            throw Error('자동 낚시와 던전을 먼저 멈춘 뒤 초기화하세요.');
        const name = s.name;
        Object.assign(s, newState(now), { name });
    },
};
