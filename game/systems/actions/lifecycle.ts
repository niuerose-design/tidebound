/** 환생, 하드코어 소프트 리셋, 서약 선택과 전체 초기화 */
import { tailwindExp, rebirthLevel, rebirthReward } from '../meta';
import { ASCENSION, ASCENSION_RESEARCH, ASCENSION_LOG_KEEP, ascensionOf, ascensionRequirement } from '../../data/ascension';
import { achievementById } from '../../data/achievements';
import { masteryMilestonesFor } from '../progression';
import { skillById } from '../../data/skills';
import { TUTORIAL_STEPS } from '../guidance';
import { stats } from '../stats';
import { salvageRate, startingLevel, researchRank } from '../../data/economy';
import { PROGRESSION } from '../../data/progression';
import { saleValue, dismantleEssence, syncRelicPower } from '../equipment';
import type { State, Vows, RebirthRecord, AscensionRecord } from '../../types';
/** v27.63 세이브에 남기는 최근 환생 기록 수. */
export const REBIRTH_LOG_KEEP = 20;
import type { ActionHandlers } from './types';
import { addLog, newState } from '../state';
import { drawRebirthDoor } from '../../data/doors';
import { jobById, JOB_TREES } from '../../data/classes';
import { jobMastered, canChangeJob, canUse, grantJobSkills, trimLoadout } from '../progression';
import { STAGES } from '../../data/world';
import { VOW_IDS, VOW_NAMES, LEVELED_VOWS, type VowId, breathBonus, cleanVows, hasVows, vowUnlocked } from '../vows';
import { claimAchievements, rerollBoardGoal } from '../progress';
import { goalText } from '../../data/goals';

/**
 * 새 생을 시작합니다. 환생과 소프트 리셋이 같은 초기화 범위를 씁니다(레벨·골드·일반 장비·직업·능력치 배분).
 * 연구·세계석·유물·도감·스킬 성장 등 오래 남는 기록은 그대로 둡니다.
 */
function startLife(s: State, now: number, next: { pearls: number; rebirths: number; lifeBonus: State['lifeBonus'] }) {
    const fresh = newState(now);
    fresh.gold = 100;
    // v27.60 모험가의 유산: 시작 레벨을 올리고 오른 레벨만큼 능력치 포인트를 줍니다(SP는 최고 레벨을 넘을 때만이라 주지 않음).
    const level = startingLevel(s);
    fresh.level = level;
    fresh.statPoints += (level - 1) * PROGRESSION.statPerLevel;
    fresh.inventory = s.inventory.filter(i => i.relic || i.onyx);
    for (const [slot, item] of Object.entries(s.equipment)) {
        if (item?.relic || item?.onyx)
            fresh.equipment[slot] = item;
    }
    fresh.abyssBest = s.abyssBest;
    fresh.shopSerial = s.shopSerial;
    Object.assign(s, { ...fresh, limitBreaks: s.limitBreaks, bossResearchClaims: s.bossResearchClaims, abyssMilestones: s.abyssMilestones, lifeBonus: next.lifeBonus, growthGoal: s.growthGoal, name: s.name, pearls: next.pearls, essence: s.essence || 0, rebirths: next.rebirths, permanent: s.permanent, researchGranted: s.researchGranted, book: s.book, /** v27.80 변종·황금 개체·난이도 이정표·최고 난이도 기록도 환생 뒤에 남깁니다(전에는 초기화되던 버그). */ variantBook: s.variantBook, goldenBook: s.goldenBook, tideBest: s.tideBest, bookTier: s.bookTier, randomGameStats: s.randomGameStats, clears: s.clears, kills: s.kills, rank: s.rank, badge: s.badge, playMs: s.playMs || 0, lifeStart: s.lifeStart, rebirthLog: s.rebirthLog, deaths: s.deaths, starforce: s.starforce, onyxSeen: s.onyxSeen, onyxBook: s.onyxBook, onyxMiss: s.onyxMiss, rating: s.rating, wins: s.wins, losses: s.losses, lastDuel: s.lastDuel, bestStage: s.bestStage, sp: s.sp, peakLevel: s.peakLevel, learned: s.learned, skillSpent: s.skillSpent, skillInheritances: s.skillInheritances, legacyInherited: s.legacyInherited, hacker: s.hacker, privacy: s.privacy, skillPractice: s.skillPractice, jobMastery: s.jobMastery, unlockedJobs: s.unlockedJobs, bookClaims: s.bookClaims, itemBook: s.itemBook, presets: s.presets, skillPins: s.skillPins, skillHidden: s.skillHidden, voyage: s.voyage, tutorial: s.tutorial, achievements: s.achievements, achievementClaims: s.achievementClaims, daily: s.daily, weekly: s.weekly, abyssWeek: s.abyssWeek, account: s.account, guildMember: s.guildMember, guildStats: s.guildStats, duelSeason: s.duelSeason, altar: s.altar });
    syncRelicPower(s);
    s.hp = stats(s).hp;
    s.mana = stats(s).mana;
}

