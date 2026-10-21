import type { DeployUnit, DeployGroup, Pos, Priority, Stance } from '../../engine/types';
/** 배치 유닛 축약: E(class, level, [x,y], weapon, 옵션). */
export const E = (class_id: string, level: number, pos: Pos, weapon: string, o: Partial<Omit<DeployUnit, 'class_id' | 'level' | 'pos' | 'weapon'>> = {}): DeployUnit => ({ class_id, level, pos, weapon, items: o.items ?? [], name: o.name ?? null, recruitable_as: o.recruitable_as ?? null, drop: o.drop ?? null, stat_bonus: o.stat_bonus ?? null });
/** 그룹 축약. */
export const G = (id: string, role_note: string, stance: Exclude<Stance, 'boss'>, units: DeployUnit[], o: { trigger_range?: number; priority?: Priority[]; flee_targets?: Pos[]; reinforcement?: boolean } = {}): DeployGroup => ({ id, role_note, stance, units, trigger_range: o.trigger_range ?? null, priority: o.priority ?? null, flee_targets: o.flee_targets ?? null, is_reinforcement: o.reinforcement ?? false });
