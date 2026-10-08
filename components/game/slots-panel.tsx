'use client';
import { useState } from 'react';
import { Lock, Users, Play } from 'lucide-react';
import type { PanelProps } from './panel-props';
import { Heading } from './shared';
import { AccountPanel, VaultPanel } from './rebirth-panel';
import { SLOT_COUNT, accountSlot, slotUnlocked, slotUnlockText } from '@/game/data/account';
import { jobById } from '@/game/data/classes';
import type { VaultInfo } from './use-game';

/**
 * v25.13 캐릭터 슬롯 화면: 슬롯 만들기·전환, 해금 조건, 계정 보너스, 계정 금고를 한곳에 모았습니다.
 */
export function SlotsPanel({ s, busy, onSwitchSlot, vault, vaultError, loadVault, vaultAct }: PanelProps & { onSwitchSlot?: (slot: number) => Promise<void>; vault?: VaultInfo | null; vaultError?: string; loadVault?: () => Promise<void>; vaultAct?: (body: Record<string, unknown>) => Promise<boolean> }) {
    const [error, setError] = useState(''), [switching, setSwitching] = useState(false);
    const current = accountSlot(s), slots = s.account?.slots || [];
    const pick = async (slot: number) => { if (!onSwitchSlot) return; setSwitching(true); setError(''); try { await onSwitchSlot(slot); } catch (e) { setError(e instanceof Error ? e.message : '슬롯을 바꾸지 못했습니다.'); } finally { setSwitching(false); } };
    return <>
        <Heading eyebrow="ACCOUNT & SLOTS" title="분신" description={`한 계정에 모험가 ${SLOT_COUNT}명. 모든 슬롯의 기록을 합친 계정 보너스가 각 캐릭터에 적용됩니다.`}/>
        {error && <p className="login-error" role="alert">{error}</p>}
        <section className="panel slot-section slots-screen">
            <div className="section-title"><h3><Users size={16}/> 슬롯</h3><span>2번 {slotUnlockText(2)} · 3번 {slotUnlockText(3)}</span></div>
            <ul className="slot-list">{Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(slot => {
                const info = slot === current ? { name: s.name, job: s.job, level: s.level, rebirths: s.rebirths } : slots.find(x => x.slot === slot);
                const open = slotUnlocked(s.account, slot), job = info ? jobById(info.job)?.name || info.job : '';
                return <li key={slot} className={slot === current ? 'current' : open ? '' : 'locked'}>
                    <span className="slot-index">{open ? slot : <Lock size={13}/>}</span>
                    <div>{info ? <><strong>{info.name}</strong><small>Lv.{info.level} {job} · 환생 {info.rebirths}회</small></> : <><strong>{open ? '빈 슬롯' : '잠김'}</strong><small>{open ? '처음부터 새 모험가를 시작합니다' : slotUnlockText(slot)}</small></>}</div>
                    {slot === current ? <span className="slot-badge">플레이 중</span> : <button className={info ? 'secondary' : 'primary'} disabled={busy || switching || !open || !onSwitchSlot} onClick={() => pick(slot)}><Play size={13}/> {info ? '이어하기' : '새로 시작'}</button>}
                </li>; })}</ul>
        </section>
        <AccountPanel s={s}/>
        {slotUnlocked(s.account, 2) && <VaultPanel s={s} busy={busy} vault={vault} error={vaultError} load={loadVault} act={vaultAct}/>}
    </>;
}
