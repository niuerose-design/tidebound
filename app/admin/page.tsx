'use client';
import { useState } from 'react';

type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rebirths: number; pearls: number; gold: number; inDungeon: boolean; revision: number; updatedAt: number };
type Preview = { before: AdminPlayer; after: AdminPlayer };
const field = { padding: 8, borderRadius: 6, border: '1px solid #3b5458', background: '#0d1a1e', color: '#e6f1ee' } as const;
const line = (p: AdminPlayer) => `${p.name} · Lv.${p.level} ${p.job} · 환생 ${p.rebirths}회 · 진주 ${p.pearls} · 골드 ${p.gold.toLocaleString()}${p.inDungeon ? ' · 던전 진행 중' : ''}`;

/** v27.26 운영 도구: 낚시꾼 이름·아이디로 찾아 이번 생을 처음 상태로 되돌립니다(환생 횟수·진주·연구·유물·도감 유지). */
export default function AdminPage() {
    const [key, setKey] = useState(''), [query, setQuery] = useState(''), [players, setPlayers] = useState<AdminPlayer[] | null>(null);
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
    return <main className="admin-tool" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', color: '#e6f1ee' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>운영 도구 · 이번 생 초기화</h1>
        <p style={{ color: '#9bb3b0', fontSize: 14, marginTop: 0 }}>레벨·골드·일반 장비·직업·능력치·진행 중 던전을 처음 상태로 되돌립니다. 환생 횟수·진주·연구·유물·도감·스킬 성장은 그대로입니다.</p>
        <section className="panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>운영자 키<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" placeholder="Vercel 환경 변수 TIDEBOUND_ADMIN_KEY 값" style={field}/></label>
            <form onSubmit={e => { e.preventDefault(); search(); }} style={{ display: 'flex', gap: 8 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="낚시꾼 이름(일부) 또는 로그인 아이디" style={{ ...field, flex: 1 }}/>
                <button className="primary" disabled={busy || !key || !query.trim()}>찾기</button>
            </form>
        </section>
        {error && <p role="alert" style={{ color: '#ff9a9a' }}>{error}</p>}
        {done && <p role="status" style={{ color: '#9ce8b4' }}>{done}</p>}
        {players && <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 16 }}>검색 결과 {players.length}명{players.length === 30 ? ' (최대 30명까지 표시)' : ''}</h2>
            {!players.length && <p style={{ color: '#9bb3b0' }}>찾은 낚시꾼이 없습니다.</p>}
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{players.map(p => <li key={p.id} className="panel" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', border: preview?.id === p.id ? '1px solid #d5b36c' : undefined }}>
                <span style={{ fontSize: 13 }}><b>{p.name}</b> · 아이디 {p.username || '?'} · {p.slot}번 슬롯<br/><small style={{ color: '#9bb3b0' }}>{line(p)} · 마지막 저장 {new Date(p.updatedAt).toLocaleString('ko-KR')}</small></span>
                <button className="secondary" disabled={busy} onClick={() => look(p.id)}>미리 보기</button>
            </li>)}</ul>
        </section>}
        {preview && <section className="panel" style={{ padding: 16, marginTop: 16, display: 'grid', gap: 6 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>미리 보기 · {preview.data.before.username || '?'} ({preview.data.before.slot}번 슬롯)</h2>
            <div style={{ fontSize: 13 }}>전: {line(preview.data.before)}</div>
            <div style={{ fontSize: 13 }}>후: {line(preview.data.after)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}><button className="primary" disabled={busy} onClick={apply}>이번 생 초기화 적용</button><button className="secondary" disabled={busy} onClick={() => setPreview(null)}>취소</button></div>
        </section>}
    </main>;
}
