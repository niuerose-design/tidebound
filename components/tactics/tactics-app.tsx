'use client';
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import type { Mode, Unit, Battle } from '@/game/srpg/engine/types';
import { CHAPTERS, CHAPTER_MAP, DEPLOYMENT_MAP, DEPLOYMENTS } from '@/game/srpg/data/chapters/index';
import { DEPLOYMENTS_BY_CHAPTER, startBattle, REWINDS } from '@/game/srpg/engine/battle';
import { TRIGGER_RANGE } from '@/game/srpg/engine/ai';
import { seedFrom } from '@/game/srpg/engine/rng';
import { newCampaign, applyVictory, isComplete, currentChapter, deployable, lordUnit, type Campaign } from '@/game/srpg/state/campaign';
import { loadCampaign, saveCampaign, clearCampaign, loadSession, saveSession, clearSession, MODE_NAMES, type Session } from './storage';
import { BaseScreen } from './base-screen';
import { PrepScreen } from './prep-screen';
import { BattleScreen } from './battle-screen';
import { DialogueBox } from './dialogue';
import { ConfirmButton } from '@/components/game/confirm-button';
import { ResultScreen } from './result-screen';
// 엔진이 배치 정의를 찾을 수 있게 등록(증원 · 돌격 범위).
for (const d of DEPLOYMENTS) { DEPLOYMENTS_BY_CHAPTER[d.chapter_id] = d; for (const g of d.groups) if (g.trigger_range) TRIGGER_RANGE[`${d.chapter_id}:${g.id}`] = g.trigger_range; }
type Screen = { kind: 'title' } | { kind: 'base' } | { kind: 'prep' } | { kind: 'battle'; session: Session } | { kind: 'result'; battle: Battle; chapterId: string } | { kind: 'ending' };
/** 전기 모드 최상위. 화면 전환과 저장을 맡고, 전투 자체는 BattleScreen이 맡습니다. */
export default function TacticsApp() {
    const [campaign, setCampaignState] = useState<Campaign | null>(null);
    const [screen, setScreen] = useState<Screen>({ kind: 'title' });
    // 이 컴포넌트는 서버 렌더 없이(ssr: false) 뜨므로 저장 여부를 바로 읽습니다.
    const [hasSave, setHasSave] = useState(() => !!loadCampaign());
    const [hasSession, setHasSession] = useState(() => !!loadSession() && !!loadCampaign());
    const loaded = true;
    const setCampaign = useCallback((c: Campaign) => { setCampaignState(c); saveCampaign(c); }, []);
    const startNew = (mode: Mode, name: string) => {
        const c = newCampaign(mode, seedFrom(`${name}-${Date.now()}`));
        clearSession();
        setCampaign(c);
        setScreen({ kind: 'base' });
    };
    const continueGame = () => {
        const c = loadCampaign(); if (!c) return;
        setCampaignState(c);
        const s = loadSession();
        if (s && CHAPTER_MAP[s.chapterId]) setScreen({ kind: 'battle', session: s });
        else setScreen(isComplete(c) ? { kind: 'ending' } : { kind: 'base' });
    };
    const deploy = (units: Unit[]) => {
        if (!campaign) return;
        const ch = currentChapter(campaign); if (!ch) return;
        const dep = DEPLOYMENT_MAP[ch.id];
        const seed = (campaign.seed + ch.number * 7919 + Object.keys(campaign.cleared).length * 131) >>> 0;
        const battle = startBattle(ch, dep, units.map(u => JSON.parse(JSON.stringify(u)) as Unit), ch.player_spawns, campaign.mode, seed);
        const session: Session = { chapterId: ch.id, battle, snapshots: [battle], deployed: units.map(u => u.uid) };
        saveSession(session);
        setScreen({ kind: 'battle', session });
    };
    const onBattleEnd = (battle: Battle) => {
        clearSession();
        if (battle.status === 'won') setScreen({ kind: 'result', battle, chapterId: battle.chapterId });
        else setScreen({ kind: 'base' });
    };
    const finishResult = (battle: Battle) => {
        if (!campaign) return;
        const ch = CHAPTER_MAP[battle.chapterId];
        const c = applyVictory(campaign, battle, ch);
        setCampaign(c);
        setScreen(isComplete(c) ? { kind: 'ending' } : { kind: 'base' });
    };
    const abandon = () => { clearSession(); setScreen({ kind: 'base' }); };
    const reset = () => { clearCampaign(); setCampaignState(null); setHasSave(false); setHasSession(false); setScreen({ kind: 'title' }); };
    const body = useMemo(() => {
        if (!loaded) return <div className="tx-center"><p>기록을 읽는 중...</p></div>;
        switch (screen.kind) {
            case 'title': return <TitleScreen hasSave={hasSave} hasSession={hasSession} onNew={startNew} onContinue={continueGame} onReset={reset}/>;
            case 'base': return campaign && <BaseScreen campaign={campaign} setCampaign={setCampaign} onSortie={() => setScreen({ kind: 'prep' })} onTitle={() => setScreen({ kind: 'title' })}/>;
            case 'prep': return campaign && currentChapter(campaign) && <PrepScreen campaign={campaign} chapter={currentChapter(campaign)!} onBack={() => setScreen({ kind: 'base' })} onDeploy={deploy}/>;
            case 'battle': return campaign && <BattleScreen key={screen.session.chapterId + screen.session.battle.seed} session={screen.session} mode={campaign.mode} onEnd={onBattleEnd} onAbandon={abandon}/>;
            case 'result': return campaign && <ResultScreen campaign={campaign} battle={screen.battle} chapter={CHAPTER_MAP[screen.chapterId]} onDone={() => finishResult(screen.battle)}/>;
            case 'ending': return campaign && <EndingScreen campaign={campaign} onTitle={() => setScreen({ kind: 'title' })} onReset={reset}/>;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen, campaign, loaded, hasSave, hasSession]);
    return <div className="tx-app"><Toaster theme="dark" position="top-center"/>{body}</div>;
}
function TitleScreen({ hasSave, hasSession, onNew, onContinue, onReset }: { hasSave: boolean; hasSession: boolean; onNew: (mode: Mode, name: string) => void; onContinue: () => void; onReset: () => void }) {
    const [mode, setMode] = useState<Mode>('casual');
    const [confirmNew, setConfirmNew] = useState(false);
    return <div className="tx-title">
        <div className="tx-title-art"><span className="tx-title-wave"/></div>
        <p className="eyebrow">판게아 전기 — 턴제 전술 모드</p>
        <h1>소금바람 해안 전기</h1>
        <p className="tx-lead">바다가 갈라진 뒤 해적이 망루를 빼앗았다. 조류 지킴이 가문의 후계 세린이 자경단을 이끌고 가라앉은 회랑의 왕좌까지 나아가는 10장의 이야기.</p>
        <ul className="tx-title-facts"><li>10장 · 유닛 14명 · 한 전투 20~40분</li><li>이동 · 공격 · 지형 · 무기 상성 · 승급 · 영입</li><li>영구 사망은 시작할 때 캐주얼 / 클래식으로 고릅니다</li><li>기록은 이 브라우저에만 저장됩니다(본편 계정과 별개)</li></ul>
        <div className="tx-title-actions">
            {hasSave && <button type="button" className={confirmNew ? 'secondary' : 'primary'} onClick={onContinue}>{hasSession ? '전투 이어하기' : '이어하기'}</button>}
            {!confirmNew ? <button type="button" className={hasSave ? 'secondary' : 'primary'} onClick={() => setConfirmNew(true)}>새 전기 시작</button> : <div className="tx-mode-pick">
                <div className="tx-mode-options">
                    <label className={mode === 'casual' ? 'on' : ''}><input type="radio" name="mode" checked={mode === 'casual'} onChange={() => setMode('casual')}/><strong>캐주얼</strong><span>체력이 0이 된 유닛은 그 장에서만 빠지고 다음 장에 돌아옵니다. 되감기 {REWINDS.casual}회.</span></label>
                    <label className={mode === 'classic' ? 'on' : ''}><input type="radio" name="mode" checked={mode === 'classic'} onChange={() => setMode('classic')}/><strong>클래식</strong><span>체력이 0이 된 유닛은 영원히 떠납니다. 장비는 창고로 돌아옵니다. 되감기 {REWINDS.classic}회.</span></label>
                </div>
                <p className="tx-note">주인공 세린이 쓰러지면 어느 모드든 그 장을 다시 합니다. 모드는 나중에 바꿀 수 없습니다.{hasSave && ' 새로 시작하면 지금 기록은 지워집니다.'}</p>
                <div className="tx-row"><button type="button" className="primary" onClick={() => onNew(mode, MODE_NAMES[mode])}>{MODE_NAMES[mode]}로 시작</button><button type="button" className="secondary" onClick={() => setConfirmNew(false)}>취소</button></div>
            </div>}
            {hasSave && <ConfirmButton className="text-button danger-text" label="기록 지우기" title="전기 기록을 지울까요?" description="이 브라우저의 전기 기록(진행 · 동료 · 창고)이 모두 사라집니다. 되돌릴 수 없습니다." confirmLabel="지우기" disabled={false} onConfirm={onReset}/>}
        </div>
        <p className="tx-foot"><Link href="/">← 판게아 RPG 본편으로</Link></p>
    </div>;
}
function EndingScreen({ campaign, onTitle, onReset }: { campaign: Campaign; onTitle: () => void; onReset: () => void }) {
    const cleared = CHAPTERS.filter(c => campaign.cleared[c.id]);
    const fallen = campaign.roster.filter(u => u.status === 'dead');
    return <div className="tx-title tx-ending">
        <p className="eyebrow">소금바람 해안 전기 — 완결</p>
        <h1>등대에 불이 켜졌다</h1>
        <p className="tx-lead">익사한 왕은 잠들고 바다가 닫혔다. 갯벌에 물이 들고, 어촌의 배가 다시 뜬다. {lordUnit(campaign)?.name}과 자경단은 소금바람 해안으로 돌아간다.</p>
        <div className="tx-record">
            <div><span>모드</span><strong>{MODE_NAMES[campaign.mode]}</strong></div>
            <div><span>총 턴 수</span><strong>{campaign.totalTurns}</strong></div>
            <div><span>클리어한 장</span><strong>{cleared.length}/{CHAPTERS.length}</strong></div>
            <div><span>떠난 동료</span><strong>{fallen.length ? fallen.map(u => u.name).join(', ') : '없음'}</strong></div>
        </div>
        <ul className="tx-roster-final">{deployable(campaign).map(u => <li key={u.uid}><strong>{u.name}</strong> <small>Lv.{u.level} · 격파 {u.kills}</small></li>)}</ul>
        <div className="tx-row"><button type="button" className="primary" onClick={onTitle}>제목으로 가기</button><ConfirmButton className="secondary danger" label="기록 지우고 새로 시작" title="전기 기록을 지울까요?" description="완결한 전기 기록이 사라지고 제목 화면으로 돌아갑니다. 되돌릴 수 없습니다." confirmLabel="지우기" disabled={false} onConfirm={onReset}/></div>
    </div>;
}
export { DialogueBox, toast };
