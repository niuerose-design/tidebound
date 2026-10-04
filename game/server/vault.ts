import type { State } from '../types';
import { db, type WalletRow } from './db';
import { ApiError } from './store';
import { weekKey } from '../data/goals';
import { addLog } from '../systems/state';
import { VAULT_PEARL_OUT_WEEKLY, type VaultInfo } from '../data/account';

/** v25.13 계정 공유 금고. 계정당 요청은 세이브 저장과 함께 직렬로 처리되므로 읽고-쓰기로 충분합니다. */
const fresh = (account: string, week: string): WalletRow => ({ account_id: account, pearls: 0, essence: 0, week, pearl_out: 0 });
async function wallet(account: string, now: number) {
    const week = weekKey(now), w = (await db().getWallet(account)) || fresh(account, week);
    return w.week === week ? w : { ...w, week, pearl_out: 0 };
}
export async function vaultInfo(account: string, now: number): Promise<VaultInfo> {
    const w = await wallet(account, now);
    return { pearls: w.pearls, essence: w.essence, week: w.week, pearlOut: w.pearl_out, pearlOutLeft: Math.max(0, VAULT_PEARL_OUT_WEEKLY - w.pearl_out) };
}
/** 입금·인출. mutate의 extra 안에서 한 번만 호출됩니다. */
export async function vaultMove(account: string, s: State, action: unknown, kind: unknown, rawAmount: unknown, now: number) {
    const amount = Math.floor(Number(rawAmount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) throw new ApiError('수량을 확인하세요.');
    if (kind !== 'pearls' && kind !== 'essence') throw new ApiError('세계석 또는 정수만 넣고 꺼낼 수 있습니다.');
    const w = await wallet(account, now), label = kind === 'pearls' ? '세계석' : '정수';
    if (action === 'deposit') {
        const have = kind === 'pearls' ? s.pearls : (s.essence || 0);
        if (have < amount) throw new ApiError(`${label}가 부족합니다.`);
        w[kind] += amount;
        if (kind === 'pearls') s.pearls -= amount; else s.essence = (s.essence || 0) - amount;
        addLog(s, `계정 금고에 ${label} ${amount.toLocaleString()} 입금 · 금고 ${label} ${w[kind].toLocaleString()}`, 'system');
    }
    else if (action === 'withdraw') {
        if (w[kind] < amount) throw new ApiError(`금고의 ${label}가 부족합니다.`);
        if (kind === 'pearls' && w.pearl_out + amount > VAULT_PEARL_OUT_WEEKLY) throw new ApiError(`세계석 인출은 주당 ${VAULT_PEARL_OUT_WEEKLY}개까지입니다(이번 주 남은 ${Math.max(0, VAULT_PEARL_OUT_WEEKLY - w.pearl_out)}개).`);
        w[kind] -= amount;
        if (kind === 'pearls') { s.pearls += amount; w.pearl_out += amount; } else s.essence = (s.essence || 0) + amount;
        addLog(s, `계정 금고에서 ${label} ${amount.toLocaleString()} 인출 · 금고 ${label} ${w[kind].toLocaleString()}`, 'reward');
    }
    else throw new ApiError('올바르지 않은 요청입니다.');
    await db().setWallet(w);
    return vaultInfo(account, now);
}
