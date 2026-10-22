import { card, Primary, Sm, Fold, muted, rowItem, field, SpDetail, line, brief, lifeLine, grid } from '../parts';
import { cn } from '@/lib/utils';
import type { Admin } from '../use-admin';

/** v3.413 운영자 페이지 탭(page.tsx 에서 분리). 화면과 문구는 그대로입니다. */
export function LifeTab({ a }: { a: Admin }) {
    const { players, spOpen, setSpOpen, edit, setEdit, preview, setPreview, setDone, busy, look, apply, adjust } = a;
    return <>
        {players && <Fold title="검색 결과" note={`${players.length}명${players.length === 30 ? ' (최대 30명)' : ''}`}>
            {!players.length && <p className="text-ink-3">찾은 모험가가 없습니다.</p>}
            <ul className="grid">{players.map(p => <li key={p.id} className={cn(rowItem, 'block', (preview?.id === p.id || edit?.player.id === p.id) && 'bg-gold-ink/10')}>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-s"><b>{p.name}</b> <span className={muted}>· {p.username || '?'} · {p.slot}번 슬롯</span><br/><small className={muted}>{brief(p)} · 저장 {new Date(p.updatedAt).toLocaleString('ko-KR')}{lifeLine(p) ? <><br/>{lifeLine(p)}</> : null}</small></span>
                    <span className="flex flex-wrap justify-end gap-1.5">
                        <Sm disabled={busy} onClick={() => { setPreview(null); setDone(''); setEdit({ player: p, gold: String(p.gold), pearls: String(p.pearls) }); }}>골드·세계석</Sm>
                        <Sm disabled={busy} onClick={() => setSpOpen(spOpen === p.id ? null : p.id)} aria-expanded={spOpen === p.id}>SP 내역 {spOpen === p.id ? '▾' : '▸'}</Sm>
                        <Sm disabled={busy} onClick={() => look(p.id)}>초기화 미리 보기</Sm>
                    </span>
                </div>
                {spOpen === p.id && <SpDetail sp={p.sp}/>}
            </li>)}</ul>
        </Fold>}
        {edit && <form className={cn(card, 'grid gap-2 border-gold-ink p-4')} onSubmit={e => { e.preventDefault(); adjust(); }}>
            <h2 className="font-display text-m font-bold">골드·세계석 조정 · {edit.player.name} <small className={muted}>({edit.player.username || '?'} · {edit.player.slot}번 슬롯)</small></h2>
            <p className="text-s text-ink-3">최종 값을 입력합니다(더하기 아님). 비우면 그대로입니다.</p>
            <div style={grid(200)}>
                <label className="grid gap-1 text-s">골드 <small className={muted}>지금 {edit.player.gold.toLocaleString()}</small><input inputMode="numeric" value={edit.gold} onChange={e => setEdit({ ...edit, gold: e.target.value })} className={field}/></label>
                <label className="grid gap-1 text-s">세계석 <small className={muted}>지금 {edit.player.pearls.toLocaleString()}</small><input inputMode="numeric" value={edit.pearls} onChange={e => setEdit({ ...edit, pearls: e.target.value })} className={field}/></label>
            </div>
            <div className="flex gap-2"><Primary disabled={busy}>조정 적용</Primary><Sm disabled={busy} onClick={() => setEdit(null)}>취소</Sm></div>
        </form>}
        {preview && <section className={cn(card, 'grid gap-1.5 border-gold-ink p-4')}>
            <h2 className="font-display text-m font-bold">초기화 미리 보기 · {preview.data.before.name} <small className={muted}>({preview.data.before.username || '?'} · {preview.data.before.slot}번 슬롯)</small></h2>
            <div className="text-s">전: {line(preview.data.before)}</div>
            <div className="text-s">후: {line(preview.data.after)}</div>
            <div className="mt-1.5 flex gap-2"><Primary type="button" disabled={busy} onClick={apply}>이번 생 초기화 적용</Primary><Sm disabled={busy} onClick={() => setPreview(null)}>취소</Sm></div>
        </section>}
    </>;
}
