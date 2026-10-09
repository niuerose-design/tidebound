import type { State } from '../types';
import { BASE_STAGES, PLAIN_DUNGEONS, MONSTERS, dungeonById } from './world';
import { JOBS, jobById } from './classes';
import { jobMastered, masteredJobCount, ACHIEVEMENT_AP, attributes, completedStages, extremeBroken } from '../systems/progression';
import { MIMIC } from './mimic';
import { EXP_NURI } from './exp-nuri';
import { ESSENCE_SLIME } from './essence-slime';
import { KING_IDS } from './king';
import { stats } from '../systems/stats';
import { DUNGEON_MODES, type DungeonMode } from './balance';
import { ownedOnyx } from './onyx';
import { BOSS_CORE_RULES, ABYSS_CORE_IDS, ownedCores, coreEntry } from './boss-core';
import { RANKS, RANK_CUMULATIVE, RANK_TOTAL_POINTS, rankState, rankPointsSpent } from './rank';

/**
 * v25.6 업적: 조건을 처음 만족하면 한 번만 해금되고 보상을 바로 받습니다. 환생 후에도 유지됩니다.
 * 보상 종류: 세계석(pearls), SP(sp), 영구 장착 AP(ap). v3.38 능력치 배율은 ‘업적 보너스’ 하나(받은 업적 수 × ACHIEVEMENT_BONUS_PER)로만 줍니다.
 * v27.58 무릉도장 묶음을 던전 묶음으로 넓혔습니다(던전 정복·보스 업적이 옮겨 옴, id는 그대로라 세이브와 호환).
 * 조건 판정은 저장 상태만 보며 난수를 쓰지 않습니다. 기존 세이브는 이미 달성한 업적을 조용히 채우되 보상은 지급합니다.
 */
export type AchievementReward = { pearls?: number; sp?: number; ap?: number };
export type AchievementBonusKey = 'attack' | 'magic' | 'hp' | 'defense' | 'resist';
/**
 * v3.38 업적 보너스: 받은 업적 1개마다 더하는 능력치 배율. 전부 받으면 공격·마법 약 +41%, 체력 +49%, 방어·저항 +21% 수준이 되도록 고르게 나눈 값입니다.
 */
export const ACHIEVEMENT_BONUS_PER: Record<AchievementBonusKey, number> = { attack: .0022, magic: .0022, hp: .0026, defense: .0011, resist: .0011 };
export type Achievement = { /** v3.38 명예 업적: 업적 보너스(능력치) 집계에서 빠지고 칭호를 줍니다. 새로 늘리는 업적은 명예 업적으로 둡니다. */ honor?: boolean; id: string; group: '모험' | '사냥' | '숙련' | '던전' | '환생' | '계급' | '도전' | '강화'; title: string; desc: string; reward: AchievementReward; /** 진행도(0~target). */ progress: (s: State) => number; target: number };

