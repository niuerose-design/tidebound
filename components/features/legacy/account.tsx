'use client';
/** v3.398 계정 보너스(모든 슬롯 합산) · 계정 금고(세계석 · 정수 · 칠흑 장신구). 금고 API(/api/vault deposit · withdraw)는 전과 같습니다. */
import { useEffect, useState } from 'react';
import type { State } from '@/game/types';
import { Button } from '@/components/ui/button';
import { formatExact } from '@/components/ui/game';
import { starLabel } from '@/game/data/starforce';
import { SUPPORT_EFFECTS, supportText, supportOf, isStaff } from '@/game/systems/support';
import { accountBonusRows, SLOT_COUNT, slotUnlocked, VAULT_PEARL_OUT_WEEKLY, VAULT_ONYX_CAP, type VaultInfo } from '@/game/data/account';
import { ownedOnyx } from '@/game/data/onyx';
import { Card, Note, field } from './parts';

const fmt = formatExact;
const Row = ({ name, sub, value, note, action }: { name: React.ReactNode; sub?: React.ReactNode; value?: React.ReactNode; note?: React.ReactNode; action?: React.ReactNode }) => <li className="grid gap-1 rounded-m bg-surface-1 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div className="grid gap-0.5"><strong className="text-s">{name}</strong>{sub && <small className="text-xs text-ink-3">{sub}</small>}{value && <b className="font-num text-s text-accent">{value}</b>}{note && <small className="text-xs text-ink-3">{note}</small>}</div>{action}</li>;

