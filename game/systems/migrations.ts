import { trainingFor, TRAINING_PASSIVE } from '../data/training';
import { jobById, BASE_JOB } from '../data/classes';
import type { State } from '../types';
import { addLog } from './state';
import { syncAchievements, unclaimedAchievements, claimAchievements } from './progress';
import { RELICS, RESEARCH_GROWTH } from '../data/economy';
import { syncRelicPower, tuneOnyx, fixRelicImprints, ownedItems } from './equipment';
import { plainCodexBook } from './progression';
import { ownedOnyx, onyxCodexKey } from '../data/onyx';
import { grantOnyxMilestones } from './onyx-grant';
import { affixDef } from '../data/gear';
import { SAVE_VERSION, PENETRATION } from '../data/balance';
import { newState } from './engine';
import { SKILLS, skillMasteryScale, skillById, LEGACY_MASTERY_TARGET, LEGACY_FIRST_MILESTONE } from '../data/skills';
import { RANKS, RANK_LEGACY_NEED, rankIndex, rankState } from '../data/rank';
import { OLD_GEAR_NAMES, RENAMED_GEAR, RENAMED_AFFIX, gearName } from '../data/maple-gear';
/** v25.23 세계석 연구 ‘황금 개체’(base 8·step 5) 삭제: 투자한 세계석을 전액 돌려줍니다. */
function refundGoldenResearch(s: State) {
    const rank = (s.permanent as Record<string, number | undefined>)?.goldenFish || 0;
    if (!rank) return;
    let spent = 0;
    for (let i = 0; i < rank; i++) spent += 8 + 5 * i;
    s.pearls = (s.pearls || 0) + spent;
    delete (s.permanent as Record<string, number | undefined>).goldenFish;
}
/**
 * v3.38 연구 정리: 던전의 금고(dungeon, base 5·step 4)와 상점 단골(shop, base 3·step 2)을 지우고,
 * 자동 판매기(autoVend)를 자동 정리(옛 자동 분해기 sortingNet)로 합칩니다(두 연구 모두 base 10·step 10, 새 단계 = 둘 중 큰 값).
 * 직접 산(무료로 받지 않은) 단계의 세계석은 차액을 모두 돌려줍니다. 지운 키가 없으면 아무것도 하지 않습니다.
 */
