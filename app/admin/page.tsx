'use client';
import { useState } from 'react';

type AdminSp = { have: number; research: { name: string; sp: number; claimed: boolean }[]; spentSkills: { name: string; sp: number }[]; limitBreaks: { name: string; sp: number }[]; logs: string[] };
type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rebirths: number; pearls: number; gold: number; sp: AdminSp; inDungeon: boolean; revision: number; updatedAt: number; lastRebirthAt: number | null; lifeMs: number | null; lifePartial: boolean; paceMs: number | null };
type RebirthPace = { recent: { day: number; week: number }; measured: number; real: { avg: number; median: number }; play: { avg: number; median: number }; byCount: { label: string; count: number; real: number; play: number }[]; latest: { name: string; n: number; at: number; realMs: number; playMs: number; level: number; partial: boolean }[] };
type Preview = { before: AdminPlayer; after: AdminPlayer };
type EventRow = { id: string; name: string; from: string; until: string; exp?: number; gold?: number; drop?: number; mastery?: number; mimic?: number; nuri?: number; live: boolean; disabled?: boolean };
type EventList = { code: EventRow[]; extra: EventRow[]; banner: string; at: number };
type ClosureRow = { id: string; name: string; closed: boolean; locked: boolean };
type ClosureList = { stages: ClosureRow[]; dungeons: ClosureRow[] };
/** v27.73 문 개방: ??? 직업 하나와 그 문 이름·힌트·운영자가 열어 둔 여부. */
type DoorRow = { id: string; name: string; door: string; hint: string; open: boolean };
type DoorList = { doors: DoorRow[] };
type Tab = 'life' | 'events' | 'closures' | 'doors' | 'stats' | 'news';
type NewsRow = { id: number; name: string; text: string; at: number; hacker: boolean };
/** 운영 페이지 소식 테스트 종류(server/news.ts NEWS_SAMPLES와 같은 순서). */
const NEWS_KINDS: [string, string][] = [['onyx', '칠흑 장신구'], ['ascend', '승천'], ['tier5', '5차 전직'], ['abyss', '무릉도장 50층'], ['star22', '22성 강화'], ['general', '장성 진급'], ['hacker', '해커 전직(빨간 줄)'], ['god', '제단 · 신 깨어남'], ['raid', '제단 · 월드보스 출현']];
const BLESS_NAMES: Record<string, string> = { gold: '풍요의 축복', exp: '성장의 축복', mimic: '까미의 축복', nuri: '누리의 축복' };
type Count = { name: string; count: number };
type Bucket = { label: string; count: number };
type Balance = { godDepth: number; reached: number; god: { tries: number; wins: number; players: number; best: number }; offline: { settled: number; capped: number }; abyss: Bucket[]; burn: number };
type Stats = { rebirthPace: RebirthPace; balance: Balance; altar: { gen: number; godAlive: boolean; throne: string; points: number; titheGold: number }; at: number; accounts: number; saves: number; active: { hour: number; day: number; week: number }; running: number; inDungeon: number; level: { avg: number; max: number; buckets: Bucket[] }; rebirths: { avg: number; max: number; buckets: Bucket[] }; stages: Count[]; dungeons: Count[]; jobs: Count[]; totals: { kills: number; playHours: number; gold: number; pearls: number; sp: number }; medians: { gold: number; pearls: number }; abyssBest: number; limitBreakers: number; inGuild: number; top: { name: string; level: number; rebirths: number; abyss: number }[]; ranks: { dist: { name: string; count: number }[]; top: string; perks: { name: string; count: number; avg: number; max: number }[]; freePoints: number } };
const n = (v: number) => v.toLocaleString('ko-KR');
/** v27.63 걸린 시간: 2일 3시간 · 5시간 12분 · 37분. */
const dur = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60_000)), h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? `${d}일 ${h % 24}시간` : h ? `${h}시간 ${m % 60}분` : `${m}분`; };
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
const MULTS = [['exp', '경험치'], ['gold', '골드'], ['drop', '장비 드롭'], ['mastery', '숙련'], ['mimic', '까미 출현'], ['nuri', '누리 출현']] as const;
/** datetime-local(한국 시간으로 입력) → ISO. */
const kstToIso = (v: string) => v ? `${v}:00+09:00` : '';
const isoToKst = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 16);
/** 진행 중 · 시작 전 · 종료됨(목록을 불러온 시각 기준). */
const phase = (e: EventRow, at: number) => e.live ? ' · 진행 중' : Date.parse(e.from) > at ? ' · 시작 전' : ' · 종료됨';
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
const line = (p: AdminPlayer) => `${p.name} · Lv.${p.level} ${p.job} · 환생 ${p.rebirths}회 · 세계석 ${p.pearls} · SP ${p.sp.have} · 골드 ${p.gold.toLocaleString()}${p.inDungeon ? ' · 던전 진행 중' : ''}`;
/** v27.63 환생 시간: 마지막 환생 시각 · 이번 생 경과 · 평균 환생 시간. */
const lifeLine = (p: AdminPlayer) => [p.lastRebirthAt ? `마지막 환생 ${new Date(p.lastRebirthAt).toLocaleString('ko-KR')}` : '', p.lifeMs !== null ? `이번 생 ${dur(p.lifeMs)}${p.lifePartial ? '(업데이트 이후)' : ''}` : '', p.paceMs !== null ? `평균 환생 ${dur(p.paceMs)}` : ''].filter(Boolean).join(' · ');

