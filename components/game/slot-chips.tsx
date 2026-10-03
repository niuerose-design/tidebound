'use client';
import { useState } from 'react';
import { Lock, Users } from 'lucide-react';
import { SLOT_COUNT, accountSlot, slotUnlocked, slotUnlockText } from '@/game/data/account';
import { offlineCapSeconds } from '@/game/data/economy';
import { jobById } from '@/game/data/classes';
import type { State } from '@/game/types';

/** 부재 시간 표시: 슬롯 요약의 updatedAt(마지막 저장 ±10분) 기준. 부재중 정산 상한(기본 24시간)에 닿았으면 그렇게 표시합니다. */
function awayText(updatedAt: number, now: number, capSeconds: number) {
    const sec = Math.max(0, Math.floor((now - updatedAt) / 1000));
    if (sec < 600) return '방금 전';
    const capped = sec >= capSeconds;
    const h = Math.floor(Math.min(sec, capSeconds) / 3600), m = Math.floor((Math.min(sec, capSeconds) % 3600) / 60);
    return `부재 ${h ? `${h}시간` : ''}${!h || m ? ` ${m}분` : ''}`.replace('  ', ' ').trim() + (capped ? ' · 정산 상한' : '');
}
/**
 * v25.13 빠른 슬롯 전환 칩. 2번 슬롯이 열린 뒤 전투 화면 맨 위에 보이며, 쉬는 슬롯의 부재 시간으로 "지금 걷어갈 슬롯"을 알 수 있습니다.
 * 전환은 설정 다이얼로그와 같은 경로(서버가 해금 확인 → 쿠키 → 그 슬롯 세이브 불러오기)를 씁니다.
 */
export function SlotChips({ s, busy, onSwitch }: { s: State; busy: boolean; onSwitch?: (slot: number) => Promise<void> }) {
    const [error, setError] = useState(''), [switching, setSwitching] = useState(false);
    if (!onSwitch || !slotUnlocked(s.account, 2)) return null;
    // 부재 시간은 마지막 저장 시각(lastTick) 기준으로 계산해 렌더 중 Date.now()를 부르지 않습니다.
    const current = accountSlot(s), slots = s.account?.slots || [], now = s.lastTick;
    const pick = async (slot: number) => { setSwitching(true); setError(''); try { await onSwitch(slot); } catch (e) { setError(e instanceof Error ? e.message : '슬롯을 바꾸지 못했습니다.'); } finally { setSwitching(false); } };
    return <div className="slot-chips" role="group" aria-label="분신 전환">
        <Users size={14}/>
        {Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(slot => {
            const info = slots.find(x => x.slot === slot), open = slotUnlocked(s.account, slot), mine = slot === current;
            const label = mine ? `${s.name} · Lv.${s.level}` : info ? `${info.name} · Lv.${info.level} ${jobById(info.job)?.name || ''}` : open ? '새 낚시꾼' : slotUnlockText(slot);
            const sub = mine ? '플레이 중' : info ? awayText(info.updatedAt, now, offlineCapSeconds(s)) : open ? '처음부터 시작' : '잠김';
            return <button type="button" key={slot} className={`slot-chip ${mine ? 'current' : ''} ${open ? '' : 'locked'}`} disabled={mine || busy || switching || !open} title={open ? `${slot}번 슬롯으로 전환` : slotUnlockText(slot)} onClick={() => pick(slot)}>
                <span className="slot-chip-index">{open ? slot : <Lock size={11}/>}</span><span className="slot-chip-text"><strong>{label}</strong><small>{sub}</small></span>
            </button>;
        })}
        {error && <small className="login-error" role="alert">{error}</small>}
    </div>;
}
