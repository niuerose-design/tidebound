import { useState } from 'react';
import { augmentName, setById, setUnits, decodeBoard, EXP_THEMES, activeTheme, UNIT_SKINS, activeSkin, skinUnlocked, setMasteryBest, SHARE_MEMO_MAX } from '@/game/data/expedition';
import { FoldSection } from '@/components/ui/game';
import { field } from '@/components/features/shop/parts';
import { cn } from '@/lib/utils';
import { UnitArt } from './replay';
import type { PanelProps } from '@/components/game/panel-props';
import { Note, Sm, Row, Box, unitLine } from './parts';
import type { State } from '@/game/types';

/** v3.413 꾸미기 탭(expedition-screen.tsx 에서 분리): 보드 공유 코드 · 보드 테마 · 유닛 피부. */
type Send = PanelProps['send'];
type Pool = ReturnType<typeof setUnits>;

export function ShareBox({ s, send, busy, copy, copied }: { s: State; send: Send; busy: boolean; copy: (key: string, text: string) => void; copied: string }) {
    const [codeInput, setCodeInput] = useState('');
    // 23단계(3): 작성자 메모(계정에 저장 · 모든 내 코드에 붙음). 입력 중 값은 화면에, 저장은 버튼 · 포커스 아웃.
    const [memoInput, setMemoInput] = useState<string | null>(null), memoNow = memoInput ?? (s.expeditionShareMemo || '');
    const saveMemo = () => { if (memoInput !== null && memoInput.trim() !== (s.expeditionShareMemo || '')) send({ type: 'expeditionShareMemo', value: memoInput.trim() }); setMemoInput(null); };
    const target = s.expeditionTarget;
    const peek = codeInput.trim() ? decodeBoard(codeInput) : null;
    return <FoldSection level={3} defaultOpen title="보드 공유" summary={target ? `목표 ${unitLine(target.units).slice(0, 24)}${unitLine(target.units).length > 24 ? '…' : ''}` : '코드로 목표 보드 정하기'}>
        <Note>판 중에 ‘코드 복사’를 누르면 지금 보드가 한 줄 코드가 됩니다. 다른 모험가가 그 코드를 여기에 붙여 넣고 ‘목표로 삼기’를 누르면 상점에 그 유닛마다 🎯 표시가 붙고, 모은 수가 보드 아래에 나옵니다. 순위표의 ‘코드’ 버튼으로 상위 보드를 가져올 수도 있습니다. 코드에는 내 이름과 아래 메모가 함께 들어갑니다.</Note>
        <Row className="mt-2"><input className={cn(field, 'min-w-0 flex-1 text-xs')} value={memoNow} maxLength={SHARE_MEMO_MAX} onChange={e => setMemoInput(e.target.value)} onBlur={saveMemo} placeholder={`코드에 붙는 한 줄 메모(${SHARE_MEMO_MAX}자) · 예: 초원 4 돌격 중심, 8라운드까지 버팀`} aria-label="공유 코드 메모"/><Sm disabled={busy || memoInput === null || memoInput.trim() === (s.expeditionShareMemo || '')} onClick={saveMemo}>메모 저장</Sm></Row>
        {target ? <Box className="border-ok/40"><p><b className="text-ok">🎯 지금 목표</b> · {unitLine(target.units)}{target.augments?.length ? <small className="text-ink-3"> · 증강 {target.augments.map(a => augmentName(a)).join(' · ')}</small> : null}{target.wins ? <small className="text-ink-3"> · {target.wins}승 보드</small> : null}</p>{target.author || target.memo ? <p className="text-gold-ink">✍ {target.author || '이름 없음'}{target.memo ? ` · “${target.memo}”` : ''}</p> : null}<Row><Sm disabled={busy} onClick={() => copy('target', target.code)}>{copied === 'target' ? '복사됨' : '코드 복사'}</Sm><Sm disabled={busy} onClick={() => send({ type: 'expeditionSetTarget', value: '' })}>목표 해제</Sm></Row></Box> : null}
        <Row><input className={cn(field, 'min-w-0 flex-1 text-xs')} value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="TB1. 로 시작하는 코드 붙여 넣기" aria-label="공유 코드" spellCheck={false}/><Sm disabled={busy || !peek} onClick={() => { send({ type: 'expeditionSetTarget', value: codeInput.trim() }); setCodeInput(''); }}>목표로 삼기</Sm></Row>
        {codeInput.trim() && !peek ? <Note tone="danger">알 수 없는 코드입니다.</Note> : peek ? <Note>{unitLine(peek.units)}{peek.set ? ` · ${setById(peek.set).icon} ${setById(peek.set).name} 세트` : ''}{peek.wins ? ` · ${peek.wins}승` : ''}{peek.round ? ` · ${peek.round}라운드` : ''}{peek.author || peek.memo ? ` · ✍ ${peek.author || '이름 없음'}${peek.memo ? ` “${peek.memo}”` : ''}` : ''}</Note> : null}
    </FoldSection>;
}

export function ThemeBox({ s, send, busy, pool }: { s: State; send: Send; busy: boolean; pool: Pool }) {
    const theme = activeTheme(s), skin = activeSkin(s);
    return <FoldSection level={3} defaultOpen title="보드 테마 · 유닛 피부" summary={`${theme.icon} ${theme.name} · ${skin.icon} ${skin.name}`}>
        <Note>보드 테마는 보드와 전투 화면의 색을, 유닛 피부는 내 유닛 그림의 색과 빛을 바꿉니다. 둘 다 능력치에는 영향이 없습니다. 테마는 명성 · 세트 숙련 · 리그 · 심연 · 난이도 기록으로, 피부는 세트 숙련으로 열립니다(어느 세트든 가장 높이 올린 숙련 {setMasteryBest(s)} 기준). 테마 {EXP_THEMES.filter(x => x.unlocked(s)).length}/{EXP_THEMES.length} · 피부 {UNIT_SKINS.filter(x => skinUnlocked(x, s)).length}/{UNIT_SKINS.length} 해금.</Note>
        <div className="exp-theme-list">{EXP_THEMES.map(x => { const open = x.unlocked(s); return <button type="button" key={x.id} className={`exp-theme-card theme-${x.id}${theme.id === x.id ? ' on' : ''}${open ? '' : ' locked'}`} disabled={busy || !open || theme.id === x.id} title={open ? `${x.name} 테마로 바꿉니다` : `잠김 · ${x.how}`} onClick={() => send({ type: 'expeditionTheme', value: x.id })}><i aria-hidden/><b>{x.icon} {x.name}</b><small>{open ? (theme.id === x.id ? '사용 중' : '누르면 적용') : `🔒 ${x.how}`}</small></button>; })}</div>
        <div className="exp-skin-list" aria-label="유닛 피부">{UNIT_SKINS.map(k => { const open = skinUnlocked(k, s), sample = pool[0]; return <button type="button" key={k.id} className={`exp-skin-card${skin.id === k.id ? ' on' : ''}${open ? '' : ' locked'}`} disabled={busy || !open || skin.id === k.id} title={open ? `${k.name} 피부로 바꿉니다` : `잠김 · ${k.how}`} onClick={() => send({ type: 'expeditionSkin', value: k.id })}>{sample ? <UnitArt def={sample} size={30} skin={k.id}/> : null}<b>{k.icon} {k.name}</b><small>{open ? (skin.id === k.id ? '사용 중' : '누르면 적용') : `🔒 ${k.how}`}</small></button>; })}</div>
    </FoldSection>;
}