export function mergeResearch337(s: State) {
    const perm = s.permanent as Record<string, number | undefined> | undefined;
    if (!perm) return 0;
    const granted = { ...(s.researchGranted || {}) };
    const paid = (from: number, to: number, base: number, step: number) => { let n = 0; for (let i = from; i < to; i++) n += base + step * i; return n; };
    let refund = 0;
    for (const [id, base, step] of [['dungeon', 5, 4], ['shop', 3, 2]] as const) {
        if (!(id in perm)) continue;
        const rank = perm[id] || 0;
        refund += paid(Math.min(rank, granted[id] || 0), rank, base, step);
        delete perm[id]; delete granted[id];
    }
    if ('autoVend' in perm) {
        const net = perm.sortingNet || 0, vend = perm.autoVend || 0, keep = Math.max(net, vend), free = Math.min(keep, Math.max(granted.sortingNet || 0, granted.autoVend || 0));
        const before = paid(Math.min(net, granted.sortingNet || 0), net, 10, 10) + paid(Math.min(vend, granted.autoVend || 0), vend, 10, 10);
        refund += Math.max(0, before - paid(free, keep, 10, 10));
        perm.sortingNet = keep; delete perm.autoVend;
        if (free) granted.sortingNet = free;
        delete granted.autoVend;
    }
    if (s.researchGranted) s.researchGranted = granted;
    if (refund) { s.pearls = (s.pearls || 0) + refund; addLog(s, `연구 정리(던전의 금고·상점 단골 삭제, 자동 분해기·판매기 → 자동 정리): 세계석 ${refund}개를 돌려받았습니다.`, 'system'); }
    return refund;
}
/** v3.38 장소 완성 장착 AP를 업적 ‘지역 연구 N곳 완성’으로 옮깁니다. 이미 완성한 곳의 업적은 바로 받은 것으로 처리해 AP가 줄지 않습니다(한 번만). */
export function movePlaceAp(s: State) {
    if (s.placeApMoved) return 0;
    s.placeApMoved = true;
    const had = new Set(Object.keys(s.achievements || {}));
    syncAchievements(s, () => {});
    // 이번에 새로 채운 지역 업적은 가장 오래된 기록(0)으로 둡니다. 자동 칭호가 새 명예 칭호로 바뀌지 않게 합니다.
    for (const id of Object.keys(s.achievements || {})) if (!had.has(id) && id.startsWith('regions:')) s.achievements![id] = 0;
    const ids = unclaimedAchievements(s).filter(id => id.startsWith('regions:'));
    for (const id of ids) claimAchievements(s, id);
    return ids.length;
}
/** v3.24 세계석 연구 ‘역풍 견디기’(옛 바람목 넓히기, base 6·step 4) 삭제: 투자한 세계석을 전액 돌려줍니다. */
export function refundTailwindWindow(s: State) {
    const perm = s.permanent as Record<string, number | undefined> | undefined, rank = perm?.tailwindWindow || 0;
    if (!perm || !('tailwindWindow' in perm)) return 0;
    delete perm.tailwindWindow;
    let spent = 0;
    for (let i = 0; i < rank; i++) spent += 6 + 4 * i;
    if (spent > 0) { s.pearls = (s.pearls || 0) + spent; addLog(s, `세계석 연구 ‘역풍 견디기’가 없어져 투자한 세계석 ${spent}개를 돌려받았습니다.`, 'system'); }
    return spent;
}
/** v3.152 세계석 연구 ‘윤회의 연금술’(환생 세계석 +2, base 6 · step 5, 최대 5) 삭제 · 개편 대상: 투자한 세계석을 전액 돌려주고 예약 · 기록에서 지웁니다. */
export function refundPearlResearch(s: State) {
    const perm = s.permanent as Record<string, number | undefined> | undefined;
    if (!perm || !('pearl' in perm)) return 0;
    const rank = perm.pearl || 0;
    delete perm.pearl;
    if (s.researchLegacy && 'pearl' in s.researchLegacy) delete (s.researchLegacy as Record<string, number | undefined>).pearl;
    if (s.researchGranted && 'pearl' in s.researchGranted) delete (s.researchGranted as Record<string, number | undefined>).pearl;
    if (s.researchPlan?.items.some(x => x.id === 'pearl')) s.researchPlan.items = s.researchPlan.items.filter(x => x.id !== 'pearl');
    let spent = 0;
    for (let i = 0; i < rank; i++) spent += 6 + 5 * i;
    if (spent > 0) { s.pearls = (s.pearls || 0) + spent; addLog(s, `세계석 연구 ‘윤회의 연금술’이 개편 대상이 되어 투자한 세계석 ${spent}개를 돌려받았습니다.`, 'system'); }
    return spent;
}
/**
 * v3.154 편의 연구 개편: 넓은 가방 삭제(기본 100칸, 투자한 세계석 환급), 긴 휴식 12단계 × 2시간 → 3단계 × 6시간(단계 = ⌈옛 단계 ÷ 3⌉, 상한 시간은 줄지 않음 · 새 가격이 더 비싸 환급은 없음).
 * 무료 지급분(researchGranted) · 연구 예약도 같이 맞춥니다. offlineRescaled로 한 번만 변환합니다.
 */
export function rescaleConvenienceResearch(s: State) {
    const perm = s.permanent as Record<string, number | undefined> | undefined;
    if (!perm) return 0;
    let refund = 0;
    if ('inventory' in perm) {
        const rank = perm.inventory || 0;
        for (let i = 0; i < rank; i++) refund += 3 + 3 * i;
        delete perm.inventory;
        if (s.researchGranted && 'inventory' in s.researchGranted) delete (s.researchGranted as Record<string, number | undefined>).inventory;
        if (s.researchLegacy && 'inventory' in s.researchLegacy) delete (s.researchLegacy as Record<string, number | undefined>).inventory;
        if (s.researchPlan?.items.some(x => x.id === 'inventory')) s.researchPlan.items = s.researchPlan.items.filter(x => x.id !== 'inventory');
        if (refund > 0) { s.pearls = (s.pearls || 0) + refund; addLog(s, `세계석 연구 ‘넓은 가방’이 없어지고 가방이 기본 100칸이 되어 투자한 세계석 ${refund}개를 돌려받았습니다.`, 'system'); }
    }
    if (!s.offlineRescaled) {
        s.offlineRescaled = true;
        const to = (r: number) => Math.min(3, Math.ceil(r / 3));
        if (perm.offline) perm.offline = to(perm.offline);
        if (s.researchGranted?.offline) s.researchGranted.offline = to(s.researchGranted.offline);
        if (s.researchPlan) for (const item of s.researchPlan.items) if (item.id === 'offline') item.to = to(item.to);
    }
    return refund;
}
/** v27.19 환생 유물이 세계석 구매에서 환생 횟수 제공으로 바뀌었습니다. 이미 가진 유물(= 세계석으로 산 유물)의 세계석을 한 번 돌려줍니다. */
export function refundRelicPurchases(s: State) {
    if (s.relicRefunded) return 0;
    s.relicRefunded = true;
    const owned = new Set([...(s.inventory || []), ...Object.values(s.equipment || {})].map(x => x?.relic).filter(Boolean));
    const refund = RELICS.filter(r => owned.has(r.id)).reduce((n, r) => n + r.cost, 0);
    if (refund > 0) { s.pearls = (s.pearls || 0) + refund; addLog(s, `환생 유물이 환생 횟수 보상으로 바뀌어 이미 산 유물의 세계석 ${refund}개를 돌려받았습니다.`, 'system'); }
    return refund;
}
/**
 * v27.31 한계돌파에 세계석 연구 ‘리미터 해제’가 필요해졌습니다. 이미 한 한계돌파(스킬 중 가장 높은 단계)만큼 연구를 무료로 한 번 줍니다.
 * 무료 단계는 researchGranted에 적어 재분배 때 세계석으로 돌려주지 않습니다.
 */
