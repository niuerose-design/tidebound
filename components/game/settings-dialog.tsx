'use client';
import { Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import type { State, Action } from '@/game/types';
import { researchRank, salvageRate } from '@/game/data/economy';
import { SWARM_CAPS, swarmCapOf } from '@/game/data/variants';
import { useState } from 'react';
import { SLOT_COUNT, accountSlot, slotUnlocked, slotUnlockText } from '@/game/data/account';
import { jobById } from '@/game/data/classes';
export function SettingsDialog({ open, onOpenChange, s, busy, send, name, setName, onSwitchSlot }: {
    onSwitchSlot?: (slot: number) => Promise<void>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    s: State | null;
    busy: boolean;
    send: (a: Action) => void;
    name: string;
    setName: (value: string) => void;
}) {
    const [slotError, setSlotError] = useState(''), [switching, setSwitching] = useState(false);
    const current = s ? accountSlot(s) : 1, slots = s?.account?.slots || [];
    const pick = async (slot: number) => {
        if (!onSwitchSlot) return;
        setSwitching(true); setSlotError('');
        try { await onSwitchSlot(slot); onOpenChange(false); }
        catch (e) { setSlotError(e instanceof Error ? e.message : '슬롯을 바꾸지 못했습니다.'); }
        finally { setSwitching(false); }
    };
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
            <button className="icon-button settings-button" aria-label="설정과 도움말" title="설정"><Settings size={20}/><span>설정</span></button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>낚시꾼 설정</DialogTitle>
                <DialogDescription>이름과 알림, 정리 방식, 분신을 고릅니다.</DialogDescription>
            </DialogHeader>
            <label className="field-label" htmlFor="player-name">낚시꾼 이름</label>
            <div className="button-row">
                <input id="player-name" className="name-input" value={name} maxLength={16} onChange={e => setName(e.target.value)}/>
                <button className="primary" disabled={busy || !s || name.trim().length < 2} onClick={() => { send({ type: 'rename', value: name }); onOpenChange(false); }}>변경</button>
            </div>
            {s && researchRank(s, 'sortingNet') > 0 && <div className="setting-toggle">
                <div><strong>선별의 그물 자동 판매</strong><p>{researchRank(s, 'sortingNet') >= 2 ? '희귀 이하' : '일반'} 등급 드롭을 바로 팝니다. 유물과 장비 도감에 아직 등록하지 않은 종류는 남깁니다.</p></div>
                <button className={s.autoSell ? 'primary' : 'secondary'} disabled={busy} aria-pressed={!!s.autoSell} onClick={() => send({ type: 'autoSell', value: s.autoSell ? 'off' : 'on' })}>{s.autoSell ? '켜짐' : '꺼짐'}</button>
            </div>}
            {s && <div className="setting-toggle">
                <div><strong>문 알림</strong><p>전투 화면 맨 위 ‘문이 열렸습니다’ 줄입니다. 꺼도 전직 화면의 ??? 탭에서 열린 문을 볼 수 있습니다.</p></div>
                <button className={s.hideDoorNotice ? 'secondary' : 'primary'} disabled={busy} aria-pressed={!s.hideDoorNotice} onClick={() => send({ type: 'doorNotice', value: s.hideDoorNotice ? 'on' : 'off' })}>{s.hideDoorNotice ? '꺼짐' : '켜짐'}</button>
            </div>}
            {s && <div className="setting-toggle">
                <div><strong>능력치 최대 투자 확인</strong><p>능력치 화면의 ‘최대’ 버튼을 누를 때 확인 창을 띄웁니다. 끄면 남은 포인트를 바로 투자합니다(재분배는 무료).</p></div>
                <button className={s.skipStatConfirm ? 'secondary' : 'primary'} disabled={busy} aria-pressed={!s.skipStatConfirm} onClick={() => send({ type: 'statConfirm', value: s.skipStatConfirm ? 'on' : 'off' })}>{s.skipStatConfirm ? '꺼짐' : '켜짐'}</button>
            </div>}
            {s && <div className="setting-toggle swarm-cap-setting">
                <div><strong>무리 최대 규모</strong><p>이보다 큰 무리가 뽑히면 이 규모로 나옵니다. 큰 무리는 보상도 마리 수만큼이라 효율은 같고 한 번의 전투만 길어집니다. ‘끔’이면 무리 대신 일반 개체가 나오고, 다른 변종(거대·심연·별빛)은 그대로 나옵니다.</p></div>
                <div className="swarm-cap-buttons" role="group" aria-label="무리 최대 규모">{SWARM_CAPS.map(cap => <button key={cap} className={swarmCapOf(s) === cap ? 'primary' : 'secondary'} disabled={busy} aria-pressed={swarmCapOf(s) === cap} onClick={() => send({ type: 'swarmCap', value: String(cap) })}>{cap === 0 ? '끔' : cap >= 500 ? '제한 없음' : `×${cap}까지`}</button>)}</div>
            </div>}
            {s && salvageRate(s) > 0 && <div className="setting-toggle">
                <div><strong>환생 정리 방식</strong><p>환생할 때 유물을 뺀 보관함·착용 장비 전부를 효율 {Math.round(salvageRate(s) * 100)}%로 {s.salvageMode === 'dismantle' ? '분해해 정수를 받습니다.' : '판매해 다음 생 시작 골드에 더합니다.'}</p></div>
                <button className="secondary" disabled={busy} onClick={() => send({ type: 'salvageMode', value: s.salvageMode === 'dismantle' ? 'sell' : 'dismantle' })}>{s.salvageMode === 'dismantle' ? '분해' : '판매'}</button>
            </div>}
            {s && onSwitchSlot && <div className="slot-section">
                <div className="section-title"><h3>분신</h3><span>슬롯마다 다른 낚시꾼을 키웁니다. 모든 슬롯의 기록을 합친 계정 보너스가 각 캐릭터에 적용되고, 쉬는 슬롯은 다음에 들어올 때 부재중 정산을 받습니다.</span></div>
                <ul className="slot-list">{Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(slot => {
                    const info = slot === current ? { name: s.name, job: s.job, level: s.level, rebirths: s.rebirths } : slots.find(x => x.slot === slot);
                    const open = slotUnlocked(s.account, slot), job = info ? jobById(info.job)?.name || info.job : '';
                    return <li key={slot} className={slot === current ? 'current' : open ? '' : 'locked'}>
                        <span className="slot-index">{slot}</span>
                        <div>{info ? <><strong>{info.name}</strong><small>Lv.{info.level} {job} · 환생 {info.rebirths}회</small></> : <><strong>{open ? '새 낚시꾼' : '잠김'}</strong><small>{open ? '처음부터 새로 시작합니다' : slotUnlockText(slot)}</small></>}</div>
                        {slot === current ? <span className="slot-badge">플레이 중</span> : <button className="secondary" disabled={busy || switching || !open} onClick={() => pick(slot)}>{info ? '이어하기' : '시작'}</button>}
                    </li>; })}</ul>
                {slotError && <p className="login-error" role="alert">{slotError}</p>}
            </div>}
        </DialogContent>
    </Dialog>;
}
