import { SKILLS } from '../data/skills';
import { ENEMY_SKILLS } from '../data/encounters';
import type { Log } from '../types';

export type CombatFxKind = 'physical' | 'magic' | 'split' | 'stun' | 'bleed' | 'silence' | 'slow' | 'haste' | 'heal' | 'weaken' | 'miss';
export type CombatFxVariant = 'harpoon' | 'wave' | 'arcane' | 'lightning' | 'impact';
export type CombatFx = {
    id: number; actor: 'player' | 'enemy'; target: 'player' | 'enemy';
    title: string; kind: CombatFxKind; variant: CombatFxVariant;
    basic: boolean; critical: boolean; healing: number; drained: number; status: string;
    damageType: 'physical' | 'magic' | 'split'; dot?: { name: string; value: number };
    hits: { value: number; critical: boolean; miss: boolean }[];
    delay: number;
};

const STATUS_NAMES: Record<string, string> = { stun: '기절', silence: '침묵', bleed: '출혈', weaken: '약화', slow: '감속', haste: '가속' };
const variantOf = (id: string | undefined, magical: boolean): CombatFxVariant => id && /electric|thunder|storm|spark/i.test(id) ? 'lightning' : id && /wave|tide|splash|spring|current|maelstrom/i.test(id) ? 'wave' : magical ? 'arcane' : id && /hook|pierce|hunt|lance|bore|razor/i.test(id) ? 'harpoon' : 'impact';
/** 구조화된 전투 결과(log.event)를 우선 사용하고, 이전 세이브의 문자열 로그만 텍스트로 해석합니다. */
export function combatFxFromLog(log: Log, playerName: string): CombatFx | null {
    if (log.type !== 'battle') return null;
    const ev = log.event;
    if (ev) {
        const actor = ev.actor === playerName ? 'player' : 'enemy', target = actor === 'player' ? 'enemy' : 'player';
        if (ev.stunned || ev.defeated) return { id: log.id, actor, target: actor, title: ev.stunned ? '기절' : '쓰러짐', kind: 'stun', variant: 'impact', basic: false, critical: false, healing: 0, drained: 0, status: ev.stunned ? '행동 불가' : '', hits: [], delay: 0, damageType: 'physical', dot: ev.dot };
        const missed = ev.hits.length > 0 && ev.hits.every(h => h.miss);
        const status = ev.statuses.find(x => !x.onSelf) || ev.statuses[0];
        const kind: CombatFxKind = missed ? 'miss' : status ? status.id === 'bleed' ? 'bleed' : status.id as CombatFxKind : ev.damageType;
        return { id: log.id, actor, target, title: ev.skillName, kind, variant: variantOf(ev.skillId, ev.damageType !== 'physical'), basic: !ev.skillId, critical: ev.hits.some(h => h.critical), healing: ev.healed, drained: ev.drained, status: status ? STATUS_NAMES[status.id] || '' : '', hits: ev.hits.map(h => ({ value: h.value, critical: h.critical, miss: h.miss })), delay: 0, damageType: ev.damageType, dot: ev.dot };
    }
    const text = log.text;
    const actor = text.startsWith(`${playerName} ·`) || text.startsWith(`${playerName}:`) ? 'player' : 'enemy';
    const target = actor === 'player' ? 'enemy' : 'player';
    if (text.includes(': 기절로 행동 불가')) return { id: log.id, actor, target: actor, title: '기절', kind: 'stun', variant: 'impact', basic: false, critical: false, healing: 0, drained: 0, status: '행동 불가', hits: [], delay: 0, damageType: 'physical' };
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
    return { id: log.id, actor, target, title: label, kind, variant, basic: !skill, critical, healing, drained: 0, status: effect ? statuses[effect] || '' : '', hits, delay: 0, damageType: magical ? 'magic' : 'physical' };
}

/** Bound live replay so returning after hours offline never queues thousands of effects. */
export function combatFxBatch(logs: Log[], afterId: number, playerName: string): CombatFx[] {
    return logs.filter(log => log.id > afterId).map(log => combatFxFromLog(log, playerName)).filter((fx): fx is CombatFx => !!fx).slice(-6).map((fx, index) => ({ ...fx, delay: index * 260 }));
}
