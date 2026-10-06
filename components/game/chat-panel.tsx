'use client';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, MessageCircle, Send } from 'lucide-react';
import { CHAT_MAX_CHARS, CHAT_COOLDOWN_MS, CHAT_KEEP } from '@/game/data/chat';

export type ChatLine = { id: number; name: string; text: string; at: number; self: boolean; /** v3.26 시스템 알림 종류(hacker = 해킹 공지 빨간 줄, system = 제단·모험가 소식). */ kind?: 'hacker' | 'system' };
/** 열려 있는 동안만 이 간격으로 새 줄을 묻습니다. 닫히거나 탭이 숨으면 멈춥니다. */
const POLL_MS = 8000, KEEP = 120;

/**
 * 전체 채팅. 서버 부하를 줄이려고 (1) 열려 있을 때만 폴링, (2) after 커서로 새 줄만 받기, (3) 보낸 직후 한 번 더 받기만 합니다.
 * 메시지는 서버가 채널당 최근 300줄만 보관합니다.
 */
export type ChatChannel = 'global' | 'guild' | 'news';
function useChat(open: boolean, channel: ChatChannel = 'global') {
    const [lines, setLines] = useState<ChatLine[]>([]), [error, setError] = useState(''), [sending, setSending] = useState(false);
    const last = useRef(0), inflight = useRef(false);
    const pull = useCallback(async () => {
        if (inflight.current) return;
        inflight.current = true;
        try {
            const res = await fetch(`/api/chat?channel=${channel}&after=${last.current}`, { cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.error || '채팅을 불러오지 못했습니다.'); return; }
            const rows = data.rows as ChatLine[];
            if (rows.length) { last.current = rows[rows.length - 1].id; setLines(prev => [...prev, ...rows.filter(r => !prev.some(p => p.id === r.id))].slice(-KEEP)); }
            setError('');
        } catch { setError('연결이 불안정합니다.'); }
        finally { inflight.current = false; }
    }, [channel]);
    useEffect(() => {
        if (!open) return;
        const tick = () => { if (document.visibilityState === 'visible') void pull(); };
        tick();
        const timer = window.setInterval(tick, POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
    }, [open, pull]);
    const send = useCallback(async (text: string) => {
        if (sending) return false;
        setSending(true);
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, text }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.error || '보내지 못했습니다.'); return false; }
            setError('');
            await pull();
            return true;
        } catch { setError('연결이 불안정합니다.'); return false; }
        finally { setSending(false); }
    }, [pull, sending, channel]);
    return { lines, error, sending, send };
}

const hhmm = (at: number) => new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

