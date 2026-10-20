/**
 * 원정대(오토배틀러) 2단계: 판 상태(State.expedition)와 행동. 8라운드 PvE · 고스트. 5단계부터 횟수 제한 없음, 보상은 승리마다 세계석(완주 보너스).
 * value 규칙 — expeditionBuy: 상점 칸 번호 · expeditionSell: 'bench:i' | 'board:i' · expeditionPlace: 'bench:i:front' | 'bench:i:back' | 'board:i'(벤치로).
 */
import { EXPEDITION, unitById, sellPrice, itemById, ITEM_HOLD, BOX_ITEMS, BOX_CHOICES, comboOf, EMBLEMS, EMBLEM_ROUND } from '../../data/expedition';
import { rollShop, rollWave, battle, frontRole, activeTraits } from '../expedition';
import { addLog } from '../state';
import type { State, ExpeditionRun, ExpeditionPlaced, ExpeditionBench, ExpeditionStats, ExpeditionGhost } from '../../types';
import type { ActionHandlers } from './types';

const run = (s: State): ExpeditionRun => { const r = s.expedition; if (!r || r.done) throw Error('진행 중인 원정이 없습니다.'); return r; };
const slotsOf = (r: ExpeditionRun) => EXPEDITION.boardSlots[Math.min(EXPEDITION.boardSlots.length - 1, r.level)];
/** 5단계: 보상 세계석 = 승수 × pearlsPerWin + (완주면 clearPearls). 환생 배율 없음. */
export const expeditionReward = (wins: number, cleared: boolean) => wins * EXPEDITION.pearlsPerWin + (cleared ? EXPEDITION.clearPearls : 0);
/** 같은 유닛 · 같은 ★이 3개 모이면 한 단계 올립니다(보드에 있던 자리는 유지, 나머지는 사라짐). 더 합칠 것이 없을 때까지. */
/** 8단계 문장 고르기: 보드에서 다음 단계까지 가장 가까운(아직 최대가 아닌) 시너지의 문장. 같은 거리면 머릿수가 많은 쪽, 그래도 같으면 무작위, 시너지가 없으면 아무 문장. */
export function pickEmblem(r: ExpeditionRun, rng: () => number): string {
    const cands = activeTraits(r.board).filter(t => t.trait.kind !== 'special' && t.tier < t.trait.tiers.length).map(t => ({ id: `emblem_${t.trait.id}`, gap: t.trait.tiers[t.tier].count - t.count, count: t.count })).filter(x => itemById(x.id));
    if (!cands.length) { const all = EMBLEMS(); return all[Math.floor(rng() * all.length)].id; }
    // 거리가 같으면 이미 더 많이 모은(투자한) 시너지를 우선, 그래도 같으면 무작위.
    const best = Math.min(...cands.map(x => x.gap)), near = cands.filter(x => x.gap === best), most = Math.max(...near.map(x => x.count)), top = near.filter(x => x.count === most);
    return top[Math.floor(rng() * top.length)].id;
}
export function mergeStars(r: ExpeditionRun) {
    for (let guard = 0; guard < 20; guard++) {
        let merged = false;
        for (const star of [1, 2] as const) {
            const units = new Set([...r.board, ...r.bench].filter(x => x.star === star).map(x => x.unit));
            for (const unit of units) {
                const onBoard = r.board.map((x, i) => [x, i] as const).filter(([x]) => x.unit === unit && x.star === star), onBench = r.bench.map((x, i) => [x, i] as const).filter(([x]) => x.unit === unit && x.star === star);
                if (onBoard.length + onBench.length < 3) continue;
                const next = (star + 1) as 2 | 3; let left = 3;
                // 벤치부터 지우고, 보드에 있으면 첫 자리를 승급시킵니다.
                const benchDrop = onBench.slice(0, left).map(([, i]) => i); left -= benchDrop.length;
                const boardDrop = onBoard.slice(0, left).map(([, i]) => i);
                // 6단계: 승급한 유닛은 보드 첫 자리(없으면 벤치 첫 장)의 아이템을 물려받고, 나머지 아이템은 가진 칸으로 돌아갑니다.
                const keep = boardDrop.length ? r.board[boardDrop[0]].item : r.bench[benchDrop[0]]?.item;
                const spare = [...boardDrop.slice(boardDrop.length ? 1 : 0).map(i => r.board[i].item), ...benchDrop.slice(boardDrop.length ? 0 : 1).map(i => r.bench[i].item)].filter((x): x is string => !!x);
                r.bench = r.bench.filter((_, i) => !benchDrop.includes(i));
                if (boardDrop.length) { r.board[boardDrop[0]] = { ...r.board[boardDrop[0]], star: next, ...(keep ? { item: keep } : {}) }; r.board = r.board.filter((_, i) => !boardDrop.slice(1).includes(i)); }
                else r.bench.push({ unit, star: next, ...(keep ? { item: keep } : {}) });
                if (spare.length) (r.items ??= []).push(...spare);
                merged = true;
            }
        }
        if (!merged) return;
    }
}
const income = (r: ExpeditionRun) => EXPEDITION.baseGold + Math.min(EXPEDITION.interestMax, Math.floor(r.gold / EXPEDITION.interestPer)) + Math.min(3, Math.max(0, r.streak - 1));
const statsOf = (s: State): ExpeditionStats => s.expeditionStats ??= { runs: 0, clears: 0, wins: 0, roundPlays: Array(9).fill(0), roundWins: Array(9).fill(0), units: {}, ghostFights: 0, ghostWins: 0 };
/** 3단계: 서버가 a.value에 실어 보낸 라운드별 고스트(다른 플레이어 보드)에서 이 라운드 것을 읽습니다. 모양이 맞지 않으면 무시. */
export function parseGhost(value: string | undefined, round: number): ExpeditionGhost | null {
    if (!value) return null;
    try {
        const g = (JSON.parse(value) as Record<number, ExpeditionGhost>)?.[round];
        if (!g || typeof g.name !== 'string' || !Array.isArray(g.board) || !g.board.length || g.board.length > 8) return null;
        if (!g.board.every(p => p && unitById(p.unit) && [1, 2, 3].includes(p.star) && (p.row === 'front' || p.row === 'back') && (p.item === undefined || itemById(p.item)))) return null;
        const wins = Number.isInteger(g.wins) && g.wins! >= 0 && g.wins! <= 8 ? g.wins : 0;
        return { name: g.name.slice(0, 16), board: g.board.map(p => ({ unit: p.unit, star: p.star, row: p.row, ...(p.item ? { item: p.item } : {}) })), wins };
    } catch { return null; }
}
function finish(s: State, r: ExpeditionRun, now: number, why: string) {
    r.done = true;
    const st = statsOf(s); st.runs++; st.wins += r.wins;
    const cleared = r.round > EXPEDITION.rounds || (r.round === EXPEDITION.rounds && r.last?.won && r.hp > 0);
    if (cleared) st.clears++;
    const reward = expeditionReward(r.wins, !!cleared);
    r.reward = reward; s.pearls = (s.pearls || 0) + reward;
    delete s.expeditionDay; s.expeditionBest = Math.max(s.expeditionBest || 0, r.wins);
    addLog(s, `원정대 ${why} · ${r.wins}승 · 세계석 +${reward}${cleared ? ` (완주 +${EXPEDITION.clearPearls})` : ''}`, 'reward');
}