export function grantLimitBreakResearch(s: State) {
    if (s.researchGranted?.limitBreak !== undefined) return 0;
    const owned = Math.min(3, Math.max(0, ...Object.values(s.limitBreaks || {})));
    const have = s.permanent?.limitBreak || 0, grant = Math.max(0, owned - have);
    s.researchGranted = { ...s.researchGranted, limitBreak: grant };
    if (grant > 0) { s.permanent.limitBreak = have + grant; addLog(s, `한계돌파에 세계석 연구 ‘리미터 해제’가 필요해져, 이미 한 한계돌파만큼 ${have + grant}단계를 무료로 받았습니다.`, 'system'); }
    return grant;
}
/**
 * v27.95 숙련 요구치 상향(3차 이상 스킬 숙련 단계 ×3~×25): 옛 기준 1단계(= 숙련 계승)를 이미 넘긴 스킬은 계승을 유지합니다.
 * 한 번만 처리하고(masteryRescaled), 직업 숙달·스킬 숙련 단계 자체는 새 기준을 따릅니다.
 */
export function keepLegacyInheritance(s: State) {
    if (s.masteryRescaled) return 0;
    s.masteryRescaled = true;
    let kept = 0;
    for (const sk of SKILLS) {
        const scale = skillMasteryScale(sk), first = sk.masteryMilestones?.[0];
        if (scale <= 1 || !first || (s.skillPractice?.[sk.id] || 0) < first / scale || (s.skillPractice?.[sk.id] || 0) >= first) continue;
        (s.legacyInherited ??= {})[sk.id] = true; kept++;
    }
    if (kept) addLog(s, `숙련 요구치가 올라 이미 계승한 스킬 ${kept}개는 계승을 그대로 유지합니다.`, 'system');
    return kept;
}
/**
 * v3.19 계급장 필요 처치 재조정(부사관 ×10 · 장교 ×100 · 장성 ×200): 계급 경험치는 그대로 두고 계급만 새 기준으로 다시 셉니다.
 * 강등된 세이브는 찍어 둔 특전을 모두 되돌립니다(진급 포인트는 새 계급 기준으로 다시 찍음). 한 번만 처리합니다.
 */
export function rescaleRanks(s: State) {
    if (s.rankRescaled) return false;
    s.rankRescaled = true;
    const rk = rankState(s);
    let cum = 0, oldIndex = 0;
    RANK_LEGACY_NEED.forEach((n, i) => { cum += n; if (i > 0 && rk.exp >= cum) oldIndex = i; });
    const now = rankIndex(rk.exp);
    if (now >= oldIndex) return false;
    const spent = Object.values(rk.perks || {}).some(n => (n || 0) > 0);
    s.rank = { ...rk, perks: {} };
    addLog(s, `계급장 진급 기준이 크게 늘어 ${RANKS[oldIndex].name} → ${RANKS[now].name}(으)로 조정되었습니다.${spent ? ' 찍어 둔 특전을 모두 되돌렸으니 진급 포인트를 다시 배분하세요.' : ''}`, 'system');
    return true;
}
/** v3.42 연구 가격 인상(21번째 단계부터 ×1.06 복리) 전에 산 단계를 한 번 기록합니다. 재분배 때 이 단계까지는 전 가격으로 돌려줍니다. */
export function stampResearchLegacy(s: State) {
    if (s.researchLegacy) return 0;
    s.researchLegacy = Object.fromEntries(Object.entries(s.permanent || {}).filter(([, rank]) => rank > RESEARCH_GROWTH.from));
    return Object.keys(s.researchLegacy).length;
}
/** v3.58 확정 구매(일반 등급 구매)를 없애며 물건 도감 ‘일반’ 4칸을 한 번 등록해 줍니다(이미 등록한 칸은 그대로). */
export function registerPlainCodex(s: State) {
    if (s.plainCodex) return 0;
    s.plainCodex = true;
    const book = (s.itemBook ??= {}), add = Object.keys(plainCodexBook()).filter(k => !book[k]);
    for (const k of add) book[k] = true;
    return add.length;
}
/**
 * v3.62 문 폐지(docs/concept.md 11.7): 이번 생 윤회의 문으로 열려 있던 직업은 드러난 것으로 남기고(doorsOpened) 추첨 값을 지웁니다.
 * 운영자가 연 문(openDoors)도 더는 쓰지 않습니다. 여러 번 불러도 같습니다.
 */
