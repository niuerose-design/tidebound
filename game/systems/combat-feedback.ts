import { SKILLS } from '../data/skills';
import { ENEMY_SKILLS } from '../data/encounters';
import { BALANCE } from '../data/balance';
import type { Enemy, Log, State, StatusEffects } from '../types';

export type CombatFxKind = 'physical' | 'magic' | 'split' | 'stun' | 'bleed' | 'silence' | 'slow' | 'haste' | 'heal' | 'weaken' | 'miss';
export type CombatFxVariant = 'harpoon' | 'wave' | 'arcane' | 'lightning' | 'impact';
export type CombatFx = {
    id: number; actor: 'player' | 'enemy'; target: 'player' | 'enemy';
    title: string; kind: CombatFxKind; variant: CombatFxVariant;
    basic: boolean; critical: boolean; healing: number; drained: number; status: string;
    damageType: 'physical' | 'magic' | 'split'; dot?: { name: string; value: number };
    /** v25 無로 버틴 쪽(self면 행동한 쪽 자신). */
    endured?: { heal: number; self?: boolean };
    hits: { value: number; critical: boolean; miss: boolean }[];
    delay: number;
    /** 연속 행동 번호(2 이상일 때만). */
    chain?: number;
    /** v25 天 · 일곱 인 해방. 화면 전체 연출을 띄웁니다. */
    finale?: boolean;
};

export const STATUS_NAMES: Record<string, string> = { stun: '기절', silence: '침묵', bleed: '출혈', weaken: '약화', slow: '감속', haste: '가속' };
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
        return { id: log.id, actor, target, title: ev.finale ? '天 · 일곱 인 해방' : ev.skillName, kind, variant: ev.finale ? 'lightning' : variantOf(ev.skillId, ev.damageType !== 'physical'), basic: !ev.skillId, critical: !!ev.finale || ev.hits.some(h => h.critical), healing: ev.healed, drained: ev.drained, status: status ? STATUS_NAMES[status.id] || '' : '', hits: ev.hits.map(h => ({ value: h.value, critical: h.critical, miss: h.miss })), delay: 0, damageType: ev.damageType, dot: ev.dot, ...(ev.chain ? { chain: ev.chain } : {}), ...(ev.endured ? { endured: ev.endured } : {}), ...(ev.finale ? { finale: true } : {}) };
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

/** 한 턴 안에서 타격 사이 간격(ms). 연출·HP 바·로그 줄이 모두 이 간격을 따릅니다. */
export const FX_BEAT_MS = 260;
const FX_LIMIT = 6;
const pendingFx = (logs: Log[], afterId: number, playerName: string) => logs.filter(log => log.id > afterId).map(log => combatFxFromLog(log, playerName)).filter((fx): fx is CombatFx => !!fx);
/** Bound live replay so returning after hours offline never queues thousands of effects. */
export function combatFxBatch(logs: Log[], afterId: number, playerName: string): CombatFx[] {
    return pendingFx(logs, afterId, playerName).slice(-FX_LIMIT).map((fx, index) => ({ ...fx, delay: index * FX_BEAT_MS }));
}
/** combatFxBatch가 최근 6개만 남기면서 잘라 낸 타격 수(‘×N 연속’ 카운터). */
export function combatFxSkipped(logs: Log[], afterId: number, playerName: string): number {
    return Math.max(0, pendingFx(logs, afterId, playerName).length - FX_LIMIT);
}

// ── 전투 화면 재생 (표시 전용) ──
// 동기화로 받은 두 상태(prev → next) 사이의 전투 로그를 턴으로 묶고, 타격마다 보여 줄 HP·MP·적·로그 위치를 계산합니다.
// 서버 계산을 흉내 내지 않고 로그의 실제 피해·회복 값만 되짚으므로, 배치의 마지막 프레임은 항상 next와 같습니다.
const RECOVERED = '숨을 고르고 다시 낚싯대를 들었습니다.';
const LOST = '물고기를 놓쳤습니다. 잠시 회복합니다.';
const CAUGHT = /^(.+?)(?: 무리 ×\d+)? 포획 · \+\d/;

export type ReplayFrame = {
    /** 턴 시작 뒤 이 프레임을 보여 줄 시각(ms). */
    offset: number;
    hp: number; mana: number; recovery: number;
    enemy: Enemy | null; effects: StatusEffects; playerStun: number;
    /** 이 프레임까지 드러낼 마지막 로그 id. */
    lastLogId: number;
};
/** turn: prev.lastTick 뒤 몇 번째 턴인지(1부터). */
export type ReplayTurn = { turn: number; frames: ReplayFrame[] };

/**
 * 로그를 턴 단위로 묶습니다. 한 턴은 먼저 행동한 쪽의 타격(연속 행동 포함)과 나중 쪽의 타격, 그 뒤의 보상·패배 줄, 또는 회복 완료 한 줄입니다.
 * 연속 번호(event.chain)가 2 이상인 타격은 앞 타격과 같은 턴이고, 1번째 행동은 아직 행동하지 않은 상대의 것이며 바로 앞이 타격일 때만 같은 턴입니다.
 */
