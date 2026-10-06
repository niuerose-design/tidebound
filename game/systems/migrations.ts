import type { State } from '../types';
import { addLog } from './state';
import { syncAchievements, unclaimedAchievements, claimAchievements } from './progress';
import { RELICS, RESEARCH_GROWTH } from '../data/economy';
import { syncRelicPower } from './equipment';
import { plainCodexBook } from './progression';
import { ownedOnyx, onyxCodexKey } from '../data/onyx';
import { SAVE_VERSION } from '../data/balance';
import { newState } from './engine';
import { SKILLS, skillMasteryScale } from '../data/skills';
import { RANKS, RANK_LEGACY_NEED, rankIndex, rankState } from '../data/rank';
import { OLD_GEAR_NAMES, RENAMED_GEAR, RENAMED_AFFIX, gearName } from '../data/maple-gear';
/**
 * v8(게임 v20.5): 골드 훈련 삭제와 함께 이전 버전의 세이브는 이름만 남기고 새로 시작합니다.
 * 이후 버전 변경은 이 함수에 단계별 추가 마이그레이션으로 이어 붙입니다.
 */
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
 * v27.31 한계돌파에 세계석 연구 ‘한계의 문’이 필요해졌습니다. 이미 한 한계돌파(스킬 중 가장 높은 단계)만큼 연구를 무료로 한 번 줍니다.
 * 무료 단계는 researchGranted에 적어 재분배 때 세계석으로 돌려주지 않습니다.
 */
export function grantLimitBreakResearch(s: State) {
    if (s.researchGranted?.limitBreak !== undefined) return 0;
    const owned = Math.min(3, Math.max(0, ...Object.values(s.limitBreaks || {})));
    const have = s.permanent?.limitBreak || 0, grant = Math.max(0, owned - have);
    s.researchGranted = { ...s.researchGranted, limitBreak: grant };
    if (grant > 0) { s.permanent.limitBreak = have + grant; addLog(s, `한계돌파에 세계석 연구 ‘한계의 문’이 필요해져, 이미 한 한계돌파만큼 ${have + grant}단계를 무료로 받았습니다.`, 'system'); }
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
export function migrateState(s: State, now = s.lastTick || 0): State {
    // v3.31 효과가 없던 스킬 특화(skillSpecializations)는 세이브에서 지웁니다.
    if ('skillSpecializations' in s) delete (s as Record<string, unknown>).skillSpecializations;
    // v3.36 쓰지 않던 개인 길드 기록(guild)을 지웁니다. v3.38 성장 목표(growthGoal)도 없앴습니다.
    if ('growthGoal' in s) delete (s as Record<string, unknown>).growthGoal;
    if ('guild' in s) delete (s as Record<string, unknown>).guild;
    // v3.37 문 알림 끄기는 설정 → 화면 알림(이 기기) 하나로 합쳤습니다.
    if ('hideDoorNotice' in s) delete (s as Record<string, unknown>).hideDoorNotice;
    // v3.38 던전 첫 정복 SP(옛 보스 연구)는 업적 firstClear:던전 id로 옮겼습니다. 이미 받은 것은 받은 업적으로 옮겨 두 번 받지 않습니다.
    const bossClaims = (s as { bossResearchClaims?: Record<string, boolean> }).bossResearchClaims;
    if (bossClaims) {
        s.achievements ??= {}; s.achievementClaims ??= {};
        for (const [id, got] of Object.entries(bossClaims)) if (got) { s.achievements[`firstClear:${id}`] ??= s.turn || 0; s.achievementClaims[`firstClear:${id}`] = true; }
        delete (s as Record<string, unknown>).bossResearchClaims;
    }
    if (s.version === SAVE_VERSION) { rescaleRanks(s); keepLegacyInheritance(s); refundGoldenResearch(s); refundRelicPurchases(s); refundAutoStar(s); refundTailwindWindow(s); mergeResearch337(s); movePlaceAp(s); stampResearchLegacy(s); registerPlainCodex(s); grantLimitBreakResearch(s); renameMapleGear(s); syncRelicPower(s); registerOnyxCodex(s); startLifeClock(s, now); return s; }
    const name = typeof s.name === 'string' && s.name.trim() ? s.name : undefined;
    const fresh = newState(now);
    if (name) fresh.name = name;
    for (const key of Object.keys(s)) delete (s as Record<string, unknown>)[key];
    Object.assign(s, fresh);
    return s;
}

/**
 * v27.46 장비 이름 메이플 개편: 가방·착용 장비의 옛 이름(낚싯대·구명조끼·나침반 …)과 옵션 이름(유영)을 새 이름으로 바꿉니다.
 * 옛 이름만 골라 바꾸므로 여러 번 불러도 같고, 바꿀 게 없으면 아무것도 하지 않습니다. 능력치·등급·옵션 값은 그대로입니다.
 */
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
