import { card, Primary, Sm, Fold, muted, rowItem, MULTS, phase, when, mults, field, grid } from '../parts';
import { cn } from '@/lib/utils';
import type { Admin } from '../use-admin';

/** v3.413 운영자 페이지 탭(page.tsx 에서 분리). 화면과 문구는 그대로입니다. */
export function EventsTab({ a }: { a: Admin }) {
    const { events, draft, setDraft, busy, saveEvent, removeEvent } = a;
    if (!events) return null;
    return <>
            <div className={cn(card, 'p-3 text-s')}>지금 배너: <b>{events.banner || '진행 중인 이벤트 없음'}</b></div>
            <Fold title="등록된 이벤트 · 서버 메시지" note={`${events.extra.length}개 · 진행 중 ${events.extra.filter(e => e.live).length}`}>
                {!events.extra.length && <p className="text-s text-ink-3">없습니다.</p>}
                <ul className="grid">{events.extra.map(e => <li key={e.id} className={rowItem}>
                    <span className="text-s"><b>{e.name || '(이름 없음)'}</b> · {mults(e)}{phase(e, events.at)}<br/><small className={muted}>{when(e)}</small></span>
                    <Sm disabled={busy} onClick={() => removeEvent(e.id)}>삭제</Sm></li>)}</ul>
            </Fold>
            <Fold title="새 이벤트 · 서버 메시지" open={false}>
                <form onSubmit={ev => { ev.preventDefault(); saveEvent(); }} className="grid gap-2">
                    <label className="grid gap-1 text-s">배너 이름(배율은 자동으로 붙습니다)<input value={draft.name} maxLength={40} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="예: 숨겨진 직업 하나가 개방되었습니다" className={field}/></label>
                    <div style={grid(200)}>
                        <label className="grid gap-1 text-s">시작(한국 시간)<input type="datetime-local" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} className={field}/></label>
                        <label className="grid gap-1 text-s">종료(한국 시간)<input type="datetime-local" value={draft.until} onChange={e => setDraft({ ...draft, until: e.target.value })} className={field}/></label>
                    </div>
                    <div style={grid(110)}>{MULTS.map(([k, label]) => <label key={k} className="grid gap-1 text-s">{label}<input type="number" min={1} max={10} step={0.1} value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value })} className={field}/></label>)}</div>
                    <Primary disabled={busy || !draft.from || !draft.until}>이벤트 저장</Primary>
                </form>
            </Fold>
    </>;
}
