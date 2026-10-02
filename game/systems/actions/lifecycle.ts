/** 환생, 한 번의 숨 소프트 리셋, 서약 선택과 전체 초기화 */
import { deepVoyagePearls, nextLifeBonus, tailwindExp, rebirthLevel, rebirthReward } from '../meta';
import { stats } from '../stats';
import type { State, Vows } from '../../types';
import type { ActionHandlers } from './types';
import { addLog, newState } from '../state';
import { drawRebirthDoor } from '../../data/doors';
import { jobById, JOB_TREES } from '../../data/classes';
import { STAGES } from '../../data/world';
import { claimAchievements } from '../progress';
import { gainLevels, releaseAnchor } from '../encounter';
import { VOW_IDS, VOW_NAMES, type VowId, breathBonus, chooseAnchorTarget, cleanVows, hasVows, vowUnlocked, anchorSeal, anchorTargetName, ANCHOR_CATCHES } from '../vows';

/**
 * 새 생을 시작합니다. 환생과 소프트 리셋이 같은 초기화 범위를 씁니다(레벨·골드·일반 장비·직업·능력치 배분).
 * 연구·진주·유물·도감·스킬 성장 등 오래 남는 기록은 그대로 둡니다.
 */
function startLife(s: State, now: number, next: { pearls: number; rebirths: number; lifeBonus: State['lifeBonus'] }) {
    const fresh = newState(now);
    fresh.gold = 100 + (s.permanent.starting || 0) * 500;
    fresh.inventory = s.inventory.filter(i => i.relic);
    for (const [slot, item] of Object.entries(s.equipment)) {
        if (item?.relic)
            fresh.equipment[slot] = item;
    }
    fresh.abyssBest = s.abyssBest;
    fresh.shopSerial = s.shopSerial;
    Object.assign(s, { ...fresh, skillSpecializations: s.skillSpecializations, bossResearchClaims: s.bossResearchClaims, abyssMilestones: s.abyssMilestones, lifeBonus: next.lifeBonus, growthGoal: s.growthGoal, name: s.name, pearls: next.pearls, essence: s.essence || 0, rebirths: next.rebirths, permanent: s.permanent, book: s.book, clears: s.clears, kills: s.kills, deaths: s.deaths, rating: s.rating, wins: s.wins, losses: s.losses, lastDuel: s.lastDuel, bestStage: s.bestStage, sp: s.sp, peakLevel: s.peakLevel, learned: s.learned, skillSpent: s.skillSpent, skillInheritances: s.skillInheritances, skillPractice: s.skillPractice, jobMastery: s.jobMastery, unlockedJobs: s.unlockedJobs, bookClaims: s.bookClaims, itemBook: s.itemBook, presets: s.presets, guild: s.guild, voyage: s.voyage, tutorial: s.tutorial, achievements: s.achievements, achievementClaims: s.achievementClaims, daily: s.daily, weekly: s.weekly, abyssWeek: s.abyssWeek });
    s.hp = stats(s).hp;
    s.mana = stats(s).mana;
}

/**
 * 한 번의 숨: 쓰러지면 이번 생을 처음부터 다시 시작합니다. 환생이 아니므로 환생 횟수·진주·순풍/깊은 항해가 바뀌지 않고,
 * 요구 레벨도 보지 않습니다. 모든 서약이 풀립니다. 자동 낚시 중이었다면 첫 낚시터에서 이어갑니다.
 */
export function breathReset(s: State, now: number) {
    const running = s.running;
    startLife(s, now, { pearls: s.pearls, rebirths: s.rebirths, lifeBonus: s.lifeBonus });
    delete s.vows;
    s.running = running;
    addLog(s, '한 번의 숨 · 쓰러져 이번 생을 처음부터 다시 시작합니다. 서약이 풀렸습니다.', 'system');
}

