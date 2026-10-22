'use client';
/**
 * v3.389 사냥 화면 알림 묶음(새 토대). 부재중 정산 → 이벤트 → 해커 → 안내 팁 순서로, 첫 줄만 보이고 나머지는 펼칩니다.
 * 제단 알림(AltarNotice)은 제 모양을 가지고 있어 묶음 아래에 그대로 둡니다. 동기화 상태(base)만 봅니다.
 */
import { memo, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Leaf, Sparkles, Terminal } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { eventLabel } from '@/game/data/events';
import { tipAt } from '@/game/data/tips';
import { isHackerJob } from '@/game/data/hacker';
import { useNotices } from '@/components/game/notice-settings';
import { AltarNotice } from '@/components/game/altar-notice';
import { formatExact } from '@/components/ui/game';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'gold' | 'info' | 'danger' | 'ink';
const TONE: Record<Tone, string> = { ok: 'border-ok/40 bg-ok/10 text-ink-1', gold: 'border-gold-ink/40 bg-gold-ink/10 text-ink-1', info: 'border-info/40 bg-info/10 font-num text-ink-1', danger: 'border-danger/50 bg-danger/10 text-ink-1', ink: 'border-line bg-surface-2 text-ink-2' };
type Item = { key: string; tone: Tone; icon: ReactNode; body: ReactNode; action?: ReactNode };

export const Notices = memo(function Notices({ base: s, send, setView }: { base: State; send: (a: Action) => void; setView: (v: string) => void }) {
    const show = useNotices();
    /** v27.44 제단 축복이 섞이면 축복을 뺀 이벤트만 배너에(축복은 제단 알림 줄). */
    const banner = s.event && s.event.banner !== undefined ? s.event.banner : s.event;
    const [tip, setTip] = useState(0), [open, setOpen] = useState(false);
    useEffect(() => { const timer = window.setInterval(() => setTip(v => v + 1), 14000); return () => window.clearInterval(timer); }, []);
    // v3.255 부재중 정산 알림은 12초 보여 준 뒤 스스로 닫습니다(확인 단추와 같은 처리). 내용은 획득 기록 · 통계에 남습니다.
    const offlineKey = s.lastOffline ? `${s.lastOffline.seconds}:${s.lastOffline.kills}:${s.lastOffline.gold}` : '';
    useEffect(() => { if (!offlineKey) return; const timer = window.setTimeout(() => send({ type: 'offlineDismiss' }), 12000); return () => window.clearTimeout(timer); }, [offlineKey, send]);
    const items: Item[] = [];
    if (s.lastOffline && show('offline')) {
        const r = s.lastOffline.rares, rares = r ? [r.mimic ? ` · 까미 ${r.mimic}` : '', r.nuri ? ` · 누리 ${r.nuri}` : '', r.slime ? ` · 슬라임 ${r.slime}` : ''].join('') : '';
        items.push({ key: 'offline', tone: 'ok', icon: <Leaf size={15}/>, body: `부재중 사냥 정산 · ${Math.floor(s.lastOffline.seconds / 60)}분 동안 ${s.lastOffline.kills}마리 처치 · +${formatExact(s.lastOffline.gold)} G${rares}`, action: <button type="button" aria-label="부재중 정산 알림 닫기" className="grid size-8 shrink-0 place-items-center rounded-m text-ink-2 hover:bg-surface-3 hover:text-ink-1 pointer-coarse:size-11" onClick={() => send({ type: 'offlineDismiss' })}><Check size={14}/></button> });
    }
    if (banner && show('event')) items.push({ key: 'event', tone: 'gold', icon: <Sparkles size={15}/>, body: <><b className="mr-1 font-semibold">이벤트</b>{eventLabel(banner)}</> });
    if (isHackerJob(s.job) && show('hacker')) items.push({ key: 'hacker', tone: 'info', icon: <Terminal size={15}/>, body: <><b className="mr-1 font-semibold">해커</b>{s.running ? '브루트포스 실행 중 · 사냥 대신 비트·권한 경험치를 쌓습니다.' : '해커는 사냥하지 않습니다. 시작하면 브루트포스가 돌아갑니다.'} 침투 작전·해킹은 ‘해킹’ 메뉴에서.</> });
    // v3.18 해커의 방송 탈취: 서명이 고정된 문구를 이벤트 배너 자리에 띄웁니다.
    if (s.hackFeed?.broadcast && show('hacker')) items.push({ key: 'broadcast', tone: 'info', icon: <Sparkles size={15}/>, body: <><b className="mr-1 font-semibold">[해커 {s.hackFeed.broadcast.by}]</b>{s.hackFeed.broadcast.text}</> });
    if (s.hackFeed?.root && show('hacker')) items.push({ key: 'root', tone: 'danger', icon: <Sparkles size={15}/>, body: <><b className="mr-1 font-semibold">ROOT ACCESS</b>[해커 {s.hackFeed.root.by}]이(가) 서버의 루트 권한을 얻었습니다.</> });
    if (!s.lastOffline && show('tip')) items.push({ key: 'tip', tone: 'ink', icon: <Leaf size={15}/>, body: tipAt(tip) });
    const shown = open ? items : items.slice(0, 1);
    return <div className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-live="polite">
        {shown.map(it => <div key={it.key} role="status" className={cn('flex items-center gap-2 rounded-m border px-3 py-2 text-s', TONE[it.tone])}><span className="shrink-0" aria-hidden="true">{it.icon}</span><span className="min-w-0 flex-1">{it.body}</span>{it.action}</div>)}
        {items.length > 1 && <Button type="button" variant="ghost" size="xs" className="h-auto px-1.5 py-1 text-xs pointer-coarse:min-h-11 justify-self-start text-ink-3 hover:text-ink-1" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? '알림 접기' : `알림 ${items.length - 1}개 더 보기`}</Button>}
        {show('altar') && <AltarNotice s={s} setView={setView}/>}
    </div>;
});
