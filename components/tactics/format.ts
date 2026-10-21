import type { Unit, Line, ItemInstance, WeaponType } from '@/game/srpg/engine/types';
import { UNIT_MAP } from '@/game/srpg/data/units';
import { classDef } from '@/game/srpg/data/classes';
import { itemDef, WEAPON_NAMES } from '@/game/srpg/data/items';
/** 대사 speaker(유닛 id · 이름 · '병사')를 표시 이름으로. */
export const speakerName = (s: string) => UNIT_MAP[s]?.name ?? s;
export const portraitGlyph = (s: string) => { const d = UNIT_MAP[s]; return d ? classDef(d.class_id).glyph : s === '???' ? '?' : s.slice(0, 1); };
export const className = (u: Unit) => classDef(u.classId).name;
export const itemLabel = (it: ItemInstance) => { const d = itemDef(it.id); return `${d.name} ${it.uses}/${d.uses}`; };
export const weaponTypeName = (t: WeaponType) => WEAPON_NAMES[t];
export const lineText = (l: Line) => `${speakerName(l.speaker)}: ${l.text}`;
