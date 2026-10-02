'use client';
import { Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import type { State, Action } from '@/game/types';
import { offlineCapSeconds, researchRank, salvageRate } from '@/game/data/economy';
import { useState } from 'react';
import { SLOT_COUNT, accountSlot, slotUnlocked, slotUnlockText } from '@/game/data/account';
import { jobById } from '@/game/data/classes';
export function SettingsDialog({ open, onOpenChange, s, busy, send, name, setName, onLogout, onSwitchSlot }: {
    onLogout?: () => void;
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
            <button className="icon-button" aria-label="설정과 도움말"><Settings2 size={19}/></button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>낚시꾼 설정</DialogTitle>
                <DialogDescription>이름을 바꾸고 항해 규칙을 확인하세요.</DialogDescription>
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
            {s && salvageRate(s) > 0 && <div className="setting-toggle">
                <div><strong>환생 정리 방식</strong><p>환생할 때 유물을 뺀 보관함·착용 장비 전부를 효율 {Math.round(salvageRate(s) * 100)}%로 {s.salvageMode === 'dismantle' ? '분해해 정수를 받습니다.' : '판매해 다음 생 시작 골드에 더합니다.'}</p></div>
                <button className="secondary" disabled={busy} onClick={() => send({ type: 'salvageMode', value: s.salvageMode === 'dismantle' ? 'sell' : 'dismantle' })}>{s.salvageMode === 'dismantle' ? '분해' : '판매'}</button>
            </div>}
            {s && onSwitchSlot && <div className="slot-section">
                <div className="section-title"><h3>캐릭터 슬롯</h3><span>슬롯마다 다른 낚시꾼을 키웁니다. 모든 슬롯의 기록을 합친 계정 보너스가 각 캐릭터에 적용되고, 쉬는 슬롯은 다음에 들어올 때 부재중 정산을 받습니다.</span></div>
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
            <div className="help-copy">
                <h3>항해 안내</h3>
                <p>자동 낚시를 시작하면 턴제 전투가 반복됩니다. 패배해도 장비와 골드는 잃지 않고 잠시 회복한 뒤 다시 출항합니다.</p>
                <p>전직으로 기술을 얻고 AP 한도 안에서 장착합니다. 액티브는 편성 순서대로 조건·마나·쿨다운·확률을 판정하며, 모두 실패하면 기본 공격을 사용합니다.</p>
                <p>전직하면 전용 기술이 무료로 열립니다. 장착 승리로 계승·강화하거나, 해금한 스킬에 1 SP를 사용할 수 있습니다. 숙련과 SP는 같은 성장 단계를 엽니다.</p>
                <p>진행은 서버에 자동 저장됩니다. 자동 낚시를 켜 둔 채 나가면 최대 {s ? offlineCapSeconds(s) / 3600 : 24}시간의 부재중 전투를 다음 접속 때 정산합니다. 전직은 전투 중에도 현재 전투를 정리한 뒤 바로 적용됩니다.</p>
            </div>
            {onLogout && <button className="secondary" onClick={() => { onOpenChange(false); onLogout(); }}>로그아웃</button>}
        </DialogContent>
    </Dialog>;
}