export function groupReplayTurns(logs: Log[]): Log[][] {
    const turns: Log[][] = [];
    for (const log of logs) {
        const cur = turns.at(-1);
        const leads = cur ? cur.filter(l => l.type === 'battle' && (l.event?.chain ?? 1) === 1) : [];
        const follows = !!cur && cur.at(-1)!.type === 'battle' && ((log.event?.chain ?? 1) > 1 || (log.event?.multicast?.index || 0) > 0)
            || leads.length === 1 && cur!.at(-1)!.type === 'battle' && (!log.event || !leads[0].event || log.event.actor !== leads[0].event.actor);
        const starts = !cur || (log.type === 'battle' ? !follows : log.text === RECOVERED);
        if (starts) turns.push([log]);
        else cur!.push(log);
    }
    return turns;
}

/** 각 로그 묶음이 몇 번째 턴에 일어났는지. 회복 대기 턴은 로그가 없으므로 회복 카운트로 자리를 잡고, 어긋나면 마지막 턴들에 붙입니다. */
function placeTurns(groups: Log[][], count: number, recovery: number): number[] | null {
    if (groups.length > count) return null;
    const at: number[] = [];
    let r = recovery, g = 0;
    for (let k = 1; k <= count && g < groups.length; k++) {
        if (r > 0) {
            r--;
            if (r === 0 && groups[g][0].text === RECOVERED) at[g++] = k;
            continue;
        }
        if (groups[g].some(l => l.text === LOST)) r = BALANCE.recoveryTurns;
        at[g++] = k;
    }
    return g === groups.length ? at : groups.map((_, i) => count - groups.length + 1 + i);
}

/** 한 턴의 타격 간격. 연속 행동으로 타격이 많으면 다음 턴 전에 끝나도록 좁힙니다. */
const beatMs = (beats: number) => beats > 1 ? Math.min(FX_BEAT_MS, Math.floor(BALANCE.turnMs * .8 / (beats - 1))) : FX_BEAT_MS;
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
type Beat = { turn: number; index: number; beatMs: number; logs: Log[]; side: 'player' | 'enemy' | null; player: number; foe: number; kill: boolean; lost: boolean; recovered: boolean; name?: string };

