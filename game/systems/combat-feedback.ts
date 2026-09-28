import { SKILLS } from '../data/skills';
import { ENEMY_SKILLS } from '../data/encounters';
import type { Log } from '../types';

export type CombatFxKind = 'physical' | 'magic' | 'stun' | 'bleed' | 'silence' | 'slow' | 'haste' | 'heal' | 'weaken' | 'miss';
export type CombatFxVariant = 'harpoon' | 'wave' | 'arcane' | 'lightning' | 'impact';
export type CombatFx = {
    id: number; actor: 'player' | 'enemy'; target: 'player' | 'enemy';
    title: string; kind: CombatFxKind; variant: CombatFxVariant;
    basic: boolean; critical: boolean; healing: number; status: string;
    hits: { value: number; critical: boolean; miss: boolean }[];
    delay: number;
};

/** Compatibility adapter for the text combat logs already present in saved games. */
export function combatFxFromLog(log: Log, playerName: string): CombatFx | null {
    if (log.type !== 'battle') return null;
    const text = log.text;
    const actor = text.startsWith(`${playerName} ·`) || text.startsWith(`${playerName}:`) ? 'player' : 'enemy';
    const target = actor === 'player' ? 'enemy' : 'player';
    if (text.includes(': 기절로 행동 불가')) return { id: log.id, actor, target: actor, title: '기절', kind: 'stun', variant: 'impact', basic: false, critical: false, healing: 0, status: '행동 불가', hits: [], delay: 0 };
    const arrow = text.indexOf(' → ');
    if (arrow < 0) return null;
    const header = text.slice(0, arrow), detail = text.slice(arrow + 3).trim();
    const label = header.slice(header.indexOf(' · ') + 3).replace(/ \[치명타\]$/, '');
    const pool = actor === 'enemy' ? [...ENEMY_SKILLS, ...SKILLS] : [...SKILLS, ...ENEMY_SKILLS];
    const skill = pool.find(sk => sk.name === label);
    if (!skill && label !== '기본 공격') return null;
    const missed = detail.startsWith('빗나감'), magical = detail.includes('마법 피해');
    const total = Number(detail.match(/^(\d+) (?:마법|물리) 피해/)?.[1] || 0);
    const follows = [...detail.matchAll(/ · 추가타 (\d+)( \[치명타\])?( 빗나감)?/g)].map(match => ({ value: match[3] ? 0 : Number(match[1]), critical: !!match[2], miss: !!match[3] }));
    const critical = header.endsWith('[치명타]');
    const mainMissed = missed || detail.includes('본타 빗나감');
    const hits = [{ value: mainMissed ? 0 : Math.max(0, total - follows.reduce((n, hit) => n + hit.value, 0)), critical, miss: mainMissed }, ...follows];
    const healing = Number(detail.match(/(?:^| · )(\d+) 회복/)?.[1] || 0);
    const effect = !mainMissed ? skill?.effect : undefined;
    const kind: CombatFxKind = missed ? 'miss' : effect && !['heal', 'drain'].includes(effect) ? effect as CombatFxKind : magical ? 'magic' : 'physical';
    const variant: CombatFxVariant = skill && /electric|thunder|storm|spark/i.test(skill.id) ? 'lightning' : skill && /wave|tide|splash|spring|current|maelstrom/i.test(skill.id) ? 'wave' : magical ? 'arcane' : skill && /hook|pierce|hunt|lance|bore|razor/i.test(skill.id) ? 'harpoon' : 'impact';
    const statuses: Record<string, string> = { stun: '기절', silence: '침묵', bleed: '출혈', weaken: '약화', slow: '감속', haste: '가속' };
    return { id: log.id, actor, target, title: label, kind, variant, basic: !skill, critical, healing, status: effect ? statuses[effect] || '' : '', hits, delay: 0 };
}

/** Bound live replay so returning after hours offline never queues thousands of effects. */
export function combatFxBatch(logs: Log[], afterId: number, playerName: string): CombatFx[] {
    return logs.filter(log => log.id > afterId).map(log => combatFxFromLog(log, playerName)).filter((fx): fx is CombatFx => !!fx).slice(-6).map((fx, index) => ({ ...fx, delay: index * 260 }));
}