export function retireDoors(s: State) {
    const legacy = s as State & { rebirthDoor?: string; openDoors?: unknown };
    if (legacy.rebirthDoor) { if (!s.doorsOpened?.includes(legacy.rebirthDoor)) (s.doorsOpened ??= []).push(legacy.rebirthDoor); delete legacy.rebirthDoor; }
    if ('openDoors' in legacy) delete legacy.openDoors;
}
/** v3.64 삭제한 히든 직업 6개와 그 스킬(docs/concept.md 11.7-2). */
export const RETIRED_JOBS = ['barehandFisher', 'mistSwordsman', 'headwindSailor', 'sunriseAngler', 'noonDiver', 'nightHeron',
    /** v3.138 5차 통폐합 1: 미하일 계보(팔라딘과 같은 반사 탱커)와 숨은 2차 성벽 기사(산호 축성가). */
    'shieldbearer', 'gatekeeper', 'fortressLord', 'unyielding', 'guardianDeity', 'coralBuilder', 'fistMagus', 'deckGunner',
    /** v3.146 은월 재개편: 곁가지 구미호(흡혈)는 제논과 겹쳐 지웠습니다. */
    'tideDevourer',
    /** v3.148 아델 재개편: 곁가지 허공 방랑자(회피 + 마나)는 특색이 약해 지웠습니다. */
    'voidDrifter',
    /** v3.151 일리움 재개편: 곁가지 크리스탈 연성사(마나 비례)는 아델 장치와 겹쳐 지웠습니다. */
    'crystalCaster',
    /** v3.153 패스파인더 재개편: 숨은 2차 몬스터 도감 독자(도감 비례)는 섀도어 · 기록 비례 직업과 겹쳐 지웠습니다. */
    'codexReader',
    /** v3.155 카데나 재개편: 곁가지 빙결 결박사(제어 조건 마법 딜)는 바이퍼 장치와 겹쳐 지웠습니다. */
    'frostBinder',
    /** v3.156 섀도어 재개편: 곁가지 보물 사냥꾼(닻 휘두르기 · 잠수복)은 특색이 없어 지웠습니다. */
    'wreckDiver',
    /** v3.158 숨은 3차 시공의 위자드(썬콜 곁가지, ×N 피해 + 약화 하나)는 장치가 없어 지웠습니다. */
    'eternalNavigator',
    /** v3.159 칼리 재개편: 곁가지 부두 인형사(약화 조건 딜)는 특색이 없어 지웠습니다. */
    'voodooCrafter',
    /** v3.163 제논 재개편: 곁가지 태엽 기계공 · 올라운더(조화는 본줄기가 가져감) · 숨은 칠전팔기 모험가(쓰러진 횟수 비례는 다크나이트가 맡음)를 지웠습니다. */
    'clockworkAngler', 'allRounder', 'fallenAngler',
    /** v3.164 팬텀 곁가지 트릭스터(약화 · 회피 패시브)는 장치가 없어 지웠습니다. */
    'inkMime',
    /** v3.198 히든 정리: 숨은 2차 청빈 수도승(호영 가지)을 지웠습니다. */
    'poorMonk'];
