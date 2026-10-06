'use client';
import type { PanelProps } from './panel-props';
import { useEffect, useState } from 'react';
import { Copy, Check, Crown, Users, Terminal } from 'lucide-react';
import { Heading, Meter, format } from './shared';
import { ConfirmButton } from './confirm-button';
import { CREW } from '@/game/data/crew';
import { isHackerJob } from '@/game/data/hacker';
import type { CrewInfo } from './use-game';

type Props = PanelProps & { info: CrewInfo | null; error: string; load: () => Promise<void>; act: (body: Record<string, unknown>) => Promise<boolean> };
/**
 * v3.29 해커 조직 화면(4-a): 창설(성향 선택)·초대 코드 가입, 조직원·기여·조직 등급, 조직장 관리(코드 재발급·위임·내보내기).
 * v3.30 합동 작전(주간): 조직원이 뚫은 침투 노드 합계, 단계 목표, 조직원별 기여. 조직 모듈·조직 순위는 다음 단계에서 붙습니다.
 */
export function Crew({ s, busy, info, error, load, act }: Props) {
    const [name, setName] = useState(''), [side, setSide] = useState('gray'), [code, setCode] = useState(''), [amount, setAmount] = useState('50'), [copied, setCopied] = useState(false);
    useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
    const hacker = isHackerJob(s.job), bits = Math.floor(s.hacker?.bits || 0), tier = s.hacker?.tier || 0;
    const copy = async () => { try { await navigator.clipboard.writeText(info?.crew?.code || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 클립보드 없음 */ } };
    if (!info) return <><Heading eyebrow="HACKER CREW" title="해커 조직" description="불러오는 중…"/>{error && <p className="login-error" role="alert">{error}</p>}</>;
    if (!info.crew) return <>
        <Heading eyebrow="HACKER CREW" title="해커 조직" description={`해커 계열끼리 꾸리는 조직입니다. 정원 ${CREW.capacity(1)}명에서 조직 등급 2마다 1명씩 늘어 최대 ${CREW.capacity(CREW.maxGrade)}명. 조직원이 기여한 비트가 조직 자금과 조직 경험치가 됩니다. 매주 합동 작전으로 조직원이 뚫은 침투 노드를 합산해 단계 보상을 받습니다.`}/>
        {error && <p className="login-error" role="alert">{error}</p>}
        {!hacker && <div className="notice">해커 계열 직업일 때만 조직을 만들거나 들어갈 수 있습니다.</div>}
        <div className="guild-entry-grid">
            <section className="panel guild-join-card"><Terminal size={42}/><div><h2>조직 창설</h2><p>비트 {CREW.createBits} · 해킹 I 해금 필요. 성향은 바꿀 수 없습니다: 회색은 해커 계열 누구나, 화이트는 해커·화이트 해커, 블랙은 해커·블랙 해커.</p></div>
                <div className="guild-join-form">
                    <input value={name} maxLength={CREW.nameMax} placeholder="조직 이름" onChange={e => setName(e.target.value)} aria-label="조직 이름"/>
                    <select value={side} onChange={e => setSide(e.target.value)} aria-label="조직 성향">{info.sides.map(x => <option key={x.id} value={x.id} disabled={!x.allowed}>{x.name}{x.allowed ? '' : ' (지금 직업 불가)'}</option>)}</select>
                    <button className="primary" disabled={busy || !hacker || tier < 1 || bits < CREW.createBits || name.trim().length < CREW.nameMin} onClick={() => act({ action: 'create', name, side })}>비트 {CREW.createBits}로 창설</button>
                </div></section>
            <section className="panel guild-join-card"><Users size={42}/><div><h2>코드로 가입</h2><p>조직원에게 받은 {CREW.codeLength}자 초대 코드를 입력하세요. 조직 성향에 맞는 직업이어야 합니다.</p></div>
                <div className="guild-join-form"><input value={code} maxLength={8} placeholder="예: K7PQ2M" onChange={e => setCode(e.target.value.toUpperCase())} aria-label="초대 코드"/><button className="secondary" disabled={busy || !hacker || code.trim().length < CREW.codeLength} onClick={() => act({ action: 'join', code })}>가입</button></div></section>
        </div>
    </>;
    const c = info.crew, n = Math.max(0, Math.floor(Number(amount) || 0));
    return <>
        <Heading eyebrow="HACKER CREW" title={c.name} description={`${c.sideName} 조직 · 조직원 ${c.members.length} / ${c.capacity} · 조직 등급 ${c.grade} · 조직 자금 비트 ${format(c.vault)}`}>
            {c.leader && <span className="badge"><Crown size={12}/> 조직장</span>}
        </Heading>
        {error && <p className="login-error" role="alert">{error}</p>}
        <section className="panel hacker-section">
            <div className="section-title"><h2>합동 작전</h2><span>{c.op.key} 주 · 월요일 0시(한국 시간)에 새로 시작</span></div>
            <Meter value={Math.min(c.op.targets[2], c.op.nodes)} max={c.op.targets[2]} label={`뚫은 노드 ${format(c.op.nodes)} / ${format(c.op.goal)} (목표)`}/>
            <ol className="crew-steps">{c.op.targets.map((need, i) => { const r = CREW.op.reward(i + 1); return <li key={i} className={c.op.steps > i ? 'done' : ''}>
                <b>{i + 1}단계 · 노드 {format(need)}</b><small>조직원 비트 +{r.bits} · 권한 +{r.exp} · 조직 자금 +{r.fund}</small></li>; })}</ol>
            <p className="footnote">조직원이 각자 침투 작전에서 뚫은 노드(이탈·추적 모두)가 합산됩니다. 내 기여 {format(c.op.mine)}노드{c.op.pending ? ` · 아직 올리지 않은 ${c.op.pending}노드는 침투 작전이 끝나면 올라갑니다` : ''}. 단계 보상은 그 주에 1노드 이상 뚫은 조직원이 다음 동기화 때 받고, 지난주 보상도 한 주 동안 받을 수 있습니다. 주 중에 조직원이 들어오면 목표가 그만큼 늘어납니다.</p>
        </section>
        <section className="panel hacker-section">
            <div className="section-title"><h2>조직 등급 · 기여</h2><span>오늘 더 기여할 수 있는 비트 {format(c.depositLeft)}</span></div>
            {c.need ? <Meter value={Math.min(c.need, c.into)} max={c.need} label={`조직 등급 ${c.grade + 1}까지`}/> : <p className="footnote">최고 조직 등급입니다.</p>}
            <p className="footnote">기여한 비트는 되돌릴 수 없고, 1비트 = 조직 경험치 1입니다. 하루에 권한 등급 × 50까지 기여할 수 있습니다. 기여한 비트는 조직 자금으로 모여 다음 단계의 조직 모듈 유지비로 쓰입니다.</p>
            <div className="hack-form"><input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" aria-label="기여할 비트"/>
                <button className="primary" disabled={busy || !hacker || n < 1 || n > c.depositLeft || bits < n} onClick={() => act({ action: 'deposit', amount: n })}>기여하기</button></div>
        </section>
        <section className="panel hacker-section">
            <div className="section-title"><h2>초대 코드</h2><span>조직원 모두에게 보입니다</span></div>
            <div className="hack-form"><code className="crew-code">{c.code}</code><button type="button" className="secondary" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} 복사</button>
                {c.leader && <ConfirmButton label="코드 재발급" title="초대 코드를 새로 만들까요?" description="지금 코드는 바로 쓸 수 없게 됩니다." disabled={busy} onConfirm={() => act({ action: 'code' })}/>}</div>
        </section>
        <section className="panel hacker-section">
            <div className="section-title"><h2>조직원</h2><span>조직장이 {CREW.leaderIdleDays}일 활동이 없으면 기여 1위에게 넘어갑니다 · 해커 계열이 아닌 채로 {CREW.leaveDays}일이면 자동 탈퇴</span></div>
            <ul className="crew-members">{c.members.map(m => <li key={m.id} className={m.self ? 'self' : ''}>
                <b>{m.leader && <Crown size={12}/>} {m.name}{m.self ? ' (나)' : ''}</b>
                <small>이번 주 {format(m.nodes)}노드 · 기여 {format(m.deposited)}{m.idleDays ? ` · ${m.idleDays}일 전 활동` : ''}{m.off ? ' · 해커 계열 아님' : ''}</small>
                {c.leader && !m.self && <span className="crew-actions">
                    <ConfirmButton label="위임" title={`${m.name}에게 조직장을 넘길까요?`} description="되돌리려면 새 조직장이 다시 넘겨야 합니다." disabled={busy} onConfirm={() => act({ action: 'delegate', target: m.id })}/>
                    <ConfirmButton label="내보내기" title={`${m.name}을(를) 내보낼까요?`} description="기여한 비트는 조직 자금에 남습니다." disabled={busy} onConfirm={() => act({ action: 'kick', target: m.id })}/>
                </span>}
            </li>)}</ul>
            <ConfirmButton label="조직 탈퇴" title="조직에서 나갈까요?" description={c.members.length === 1 ? '마지막 조직원이라 조직과 조직 자금이 사라집니다.' : '기여한 비트는 조직 자금에 남습니다. 조직장이면 기여 1위에게 넘어갑니다.'} disabled={busy} onConfirm={() => act({ action: 'leave' })}/>
        </section>
    </>;
}