/** v3.90 전투 화면 재생 프레임마다 다시 그리지 않도록 memo(속성이 바뀔 때만). */
export const ChatPanel = memo(function ChatPanel({ open, playerName, guildName }: { open: boolean; playerName: string; guildName?: string }) {
    const [channel, setChannel] = useState<ChatChannel>('global');
    const active: ChatChannel = channel === 'guild' && !guildName ? 'global' : channel;
    // 채널이 바뀌면 목록을 새로 마운트해 커서와 줄을 처음부터 받습니다.
    return <div className="chat-panel">
        {guildName && <div className="chat-channels" role="tablist" aria-label="채팅 채널">
            <button type="button" role="tab" aria-selected={active === 'global'} className={active === 'global' ? 'active' : ''} onClick={() => setChannel('global')}>전체</button>
            <button type="button" role="tab" aria-selected={active === 'guild'} className={active === 'guild' ? 'active' : ''} onClick={() => setChannel('guild')}>길드 · {guildName}</button>
        </div>}
        <ChatFeed key={active} open={open} playerName={playerName} active={active}/>
    </div>;
});
function ChatFeed({ open, playerName, active }: { open: boolean; playerName: string; active: ChatChannel }) {
    const { lines, error, sending, send } = useChat(open, active);
    const [draft, setDraft] = useState('');
    const listRef = useRef<HTMLDivElement>(null), stick = useRef(true);
    // 맨 아래를 보고 있을 때만 새 줄에 따라 내려갑니다(위로 올려 읽는 중이면 그대로).
    useEffect(() => { const el = listRef.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [lines]);
    const onScroll = () => { const el = listRef.current; if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; };
    const submit = async () => { const text = draft.trim(); if (!text) return; if (await send(text)) { setDraft(''); stick.current = true; } };
    return <div className="chat-feed">
        <div className="chat-list" ref={listRef} onScroll={onScroll} role="log" aria-label={active === 'guild' ? '길드 채팅' : '전체 채팅'} aria-live="polite">
            {lines.length ? lines.map(l => <p key={l.id} className={`chat-line ${l.self ? 'self' : ''} ${l.kind === 'hacker' ? 'hacker-alert' : ''}`}><span className="chat-head"><b className="chat-name" title={l.self ? `${playerName} (나)` : l.name}>{l.name}</b><span className="chat-time">{hhmm(l.at)}</span></span><span className="chat-text">{l.text}</span></p>)
                : <p className="chat-empty"><MessageCircle size={14}/> 아직 메시지가 없습니다. 첫 인사를 남겨 보세요.</p>}
        </div>
        {error && <p className="chat-error" role="alert">{error}</p>}
        <form className="chat-form" onSubmit={e => { e.preventDefault(); void submit(); }}>
            <input value={draft} maxLength={CHAT_MAX_CHARS} placeholder={`${playerName}(으)로 ${active === 'guild' ? '길드' : '전체'} 채팅 · ${CHAT_MAX_CHARS}자`} aria-label="채팅 입력" onChange={e => setDraft(e.target.value)} disabled={sending}/>
            <button type="submit" className="primary small" disabled={sending || !draft.trim()} aria-label="보내기"><Send size={14}/></button>
        </form>
        <small className="chat-note">{draft.length} / {CHAT_MAX_CHARS} · {CHAT_COOLDOWN_MS / 1000}초에 한 줄 · 최근 {CHAT_KEEP}줄만 보관</small>
    </div>;
}

/**
 * v3.39 소식: 서버가 올리는 시스템 줄(모험가 소식 · 제단 · 해킹 공지)만 보는 읽기 전용 목록. 채팅과 같은 방식으로 열려 있을 때만 받습니다.
 */
/** v3.48 소식 줄 색: 보낸 곳(제단·운영·해커)과 소식 종류(칠흑·승천·5차 전직·무릉도장·22성·진급)마다 다르게 칠합니다. */
const NEWS_TONES: [RegExp, string][] = [[/칠흑/, 'onyx'], [/승천/, 'ascend'], [/5차/, 'tier5'], [/무릉도장/, 'abyss'], [/22성/, 'star'], [/진급/, 'rank']];
const newsTone = (l: { name: string; text: string; kind?: string }) => l.kind === 'hacker' ? 'hacker-alert' : l.name === '제단' ? 'news-altar' : l.name === '운영' ? 'news-admin' : `news-${NEWS_TONES.find(([re]) => re.test(l.text))?.[1] || 'plain'}`;
export const NewsFeed = memo(function NewsFeed({ open }: { open: boolean }) {
    const { lines, error } = useChat(open, 'news');
    // v3.48 전투·획득 탭처럼 새 소식이 맨 위에 옵니다(채팅만 아래에서 위로 쌓임).
    return <div className="chat-feed news-feed">
        <div className="chat-list" role="log" aria-label="소식" aria-live="polite">
            {lines.length ? [...lines].reverse().map(l => <p key={l.id} className={`chat-line news-line ${newsTone(l)}`}><span className="chat-head"><b className="chat-name">{l.name}</b><span className="chat-time">{hhmm(l.at)}</span></span><span className="chat-text">{l.text}</span></p>)
                : <p className="chat-empty"><Megaphone size={14}/> 아직 소식이 없습니다. 칠흑 장신구 · 승천 · 5차 전직 · 무릉도장 · 22성 · 장성 진급 · 제단 소식이 여기에 올라옵니다.</p>}
        </div>
        {error && <p className="chat-error" role="alert">{error}</p>}
    </div>;
});
