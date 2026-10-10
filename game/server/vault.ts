import type { State } from '../types';
import { db, type WalletRow } from './db';
import { ApiError } from './store';
import { addLog } from '../systems/state';
import { VAULT_PEARL_OUT_WEEKLY, VAULT_ONYX_CAP, type VaultInfo, type VaultOnyx } from '../data/account';
import { receiveOnyx } from '../systems/onyx-grant';
import { weekKey } from '../data/time';

/** v25.13 계정 공유 금고. 계정당 요청은 세이브 저장과 함께 직렬로 처리되므로 읽고-쓰기로 충분합니다. */
const fresh = (account: string, week: string): WalletRow => ({ account_id: account, pearls: 0, essence: 0, week, pearl_out: 0, items: '[]' });
/** v3.116 금고 칠흑 목록(JSON 칸). 깨진 값은 빈 목록으로 봅니다. */
export const vaultOnyx = (w: Pick<WalletRow, 'items'>): VaultOnyx[] => { try { const x = JSON.parse(w.items || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
async function wallet(account: string, now: number) {
    const week = weekKey(now), w = (await db().getWallet(account)) || fresh(account, week);
    return w.week === week ? w : { ...w, week, pearl_out: 0 };
}
const infoOf = (w: WalletRow): VaultInfo => ({ pearls: w.pearls, essence: w.essence, week: w.week, pearlOut: w.pearl_out, pearlOutLeft: Math.max(0, VAULT_PEARL_OUT_WEEKLY - w.pearl_out), onyx: vaultOnyx(w) });
export async function vaultInfo(account: string, now: number): Promise<VaultInfo> {
    return infoOf(await wallet(account, now));
}
/**
 * 입금·인출. mutate의 extra 안에서 한 번만 호출됩니다(금고 쓰기는 한 번).
 * v3.116 세이브 저장이 충돌해 mutate가 새 세이브로 다시 돌면 금고 쪽은 이미 바뀌었으므로, 돌려준 apply를 새 세이브에 다시 적용해야 합니다
 * (전에는 다시 돌 때 세이브 쪽 변화가 빠져 재화가 금고와 가방 양쪽에 남거나 사라질 수 있었음). 처음 부를 때는 여기서 이미 적용합니다.
 */
export async function vaultMove(account: string, s: State, action: unknown, kind: unknown, rawAmount: unknown, now: number, slot = 1): Promise<{ info: VaultInfo; apply: (s: State) => void }> {
    // v3.116 칠흑 장신구: 넣기는 가방(착용 중이 아닌) 칠흑의 id, 꺼내기는 금고 칸 id(rawAmount 자리에 받음).
    if (kind === 'onyx') return vaultOnyxMove(account, s, action, String(rawAmount ?? ''), now, slot);
    const amount = Math.floor(Number(rawAmount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) throw new ApiError('수량을 확인하세요.');
    if (kind !== 'pearls' && kind !== 'essence') throw new ApiError('세계석 · 정수 · 칠흑 장신구만 넣고 꺼낼 수 있습니다.');
    const w = await wallet(account, now), label = kind === 'pearls' ? '세계석' : '정수';
    let apply: (s: State) => void;
    if (action === 'deposit') {
        const have = kind === 'pearls' ? s.pearls : (s.essence || 0);
        if (have < amount) throw new ApiError(`${label}가 부족합니다.`);
        w[kind] += amount;
        const left = w[kind];
        apply = x => { if (kind === 'pearls') x.pearls -= amount; else x.essence = (x.essence || 0) - amount; addLog(x, `계정 금고에 ${label} ${amount.toLocaleString()} 입금 · 금고 ${label} ${left.toLocaleString()}`, 'system'); };
    }
    else if (action === 'withdraw') {
        if (w[kind] < amount) throw new ApiError(`금고의 ${label}가 부족합니다.`);
        if (kind === 'pearls' && w.pearl_out + amount > VAULT_PEARL_OUT_WEEKLY) throw new ApiError(`세계석 인출은 주당 ${VAULT_PEARL_OUT_WEEKLY}개까지입니다(이번 주 남은 ${Math.max(0, VAULT_PEARL_OUT_WEEKLY - w.pearl_out)}개).`);
        w[kind] -= amount;
        if (kind === 'pearls') w.pearl_out += amount;
        const left = w[kind];
        apply = x => { if (kind === 'pearls') x.pearls += amount; else x.essence = (x.essence || 0) + amount; addLog(x, `계정 금고에서 ${label} ${amount.toLocaleString()} 인출 · 금고 ${label} ${left.toLocaleString()}`, 'reward'); };
    }
    else throw new ApiError('올바르지 않은 요청입니다.');
    await db().setWallet(w);
    apply(s);
    // v3.94 방금 쓴 지갑으로 답합니다(다시 읽지 않음).
    return { info: infoOf(w), apply };
}

/** v3.116 금고 칠흑 넣기 · 꺼내기. 별 · 각성은 그대로 옮기고, 받는 쪽이 같은 종을 가졌으면 각성 +1(receiveOnyx). */
async function vaultOnyxMove(account: string, s: State, action: unknown, key: string, now: number, slot: number) {
    const w = await wallet(account, now), list = vaultOnyx(w);
    let apply: (s: State) => void;
    if (action === 'deposit') {
        const item = s.inventory.find(x => x.id === key && x.onyx);
        if (!item) throw new ApiError(Object.values(s.equipment).some(x => x?.id === key) ? '착용 중인 칠흑은 넣을 수 없습니다. 먼저 벗으세요.' : '가방에 그 칠흑 장신구가 없습니다.');
        if (list.length >= VAULT_ONYX_CAP) throw new ApiError(`금고의 칠흑 칸은 ${VAULT_ONYX_CAP}개까지입니다.`);
        list.push({ id: `v${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`, item: structuredClone(item), slot, ascension: s.ascension || 0, at: now });
        apply = x => { x.inventory = x.inventory.filter(i => i.id !== key); addLog(x, `계정 금고에 칠흑 장신구 ‘${item.name}’을(를) 넣었습니다.`, 'system'); };
    }
    else if (action === 'withdraw') {
        const entry = list.find(x => x.id === key);
        if (!entry) throw new ApiError('금고에 그 칠흑 장신구가 없습니다.');
        list.splice(list.indexOf(entry), 1);
        apply = x => { receiveOnyx(x, structuredClone(entry.item)); };
    }
    else throw new ApiError('올바르지 않은 요청입니다.');
    w.items = JSON.stringify(list);
    await db().setWallet(w);
    apply(s);
    return { info: infoOf(w), apply };
}
/** v3.116 승천: 세계석 · 정수는 전처럼 비웁니다. v3.240 칠흑은 승천해도 남으므로 금고의 칠흑도 그대로 둡니다. */
export async function vaultAfterAscend(account: string, now: number) {
    const w = await wallet(account, now);
    await db().setWallet({ account_id: account, pearls: 0, essence: 0, week: weekKey(now), pearl_out: 0, items: w.items || '[]' });
}
