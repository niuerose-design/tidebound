'use client';
/** v3.17 해커 화면: 권한 등급·비트, 재화 변환(단방향), 침투 작전, 해킹 I(방송 탈취·크래킹), 애드가드 공개 항목. */
import { useState } from 'react';
import type { PanelProps } from './panel-props';
import { Heading, Meter, format, useNow } from './shared';
import { ConfirmButton } from './confirm-button';
import { HACKER, HACKER_ID, PRIVACY_FIELDS, PRIVACY_LABELS, gradeNeed, type PrivacyField } from '@/game/data/hacker';
import { gradeTotal, adguardLevel } from '@/game/systems/hacker';
import { dayKey } from '@/game/data/goals';

const ROMAN = 'I II III IV V VI VII VIII IX X'.split(' ');

export function Hacker({ s, send, busy, setView }: PanelProps) {
    const h = s.hacker || { bits: 0, exp: 0, grade: 1, tier: 0 };
    const now = useNow(60_000), isHacker = s.job === HACKER_ID, today = h.day === dayKey(now);
    const entriesLeft = HACKER.infil.entriesPerDay - (today ? h.entries || 0 : 0), used = today ? h.used || {} : {};
    const base = gradeTotal(h.grade), need = gradeNeed(h.grade), into = Math.max(0, h.exp - base);
    const [convert, setConvert] = useState<{ id: 'sp' | 'pearls'; n: string }>({ id: 'pearls', n: '10' });
    const [guess, setGuess] = useState(''), [message, setMessage] = useState(''), [target, setTarget] = useState('');
    const run = h.infil, next = HACKER.tiers[h.tier], n = h.tier;
    const level = adguardLevel(s), show = new Set(s.privacy?.show || []);
    const togglePrivacy = (f: PrivacyField) => { const nextShow = new Set(show); if (nextShow.has(f)) nextShow.delete(f); else nextShow.add(f); send({ type: 'privacy', value: [...nextShow].join(',') }); };
    const convertN = Math.max(0, Math.floor(Number(convert.n) || 0));
    return <>
        <Heading eyebrow="HACKER" title="해킹" description="싸우는 대신 서버를 건드립니다. 해커로 있는 동안 레벨·경험치는 멈추고, 비트와 권한 등급으로 자랍니다."/>
        {!isHacker && <div className="notice">지금 직업은 해커가 아닙니다. 비트 변환과 기록 확인만 할 수 있고, 침투 작전·해킹은 해커일 때만 실행됩니다.{setView && <button type="button" className="text-button" onClick={() => setView('classes')}>전직 화면</button>}</div>}
        <section className="panel hacker-section hacker-status">
            <div className="hacker-stat"><small>권한 등급</small><strong>{h.grade}</strong></div>
            <div className="hacker-stat"><small>비트</small><strong>{format(Math.floor(h.bits))}</strong></div>
            <div className="hacker-stat"><small>해킹 단계</small><strong>{n ? ROMAN[n - 1] : '-'}</strong></div>
            <div className="hacker-stat"><small>침투 최고 깊이</small><strong>{h.bestDepth || 0}</strong></div>
            <Meter value={Math.min(need, into)} max={need} label="다음 권한 등급까지"/>
            {isHacker && <p className="footnote">{s.running ? '브루트포스 실행 중' : '자동 사냥을 켜면 브루트포스가 돌아갑니다'} · 2초마다 비트 +{HACKER.brute.bits} · 권한 +{HACKER.brute.exp} (오프라인 정산 포함)</p>}
        </section>

        <section className="panel hacker-section">
            <div className="section-title"><h2>침투 작전</h2><span>오늘 남은 입장 {Math.max(0, entriesLeft)} / {HACKER.infil.entriesPerDay}</span></div>
            {!run ? <>
                <p className="footnote">서버 노드를 한 칸씩 뚫습니다. 홀수 칸은 방화벽(서로 다른 숫자 자물쇠: 자리·숫자가 맞으면 S, 숫자만 맞으면 B), 짝수 칸은 포트 스캔(UP·DOWN). 깊을수록 보상이 커지고, 언제든 이탈해 쌓인 보상을 받습니다. 시도를 다 쓰면 추적당해 {Math.round(HACKER.infil.traceKeep * 100)}%만 회수합니다.</p>
                <button className="primary" disabled={busy || !isHacker || entriesLeft <= 0} onClick={() => send({ type: 'infilStart' })}>침투 시작</button>
            </> : <div className="infil-run">
                <div className="infil-head"><b>노드 {run.depth + 1} · {run.node.kind === 'lock' ? `방화벽 · 숫자 ${run.node.size}자리` : `포트 스캔 · 1~${format(run.node.size)}`}</b><span>남은 시도 {run.node.max - run.node.tries} · 쌓인 보상 비트 {run.bank.bits} · 권한 {run.bank.exp}</span></div>
                <ol className="infil-history">{run.node.history.map((x, i) => <li key={i}><code>{x.guess}</code><b className={x.hint === 'OPEN' ? 'ok' : ''}>{x.hint}</b></li>)}</ol>
                <form className="infil-form" onSubmit={e => { e.preventDefault(); if (!guess.trim()) return; send({ type: 'infilGuess', value: guess.trim() }); setGuess(''); }}>
                    <input value={guess} onChange={e => setGuess(e.target.value.replace(/\D/g, '').slice(0, run.node.kind === 'lock' ? run.node.size : 5))} inputMode="numeric" placeholder={run.node.kind === 'lock' ? `서로 다른 숫자 ${run.node.size}자리` : `1~${run.node.size}`} aria-label="추측"/>
                    <button className="primary" disabled={busy || !guess}>입력</button>
                    <button type="button" className="secondary" disabled={busy} onClick={() => send({ type: 'infilCashout' })}>이탈 · 보상 받기</button>
                </form>
            </div>}
        </section>

        <section className="panel hacker-section">
            <div className="section-title"><h2>해킹</h2><span>{n ? `해킹 ${ROMAN[n - 1]} · 하루 횟수는 단계에 비례` : '아직 해금한 해킹이 없습니다'}</span></div>
            {next && <p className="footnote">다음: 해킹 {ROMAN[h.tier]} · 권한 등급 {next.grade} · 비트 {format(next.bits)}{' '}<button className="secondary" disabled={busy || h.grade < next.grade || h.bits < next.bits} onClick={() => send({ type: 'hackUnlock' })}>해금</button></p>}
            {n >= 1 && <div className="hack-list">
                <div className="hack-card">
                    <b>방송 탈취</b>
                    <small>이벤트 배너를 {HACKER.broadcast.minutes(n)}분 동안 원하는 문구로 덮어씁니다. 문구 앞에는 [해커 {s.name}] 서명이 고정됩니다. 다른 해커의 방송이 떠 있는 동안은 쓸 수 없습니다. 비트 {HACKER.broadcast.bits} · 오늘 {used.broadcast || 0}/{HACKER.broadcast.perDay(n)}</small>
                    <form onSubmit={e => { e.preventDefault(); if (!message.trim()) return; send({ type: 'hackRun', id: 'broadcast', value: message.trim() }, '/api/hack'); setMessage(''); }}>
                        <input value={message} maxLength={HACKER.broadcast.maxLength} onChange={e => setMessage(e.target.value.replace(/[\n\r<>]/g, ''))} placeholder={`방송 문구 (${HACKER.broadcast.maxLength}자까지)`} aria-label="방송 문구"/>
                        <button className="primary" disabled={busy || !isHacker || !message.trim() || (used.broadcast || 0) >= HACKER.broadcast.perDay(n) || h.bits < HACKER.broadcast.bits}>방송 탈취</button>
                    </form>
                </div>
                <div className="hack-card">
                    <b>크래킹</b>
                    <small>애드가드로 숨은 모험가 한 명의 정보를 {HACKER.crack.minutes}분 동안 드러냅니다. 랭킹의 ??? 행에서 바로 쓸 수 있고, 여기에는 랭킹 행 id를 넣습니다. 비트 {HACKER.crack.bits} · 오늘 {used.crack || 0}/{HACKER.crack.perDay(n)}</small>
                    <form onSubmit={e => { e.preventDefault(); if (!target.trim()) return; send({ type: 'hackRun', id: 'crack', value: target.trim() }, '/api/hack'); setTarget(''); }}>
                        <input value={target} onChange={e => setTarget(e.target.value.slice(0, 120))} placeholder="랭킹 행 id" aria-label="크래킹 대상"/>
                        <button className="primary" disabled={busy || !isHacker || !target.trim() || (used.crack || 0) >= HACKER.crack.perDay(n) || h.bits < HACKER.crack.bits}>크래킹</button>
                    </form>
                    {setView && <button type="button" className="text-button" onClick={() => setView('ranking')}>랭킹에서 대상 고르기</button>}
                </div>
            </div>}
        </section>

        <section className="panel hacker-section">
            <div className="section-title"><h2>재화 변환 (단방향)</h2><span>되돌릴 수 없습니다</span></div>
            <p className="footnote">SP 1 = 비트 {HACKER.convert.sp} · 세계석 1 = 비트 {HACKER.convert.pearls}. 비트는 해커 계열에서만 쓰이고, 다른 재화로 바꿀 수 없습니다.</p>
            <div className="hacker-convert">
                <select value={convert.id} onChange={e => setConvert({ ...convert, id: e.target.value as 'sp' | 'pearls' })} aria-label="태울 재화"><option value="pearls">세계석 (보유 {format(s.pearls)})</option><option value="sp">SP (보유 {format(s.sp)})</option></select>
                <input value={convert.n} onChange={e => setConvert({ ...convert, n: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" aria-label="개수"/>
                <ConfirmButton label={`비트 +${format(convertN * HACKER.convert[convert.id])}로 태우기`} title="재화를 비트로 태울까요?" description={`${convert.id === 'sp' ? 'SP' : '세계석'} ${format(convertN)}개가 영구로 사라지고 비트 ${format(convertN * HACKER.convert[convert.id])}가 됩니다. 되돌릴 수 없습니다.`} disabled={busy || convertN < 1} onConfirm={() => send({ type: 'hackConvert', id: convert.id, value: String(convertN) })}/>
            </div>
        </section>

        <section className="panel hacker-section">
            <div className="section-title"><h2>애드가드</h2><span>{level >= 2 ? '2단계 · 공개 항목 선택' : level === 1 ? '1단계 · 이름·정보 전부 숨김' : '꺼짐(장착·숙련 1단계 필요)'}</span></div>
            <p className="footnote">랭킹·무릉도장 기록판에서 이름을 ???로 숨깁니다. 결투 계산에는 영향이 없고, 크래킹을 당하면 1시간 동안 풀립니다. 다른 직업도 숙련 계승으로 쓸 수 있습니다.</p>
            {level >= 2 && <div className="skill-chip-group" role="group" aria-label="공개 항목">{PRIVACY_FIELDS.map(f => <button type="button" key={f} className={`skill-chip ${show.has(f) ? 'active' : ''}`} aria-pressed={show.has(f)} disabled={busy} onClick={() => togglePrivacy(f)}>{PRIVACY_LABELS[f]} {show.has(f) ? '공개' : '숨김'}</button>)}</div>}
            {s.hackFeed?.crackedUntil && <p className="footnote negative">크래킹당했습니다 · {new Date(s.hackFeed.crackedUntil).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}까지 정보가 드러납니다.</p>}
        </section>
    </>;
}
