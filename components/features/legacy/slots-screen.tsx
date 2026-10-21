'use client';
/** v3.398 분신(새 토대): 슬롯 만들기·전환, 해금 조건, 계정 보너스, 계정 금고. v25.13 */
import { useState } from 'react';
import { Lock, Users, Play } from 'lucide-react';
import type { State } from '@/game/types';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/game';
import { SLOT_COUNT, accountSlot, slotUnlocked, slotUnlockText, type VaultInfo } from '@/game/data/account';
import { jobById } from '@/game/data/classes';
import { cn } from '@/lib/utils';
import { Card } from './parts';
import { AccountPanel, VaultPanel } from './account';

export function SlotsScreen({ s, busy, onSwitchSlot, vault, vaultError, loadVault, vaultAct }: { s: State; busy: boolean; onSwitchSlot?: (slot: number) => Promise<void>; vault?: VaultInfo | null; vaultError?: string; loadVault?: () => Promise<void>; vaultAct?: (body: Record<string, unknown>) => Promise<boolean> }) {
    const [error, setError] = useState(''), [switching, setSwitching] = useState(false);
    const current = accountSlot(s), slots = s.account?.slots || [];
    const pick = async (slot: number) => { if (!onSwitchSlot) return; setSwitching(true); setError(''); try { await onSwitchSlot(slot); } catch (e) { setError(e instanceof Error ? e.message : '슬롯을 바꾸지 못했습니다.'); } finally { setSwitching(false); } };
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="ACCOUNT & SLOTS" title="분신" description={`한 계정에 모험가 ${SLOT_COUNT}명. 모든 슬롯의 기록을 합친 계정 보너스가 각 캐릭터에 적용됩니다.`}/>
        {error && <p className="rounded-m border border-danger/50 bg-danger/10 px-3 py-2 text-s" role="alert">{error}</p>}
        <Card title="슬롯" icon={<Users size={16}/>} aside={`2번 ${slotUnlockText(2)} · 3번 ${slotUnlockText(3)}`}>
            <ul className="grid gap-2 lg:grid-cols-3">{Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(slot => {
                const info = slot === current ? { name: s.name, job: s.job, level: s.level, rebirths: s.rebirths } : slots.find(x => x.slot === slot);
                const open = slotUnlocked(s.account, slot), job = info ? jobById(info.job)?.name || info.job : '', cur = slot === current;
                return <li key={slot} className={cn('flex items-center gap-3 rounded-m border p-3', cur ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-1', !open && 'opacity-70')}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 font-num text-s">{open ? slot : <Lock size={13}/>}</span>
                    <div className="grid min-w-0 flex-1 gap-0.5">{info ? <><strong className="truncate text-s">{info.name}</strong><small className="text-xs text-ink-3">Lv.{info.level} {job} · 환생 {info.rebirths}회</small></> : <><strong className="text-s">{open ? '빈 슬롯' : '잠김'}</strong><small className="text-xs text-ink-3">{open ? '처음부터 새 모험가를 시작합니다' : slotUnlockText(slot)}</small></>}</div>
                    {cur ? <span className="rounded-s bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-ink">플레이 중</span> : <Button type="button" size="sm" variant={info ? 'outline' : 'default'} className={cn(!info && 'bg-accent text-accent-ink hover:bg-accent/90')} disabled={busy || switching || !open || !onSwitchSlot} onClick={() => pick(slot)}><Play size={13}/> {info ? '이어하기' : '새로 시작'}</Button>}
                </li>; })}</ul>
        </Card>
        <AccountPanel s={s}/>
        {slotUnlocked(s.account, 2) && <VaultPanel s={s} busy={busy} vault={vault} error={vaultError} load={loadVault} act={vaultAct}/>}
    </div>;
}