/** prev → next 사이 턴별 재생 프레임. 재생할 수 없으면(세이브 교체·로그 누락 등) null. */
export function buildCombatReplay(prev: State, next: State, maxHp: number, maxMana: number): ReplayTurn[] | null {
    const count = Math.round((next.lastTick - prev.lastTick) / BALANCE.turnMs);
    const prevLast = prev.logs.at(-1)?.id ?? 0;
    const fresh = next.logs.filter(l => l.id > prevLast);
    if (count < 0 || next.logId < prev.logId || next.logId - prevLast !== fresh.length) return null;
    if (count === 0) return fresh.length ? null : [];
    const groups = groupReplayTurns(fresh), at = placeTurns(groups, count, prev.recovery);
    if (!at) return null;
    // 타격 하나가 한 박자. 보상·패배·회복 줄은 그 턴의 마지막 박자에 함께 드러냅니다.
    const beats: Beat[] = [];
    groups.forEach((group, g) => {
        const strikes = group.filter(l => l.type === 'battle');
        const units = strikes.length ? strikes.map((log, i) => i === strikes.length - 1 ? group.slice(group.indexOf(log)) : [log]) : [group];
        if (strikes.length && group.indexOf(strikes[0]) > 0) units[0] = [...group.slice(0, group.indexOf(strikes[0])), ...units[0]];
        const caught = group.map(l => l.type === 'reward' ? CAUGHT.exec(l.text)?.[1] : undefined).find(Boolean);
        units.forEach((logs, i) => {
            const ev = logs.find(l => l.type === 'battle')?.event;
            const side = ev ? ev.actor === next.name ? 'player' : 'enemy' : null;
            const dealt = ev ? ev.hits.reduce((n, h) => n + (h.miss ? 0 : h.value), 0) : 0;
            const self = ev ? ev.healed + ev.drained + (ev.regen || 0) - (ev.dot?.value || 0) - (ev.reflected || 0) : 0;
            const last = i === units.length - 1;
            beats.push({ turn: at[g], index: i, beatMs: beatMs(units.length), logs, side, player: side === 'player' ? self : side === 'enemy' ? -dealt : 0, foe: side === 'enemy' ? self : side === 'player' ? -dealt : 0, kill: last && !!caught, lost: last && group.some(l => l.text === LOST), recovered: group[0].text === RECOVERED, name: caught });
        });
    });
    // 플레이어 HP: 마지막 불연속(포획 회복·레벨업·패배·회복 완료) 뒤는 next에서 거꾸로, 그 앞은 prev에서 앞으로 계산합니다.
    const hp: number[] = [];
    let cut = -1;
    for (let b = beats.length - 1, v = next.hp; b >= 0; b--) {
        if (beats[b].kill || beats[b].lost || beats[b].recovered) { cut = b; break; }
        hp[b] = v;
        v = clamp(v - beats[b].player, maxHp);
    }
    for (let b = 0, v = prev.hp; b <= cut; b++) {
        v = beats[b].recovered ? maxHp : beats[b].lost ? 0 : clamp(v + beats[b].player, maxHp);
        hp[b] = v;
    }
    // MP: 로그에 값이 없으므로 내 행동 박자마다 prev → next를 고르게 나눕니다(회복 완료 시 가득 참).
    const mana: number[] = [];
    const refill = beats.findLastIndex(b => b.recovered);
    const acts = beats.filter((b, i) => i > refill && b.side === 'player').length;
    for (let b = 0, done = 0, from = refill >= 0 ? maxMana : prev.mana; b < beats.length; b++) {
        if (b < refill) mana[b] = prev.mana;
        else if (b === refill) mana[b] = maxMana;
        else {
            if (beats[b].side === 'player') done++;
            mana[b] = acts ? from + (next.mana - from) * done / acts : from;
        }
    }
    // 적: 포획·패배로 나뉜 구간마다. 마지막까지 살아 있는 적은 next에서 거꾸로, 처음 적은 prev에서 앞으로, 그 사이는 0에서 거꾸로 셉니다.
    const foes: (Enemy | null)[] = [];
    for (let start = 0; start < beats.length;) {
        while (start < beats.length && !beats[start].side) { foes[start] = null; start++; }
        if (start >= beats.length) break;
        let end = start;
        while (end < beats.length - 1 && !beats[end].kill && !beats[end].lost) end++;
        const first = !foes.slice(0, start).some(Boolean) && !beats.slice(0, start).some(b => b.kill || b.lost);
        const closing = !beats[end].kill && !beats[end].lost && next.enemy;
        const opening = first && prev.enemy;
        const template: Enemy = closing ? next.enemy! : opening ? prev.enemy! : { ...(next.enemy || prev.enemy || { id: '', attack: 0, defense: 0, exp: 0, gold: 0, boss: false }), name: beats[end].name || next.enemy?.name || prev.enemy?.name || '', hp: 0, maxHp: 1, stun: 0, effects: {}, cooldowns: {} };
        const values: number[] = [];
        if (closing || !opening) {
            let v = closing ? next.enemy!.hp : 0;
            for (let b = end; b >= start; b--) { values[b] = v; v -= beats[b].foe; }
            if (!closing && !opening) template.maxHp = Math.max(1, v);
        } else {
            let v = prev.enemy!.hp;
            for (let b = start; b <= end; b++) values[b] = v = beats[b].kill ? 0 : clamp(v + beats[b].foe, template.maxHp);
        }
        for (let b = start; b <= end; b++) foes[b] = { ...template, hp: clamp(values[b], template.maxHp) };
        start = end + 1;
    }
    // 턴별 프레임: 로그가 없는 턴(회복 대기)도 카운트다운을 위해 한 프레임씩 둡니다.
    const turns: ReplayTurn[] = [];
    let frame: ReplayFrame = { offset: 0, hp: prev.hp, mana: prev.mana, recovery: prev.recovery, enemy: prev.enemy, effects: prev.effects, playerStun: prev.playerStun, lastLogId: prevLast };
    let b = 0, r = prev.recovery, fallen = false;
    for (let k = 1; k <= count; k++) {
        const frames: ReplayFrame[] = [];
        if (b < beats.length && beats[b].turn === k) {
            for (; b < beats.length && beats[b].turn === k; b++) {
                const beat = beats[b];
                if (beat.recovered) r = 0;
                if (beat.lost) r = BALANCE.recoveryTurns;
                const enemy = beat.side ? foes[b] : fallen ? null : frame.enemy;
                frame = { ...frame, offset: beat.index * beat.beatMs, hp: hp[b], mana: mana[b], recovery: r, enemy, lastLogId: beat.logs.at(-1)!.id };
                frames.push(frame);
                fallen = beat.kill || beat.lost;
            }
        } else {
            if (r > 0) r--;
            frame = { ...frame, offset: 0, recovery: r, enemy: fallen ? null : frame.enemy };
            frames.push(frame);
        }
        if (k === count) {
            const dead = fallen && frames.at(-1)!.enemy && beats.at(-1)?.turn === k && beats.at(-1)!.kill ? frames.at(-1)!.enemy : null;
            frames[frames.length - 1] = { ...frames.at(-1)!, hp: next.hp, mana: next.mana, recovery: next.recovery, enemy: next.enemy || dead, effects: next.effects, playerStun: next.playerStun, lastLogId: next.logs.at(-1)?.id ?? prevLast };
        }
        turns.push({ turn: k, frames });
    }
    return turns;
}