export const RETIRED_SKILLS = ['bareGrab', 'ironGrip', 'mistSlash', 'fogVeil', 'headwindTack', 'galeLegs', 'dawnFlare', 'morningCalm', 'sunDive', 'brineLungs', 'heronStill', 'nightEyes',
    /** v3.170 수련 액티브 10개 · 패시브 4개(맹세의 결의 · 관중의 환호 · 기사의 갑옷 · 생명의 기운): 계보마다 패시브 4개로 맞추며 삭제. */
    'arcane', 'cut', 'hushCurrent', 'undertow', 'rushCurrent', 'netThrow', 'oathShout', 'currentJam', 'driftwoodShove', 'rottenBait', 'resolve', 'showmanship', 'scales', 'vital',
    /** v3.176 나이트로드 손가락 자르기 I · III: 세 단계를 II 하나로 접으며 삭제. */
    'fingerCutI', 'fingerCutIII',
    /** v3.138 미하일 계보 10개 · 성벽 기사의 리커버리(fortress) · 아이언 바디(coralPatience). */
    'shieldBash', 'shieldWall', 'ironRetort', 'spikedShield', 'bulwarkSlam', 'stoneSkin', 'lastStand', 'undying', 'aegisJudgment', 'divineAegis', 'fortress', 'coralPatience',
    /** v3.140 숨은 2차 주먹 마도사(마법 계수 → 물리 피해)는 루미너스 계보가 그 자리를 맡아 지웠습니다. */
    'arcaneFist', 'manaMuscle',
    /** v3.153 몬스터 도감 독자의 도감 낭독 · 여백 메모. */
    'encyclopediaBolt', 'marginNotes',
    /** v3.155 빙결 결박사의 서리 족쇄 · 서리 안개. */
    'rimeShackle', 'frostMist',
    /** v3.156 보물 사냥꾼의 닻 휘두르기 · 잠수복. */
    'anchorSwing', 'pressureSuit',
    /** v3.158 시공의 위자드의 시공의 파동. */
    'eternalWave',
    /** v3.159 부두 인형사의 바늘 인형 · 인형의 실. */
    'pinDoll', 'effigyThread',
    /** v3.163 태엽 사출 · 감긴 태엽 · 올라운드 밸런스 · 다시 일어서기 · 아문 상처. */
    'windupCast', 'springLoaded', 'harmonicWeight', 'riseAgain', 'scarTissue',
    /** v3.164 트릭스터의 스모크 스크린 · 팬텀 섀도우. */
    'smokeVeil', 'slipperyStep',
    /** v3.143 숨은 2차 캐논슈터(복합 연타)는 메카닉 재개편에서 지웠습니다. */
    'broadside', 'powderKeg', 'devour', 'gorgedMaw', 'nullStep', 'phaseCloak', 'crystalShard', 'latticeMind',
    /** v3.198 청빈 수도승의 빈손 장타 · 청빈 서약. */
    'emptyPalm', 'vowOfPoverty',
    /** v3.199 궁극의 모험가는 자체 각성기를 두지 않아 옛 윤회의 나그네의 윤회의 일격을 지웠습니다. */
    'soulHook'];
/**
 * v3.64 히든 직업 재배치 · v3.138 5차 통폐합: 삭제한 직업·스킬의 기록(숙련·숙달·습득·계승·SP·한계돌파·편성)을 보상 없이 지웁니다(오픈 베타 결정).
 * 지금 그 직업이면 초보자로 돌아갑니다. 여러 번 불러도 같습니다.
 */
export function retireHiddenJobs(s: State) {
    const jobs = new Set(RETIRED_JOBS), skills = new Set(RETIRED_SKILLS), drop = (ids?: string[]) => ids?.filter(id => !skills.has(id));
    if (jobs.has(s.job)) s.job = BASE_JOB;
    if (s.jobGoal && jobs.has(s.jobGoal)) delete s.jobGoal;
    s.unlockedJobs = s.unlockedJobs.filter(id => !jobs.has(id));
    if (s.doorsOpened) s.doorsOpened = s.doorsOpened.filter(id => !jobs.has(id));
    for (const id of jobs) delete s.jobMastery[id];
    if (s.letterLog) s.letterLog = s.letterLog.filter(l => !jobs.has(l.job));
    for (const id of skills) for (const rec of [s.learned, s.skillSpent, s.skillPractice, s.skillInheritances, s.refineBase, s.limitBreaks, s.legacyInherited, s.cooldowns]) if (rec) delete (rec as Record<string, unknown>)[id];
    s.skills = drop(s.skills)!;
    if (s.skillPins) s.skillPins = drop(s.skillPins);
    if (s.skillHidden) s.skillHidden = drop(s.skillHidden);
    for (const p of Object.values(s.presets || {})) p.skills = drop(p.skills)!;
}
/**
 * v3.199 윤회의 나그네(1차, 공개) → 궁극의 모험가(히든 5차, id 그대로): 옛 1차 기록으로 5차 직업에 머물지 않도록 한 번만 정리합니다.
 * 지금 그 직업이면 초보자로 돌아가고, 직업 숙련 · 전직 기록을 보상 없이 지웁니다(윤회의 일격 기록은 RETIRED_SKILLS가 지움).
 */
