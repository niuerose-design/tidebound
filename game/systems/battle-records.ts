/**
 * v3.101 최근 전투 기록(몹별). 화면이 동기화로 이미 받은 로그만 묶어 이 브라우저에 남깁니다(서버 저장 · 전송 없음).
 *
 * - 한 전투 = 같은 적과 주고받은 타격 줄들 + 끝 줄(처치 · 패배 · 달아남/사라짐).
 * - 적 이름은 전투 로그의 이름(enemyLabel)을 그대로 키로 씁니다. 무리 규모 · 변종 · 보스가 다르면 다른 몹입니다.
 * - 일반 몹은 최근 승리 1회, 무리 · 변종 · 보스는 최근 5회를 남기고, 패배는 어느 몹이든 5회까지 남깁니다.
 * - 오프라인 정산처럼 로그가 한꺼번에 잘려 들어오면 그 전투는 ‘일부’로 표시합니다.
 */
import type { CombatEvent, Log } from '../types';

export type BattleResult = 'win' | 'lose' | 'flee';
export type BattleRecord = {
    /** 첫 줄의 로그 id(기록 구분용). */
    id: number;
    label: string;
    result: BattleResult;
    /** 싸운 턴 수(로그의 turn 기준). */
    turns: number;
    /** 내가 준 피해 · 받은 피해 합계, 내 최고 한 방(raw ?? value), 치명타 수. */
    dealt: number;
    taken: number;
    maxHit: number;
    crits: number;
    golden?: boolean;
    /** 앞부분 로그가 빠졌거나(정산) 줄 상한을 넘어 잘렸는지. */
    partial?: boolean;
    /** 기록한 시각(ms, 이 기기 시계). */
    at: number;
    /** 같은 몹의 바로 이전 승리 요약(성장 비교용. 일반 몹은 기록을 1회만 남기므로 요약을 따로 붙입니다). */
    before?: { turns: number; maxHit: number; dealt: number; at: number };
    /** 전투 로그 줄(최근 BATTLE_RECORD.lines줄). */
    lines: Log[];
};
export type BattleRecordStore = {
    lastId: number;
    /** 아직 끝나지 않은 전투. */
    current?: Omit<BattleRecord, 'result' | 'at' | 'label' | 'turns'> & { label?: string; turnSet: number[] };
    /** 몹 이름 → 최근 기록(새것 먼저). */
    byMob: Record<string, BattleRecord[]>;
    /** 최근에 싸운 몹 순서(새것 먼저). */
    order: string[];
};
export const BATTLE_RECORD = { special: 5, normal: 1, defeats: 5, mobs: 20, lines: 24 } as const;

