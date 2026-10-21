'use client';
/**
 * v3.402 길드(새 토대). 창설·코드 가입, 주간 길드 목표(길드원 각자 수령), 길드원 기여, 이번 주 길드 기록판, 길드 관리(길드장).
 * 서버 API(/api/guild: create · join · rename · kick · claim · leave)와 규칙은 전과 같습니다. 개인 능력치 보너스는 없습니다.
 */
import { useEffect, useState } from 'react';
import { Flag, Users, Copy, Check, Trophy, Crown, LogOut } from 'lucide-react';
import type { State } from '@/game/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SectionHeader, FoldSection, StatBar, ConfirmAction, formatExact } from '@/components/ui/game';
import { GUILD_CREATE_COST, GUILD_RENAME_COST, GUILD_MAX_MEMBERS } from '@/game/data/guild';
import type { GuildInfo } from '@/components/game/use-game';
import { cn } from '@/lib/utils';

type Props = { s: State; busy: boolean; info: GuildInfo | null; error: string; load: () => Promise<void>; act: (body: Record<string, unknown>) => Promise<boolean> };
const fmt = formatExact;
const field = 'h-10 min-w-0 flex-1 rounded-m border border-line bg-surface-0 px-3 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40';
const Card = ({ title, icon, aside, children, className }: { title?: React.ReactNode; icon?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) => <section className={cn('grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1', className)}>
    {title && <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="inline-flex items-center gap-1.5 font-display text-m font-bold">{icon}{title}</h2>{aside && <span className="text-xs text-ink-3">{aside}</span>}</header>}{children}</section>;
const ErrorLine = ({ error }: { error: string }) => error ? <p className="rounded-m border border-danger/50 bg-danger/10 px-3 py-2 text-s" role="alert">{error}</p> : null;
const Primary = (p: React.ComponentProps<typeof Button>) => <Button type="button" size="sm" {...p} className={cn('bg-accent text-accent-ink hover:bg-accent/90', p.className)}/>;

export function GuildScreen({ s, busy, info, error, load, act }: Props) {
    const [name, setName] = useState('단풍개척단'), [code, setCode] = useState(''), [rename, setRename] = useState(''), [copied, setCopied] = useState(false);
    useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
    useEffect(() => { if (info?.guild) { const t = setTimeout(() => setRename(info.guild!.name), 0); return () => clearTimeout(t); } }, [info?.guild]);
    const copy = async () => { try { await navigator.clipboard.writeText(info?.guild?.code || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 클립보드 없음 */ } };
    const board = <Card title={<>이번 주 길드 기록판 <small className="font-num text-xs font-normal text-ink-3">{info?.week}</small></>} icon={<Trophy size={16} className="text-accent"/>} aside={<span title="처치 1 · 던전 정복 20 · 보스 5 · 무릉도장 최고 층 10">주간 점수 · 월요일 0시(한국 시간) 초기화</span>}>
        {info?.board.length ? <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>길드</TableHead><TableHead>점수</TableHead></TableRow></TableHeader>
            <TableBody>{info.board.map(r => <TableRow key={r.id} className={cn(r.self && 'bg-accent-soft')}><TableCell className="font-num">{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (내 길드)' : ''}</TableCell><TableCell className="font-num"><b>{fmt(r.points)}</b></TableCell></TableRow>)}</TableBody></Table>
            : <p className="text-xs text-ink-3">이번 주 기록이 있는 길드가 아직 없습니다.</p>}
    </Card>;
    if (!info) return <div className="grid gap-4 text-ink-1"><SectionHeader as="h1" eyebrow="GUILD HALL" title="길드" description="불러오는 중…"/><ErrorLine error={error}/></div>;
    if (!info.guild) return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="GUILD HALL" title="함께 모험할 길드" description={`길드는 계정 단위로 최대 ${GUILD_MAX_MEMBERS}명. 주간 길드 목표를 함께 채우면 길드원 각자가 세계석을 받고, 길드 채팅이 열립니다. 능력치 보너스는 없습니다.`}/>
        <ErrorLine error={error}/>
        <div className="grid gap-3 lg:grid-cols-2">
            <Card title="길드 창설" icon={<Flag size={16} className="text-accent"/>}><p className="text-xs leading-relaxed text-ink-2">창설 비용 {GUILD_CREATE_COST.toLocaleString()} G. 창설자가 길드장이 되고 가입 코드를 받습니다.</p>
                <div className="flex flex-wrap gap-2"><input className={field} value={name} maxLength={16} onChange={e => setName(e.target.value)} aria-label="길드 이름"/><Primary className="h-10" disabled={busy || s.gold < GUILD_CREATE_COST || name.trim().length < 2} onClick={() => act({ action: 'create', name })}>{GUILD_CREATE_COST.toLocaleString()} G로 창설</Primary></div></Card>
            <Card title="코드로 가입" icon={<Users size={16} className="text-accent"/>}><p className="text-xs leading-relaxed text-ink-2">길드장에게 받은 6자 가입 코드를 입력하세요.</p>
                <div className="flex flex-wrap gap-2"><input className={cn(field, 'font-num uppercase')} value={code} maxLength={8} placeholder="예: K7PQ2M" onChange={e => setCode(e.target.value.toUpperCase())} aria-label="가입 코드"/><Button type="button" size="sm" variant="outline" className="h-10" disabled={busy || code.trim().length < 6} onClick={() => act({ action: 'join', code })}>가입</Button></div></Card>
        </div>
        {board}
    </div>;
    const g = info.guild;
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="GUILD HALL" title={<span className="inline-flex flex-wrap items-center gap-2">{g.name}{g.leader && <span className="inline-flex items-center gap-1 rounded-s bg-gold-ink/15 px-1.5 py-0.5 text-xs font-semibold text-gold-ink"><Crown size={12}/> 길드장</span>}</span>} description={`길드원 ${g.members.length} / ${GUILD_MAX_MEMBERS} · 이번 주 ${fmt(g.points)}점`}
            actions={<ConfirmAction icon={<LogOut size={14}/>} label="길드 탈퇴" title="길드를 떠날까요?" description={g.leader ? '길드장이 떠나면 가장 먼저 가입한 길드원이 길드장이 됩니다. 혼자였다면 길드가 사라집니다.' : '이번 주 기여와 받은 보상은 그대로입니다.'} confirmLabel="탈퇴" disabled={busy} onConfirm={() => act({ action: 'leave' })}/>}/>
        <ErrorLine error={error}/>
        {g.leader && <FoldSection title={<span className="inline-flex items-center gap-1.5"><Crown size={15} className="text-gold-ink"/> 길드 관리</span>} summary="가입 코드 · 이름 변경 · 길드원 내보내기">
            <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-2 rounded-m bg-surface-1 p-3"><h3 className="text-s font-semibold">가입 코드 <code className="ml-1 rounded-s bg-surface-3 px-1.5 py-0.5 font-num text-s tracking-widest">{g.code}</code></h3><p className="text-xs text-ink-3">길드원에게 알려주세요.</p><Button type="button" size="sm" variant="outline" className="justify-self-start" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} 코드 복사</Button></div>
                <div className="grid gap-2 rounded-m bg-surface-1 p-3"><h3 className="text-s font-semibold">이름 변경 <small className="font-num text-xs font-normal text-ink-3">{GUILD_RENAME_COST} G</small></h3><div className="flex flex-wrap gap-2"><input className={field} value={rename} maxLength={16} onChange={e => setRename(e.target.value)} aria-label="길드 이름 변경"/><Button type="button" size="sm" variant="outline" className="h-10" disabled={busy || s.gold < GUILD_RENAME_COST || rename.trim().length < 2 || rename.trim() === g.name} onClick={() => act({ action: 'rename', name: rename })}>변경</Button></div></div>
            </div>
            <div className="grid gap-2 rounded-m bg-surface-1 p-3"><h3 className="text-s font-semibold">길드원 내보내기</h3><p className="text-xs text-ink-3">내보낸 길드원은 코드로 다시 가입할 수 있습니다.</p>
                <ul className="grid gap-1.5">{g.members.filter(m => !m.self).map(m => <li key={m.account} className="flex items-center justify-between gap-2 rounded-m border border-line bg-surface-2 px-3 py-2 text-s"><span>{m.name}<small className="ml-2 font-num text-xs text-ink-3">이번 주 {fmt(m.points)}점</small></span><ConfirmAction size="xs" className="pointer-coarse:min-h-11" label="내보내기" title={`${m.name}을(를) 내보낼까요?`} description="길드에서 내보냅니다. 다시 가입하려면 코드가 필요합니다." confirmLabel="내보내기" disabled={busy} onConfirm={() => act({ action: 'kick', target: m.account })}/></li>)}{g.members.length <= 1 && <li className="text-xs text-ink-3">아직 다른 길드원이 없습니다.</li>}</ul></div>
        </FoldSection>}
        <Card title="주간 길드 목표" aside="길드원 수에 비례 · 달성하면 각자 한 번씩 수령">
            <ul className="grid gap-2 lg:grid-cols-2">{g.goals.map(goal => { const done = goal.progress >= goal.target; return <li key={goal.id} className={cn('grid gap-1.5 rounded-m border p-3', done ? 'border-ok/40 bg-ok/5' : 'border-line bg-surface-1')}>
                <div className="flex items-start justify-between gap-2"><div className="grid gap-0.5"><strong className="text-s">{goal.title}</strong><small className="font-num text-xs text-ink-3">{fmt(goal.progress)} / {fmt(goal.target)} · 세계석 +{goal.pearls}</small></div>
                    {done && (goal.claimed ? <span className="inline-flex items-center gap-1 text-xs text-ok"><Check size={13}/> 받음</span> : <Primary size="xs" className="pointer-coarse:min-h-11" disabled={busy} onClick={() => act({ action: 'claim', goal: goal.id })}>보상 받기</Primary>)}</div>
                <StatBar size="s" tone={done ? 'exp' : 'accent'} value={goal.progress} max={goal.target} showText={false}/>
            </li>; })}</ul>
        </Card>
        <Card title="길드원 · 이번 주 기여" aside="5분마다 반영">
            <div className="overflow-x-auto"><Table className="min-w-[560px]"><TableHeader><TableRow><TableHead>모험가</TableHead><TableHead>처치</TableHead><TableHead>던전</TableHead><TableHead>보스</TableHead><TableHead>무릉도장</TableHead><TableHead>점수</TableHead></TableRow></TableHeader>
                <TableBody>{g.members.map(m => <TableRow key={m.account} className={cn(m.self && 'bg-accent-soft')}><TableCell>{m.leader && <Crown size={12} className="mr-1 inline text-gold-ink"/>}{m.name}{m.self ? ' (나)' : ''}</TableCell><TableCell className="font-num">{fmt(m.totals.catches)}</TableCell><TableCell className="font-num">{m.totals.clears}</TableCell><TableCell className="font-num">{m.totals.bosses}</TableCell><TableCell className="font-num">{m.totals.abyss}층</TableCell><TableCell className="font-num"><b>{fmt(m.points)}</b></TableCell></TableRow>)}</TableBody></Table></div>
        </Card>
        {board}
    </div>;
}