export function remakeRebirthFisher(s: State) {
    if (s.ultimateRemade) return;
    s.ultimateRemade = true;
    const job = 'rebirthFisher';
    if (s.job === job) { s.job = BASE_JOB; addLog(s, '윤회의 나그네가 히든 5차 직업으로 바뀌어 초보자로 돌아왔습니다.', 'system'); }
    if (s.jobGoal === job) delete s.jobGoal;
    s.unlockedJobs = s.unlockedJobs.filter(id => id !== job);
    if (s.doorsOpened) s.doorsOpened = s.doorsOpened.filter(id => id !== job);
    delete s.jobMastery[job];
    if (s.masteryKept) s.masteryKept = s.masteryKept.filter(id => id !== job);
}
/** v3.135 나이트워커 2~5차 · 골령술사와 그 스킬을 지우고 1차 망인(undead)만 남깁니다. */
export const NIGHT_WALKER_JOBS = ['skeleton', 'bonecaster', 'soulHarvester', 'lichKing', 'deathEmperor'];
export const NIGHT_WALKER_SKILLS = ['marrowGuard', 'ossuaryRite', 'harvestEcho', 'soulTax', 'soulTyranny', 'undyingThrone', 'soulReap', 'undeathThrone'];
/**
 * v3.135 지운 직업에 있으면 망인으로 옮기고, 지운 직업 · 스킬의 기록(숙련 · 숙달 · 습득 · 계승 · SP · 한계돌파 · 편성)을 지웁니다. 여러 번 불러도 같습니다.
 */
export function retireNightWalker(s: State) {
    const jobs = new Set(NIGHT_WALKER_JOBS), skills = new Set(NIGHT_WALKER_SKILLS), drop = (ids?: string[]) => ids?.filter(id => !skills.has(id));
    if (jobs.has(s.job)) { s.job = 'undead'; addLog(s, '나이트워커 2~5차가 사라져 망인으로 돌아왔습니다.', 'system'); }
    if (s.jobGoal && jobs.has(s.jobGoal)) delete s.jobGoal;
    s.unlockedJobs = s.unlockedJobs.filter(id => !jobs.has(id));
    if (s.doorsOpened) s.doorsOpened = s.doorsOpened.filter(id => !jobs.has(id));
    for (const id of jobs) delete s.jobMastery[id];
    if (s.masteryKept) s.masteryKept = s.masteryKept.filter(id => !jobs.has(id));
    if (s.letterLog) s.letterLog = s.letterLog.filter(l => !jobs.has(l.job));
    for (const id of skills) for (const rec of [s.learned, s.skillSpent, s.skillPractice, s.skillInheritances, s.refineBase, s.limitBreaks, s.legacyInherited, s.cooldowns]) if (rec) delete (rec as Record<string, unknown>)[id];
    s.skills = drop(s.skills)!;
    if (s.skillPins) s.skillPins = drop(s.skillPins);
    if (s.skillHidden) s.skillHidden = drop(s.skillHidden);
    for (const p of Object.values(s.presets || {})) p.skills = drop(p.skills)!;
}
/**
 * v3.69 수련 패시브 숙련 요구치 상향(data/training.ts TRAINING_PASSIVE): 예전 기준(첫 단계 250)으로 이미 계승 자격이 있던 수련 패시브는 계승을 유지합니다. 한 번만 처리합니다.
 */
export function keepTrainingInheritance(s: State) {
    if (s.trainingRescaled) return 0;
    s.trainingRescaled = true;
    let kept = 0;
    for (const sk of SKILLS) {
        if (sk.type !== 'passive' || !sk.job?.startsWith('training')) continue;
        const practice = s.skillPractice?.[sk.id] || 0;
        if (practice >= TRAINING_PASSIVE.oldFirst && practice < TRAINING_PASSIVE.milestones[0]) { (s.legacyInherited ??= {})[sk.id] = true; kept++; }
    }
    if (kept) addLog(s, `수련 패시브의 숙련 요구치가 올라, 이미 계승한 수련 패시브 ${kept}개는 계승을 그대로 유지합니다.`, 'system');
    return kept;
}
/** v3.80 직업 숙달 목표 상향(data/skills.ts alignJobMastery): 예전 목표로 이미 숙달한 직업은 숙달로 남깁니다. 한 번만 처리합니다. */
export function keepMasteredJobs(s: State) {
    if (s.masteryAligned) return 0;
    s.masteryAligned = true;
    const kept = Object.entries(s.jobMastery || {}).filter(([id, n]) => LEGACY_MASTERY_TARGET[id] !== undefined && n >= LEGACY_MASTERY_TARGET[id] && n < (jobById(id)?.masteryTarget ?? Infinity)).map(([id]) => id);
    if (kept.length) { s.masteryKept = [...new Set([...(s.masteryKept || []), ...kept])]; addLog(s, `직업 숙달 목표가 올랐습니다. 이미 숙달한 직업 ${kept.length}개는 숙달로 남습니다.`, 'system'); }
    // v3.80 스킬 숙련 기준 정리로 첫 단계가 오른 스킬: 예전 기준으로 이미 계승 자격이 있었으면 계승을 유지합니다.
    let skills = 0;
    for (const [id, old] of Object.entries(LEGACY_FIRST_MILESTONE)) {
        const now = skillById(id)?.masteryMilestones?.[0] ?? 0, practice = s.skillPractice?.[id] || 0;
        if (practice >= old && practice < now) { (s.legacyInherited ??= {})[id] = true; skills++; }
    }
    if (skills) addLog(s, `스킬 숙련 기준이 바뀌어, 이미 계승한 스킬 ${skills}개는 계승을 그대로 유지합니다.`, 'system');
    return kept.length;
}
/**
 * v3.69 독립 수련 통합(data/training.ts): 지금 옛 수련 직업이면 새 수련 직업으로 옮깁니다(스킬은 id 그대로 새 직업 것이라 편성·습득은 그대로).
 * 옛 직업의 숙련 기록은 지우지 않습니다(숙달 수에는 세지 않음). 여러 번 불러도 같습니다.
 */