export const expeditionActions: ActionHandlers = {
    expeditionStart(s, { now, rng }) {
        if (s.expedition && !s.expedition.done) throw Error('이미 원정이 진행 중입니다.');
        const r: ExpeditionRun = { round: 1, gold: 0, level: 2, xp: 0, hp: EXPEDITION.hp, wins: 0, streak: 0, board: [], bench: [], shop: [], startedAt: Math.max(now, (s.expedition?.startedAt || 0) + 1) };
        r.gold = income(r); r.shop = rollShop(r.level, rng);
        s.expedition = r;
        addLog(s, '원정대 출발 · 1라운드', 'system');
    },
    expeditionBuy(s, { a }) {
        const r = run(s), i = Number(a.value), id = r.shop[i];
        if (!Number.isInteger(i) || !id) throw Error('살 유닛을 고르세요.');
        const def = unitById(id)!;
        if (r.gold < def.cost) throw Error(`골드가 부족합니다(비용 ${def.cost}).`);
        if (r.bench.length >= EXPEDITION.bench) throw Error('벤치가 가득 찼습니다. 배치하거나 팔아서 자리를 비우세요.');
        r.gold -= def.cost; r.shop[i] = null; r.bench.push({ unit: id, star: 1 }); mergeStars(r);
    },
    expeditionSell(s, { a }) {
        const r = run(s), [where, iText] = String(a.value || '').split(':'), i = Number(iText);
        const list: (ExpeditionPlaced | ExpeditionBench)[] = where === 'board' ? r.board : where === 'bench' ? r.bench : [];
        const x = list[i]; if (!x) throw Error('팔 유닛을 고르세요.');
        r.gold += sellPrice(unitById(x.unit)!.cost, x.star);
        if (x.item) (r.items ??= []).push(x.item);
        if (where === 'board') r.board.splice(i, 1); else r.bench.splice(i, 1);
    },
    expeditionReroll(s, { rng }) {
        const r = run(s); if (r.gold < EXPEDITION.reroll) throw Error('골드가 부족합니다.');
        r.gold -= EXPEDITION.reroll; r.shop = rollShop(r.level, rng);
    },
    expeditionXp(s) {
        const r = run(s); if (r.level >= 8) throw Error('최대 레벨입니다.'); if (r.gold < EXPEDITION.xp) throw Error('골드가 부족합니다.');
        r.gold -= EXPEDITION.xp; r.xp += EXPEDITION.xp;
        while (r.level < 8 && r.xp >= EXPEDITION.xpToLevel[r.level]) { r.xp -= EXPEDITION.xpToLevel[r.level]; r.level++; }
    },
    expeditionPlace(s, { a }) {
        const r = run(s), [where, iText, rowText] = String(a.value || '').split(':'), i = Number(iText);
        if (where === 'bench') {
            const x = r.bench[i]; if (!x) throw Error('배치할 유닛을 고르세요.');
            const row = rowText === 'front' || rowText === 'back' ? rowText : frontRole(unitById(x.unit)!) ? 'front' : 'back';
            if (r.board.length >= slotsOf(r)) throw Error(`배치는 ${slotsOf(r)}명까지입니다(판 레벨 ${r.level}).`);
            if (r.board.filter(b => b.row === row).length >= (row === 'front' ? EXPEDITION.boardFront : EXPEDITION.boardBack)) throw Error(`${row === 'front' ? '앞줄' : '뒷줄'}이 가득 찼습니다.`);
            r.bench.splice(i, 1); r.board.push({ unit: x.unit, star: x.star, row, ...(x.item ? { item: x.item } : {}) });
        } else if (where === 'board') {
            const x = r.board[i]; if (!x) throw Error('내릴 유닛을 고르세요.');
            if (rowText === 'front' || rowText === 'back') { if (x.row === rowText) return; if (r.board.filter(b => b.row === rowText).length >= 4) throw Error('그 줄이 가득 찼습니다.'); x.row = rowText; return; }
            if (r.bench.length >= EXPEDITION.bench) throw Error('벤치가 가득 찼습니다.');
            r.board.splice(i, 1); r.bench.push({ unit: x.unit, star: x.star, ...(x.item ? { item: x.item } : {}) });
        } else throw Error('배치 명령이 잘못되었습니다.');
    },
    /** value: 서버가 넣는 라운드별 고스트 JSON(없으면 웨이브). 2라운드부터 이 라운드 고스트가 있으면 ghostChance로 고스트와 싸웁니다. */
    expeditionFight(s, { a, now, rng }) {
        const r = run(s);
        if (!r.board.length) throw Error('유닛을 한 명 이상 배치하세요.');
        if (r.box?.length) throw Error('상자에서 아이템을 고르거나 건너뛴 뒤 전투하세요.');
        const ghost = r.round >= 2 ? parseGhost(a.value, r.round) : null, useGhost = !!ghost && rng() < EXPEDITION.ghostChance;
        const wave = useGhost ? ghost!.board : rollWave(r.round, rng), result = battle(r.board, wave, rng);
        const won = result.winner === 'a', survivors = result.winner === 'a' ? 0 : Math.round(wave.length * (1 - result.hpLeft.b));
        r.last = { won, turns: result.turns, hpLeft: [Math.round(result.hpLeft.a * 100), Math.round(result.hpLeft.b * 100)], log: result.log.slice(-30), ...(useGhost ? { opponent: ghost!.name } : {}) };
        (r.history ??= {})[r.round] = r.board.map(p => ({ ...p }));
        const st = statsOf(s); st.roundPlays[r.round] = (st.roundPlays[r.round] || 0) + 1; if (won) st.roundWins[r.round] = (st.roundWins[r.round] || 0) + 1;
        for (const p of r.board) st.units[p.unit] = (st.units[p.unit] || 0) + 1;
        if (useGhost) { st.ghostFights++; if (won) { st.ghostWins++; r.ghostPoints = (r.ghostPoints || 0) + EXPEDITION.ghostPointPerWin * Math.max(1, ghost!.wins || 0); } }
        // 6단계 상자 → 7단계 선택지: 이기면 서로 다른 기본 아이템 3개를 내밀고 하나를 고릅니다(가진 칸이 차 있으면 상자 없음).
        let box: string[] | undefined;
        if (won) { r.wins++; r.streak++; if ((r.items?.length || 0) < ITEM_HOLD) { const pool = [...BOX_ITEMS()]; box = []; while (box.length < BOX_CHOICES - (r.round >= EMBLEM_ROUND ? 1 : 0) && pool.length) box.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id); if (r.round >= EMBLEM_ROUND) box.push(pickEmblem(r, rng)); r.box = box; } } else { r.streak = 0; r.hp = Math.max(0, r.hp - (EXPEDITION.lossBase + r.round * EXPEDITION.lossPerRound + Math.max(0, wave.length - survivors) * EXPEDITION.lossPerUnit)); }
        addLog(s, `원정대 ${r.round}라운드 ${won ? '승리' : '패배'}${useGhost ? ` · 상대 ${ghost!.name}` : ''} · ${result.turns}턴 · 남은 체력 ${r.hp}${box ? ` · 상자: ${box.map(id => itemById(id)!.name).join(' / ')} 중 하나` : ''}`, won ? 'reward' : 'battle');
        if (r.hp <= 0) { finish(s, r, now, `${r.round}라운드에서 탈락`); return; }
        if (r.round >= EXPEDITION.rounds) { r.round++; finish(s, r, now, '완주'); return; }
        r.round++; r.gold += income(r); r.shop = rollShop(r.level, rng);
    },
    /** 7단계 상자 고르기: value = 선택지 번호. 건너뛰면 상자가 사라집니다. */
    expeditionPickBox(s, { a }) {
        const r = run(s), k = Number(a.value), id = r.box?.[k];
        if (!r.box?.length) throw Error('고를 상자가 없습니다.');
        if (!id || !itemById(id)) throw Error('고를 아이템을 고르세요.');
        if ((r.items?.length || 0) >= ITEM_HOLD) throw Error(`아이템은 ${ITEM_HOLD}개까지 들고 있을 수 있습니다. 장착하거나 조합한 뒤 고르세요.`);
        (r.items ??= []).push(id); delete r.box;
    },
    expeditionSkipBox(s) { const r = run(s); if (!r.box?.length) throw Error('고를 상자가 없습니다.'); delete r.box; },
    /** 7단계 조합: value 'a:b'(가진 아이템 번호 둘). 조합표에 있는 짝만 합쳐지고, 결과는 가진 칸에 들어갑니다. */
    expeditionCombine(s, { a }) {
        const r = run(s), [x, y] = String(a.value || '').split(':').map(Number);
        const items = r.items || [], ia = items[x], ib = items[y];
        if (!Number.isInteger(x) || !Number.isInteger(y) || x === y || !ia || !ib) throw Error('합칠 아이템 둘을 고르세요.');
        const out = comboOf(ia, ib); if (!out) throw Error('이 둘은 합칠 수 없습니다. 조합표를 확인하세요.');
        r.items = items.filter((_, i) => i !== x && i !== y); r.items.push(out.id);
        addLog(s, `원정대 조합 · ${itemById(ia)!.name} + ${itemById(ib)!.name} → ${out.name}`, 'reward');
    },
    /** 6단계 장착: value 'bench:i:k' | 'board:i:k'(k = 가진 아이템 번호). 이미 낀 아이템은 가진 칸으로 돌아옵니다. */
    expeditionEquip(s, { a }) {
        const r = run(s), [where, iText, kText] = String(a.value || '').split(':'), i = Number(iText), k = Number(kText);
        const list: (ExpeditionPlaced | ExpeditionBench)[] = where === 'board' ? r.board : where === 'bench' ? r.bench : [];
        const x = list[i], id = r.items?.[k];
        if (!x) throw Error('장착할 유닛을 고르세요.'); if (!id || !itemById(id)) throw Error('장착할 아이템을 고르세요.');
        r.items!.splice(k, 1);
        if (x.item) r.items!.push(x.item);
        x.item = id;
    },
    /** 6단계 해제: value 'bench:i' | 'board:i'. */
    expeditionUnequip(s, { a }) {
        const r = run(s), [where, iText] = String(a.value || '').split(':'), i = Number(iText);
        const list: (ExpeditionPlaced | ExpeditionBench)[] = where === 'board' ? r.board : where === 'bench' ? r.bench : [];
        const x = list[i]; if (!x?.item) throw Error('해제할 아이템이 없습니다.');
        if ((r.items?.length || 0) >= ITEM_HOLD) throw Error(`아이템은 ${ITEM_HOLD}개까지 들고 있을 수 있습니다.`);
        (r.items ??= []).push(x.item); delete x.item;
    },
    expeditionQuit(s, { now }) { const r = run(s); finish(s, r, now, `${r.round}라운드에서 포기`); },
    /** 끝난 판을 치웁니다(화면 정리). */
    expeditionClear(s) { if (s.expedition?.done) delete s.expedition; },
};
