/**
 * 전투 상태 전이. 모든 함수는 주어진 Battle을 직접 바꾸지 않고 복제본을 돌려줍니다(되감기 · 스냅샷이 단순해짐).
 * 플레이어 행동: move → (attack | heal | talk | visit | open | seize | escape | item | wait).
 */
import type { Battle, BattleUnit, ChapterDef, DeploymentDef, DeployUnit, Line, Mode, Pos, Unit, CombatResult, Stats, Reinforcement } from './types';
import { createEnemyUnit, toBattleUnit, canWield, autoEquip } from './unit';
import { moveRange, pathTo, cellsInRange, key, unkey, hostile, occupancy } from './grid';
import { terrainAt, setTile, manhattan, canStand } from './terrain';
import { unitById, unitAt, attackRange, staffRange, resolveCombat, resolveHeal, forecast, applyExp } from './combat';
import { classDef } from '../data/classes';
import { itemDef } from '../data/items';
import { UNIT_MAP } from '../data/units';
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const REWINDS: Record<Mode, number> = { casual: 5, classic: 3 };
const EDGE_ESCAPE_TURNS = 99;
/** 적 배치 한 명을 전투 유닛으로. */
function spawnEnemy(b: Battle, d: DeployUnit, pos: Pos, group: { id: string; stance: BattleUnit['stance']; priority: BattleUnit['priority']; fleeTargets: BattleUnit['fleeTargets'] } | null, boss = false): BattleUnit {
    const seq = { uid: b.uidSeq, item: b.itemSeq };
    const cls = classDef(d.class_id);
    const u = createEnemyUnit(d.class_id, d.level, d.name ?? cls.name, d.weapon, d.items ?? [], seq, 'enemy', d.stat_bonus ?? null);
    b.uidSeq = seq.uid; b.itemSeq = seq.item;
    const bu = toBattleUnit(u, pos[0], pos[1], { groupId: group?.id ?? null, stance: group?.stance ?? 'hold', priority: group?.priority ?? null, fleeTargets: group?.fleeTargets ?? null, boss, drop: d.drop ?? null, recruitableAs: d.recruitable_as ?? null });
    b.units.push(bu);
    return bu;
}
/** 전투 시작. roster: 출격 유닛(스폰 순서대로 배치), 아군 NPC는 배치 정의에서. */
export function startBattle(ch: ChapterDef, dep: DeploymentDef, roster: Unit[], spawns: Pos[], mode: Mode, seed: number): Battle {
    const b: Battle = { chapterId: ch.id, mode, seed, rng: seed >>> 0, turn: 1, phase: 'player', units: [], tiles: [...ch.map.tiles], status: 'playing', rewindsLeft: REWINDS[mode], log: [], used: [], spawned: [], triggered: [], firedMid: [], recruited: [], loot: [], gold: 0, bossMet: false, fallen: [], escaped: [], uidSeq: 1, itemSeq: 1000, pending: [], pendingNotice: null, lastCombat: null };
    roster.forEach((u, i) => { const p = spawns[i]; autoEquip(u); b.units.push(toBattleUnit(u, p[0], p[1])); });
    for (const g of dep.groups) {
        if (g.is_reinforcement) continue;
        for (const du of g.units) spawnEnemy(b, du, du.pos, { id: g.id, stance: g.stance, priority: g.priority, fleeTargets: g.flee_targets });
    }
    if (dep.boss) spawnEnemy(b, dep.boss, dep.boss.pos, { id: 'boss', stance: dep.boss.stance, priority: null, fleeTargets: null }, true);
    for (const a of dep.allies ?? []) {
        const seq = { uid: b.uidSeq, item: b.itemSeq };
        const u = createEnemyUnit(a.class_id, a.level, a.name ?? classDef(a.class_id).name, a.weapon, a.items ?? [], seq, 'ally');
        b.uidSeq = seq.uid; b.itemSeq = seq.item;
        b.units.push(toBattleUnit(u, a.pos[0], a.pos[1], { stance: 'hold', recruitableAs: a.recruitable_as ?? null }));
    }
    b.log.push({ turn: 1, kind: 'turn', text: `${ch.number}장 ${ch.title} — 1턴 시작` });
    b.pending = [...ch.dialogue.pre];
    fireMid(b, ch, { kind: 'turn', turn: 1 });
    return b;
}
const alive = (b: Battle, side?: BattleUnit['side']) => b.units.filter(u => u.hp > 0 && (!side || u.side === side));
export const lordOf = (b: Battle) => b.units.find(u => u.defId && UNIT_MAP[u.defId]?.role === 'lord');
export const bossOf = (b: Battle) => b.units.find(u => u.boss);
function fireMid(b: Battle, ch: ChapterDef, trig: ChapterDef['dialogue']['mid'][number]['trigger']) {
    ch.dialogue.mid.forEach((m, i) => {
        if (b.firedMid.includes(i)) return;
        const t = m.trigger;
        const match = (t.kind === 'turn' && trig.kind === 'turn' && t.turn === trig.turn) || (t.kind === 'reinforcement' && trig.kind === 'reinforcement' && t.group === trig.group) || (t.kind === 'boss_hp' && trig.kind === 'boss_hp') || (t.kind === 'boss_engage' && trig.kind === 'boss_engage');
        if (match) { b.firedMid.push(i); b.pending.push(...m.lines); }
    });
}
/** 승패 판정. */
export function checkEnd(b: Battle, ch: ChapterDef): Battle {
    if (b.status !== 'playing') return b;
    const lord = lordOf(b);
    if (lord && lord.hp <= 0) { b.status = 'lost'; b.lostReason = `${lord.name}이(가) 쓰러졌다.`; return b; }
    if (!alive(b, 'player').length) { b.status = 'lost'; b.lostReason = '출격한 전원이 쓰러졌다.'; return b; }
    const o = ch.objective;
    if (o.type === 'rout' && !alive(b, 'enemy').length) b.status = 'won';
    if (o.type === 'boss' && !b.units.some(u => u.boss && u.hp > 0)) b.status = 'won';
    if (o.type === 'defend' && o.target_pos) {
        const e = unitAt(b, o.target_pos[0], o.target_pos[1]);
        if (e && e.side === 'enemy' && b.phase === 'enemy') { b.status = 'lost'; b.lostReason = '적이 사수 지점을 빼앗았다.'; }
    }
    if ((o.type === 'defend' || o.type === 'survive') && o.turns && b.turn > o.turns && b.status === 'playing') b.status = 'won';
    return b;
}
export const isTurnLimited = (ch: ChapterDef) => (ch.objective.type === 'defend' || ch.objective.type === 'survive') && !!ch.objective.turns;
/** 이동 범위(이미 행동한 유닛은 빈 범위). */
export const rangeFor = (b: Battle, u: BattleUnit) => moveRange(b.tiles, u, b.units);
/** 유닛 이동. 경로에 적이 없음을 moveRange가 보장합니다. 되돌리기는 UI가 스냅샷으로 합니다. */
export function moveUnit(b0: Battle, uid: string, to: Pos, budget?: number): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    if (u.hp <= 0 || (u.acted && budget === undefined)) throw Error('행동을 마친 유닛');
    const { stoppable } = budget === undefined ? rangeFor(b, u) : moveRange(b.tiles, u, b.units, budget);
    if (!stoppable.has(key(to[0], to[1]))) throw Error('갈 수 없는 칸');
    u.x = to[0]; u.y = to[1];
    return b;
}
/** 재이동(canto): 행동 뒤 남은 이동력으로 더 움직일 수 있는지. */
export const hasCanto = (u: BattleUnit) => classDef(u.classId).skill === 'canto' || u.skill === 'canto';
/** 공격 가능한 대상(현 위치 기준). */
export function attackTargets(b: Battle, u: BattleUnit): BattleUnit[] {
    const r = attackRange(u);
    if (!r[1]) return [];
    return b.units.filter(o => o.hp > 0 && hostile(o.side, u.side) && manhattan(o, u) >= r[0] && manhattan(o, u) <= r[1]);
}
export function healTargets(b: Battle, u: BattleUnit): BattleUnit[] {
    const r = staffRange(u);
    if (!r[1]) return [];
    return b.units.filter(o => o.hp > 0 && o.uid !== u.uid && !hostile(o.side, u.side) && o.hp < o.stats.hp && manhattan(o, u) >= r[0] && manhattan(o, u) <= r[1]);
}
/** 어떤 무기로든 공격 가능한 대상이 있는지 확인하며, 가능하면 그 무기로 바꿉니다. 선택한 무기 index 목록을 돌려줍니다. */
export function usableWeapons(b: Battle, u: BattleUnit): number[] {
    const cls = classDef(u.classId);
    const out: number[] = [];
    u.items.forEach((it, i) => {
        const d = itemDef(it.id);
        if (!d.weapon || d.weapon.type === 'staff' || !cls.weapons.includes(d.weapon.type)) return;
        const r = d.weapon.range;
        if (b.units.some(o => o.hp > 0 && hostile(o.side, u.side) && manhattan(o, u) >= r[0] && manhattan(o, u) <= r[1])) out.push(i);
    });
    return out;
}
export function equip(b0: Battle, uid: string, index: number): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    const d = itemDef(u.items[index].id);
    if (!canWield(classDef(u.classId), d)) throw Error('들 수 없는 무기');
    u.equipped = index;
    return b;
}
/** 쓰러진 유닛 처리: 플레이어는 캐주얼에서 후퇴, 클래식에서 사망. 적은 제거. 떨어뜨린 아이템은 loot로. */
function handleDeaths(b: Battle, result: CombatResult | null) {
    for (const u of b.units) {
        if (u.hp > 0 || u.status !== 'alive') continue;
        if (u.side === 'player') { u.status = b.mode === 'classic' ? 'dead' : 'retreated'; b.fallen.push(u.uid); b.log.push({ turn: b.turn, kind: 'loss', text: `${u.name}이(가) ${u.status === 'dead' ? '쓰러졌다.' : '물러났다.'}` }); }
        else { u.status = 'dead'; }
    }
    if (result?.drop) { b.loot.push(result.drop); b.log.push({ turn: b.turn, kind: 'event', text: `${itemDef(result.drop).name}을(를) 얻었다.` }); }
}
export function attack(b0: Battle, uid: string, targetUid: string, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid), t = unitById(b, targetUid);
    if (!attackTargets(b, u).some(o => o.uid === t.uid)) throw Error('사거리 밖');
    if (t.boss && !b.bossMet) { b.bossMet = true; if (ch.dialogue.boss_quote) b.pending.push({ speaker: t.name, text: ch.dialogue.boss_quote }); fireMid(b, ch, { kind: 'boss_engage' }); }
    const hpBefore = t.hp;
    const r = resolveCombat(b, u, t);
    handleDeaths(b, r);
    if (t.boss && t.hp > 0 && hpBefore * 2 > t.stats.hp && t.hp * 2 <= t.stats.hp) fireMid(b, ch, { kind: 'boss_hp', ratio: 0.5 });
    finishAction(b, u);
    return checkEnd(b, ch);
}
export function heal(b0: Battle, uid: string, targetUid: string): Battle {
    const b = clone(b0);
    const u = unitById(b, uid), t = unitById(b, targetUid);
    if (!healTargets(b, u).some(o => o.uid === t.uid)) throw Error('사거리 밖');
    resolveHeal(b, u, t);
    finishAction(b, u);
    return b;
}
/** 행동 종료. 기병의 재이동(canto)은 UI가 acted 전에 따로 처리하므로 여기서는 단순히 마칩니다. */
function finishAction(b: Battle, u: BattleUnit) { u.acted = true; }
export function wait(b0: Battle, uid: string, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    u.acted = true;
    return checkEnd(b, ch);
}
/** 대화 가능한 대상: 인접한 영입 가능 적/NPC 중 조건(talk_with)이 이 유닛인 것. */
export function talkTargets(b: Battle, u: BattleUnit): BattleUnit[] {
    return b.units.filter(o => o.hp > 0 && o.recruitableAs && manhattan(o, u) === 1 && (UNIT_MAP[o.recruitableAs]?.recruit.talk_with === u.defId || (UNIT_MAP[o.recruitableAs]?.recruit.talk_with === null && u.defId && UNIT_MAP[u.defId].role === 'lord')));
}
export function talk(b0: Battle, uid: string, targetUid: string, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid), t = unitById(b, targetUid);
    if (!talkTargets(b, u).some(o => o.uid === t.uid)) throw Error('대화할 수 없다');
    const def = UNIT_MAP[t.recruitableAs!];
    b.recruited.push(def.id);
    // 적이던 유닛이 그대로 플레이어 쪽으로 넘어옵니다(체력 · 위치 유지).
    t.side = 'player'; t.defId = def.id; t.name = def.name; t.recruitableAs = null; t.stance = 'aggressive'; t.groupId = null; t.acted = true; t.skill = def.personal_skill; t.boss = false; t.drop = null;
    b.pending.push({ speaker: def.id, text: def.lines.join });
    b.log.push({ turn: b.turn, kind: 'event', text: `${def.name}이(가) 합류했다.` });
    u.acted = true;
    return checkEnd(b, ch);
}
/** 민가 방문(서 있는 칸이 H). */
export function visit(b0: Battle, uid: string, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    const k = key(u.x, u.y);
    if (b.tiles[u.y][u.x] !== 'H' || b.used.includes(k)) throw Error('방문할 민가가 없다');
    const ev = ch.map_events.find(e => e.kind === 'village' && e.pos[0] === u.x && e.pos[1] === u.y);
    b.used.push(k);
    if (ev) {
        b.pending.push({ speaker: '주민', text: ev.text });
        if (ev.reward) { b.loot.push(ev.reward); b.log.push({ turn: b.turn, kind: 'event', text: `민가에서 ${itemDef(ev.reward).name}을(를) 받았다.` }); }
        if (ev.gold) { b.gold += ev.gold; b.log.push({ turn: b.turn, kind: 'event', text: `민가에서 ${ev.gold}골드를 받았다.` }); }
        // 민가에서 합류하는 유닛(visit 영입).
        const joiner = Object.values(UNIT_MAP).find(d => d.recruit.method === 'visit' && d.join_chapter === ch.number);
        if (joiner && !b.recruited.includes(joiner.id) && ev.reward === null) { b.recruited.push(joiner.id); b.pending.push({ speaker: joiner.id, text: joiner.lines.join }); b.log.push({ turn: b.turn, kind: 'event', text: `${joiner.name}이(가) 합류했다.` }); }
    }
    u.acted = true;
    return b;
}
/** 상자 열기(서 있는 칸이 C): 열쇠 또는 도적. */
export function openChest(b0: Battle, uid: string, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    const k = key(u.x, u.y);
    if (b.tiles[u.y][u.x] !== 'C' || b.used.includes(k)) throw Error('열 상자가 없다');
    if (!consumeKey(u, 'key')) throw Error('열쇠가 없다');
    const ev = ch.map_events.find(e => e.kind === 'chest' && e.pos[0] === u.x && e.pos[1] === u.y);
    b.used.push(k);
    if (ev?.reward) { b.loot.push(ev.reward); b.log.push({ turn: b.turn, kind: 'event', text: `상자에서 ${itemDef(ev.reward).name}을(를) 얻었다.` }); }
    if (ev?.gold) { b.gold += ev.gold; b.log.push({ turn: b.turn, kind: 'event', text: `상자에서 ${ev.gold}골드를 얻었다.` }); }
    if (ev) b.pending.push({ speaker: '', text: ev.text });
    u.acted = true;
    return b;
}
/** 열쇠를 씁니다. 도적(steal_lock)은 열쇠 없이도 됩니다. */
function consumeKey(u: BattleUnit, kind: 'key' | 'door_key'): boolean {
    if (classDef(u.classId).skill === 'steal_lock' || u.skill === 'steal_lock') return true;
    const i = u.items.findIndex(it => itemDef(it.id).kind === kind);
    if (i < 0) return false;
    u.items[i].uses -= 1; if (u.items[i].uses <= 0) { u.items.splice(i, 1); if (u.equipped > i) u.equipped--; else if (u.equipped === i) u.equipped = -1; }
    return true;
}
export const adjacentDoors = (b: Battle, u: BattleUnit): Pos[] => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [u.x + dx, u.y + dy] as Pos).filter(([x, y]) => b.tiles[y]?.[x] === 'D');
export const hasKey = (u: BattleUnit, kind: 'key' | 'door_key') => classDef(u.classId).skill === 'steal_lock' || u.skill === 'steal_lock' || u.items.some(it => itemDef(it.id).kind === kind);
export function openDoor(b0: Battle, uid: string, door: Pos): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    if (!adjacentDoors(b, u).some(d => d[0] === door[0] && d[1] === door[1])) throw Error('인접한 문이 없다');
    if (!consumeKey(u, 'door_key')) throw Error('문 열쇠가 없다');
    b.tiles = setTile(b.tiles, door[0], door[1], '.');
    b.log.push({ turn: b.turn, kind: 'event', text: `${u.name}이(가) 문을 열었다.` });
    u.acted = true;
    return b;
}
export const canSeize = (b: Battle, u: BattleUnit, ch: ChapterDef) => ch.objective.type === 'seize' && !!ch.objective.target_pos && u.x === ch.objective.target_pos[0] && u.y === ch.objective.target_pos[1] && !!u.defId && UNIT_MAP[u.defId]?.role === 'lord';
export function seize(b0: Battle, uid: string, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    if (!canSeize(b, u, ch)) throw Error('점령할 수 없다');
    u.acted = true; b.status = 'won';
    b.log.push({ turn: b.turn, kind: 'event', text: `${u.name}이(가) 점령했다.` });
    return b;
}
export const canEscape = (b: Battle, u: BattleUnit, ch: ChapterDef) => ch.objective.type === 'escape' && !!ch.objective.target_pos && u.x === ch.objective.target_pos[0] && u.y === ch.objective.target_pos[1] && u.side === 'player';
/** 탈출: 주인공이 탈출하면 승리(남은 유닛도 함께 빠져나간 것으로 칩니다). 다른 유닛은 맵에서 사라집니다. */
export function escape(b0: Battle, uid: string, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    if (!canEscape(b, u, ch)) throw Error('탈출할 수 없다');
    b.escaped.push(u.uid); u.acted = true;
    b.log.push({ turn: b.turn, kind: 'event', text: `${u.name}이(가) 탈출했다.` });
    if (u.defId && UNIT_MAP[u.defId]?.role === 'lord') b.status = 'won';
    else { u.hp = 0; u.status = 'alive'; /* 탈출한 유닛은 맵에서 빠지지만 살아 있음 */ u.x = -9; u.y = -9; }
    return b;
}
/** 소비 아이템 사용(상비약 · 강화). */
export function consumeItem(b0: Battle, uid: string, index: number, ch: ChapterDef): Battle {
    const b = clone(b0);
    const u = unitById(b, uid);
    const it = u.items[index]; const d = itemDef(it.id);
    if (d.kind === 'vulnerary') { const amount = Math.min(d.heal!, u.stats.hp - u.hp); u.hp += amount; b.log.push({ turn: b.turn, kind: 'event', text: `${u.name}이(가) ${d.name}으로 체력 ${amount} 회복.` }); }
    else if (d.kind === 'boost') { for (const [k, v] of Object.entries(d.boost!)) { u.stats[k as keyof Stats] += v; if (k === 'hp') u.hp += v; } b.log.push({ turn: b.turn, kind: 'event', text: `${u.name}이(가) ${d.name}을(를) 썼다.` }); }
    else throw Error('지금 쓸 수 없는 아이템');
    it.uses -= 1; if (it.uses <= 0) { u.items.splice(index, 1); if (u.equipped > index) u.equipped--; else if (u.equipped === index) u.equipped = -1; }
    u.acted = true;
    return checkEnd(b, ch);
}
/** 인접 아군과 아이템 교환(주고받기). 행동을 소모하지 않습니다. */
export function trade(b0: Battle, uid: string, otherUid: string, give: number | null, take: number | null): Battle {
    const b = clone(b0);
    const u = unitById(b, uid), o = unitById(b, otherUid);
    if (manhattan(u, o) !== 1 || hostile(u.side, o.side)) throw Error('인접한 아군이 아니다');
    const gi = give === null ? null : u.items.splice(give, 1)[0];
    const ti = take === null ? null : o.items.splice(take, 1)[0];
    if (gi) { if (o.items.length >= 5) throw Error('상대의 소지품이 가득 찼다'); o.items.push(gi); }
    if (ti) { if (u.items.length >= 5) throw Error('소지품이 가득 찼다'); u.items.push(ti); }
    autoEquip(u); autoEquip(o);
    return b;
}
/** 플레이어 턴 종료 → 적 턴 준비. 적 턴의 각 행동은 enemyStep으로 하나씩(연출용). */
export function endPlayerTurn(b0: Battle, ch: ChapterDef): Battle {
    const b = clone(b0);
    for (const u of b.units) u.acted = false;
    b.phase = 'enemy';
    b.log.push({ turn: b.turn, kind: 'turn', text: `${b.turn}턴 적 행동` });
    return checkEnd(b, ch);
}
/** 적 턴이 끝난 뒤: 턴 수 증가, 지형 회복, 증원, 플레이어 턴. */
export function startPlayerTurn(b0: Battle, ch: ChapterDef): Battle {
    const b = clone(b0);
    b.turn += 1; b.phase = 'player';
    for (const u of b.units) { u.acted = false; }
    b.log.push({ turn: b.turn, kind: 'turn', text: `${b.turn}턴 시작` });
    // 지형 회복(요새 · 왕좌) + 치유사 오라
    for (const u of b.units) {
        if (u.hp <= 0) continue;
        const t = terrainAt(b.tiles, u.x, u.y);
        if (t.heal && u.hp < u.stats.hp) u.hp = Math.min(u.stats.hp, u.hp + Math.ceil(u.stats.hp * t.heal / 100));
        if (u.side !== 'enemy' && (classDef(u.classId).skill === 'mend_aura' || u.skill === 'mend_aura')) for (const o of b.units) if (o.hp > 0 && o.uid !== u.uid && !hostile(o.side, u.side) && manhattan(o, u) === 1) o.hp = Math.min(o.stats.hp, o.hp + 5);
    }
    spawnReinforcements(b, ch);
    fireMid(b, ch, { kind: 'turn', turn: b.turn });
    return checkEnd(b, ch);
}
function spawnReinforcements(b: Battle, ch: ChapterDef) {
    for (const r of ch.reinforcements) {
        const due = r.turn === b.turn || (r.repeat_every && b.turn > r.turn && (b.turn - r.turn) % r.repeat_every === 0 && b.turn <= (r.repeat_until ?? EDGE_ESCAPE_TURNS));
        if (!due) continue;
        const tag = `${r.group_id}@${b.turn}`;
        if (b.spawned.includes(tag)) continue;
        b.spawned.push(tag);
        placeReinforcement(b, ch, r);
    }
}
/** 증원 배치 정보는 배치 정의에서 찾습니다(UI가 deployment를 넘기지 않아도 되게 chapter 쪽에 캐시). */
export const DEPLOYMENTS_BY_CHAPTER: Record<string, DeploymentDef> = {};
function placeReinforcement(b: Battle, ch: ChapterDef, r: Reinforcement) {
    const dep = DEPLOYMENTS_BY_CHAPTER[ch.id];
    const g = dep?.groups.find(x => x.id === r.group_id);
    if (!g) return;
    const occ = occupancy(b.units);
    r.spawns.forEach((p, i) => {
        const du = g.units[i % g.units.length];
        let pos = p;
        if (occ.has(key(p[0], p[1]))) { const alt = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p[0] + dx, p[1] + dy] as Pos).find(q => canStand(b.tiles, q[0], q[1], classDef(du.class_id).move_type) && !occ.has(key(q[0], q[1]))); if (!alt) return; pos = alt; }
        const e = spawnEnemy(b, du, pos, { id: g.id, stance: g.stance, priority: g.priority, fleeTargets: g.flee_targets });
        e.acted = true; // 등장 턴에는 행동하지 않음
        occ.set(key(pos[0], pos[1]), e);
    });
    b.pendingNotice = r.notice_text;
    b.log.push({ turn: b.turn, kind: 'event', text: `증원: ${r.notice_text}` });
    fireMid(b, ch, { kind: 'reinforcement', group: r.group_id });
}
/** 플레이어 유닛 중 아직 행동하지 않은 수. */
export const remainingActors = (b: Battle) => b.units.filter(u => u.side === 'player' && u.hp > 0 && !u.acted).length;
/** 되감기 가능한지. */
export const canRewind = (b: Battle) => b.rewindsLeft > 0 && b.status === 'playing';
/** 결과 집계: 전투에서 로스터로 되돌릴 유닛 정보. */
export function battleOutcome(b: Battle, ch: ChapterDef): { units: Unit[]; recruited: string[]; loot: string[]; gold: number; fallen: BattleUnit[] } {
    const units: Unit[] = [];
    for (const u of b.units) {
        if (u.side !== 'player') continue;
        const { x, y, hp, acted, groupId, stance, home, priority, fleeTargets, escaping, gained, moveType, move, ...rest } = u; void x; void y; void hp; void acted; void groupId; void stance; void home; void priority; void fleeTargets; void escaping; void gained; void moveType; void move;
        units.push(rest);
    }
    const bonus = ch.rewards.gold;
    return { units, recruited: b.recruited, loot: [...b.loot, ...ch.rewards.items], gold: b.gold + bonus, fallen: b.units.filter(u => b.fallen.includes(u.uid)) };
}
export { forecast, pathTo, cellsInRange, unkey, applyExp };
export type { Line };
