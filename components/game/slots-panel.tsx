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
 * (이전에는 설정 다이얼로그와 환생 화면에 흩어져 있어 어디서 슬롯을 만드는지 찾기 어려웠습니다.)
 */
export function SlotsPanel({ s, busy, onSwitchSlot, vault, vaultError, loadVault, vaultAct }: PanelProps & { onSwitchSlot?: (slot: number) => Promise<void>; vault?: VaultInfo | null; vaultError?: string; loadVault?: () => Promise<void>; vaultAct?: (body: Record<string, unknown>) => Promise<boolean> }) {
    const [error, setError] = useState(''), [switching, setSwitching] = useState(false);
    const current = accountSlot(s), slots = s.account?.slots || [];
    const pick = async (slot: number) => { if (!onSwitchSlot) return; setSwitching(true); setError(''); try { await onSwitchSlot(slot); } catch (e) { setError(e instanceof Error ? e.message : '슬롯을 바꾸지 못했습니다.'); } finally { setSwitching(false); } };
    return <>
        <Heading eyebrow="ACCOUNT & SLOTS" title="캐릭터 슬롯" description={`한 계정에 낚시꾼 ${SLOT_COUNT}명까지. 슬롯마다 세이브·랭킹·채팅이 따로이고, 모든 슬롯의 기록을 합친 계정 보너스가 각 캐릭터에 적용됩니다. 쉬는 슬롯은 다음에 들어올 때 부재중 정산을 받습니다.`}/>
        {error && <p className="login-error" role="alert">{error}</p>}
        <section className="panel slot-section slots-screen">
            <div className="section-title"><h3><Users size={16}/> 슬롯</h3><span>2번은 {slotUnlockText(2)}, 3번은 {slotUnlockText(3)}에 열립니다. 새 슬롯은 ‘시작’을 누르면 처음부터 만들어집니다.</span></div>
            <ul className="slot-list">{Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(slot => {
                const info = slot === current ? { name: s.name, job: s.job, level: s.level, rebirths: s.rebirths } : slots.find(x => x.slot === slot);
                const open = slotUnlocked(s.account, slot), job = info ? jobById(info.job)?.name || info.job : '';
                return <li key={slot} className={slot === current ? 'current' : open ? '' : 'locked'}>
                    <span className="slot-index">{open ? slot : <Lock size={13}/>}</span>
                    <div>{info ? <><strong>{info.name}</strong><small>Lv.{info.level} {job} · 환생 {info.rebirths}회</small></> : <><strong>{open ? '빈 슬롯' : '잠김'}</strong><small>{open ? '처음부터 새 낚시꾼을 시작합니다' : slotUnlockText(slot)}</small></>}</div>
                    {slot === current ? <span className="slot-badge">플레이 중</span> : <button className={info ? 'secondary' : 'primary'} disabled={busy || switching || !open || !onSwitchSlot} onClick={() => pick(slot)}><Play size={13}/> {info ? '이어하기' : '새로 시작'}</button>}
                </li>; })}</ul>
            <p className="footnote">전투 화면 맨 위의 슬롯 칩으로도 바로 바꿀 수 있습니다. 전환하면 그 슬롯의 세이브를 불러오고, 떠난 슬롯은 쉬는 동안 부재중 정산(최대 24시간, 긴 닻줄 연구로 연장)이 쌓입니다.</p>
        </section>
        <AccountPanel s={s}/>
        {slotUnlocked(s.account, 2) && <VaultPanel s={s} busy={busy} vault={vault} error={vaultError} load={loadVault} act={vaultAct}/>}
    </>;
}