/** v27.26 운영 도구: 모험가 이름·아이디로 찾아 이번 생을 처음 상태로 되돌립니다(환생 횟수·세계석·연구·유물·도감 유지). */
export default function AdminPage() {
    const [key, setKey] = useState(''), [query, setQuery] = useState(''), [players, setPlayers] = useState<AdminPlayer[] | null>(null);
    const [broadcast, setBroadcast] = useState<{ text: string; by: string; until: number } | null>(null);
    /** v3.43 정보 비공개 스위치(docs/concept.md 10장). env가 있으면 환경 변수가 우선합니다. */
    const [secrecy, setSecrecyState] = useState<{ on: boolean; env: string | null } | null>(null);
    const [hackFx, setHackFx] = useState<{ tamper: number; down: number; patched: number; ddos?: number } | null>(null);
    const [tab, setTab] = useState<Tab>('life'), [events, setEvents] = useState<EventList | null>(null), [closures, setClosures] = useState<ClosureList | null>(null), [doors, setDoors] = useState<DoorList | null>(null), [stats, setStats] = useState<Stats | null>(null);
    const [draft, setDraft] = useState({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1', mimic: '1', nuri: '1' });
    const [spOpen, setSpOpen] = useState<string | null>(null);
    const [news, setNews] = useState<NewsRow[] | null>(null), [newsName, setNewsName] = useState('테스트 모험가'), [newsText, setNewsText] = useState(''), [newsTag, setNewsTag] = useState(true);
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
        if (!confirm(`${edit.player.name}(${edit.player.username || '아이디 없음'} · ${edit.player.slot}번 슬롯)\n골드 ${edit.player.gold.toLocaleString()} → ${gold === '' ? '그대로' : Number(gold).toLocaleString()}\n세계석 ${edit.player.pearls.toLocaleString()} → ${pearls === '' ? '그대로' : Number(pearls).toLocaleString()}\n이대로 바꿀까요?`)) return;
        const d = await call({ action: 'adjust', id: edit.player.id, gold: gold === '' ? undefined : Number(gold), pearls: pearls === '' ? undefined : Number(pearls) });
        if (d) { setDone(`조정했습니다: ${line(d.after)} · 유저 화면은 다음 동기화(최대 30초) 때 바뀝니다.`); setEdit(null); setPlayers(ps => ps && ps.map(p => p.id === d.after.id ? d.after : p)); }
    };
    const loadEvents = async () => { const d = await call({ action: 'events' }); if (d) setEvents(d); };
    const saveEvent = async () => {
        const d = await call({ action: 'saveEvent', event: { name: draft.name, from: kstToIso(draft.from), until: kstToIso(draft.until), exp: Number(draft.exp), gold: Number(draft.gold), drop: Number(draft.drop), mastery: Number(draft.mastery), mimic: Number(draft.mimic), nuri: Number(draft.nuri) } });
        if (d) { setEvents(d); setDone('이벤트를 저장했습니다. 유저 화면에는 최대 1분 안에 반영됩니다.'); setDraft({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1', mimic: '1', nuri: '1' }); }
    };
    const removeEvent = async (id: string) => { if (!confirm('이 이벤트를 삭제할까요?')) return; const d = await call({ action: 'deleteEvent', id }); if (d) setEvents(d); };
    const toggleEvent = async (id: string, disabled: boolean) => { const d = await call({ action: 'toggleEvent', id, disabled }); if (d) setEvents(d); };
    const loadStats = async () => { const d = await call({ action: 'stats' }); if (d) setStats(d); };
    /** v27.69 제단 초기화: 공물(게이지 기여도) 또는 신(깨어난 신·신의 자리·몫). */
    const resetAltar = async (kind: 'offers' | 'god') => {
        const msg = kind === 'offers' ? '제단 게이지(축복 3종·신 소환)에 쌓인 공물(기여도)을 모두 0으로 되돌릴까요?\n이미 열려 있는 축복은 남은 시간 동안 유지됩니다. 바친 재화는 돌려주지 않습니다.' : '신을 초기화할까요?\n깨어 있는 신이 사라지고, 신의 자리 주인과 쌓인 몫(거두지 않은 재화)이 비워집니다. 다음에 소환되는 신은 처음 신(검은 마법사)입니다.';
        if (!confirm(msg)) return;
        const d = await call({ action: 'altarReset', kind });
        if (d) { setStats(d); setDone(kind === 'offers' ? '제단 공물을 초기화했습니다. 유저 화면에는 최대 15초 뒤 반영됩니다.' : '신을 초기화했습니다. 유저 화면에는 최대 15초 뒤 반영됩니다.'); }
    };
    /** v3.17 축복 단계 설정: 축복·단계·유지 시간(분, 비우면 기본). */
    const [blessId, setBlessId] = useState('gold'), [blessLevel, setBlessLevel] = useState(3), [blessMinutes, setBlessMinutes] = useState('');
    const setBlessing = async () => {
        const mins = blessMinutes.trim() ? Number(blessMinutes) : undefined;
        if (!confirm(`${BLESS_NAMES[blessId]}을(를) ${blessLevel ? `${blessLevel}단계로 ${mins ? `${mins}분` : '기본 시간'} 동안 열까요` : '끌까요'}?\n모든 모험가에게 바로 적용됩니다(화면에는 최대 15~30초 뒤).`)) return;
        const d = await call({ action: 'setBlessing', id: blessId, level: blessLevel, minutes: mins });
        if (d) { setStats(d); setDone(`${BLESS_NAMES[blessId]} ${blessLevel ? `${blessLevel}단계 설정` : '끔'} 완료.`); }
    };
    const loadClosures = async () => { const d = await call({ action: 'closures' }); if (d) setClosures(d); const h = await call({ action: 'hacks' }); if (h) { setBroadcast(h.broadcast); setHackFx(h.effects || null); } const sc = await call({ action: 'secrecy' }); if (sc) setSecrecyState(sc); };
    const toggleSecrecy = async () => {
        if (!secrecy) return;
        if (!confirm(secrecy.on ? '정보 비공개를 끌까요? 모든 모험가에게 전체 정보(오픈 베타 화면)가 보입니다.' : '정보 비공개를 켤까요? 모험가는 스스로 알아낸 정보만 보게 됩니다(아직 옮기지 않은 화면은 그대로).')) return;
        const d = await call({ action: 'secrecy', on: !secrecy.on });
        if (d) { setSecrecyState(d); setDone(`정보 비공개를 ${d.on ? '켰' : '껐'}습니다. 모든 서버에 반영되기까지 최대 30초 걸립니다.${d.env ? ` (환경 변수 TIDEBOUND_SECRECY=${d.env}가 있어 실제로는 그 값이 우선합니다)` : ''}`); }
    };
    /** v3.25 해킹 효과(이벤트 변조·서버 다운·패치) 모두 지우기. */
    const removeHackEffects = async () => {
        if (!confirm('이벤트 변조·서버 다운·패치를 모두 지울까요?')) return;
        const d = await call({ action: 'clearHackEffects' });
        if (d) { setHackFx({ tamper: 0, down: 0, patched: 0, ddos: 0 }); setDone('해킹 효과를 모두 지웠습니다. 모든 서버에 반영되기까지 최대 30초 걸립니다.'); }
    };
    /** v3.18 해커의 방송 탈취 지우기. */
    const removeBroadcast = async () => {
        if (!broadcast || !confirm(`[해커 ${broadcast.by}] ${broadcast.text}\n이 방송을 지울까요?`)) return;
        const d = await call({ action: 'clearBroadcast' });
        if (d) { setBroadcast(null); setDone('방송을 지웠습니다. 모든 서버에 반영되기까지 최대 30초 걸립니다.'); }
    };
    const toggleClosed = async (kind: keyof ClosureList, row: ClosureRow) => {
        if (!row.closed && !confirm(`${row.name}의 입장을 막을까요?\n안에 있던 모험가는 다음 동기화 때 보상 없이 나옵니다${kind === 'stages' ? '(더 앞의 열린 사냥터로 옮김)' : ''}.`)) return;
        const d = await call({ action: 'setClosed', kind, id: row.id, closed: !row.closed });
        if (d) { setClosures(d); setDone(`${row.name}을(를) ${row.closed ? '열었습니다' : '닫았습니다'}. 모든 서버에 반영되기까지 최대 30초 걸립니다.`); }
    };
    /** v27.73 문 개방: 연 동안 모든 모험가에게 그 ??? 직업의 문이 열립니다. 닫으면 다시 조건대로(그 사이 전직한 모험가는 그대로). */
    const loadNews = async () => { const d = await call({ action: 'news' }); if (d) setNews(d.rows); };
    const postNews = async (kind: string) => { const d = await call({ action: 'newsTest', kind, name: newsName, text: newsText, tag: newsTag }); if (d) { setNews(d.rows); setDone('소식 탭에 올렸습니다. 게임 화면의 기록판 → 소식에서 확인하세요.'); if (kind === 'custom') setNewsText(''); } };
    const loadDoors = async () => { const d = await call({ action: 'doors' }); if (d) setDoors(d); };
    const toggleDoor = async (row: DoorRow) => {
        if (!row.open && !confirm(`${row.door} · ${row.name}의 문을 모든 모험가에게 열까요?\n연 동안은 조건과 상관없이 전직할 수 있고, 다시 닫으면 조건대로 돌아갑니다(그 사이 전직한 모험가는 그대로).`)) return;
        const d = await call({ action: 'setDoor', id: row.id, open: !row.open });
        if (d) { setDoors(d); setDone(`${row.name}의 문을 ${row.open ? '닫았습니다. 다시 조건대로 열립니다' : '열었습니다'}. 모든 서버에 반영되기까지 최대 30초 걸립니다.`); }
    };
    const tabButton = (id: Tab, label: string) => <button type="button" className={tab === id ? 'primary' : 'secondary'} onClick={() => { setTab(id); setError(''); setDone(''); if (id === 'events' && key) loadEvents(); if (id === 'closures' && key) loadClosures(); if (id === 'doors' && key) loadDoors(); if (id === 'stats' && key) loadStats(); if (id === 'news' && key) loadNews(); }}>{label}</button>;
    const closureList = (kind: keyof ClosureList, title: string) => closures && <div><h2 style={{ fontSize: 16 }}>{title}</h2><ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{closures[kind].map(r => <li key={r.id} className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}><b>{r.name}</b> · {r.closed ? <b style={{ color: '#ff9a9a' }}>입장 막힘</b> : <span style={{ color: '#9ce8b4' }}>열림</span>}{r.locked ? <small style={{ color: '#9bb3b0' }}> · 첫 사냥터라 닫을 수 없음</small> : null}</span>
        {!r.locked && <button className={r.closed ? 'primary' : 'secondary'} disabled={busy} onClick={() => toggleClosed(kind, r)}>{r.closed ? '다시 열기' : '입장 막기'}</button>}</li>)}</ul></div>;
    return <main className="admin-tool" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', color: '#e6f1ee' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>운영 도구</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>{tabButton('life', '모험가 관리')}{tabButton('events', '서버 이벤트')}{tabButton('closures', '입장 관리')}{tabButton('doors', '문 개방')}{tabButton('stats', '통계')}{tabButton('news', '소식 테스트')}</div>
        <p style={{ color: '#9bb3b0', fontSize: 14, marginTop: 0 }}>{tab === 'life' ? '이름이나 아이디로 찾아 골드·세계석을 조정하거나 이번 생을 초기화합니다. 이번 생 초기화는 레벨·골드·일반 장비·직업·능력치·진행 중 던전을 처음 상태로 되돌립니다. 환생 횟수·세계석·연구·유물·도감·스킬 성장은 그대로입니다.' : tab === 'events' ? '기간 동안 모든 모험가의 경험치·골드·장비 드롭·숙련에 배율을 겁니다. 겹치면 배율은 곱해집니다. 배율 없이 이름만 적으면 공지(서버 메시지)로 배너에 뜹니다. 코드에 든 이벤트는 없고, 모든 서버 메시지는 이 페이지에서만 만듭니다.' : tab === 'doors' ? '??? 직업의 문을 조건과 상관없이 모든 모험가에게 엽니다(테스트용). 연 동안만 열리고, 닫으면 다시 각자의 조건대로 돌아갑니다. 그 사이 전직한 모험가는 그 직업을 그대로 가집니다. 게임 업데이트 없이 바로 적용되며 서버마다 최대 30초 걸립니다.' : tab === 'news' ? '기록판 ‘소식’ 탭에 뜨는 줄을 종류별로 올려 봅니다. 실제 소식과 같은 문장·발신자(소식·제단·빨간 해커 줄)로 모든 모험가에게 보이니, 기본으로 [테스트] 표시를 붙입니다. 직접 입력은 운영 공지 한 줄로 씁니다.' : tab === 'stats' ? '모든 세이브를 읽어 집계합니다. 활동은 마지막 저장 시각 기준이라, 자동 사냥을 켜 둔 채 접속을 끊은 모험가는 다시 접속할 때까지 세지 않습니다. 운영자가 불러올 때만 계산해 게임에는 부하가 없습니다.' : '점검할 사냥터·던전의 입장을 막습니다. 안에 있던 모험가는 다음 동기화 때 보상 없이 나오고(사냥터는 더 앞의 열린 곳으로), 반복 도전도 멈춥니다. 게임 업데이트 없이 바로 적용되며 서버마다 최대 30초 걸립니다.'}</p>
        <section className="panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>운영자 키<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" placeholder="Vercel 환경 변수 TIDEBOUND_ADMIN_KEY 값" style={field}/></label>
            {tab === 'life' && <form onSubmit={e => { e.preventDefault(); search(); }} style={{ display: 'flex', gap: 8 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="모험가 이름(일부) 또는 로그인 아이디" style={{ ...field, flex: 1 }}/>
                <button className="primary" disabled={busy || !key || !query.trim()}>찾기</button>
            </form>}
            {tab === 'events' && <button className="secondary" disabled={busy || !key} onClick={loadEvents}>이벤트 불러오기</button>}
            {tab === 'stats' && <button className="secondary" disabled={busy || !key} onClick={loadStats}>{stats ? '새로고침' : '통계 불러오기'}</button>}
            {tab === 'closures' && <button className="secondary" disabled={busy || !key} onClick={loadClosures}>목록 불러오기</button>}
            {tab === 'doors' && <button className="secondary" disabled={busy || !key} onClick={loadDoors}>목록 불러오기</button>}
            {tab === 'news' && <button className="secondary" disabled={busy || !key} onClick={loadNews}>최근 소식 불러오기</button>}
        </section>
        {error && <p role="alert" style={{ color: '#ff9a9a' }}>{error}</p>}
        {done && <p role="status" style={{ color: '#9ce8b4' }}>{done}</p>}
        {tab === 'events' && events && <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div className="panel" style={{ padding: 12, fontSize: 13 }}>지금 배너: <b>{events.banner || '진행 중인 이벤트 없음'}</b></div>
            {events.code.length > 0 && <div><h2 style={{ fontSize: 16 }}>코드에 들어 있는 이벤트</h2><ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{events.code.map(e => <li key={e.id} className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', opacity: e.disabled ? .55 : 1 }}>
                <span style={{ fontSize: 13 }}><b>{e.name || '(이름 없음)'}</b> · {mults(e)}{e.disabled ? ' · 꺼짐' : phase(e, events.at)}<br/><small style={{ color: '#9bb3b0' }}>{when(e)}</small></span>
                <button className="secondary" disabled={busy} onClick={() => toggleEvent(e.id, !e.disabled)}>{e.disabled ? '다시 켜기' : '끄기'}</button></li>)}</ul></div>}
            <div><h2 style={{ fontSize: 16 }}>운영 페이지에서 만든 이벤트 · 서버 메시지</h2>{!events.extra.length && <p style={{ color: '#9bb3b0', fontSize: 13 }}>없습니다.</p>}<ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{events.extra.map(e => <li key={e.id} className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}><b>{e.name || '(이름 없음)'}</b> · {mults(e)}{phase(e, events.at)}<br/><small style={{ color: '#9bb3b0' }}>{when(e)}</small></span>
                <button className="secondary" disabled={busy} onClick={() => removeEvent(e.id)}>삭제</button></li>)}</ul></div>
            <form className="panel" onSubmit={ev => { ev.preventDefault(); saveEvent(); }} style={{ padding: 14, display: 'grid', gap: 8 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>새 이벤트 · 서버 메시지</h2>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>배너 이름(배율은 자동으로 뒤에 붙습니다 · 배율을 모두 1로 두면 공지만 뜹니다)<input value={draft.name} maxLength={40} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="예: 숨겨진 직업 하나가 개방되었습니다" style={field}/></label>
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
                <Tile label="자동 사냥 켜 둠" value={n(stats.running)} note={`던전 진행 중 ${n(stats.inDungeon)}`}/>
                <Tile label="평균 레벨" value={String(stats.level.avg)} note={`최고 Lv.${stats.level.max}`}/>
                <Tile label="평균 환생" value={`${stats.rebirths.avg}회`} note={`최고 ${stats.rebirths.max}회 · 무릉도장 최고 ${stats.abyssBest}층`}/>
                <Tile label="총 처치" value={n(stats.totals.kills)} note={`누적 플레이 ${n(stats.totals.playHours)}시간`}/>
                <Tile label="보유 골드 합계" value={n(stats.totals.gold)} note={`중앙값 ${n(stats.medians.gold)}`}/>
                <Tile label="보유 세계석 합계" value={n(stats.totals.pearls)} note={`중앙값 ${n(stats.medians.pearls)} · 보유 SP 합계 ${n(stats.totals.sp)}`}/>
                <Tile label="길드 가입" value={n(stats.inGuild)} note={`한계돌파한 모험가 ${n(stats.limitBreakers)}`}/>
                <Tile label="최고 계급" value={stats.ranks.top} note={`안 쓴 진급 포인트 합계 ${n(stats.ranks.freePoints)} · ${stats.ranks.perks.map(p => `${p.name} ${n(p.count)}명`).join(' · ')}`}/>
                <Tile label="제단 누적 기여도" value={n(stats.altar.points)} note={`${stats.altar.gen}번째 신 ${stats.altar.godAlive ? '깨어 있음' : '잠듦'} · 신의 자리 ${stats.altar.throne || '비어 있음'} · 쌓인 몫 ${n(stats.altar.titheGold)} G`}/>
            </div>
            <div className="panel" style={{ padding: 14, display: 'grid', gap: 8 }}>
                <h2 style={{ fontSize: 15, margin: 0 }}>제단 관리</h2>
                <p style={{ color: '#9bb3b0', fontSize: 12, margin: 0 }}>{stats.altar.gen}번째 신 {stats.altar.godAlive ? '깨어 있음' : '잠듦'} · 신의 자리 {stats.altar.throne || '비어 있음'} · 쌓인 몫 {n(stats.altar.titheGold)} G · 누적 기여도 {n(stats.altar.points)}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="secondary" disabled={busy} onClick={() => resetAltar('offers')}>공물 초기화(게이지 0)</button>
                    <button className="secondary" disabled={busy} onClick={() => resetAltar('god')}>신 초기화(신·신의 자리·몫 비우기)</button>
                </div>
                <h3 style={{ fontSize: 14, margin: '6px 0 0' }}>축복 단계 설정</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={blessId} onChange={e => setBlessId(e.target.value)} aria-label="축복">{Object.entries(BLESS_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
                    <select value={blessLevel} onChange={e => setBlessLevel(Number(e.target.value))} aria-label="단계">{[0, 1, 2, 3, 4, 5, 6].map(l => <option key={l} value={l}>{l ? `${l}단계` : '끄기(0)'}</option>)}</select>
                    <input value={blessMinutes} onChange={e => setBlessMinutes(e.target.value.replace(/[^0-9]/g, ''))} placeholder="유지 분(비우면 기본)" inputMode="numeric" style={{ width: 150 }} aria-label="유지 시간(분)"/>
                    <button className="primary" disabled={busy || !key} onClick={() => void setBlessing()}>적용</button>
                </div>
                <p style={{ color: '#9bb3b0', fontSize: 12, margin: 0 }}>기여도(게이지)는 건드리지 않고 단계·시간만 둡니다. 기본 시간: 1~3단계는 단계 × 1시간, 4·5·6단계는 4·2·1시간 뒤 3단계로 내려와 12시간. 분을 적으면 그 단계가 그만큼 유지됩니다.</p>
            </div>
            <h2 style={{ fontSize: 15, margin: '4px 0 0' }}>밸런스 점검</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 10 }}>
                <Tile label={`무릉도장 ${stats.balance.godDepth}층 이상`} value={n(stats.balance.reached)} note="첫 신(검은 마법사)과 같은 난이도를 깬 모험가"/>
                <Tile label="신 도전" value={`${n(stats.balance.god.wins)}승 / ${n(stats.balance.god.tries)}회`} note={`도전한 모험가 ${n(stats.balance.god.players)} · 최고 ${Math.round(stats.balance.god.best * 100)}% 깎음`}/>
                <Tile label="오프라인 상한 도달" value={`${n(stats.balance.offline.capped)} / ${n(stats.balance.offline.settled)}`} note="최근 부재중 정산이 상한(6시간 + 긴 휴식)에 닿은 모험가"/>
                <Tile label="화상 기술 장착" value={n(stats.balance.burn)} note="플레임 디스차지 · 파이어 애로우 등"/>
            </div>
            <h2 style={{ fontSize: 15, margin: '4px 0 0' }}>환생 통계</h2>
            <p style={{ color: '#9bb3b0', fontSize: 12, margin: 0 }}>모험가마다 최근 환생 20회를 기록합니다(v27.63부터). 업데이트 전에 시작한 생은 업데이트 시점부터 잰 ‘일부’ 기록이라 평균·중앙값에서 뺍니다. 실제 시간은 생 시작부터 환생까지 흐른 시간, 사냥 시간은 그동안 전투가 진행된 시간(부재중 정산 포함)입니다.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 10 }}>
                <Tile label="최근 24시간 환생" value={`${n(stats.rebirthPace.recent.day)}회`} note={`최근 7일 ${n(stats.rebirthPace.recent.week)}회`}/>
                <Tile label="환생까지 실제 시간" value={stats.rebirthPace.measured ? dur(stats.rebirthPace.real.median) : '-'} note={stats.rebirthPace.measured ? `중앙값 · 평균 ${dur(stats.rebirthPace.real.avg)} · ${n(stats.rebirthPace.measured)}건` : '전체를 잰 환생이 아직 없습니다'}/>
                <Tile label="환생까지 사냥 시간" value={stats.rebirthPace.measured ? dur(stats.rebirthPace.play.median) : '-'} note={stats.rebirthPace.measured ? `중앙값 · 평균 ${dur(stats.rebirthPace.play.avg)}` : ''}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12 }}>
                <div className="panel" style={{ padding: 14 }}><h2 style={{ fontSize: 15, margin: '0 0 8px' }}>환생 회차별 평균 시간</h2>
                    {!stats.rebirthPace.byCount.length && <p style={{ color: '#9bb3b0', fontSize: 13, margin: 0 }}>없습니다.</p>}
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}><tbody>{stats.rebirthPace.byCount.map(b => <tr key={b.label}><td style={{ padding: '3px 0' }}>{b.label}</td><td style={{ textAlign: 'right' }}>실제 {dur(b.real)}</td><td style={{ textAlign: 'right' }}>사냥 {dur(b.play)}</td><td style={{ textAlign: 'right', color: '#9bb3b0' }}>{n(b.count)}건</td></tr>)}</tbody></table></div>
                <div className="panel" style={{ padding: 14 }}><h2 style={{ fontSize: 15, margin: '0 0 8px' }}>최근 환생 20건</h2>
                    {!stats.rebirthPace.latest.length && <p style={{ color: '#9bb3b0', fontSize: 13, margin: 0 }}>없습니다.</p>}
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, display: 'grid', gap: 3 }}>{stats.rebirthPace.latest.map((r, i) => <li key={i}>{r.name} · {r.n}번째 · {new Date(r.at).toLocaleString('ko-KR')} · 실제 {dur(r.realMs)}{r.partial ? '(일부)' : ''} · 사냥 {dur(r.playMs)} · Lv.{r.level}</li>)}</ol></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12 }}>
                <Bars title="레벨 분포" rows={stats.level.buckets} total={stats.saves}/>
                <Bars title="환생 횟수 분포" rows={stats.rebirths.buckets} total={stats.saves}/>
                <Bars title="지금 있는 사냥터" rows={stats.stages.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                <Bars title="지금 있는 던전" rows={stats.dungeons.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                <Bars title="현재 직업 상위 15" rows={stats.jobs.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                <Bars title="계급장 분포(계급 순)" rows={stats.ranks.dist.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                <div className="panel" style={{ padding: 14 }}><h2 style={{ fontSize: 15, margin: '0 0 8px' }}>진급 특전 선택</h2>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}><tbody>{stats.ranks.perks.map(p => <tr key={p.name}><td style={{ padding: '3px 0' }}>{p.name}</td><td style={{ textAlign: 'right' }}>{n(p.count)}명{stats.saves ? <small style={{ color: '#9bb3b0' }}> ({Math.round(p.count / stats.saves * 100)}%)</small> : null}</td><td style={{ textAlign: 'right', color: '#9bb3b0' }}>평균 {p.avg} / {p.max}단계</td></tr>)}</tbody></table></div>
                <Bars title="무릉도장 최고 층 분포" rows={stats.balance.abyss} total={stats.saves}/>
                <div className="panel" style={{ padding: 14 }}><h2 style={{ fontSize: 15, margin: '0 0 8px' }}>환생·레벨 상위 10</h2>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, display: 'grid', gap: 3 }}>{stats.top.map((p, i) => <li key={i}>{p.name} · 환생 {p.rebirths}회 · Lv.{p.level}{p.abyss ? ` · 무릉도장 ${p.abyss}층` : ''}</li>)}</ol></div>
            </div>
        </section>}
        {tab === 'news' && <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div className="panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>모험가 이름<input value={newsName} onChange={e => setNewsName(e.target.value)} maxLength={20} style={field}/></label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={newsTag} onChange={e => setNewsTag(e.target.checked)}/> 앞에 [테스트] 붙이기</label>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{NEWS_KINDS.map(([id, label]) => <button key={id} className="secondary" disabled={busy || !key} onClick={() => void postNews(id)}>{label}</button>)}</div>
                <form onSubmit={e => { e.preventDefault(); void postNews('custom'); }} style={{ display: 'flex', gap: 8 }}>
                    <input value={newsText} onChange={e => setNewsText(e.target.value)} maxLength={200} placeholder="직접 입력(운영 공지 한 줄, 200자까지)" style={{ ...field, flex: 1 }}/>
                    <button className="primary" disabled={busy || !key || !newsText.trim()}>올리기</button>
                </form>
            </div>
            {news && <div className="panel" style={{ padding: 14 }}><h2 style={{ fontSize: 15, margin: '0 0 8px' }}>최근 소식 {news.length}줄</h2>{!news.length && <p style={{ color: '#9bb3b0', fontSize: 13, margin: 0 }}>없습니다.</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4, fontSize: 13 }}>{[...news].reverse().map(r => <li key={r.id} style={{ color: r.hacker ? '#ff9a9a' : undefined }}><span style={{ color: '#9bb3b0' }}>{new Date(r.at + 9 * 3600_000).toISOString().slice(5, 16).replace('T', ' ')} · {r.name}</span> {r.text}</li>)}</ul></div>}
        </section>}
        {tab === 'closures' && closures && <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 13 }}><b>해커 방송</b> · {broadcast ? <>[해커 {broadcast.by}] {broadcast.text} <small style={{ color: '#9bb3b0' }}>· {new Date(broadcast.until).toLocaleTimeString()}까지</small></> : <span style={{ color: '#9bb3b0' }}>없음</span>}</span>{broadcast && <button className="secondary" disabled={busy} onClick={removeBroadcast}>방송 지우기</button>}</div>
            <div className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 13 }}><b>정보 비공개</b> · {secrecy ? `${secrecy.on ? '켜짐' : '꺼짐(오픈 베타)'}${secrecy.env ? ` · 환경 변수 ${secrecy.env} 우선` : ''}` : '-'}</span>{secrecy && <button className="secondary" disabled={busy || !!secrecy.env} onClick={toggleSecrecy}>{secrecy.on ? '끄기' : '켜기'}</button>}</div>
            <div className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 13 }}><b>해킹 효과</b> · {hackFx ? `이벤트 변조 ${hackFx.tamper} · 서버 다운 ${hackFx.down} · 패치 ${hackFx.patched} · DDoS ${hackFx.ddos || 0}` : '-'}</span>{hackFx && hackFx.tamper + hackFx.down + hackFx.patched + (hackFx.ddos || 0) > 0 && <button className="secondary" disabled={busy} onClick={removeHackEffects}>모두 지우기</button>}</div>
            {closureList('dungeons', '던전')}{closureList('stages', '사냥터')}</section>}
        {tab === 'doors' && doors && <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div className="panel" style={{ padding: 12, fontSize: 13 }}>운영자가 연 문: <b>{doors.doors.filter(d => d.open).map(d => d.name).join(', ') || '없음(모두 조건대로)'}</b></div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{doors.doors.map(r => <li key={r.id} className="panel" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}><b>{r.name}</b> · {r.door} · {r.open ? <b style={{ color: '#9ce8b4' }}>모두에게 열림</b> : <span style={{ color: '#9bb3b0' }}>조건대로</span>}<br/><small style={{ color: '#9bb3b0' }}>{r.hint}</small></span>
                <button className={r.open ? 'secondary' : 'primary'} disabled={busy} onClick={() => toggleDoor(r)}>{r.open ? '닫기' : '열기'}</button></li>)}</ul>
        </section>}
        {tab === 'life' && players && <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 16 }}>검색 결과 {players.length}명{players.length === 30 ? ' (최대 30명까지 표시)' : ''}</h2>
            {!players.length && <p style={{ color: '#9bb3b0' }}>찾은 모험가가 없습니다.</p>}
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>{players.map(p => <li key={p.id} className="panel" style={{ padding: 10, border: preview?.id === p.id || edit?.player.id === p.id ? '1px solid #d5b36c' : undefined }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}><b>{p.name}</b> · 아이디 {p.username || '?'} · {p.slot}번 슬롯<br/><small style={{ color: '#9bb3b0' }}>{line(p)} · 마지막 저장 {new Date(p.updatedAt).toLocaleString('ko-KR')}{lifeLine(p) ? <><br/>{lifeLine(p)}</> : null}</small></span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="secondary" disabled={busy} onClick={() => { setPreview(null); setDone(''); setEdit({ player: p, gold: String(p.gold), pearls: String(p.pearls) }); }}>골드·세계석</button>
                    <button className="secondary" disabled={busy} onClick={() => setSpOpen(spOpen === p.id ? null : p.id)} aria-expanded={spOpen === p.id}>SP 내역</button>
                    <button className="secondary" disabled={busy} onClick={() => look(p.id)}>초기화 미리 보기</button>
                </span>
                </div>
                {spOpen === p.id && <SpDetail sp={p.sp}/>}
            </li>)}</ul>
        </section>}
        {tab === 'life' && edit && <form className="panel" onSubmit={e => { e.preventDefault(); adjust(); }} style={{ padding: 16, marginTop: 16, display: 'grid', gap: 8 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>골드·세계석 조정 · {edit.player.name} ({edit.player.username || '?'} · {edit.player.slot}번 슬롯)</h2>
            <p style={{ fontSize: 13, color: '#9bb3b0', margin: 0 }}>입력한 값으로 바뀝니다(더하기가 아니라 최종 값). 비워 두면 그대로 둡니다. 지금: 골드 {edit.player.gold.toLocaleString()} · 세계석 {edit.player.pearls.toLocaleString()}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>골드<input inputMode="numeric" value={edit.gold} onChange={e => setEdit({ ...edit, gold: e.target.value })} style={field}/></label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>세계석<input inputMode="numeric" value={edit.pearls} onChange={e => setEdit({ ...edit, pearls: e.target.value })} style={field}/></label>
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
