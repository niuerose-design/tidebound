'use client';
import { useState } from 'react';

type AdminSp = { have: number; research: { name: string; sp: number; claimed: boolean }[]; spentSkills: { name: string; sp: number }[]; limitBreaks: { name: string; sp: number }[]; logs: string[] };
type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rebirths: number; pearls: number; gold: number; sp: AdminSp; inDungeon: boolean; revision: number; updatedAt: number };
type Preview = { before: AdminPlayer; after: AdminPlayer };
type EventRow = { id: string; name: string; from: string; until: string; exp?: number; gold?: number; drop?: number; mastery?: number; live: boolean; disabled?: boolean };
type EventList = { code: EventRow[]; extra: EventRow[]; banner: string };
type ClosureRow = { id: string; name: string; closed: boolean; locked: boolean };
type ClosureList = { stages: ClosureRow[]; dungeons: ClosureRow[] };
type Tab = 'life' | 'events' | 'closures' | 'stats';
type Count = { name: string; count: number };
type Bucket = { label: string; count: number };
type Stats = { at: number; accounts: number; saves: number; active: { hour: number; day: number; week: number }; running: number; inDungeon: number; level: { avg: number; max: number; buckets: Bucket[] }; rebirths: { avg: number; max: number; buckets: Bucket[] }; stages: Count[]; dungeons: Count[]; jobs: Count[]; totals: { kills: number; playHours: number; gold: number; pearls: number; sp: number }; medians: { gold: number; pearls: number }; abyssBest: number; limitBreakers: number; inGuild: number; top: { name: string; level: number; rebirths: number; abyss: number }[] };
const n = (v: number) => v.toLocaleString('ko-KR');
/** v27.32 통계 카드 한 칸. */
const Tile = ({ label, value, note }: { label: string; value: string; note?: string }) => <div className="panel" style={{ padding: 12 }}><div style={{ fontSize: 12, color: '#9bb3b0' }}>{label}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>{note && <div style={{ fontSize: 12, color: '#9bb3b0' }}>{note}</div>}</div>;
/** 막대 목록: 가장 큰 값을 100%로 봅니다. */
function Bars({ title, rows, total }: { title: string; rows: { label: string; count: number }[]; total: number }) {
    const max = Math.max(1, ...rows.map(r => r.count));
    return <div className="panel" style={{ padding: 14 }}><h2 style={{ fontSize: 15, margin: '0 0 8px' }}>{title}</h2>{!rows.length && <p style={{ color: '#9bb3b0', fontSize: 13, margin: 0 }}>없습니다.</p>}
        <div style={{ display: 'grid', gap: 5 }}>{rows.map(r => <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 140px) 1fr auto', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            <span style={{ height: 10, borderRadius: 5, background: '#1d3034' }}><span style={{ display: 'block', height: '100%', width: `${r.count / max * 100}%`, borderRadius: 5, background: '#6fb7a0' }}/></span>
            <span style={{ color: '#c9dbd6', minWidth: 72, textAlign: 'right' }}>{n(r.count)}{total ? <small style={{ color: '#9bb3b0' }}> ({Math.round(r.count / total * 100)}%)</small> : null}</span></div>)}</div></div>;
}
const MULTS = [['exp', '경험치'], ['gold', '골드'], ['drop', '장비 드롭'], ['mastery', '숙련']] as const;
/** datetime-local(한국 시간으로 입력) → ISO. */
const kstToIso = (v: string) => v ? `${v}:00+09:00` : '';
const isoToKst = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 16);
const when = (e: EventRow) => `${isoToKst(e.from).replace('T', ' ')} ~ ${isoToKst(e.until).replace('T', ' ')} (한국 시간)`;
const mults = (e: EventRow) => MULTS.filter(([k]) => (e[k] ?? 1) !== 1).map(([k, label]) => `${label} ×${e[k]}`).join(' · ') || '배율 없음(공지)';
const field = { padding: 8, borderRadius: 6, border: '1px solid #3b5458', background: '#0d1a1e', color: '#e6f1ee' } as const;
const sum = (xs: { sp: number }[]) => xs.reduce((a, x) => a + x.sp, 0);
/** v27.28 SP 내역: 받은 연구·안 받은 연구·쓴 곳·남은 기록. */
function SpDetail({ sp }: { sp: AdminSp }) {
    const got = sp.research.filter(r => r.claimed), waiting = sp.research.filter(r => !r.claimed), small = { color: '#9bb3b0' } as const;
    return <div style={{ fontSize: 13, display: 'grid', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid #2a3d40' }}>
        <div><b>보유 SP {sp.have}</b> <span style={small}>· 스킬에 쓴 SP {sum(sp.spentSkills)} · 한계돌파에 쓴 SP {sum(sp.limitBreaks)}</span></div>
        <div>보스 첫 정복 연구 받음: {got.length ? got.map(r => `${r.name}(+${r.sp})`).join(', ') : '없음'}</div>
        <div>정복했지만 아직 안 받음: {waiting.length ? <b style={{ color: '#d5b36c' }}>{waiting.map(r => `${r.name}(+${r.sp})`).join(', ')}</b> : '없음'}</div>
        {sp.spentSkills.length > 0 && <div style={small}>강화·계승: {sp.spentSkills.map(x => `${x.name} ${x.sp}`).join(', ')}</div>}
        {sp.limitBreaks.length > 0 && <div style={small}>한계돌파: {sp.limitBreaks.map(x => `${x.name} ${x.sp}`).join(', ')}</div>}
        <div style={small}>최근 기록의 SP 줄{sp.logs.length ? '' : ': 없음(기록은 최근 70줄만 남습니다)'}</div>
        {sp.logs.length > 0 && <ul style={{ margin: 0, paddingLeft: 18, ...small }}>{sp.logs.map((t, i) => <li key={i}>{t}</li>)}</ul>}
    </div>;
}
const line = (p: AdminPlayer) => `${p.name} · Lv.${p.level} ${p.job} · 환생 ${p.rebirths}회 · 진주 ${p.pearls} · SP ${p.sp.have} · 골드 ${p.gold.toLocaleString()}${p.inDungeon ? ' · 던전 진행 중' : ''}`;

/** v27.26 운영 도구: 낚시꾼 이름·아이디로 찾아 이번 생을 처음 상태로 되돌립니다(환생 횟수·진주·연구·유물·도감 유지). */
export default function AdminPage() {
    const [key, setKey] = useState(''), [query, setQuery] = useState(''), [players, setPlayers] = useState<AdminPlayer[] | null>(null);
    const [tab, setTab] = useState<Tab>('life'), [events, setEvents] = useState<EventList | null>(null), [closures, setClosures] = useState<ClosureList | null>(null), [stats, setStats] = useState<Stats | null>(null);
    const [draft, setDraft] = useState({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1' });
    const [spOpen, setSpOpen] = useState<string | null>(null);
    const [edit, setEdit] = useState<{ player: AdminPlayer; gold: string; pearls: string } | null>(null);
    const [preview, setPreview] = useState<{ id: string; data: Preview } | null>(null), [done, setDone] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const call = async (body: Record<string, unknown>) => {
        setBusy(true); setError('');
        try {
            const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: JSON.stringify(body) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw Error(data.error || `요청 실패 (${res.status})`);
            return data;
        } catch (e) { setError(e instanceof Error ? e.message : '요청 실패'); return null; }
        finally { setBusy(false); }
    };
    const search = async () => { setPreview(null); setEdit(null); setDone(''); const d = await call({ action: 'search', query }); if (d) setPlayers(d.players); };
    const look = async (id: string) => { setDone(''); setEdit(null); const d = await call({ action: 'preview', id }); if (d) setPreview({ id, data: d }); };
    const apply = async () => {
        if (!preview || !confirm(`${preview.data.before.name}(${preview.data.before.username || '아이디 없음'} · ${preview.data.before.slot}번 슬롯)의 이번 생을 처음 상태로 되돌릴까요?`)) return;
        const d = await call({ action: 'apply', id: preview.id, revision: preview.data.before.revision });
        if (d) { setDone(`적용했습니다: ${line(d.after)} · 유저 화면은 다음 동기화(최대 30초) 때 바뀝니다.`); setPreview(null); setPlayers(null); }
    };
    const adjust = async () => {
        if (!edit) return;
        const gold = edit.gold.replace(/[,\s]/g, ''), pearls = edit.pearls.replace(/[,\s]/g, '');
        if (!confirm(`${edit.player.name}(${edit.player.username || '아이디 없음'} · ${edit.player.slot}번 슬롯)\n골드 ${edit.player.gold.toLocaleString()} → ${gold === '' ? '그대로' : Number(gold).toLocaleString()}\n진주 ${edit.player.pearls.toLocaleString()} → ${pearls === '' ? '그대로' : Number(pearls).toLocaleString()}\n이대로 바꿀까요?`)) return;
        const d = await call({ action: 'adjust', id: edit.player.id, gold: gold === '' ? undefined : Number(gold), pearls: pearls === '' ? undefined : Number(pearls) });
        if (d) { setDone(`조정했습니다: ${line(d.after)} · 유저 화면은 다음 동기화(최대 30초) 때 바뀝니다.`); setEdit(null); setPlayers(ps => ps && ps.map(p => p.id === d.after.id ? d.after : p)); }
    };
    const loadEvents = async () => { const d = await call({ action: 'events' }); if (d) setEvents(d); };
    const saveEvent = async () => {
        const d = await call({ action: 'saveEvent', event: { name: draft.name, from: kstToIso(draft.from), until: kstToIso(draft.until), exp: Number(draft.exp), gold: Number(draft.gold), drop: Number(draft.drop), mastery: Number(draft.mastery) } });
        if (d) { setEvents(d); setDone('이벤트를 저장했습니다. 유저 화면에는 최대 1분 안에 반영됩니다.'); setDraft({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1' }); }
    };
    const removeEvent = async (id: string) => { if (!confirm('이 이벤트를 삭제할까요?')) return; const d = await call({ action: 'deleteEvent', id }); if (d) setEvents(d); };
    const toggleEvent = async (id: string, disabled: boolean) => { const d = await call({ action: 'toggleEvent', id, disabled }); if (d) setEvents(d); };
    const loadStats = async () => { const d = await call({ action: 'stats' }); if (d) setStats(d); };
    const loadClosures = async () => { const d = await call({ action: 'closures' }); if (d) setClosures(d); };
    const toggleClosed = async (kind: keyof ClosureList, row: ClosureRow) => {
        if (!row.closed && !confirm(`${row.name}의 입장을 막을까요?\n안에 있던 낚시꾼은 다음 동기화 때 보상 없이 나옵니다${kind === 'stages' ? '(더 앞의 열린 낚시터로 옮김)' : ''}.`)) return;
        const d = await call({ action: 'setClosed', kind, id: row.id, closed: !row.closed });
        if (d) { setClosures(d); setDone(`${row.name}을(를) ${row.closed ? '열었습니다' : '닫았습니다'}. 모든 서버에 반영되기까지 최대 30초 걸립니다.`); }
    };
    const tabButton = (id: Tab, label: string) => <button type="button" className={tab === id ? 'primary' : 'secondary'} onClick={() => { setTab(id); setError(''); setDone(''); if (id === 'events' && key) loadEvents(); if (id === 'closures' && key) loadClosures(); if (id === 'stats' && key) loadStats(); }}>{label}</button>;
    const closureList = (kind: keyof ClosureList, title: string) => closures && <div><h2 style={{ fontSize: 16 }}>{title}</h2><ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{closures[kind].map(r => <li key={r.id} className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}><b>{r.name}</b> · {r.closed ? <b style={{ color: '#ff9a9a' }}>입장 막힘</b> : <span style={{ color: '#9ce8b4' }}>열림</span>}{r.locked ? <small style={{ color: '#9bb3b0' }}> · 첫 낚시터라 닫을 수 없음</small> : null}</span>
        {!r.locked && <button className={r.closed ? 'primary' : 'secondary'} disabled={busy} onClick={() => toggleClosed(kind, r)}>{r.closed ? '다시 열기' : '입장 막기'}</button>}</li>)}</ul></div>;
    return <main className="admin-tool" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', color: '#e6f1ee' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>운영 도구</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>{tabButton('life', '낚시꾼 관리')}{tabButton('events', '서버 이벤트')}{tabButton('closures', '입장 관리')}{tabButton('stats', '통계')}</div>
        <p style={{ color: '#9bb3b0', fontSize: 14, marginTop: 0 }}>{tab === 'life' ? '이름이나 아이디로 찾아 골드·진주를 조정하거나 이번 생을 초기화합니다. 이번 생 초기화는 레벨·골드·일반 장비·직업·능력치·진행 중 던전을 처음 상태로 되돌립니다. 환생 횟수·진주·연구·유물·도감·스킬 성장은 그대로입니다.' : tab === 'events' ? '기간 동안 모든 낚시꾼의 경험치·골드·장비 드롭·숙련에 배율을 겁니다. 겹치면 배율은 곱해집니다.' : tab === 'stats' ? '모든 세이브를 읽어 집계합니다. 활동은 마지막 저장 시각 기준이라, 자동 낚시를 켜 둔 채 접속을 끊은 낚시꾼은 다시 접속할 때까지 세지 않습니다. 운영자가 불러올 때만 계산해 게임에는 부하가 없습니다.' : '점검할 낚시터·던전의 입장을 막습니다. 안에 있던 낚시꾼은 다음 동기화 때 보상 없이 나오고(낚시터는 더 앞의 열린 곳으로), 반복 도전도 멈춥니다. 게임 업데이트 없이 바로 적용되며 서버마다 최대 30초 걸립니다.'}</p>
        <section className="panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>운영자 키<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" placeholder="Vercel 환경 변수 TIDEBOUND_ADMIN_KEY 값" style={field}/></label>
            {tab === 'life' && <form onSubmit={e => { e.preventDefault(); search(); }} style={{ display: 'flex', gap: 8 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="낚시꾼 이름(일부) 또는 로그인 아이디" style={{ ...field, flex: 1 }}/>
                <button className="primary" disabled={busy || !key || !query.trim()}>찾기</button>
            </form>}
            {tab === 'events' && <button className="secondary" disabled={busy || !key} onClick={loadEvents}>이벤트 불러오기</button>}
            {tab === 'stats' && <button className="secondary" disabled={busy || !key} onClick={loadStats}>{stats ? '새로고침' : '통계 불러오기'}</button>}
            {tab === 'closures' && <button className="secondary" disabled={busy || !key} onClick={loadClosures}>목록 불러오기</button>}
        </section>
        {error && <p role="alert" style={{ color: '#ff9a9a' }}>{error}</p>}
        {done && <p role="status" style={{ color: '#9ce8b4' }}>{done}</p>}
        {tab === 'events' && events && <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div className="panel" style={{ padding: 12, fontSize: 13 }}>지금 배너: <b>{events.banner || '진행 중인 이벤트 없음'}</b></div>
            <div><h2 style={{ fontSize: 16 }}>코드에 들어 있는 이벤트</h2><ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{events.code.map(e => <li key={e.id} className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', opacity: e.disabled ? .55 : 1 }}>
                <span style={{ fontSize: 13 }}><b>{e.name || '(이름 없음)'}</b> · {mults(e)}{e.live && !e.disabled ? ' · 진행 중' : ''}<br/><small style={{ color: '#9bb3b0' }}>{when(e)}</small></span>
                <button className="secondary" disabled={busy} onClick={() => toggleEvent(e.id, !e.disabled)}>{e.disabled ? '다시 켜기' : '끄기'}</button></li>)}</ul></div>
            <div><h2 style={{ fontSize: 16 }}>운영 페이지에서 만든 이벤트</h2>{!events.extra.length && <p style={{ color: '#9bb3b0', fontSize: 13 }}>없습니다.</p>}<ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{events.extra.map(e => <li key={e.id} className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}><b>{e.name || '(이름 없음)'}</b> · {mults(e)}{e.live ? ' · 진행 중' : ''}<br/><small style={{ color: '#9bb3b0' }}>{when(e)}</small></span>
                <button className="secondary" disabled={busy} onClick={() => removeEvent(e.id)}>삭제</button></li>)}</ul></div>
            <form className="panel" onSubmit={ev => { ev.preventDefault(); saveEvent(); }} style={{ padding: 14, display: 'grid', gap: 8 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>새 이벤트</h2>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>배너 이름(배율은 자동으로 뒤에 붙습니다)<input value={draft.name} maxLength={40} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="예: 주말 특별 이벤트" style={field}/></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                    <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>시작(한국 시간)<input type="datetime-local" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} style={field}/></label>
                    <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>종료(한국 시간)<input type="datetime-local" value={draft.until} onChange={e => setDraft({ ...draft, until: e.target.value })} style={field}/></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>{MULTS.map(([k, label]) => <label key={k} style={{ display: 'grid', gap: 4, fontSize: 13 }}>{label} 배율<input type="number" min={1} max={10} step={0.1} value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value })} style={field}/></label>)}</div>
                <button className="primary" disabled={busy || !draft.from || !draft.until}>이벤트 저장</button>
            </form>
        </section>}
        {tab === 'stats' && stats && <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <p style={{ color: '#9bb3b0', fontSize: 13, margin: 0 }}>{new Date(stats.at).toLocaleString('ko-KR')} 기준</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                <Tile label="가입 계정" value={n(stats.accounts)} note={`세이브(분신 포함) ${n(stats.saves)}개`}/>
                <Tile label="최근 1시간 활동" value={n(stats.active.hour)} note={`24시간 ${n(stats.active.day)} · 7일 ${n(stats.active.week)}`}/>
                <Tile label="자동 낚시 켜 둠" value={n(stats.running)} note={`던전 진행 중 ${n(stats.inDungeon)}`}/>
                <Tile label="평균 레벨" value={String(stats.level.avg)} note={`최고 Lv.${stats.level.max}`}/>
                <Tile label="평균 환생" value={`${stats.rebirths.avg}회`} note={`최고 ${stats.rebirths.max}회 · 심연 최고 ${stats.abyssBest}층`}/>
                <Tile label="총 포획" value={n(stats.totals.kills)} note={`누적 플레이 ${n(stats.totals.playHours)}시간`}/>
                <Tile label="보유 골드 합계" value={n(stats.totals.gold)} note={`중앙값 ${n(stats.medians.gold)}`}/>
                <Tile label="보유 진주 합계" value={n(stats.totals.pearls)} note={`중앙값 ${n(stats.medians.pearls)} · 보유 SP 합계 ${n(stats.totals.sp)}`}/>
                <Tile label="길드 가입" value={n(stats.inGuild)} note={`한계돌파한 낚시꾼 ${n(stats.limitBreakers)}`}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12 }}>
                <Bars title="레벨 분포" rows={stats.level.buckets} total={stats.saves}/>
                <Bars title="환생 횟수 분포" rows={stats.rebirths.buckets} total={stats.saves}/>
                <Bars title="지금 있는 낚시터" rows={stats.stages.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                <Bars title="지금 있는 던전" rows={stats.dungeons.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                <Bars title="현재 직업 상위 15" rows={stats.jobs.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                <div className="panel" style={{ padding: 14 }}><h2 style={{ fontSize: 15, margin: '0 0 8px' }}>환생·레벨 상위 10</h2>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, display: 'grid', gap: 3 }}>{stats.top.map((p, i) => <li key={i}>{p.name} · 환생 {p.rebirths}회 · Lv.{p.level}{p.abyss ? ` · 심연 ${p.abyss}층` : ''}</li>)}</ol></div>
            </div>
        </section>}
        {tab === 'closures' && closures && <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>{closureList('dungeons', '던전')}{closureList('stages', '낚시터')}</section>}
        {tab === 'life' && players && <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 16 }}>검색 결과 {players.length}명{players.length === 30 ? ' (최대 30명까지 표시)' : ''}</h2>
            {!players.length && <p style={{ color: '#9bb3b0' }}>찾은 낚시꾼이 없습니다.</p>}
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{players.map(p => <li key={p.id} className="panel" style={{ padding: 10, border: preview?.id === p.id || edit?.player.id === p.id ? '1px solid #d5b36c' : undefined }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}><b>{p.name}</b> · 아이디 {p.username || '?'} · {p.slot}번 슬롯<br/><small style={{ color: '#9bb3b0' }}>{line(p)} · 마지막 저장 {new Date(p.updatedAt).toLocaleString('ko-KR')}</small></span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="secondary" disabled={busy} onClick={() => { setPreview(null); setDone(''); setEdit({ player: p, gold: String(p.gold), pearls: String(p.pearls) }); }}>골드·진주</button>
                    <button className="secondary" disabled={busy} onClick={() => setSpOpen(spOpen === p.id ? null : p.id)} aria-expanded={spOpen === p.id}>SP 내역</button>
                    <button className="secondary" disabled={busy} onClick={() => look(p.id)}>초기화 미리 보기</button>
                </span>
                </div>
                {spOpen === p.id && <SpDetail sp={p.sp}/>}
            </li>)}</ul>
        </section>}
        {tab === 'life' && edit && <form className="panel" onSubmit={e => { e.preventDefault(); adjust(); }} style={{ padding: 16, marginTop: 16, display: 'grid', gap: 8 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>골드·진주 조정 · {edit.player.name} ({edit.player.username || '?'} · {edit.player.slot}번 슬롯)</h2>
            <p style={{ fontSize: 13, color: '#9bb3b0', margin: 0 }}>입력한 값으로 바뀝니다(더하기가 아니라 최종 값). 비워 두면 그대로 둡니다. 지금: 골드 {edit.player.gold.toLocaleString()} · 진주 {edit.player.pearls.toLocaleString()}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>골드<input inputMode="numeric" value={edit.gold} onChange={e => setEdit({ ...edit, gold: e.target.value })} style={field}/></label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>진주<input inputMode="numeric" value={edit.pearls} onChange={e => setEdit({ ...edit, pearls: e.target.value })} style={field}/></label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button className="primary" disabled={busy}>조정 적용</button><button type="button" className="secondary" disabled={busy} onClick={() => setEdit(null)}>취소</button></div>
        </form>}
        {tab === 'life' && preview && <section className="panel" style={{ padding: 16, marginTop: 16, display: 'grid', gap: 6 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>미리 보기 · {preview.data.before.username || '?'} ({preview.data.before.slot}번 슬롯)</h2>
            <div style={{ fontSize: 13 }}>전: {line(preview.data.before)}</div>
            <div style={{ fontSize: 13 }}>후: {line(preview.data.after)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}><button className="primary" disabled={busy} onClick={apply}>이번 생 초기화 적용</button><button className="secondary" disabled={busy} onClick={() => setPreview(null)}>취소</button></div>
        </section>}
    </main>;
}