/**
 * 하드코어(전 ‘한 번의 숨’): 쓰러지면 이번 생을 처음부터 다시 시작합니다. 환생이 아니므로 환생 횟수·세계석·순풍이 바뀌지 않고,
 * 요구 레벨도 보지 않습니다. 모든 서약이 풀립니다. 자동 사냥 중이었다면 첫 사냥터에서 이어갑니다.
 */
export function breathReset(s: State, now: number) {
    const running = s.running, runs = s.randomGameRuns, runDay = s.randomGameDay;
    startLife(s, now, { pearls: s.pearls, rebirths: s.rebirths, lifeBonus: s.lifeBonus });
    // v27.86 같은 생을 다시 시작하는 것이라 랜덤게임 입장 횟수는 그대로 둡니다.
    if (runs) { s.randomGameRuns = runs; s.randomGameDay = runDay; }
    delete s.vows;
    s.running = running;
    addLog(s, '하드코어 · 쓰러져 이번 생을 처음부터 다시 시작합니다. 서약이 풀렸습니다.', 'system');
}

/**
 * v27.26 운영자 초기화(scripts/reset-life.mjs): 이번 생을 처음 상태로 되돌립니다. 환생 횟수·세계석·생 보너스·서약은 그대로이고,
 * 레벨 조건도 보지 않습니다. 레벨·골드·일반 장비·직업·능력치 배분·진행 중인 던전이 초기화되고 자동 사냥은 멈춥니다.
 */
export function restartLife(s: State, now: number) {
    const vows = s.vows, nextVows = s.nextVows;
    startLife(s, now, { pearls: s.pearls, rebirths: s.rebirths, lifeBonus: s.lifeBonus });
    if (vows) s.vows = vows;
    if (nextVows) s.nextVows = nextVows;
    s.running = false;
    addLog(s, '운영 조치로 이번 생을 처음부터 다시 시작합니다. 환생 횟수·세계석·연구·유물·도감은 그대로입니다.', 'system');
}

/** v25.7 청산: 유물을 뺀 보관함·착용 장비 전부를 연구 효율만큼 판매하거나 분해합니다. 연구가 없으면 count 0. */
export function salvagePreview(s: State) {
    const rate = salvageRate(s), mode = s.salvageMode || 'sell';
    const items = rate ? [...s.inventory, ...Object.values(s.equipment)].filter((i): i is NonNullable<typeof i> => !!i && !i.relic) : [];
    return { mode, rate, count: items.length, gold: Math.floor(items.reduce((sum, i) => sum + saleValue(i), 0) * rate), essence: Math.floor(items.reduce((sum, i) => sum + dismantleEssence(i), 0) * rate) };
}
/** v3.31 승천 직후 다시 받는 업적 재화: 받은 업적의 세계석·SP 합계. 영구 효과(능력치·AP)는 업적 기록에서 그대로 나옵니다. */
export function achievementRefund(s: Pick<State, 'achievementClaims'>) {
    let pearls = 0, sp = 0;
    for (const id of Object.keys(s.achievementClaims || {})) { const a = achievementById(id); if (!a) continue; pearls += a.reward.pearls || 0; sp += a.reward.sp || 0; }
    return { pearls, sp };
}
/**
 * v3.31 승천(docs/balance-rebirth.md 8절): 환생·장비·연구·도감·재화(골드 포함, 새 캐릭터와 같은 100 G)를 지우고, 직업·스킬 숙련과 업적·계급장·칭호·기록만 남겨 처음부터 다시 오릅니다.
 * - 스킬 연마 단계와 한계 돌파는 지웁니다: 그때의 숙련을 기준점(refineBase)으로 두고, 한계 돌파 단계는 0으로.
 * - SP로 올린 스킬 단계는 1로(배운 스킬 목록은 유지). 업적 세계석·SP는 다시 지급합니다.
 * - 편의 연구는 자동 해제(ASCENSION_RESEARCH), 튜토리얼은 건너뜁니다.
 * 계정 금고·무릉도장 주간 순위·결투 등록은 서버가 함께 지웁니다(store.ts).
 */
