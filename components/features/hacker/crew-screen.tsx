'use client';
/**
 * v3.406 해커 조직 화면(새 토대). v3.29 창설(성향 선택) · 초대 코드 가입, 조직원 · 기여 · 조직 등급, 조직장 관리(코드 재발급 · 위임 · 내보내기).
 * v3.32 합동 작전(주간) · v3.33 조직 모듈. 서버 API 와 규칙은 옛 crew-panel 그대로이고 틀만 토큰 · shadcn · 게임 키트로 바꿨습니다.
 */
import type { PanelProps } from '@/components/game/panel-props';
import { useEffect, useState } from 'react';
import { Copy, Check, Crown, Users, Terminal } from 'lucide-react';
import { SectionHeader, StatBar, ConfirmAction, formatExact as format } from '@/components/ui/game';
import { CREW, CREW_MODULES } from '@/game/data/crew';
import { isHackerJob } from '@/game/data/hacker';
import type { CrewInfo } from '@/components/game/use-game';
import { Card, Head, Note, Box, Row, Primary, Sm, field } from './parts';
import { cn } from '@/lib/utils';

type Props = PanelProps & { info: CrewInfo | null; error: string; load: () => Promise<void>; act: (body: Record<string, unknown>) => Promise<boolean> };
const EntryCard = ({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) => <Card className="grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3"><span className="text-gold-ink" aria-hidden="true">{icon}</span><div className="grid gap-1"><h2 className="font-display text-m font-bold">{title}</h2><p className="text-xs leading-relaxed text-ink-2">{desc}</p></div><div className="col-span-2 grid gap-2">{children}</div></Card>;

export function CrewScreen({ s, busy, info, error, load, act }: Props) {
    const [name, setName] = useState(''), [side, setSide] = useState('gray'), [code, setCode] = useState(''), [amount, setAmount] = useState('50'), [copied, setCopied] = useState(false);
    useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
    const hacker = isHackerJob(s.job), bits = Math.floor(s.hacker?.bits || 0), tier = s.hacker?.tier || 0;
    const copy = async () => { try { await navigator.clipboard.writeText(info?.crew?.code || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 클립보드 없음 */ } };
    const err = error ? <Note tone="danger" role="alert">{error}</Note> : null;
    if (!info) return <div className="grid gap-4 text-ink-1"><SectionHeader as="h1" eyebrow="HACKER CREW" title="해커 조직" description="불러오는 중…"/>{err}</div>;
    if (!info.crew) return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="HACKER CREW" title="해커 조직" description={`해커 계열끼리 꾸리는 조직입니다. 정원 ${CREW.capacity(1)}명에서 조직 등급 2마다 1명씩 늘어 최대 ${CREW.capacity(CREW.maxGrade)}명. 조직원이 기여한 비트가 조직 자금과 조직 경험치가 됩니다. 매주 합동 작전으로 조직원이 뚫은 침투 노드를 합산해 단계 보상을 받습니다.`}/>
        {err}
        {!hacker && <Note tone="warn">해커 계열 직업일 때만 조직을 만들거나 들어갈 수 있습니다.</Note>}
        <div className="grid gap-3 lg:grid-cols-2">
            <EntryCard icon={<Terminal size={36}/>} title="조직 창설" desc={`비트 ${CREW.createBits} · 해킹 I 해금 필요. 성향은 바꿀 수 없습니다: 회색은 해커 계열 누구나, 화이트는 해커·화이트 해커, 블랙은 해커·블랙 해커.`}>
                <input className={field} value={name} maxLength={CREW.nameMax} placeholder="조직 이름" onChange={e => setName(e.target.value)} aria-label="조직 이름"/>
                <select className={field} value={side} onChange={e => setSide(e.target.value)} aria-label="조직 성향">{info.sides.map(x => <option key={x.id} value={x.id} disabled={!x.allowed}>{x.name}{x.allowed ? '' : ' (지금 직업 불가)'}</option>)}</select>
                <Primary type="button" className="justify-self-start" disabled={busy || !hacker || tier < 1 || bits < CREW.createBits || name.trim().length < CREW.nameMin} onClick={() => act({ action: 'create', name, side })}>비트 {CREW.createBits}로 창설</Primary>
            </EntryCard>
            <EntryCard icon={<Users size={36}/>} title="코드로 가입" desc={`조직원에게 받은 ${CREW.codeLength}자 초대 코드를 입력하세요. 조직 성향에 맞는 직업이어야 합니다.`}>
                <Row><input className={cn(field, 'font-mono uppercase tracking-[.15em]')} value={code} maxLength={8} placeholder="예: K7PQ2M" onChange={e => setCode(e.target.value.toUpperCase())} aria-label="초대 코드"/><Sm disabled={busy || !hacker || code.trim().length < CREW.codeLength} onClick={() => act({ action: 'join', code })}>가입</Sm></Row>
            </EntryCard>
        </div>
    </div>;
    const c = info.crew, n = Math.max(0, Math.floor(Number(amount) || 0));
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="HACKER CREW" title={<>{c.name}{c.leader && <span className="ml-2 inline-flex items-center gap-1 rounded-s bg-gold-ink/15 px-1.5 py-0.5 align-middle text-xs font-semibold text-gold-ink"><Crown size={12}/> 조직장</span>}</>} description={`${c.sideName} 조직 · 조직원 ${c.members.length} / ${c.capacity} · 조직 등급 ${c.grade} · 조직 자금 비트 ${format(c.vault)}`}
            actions={<ConfirmAction label="조직 탈퇴" title="조직에서 나갈까요?" description={c.members.length === 1 ? '마지막 조직원이라 조직과 조직 자금이 사라집니다.' : '기여한 비트는 조직 자금에 남습니다. 조직장이면 기여 1위에게 넘어갑니다.'} disabled={busy} onConfirm={() => act({ action: 'leave' })}/>}/>
        {err}
        <Card>
            <Head title="합동 작전" aside={`${c.op.key} 주 · 월요일 0시(한국 시간)에 새로 시작`}/>
            <StatBar tone="accent" size="s" value={Math.min(c.op.targets[2], c.op.nodes)} max={c.op.targets[2]} label={`뚫은 노드 ${format(c.op.nodes)} / ${format(c.op.goal)} (목표)`}/>
            <ol className="grid gap-1.5 sm:grid-cols-3">{c.op.targets.map((need, i) => { const r = CREW.op.reward(i + 1); return <li key={i} className={cn('grid gap-0.5 rounded-m border border-line bg-surface-1 px-2.5 py-2 text-xs', c.op.steps > i && 'border-ok/60 bg-ok/10')}>
                <b>{c.op.steps > i ? <span className="text-ok">✓ </span> : null}{i + 1}단계 · 노드 {format(need)}</b><small className="text-ink-3">조직원 비트 +{r.bits} · 권한 +{r.exp} · 조직 자금 +{r.fund}</small></li>; })}</ol>
            <Note>조직원이 각자 침투 작전에서 뚫은 노드(이탈·추적 모두)가 합산됩니다. 내 기여 {format(c.op.mine)}노드{c.op.pending ? ` · 아직 올리지 않은 ${c.op.pending}노드는 침투 작전이 끝나면 올라갑니다` : ''}. 단계 보상은 그 주에 1노드 이상 뚫은 조직원이 다음 동기화 때 받고, 지난주 보상도 한 주 동안 받을 수 있습니다. 주 중에 조직원이 들어오면 목표가 그만큼 늘어납니다.</Note>
        </Card>
        <Card>
            <Head title="조직 모듈" aside={`슬롯 ${c.modules.length} / ${c.slots}(조직 등급만큼) · 다음 주 유지비 ${format(c.upkeep)} · 조직 자금 ${format(c.vault)}`}/>
            <Note>조직장이 켜고 끕니다. 켤 때 그 주 유지비를 내고, 월요일 0시마다 조직 자금에서 다시 냅니다. 조직 자금이 모자라면 뒤에 켠 모듈부터 꺼지고, 끈 모듈의 유지비는 돌려받지 않습니다. 효과는 해커 계열 조직원에게만 적용됩니다.</Note>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{CREW_MODULES.filter(m => !m.side || m.side === c.side).map(m => { const on = c.modules.includes(m.id); return <Box key={m.id} on={on}>
                <b>{m.name}{m.side ? ` · ${c.sideName} 전용` : ''}</b><small>{m.desc} · 주간 유지비 {m.upkeep}</small>
                {c.leader ? <Sm className={cn('justify-self-start', on && 'border-accent bg-accent text-accent-ink hover:bg-accent/90')} aria-pressed={on} disabled={busy || (!on && (c.modules.length >= c.slots || c.vault < m.upkeep))} onClick={() => act({ action: 'module', target: m.id })}>{on ? '가동 중 · 끄기' : '켜기'}</Sm>
                    : <small>{on ? '가동 중' : '꺼짐'}</small>}
            </Box>; })}</div>
        </Card>
        <Card>
            <Head title="조직 등급 · 기여" aside={`오늘 더 기여할 수 있는 비트 ${format(c.depositLeft)}`}/>
            {c.need ? <StatBar tone="exp" size="s" value={Math.min(c.need, c.into)} max={c.need} label={`조직 등급 ${c.grade + 1}까지`}/> : <Note>최고 조직 등급입니다.</Note>}
            <Note>기여한 비트는 되돌릴 수 없고, 1비트 = 조직 경험치 1입니다. 하루에 권한 등급 × 50까지 기여할 수 있습니다. 기여한 비트는 조직 자금으로 모여 조직 모듈 유지비로 쓰입니다.</Note>
            <Row><input className={field} value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" aria-label="기여할 비트"/>
                <Primary type="button" disabled={busy || !hacker || n < 1 || n > c.depositLeft || bits < n} onClick={() => act({ action: 'deposit', amount: n })}>기여하기</Primary></Row>
        </Card>
        <Card>
            <Head title="초대 코드" aside="조직원 모두에게 보입니다"/>
            <Row><code className="font-mono text-l tracking-[.2em] text-accent">{c.code}</code><Sm onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} 복사</Sm>
                {c.leader && <ConfirmAction label="코드 재발급" title="초대 코드를 새로 만들까요?" description="지금 코드는 바로 쓸 수 없게 됩니다." disabled={busy} onConfirm={() => act({ action: 'code' })}/>}</Row>
        </Card>
        <Card>
            <Head title="조직원" aside={`조직장이 ${CREW.leaderIdleDays}일 활동이 없으면 기여 1위에게 넘어갑니다 · 해커 계열이 아닌 채로 ${CREW.leaveDays}일이면 자동 탈퇴`}/>
            <ul className="grid gap-1.5">{c.members.map(m => <li key={m.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-m border border-line bg-surface-1 px-3 py-2 text-s', m.self && 'border-accent/50 bg-accent-soft')}>
                <b className="inline-flex items-center gap-1">{m.leader && <Crown size={12} className="text-gold-ink"/>}{m.name}{m.self ? ' (나)' : ''}</b>
                <small className="text-xs text-ink-3">이번 주 {format(m.nodes)}노드 · 기여 {format(m.deposited)}{m.idleDays ? ` · ${m.idleDays}일 전 활동` : ''}{m.off ? ' · 해커 계열 아님' : ''}</small>
                {c.leader && !m.self && <span className="ml-auto inline-flex gap-1">
                    <ConfirmAction size="xs" label="위임" title={`${m.name}에게 조직장을 넘길까요?`} description="되돌리려면 새 조직장이 다시 넘겨야 합니다." disabled={busy} onConfirm={() => act({ action: 'delegate', target: m.id })}/>
                    <ConfirmAction size="xs" label="내보내기" title={`${m.name}을(를) 내보낼까요?`} description="기여한 비트는 조직 자금에 남습니다." disabled={busy} onConfirm={() => act({ action: 'kick', target: m.id })}/>
                </span>}
            </li>)}</ul>
        </Card>
    </div>;
}
