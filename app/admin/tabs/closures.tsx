import { Sm, Fold, muted, rowItem } from '../parts';
import { cn } from '@/lib/utils';
import type { ClosureList } from '../types';
import type { Admin } from '../use-admin';

/** v3.413 운영자 페이지 탭(page.tsx 에서 분리). 화면과 문구는 그대로입니다. */
export function ClosuresTab({ a }: { a: Admin }) {
    const { broadcast, secrecy, region, hackFx, closures, busy, toggleSecrecy, removeHackEffects, removeBroadcast, toggleClosed } = a;
    if (!closures) return null;
    const closureList = (kind: keyof ClosureList, title: string, open: boolean) => closures && <Fold title={title} open={open} note={`${closures[kind].length}곳 · 막힘 ${closures[kind].filter(r => r.closed).length}`}>
        <ul className="grid">{closures[kind].map(r => <li key={r.id} className={rowItem}>
            <span className="text-s"><b>{r.name}</b> · {r.closed ? <b className="text-danger">입장 막힘</b> : <span className="text-ok">열림</span>}{r.locked ? <small className={muted}> · 첫 사냥터(닫을 수 없음)</small> : null}</span>
            {!r.locked && <Sm className={cn(r.closed && 'border-transparent bg-accent text-accent-ink hover:bg-accent/90')} disabled={busy} onClick={() => toggleClosed(kind, r)}>{r.closed ? '다시 열기' : '입장 막기'}</Sm>}</li>)}</ul></Fold>;
    return <>
            <Fold title="서버 상태" note={[broadcast ? '해커 방송 중' : '', secrecy?.on ? '정보 비공개' : '', hackFx && hackFx.tamper + hackFx.down + hackFx.patched + (hackFx.ddos || 0) > 0 ? '해킹 효과 있음' : ''].filter(Boolean).join(' · ') || '이상 없음'}>
                <ul className="grid">
                    <li className={rowItem}><span className="text-s"><b>해커 방송</b> · {broadcast ? <>[해커 {broadcast.by}] {broadcast.text} <small className={muted}>· {new Date(broadcast.until).toLocaleTimeString()}까지</small></> : <span className={muted}>없음</span>}</span>{broadcast && <Sm disabled={busy} onClick={removeBroadcast}>방송 지우기</Sm>}</li>
                    <li className={rowItem}><span className="text-s"><b>정보 비공개</b> · {secrecy ? `${secrecy.on ? '켜짐' : '꺼짐(오픈 베타)'}${secrecy.env ? ` · 환경 변수 ${secrecy.env} 우선` : ''}` : '-'}</span>{secrecy && <Sm disabled={busy || !!secrecy.env} onClick={toggleSecrecy}>{secrecy.on ? '끄기' : '켜기'}</Sm>}</li>
                    <li className={rowItem}><span className="text-s"><b>서버 리전</b> · {region ? <>함수 {region.functionRegion ? `${region.functionRegion}${region.functionCity ? `(${region.functionCity})` : ''}` : '로컬'} · DB {region.dbRegion || '알 수 없음'}{region.dbRegion && region.recommended ? (region.aligned ? <small className={muted}> · 같은 곳입니다</small> : <small className="text-gold-ink"> · 다릅니다 → vercel.json에 {'"regions": ["' + region.recommended + '"]'}{region.recommendedCity ? `(${region.recommendedCity})` : ''}를 넣고 다시 배포하세요</small>) : null}</> : '-'}</span></li>
                    <li className={rowItem}><span className="text-s"><b>해킹 효과</b> · {hackFx ? `변조 ${hackFx.tamper} · 다운 ${hackFx.down} · 패치 ${hackFx.patched} · DDoS ${hackFx.ddos || 0}` : '-'}</span>{hackFx && hackFx.tamper + hackFx.down + hackFx.patched + (hackFx.ddos || 0) > 0 && <Sm disabled={busy} onClick={removeHackEffects}>모두 지우기</Sm>}</li>
                </ul>
            </Fold>
            {closureList('dungeons', '던전', true)}{closureList('stages', '사냥터', false)}
    </>;
}