const kills = (s: State) => s.kills || 0;
/** 도감 업적 대상. v27.58 경험의 누리는 빼서 '도감 전체' 업적 id(codex:종 수)가 바뀌지 않게 합니다. */
// v3.161 정수의 슬라임 · 대왕 3종도 도감 수에서 뺍니다(codex:N id가 흔들리지 않도록 까미는 그대로 셉니다).
const CODEX_MONSTERS = MONSTERS.filter(f => f.id !== EXP_NURI.id && f.id !== ESSENCE_SLIME.id && !KING_IDS.includes(f.id));
const codex = (s: State) => CODEX_MONSTERS.filter(f => (s.book?.[f.id] || 0) > 0).length;
const clears = (s: State) => Object.values(s.clears || {}).reduce((a, b) => a + (b || 0), 0);
const bosses = (s: State) => MONSTERS.filter(f => f.boss).reduce((a, f) => a + (s.book?.[f.id] || 0), 0);
const masteredSkills = (s: State) => Object.values(s.skillPractice || {}).filter(n => n >= 8000).length;
const tideBest = (s: State) => Math.max(0, ...Object.values(s.tideBest || {}));
const playHours = (s: State) => Math.floor((s.playMs || 0) / 3_600_000);
const sum = (r?: Record<string, number>) => Object.values(r || {}).reduce((a, b) => a + (b || 0), 0);
const goldens = (s: State) => sum(s.goldenBook);
const onyxOwned = (s: State) => ownedOnyx(s).size;
/** v3.6 스타포스 누적 기록과 보유 장비(가방·착용) 중 가장 높은 별. */
const sf = (s: State) => s.starforce || { tries: 0, success: 0, fail: 0, destroy: 0, gold: 0 };
const bestStar = (s: State) => Math.max(0, ...[...(s.inventory || []), ...Object.values(s.equipment || {})].map(i => i?.enhance || 0));
const variants = (s: State) => Object.values(s.variantBook || {}).reduce((a, row) => a + sum(row as Record<string, number>), 0);
const dungeonsAt = (n: number) => (s: State) => PLAIN_DUNGEONS.filter(d => (s.clears?.[d.id] || 0) >= n).length;
const bestEnhance = (s: State) => Math.max(0, ...Object.values(s.equipment || {}).map(i => i?.enhance || 0));
/** v27.81 헬·나이트메어 정복 기록(encounter가 modeClears에 쌓음). */
const modeClears = (mode: DungeonMode) => (s: State) => sum(s.modeClears?.[mode]);
const modeDungeons = (mode: DungeonMode) => (s: State) => Object.values(s.modeClears?.[mode] || {}).filter(n => (n || 0) > 0).length;
const MODE_DUNGEONS = PLAIN_DUNGEONS.filter(d => d.id !== 'abyss').length;
const modeName = (mode: DungeonMode) => DUNGEON_MODES.find(m => m.id === mode)!.name;
/** v27.81 계급 업적: 계급 경험치(세어진 처치 수)가 그 계급의 누적 필요치에 닿으면 달성합니다. */
const RANK_STEPS = ['pvt1', 'sgt', 'ssg', 'smaj', 'lt2', 'maj', 'bg', 'ltg'] as const;
const rankAchievements: Achievement[] = RANK_STEPS.map((id, i) => { const index = RANKS.findIndex(r => r.id === id), r = RANKS[index]; return { id: `rank:${id}`, group: '계급' as const, title: `${r.name} 진급`, desc: `계급 ${r.name}에 오릅니다(세어진 처치 ${RANK_CUMULATIVE[index].toLocaleString()}마리).`, reward: [{ pearls: 2 }, { pearls: 4 }, { pearls: 6 }, { pearls: 10, sp: 1 }, { pearls: 12 }, { pearls: 15, ap: 1 }, { pearls: 25, sp: 1 }, { pearls: 40, ap: 1, sp: 1 }][i], progress: s => rankState(s).exp, target: RANK_CUMULATIVE[index] }; });
const tiers = (s: State) => Math.max(0, ...(s.unlockedJobs || []).map(id => jobById(id)?.tier || 0));

const series = (prefix: string, group: Achievement['group'], title: (n: number) => string, desc: (n: number) => string, steps: number[], progress: (s: State) => number, reward: (i: number) => AchievementReward): Achievement[] =>
    steps.map((n, i) => ({ id: `${prefix}:${n}`, group, title: title(n), desc: desc(n), reward: reward(i), progress, target: n }));

/** v3.38 던전 첫 정복 SP. 업적 id는 firstClear:던전 id. */
export const FIRST_CLEAR_SP: Record<string, number> = { grotto: 1, kelpCatacomb: 1, cemetery: 1, caldera: 1, temple: 2, starSanctum: 2, ventCathedral: 3, abyss: 2 };
const PLAIN_FIRST_CLEAR = Object.entries(FIRST_CLEAR_SP);
const DUNGEON_NAME = (id: string) => dungeonById(id)?.name || id;