export function moveToTraining(s: State) {
    const next = trainingFor(s.job);
    if (!next) return;
    s.job = next;
    if (!s.unlockedJobs.includes(next)) s.unlockedJobs.push(next);
    s.jobMastery[next] ??= 0;
}
/**
 * v8(게임 v20.5): 골드 훈련 삭제와 함께 이전 버전의 세이브는 이름만 남기고 새로 시작합니다.
 * 이후 버전 변경은 이 함수에 단계별 추가 마이그레이션으로 이어 붙입니다.
 */
export function migrateState(s: State, now = s.lastTick || 0): State {
    // v3.31 효과가 없던 스킬 특화(skillSpecializations)는 세이브에서 지웁니다.
    if ('skillSpecializations' in s) delete (s as Record<string, unknown>).skillSpecializations;
    // v3.36 쓰지 않던 개인 길드 기록(guild)을 지웁니다. v3.38 성장 목표(growthGoal)도 없앴습니다.
    if ('growthGoal' in s) delete (s as Record<string, unknown>).growthGoal;
    if ('guild' in s) delete (s as Record<string, unknown>).guild;
    // v3.37 문 알림 끄기는 설정 → 화면 알림(이 기기) 하나로 합쳤습니다.
    if ('hideDoorNotice' in s) delete (s as Record<string, unknown>).hideDoorNotice;
    // v3.60 뒤 정리: 쓰지 않던 옛 값(무리 규모 선택 swarm, 생 보너스 lifeBonus, 애드가드 공개 항목 privacy)을 지웁니다.
    for (const key of ['swarm', 'lifeBonus', 'privacy']) if (key in s) delete (s as Record<string, unknown>)[key];
    // v3.66 유물 위력 공식 변경: 이미 가진 유물은 다음 승천까지 예전 공식과 새 공식 중 높은 쪽을 씁니다(약해지지 않게).
    if (!s.relicRule) { for (const item of [...(s.inventory || []), ...Object.values(s.equipment || {})]) if (item?.relic) item.relicLegacy = true; s.relicRule = true; }
    // v3.38 던전 첫 정복 SP(옛 보스 연구)는 업적 firstClear:던전 id로 옮겼습니다. 이미 받은 것은 받은 업적으로 옮겨 두 번 받지 않습니다.
    const bossClaims = (s as { bossResearchClaims?: Record<string, boolean> }).bossResearchClaims;
    if (bossClaims) {
        s.achievements ??= {}; s.achievementClaims ??= {};
        for (const [id, got] of Object.entries(bossClaims)) if (got) { s.achievements[`firstClear:${id}`] ??= s.turn || 0; s.achievementClaims[`firstClear:${id}`] = true; }
        delete (s as Record<string, unknown>).bossResearchClaims;
    }
    // v3.119 마력 옵션의 턴당 마나 회복이 위력 비례가 아니라 0.01 남짓으로 붙어 있던 장비를 바로잡습니다(최대 마나와 같은 굴림으로).
    if (s.version === SAVE_VERSION) fixFlowRegen(s);
    // v3.114 환생 50 · 100회 이정표 칠흑: 이미 닿은 캐릭터에게 소급 지급합니다(받은 이정표는 onyxMilestones로 한 번만).
    if (s.version === SAVE_VERSION) grantOnyxMilestones(s);
    if (s.version === SAVE_VERSION) { rescaleRanks(s); keepLegacyInheritance(s); refundGoldenResearch(s); refundRelicPurchases(s); refundAutoStar(s); refundTailwindWindow(s); refundPearlResearch(s); rescaleConvenienceResearch(s); mergeResearch337(s); movePlaceAp(s); stampResearchLegacy(s); registerPlainCodex(s); grantLimitBreakResearch(s); renameMapleGear(s); syncRelicPower(s); for (const item of ownedItems(s)) if (item) tuneOnyx(item); fixRelicImprints(s); registerOnyxCodex(s); retireDoors(s); retireHiddenJobs(s); remakeRebirthFisher(s); retireNightWalker(s); moveToTraining(s); keepTrainingInheritance(s); keepMasteredJobs(s); boostPenetrationAffixes(s); startLifeClock(s, now); return s; }
    const name = typeof s.name === 'string' && s.name.trim() ? s.name : undefined;
    const fresh = newState(now);
    if (name) fresh.name = name;
    for (const key of Object.keys(s)) delete (s as Record<string, unknown>)[key];
    Object.assign(s, fresh);
    return s;
}

