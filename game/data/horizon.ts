/**
 * v3.469 수평 상점(docs/balance-rebirth.md 15.2 C): 전투력이 오르지 않는 편의 · 치장을 세계석으로 삽니다. 산 것은 환생 · 승천을 넘어 남습니다(State.horizon).
 * 환생 200회부터 세계석 연구가 잠긴 뒤에도 세계석을 쓸 곳입니다. 전투력이 오르는 물건은 두지 않습니다.
 */
import type { State } from '../types';

export type HorizonKind = 'slot' | 'title' | 'skin';
export type HorizonItem = { id: string; name: string; desc: string; cost: number; max: number; kind: HorizonKind };
/** 편성 저장 칸: 기본 셋, 상점에서 셋까지 더. */
export const PRESET_BASE = 3;
export const HORIZON_ITEMS: HorizonItem[] = [
    { id: 'presetSlot', kind: 'slot', name: '편성 칸', desc: '스킬 편성 저장 칸을 하나 늘립니다. 셋까지 살 수 있습니다.', cost: 600, max: 3 },
    { id: 'skin:aurora', kind: 'skin', name: '유닛 피부 · 오로라', desc: '원정대의 내 유닛에 오로라 빛을 두릅니다. 능력치는 없습니다.', cost: 1500, max: 1 },
    { id: 'title:pearlPatron', kind: 'title', name: '칭호 · 세계석 후원자', desc: '🪙 세계석 후원자. 능력치 화면의 칭호에서 장착합니다.', cost: 1000, max: 1 },
    { id: 'title:horizonWalker', kind: 'title', name: '칭호 · 수평선을 걷는 자', desc: '🌅 수평선을 걷는 자. 능력치 화면의 칭호에서 장착합니다.', cost: 2500, max: 1 },
    { id: 'title:skyNeighbor', kind: 'title', name: '칭호 · 하늘과 이웃한 자', desc: '🪽 하늘과 이웃한 자. 능력치 화면의 칭호에서 장착합니다.', cost: 5000, max: 1 },
];
export const horizonItemById = (id: string) => HORIZON_ITEMS.find(x => x.id === id);
export type Horizon = { bought: Record<string, number> };
type HorizonState = Pick<State, 'horizon'>;
export const horizonCount = (s: HorizonState, id: string) => s.horizon?.bought?.[id] || 0;
export const horizonOwns = (s: HorizonState, id: string) => horizonCount(s, id) > 0;
/** 쓸 수 있는 편성 칸 id('1'부터). */
export const presetSlots = (s: HorizonState) => Array.from({ length: PRESET_BASE + horizonCount(s, 'presetSlot') }, (_, i) => String(i + 1));
/** 산 것의 세계석 합계(기록용). */
export const horizonSpent = (s: HorizonState) => Object.entries(s.horizon?.bought || {}).reduce((sum, [id, n]) => sum + (horizonItemById(id)?.cost || 0) * n, 0);