/** v3.104 진행도 읽기(progressReader) 한 번 동안은 상태가 그대로이므로, 능력치를 쓰는 업적(최대 체력 · 최대 마나)이 능력치를 한 번만 계산합니다. */
type StatsRead = { s: State; a?: ReturnType<typeof stats> };
let reading: StatsRead | null = null;
const readStats = (s: State) => reading?.s === s ? (reading.a ??= stats(s)) : stats(s);
export const ACHIEVEMENTS: Achievement[] = [
    ...series('kills', '사냥', n => `처치 ${n.toLocaleString()}마리`, n => `누적 ${n.toLocaleString()}마리를 처치합니다.`, [100, 1000, 5000, 20000, 100000, 500000], kills, i => [{ pearls: 1 }, { pearls: 2 }, { pearls: 4 }, { pearls: 8 }, { pearls: 15, ap: 1 }, { pearls: 30, sp: 1 }][i]),
    ...series('codex', '모험', n => `도감 ${n}종`, n => `서로 다른 몬스터 ${n}종을 발견합니다.`, [10, 20, 30, 47, CODEX_MONSTERS.length], codex, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 5 }, { pearls: 10, ap: 1 }, { pearls: 15, sp: 1 }][i]),
    ...series('stages', '모험', n => `사냥터 ${n}곳`, n => `사냥터 ${n}곳에서 사냥합니다.`, [3, 6, 9, BASE_STAGES.length], s => BASE_STAGES.filter(st => s.voyage?.[`stage:${st.id}`] !== undefined).length, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 6 }, { pearls: 10, ap: 1 }][i]),
    ...series('clears', '던전', n => `던전 정복 ${n}회`, n => `던전을 ${n}회 정복합니다(무릉도장 포함).`, [1, 10, 50, 200, 1000], clears, i => [{ pearls: 1 }, { pearls: 2 }, { pearls: 5 }, { pearls: 8 }, { pearls: 15, ap: 1 }][i]),
    ...series('bosses', '던전', n => `보스 ${n.toLocaleString()}마리`, n => `던전 보스를 ${n.toLocaleString()}마리 처치합니다.`, [10, 100, 500, 2000], bosses, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }, { pearls: 20, sp: 1 }][i]),
    ...series('duels', '사냥', n => `결투 승리 ${n}회`, n => `랭크 결투에서 ${n}번 이깁니다.`, [10, 100, 500], s => s.wins || 0, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, ap: 1 }][i]),
    ...series('dungeons', '던전', n => `던전 ${n}곳 정복`, n => `서로 다른 던전 ${n}곳을 정복합니다.`, [3, 5, 7, PLAIN_DUNGEONS.length], s => PLAIN_DUNGEONS.filter(d => (s.clears?.[d.id] || 0) > 0).length, i => [{ pearls: 2 }, { pearls: 4 }, { pearls: 8, sp: 1 }, { pearls: 15, ap: 1 }][i]),
    ...series('mastered', '숙련', n => `직업 숙달 ${n}개`, n => `직업 ${n}개를 끝까지 숙달합니다.`, [1, 3, 8, 15, 30], masteredJobCount, i => [{ pearls: 2 }, { pearls: 4 }, { pearls: 8, ap: 1 }, { pearls: 12 }, { pearls: 20, ap: 1, sp: 1 }][i]),
    ...series('skillsMax', '숙련', n => `스킬 최대 숙련 ${n}개`, n => `스킬 ${n}개의 실전 숙련을 8,000 이상 쌓습니다.`, [1, 5, 15, 40, 80], masteredSkills, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, ap: 1 }, { pearls: 20 }, { pearls: 30, sp: 1 }][i]),
    ...series('tier', '숙련', n => `${n}차 전직`, n => `${n}차 직업에 처음 전직합니다.`, [2, 3, 4, 5], tiers, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 6 }, { pearls: 10, ap: 1 }][i]),
    ...series('tide', '모험', n => `사냥터 난이도 ${n}`, n => `사냥터에서 사냥터 난이도 ${n} 이상으로 처치합니다.`, [5, 10, 20, 30, 50], tideBest, i => [{ pearls: 2 }, { pearls: 4 }, { pearls: 8, ap: 1 }, { pearls: 15 }, { pearls: 30, ap: 1, sp: 1 }][i]),
    ...series('abyss', '던전', n => `무릉도장 ${n}층`, n => `무릉도장 ${n}층을 정복합니다.`, [5, 10, 25, 50, 100, 200], s => s.abyssBest || 0, i => [{ pearls: 2 }, { pearls: 4 }, { pearls: 8, ap: 1 }, { pearls: 15 }, { pearls: 30, ap: 1, sp: 2 }, { pearls: 50, sp: 1 }][i]),
    // v27.81 던전 난이도 업적: 헬·나이트메어 정복 횟수와 그 난이도로 정복한 던전 수(무릉도장 제외).
    ...series('hell', '던전', n => `${modeName('hell')} 정복 ${n}회`, n => `던전을 ${modeName('hell')} 난이도로 ${n}회 정복합니다.`, [1, 10, 100], modeClears('hell'), i => [{ pearls: 3 }, { pearls: 8 }, { pearls: 15, sp: 1 }][i]),
    ...series('nightmare', '던전', n => `${modeName('nightmare')} 정복 ${n}회`, n => `던전을 ${modeName('nightmare')} 난이도로 ${n}회 정복합니다.`, [1, 10, 100], modeClears('nightmare'), i => [{ pearls: 5 }, { pearls: 12 }, { pearls: 25, ap: 1, sp: 1 }][i]),
    ...series('hellAll', '던전', n => `${modeName('hell')} 던전 ${n}곳`, n => `서로 다른 던전 ${n}곳을 ${modeName('hell')} 난이도로 정복합니다.`, [3, MODE_DUNGEONS], modeDungeons('hell'), i => [{ pearls: 5 }, { pearls: 12, sp: 1 }][i]),
    ...series('nightmareAll', '던전', n => `${modeName('nightmare')} 던전 ${n}곳`, n => `서로 다른 던전 ${n}곳을 ${modeName('nightmare')} 난이도로 정복합니다.`, [3, MODE_DUNGEONS], modeDungeons('nightmare'), i => [{ pearls: 8 }, { pearls: 20, ap: 1 }][i]),
    ...rankAchievements,
    ...series('rankPoints', '계급', n => `진급 포인트 ${n}P 사용`, n => `특전에 진급 포인트를 ${n}P 쓰고 있습니다(초기화해도 달성 기록은 남음).`, [5, 20, RANK_TOTAL_POINTS], rankPointsSpent, i => [{ pearls: 3 }, { pearls: 8 }, { pearls: 20, sp: 1 }][i]),
    ...series('rebirths', '환생', n => `환생 ${n}회`, n => `${n}번째 환생을 마칩니다.`, [1, 3, 5, 10, 20, 50], s => s.rebirths || 0, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 5 }, { pearls: 10, ap: 1 }, { pearls: 20 }, { pearls: 40, ap: 1, sp: 2 }][i]),
    // v25.21 ‘도전’ 탭: 플레이 시간과 장기 누적 기록. 다른 묶음과 달리 별도 탭에서 봅니다.
    ...series('playtime', '도전', n => `모험 ${n.toLocaleString()}시간`, n => `자동 사냥·던전으로 누적 ${n.toLocaleString()}시간을 보냅니다(부재중 정산 포함).`, [1, 10, 50, 100, 500, 1000], playHours, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 6 }, { pearls: 10, ap: 1 }, { pearls: 20 }, { pearls: 40, sp: 1, ap: 1 }][i]),
    ...series('turns', '도전', n => `${n.toLocaleString()}턴`, n => `전투 턴을 누적 ${n.toLocaleString()}번 진행합니다.`, [10000, 100000, 1000000], s => s.turn || 0, i => [{ pearls: 2 }, { pearls: 6 }, { pearls: 15, ap: 1 }][i]),
    ...series('attr', '도전', n => `능력치 ${n} 돌파`, n => `기본 능력치 하나를 ${n} 이상으로 올립니다(직접 투자 + 성장).`, [100, 300, 500], s => Math.max(0, ...Object.values(attributes(s))), i => [{ pearls: 3 }, { pearls: 8, ap: 1 }, { pearls: 20, sp: 1, ap: 1 }][i]),
    ...series('hpmax', '도전', n => `최대 체력 ${n.toLocaleString()}`, n => `최종 최대 체력이 ${n.toLocaleString()}을 넘습니다.`, [10000, 50000, 200000], s => readStats(s).hp, i => [{ pearls: 3 }, { pearls: 10 }, { pearls: 25, ap: 1 }][i]),
    ...series('manamax', '도전', n => `최대 마나 ${n.toLocaleString()}`, n => `최종 최대 마나가 ${n.toLocaleString()}을 넘습니다.`, [5000, 50000], s => readStats(s).mana, i => [{ pearls: 3 }, { pearls: 12, ap: 1 }][i]),
    // v3.6 스타포스 업적: 시도·성공·실패·파괴·쓴 골드·최고 별. 기록은 환생해도 남습니다.
    ...series('starTries', '강화', n => `스타포스 ${n.toLocaleString()}회 시도`, n => `스타포스 강화를 누적 ${n.toLocaleString()}번 시도합니다.`, [100, 1000, 10000], s => sf(s).tries, i => [{ pearls: 1 }, { pearls: 4 }, { pearls: 10, sp: 1 }][i]),
    ...series('starSuccess', '강화', n => `강화 성공 ${n.toLocaleString()}회`, n => `스타포스 강화에 누적 ${n.toLocaleString()}번 성공합니다.`, [50, 500, 5000], s => sf(s).success, i => [{ pearls: 1 }, { pearls: 4 }, { pearls: 10 }][i]),
    ...series('starFail', '강화', n => `강화 실패 ${n.toLocaleString()}회`, n => `스타포스 강화에 누적 ${n.toLocaleString()}번 실패(유지·하락)합니다. 실패도 모험입니다.`, [50, 500, 5000], s => sf(s).fail, i => [{ pearls: 1 }, { pearls: 4 }, { pearls: 10 }][i]),
    ...series('starDestroy', '강화', n => `장비 파괴 ${n}회`, n => `스타포스 강화로 장비를 ${n}번 잃습니다(유물의 12성 회귀 포함).`, [1, 10, 50], s => sf(s).destroy, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 12 }][i]),
    ...series('starGold', '강화', n => `강화에 ${n >= 1e8 ? `${n / 1e8}억` : `${n / 1e4}만`} G`, n => `스타포스 강화에 골드를 누적 ${n.toLocaleString()} G 씁니다.`, [1e7, 1e8, 1e9, 1e10], s => sf(s).gold, i => [{ pearls: 1 }, { pearls: 4 }, { pearls: 10, sp: 1 }, { pearls: 20, ap: 1 }][i]),
    // v3.20 스타포스 흐름 업적: 연속 성공(10성 이상) · 연속 실패 · 하락 · 찬스 타임 · 스타캐치 · 15성 이상 성공.
    ...series('starStreak', '강화', n => `${n}연속 성공`, n => `10성 이상에서 스타포스 강화를 ${n}번 연속으로 성공합니다(실패·파괴가 나면 다시 셉니다).`, [3, 5, 8], s => sf(s).bestStreak || 0, i => [{ pearls: 2 }, { pearls: 6 }, { pearls: 15, sp: 1 }][i]),
    ...series('starFailStreak', '강화', n => `${n}연속 실패`, n => `스타포스 강화에 ${n}번 연속으로 실패합니다(유지·하락·파괴). 불운도 기록입니다.`, [5, 10, 15], s => sf(s).bestFailStreak || 0, i => [{ pearls: 2 }, { pearls: 6 }, { pearls: 15 }][i]),
    ...series('starDrops', '강화', n => `강화 하락 ${n.toLocaleString()}회`, n => `스타포스 강화 실패로 별이 ${n.toLocaleString()}번 떨어집니다.`, [10, 100, 1000], s => sf(s).drops || 0, i => [{ pearls: 1 }, { pearls: 4 }, { pearls: 10 }][i]),
    ...series('starChance', '강화', n => `찬스 타임 ${n.toLocaleString()}회`, n => `두 번 연속 하락 뒤 찾아오는 찬스 타임(100% 성공)을 ${n.toLocaleString()}번 씁니다.`, [1, 10, 100], s => sf(s).chance || 0, i => [{ pearls: 1 }, { pearls: 4 }, { pearls: 10 }][i]),
    ...series('starCatch', '강화', n => `스타캐치 ${n.toLocaleString()}회`, n => `스타캐치 미니게임에서 별을 ${n.toLocaleString()}번 잡고 강화합니다.`, [10, 100, 1000], s => sf(s).catches || 0, i => [{ pearls: 1 }, { pearls: 4 }, { pearls: 10, sp: 1 }][i]),
    ...series('starHigh', '강화', n => `고성 강화 ${n.toLocaleString()}회 성공`, n => `15성 이상에서 스타포스 강화에 ${n.toLocaleString()}번 성공합니다.`, [10, 50, 200], s => sf(s).high || 0, i => [{ pearls: 3 }, { pearls: 8 }, { pearls: 20 }][i]),
    ...series('star', '강화', n => `${n}성 달성`, n => `장비 하나를 ${n}성까지 강화합니다(가방·착용 장비 기준).`, [10, 15, 20, 22], bestStar, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 8, sp: 1 }, { pearls: 15 }][i]),
    // v3.12 칠흑 장신구 수집(보유 수, 환생 유지).
    // v3.15 칠흑은 한 종마다 업적(SP·AP 번갈아), 7종 완성은 큰 보상.
    ...series('onyx', '사냥', n => `칠흑 장신구 ${n}종`, n => `무리 서식지의 칠흑 보스를 쓰러뜨려 칠흑 장신구 ${n}종을 보유합니다.`, [1, 2, 3, 4, 5, 6, 7], onyxOwned, i => [{ pearls: 3, sp: 1 }, { pearls: 5, ap: 1 }, { pearls: 8, sp: 1 }, { pearls: 10, ap: 1 }, { pearls: 15, sp: 1 }, { pearls: 20, ap: 1 }, { pearls: 50, sp: 2, ap: 2 }][i]),
    ...series('deaths', '도전', n => `쓰러짐 ${n}회`, n => `${n}번 쓰러지고도 다시 출항합니다.`, [10, 100, 1000], s => s.deaths || 0, i => [{ pearls: 1 }, { pearls: 3 }, { pearls: 8 }][i]),
    ...series('level', '모험', n => `Lv.${n}`, n => `최고 레벨 ${n}에 도달합니다(환생 전 기록 포함).`, [30, 50, 70, 85, 100], s => s.peakLevel || s.level, i => [{ pearls: 2 }, { pearls: 4 }, { pearls: 8, sp: 1 }, { pearls: 12, ap: 1 }, { pearls: 25, sp: 1 }][i]),
    ...series('items', '모험', n => `물건도감 ${n}종`, n => `물건도감에 장비 ${n}종(부위 × 등급)을 등록합니다.`, [8, 16, 28], s => Object.keys(s.itemBook || {}).length, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    // v3.38 장소 완성 장착 AP(곳마다 +1). 1·4·14곳만 보상 업적, 나머지 단계는 명예 업적(칭호, 업적 보너스 집계 제외).
    ...series('regions', '모험', n => `지역 연구 ${n}곳 완성`, n => `사냥터 ${n}곳의 모든 몬스터 도감을 완성합니다.`, BASE_STAGES.map((_, i) => i + 1), s => completedStages(s).length, i => i === 0 ? { pearls: 2, ap: 1 } : i === 3 ? { pearls: 6, ap: 1 } : i === BASE_STAGES.length - 1 ? { pearls: 12, sp: 1, ap: 1 } : { ap: 1 }).map(a => [1, 4, BASE_STAGES.length].includes(a.target) ? a : { ...a, honor: true }),
    ...series('golden', '사냥', n => `황금 개체 ${n}마리`, n => `황금 개체를 ${n}마리 처치합니다.`, [1, 10, 100], goldens, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    ...series('variants', '사냥', n => `변종 ${n.toLocaleString()}마리`, n => `거대·심연·별빛·무리 변종을 ${n.toLocaleString()}번 처치합니다.`, [10, 100, 1000], variants, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    ...series('mimic', '사냥', n => `숙련의 까미 ${n}마리`, n => `숙련의 까미를 ${n}마리 잡습니다.`, [1, 10, 50], s => s.book?.[MIMIC.id] || 0, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    ...series('nuri', '사냥', n => `경험의 누리 ${n}마리`, n => `경험의 누리를 ${n}마리 잡습니다.`, [1, 10, 50], s => s.book?.[EXP_NURI.id] || 0, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    ...series('slime', '사냥', n => `정수의 슬라임 ${n}마리`, n => `정수의 슬라임을 ${n}마리 잡습니다.`, [1, 10, 50], s => s.book?.[ESSENCE_SLIME.id] || 0, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    ...series('king', '사냥', n => `대왕 ${n}마리`, n => `대왕 까미 · 대왕 누리 · 대왕 정수 슬라임을 합쳐 ${n}마리 잡습니다(v3.161).`, [1, 10, 30], s => KING_IDS.reduce((a, id) => a + (s.book?.[id] || 0), 0), i => [{ pearls: 5 }, { pearls: 10, sp: 1 }, { pearls: 15, sp: 2 }][i]),
    ...series('jobs', '숙련', n => `직업 ${n}개 해금`, n => `직업 ${n}개를 해금합니다.`, [10, 30, 80], s => (s.unlockedJobs || []).length, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    ...series('learned', '숙련', n => `스킬 ${n}개 습득`, n => `SP로 스킬 ${n}개를 배웁니다.`, [10, 30, 80], s => Object.values(s.learned || {}).filter(n => n > 0).length, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    // v3.74 극한돌파 달성(보상 없음 · 명예 업적). 달성하면 운영자에게 문의합니다.
    { id: 'reenlist:1', honor: true, group: '계급' as const, title: '재입대', desc: '중장에서 재입대해 이등병부터 다시 오릅니다(v3.160).', reward: {}, progress: (s: State) => rankState(s).reenlist || 0, target: 1 },
    { id: 'extremeBreak', honor: true, group: '숙련' as const, title: '극한돌파', desc: '액티브 스킬 하나를 극한돌파합니다. 극한돌파시 운영자에게 문의해주세요.', reward: {}, progress: (s: State) => Object.keys(s.skillPractice || {}).some(id => extremeBroken(s, id)) ? 1 : 0, target: 1 },
    // v3.38 던전 첫 정복 SP 업적.
    ...PLAIN_FIRST_CLEAR.map(([id, sp]) => ({ id: `firstClear:${id}`, group: '던전' as const, title: `${DUNGEON_NAME(id)} 첫 정복`, desc: `${DUNGEON_NAME(id)}을(를) 처음 정복합니다.`, reward: { sp }, progress: (s: State) => (s.clears?.[id] || 0) > 0 ? 1 : 0, target: 1 })),
    // v3.205 보스 코어 명예 업적(보상 없음 · 칭호만). 보유 종 수, 각성을 끝까지 마친 코어 수.
    ...series('bossCore', '던전', n => `보스 코어 ${n}종`, n => `던전 보스 코어 ${n}종을 보유합니다.`, [1, 4, 7], s => ownedCores(s).length, () => ({})).map(a => ({ ...a, honor: true })),
    // v3.207 무릉도장 코어 3종 · 전체 10종 보유(명예).
    ...series('abyssCore', '던전', n => `무릉 코어 ${n}종`, n => `무릉도장 코어 ${n}종을 모두 얻습니다.`, [3], s => ABYSS_CORE_IDS.filter(id => s.bossCores?.[id] !== undefined).length, () => ({})).map(a => ({ ...a, honor: true })),
    ...series('bossCore', '던전', n => `보스 코어 ${n}종`, n => `보스 코어 ${n}종(지역 던전 · 무릉도장)을 모두 보유합니다.`, [10], s => ownedCores(s).length, () => ({})).map(a => ({ ...a, honor: true })),
    ...series('coreAwaken', '던전', n => `완전 각성 코어 ${n}종`, n => `보스 코어 ${n}종을 각성 ${BOSS_CORE_RULES.awakenMax}단계까지 올립니다.`, [1, 7], s => ownedCores(s).filter(id => coreEntry(s.bossCores![id])!.rank >= BOSS_CORE_RULES.awakenMax).length, () => ({})).map(a => ({ ...a, honor: true })),
    ...series('dungeonsTen', '던전', n => `던전 ${n}곳 10회 정복`, n => `서로 다른 던전 ${n}곳을 각각 10번 이상 정복합니다.`, [3, PLAIN_DUNGEONS.length], dungeonsAt(10), i => [{ pearls: 5 }, { pearls: 12, sp: 1 }][i]),
    ...series('dungeonsHundred', '던전', n => `던전 ${n}곳 100회 정복`, n => `서로 다른 던전 ${n}곳을 각각 100번 이상 정복합니다.`, [1, PLAIN_DUNGEONS.length], dungeonsAt(100), i => [{ pearls: 5 }, { pearls: 20, ap: 1, sp: 1 }][i]),
    ...series('gold', '도전', n => `보유 골드 ${n.toLocaleString()}`, n => `골드를 ${n.toLocaleString()} 이상 모읍니다.`, [1e6, 1e8, 1e10], s => s.gold || 0, i => [{ pearls: 2 }, { pearls: 6 }, { pearls: 15, sp: 1 }][i]),
    ...series('enhance', '도전', n => `강화 +${n}`, n => `장착한 장비 하나를 +${n} 이상 강화합니다.`, [5, 10, 12], bestEnhance, i => [{ pearls: 2 }, { pearls: 5 }, { pearls: 10, sp: 1 }][i]),
    ...series('god', '도전', n => `신 처치 ${n}회`, n => `제단에서 깨어난 신을 ${n}번 쓰러뜨립니다.`, [1, 10], s => s.altar?.wins || 0, i => [{ pearls: 10, sp: 1 }, { pearls: 30, ap: 1 }][i]),
    { id: 'deep:100', group: '환생', title: '깊은 모험', desc: 'Lv.100에 도달합니다.', reward: { pearls: 10 }, progress: s => Math.max(s.level, s.peakLevel || 0) >= 100 ? 1 : 0, target: 1 },
    /** v3.28 해킹 X 루트 권한을 한 번 쓰면 칭호 root(보상은 칭호뿐: 해커는 다른 재화를 얻지 않음). */
    { id: 'hacker:root', group: '도전', title: 'root', desc: '해킹 X 루트 권한을 실행합니다.', reward: {}, progress: s => (s.hacker?.roots || 0) > 0 ? 1 : 0, target: 1 },
    { id: 'warden:all', group: '숙련', title: '모든 세계의 수호자', desc: '방어 계열 직업 3개를 숙달합니다.', reward: { pearls: 6 }, progress: s => JOBS.filter(j => j.tree === 'defense' && jobMastered(s, j)).length, target: 3 },
];
for (const a of ACHIEVEMENTS) if (a.reward.ap) ACHIEVEMENT_AP[a.id] = a.reward.ap;
/** v3.93 id로 찾기(Map, 처음 부를 때 한 번 만듦). */
let achievementMap: Map<string, typeof ACHIEVEMENTS[number]> | undefined;
export const achievementById = (id: string) => (achievementMap ??= new Map(ACHIEVEMENTS.map(a => [a.id, a]))).get(id);
/** 업적 묶음. ‘도전’은 플레이 시간·전투 턴·능력치 돌파 같은 누적 기록입니다. */
export const CHALLENGE_GROUP = '도전' as const;
export const ACHIEVEMENT_GROUPS = ['모험', '사냥', '숙련', '던전', '환생', '계급', '강화', CHALLENGE_GROUP] as const;
/** v27.81 받을 수 있는 모든 업적의 영구 보상 합계(업적 보너스 탭의 ‘최대’). */
/**
 * v3.93 진행도 읽기: 한 묶음(series)의 단계들은 같은 진행도 함수를 쓰므로, 한 번 훑는 동안 함수마다 한 번만 계산합니다(예: 최대 체력 업적 3단계에 능력치 계산 1번).
 * 상태가 바뀌면 새로 만들어 쓰세요(진행도 함수는 업적 달성 기록을 읽지 않으므로 해금 표시만 하는 동안은 같은 값입니다).
 */
export function progressReader(s: State) {
    const cache = new Map<Achievement['progress'], number>(), ctx: StatsRead = { s };
    return (a: Pick<Achievement, 'progress'>) => {
        let v = cache.get(a.progress);
        if (v === undefined) { const prev = reading; reading = ctx; try { v = a.progress(s); } finally { reading = prev; } cache.set(a.progress, v); }
        return v;
    };
}
export const achievementMaxTotals = () => achievementTotals({ achievementClaims: Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, true])) });

/** 받은 업적의 영구 보상 합계: 장착 AP와 업적 보너스(받은 업적 수 × ACHIEVEMENT_BONUS_PER, 명예 업적 제외). 능력치 배율은 최종 능력치에 한 번 곱합니다(stats가 씀). */
export function achievementTotals(s: Pick<State, 'achievementClaims'>) {
    let ap = 0, count = 0;
    for (const id of Object.keys(s.achievementClaims || {})) {
        const a = achievementById(id); if (!a) continue;
        ap += a.reward.ap || 0; if (!a.honor) count++;
    }
    const bonus = Object.fromEntries(Object.entries(ACHIEVEMENT_BONUS_PER).map(([k, n]) => [k, n * count])) as Record<AchievementBonusKey, number>;
    return { ap, count, bonus };
}
export function rewardText(r: AchievementReward) {
    const parts: string[] = [];
    if (r.pearls) parts.push(`세계석 +${r.pearls}`);
    if (r.sp) parts.push(`SP +${r.sp}`);
    if (r.ap) parts.push(`장착 AP +${r.ap}`);
    return parts.join(' · ');
}
