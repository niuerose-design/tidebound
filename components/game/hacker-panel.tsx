'use client';
/** v3.18 해커 화면: 권한 등급·비트, 재화 변환(단방향), 침투 작전, 해킹 I(방송 탈취·크래킹), v3.26 신원 조작(옛 애드가드). v3.25 해킹 II~V · 화이트 해커 · 프로그램. */
import { useState } from 'react';
import type { PanelProps } from './panel-props';
import { Heading, Meter, format, useNow } from './shared';
import { ConfirmButton } from './confirm-button';
import { HACKER, PRIVACY_FIELDS, PRIVACY_LABELS, PROGRAMS, gradeNeed, isHackerJob, type PrivacyField } from '@/game/data/hacker';
import { gradeTotal, adguardLevel, memoryCap, memoryUsed, traceKeep } from '@/game/systems/hacker';
import { STAGES, DUNGEONS } from '@/game/data/world';
import { BLESSINGS, RAIDS } from '@/game/data/altar';
import { dayKey } from '@/game/data/goals';

const ROMAN = 'I II III IV V VI VII VIII IX X'.split(' ');

export function Hacker({ s, send, busy, setView }: PanelProps) {
    const h = s.hacker || { bits: 0, exp: 0, grade: 1, tier: 0 };
    const now = useNow(60_000), isHacker = isHackerJob(s.job), white = s.job === 'whiteHacker', today = h.day === dayKey(now);
    const entriesLeft = HACKER.infil.entriesPerDay - (today ? h.entries || 0 : 0), used = today ? h.used || {} : {};
    const base = gradeTotal(h.grade), need = gradeNeed(h.grade), into = Math.max(0, h.exp - base);
    const [convert, setConvert] = useState<{ id: 'sp' | 'pearls'; n: string }>({ id: 'pearls', n: '10' });
    const [guess, setGuess] = useState(''), [message, setMessage] = useState(''), [target, setTarget] = useState('');
    const infil = h.infil, next = HACKER.tiers[h.tier], n = h.tier;
    const run = (id: string, value?: string) => send({ type: 'hackRun', id, ...(value !== undefined ? { value } : {}) }, '/api/hack');
    const events = s.hackFeed?.events || [], feedDown = s.hackFeed?.down || [];
    const [tamper, setTamper] = useState({ id: '', time: '+', rate: '+' }), [place, setPlace] = useState(PLACES[0].value), [gauge, setGauge] = useState(GAUGES[0].id), [restore, setRestore] = useState('');
    const downMinutes = Math.round(HACKER.down.minutes(n) * (h.loadout?.includes('exploitKit') ? 1.2 : 1));
    const targets = [...(s.hackFeed?.broadcast ? [{ value: 'broadcast', label: `방송 탈취 · ${s.hackFeed.broadcast.by}` }] : []), ...feedDown.map(d => ({ value: `down:${d.kind}:${d.id}`, label: `서버 다운 · ${placeLabel(d.kind, d.id)} · ${d.by}` })), ...events.filter(e => e.tampered).map(e => ({ value: `tamper:${e.id}`, label: `이벤트 변조 · ${e.name}` }))];
    const programs = h.programs || [], loadout = h.loadout || [], mem = memoryCap(s);
    const level = adguardLevel(s), [showList, setShowList] = useState<PrivacyField[]>([]), show = new Set(showList), [spoofTarget, setSpoofTarget] = useState('');
    const togglePrivacy = (f: PrivacyField) => setShowList(list => list.includes(f) ? list.filter(x => x !== f) : [...list, f]);
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
            {isHacker && <p className="footnote">{s.running ? '브루트포스 실행 중' : '자동 사냥을 켜면 브루트포스가 돌아갑니다'} · 2초마다 비트 +{Number((HACKER.brute.bits * (loadout.includes('cryptoMiner') ? 1.3 : 1)).toFixed(3))} · 권한 +{HACKER.brute.exp} (오프라인 정산 포함)</p>}
        </section>

        <section className="panel hacker-section">
            <div className="section-title"><h2>침투 작전</h2><span>오늘 남은 입장 {Math.max(0, entriesLeft)} / {HACKER.infil.entriesPerDay}</span></div>
            {!infil ? <>
                <p className="footnote">서버 노드를 한 칸씩 뚫습니다. 방화벽(서로 다른 숫자 자물쇠: 자리·숫자가 맞으면 S, 숫자만 맞으면 B) · 포트 스캔(UP·DOWN) · 수열(다음 수) · 진법 변환(2진수·16진수를 10진수로) · 암호 해독(알파벳을 몇 칸 밀어 둔 단어)이 섞여 나옵니다. 깊을수록 보상이 커지고, 언제든 이탈해 쌓인 보상을 받습니다. 시도를 다 쓰면 추적당해 {Math.round(traceKeep(s) * 100)}%만 회수합니다.</p>
                <button className="primary" disabled={busy || !isHacker || entriesLeft <= 0} onClick={() => send({ type: 'infilStart' })}>침투 시작</button>
            </> : <div className="infil-run">
                <div className="infil-head"><b>노드 {infil.depth + 1} · {NODE_LABEL[infil.node.kind](infil.node.size)}</b><span>남은 시도 {infil.node.max - infil.node.tries} · 쌓인 보상 비트 {infil.bank.bits} · 권한 {infil.bank.exp}</span></div>
                {infil.node.prompt && <p className="infil-prompt"><code>{infil.node.prompt}</code></p>}
                <ol className="infil-history">{infil.node.history.map((x, i) => <li key={i}><code>{x.guess}</code><b className={x.hint === 'OPEN' ? 'ok' : ''}>{x.hint}</b></li>)}</ol>
                <form className="infil-form" onSubmit={e => { e.preventDefault(); if (!guess.trim()) return; send({ type: 'infilGuess', value: guess.trim() }); setGuess(''); }}>
                    <input value={guess} onChange={e => setGuess(infil.node.kind === 'cipher' ? e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, infil.node.size) : e.target.value.replace(/\D/g, '').slice(0, infil.node.kind === 'lock' ? infil.node.size : 7))} inputMode={infil.node.kind === 'cipher' ? 'text' : 'numeric'} placeholder={NODE_HINT[infil.node.kind](infil.node.size)} aria-label="추측"/>
                    <button className="primary" disabled={busy || !guess}>입력</button>
                    <button type="button" className="secondary" disabled={busy} onClick={() => send({ type: 'infilCashout' })}>이탈 · 보상 받기</button>
                </form>
            </div>}
        </section>

        <section className="panel hacker-section">
            <div className="section-title"><h2>해킹</h2><span>{n ? `해킹 ${ROMAN[n - 1]} · 하루 횟수는 단계에 비례` : '아직 해금한 해킹이 없습니다'}</span></div>
            {next && <p className="footnote">다음: 해킹 {ROMAN[h.tier]} · 권한 등급 {next.grade} · 비트 {format(next.bits)}{' '}<button className="secondary" disabled={busy || h.grade < next.grade || h.bits < next.bits} onClick={() => send({ type: 'hackUnlock' })}>해금</button></p>}
            {n >= 1 && <div className="hack-list">
                {!white && <>
                <div className="hack-card">
                    <b>방송 탈취 · I</b>
                    <small>이벤트 배너를 {HACKER.broadcast.minutes(n)}분 동안 원하는 문구로 덮어씁니다. 문구 앞에는 [해커 {s.name}] 서명이 고정됩니다(루트킷이면 ???). 다른 해커의 방송이 떠 있는 동안은 쓸 수 없습니다. 비트 {HACKER.broadcast.bits} · 오늘 {used.broadcast || 0}/{HACKER.broadcast.perDay(n)}</small>
                    <form onSubmit={e => { e.preventDefault(); if (!message.trim()) return; run('broadcast', message.trim()); setMessage(''); }}>
                        <input value={message} maxLength={HACKER.broadcast.maxLength} onChange={e => setMessage(e.target.value.replace(/[\n\r<>]/g, ''))} placeholder={`방송 문구 (${HACKER.broadcast.maxLength}자까지)`} aria-label="방송 문구"/>
                        <button className="primary" disabled={busy || !isHacker || !message.trim() || (used.broadcast || 0) >= HACKER.broadcast.perDay(n) || h.bits < HACKER.broadcast.bits}>방송 탈취</button>
                    </form>
                </div>
                <div className="hack-card">
                    <b>크래킹 · I</b>
                    <small>신원 조작으로 가려진 모험가 한 명의 정보를 {HACKER.crack.minutes}분 동안 드러냅니다. 화이트 해커의 방화벽은 하루 한 번 막아 냅니다. 비트 {HACKER.crack.bits} · 오늘 {used.crack || 0}/{HACKER.crack.perDay(n)}</small>
                    <form onSubmit={e => { e.preventDefault(); if (!target.trim()) return; run('crack', target.trim()); setTarget(''); }}>
                        <input value={target} onChange={e => setTarget(e.target.value.slice(0, 120))} placeholder="랭킹 행 id" aria-label="크래킹 대상"/>
                        <button className="primary" disabled={busy || !isHacker || !target.trim() || (used.crack || 0) >= HACKER.crack.perDay(n) || h.bits < HACKER.crack.bits}>크래킹</button>
                    </form>
                    {setView && <button type="button" className="text-button" onClick={() => setView('ranking')}>랭킹에서 대상 고르기</button>}
                </div>
                {n >= 2 && <div className="hack-card">
                    <b>이벤트 변조 · II</b>
                    <small>진행 중인 운영 이벤트 하나의 남은 시간을 ±{HACKER.tamper.minutes(n)}분, 배율을 ±{Math.round(HACKER.tamper.rate(n) * 100)}%p 바꿉니다(×1.0 아래로는 안 내려감, 제단 축복 제외). 이벤트당 1회 · 비트 {HACKER.tamper.bits} · 오늘 {used.tamper || 0}/{HACKER.tamper.perDay()}</small>
                    {events.length ? <div className="hack-form">
                        <select value={tamper.id || events[0].id} onChange={e => setTamper({ ...tamper, id: e.target.value })} aria-label="이벤트">{events.map(e => <option key={e.id} value={e.id} disabled={e.tampered}>{e.name}{e.tampered ? ' (변조됨)' : ''}</option>)}</select>
                        <select value={tamper.time} onChange={e => setTamper({ ...tamper, time: e.target.value })} aria-label="시간"><option value="+">시간 늘리기</option><option value="-">시간 줄이기</option></select>
                        <select value={tamper.rate} onChange={e => setTamper({ ...tamper, rate: e.target.value })} aria-label="배율"><option value="+">배율 올리기</option><option value="-">배율 내리기</option></select>
                        <button className="primary" disabled={busy || (used.tamper || 0) >= HACKER.tamper.perDay() || h.bits < HACKER.tamper.bits} onClick={() => run('tamper', `${tamper.id || events[0].id}|${tamper.time}|${tamper.rate}`)}>변조</button>
                    </div> : <small>지금 진행 중인 운영 이벤트가 없습니다.</small>}
                </div>}
                {n >= 3 && <div className="hack-card">
                    <b>서버 다운 · III</b>
                    <small>사냥터·던전 하나를 {downMinutes}분 동안 새로 들어올 수 없게 만듭니다(이미 있는 모험가는 계속, 첫 사냥터 제외, 패치된 곳은 불가). 비트 {HACKER.down.bits} · 오늘 {used.down || 0}/{HACKER.down.perDay(n)}</small>
                    <div className="hack-form"><PlaceSelect value={place} onChange={setPlace}/><button className="primary" disabled={busy || (used.down || 0) >= HACKER.down.perDay(n) || h.bits < HACKER.down.bits} onClick={() => run('down', place)}>서버 다운</button></div>
                </div>}
                </>}
                {n >= 4 && <div className="hack-card">
                    <b>패킷 스니핑 · IV</b>
                    <small>{HACKER.sniff.minutes}분 동안 서버를 엿봅니다. 끝나면 그동안 활동한 다른 모험가 1명당 권한 경험치 +{HACKER.sniff.perPlayer(n)} · 비트 +{HACKER.sniff.bitsPerPlayer(n)}(최대 {format(HACKER.sniff.cap(n))} · {format(HACKER.sniff.bitsCap(n))}). 다른 모험가는 아무것도 잃지 않습니다. 하루 1회 · 비트 {HACKER.sniff.bits}</small>
                    {h.sniff ? h.sniff.until > now ? <small>스니핑 중 · {Math.ceil((h.sniff.until - now) / 60000)}분 남음</small> : <button className="primary" disabled={busy} onClick={() => run('sniffClaim')}>스니핑 정산</button>
                        : <button className="primary" disabled={busy || (used.sniff || 0) >= HACKER.sniff.perDay() || h.bits < HACKER.sniff.bits} onClick={() => run('sniff')}>스니핑 시작</button>}
                </div>}
                {n >= 5 && <div className="hack-card">
                    <b>백도어 · V</b>
                    <small>제단 게이지 하나를 그 게이지 비용의 {Math.round(HACKER.backdoor.share(n) * 100)}%만큼 채웁니다(기여 순위 제외). 게이지마다 하루 1회 · 비트 {HACKER.backdoor.bits}</small>
                    <div className="hack-form"><select value={gauge} onChange={e => setGauge(e.target.value)} aria-label="제단 게이지">{GAUGES.map(g => <option key={g.id} value={g.id} disabled={(used[`backdoor:${g.id}`] || 0) >= 1}>{g.name}</option>)}</select>
                        <button className="primary" disabled={busy || (used[`backdoor:${gauge}`] || 0) >= 1 || h.bits < HACKER.backdoor.bits} onClick={() => run('backdoor', gauge)}>백도어</button></div>
                </div>}
                {white && <>
                <div className="hack-card">
                    <b>해킹 되돌리기 · 화이트</b>
                    <small>다른 해커의 방송 탈취·서버 다운·이벤트 변조를 되돌리고 그 해킹 비용의 {Math.round(HACKER.white.restore.bounty * 100)}%를 현상금 비트로 받습니다. 해킹 단계가 그 해킹 이상이어야 합니다. 비트 {HACKER.white.restore.bits} · 오늘 {used.restore || 0}/{HACKER.white.restore.perDay(n)}</small>
                    {targets.length ? <div className="hack-form"><select value={restore || targets[0].value} onChange={e => setRestore(e.target.value)} aria-label="되돌릴 해킹">{targets.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
                        <button className="primary" disabled={busy || (used.restore || 0) >= HACKER.white.restore.perDay(n) || h.bits < HACKER.white.restore.bits} onClick={() => run('restore', restore || targets[0].value)}>되돌리기</button></div> : <small>지금 되돌릴 해킹이 없습니다.</small>}
                </div>
                <div className="hack-card">
                    <b>패치 · 화이트</b>
                    <small>사냥터·던전 하나를 {HACKER.white.patch.minutes}분 동안 서버 다운에서 지킵니다(이미 걸린 다운도 그동안 풀림). 하루 1회 · 비트 {HACKER.white.patch.bits}</small>
                    <div className="hack-form"><PlaceSelect value={place} onChange={setPlace}/><button className="primary" disabled={busy || (used.patch || 0) >= HACKER.white.patch.perDay() || h.bits < HACKER.white.patch.bits} onClick={() => run('patch', place)}>패치</button></div>
                </div>
                </>}
            </div>}
            {!!feedDown.length && <p className="footnote">지금 다운된 곳: {feedDown.map(d => `${placeLabel(d.kind, d.id)}(${d.by}, ${Math.ceil((d.until - now) / 60000)}분${d.patched ? ' · 패치됨' : ''})`).join(' · ')}</p>}
        </section>

        <section className="panel hacker-section">
            <div className="section-title"><h2>프로그램</h2><span>메모리 {memoryUsed(loadout)} / {mem} · 권한 등급 5마다 +1</span></div>
            <p className="footnote">비트로 한 번 설치하면 영구입니다. 메모리 한도 안에서 장착한 프로그램만 해커 계열일 때 작동합니다.</p>
            <div className="program-list">{PROGRAMS.map(p => { const owned = programs.includes(p.id), on = loadout.includes(p.id); return <div key={p.id} className={`program-card ${on ? 'on' : ''}`}>
                <b>{p.name}</b><small>{p.desc} · 메모리 {p.memory}</small>
                {owned ? <button className={on ? 'primary' : 'secondary'} disabled={busy || (!on && memoryUsed([...loadout, p.id]) > mem)} aria-pressed={on} onClick={() => send({ type: 'programEquip', id: p.id })}>{on ? '장착 중' : '장착'}</button>
                    : <button className="secondary" disabled={busy || h.bits < p.bits} onClick={() => send({ type: 'programBuy', id: p.id })}>설치 · 비트 {format(p.bits)}</button>}
            </div>; })}</div>
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
            <div className="section-title"><h2>신원 조작</h2><span>{level >= 3 ? '3단계 · 항목 선택 · 2시간' : level === 2 ? '2단계 · 항목 선택' : level === 1 ? '1단계 · 전부 숨김' : '꺼짐(장착·숙련 1단계 필요)'}</span></div>
            <p className="footnote">고른 모험가 한 명(나도 가능)의 랭킹·무릉도장·해커 순위 정보를 ???로 가립니다. 결투 계산에는 영향이 없고, 크래킹을 당하면 그동안 풀립니다. 랭킹 행의 ‘신원 조작’ 버튼으로도 쓸 수 있습니다. 비트 {HACKER.spoof.bits} · 오늘 {used.spoof || 0}/{HACKER.spoof.perDay(level)} · {HACKER.spoof.minutes(level)}분</p>
            {level >= 2 && <div className="skill-chip-group" role="group" aria-label="공개로 남길 항목">{PRIVACY_FIELDS.map(f => <button type="button" key={f} className={`skill-chip ${show.has(f) ? 'active' : ''}`} aria-pressed={show.has(f)} disabled={busy} onClick={() => togglePrivacy(f)}>{PRIVACY_LABELS[f]} {show.has(f) ? '공개' : '숨김'}</button>)}</div>}
            {level >= 1 && <form className="hack-form" onSubmit={e => { e.preventDefault(); if (!spoofTarget.trim()) return; run('spoof', `${spoofTarget.trim()}|${[...show].join(',')}`); setSpoofTarget(''); }}>
                <input value={spoofTarget} onChange={e => setSpoofTarget(e.target.value.slice(0, 120))} placeholder="랭킹 행 id" aria-label="신원 조작 대상"/>
                <button className="primary" disabled={busy || !isHacker || !spoofTarget.trim() || (used.spoof || 0) >= HACKER.spoof.perDay(level) || h.bits < HACKER.spoof.bits}>대상 조작</button>
                <button type="button" className="secondary" disabled={busy || !isHacker || (used.spoof || 0) >= HACKER.spoof.perDay(level) || h.bits < HACKER.spoof.bits} onClick={() => run('spoof', `self|${[...show].join(',')}`)}>내 정보 가리기</button>
            </form>}
            {s.hackFeed?.crackedUntil && <p className="footnote negative">크래킹당했습니다 · {new Date(s.hackFeed.crackedUntil).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}까지 정보가 드러납니다.</p>}
        </section>
    </>;
}

