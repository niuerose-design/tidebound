/**
 * 전기 모드 세이브(캠페인). 전투 밖의 모든 상태: 모드, 진행 챕터, 로스터, 창고, 골드, 클리어 기록.
 * 모든 함수는 새 객체를 돌려줍니다(저장은 UI가 localStorage에).
 */
import type { Mode, Unit, ItemInstance, Battle, ChapterDef, Stats } from '../engine/types';
import { UNITS, UNIT_MAP } from '../data/units';
import { createPlayerUnit, canPromote, promote, canWield, autoEquip, addStats, clampStats } from '../engine/unit';
import { itemDef } from '../data/items';
import { classDef } from '../data/classes';
import { battleOutcome, clone } from '../engine/battle';
import { CHAPTERS } from '../data/chapters/index';
export const SAVE_VERSION = 1;
export const MAX_ITEMS = 5;
export interface ClearRecord { turns: number; mode: Mode; fallen: string[]; at: number }
export interface Campaign {
    version: number;
    mode: Mode;
    seed: number;
    /** 다음에 플레이할 챕터 번호(1부터). 마지막 챕터를 깨면 CHAPTERS.length + 1. */
    chapter: number;
    roster: Unit[];
    convoy: ItemInstance[];
    gold: number;
    cleared: Record<string, ClearRecord>;
    /** 유닛·아이템 고유 번호. */
    seq: { uid: number; item: number };
    /** 합류 대사 등 베이스 화면에서 한 번 보여 줄 알림. */
    notices: string[];
    /** 전체 플레이 턴 수(기록). */
    totalTurns: number;
    startedAt: number;
}
export const isComplete = (c: Campaign) => c.chapter > CHAPTERS.length;
export const currentChapter = (c: Campaign): ChapterDef | undefined => CHAPTERS.find(ch => ch.number === c.chapter);
const newItem = (c: Campaign, id: string): ItemInstance => ({ id, uses: itemDef(id).uses, n: c.seq.item++ });
export function newCampaign(mode: Mode, seed: number): Campaign {
    const c: Campaign = { version: SAVE_VERSION, mode, seed, chapter: 1, roster: [], convoy: [], gold: 1500, cleared: {}, seq: { uid: 1, item: 1 }, notices: [], totalTurns: 0, startedAt: Date.now() };
    for (const id of ['vulnerary', 'vulnerary']) c.convoy.push(newItem(c, id));
    return joinAutoUnits(c);
}
/** 이번 챕터에 자동 합류하는 유닛을 로스터에 넣습니다(이미 있으면 건너뜀). */
export function joinAutoUnits(c0: Campaign): Campaign {
    const c = clone(c0);
    for (const def of UNITS) {
        if (def.join_chapter !== c.chapter || def.recruit.method !== 'auto') continue;
        if (c.roster.some(u => u.defId === def.id)) continue;
        const u = createPlayerUnit(def, c.seq);
        c.roster.push(u);
        c.notices.push(`${def.name} 합류 — "${def.lines.join}"`);
    }
    return c;
}
export const aliveRoster = (c: Campaign) => c.roster.filter(u => u.status !== 'dead');
export const lordUnit = (c: Campaign) => c.roster.find(u => u.defId && UNIT_MAP[u.defId]?.role === 'lord');
/** 출격 가능한 유닛(사망 제외. 후퇴한 유닛은 다음 챕터에 복귀). */
export const deployable = (c: Campaign) => c.roster.filter(u => u.status !== 'dead');
/** 전투 결과 반영 → 다음 챕터. */
export function applyVictory(c0: Campaign, b: Battle, ch: ChapterDef): Campaign {
    const c = clone(c0);
    const out = battleOutcome(b, ch);
    for (const bu of out.units) {
        const i = c.roster.findIndex(u => u.uid === bu.uid);
        const u: Unit = { ...bu, status: bu.status === 'retreated' ? 'alive' : bu.status };
        if (u.status === 'dead') {
            // 클래식: 쓰러진 유닛의 장비는 창고로 돌려줍니다.
            for (const it of u.items) c.convoy.push(it);
            u.items = []; u.equipped = -1;
        }
        if (i >= 0) c.roster[i] = u; else c.roster.push(u);
    }
    for (const id of out.recruited) { const def = UNIT_MAP[id]; if (def && !c.roster.some(u => u.defId === id)) { c.roster.push(createPlayerUnit(def, c.seq)); } if (def) c.notices.push(`${def.name} 합류 — "${def.lines.join}"`); }
    for (const id of out.loot) c.convoy.push(newItem(c, id));
    c.gold += out.gold;
    c.cleared[ch.id] = { turns: b.turn, mode: c.mode, fallen: out.fallen.map(u => u.name), at: Date.now() };
    c.totalTurns += b.turn;
    c.notices.push(`${ch.number}장 클리어 — ${b.turn}턴, 보상 ${out.gold}골드`);
    if (ch.number === c.chapter) c.chapter += 1;
    // 후퇴 유닛 복귀(캐주얼).
    for (const u of c.roster) if (u.status === 'retreated') u.status = 'alive';
    return isComplete(c) ? c : joinAutoUnits(c);
}
/** 상점 구매: 창고로. */
export function buy(c0: Campaign, itemId: string): Campaign {
    const c = clone(c0);
    const d = itemDef(itemId);
    if (!d.shop) throw Error('팔지 않는 물건');
    if (c.gold < d.price) throw Error('골드가 모자라다');
    c.gold -= d.price;
    c.convoy.push(newItem(c, itemId));
    return c;
}
export const sellPrice = (it: ItemInstance) => { const d = itemDef(it.id); return Math.floor(d.price / 2 * it.uses / d.uses); };
export function sell(c0: Campaign, n: number): Campaign {
    const c = clone(c0);
    const i = c.convoy.findIndex(it => it.n === n);
    if (i < 0) throw Error('창고에 없는 물건');
    c.gold += sellPrice(c.convoy[i]);
    c.convoy.splice(i, 1);
    return c;
}
/** 창고 → 유닛. */
export function giveItem(c0: Campaign, uid: string, n: number): Campaign {
    const c = clone(c0);
    const u = c.roster.find(x => x.uid === uid)!;
    if (u.items.length >= MAX_ITEMS) throw Error('소지품이 가득 찼다(5개)');
    const i = c.convoy.findIndex(it => it.n === n);
    if (i < 0) throw Error('창고에 없는 물건');
    u.items.push(c.convoy.splice(i, 1)[0]);
    autoEquip(u);
    return c;
}
/** 유닛 → 창고. */
export function storeItem(c0: Campaign, uid: string, index: number): Campaign {
    const c = clone(c0);
    const u = c.roster.find(x => x.uid === uid)!;
    const [it] = u.items.splice(index, 1);
    if (!it) throw Error('없는 물건');
    c.convoy.push(it);
    if (u.equipped === index) u.equipped = -1; else if (u.equipped > index) u.equipped--;
    autoEquip(u);
    return c;
}
export function equipItem(c0: Campaign, uid: string, index: number): Campaign {
    const c = clone(c0);
    const u = c.roster.find(x => x.uid === uid)!;
    if (!canWield(classDef(u.classId), itemDef(u.items[index].id))) throw Error('들 수 없는 무기');
    u.equipped = index;
    return c;
}
/** 유닛 간 교환(베이스). */
export function moveItem(c0: Campaign, fromUid: string, index: number, toUid: string): Campaign {
    const c = clone(c0);
    const a = c.roster.find(x => x.uid === fromUid)!, b = c.roster.find(x => x.uid === toUid)!;
    if (b.items.length >= MAX_ITEMS) throw Error('상대의 소지품이 가득 찼다');
    const [it] = a.items.splice(index, 1);
    b.items.push(it);
    if (a.equipped === index) a.equipped = -1; else if (a.equipped > index) a.equipped--;
    autoEquip(a); autoEquip(b);
    return c;
}
/** 베이스에서 소비 아이템(승급 · 강화) 사용. 창고의 아이템을 유닛에게 씁니다. */
export function applyConvoyItem(c0: Campaign, uid: string, n: number, toClassId?: string): Campaign {
    const c = clone(c0);
    const u = c.roster.find(x => x.uid === uid)!;
    const i = c.convoy.findIndex(it => it.n === n);
    if (i < 0) throw Error('창고에 없는 물건');
    const d = itemDef(c.convoy[i].id);
    if (d.kind === 'promote') {
        if (!canPromote(u)) throw Error('승급 조건: 기본 클래스 10레벨 이상');
        const to = toClassId ?? classDef(u.classId).promotes_to[0];
        const bonus = promote(u, to);
        c.notices.push(`${u.name}이(가) ${classDef(to).name}(으)로 승급 — ${Object.entries(bonus).map(([k, v]) => `${k} +${v}`).join(', ')}`);
    } else if (d.kind === 'boost') {
        u.stats = clampStats(addStats(u.stats, d.boost!), { ...classDef(u.classId).caps, hp: 80 });
        c.notices.push(`${u.name}이(가) ${d.name}을(를) 썼다.`);
    } else throw Error('베이스에서 쓸 수 없는 물건');
    c.convoy.splice(i, 1);
    return c;
}
export const unitPower = (u: Unit) => Object.values(u.stats).reduce((a, b) => a + b, 0);
export const statsOf = (u: Unit): Stats => u.stats;
