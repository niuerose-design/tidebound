import { GEAR_SETS, ARMOR_NAMES, ACCESSORY_NAMES, CAPE_NAMES } from './maple-gear';
/** 장비 도감에 쓰는 등급별 이름. v27.46 메이플 장비: 무기는 공격 계열마다 이름이 달라 세트 이름으로 묶어 보여 줍니다(실제 이름은 maple-gear.ts gearName). */
export const EQUIPMENT_NAMES: Record<'rod' | 'coat' | 'charm' | 'cape', readonly string[]> = { rod: GEAR_SETS.map(x => `${x} 무기`), coat: ARMOR_NAMES, charm: ACCESSORY_NAMES, cape: CAPE_NAMES };