export const lifecycleActions: ActionHandlers = {
    rebirth(s, { now, rng }) {
        if (s.level < rebirthLevel(s))
            throw Error(`레벨 ${rebirthLevel(s)}부터 환생할 수 있습니다.`);
        const base = rebirthReward(s, stats(s).rebirthBonus || 0), deepPearls = deepVoyagePearls(s), lifeBonus = nextLifeBonus(s);
        // 한 번의 숨: 이번 생에 한 번도 쓰러지지 않고(쓰러지면 서약이 풀림) 환생하면 진주 보너스.
        const breath = s.vows?.breath ? Math.floor(base * breathBonus(s)) : 0, pearls = base + breath;
        const vows = cleanVows(s, s.nextVows);
        startLife(s, now, { pearls: s.pearls + pearls, rebirths: s.rebirths + 1, lifeBonus });
        if (hasVows(vows)) {
            // 잠든 닻의 목표는 게임의 고정 난수로 고릅니다. 잠든 닻이 없으면 난수를 쓰지 않습니다.
            s.vows = { ...vows, ...(vows.anchor ? { seal: { ...chooseAnchorTarget(s.rebirths, rng), caught: 0, exp: 0 } } : {}) };
        }
        else delete s.vows;
        // 윤회의 문: 이번 생에 열릴 ??? 직업을 게임 난수로 추첨해 저장합니다(후보가 없으면 난수를 쓰지 않음).
        const door = drawRebirthDoor(s, rng);
        if (door) s.rebirthDoor = door; else delete s.rebirthDoor;
        addLog(s, `새로운 항해가 시작됩니다. 환생 진주 +${pearls}${deepPearls ? ` (깊은 항해 +${deepPearls} 포함)` : ''}${breath ? ` · 한 번의 숨 +${breath}` : ''}`);
        if (lifeBonus === 'deep') addLog(s, 'Lv.100 완주 · 이번 생 동안 직업·스킬 숙련 기본 획득 +2', 'reward');
        if (lifeBonus === 'tailwind') addLog(s, `순풍 · Lv.${rebirthLevel(s)}까지 경험치 +${Math.round(tailwindExp(s) * 100)}%`, 'reward');
        if (s.vows) addLog(s, `서약 · ${VOW_IDS.filter(id => s.vows![id]).map(id => id === 'rough' ? `${VOW_NAMES.rough} ${s.vows!.rough}단계` : VOW_NAMES[id]).join(' · ')}`, 'system');
        if (s.rebirthDoor) addLog(s, `윤회의 문 · 이번 생에는 ${jobById(s.rebirthDoor)?.name}의 문이 열렸습니다.`, 'system');
        const seal = anchorSeal(s);
        if (seal) addLog(s, `잠든 닻 · ${anchorTargetName(seal)}에서 ${ANCHOR_CATCHES}마리를 잡기 전까지 레벨 1에 머뭅니다.`, 'system');
    },
    /** 다음 생 서약 예약. id: anchor·breath·rough, value: on/off 또는 거친 바다 0~3. */
    /** v25.6 업적 보상 받기: id 또는 'all'. */
    claimAchievement(s, { id }) {
        const got = claimAchievements(s, id);
        addLog(s, `업적 보상 ${got.count}개 · 진주 +${got.pearls}${got.sp ? ` · SP +${got.sp}` : ''}`, 'reward');
    },
    nextVow(s, { id, a }) {
        // v25.6 조건 카드: value는 'stage:<id>' · 'tree:<id>' · 'gold' · 'off'.
        if (id === 'focus') {
            const next: Vows = { ...(s.nextVows || {}) };
            const [kind, target] = String(a.value || 'off').split(':', 2);
            if (kind === 'off') delete next.focus;
            else if (kind === 'stage' && STAGES.some(st => st.id === target && st.rebirth <= s.rebirths + 1)) next.focus = { kind, id: target };
            else if (kind === 'tree' && JOB_TREES.some(t => t.id === target)) next.focus = { kind, id: target };
            else if (kind === 'gold') next.focus = { kind };
            else throw Error('조건 카드를 확인하세요.');
            s.nextVows = next;
            return;
        }
        if (!VOW_IDS.includes(id as VowId))
            throw Error('서약을 확인하세요.');
        const vow = id as VowId;
        if (!vowUnlocked(s, vow))
            throw Error(`${VOW_NAMES[vow]} 연구가 필요합니다.`);
        const next: Vows = { ...(s.nextVows || {}) };
        if (vow === 'rough') {
            const level = Number(a.value);
            if (!Number.isInteger(level) || level < 0 || level > 3)
                throw Error('거친 바다는 0~3단계로 고르세요.');
            if (level) next.rough = level; else delete next.rough;
        }
        else if (a.value === 'on') next[vow] = true;
        else delete next[vow];
        if (hasVows(next)) s.nextVows = next; else delete s.nextVows;
    },
    /** 잠든 닻 포기: 봉인을 풀고 쌓인 경험치를 보너스 없이 받습니다. */
    anchorGiveUp(s) {
        if (!anchorSeal(s))
            throw Error('잠든 닻 봉인 중이 아닙니다.');
        releaseAnchor(s, false);
        gainLevels(s);
    },
    resetData(s, { now }) {
        if (s.running || s.dungeon)
            throw Error('자동 낚시와 던전을 먼저 멈춘 뒤 초기화하세요.');
        const name = s.name;
        Object.assign(s, newState(now), { name });
        // newState에 없는 선택 필드도 함께 지웁니다(계정당 첫 재분배 사용 여부는 유지).
        for (const key of ['vows', 'nextVows', 'goldenBook', 'masteryCarry', 'autoSell', 'rebirthDoor'] as const) delete s[key];
    },
};
