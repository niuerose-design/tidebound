import type { State } from '../types';
import { addLog } from './state';
import { RELICS } from '../data/economy';
import { syncRelicPower } from './equipment';
import { SAVE_VERSION } from '../data/balance';
import { newState } from './engine';
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
export function migrateState(s: State, now = s.lastTick || 0): State {
    if (s.version === SAVE_VERSION) { refundGoldenResearch(s); refundRelicPurchases(s); grantLimitBreakResearch(s); renameMapleGear(s); syncRelicPower(s); startLifeClock(s, now); return s; }
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
export function renameMapleGear(s: State) {
    let changed = 0;
    for (const item of [...(s.inventory || []), ...Object.values(s.equipment || {})]) {
        if (!item) continue;
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