/** v25.6 계정 보너스: 모든 캐릭터 슬롯의 기록을 합쳐 각 캐릭터에 적용됩니다. */
export function AccountPanel({ s }: { s: State }) {
    const rows = accountBonusRows(s), slots = s.account?.slots || [], openSlots = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).filter(n => slotUnlocked(s.account, n)).length;
    const got = SUPPORT_EFFECTS.filter(e => s.support?.[e]), mine = isStaff(s) ? supportOf(s) : {}, give = SUPPORT_EFFECTS.filter(e => mine[e]);
    const text = (m: Partial<Record<(typeof SUPPORT_EFFECTS)[number], number>>, list: (typeof SUPPORT_EFFECTS)[number][]) => list.map(e => supportText(e, m[e] || 0)).join(' · ');
    return <Card title="계정 보너스" aside={`슬롯 ${slots.length || 1}/${openSlots} 사용 중 · 모든 슬롯 합산`}>
        <ul className="grid gap-2 lg:grid-cols-2">{rows.map(r => <Row key={r.name} name={r.name} sub={r.value} value={r.effect} note={r.next}/>)}
            {/* v3.219 참모 지원: 다른 분신이 주는 지원(받는 값)과, 참모 계보라면 내가 주는 지원. */}
            {(got.length > 0 || isStaff(s)) && <Row name="분신 지원(받음)" sub="참모 계보 분신" value={got.length ? text(s.support!, got) : '없음'} note="효과별 가장 높은 지원 하나 · 다른 분신에 반영까지 최대 10분"/>}
            {isStaff(s) && <Row name="분신 지원(줌)" sub="이 캐릭터의 지원 스킬" value={give.length ? text(mine, give) : '장착한 지원 스킬 없음'} note="다른 분신에게만 · 자신은 지휘 체계로 강해짐"/>}
        </ul>
    </Card>;
}
/** v25.13 계정 공유 금고: 슬롯 사이에서 세계석·정수를 옮깁니다. 2번 슬롯이 열린 뒤에 보입니다. */
export function VaultPanel({ s, busy, vault, error, load, act }: { s: State; busy: boolean; vault?: VaultInfo | null; error?: string; load?: () => Promise<void>; act?: (body: Record<string, unknown>) => Promise<boolean> }) {
    const [amount, setAmount] = useState({ pearls: '', essence: '' });
    useEffect(() => { const t = setTimeout(() => { void load?.(); }, 0); return () => clearTimeout(t); }, [load]);
    if (!act) return null;
    const row = (kind: 'pearls' | 'essence', label: string, have: number, cap?: string) => { const n = Math.floor(Number(amount[kind])) || 0; return <Row key={kind} name={label} sub={`보유 ${fmt(have)} · 금고 ${vault ? fmt(vault[kind]) : '…'}${cap ? ` · ${cap}` : ''}`}
        action={<div className="flex flex-wrap items-center gap-2"><input type="number" min={1} className={`${field} w-28`} value={amount[kind]} placeholder="수량" aria-label={`${label} 수량`} onChange={e => setAmount({ ...amount, [kind]: e.target.value })}/>
            <Button type="button" size="sm" variant="outline" disabled={busy || n < 1 || have < n} onClick={() => act({ action: 'deposit', kind, amount: n })}>넣기</Button>
            <Button type="button" size="sm" className="bg-accent text-accent-ink hover:bg-accent/90" disabled={busy || n < 1 || !vault || vault[kind] < n || (kind === 'pearls' && n > vault.pearlOutLeft)} onClick={() => act({ action: 'withdraw', kind, amount: n })}>꺼내기</Button></div>}/>; };
    return <Card title="계정 금고" aside={`어느 슬롯에서든 넣고 꺼냄 · 세계석 인출 주당 ${VAULT_PEARL_OUT_WEEKLY}개 · 골드 불가`}>
        {error && <p className="rounded-m border border-danger/50 bg-danger/10 px-3 py-2 text-s" role="alert">{error}</p>}
        <ul className="grid gap-2">{row('pearls', '세계석', s.pearls, vault ? `이번 주 인출 가능 ${vault.pearlOutLeft}개` : undefined)}{row('essence', '정수', s.essence || 0)}</ul>
        {/* v3.116 칠흑 장신구: 별 · 각성 그대로 옮김. 받는 분신이 같은 종을 가졌으면 각성 +1. v3.242 승천해도 남음. */}
        <h3 className="text-s font-semibold">칠흑 장신구 <small className="font-normal text-ink-3">금고 {vault?.onyx.length ?? '…'}/{VAULT_ONYX_CAP} · 별 · 각성 그대로 · 같은 종을 가진 분신이 꺼내면 각성 +1</small></h3>
        <ul className="grid gap-2">
            {s.inventory.filter(i => i.onyx).map(i => <Row key={i.id} name={<span style={{ color: 'var(--rarity-primal)' }}>{i.name}{i.onyxRank ? ` +${i.onyxRank}` : ''}</span>} sub={`가방 · ${starLabel(i.enhance || 0, true)} · Lv.${i.level}`} action={<Button type="button" size="sm" variant="outline" disabled={busy || !vault || vault.onyx.length >= VAULT_ONYX_CAP} onClick={() => act({ action: 'deposit', kind: 'onyx', id: i.id })}>넣기</Button>}/>)}
            {vault?.onyx.map(v => <Row key={v.id} name={<span style={{ color: 'var(--rarity-primal)' }}>{v.item.name}{v.item.onyxRank ? ` +${v.item.onyxRank}` : ''}</span>} sub={`금고 · ${v.slot}번 분신이 넣음 · ${starLabel(v.item.enhance || 0, true)} · Lv.${v.item.level}${ownedOnyx(s).has(v.item.onyx!) ? ' · 꺼내면 내 칠흑 각성 +1' : ''}`} action={<Button type="button" size="sm" className="bg-accent text-accent-ink hover:bg-accent/90" disabled={busy} onClick={() => act({ action: 'withdraw', kind: 'onyx', id: v.id })}>꺼내기</Button>}/>)}
            {!s.inventory.some(i => i.onyx) && !vault?.onyx.length && <li><Note>가방에 넣을 칠흑이 없습니다(착용 중인 칠흑은 벗어야 넣을 수 있음).</Note></li>}
        </ul>
    </Card>;
}