export function ascend(s: State, now: number) {
    const n = ascensionOf(s), need = ascensionRequirement(s);
    if (s.rebirths < need) throw Error(`환생 ${need}회부터 승천할 수 있습니다.`);
    if (s.dungeon) throw Error('던전에서 나온 뒤 승천하세요.');
    const record: AscensionRecord = { n: n + 1, at: now, rebirths: s.rebirths, abyssBest: s.abyssBest || 0, realMs: Math.max(0, now - (s.ascensionStart || now)), kills: s.kills };
    const refineBase: Record<string, number> = { ...(s.refineBase || {}) };
    for (const [id, practice] of Object.entries(s.skillPractice || {})) {
        const last = masteryMilestonesFor(skillById(id)).at(-1)!;
        if (practice > last) refineBase[id] = practice; else delete refineBase[id];
    }
    const refund = achievementRefund(s);
    const fresh = newState(now);
    // 남기는 것: 숙련·직업, 업적·계급장·칭호, 기록, 진행이 아닌 것(이름·길드·제단·목표·설정·계정·분신), 해커, 마이그레이션 표시.
    const keep: Partial<State> = {
        name: s.name, rank: s.rank, title: s.title, badge: s.badge, achievements: s.achievements, achievementClaims: s.achievementClaims,
        rebirthLog: s.rebirthLog, kills: s.kills, deaths: s.deaths, playMs: s.playMs || 0, bestStage: s.bestStage, tideBest: s.tideBest, clears: s.clears, modeClears: s.modeClears, randomGameStats: s.randomGameStats, starforce: s.starforce, rating: s.rating, wins: s.wins, losses: s.losses, duelDay: s.duelDay,
        guildMember: s.guildMember, guildStats: s.guildStats, altar: s.altar, daily: s.daily, weekly: s.weekly, duelSeason: s.duelSeason,
        privacy: s.privacy, autoSell: s.autoSell, autoVend: s.autoVend, salvageMode: s.salvageMode, presets: s.presets, skillPins: s.skillPins, skillHidden: s.skillHidden, hideDoorNotice: s.hideDoorNotice, skipStatConfirm: s.skipStatConfirm, swarmCap: s.swarmCap,
        account: s.account, hacker: s.hacker, hackFeed: s.hackFeed, doorsOpened: s.doorsOpened, shopSerial: s.shopSerial, logId: s.logId,
        relicRefunded: s.relicRefunded, autoStarRefunded: s.autoStarRefunded, masteryRescaled: s.masteryRescaled, rankRescaled: s.rankRescaled,
        jobMastery: s.jobMastery, unlockedJobs: s.unlockedJobs, skillPractice: s.skillPractice, skillInheritances: s.skillInheritances, legacyInherited: s.legacyInherited,
        learned: Object.fromEntries(Object.keys(s.learned || {}).map(id => [id, 1])),
        // 튜토리얼은 건너뜁니다: 모든 단계를 완료로 적어 안내도, 단계 보상도 다시 나오지 않게 합니다.
        tutorial: { ...(s.tutorial || {}), skipped: true, done: { ...Object.fromEntries(TUTORIAL_STEPS.map(x => [x.id, 1])), ...(s.tutorial?.done || {}) } },
    };
    // 기존 항목을 모두 지운 뒤 새 캐릭터 + 유지 항목만 채웁니다(새 캐릭터에 기본값이 없는 서약·변종 도감·칠흑 기록 등이 남지 않게).
    for (const key of Object.keys(s)) delete (s as Record<string, unknown>)[key];
    Object.assign(s, fresh, keep);
    for (const key of Object.keys(s) as (keyof State)[]) if (s[key] === undefined) delete s[key];
    s.ascension = n + 1;
    s.ascensionLog = [...(s.ascensionLog || []), record].slice(-ASCENSION_LOG_KEEP);
    s.ascensionStart = now;
    s.refineBase = refineBase;
    s.limitBreaks = {};
    s.permanent = { ...s.permanent, ...ASCENSION_RESEARCH };
    s.researchGranted = { ...ASCENSION_RESEARCH, limitBreak: 0 };
    s.pearls = refund.pearls;
    s.sp = PROGRESSION.startingSP + refund.sp;
    s.lifeStart = { at: now, playMs: s.playMs || 0 };
    syncRelicPower(s);
    s.hp = stats(s).hp; s.mana = stats(s).mana;
    addLog(s, `✦ ${s.ascension}번째 승천 · 환생 ${record.rebirths}회의 여정을 마치고 처음부터 다시 오릅니다. 숙련·업적·계급장은 그대로입니다.`, 'reward');
    addLog(s, `승천 · 업적 보상 다시 지급 · 세계석 +${refund.pearls} · SP +${refund.sp} · 편의 연구 자동 해제`, 'reward');
}
export const lifecycleActions: ActionHandlers = {
    /** v3.31 승천. */
    ascend(s, { now }) { ascend(s, now); },
    rebirth(s, { now, rng }) {
        // v3.31 환생 상한: 200회부터는 환생할 수 없고 승천만 할 수 있습니다.
        if (s.rebirths >= ASCENSION.rebirthCap)
            throw Error(`환생은 ${ASCENSION.rebirthCap}회까지입니다. 승천할 수 있습니다.`);
        if (s.level < rebirthLevel(s))
            throw Error(`레벨 ${rebirthLevel(s)}부터 환생할 수 있습니다.`);
        // v3.23 깊은 모험(Lv.100 완주 보너스)은 삭제, 순풍은 조건 없이 매 생 목표 레벨까지 켜집니다.
        const base = rebirthReward(s, stats(s).rebirthBonus || 0), lifeBonus = null;
        // 하드코어: 이번 생에 한 번도 쓰러지지 않고(쓰러지면 서약이 풀림) 환생하면 세계석 보너스.
        const breath = s.vows?.breath ? Math.floor(base * breathBonus(s)) : 0, pearls = base + breath;
        const vows = cleanVows(s, s.nextVows);
        const salvage = salvagePreview(s);
        // v27.63 환생 기록: 이번 생에 걸린 실제 시간·사냥 시간·도달 레벨·받은 세계석. 다음 생 시작 시각을 새로 잽니다.
        const life = s.lifeStart || { at: now, playMs: s.playMs || 0, partial: true };
        const record: RebirthRecord = { n: s.rebirths + 1, at: now, realMs: Math.max(0, now - life.at), playMs: Math.max(0, (s.playMs || 0) - life.playMs), level: s.level, pearls, ...(life.partial ? { partial: true } : {}) };
        // v27.80 지겨운 환생: 직전 직업·스킬·능력치 비율을 기억했다가 숙달한 것만 복원합니다.
        const habit = researchRank(s, 'habit'), prevJob = jobById(s.job), prevMastered = !!prevJob && jobMastered(s, prevJob), prevSkills = [...s.skills], prevAttr = { ...s.attributes };
        startLife(s, now, { pearls: s.pearls + pearls, rebirths: s.rebirths + 1, lifeBonus });
        s.rebirthLog = [...(s.rebirthLog || []), record].slice(-REBIRTH_LOG_KEEP);
        s.lifeStart = { at: now, playMs: s.playMs || 0 };
        if (salvage.count) {
            if (salvage.mode === 'dismantle') { s.essence = (s.essence || 0) + salvage.essence; addLog(s, `청산 · 장비 ${salvage.count}개 분해 · 정수 +${salvage.essence}`, 'reward'); }
            else { s.gold += salvage.gold; addLog(s, `청산 · 장비 ${salvage.count}개 판매 · 다음 생 시작 골드 +${salvage.gold} G`, 'reward'); }
        }
        if (hasVows(vows)) s.vows = vows;
        else delete s.vows;
        // v27.86 절제: 새 생의 편성을 AP·장착 개수 상한에 맞춥니다.
        if (s.vows?.restraint) trimLoadout(s);
        // 윤회의 문: 이번 생에 열릴 ??? 직업을 게임 난수로 추첨해 저장합니다(후보가 없으면 난수를 쓰지 않음).
        const door = drawRebirthDoor(s, rng);
        if (door) s.rebirthDoor = door; else delete s.rebirthDoor;
        addLog(s, `새로운 모험이 시작됩니다. 환생 세계석 +${pearls}${breath ? ` · 하드코어 +${breath}` : ''}`);
        addLog(s, `순풍 · Lv.${rebirthLevel(s)}까지 경험치 +${Math.round(tailwindExp(s) * 100)}%(합연산) · 그 너머는 필요 경험치가 레벨마다 크게 늘어납니다`, 'reward');
        if (s.vows) addLog(s, `서약 · ${VOW_IDS.filter(id => s.vows![id]).map(id => (LEVELED_VOWS as readonly string[]).includes(id) ? `${VOW_NAMES[id]} ${s.vows![id]}단계` : VOW_NAMES[id]).join(' · ')}`, 'system');
        if (s.rebirthDoor) addLog(s, `윤회의 문 · 이번 생에는 ${jobById(s.rebirthDoor)?.name}의 문이 열렸습니다.`, 'system');
        if (habit >= 1 && prevJob && prevMastered && prevJob.id !== s.job && canChangeJob(s, prevJob.id)) {
            s.job = prevJob.id; if (!s.unlockedJobs.includes(prevJob.id)) s.unlockedJobs.push(prevJob.id); grantJobSkills(s);
            addLog(s, `지겨운 환생 · 숙달한 ${prevJob.name}(으)로 자동 전직`, 'system');
        }
        if (habit >= 2) {
            const kept = prevSkills.filter(id => canUse(s, id)); if (kept.length) { s.skills = [...new Set([...kept, ...s.skills])]; trimLoadout(s); addLog(s, `지겨운 환생 · 스킬 편성 ${s.skills.length}개 유지`, 'system'); }
        }
        if (habit >= 3) {
            const total = Object.values(prevAttr).reduce((a, b) => a + b, 0);
            if (total > 0 && s.statPoints > 0) { const points = s.statPoints; let used = 0; for (const key of Object.keys(prevAttr) as (keyof typeof prevAttr)[]) { const n = Math.floor(points * prevAttr[key] / total); s.attributes[key] += n; used += n; } s.statPoints -= used; if (used) addLog(s, `지겨운 환생 · 능력치 ${used}포인트를 이전 비율로 배분`, 'system'); }
        }
    },
    /** v25.6 업적 보상 받기: id 또는 'all'. */
    claimAchievement(s, { id }) {
        const got = claimAchievements(s, id);
        addLog(s, `업적 보상 ${got.count}개 · 세계석 +${got.pearls}${got.sp ? ` · SP +${got.sp}` : ''}`, 'reward');
    },
    /** v27.81 일일·주간 목표 다시 뽑기(목표마다 하루 1회). id: 'daily:<목표 id>' · 'weekly:<목표 id>'. */
    rerollGoal(s, { id, now }) {
        const { weekly, goal } = rerollBoardGoal(s, id, now);
        addLog(s, `${weekly ? '주간' : '오늘의'} 목표 다시 뽑기 · ${goalText(goal)} · 세계석 +${goal.pearls}`, 'system');
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
        if (vow === 'rough' || vow === 'restraint') {
            const level = Number(a.value);
            if (!Number.isInteger(level) || level < 0 || level > 3)
                throw Error(`${VOW_NAMES[vow]}은(는) 0~3단계로 고르세요.`);
            if (level) next[vow] = level; else delete next[vow];
        }
        else if (a.value === 'on') next.breath = true;
        else delete next.breath;
        if (hasVows(next)) s.nextVows = next; else delete s.nextVows;
    },
    resetData(s, { now }) {
        if (s.running || s.dungeon)
            throw Error('자동 사냥과 던전을 먼저 멈춘 뒤 초기화하세요.');
        const name = s.name;
        Object.assign(s, newState(now), { name });
        // newState에 없는 선택 필드도 함께 지웁니다(계정당 첫 재분배 사용 여부는 유지).
        for (const key of ['vows', 'nextVows', 'goldenBook', 'variantBook', 'tideBest', 'bookTier', 'randomGameStats', 'masteryCarry', 'autoSell', 'autoVend', 'rebirthDoor'] as const) delete s[key];
    },
};
