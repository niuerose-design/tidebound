'use client';
import { useState } from 'react';

type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rebirths: number; pearls: number; gold: number; inDungeon: boolean; revision: number; updatedAt: number };
type Preview = { before: AdminPlayer; after: AdminPlayer };
type EventRow = { id: string; name: string; from: string; until: string; exp?: number; gold?: number; drop?: number; mastery?: number; live: boolean; disabled?: boolean };
type EventList = { code: EventRow[]; extra: EventRow[]; banner: string };
const MULTS = [['exp', '경험치'], ['gold', '골드'], ['drop', '장비 드롭'], ['mastery', '숙련']] as const;
/** datetime-local(한국 시간으로 입력) → ISO. */
const kstToIso = (v: string) => v ? `${v}:00+09:00` : '';
const isoToKst = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 16);
const when = (e: EventRow) => `${isoToKst(e.from).replace('T', ' ')} ~ ${isoToKst(e.until).replace('T', ' ')} (한국 시간)`;
const mults = (e: EventRow) => MULTS.filter(([k]) => (e[k] ?? 1) !== 1).map(([k, label]) => `${label} ×${e[k]}`).join(' · ') || '배율 없음(공지)';
const field = { padding: 8, borderRadius: 6, border: '1px solid #3b5458', background: '#0d1a1e', color: '#e6f1ee' } as const;
const line = (p: AdminPlayer) => `${p.name} · Lv.${p.level} ${p.job} · 환생 ${p.rebirths}회 · 진주 ${p.pearls} · 골드 ${p.gold.toLocaleString()}${p.inDungeon ? ' · 던전 진행 중' : ''}`;

/** v27.26 운영 도구: 낚시꾼 이름·아이디로 찾아 이번 생을 처음 상태로 되돌립니다(환생 횟수·진주·연구·유물·도감 유지). */
export default function AdminPage() {
    const [key, setKey] = useState(''), [query, setQuery] = useState(''), [players, setPlayers] = useState<AdminPlayer[] | null>(null);
    const [tab, setTab] = useState<'life' | 'events'>('life'), [events, setEvents] = useState<EventList | null>(null);
    const [draft, setDraft] = useState({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1' });
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
    const search = async () => { setPreview(null); setDone(''); const d = await call({ action: 'search', query }); if (d) setPlayers(d.players); };
    const look = async (id: string) => { setDone(''); const d = await call({ action: 'preview', id }); if (d) setPreview({ id, data: d }); };
    const apply = async () => {
        if (!preview || !confirm(`${preview.data.before.name}(${preview.data.before.username || '아이디 없음'} · ${preview.data.before.slot}번 슬롯)의 이번 생을 처음 상태로 되돌릴까요?`)) return;
        const d = await call({ action: 'apply', id: preview.id, revision: preview.data.before.revision });
        if (d) { setDone(`적용했습니다: ${line(d.after)} · 유저 화면은 다음 동기화(최대 30초) 때 바뀝니다.`); setPreview(null); setPlayers(null); }
    };
    const loadEvents = async () => { const d = await call({ action: 'events' }); if (d) setEvents(d); };
    const saveEvent = async () => {
        const d = await call({ action: 'saveEvent', event: { name: draft.name, from: kstToIso(draft.from), until: kstToIso(draft.until), exp: Number(draft.exp), gold: Number(draft.gold), drop: Number(draft.drop), mastery: Number(draft.mastery) } });
        if (d) { setEvents(d); setDone('이벤트를 저장했습니다. 유저 화면에는 최대 1분 안에 반영됩니다.'); setDraft({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1' }); }
    };
    const removeEvent = async (id: string) => { if (!confirm('이 이벤트를 삭제할까요?')) return; const d = await call({ action: 'deleteEvent', id }); if (d) setEvents(d); };
    const toggleEvent = async (id: string, disabled: boolean) => { const d = await call({ action: 'toggleEvent', id, disabled }); if (d) setEvents(d); };
    const tabButton = (id: 'life' | 'events', label: string) => <button type="button" className={tab === id ? 'primary' : 'secondary'} onClick={() => { setTab(id); setError(''); setDone(''); if (id === 'events' && key) loadEvents(); }}>{label}</button>;
    return <main className="admin-tool" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', color: '#e6f1ee' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>운영 도구</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>{tabButton('life', '이번 생 초기화')}{tabButton('events', '서버 이벤트')}</div>
        <p style={{ color: '#9bb3b0', fontSize: 14, marginTop: 0 }}>{tab === 'life' ? '레벨·골드·일반 장비·직업·능력치·진행 중 던전을 처음 상태로 되돌립니다. 환생 횟수·진주·연구·유물·도감·스킬 성장은 그대로입니다.' : '기간 동안 모든 낚시꾼의 경험치·골드·장비 드롭·숙련에 배율을 겁니다. 겹치면 배율은 곱해집니다.'}</p>
        <section className="panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>운영자 키<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" placeholder="Vercel 환경 변수 TIDEBOUND_ADMIN_KEY 값" style={field}/></label>
            {tab === 'life' && <form onSubmit={e => { e.preventDefault(); search(); }} style={{ display: 'flex', gap: 8 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="낚시꾼 이름(일부) 또는 로그인 아이디" style={{ ...field, flex: 1 }}/>
                <button className="primary" disabled={busy || !key || !query.trim()}>찾기</button>
            </form>}
            {tab === 'events' && <button className="secondary" disabled={busy || !key} onClick={loadEvents}>이벤트 불러오기</button>}
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
        {tab === 'life' && players && <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 16 }}>검색 결과 {players.length}명{players.length === 30 ? ' (최대 30명까지 표시)' : ''}</h2>
            {!players.length && <p style={{ color: '#9bb3b0' }}>찾은 낚시꾼이 없습니다.</p>}
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{players.map(p => <li key={p.id} className="panel" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', border: preview?.id === p.id ? '1px solid #d5b36c' : undefined }}>
                <span style={{ fontSize: 13 }}><b>{p.name}</b> · 아이디 {p.username || '?'} · {p.slot}번 슬롯<br/><small style={{ color: '#9bb3b0' }}>{line(p)} · 마지막 저장 {new Date(p.updatedAt).toLocaleString('ko-KR')}</small></span>
                <button className="secondary" disabled={busy} onClick={() => look(p.id)}>미리 보기</button>
            </li>)}</ul>
        </section>}
        {tab === 'life' && preview && <section className="panel" style={{ padding: 16, marginTop: 16, display: 'grid', gap: 6 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>미리 보기 · {preview.data.before.username || '?'} ({preview.data.before.slot}번 슬롯)</h2>
            <div style={{ fontSize: 13 }}>전: {line(preview.data.before)}</div>
            <div style={{ fontSize: 13 }}>후: {line(preview.data.after)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}><button className="primary" disabled={busy} onClick={apply}>이번 생 초기화 적용</button><button className="secondary" disabled={busy} onClick={() => setPreview(null)}>취소</button></div>
        </section>}
    </main>;
}