/** v3.8 자동 강화 연구 비용 100 → 10: 이미 찍은 세이브에 차액 90을 한 번 돌려줍니다. */
export const AUTO_STAR_REFUND = 90;
/** v3.14 이미 가진 칠흑 장신구를 물건 도감에 자동 등록합니다(장비 소모 없음). */
export function registerOnyxCodex(s: State) { for (const id of ownedOnyx(s)) { s.itemBook ??= {}; s.itemBook[onyxCodexKey(id)] = true; } }
export function refundAutoStar(s: State) {
    if (s.autoStarRefunded) return 0;
    s.autoStarRefunded = true;
    if (!(s.permanent?.autoStar >= 1)) return 0;
    s.pearls += AUTO_STAR_REFUND;
    return AUTO_STAR_REFUND;
}
/**
 * v27.46 장비 이름 메이플 개편: 가방·착용 장비의 옛 이름(낚싯대·구명조끼·나침반 …)과 옵션 이름(유영)을 새 이름으로 바꿉니다.
 * 옛 이름만 골라 바꾸므로 여러 번 불러도 같고, 바꿀 게 없으면 아무것도 하지 않습니다. 능력치·등급·옵션 값은 그대로입니다.
 */
export function renameMapleGear(s: State) {
    let changed = 0;
    for (const item of [...(s.inventory || []), ...Object.values(s.equipment || {})]) {
        if (!item || item.onyx) continue;
        const old = OLD_GEAR_NAMES[item.slot as keyof typeof OLD_GEAR_NAMES] as readonly string[] | undefined;
        // 감정으로 얻은 옛 장비는 '전설 작살형 낚싯대'처럼 등급 + 상점 이름이었습니다.
        const tier = old ? old.indexOf(item.name) : -1, shop = /^(일반|희귀|영웅|전설|신화|고대|태초) (작살형 낚싯대|해류 지팡이|항해사의 방어구|정밀한 조류 나침반)$/.test(item.name);
        const next = tier >= 0 || shop ? gearName(item.slot, tier >= 0 ? tier : item.rarity || 0, item.style) : RENAMED_GEAR[item.name];
        if (next && next !== item.name) { item.name = next; changed++; }
        for (const affix of [...(item.affixes || []), ...(item.affix ? [item.affix] : [])]) if (RENAMED_AFFIX[affix.name]) { affix.name = RENAMED_AFFIX[affix.name]; changed++; }
    }
    return changed;
}
/** v27.63 환생 통계: 이번 생 시작 기록이 없는 기존 세이브는 지금부터 잽니다(언제 시작했는지 몰라 partial로 표시). 한 번만 적용됩니다. */
export function startLifeClock(s: State, now: number) {
    if (s.lifeStart) return;
    s.lifeStart = { at: now, playMs: s.playMs || 0, partial: true };
}

/** v3.84 관통 장비 옵션 ×2(PENETRATION.gearScale): 새로 굴리는 옵션은 기본값이 이미 2배라, 지금 가진 장비(가방 · 착용 · 유물 이식 줄)의 관통 줄만 한 번 맞춥니다. */
export function boostPenetrationAffixes(s: State) {
    if (s.penetrationBoosted) return 0;
    let n = 0;
    const scale = (v: number) => Math.round(v * PENETRATION.gearScale * 10000) / 10000;
    for (const item of ownedItems(s)) for (const x of item?.affixes || []) {
        if (x.stat === 'penetration' && x.value > 0) { x.value = scale(x.value); n++; }
        if (x.stat2 === 'penetration' && (x.value2 ?? 0) > 0) { x.value2 = scale(x.value2!); n++; }
    }
    s.penetrationBoosted = true;
    return n;
}

/** v3.119 마력(flow) 옵션: 둘째 수치(턴당 마나 회복)를 최대 마나와 같은 굴림의 위력 비례 값으로 다시 맞춥니다. 1 미만으로 붙은 줄만 고치므로 여러 번 불러도 같습니다. */
export function fixFlowRegen(s: State) {
    const def = affixDef('flow');
    if (!def?.base || !def.base2) return;
    for (const item of [...(s.inventory || []), ...Object.values(s.equipment || {})])
        for (const x of item?.affixes || [])
            if (x.id === 'flow' && x.stat2 === 'manaRegen' && (x.value2 || 0) < 1 && x.value >= 1) x.value2 = Math.max(1, Math.round(x.value * def.base2 / def.base));
}
