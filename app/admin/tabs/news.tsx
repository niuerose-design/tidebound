import { Primary, Sm, NEWS_KINDS, Fold, muted, field, CLEAR_SCOPES } from '../parts';
import { cn } from '@/lib/utils';
import { kstIso } from '@/game/data/time';
import type { Admin } from '../use-admin';

/** v3.413 운영자 페이지 탭(page.tsx 에서 분리). 화면과 문구는 그대로입니다. */
export function NewsTab({ a }: { a: Admin }) {
    const { key, news, newsName, setNewsName, newsText, setNewsText, newsTag, setNewsTag, busy, clearChat, postNews } = a;
    return <>
            <Fold title="소식 올리기">
                <div className="grid gap-2.5">
                    <div className="flex flex-wrap items-end gap-2">
                        <label className="grid gap-1 text-s">모험가 이름<input value={newsName} onChange={e => setNewsName(e.target.value)} maxLength={20} className={field}/></label>
                        <label className="flex items-center gap-1.5 pb-2 text-s"><input type="checkbox" checked={newsTag} onChange={e => setNewsTag(e.target.checked)}/> [테스트] 붙이기</label>
                    </div>
                    <div className="flex flex-wrap gap-1.5">{NEWS_KINDS.map(([id, label]) => <Sm key={id} disabled={busy || !key} onClick={() => void postNews(id)}>{label}</Sm>)}</div>
                    <form onSubmit={e => { e.preventDefault(); void postNews('custom'); }} className="flex gap-2">
                        <input value={newsText} onChange={e => setNewsText(e.target.value)} maxLength={200} placeholder="직접 입력(운영 공지 한 줄, 200자)" className={cn(field, 'flex-1')}/>
                        <Primary disabled={busy || !key || !newsText.trim()}>올리기</Primary>
                    </form>
                </div>
            </Fold>
            <Fold title="지우기" open={false} note="되돌릴 수 없음">
                <div className="flex flex-wrap gap-1.5">{CLEAR_SCOPES.map(([scope, label, what]) => <Sm key={scope} disabled={busy || !key} title={what} onClick={() => void clearChat(scope, what)}>{label}</Sm>)}</div>
                <p className="mt-2 text-xs text-ink-3">소식은 기록판 ‘소식’ 탭, 전체 채팅은 ‘채팅’ 탭의 전체, 길드 채팅은 모든 길드의 ‘길드’ 채널입니다. 지운 뒤 새로 올라오는 줄은 그대로 쌓입니다.</p>
            </Fold>
            {news && <Fold title="최근 소식" note={`${news.length}줄`}>{!news.length && <p className="text-s text-ink-3">없습니다.</p>}
                <ul className="grid gap-1 text-s">{[...news].reverse().map(r => <li key={r.id} className={cn(r.hacker && 'text-danger')}><span className={muted}>{kstIso(r.at).slice(5, 16).replace('T', ' ')} · {r.name}</span> {r.text}</li>)}</ul></Fold>}
    </>;
}