export const emptyBattleRecords = (): BattleRecordStore => ({ lastId: 0, byMob: {}, order: [] });
/** 무리(×N) · 변종(표식) · 보스 태그가 붙은 이름이면 5회, 아니면 1회. */
export const isSpecialMob = (label: string) => /^\[|^[◆◈✧]|×\d+$/.test(label);

const KILL = /^(✦ 황금 )?(.+?) 처치 · \+/;
const ESCAPE = /^(.+)이\(가\) (?:줄을 끊고 달아났습니다|어둠 속으로 사라졌습니다)/;
const DEFEAT = /^몬스터를 놓쳤습니다/;

const hitTotal = (ev: CombatEvent) => ev.total || 0;
const bestHit = (ev: CombatEvent) => ev.hits.reduce((m, h) => h.miss ? m : Math.max(m, h.raw ?? h.value), 0);

function close(store: BattleRecordStore, result: BattleResult, label: string | undefined, end: Log | undefined, now: number, golden = false) {
    const cur = store.current; store.current = undefined;
    const name = label || cur?.label;
    if (!cur || !name) return;
    const lines = end ? [...cur.lines, end] : cur.lines;
    const record: BattleRecord = {
        id: cur.id, label: name, result, turns: Math.max(1, cur.turnSet.length), dealt: cur.dealt, taken: cur.taken, maxHit: cur.maxHit, crits: cur.crits,
        ...(golden ? { golden } : {}), ...(cur.partial || lines.length > BATTLE_RECORD.lines ? { partial: true } : {}), at: now, lines: lines.slice(-BATTLE_RECORD.lines),
    };
    const prevWin = result === 'win' ? (store.byMob[name] || []).find(r => r.result === 'win') : undefined;
    if (prevWin) record.before = { turns: prevWin.turns, maxHit: prevWin.maxHit, dealt: prevWin.dealt, at: prevWin.at };
    const list = [record, ...(store.byMob[name] || [])];
    // 몹마다 승리 · 놓침은 special/normal개, 패배는 defeats개까지.
    const keep = isSpecialMob(name) ? BATTLE_RECORD.special : BATTLE_RECORD.normal;
    let others = 0, losses = 0;
    store.byMob[name] = list.filter(r => r.result === 'lose' ? ++losses <= BATTLE_RECORD.defeats : ++others <= keep);
    store.order = [name, ...store.order.filter(n => n !== name)];
    for (const old of store.order.splice(BATTLE_RECORD.mobs)) delete store.byMob[old];
}

/** 새로 받은 로그(id가 lastId보다 큰 것)를 전투 기록에 더합니다. 같은 store를 고쳐 돌려줍니다. */
export function ingestBattleLogs(store: BattleRecordStore, logs: Log[], playerName: string, now = Date.now()): BattleRecordStore {
    const fresh = logs.filter(l => l.id > store.lastId).sort((a, b) => a.id - b.id);
    if (!fresh.length) return store;
    // 처음 보는 기록이 아니고 id가 건너뛰었으면(서버가 오래된 줄을 잘라 보냄) 진행 중 전투는 일부만 남습니다.
    if (store.lastId > 0 && fresh[0].id > store.lastId + 1 && store.current) store.current.partial = true;
    // 처음 모을 때 받은 로그가 타격 줄로 시작하면, 그 전투는 앞부분을 못 본 것입니다.
    const midFight = store.lastId === 0 && fresh[0].type === 'battle';
    for (const log of fresh) {
        store.lastId = log.id;
        if (log.type === 'battle' && log.event) {
            const ev = log.event, mine = ev.actor === playerName;
            if (!mine && store.current?.label && store.current.label !== ev.actor) close(store, 'flee', undefined, undefined, now);
            const cur = store.current ??= { id: log.id, dealt: 0, taken: 0, maxHit: 0, crits: 0, lines: [], turnSet: [], ...(midFight && log === fresh[0] ? { partial: true } : {}) };
            if (!mine) cur.label = ev.actor;
            if (mine) { cur.dealt += hitTotal(ev); cur.maxHit = Math.max(cur.maxHit, bestHit(ev)); cur.crits += ev.hits.filter(h => h.critical && !h.miss).length; }
            else cur.taken += hitTotal(ev);
            if (log.turn !== undefined && !cur.turnSet.includes(log.turn)) cur.turnSet.push(log.turn);
            cur.lines.push(log);
            if (cur.lines.length > BATTLE_RECORD.lines) { cur.lines.shift(); cur.partial = true; }
            continue;
        }
        const kill = log.type === 'reward' ? KILL.exec(log.text) : null;
        if (kill) { close(store, 'win', kill[2], log, now, !!kill[1]); continue; }
        if (DEFEAT.test(log.text)) { close(store, 'lose', undefined, log, now); continue; }
        const escape = ESCAPE.exec(log.text);
        if (escape) close(store, 'flee', escape[1], log, now);
    }
    return store;
}

/** 같은 몹의 바로 이전 승리와 비교(성장 체감): 턴 수 차이와 최고 한 방 비율. 이전 승리가 없으면 undefined. */
export function compareWithPrevious(record: BattleRecord) {
    const prev = record.result === 'win' ? record.before : undefined;
    if (!prev) return undefined;
    return { turns: record.turns - prev.turns, maxHit: prev.maxHit ? record.maxHit / prev.maxHit : undefined };
}
