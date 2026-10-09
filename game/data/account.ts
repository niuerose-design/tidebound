import type { Item, State } from '../types';
import { percent } from './progression';

/**
 * v25.6 캐릭터 슬롯과 계정 보너스.
 * 한 계정은 최대 3개의 모험가를 따로 키울 수 있고(세이브·랭킹·채팅 모두 별개), 모든 슬롯의 기록을 합친 계정 보너스가 각 캐릭터에 적용됩니다.
 * 슬롯 요약은 서버가 저장 전에 올리고(slots 테이블), 합계는 s.account 에 캐시되어 능력치 계산이 저장 상태만 봅니다. 없으면 보너스 0.
 */
export const SLOT_COUNT = 3;
/** 슬롯 해금 조건: 2번은 어느 캐릭터든 환생 1회, 3번은 계정 환생 합계 50회(v27.79, 장기 콘텐츠). */
const SLOT_UNLOCK = [0, 1, 50];
/**
 * v27.79 계정 보너스는 AP를 빼고 모두 낮은 곱연산 배율입니다. 분신은 장기 콘텐츠이고 캐릭터 스펙은 계급장·연구가 맡습니다.
 */
export const ACCOUNT_RULES = {
    /** 계정 환생 합계 1회마다 경험치·골드 ×(1 + 1%)(최대 30회 · ×1.3). */
    rebirthStep: .01, rebirthCap: 30,
    /** 숙달한 직업(합집합) 5개마다 장착 AP +1(최대 +6). 그대로. */
    masteredPer: 5, masteredCap: 6,
    /** 계정 최고 무릉도장 층 10층마다 두 공격·최대 체력·최대 마나 ×(1 + 0.5%)(최대 ×1.05). */
    abyssPer: 10, abyssStep: .005, abyssCap: 10,
    /** 도감 발견 몬스터(합집합) 5종마다 직업·스킬 숙련 획득 ×(1 + 1%)(최대 ×1.07). */
    speciesPer: 5, speciesStep: .01, speciesCap: 7,
    /** 보스 처치 합계 100마리마다 치명타 확률 ×(1 + 1%)(최대 ×1.10). */
    bossPer: 100, bossStep: .01, bossCap: 10,
} as const;
/** 슬롯 하나의 기록 요약. 서버가 저장 전에 계산해 올립니다. */
export type SlotSummary = { slot: number; name: string; job: string; level: number; rebirths: number; mastered: string[]; species: string[]; bossKills: number; abyssBest: number; updatedAt: number; /** v3.31 모든 승천을 합친 누적 환생(슬롯 해금 판정)과 승천 횟수. */ lifetimeRebirths?: number; ascension?: number; /** v3.215 이 분신이 다른 분신에게 주는 참모 지원(없으면 없음). */ support?: import('../types').SupportMap };
/** 세이브에 캐시되는 계정 합계. slots 는 설정 화면의 슬롯 목록용, ownKey 는 마지막으로 올린 내 요약의 비교 키. */
export type AccountSummary = { slot: number; rebirths: number; mastered: number; species: number; bossKills: number; abyssBest: number; slots: SlotSummary[]; syncedAt: number; ownKey?: string; /** v3.31 누적 환생 합계(슬롯 해금 판정). */ lifetimeRebirths?: number };
export type AccountState = Pick<State, 'account'>;
export const accountSlot = (s: AccountState) => s.account?.slot || 1;
export function mergeSlots(slot: number, slots: SlotSummary[], now: number): AccountSummary {
    const mastered = new Set<string>(), species = new Set<string>();
    let rebirths = 0, bossKills = 0, abyssBest = 0, lifetimeRebirths = 0;
    for (const x of slots) { rebirths += x.rebirths; lifetimeRebirths += x.lifetimeRebirths ?? x.rebirths; bossKills += x.bossKills; abyssBest = Math.max(abyssBest, x.abyssBest); x.mastered.forEach(id => mastered.add(id)); x.species.forEach(id => species.add(id)); }
    return { slot, rebirths, mastered: mastered.size, species: species.size, bossKills, abyssBest, slots: [...slots].sort((a, b) => a.slot - b.slot), syncedAt: now, lifetimeRebirths };
}
/** 슬롯 n(1~3)이 열렸는지. 1번은 항상. */
/** v3.31 슬롯 해금은 누적 환생으로 판정합니다(승천해도 한 번 열린 슬롯은 열려 있음). */
export function slotUnlocked(a: Pick<AccountSummary, 'rebirths' | 'slots' | 'lifetimeRebirths'> | undefined, slot: number) {
    if (slot < 1 || slot > SLOT_COUNT) return false;
    if (slot === 1) return true;
    if (!a) return false;
    const need = SLOT_UNLOCK[slot - 1];
    const total = a.lifetimeRebirths ?? a.rebirths;
    return slot === 2 ? a.slots.some(x => (x.lifetimeRebirths ?? x.rebirths) >= need) || total >= need : total >= need;
}
export const slotUnlockText = (slot: number) => slot === 2 ? '어느 캐릭터든 환생 1회' : `계정 환생 합계 ${SLOT_UNLOCK[slot - 1]}회`;
const R = ACCOUNT_RULES;
const accountRebirthRank = (s: AccountState) => Math.min(R.rebirthCap, s.account?.rebirths || 0);
/** 경험치·골드 배율(1.05 = ×1.05). expMultiplier·goldMultiplier가 곱합니다. */
export const accountExpGold = (s: AccountState) => 1 + accountRebirthRank(s) * R.rebirthStep;
export const accountAP = (s: AccountState) => Math.min(R.masteredCap, Math.floor((s.account?.mastered || 0) / R.masteredPer));
const accountAbyssRank = (s: AccountState) => Math.min(R.abyssCap, Math.floor((s.account?.abyssBest || 0) / R.abyssPer));
/** 두 공격·최대 체력·최대 마나 배율(1.02 = ×1.02). */
export const accountPower = (s: AccountState) => 1 + accountAbyssRank(s) * R.abyssStep;
const accountSpeciesRank = (s: AccountState) => Math.min(R.speciesCap, Math.floor((s.account?.species || 0) / R.speciesPer));
/** 숙련 획득 배율(1.03 = ×1.03). 연구 ‘끝없는 수련’과 곱합니다. */
export const accountMastery = (s: AccountState) => 1 + accountSpeciesRank(s) * R.speciesStep;
const accountBossRank = (s: AccountState) => Math.min(R.bossCap, Math.floor((s.account?.bossKills || 0) / R.bossPer));
/** 치명타 확률 배율(1.05 = ×1.05). */
export const accountCrit = (s: AccountState) => 1 + accountBossRank(s) * R.bossStep;
/** 환생 화면 계정 보너스 카드의 줄. */
export function accountBonusRows(s: AccountState) {
    const a = s.account, next = (n: number, per: number, cap: number) => Math.floor(n / per) >= cap ? '최대' : `다음 단계까지 ${per - n % per}`;
    const rebirths = a?.rebirths || 0, mastered = a?.mastered || 0, species = a?.species || 0, boss = a?.bossKills || 0, abyss = a?.abyssBest || 0;
    return [
        { name: '계정 환생 합계', value: `${rebirths}회`, effect: `경험치·골드 +${percent(accountExpGold(s) - 1)}`, next: rebirths >= R.rebirthCap ? '최대' : `1회마다 +${percent(R.rebirthStep)} · 최대 ${R.rebirthCap}회` },
        { name: '숙달한 직업(합집합)', value: `${mastered}개`, effect: `장착 AP +${accountAP(s)}`, next: `${R.masteredPer}개마다 +1 · ${next(mastered, R.masteredPer, R.masteredCap)}` },
        { name: '계정 최고 무릉도장 층', value: `${abyss}층`, effect: `두 공격·최대 체력·최대 마나 +${percent(accountPower(s) - 1, 1)}`, next: `${R.abyssPer}층마다 +${percent(R.abyssStep, 1)} · ${next(abyss, R.abyssPer, R.abyssCap)}` },
        { name: '발견한 몬스터(합집합)', value: `${species}종`, effect: `직업·스킬 숙련 획득 +${percent(accountMastery(s) - 1)}`, next: `${R.speciesPer}종마다 +${percent(R.speciesStep)} · ${next(species, R.speciesPer, R.speciesCap)}` },
        { name: '보스 포획 합계', value: `${boss}마리`, effect: `치명타 확률 +${percent(accountCrit(s) - 1)}`, next: `${R.bossPer}마리마다 +${percent(R.bossStep)} · ${next(boss, R.bossPer, R.bossCap)}` },
    ];
}
/**
 * v25.13 계정 공유 금고: 어느 슬롯에서든 세계석·정수를 넣고 꺼냅니다. 정수는 제한 없음.
 * 세계석 인출은 주당 상한(알트 슬롯의 목표 세계석을 본체로 몰아넣는 걸 막음). 입금은 제한 없음.
 */
export const VAULT_PEARL_OUT_WEEKLY = 30;
/** v3.116 금고의 칠흑 장신구 한 칸: 넣은 분신(slot)과 그때의 승천 횟수. 그 분신이 승천하면 사라집니다. */
export type VaultOnyx = { id: string; item: Item; slot: number; ascension: number; at: number };
/** v3.116 금고 칠흑 칸 수 상한. */
export const VAULT_ONYX_CAP = 21;
export type VaultInfo = { pearls: number; essence: number; week: string; pearlOut: number; pearlOutLeft: number; onyx: VaultOnyx[] };