const placeLabel = (kind: string, id: string) => (kind === 'stage' ? STAGES.find(st => st.id === id)?.name : DUNGEONS.find(d => d.id === id)?.name) || id;
/** v3.25 서버 다운·패치 대상(첫 사냥터 제외). */
const PLACES = [...STAGES.slice(1).map(st => ({ value: `stage:${st.id}`, label: `사냥터 · ${st.name}` })), ...DUNGEONS.map(d => ({ value: `dungeon:${d.id}`, label: `던전 · ${d.name}` }))];
function PlaceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return <select value={value} onChange={e => onChange(e.target.value)} aria-label="사냥터·던전">{PLACES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>;
}
/** v3.25 백도어 대상: 축복 · 신 소환 · 월드보스 게이지. */
const GAUGES = [...BLESSINGS.map(b => ({ id: b.id as string, name: b.name })), { id: 'god', name: '신 소환' }, ...RAIDS.map(r => ({ id: r.id as string, name: `${r.name} 소환` }))];

/** v3.26 침투 작전 노드 이름과 입력 안내. */
const NODE_LABEL: Record<string, (size: number) => string> = { lock: n => `방화벽 · 숫자 ${n}자리`, port: n => `포트 스캔 · 1~${format(n)}`, seq: () => '수열 · 다음 수는?', bin: () => '진법 변환 · 10진수로', cipher: n => `암호 해독 · ${n}글자` };
const NODE_HINT: Record<string, (size: number) => string> = { lock: n => `서로 다른 숫자 ${n}자리`, port: n => `1~${n}`, seq: () => '다음 수', bin: () => '10진수', cipher: n => `영문 ${n}글자` };
