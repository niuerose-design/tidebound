'use client';
import { useState } from 'react';
import { BLESS_NAMES, kstToIso, line } from './parts';
import type { AdminPlayer, Preview, EventList, ClosureRow, ClosureList, Tab, MarketAdmin, IncomeData, NewsRow, Stats } from './types';

/** v3.413 운영자 페이지의 상태와 서버 호출(page.tsx 에서 분리). 탭 화면은 이 훅이 돌려주는 값을 받습니다. */
export function useAdmin() {
    const [key, setKey] = useState(''), [query, setQuery] = useState(''), [players, setPlayers] = useState<AdminPlayer[] | null>(null);
    const [broadcast, setBroadcast] = useState<{ text: string; by: string; until: number } | null>(null);
    /** v3.43 정보 비공개 스위치(docs/concept.md 10장). env가 있으면 환경 변수가 우선합니다. */
    const [secrecy, setSecrecyState] = useState<{ on: boolean; env: string | null } | null>(null);
    // v3.333 서버 리전 점검.
    const [region, setRegion] = useState<{ functionRegion: string | null; functionCity: string | null; dbRegion: string | null; recommended: string | null; recommendedCity: string | null; aligned: boolean } | null>(null);
    const [hackFx, setHackFx] = useState<{ tamper: number; down: number; patched: number; ddos?: number } | null>(null);
    const [tab, setTab] = useState<Tab>('life'), [events, setEvents] = useState<EventList | null>(null), [closures, setClosures] = useState<ClosureList | null>(null), [stats, setStats] = useState<Stats | null>(null);
    const [draft, setDraft] = useState({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1', mimic: '1', nuri: '1' });
    const [spOpen, setSpOpen] = useState<string | null>(null);
    const [income, setIncome] = useState<IncomeData | null>(null), [incomeQuery, setIncomeQuery] = useState('');
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
        if (d) { setDone(`적용했습니다: ${line(d.after)} · 유저 화면은 다음 동기화(사냥 중 5초 · 대기 중 최대 60초) 때 바뀝니다.`); setPreview(null); setPlayers(null); }
    };
    const adjust = async () => {
        if (!edit) return;
        const gold = edit.gold.replace(/[,\s]/g, ''), pearls = edit.pearls.replace(/[,\s]/g, '');
        if (!confirm(`${edit.player.name}(${edit.player.username || '아이디 없음'} · ${edit.player.slot}번 슬롯)\n골드 ${edit.player.gold.toLocaleString()} → ${gold === '' ? '그대로' : Number(gold).toLocaleString()}\n세계석 ${edit.player.pearls.toLocaleString()} → ${pearls === '' ? '그대로' : Number(pearls).toLocaleString()}\n이대로 바꿀까요?`)) return;
        const d = await call({ action: 'adjust', id: edit.player.id, gold: gold === '' ? undefined : Number(gold), pearls: pearls === '' ? undefined : Number(pearls) });
        if (d) { setDone(`조정했습니다: ${line(d.after)} · 유저 화면은 다음 동기화(사냥 중 5초 · 대기 중 최대 60초) 때 바뀝니다.`); setEdit(null); setPlayers(ps => ps && ps.map(p => p.id === d.after.id ? d.after : p)); }
    };
    const loadEvents = async () => { const d = await call({ action: 'events' }); if (d) setEvents(d); };
    const saveEvent = async () => {
        const d = await call({ action: 'saveEvent', event: { name: draft.name, from: kstToIso(draft.from), until: kstToIso(draft.until), exp: Number(draft.exp), gold: Number(draft.gold), drop: Number(draft.drop), mastery: Number(draft.mastery), mimic: Number(draft.mimic), nuri: Number(draft.nuri) } });
        if (d) { setEvents(d); setDone('이벤트를 저장했습니다. 유저 화면에는 최대 1분 안에 반영됩니다.'); setDraft({ name: '', from: '', until: '', exp: '1', gold: '1', drop: '1', mastery: '1', mimic: '1', nuri: '1' }); }
    };
    const removeEvent = async (id: string) => { if (!confirm('이 이벤트를 삭제할까요?')) return; const d = await call({ action: 'deleteEvent', id }); if (d) setEvents(d); };
    // v3.375 세이브 익명 내보내기: JSON 파일로 내려받습니다(tests/fixtures/saves/ 에 두고 마이그레이션 · 골든 테스트의 입력으로 씀).
    const [fxLimit, setFxLimit] = useState('20'), [fxMinLevel, setFxMinLevel] = useState('10');
    const exportFixtures = async () => {
        const d = await call({ action: 'exportFixtures', limit: Number(fxLimit) || 20, minLevel: Number(fxMinLevel) || 1 });
        if (!d) return;
        const blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = `saves-${d.build}-${d.exportedAt.slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
        setDone(`세이브 ${d.count}개를 익명으로 내려받았습니다(이름 · 계정 · 길드 · 상대 기록 제거).`);
    };
    const loadStats = async () => { const d = await call({ action: 'stats' }); if (d) setStats(d); const x = await call({ action: 'expedition' }); if (x) setExpedition(x); };
    const [expedition, setExpedition] = useState<{ players: number; runs: number; clears: number; wins: number; ghostFights: number; ghostWins: number; rounds: { round: number; plays: number; wins: number; rate: number }[]; units: { id: string; name: string; count: number }[]; comps?: { key: string; name: string; plays: number; wins: number; rate: number }[] } | null>(null);
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
    const loadClosures = async () => { const d = await call({ action: 'closures' }); if (d) setClosures(d); const h = await call({ action: 'hacks' }); if (h) { setBroadcast(h.broadcast); setHackFx(h.effects || null); } const sc = await call({ action: 'secrecy' }); if (sc) setSecrecyState(sc); const rg = await call({ action: 'region' }); if (rg) setRegion(rg); };
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
    /** v3.213 증권거래소: 장 폐쇄 · 서킷브레이커 · 사유. */
    const [market, setMarket] = useState<MarketAdmin | null>(null), [haltMin, setHaltMin] = useState('30'), [marketReason, setMarketReason] = useState('');
    const loadMarket = async () => { const d = await call({ action: 'market' }); if (d) { setMarket(d); setMarketReason(d.control.reason || ''); } };
    const setMarketControl = async (change: { closed?: boolean; haltMinutes?: number }, what: string) => {
        if (!confirm(`${what}\n사유: ${marketReason.trim() || '(없음)'}\n모든 모험가에게 적용됩니다(다른 서버는 최대 30초 뒤).`)) return;
        const d = await call({ action: 'setMarket', ...change, reason: marketReason });
        if (d) { setMarket(d); setDone(`${what} 완료.`); }
    };
    const loadIncome = async (query = incomeQuery) => { const d = await call({ action: 'income', query }); if (d) setIncome(d); };
    const loadNews = async () => { const d = await call({ action: 'news' }); if (d) setNews(d.rows); };
    const clearChat = async (scope: string, what: string) => {
        if (!confirm(`${what}을(를) 지울까요?\n되돌릴 수 없습니다. 이미 열려 있는 화면에는 새로고침 전까지 옛 줄이 남을 수 있습니다.`)) return;
        const d = await call({ action: 'clearChat', scope });
        if (d) { setNews(d.rows); setDone(`${what}을(를) 지웠습니다 · ${Number(d.removed).toLocaleString('ko-KR')}줄.`); }
    };
    const postNews = async (kind: string) => { const d = await call({ action: 'newsTest', kind, name: newsName, text: newsText, tag: newsTag }); if (d) { setNews(d.rows); setDone('소식 탭에 올렸습니다. 게임 화면의 기록판 → 소식에서 확인하세요.'); if (kind === 'custom') setNewsText(''); } };
    const openTab = (id: Tab) => { setTab(id); setError(''); setDone(''); if (!key) return; if (id === 'events') loadEvents(); if (id === 'closures') loadClosures(); if (id === 'stats') loadStats(); if (id === 'news') loadNews(); if (id === 'income') void loadIncome(); if (id === 'market') void loadMarket(); };
    return { key, setKey, query, setQuery, players, setPlayers, broadcast, setBroadcast, secrecy, setSecrecyState, region, setRegion, hackFx, setHackFx, tab, setTab, events, setEvents, closures, setClosures, stats, setStats, draft, setDraft, spOpen, setSpOpen, income, setIncome, incomeQuery, setIncomeQuery, news, setNews, newsName, setNewsName, newsText, setNewsText, newsTag, setNewsTag, edit, setEdit, preview, setPreview, done, setDone, error, setError, busy, setBusy, call, search, look, apply, adjust, loadEvents, saveEvent, removeEvent, fxLimit, setFxLimit, fxMinLevel, setFxMinLevel, exportFixtures, loadStats, expedition, setExpedition, resetAltar, blessId, setBlessId, blessLevel, setBlessLevel, blessMinutes, setBlessMinutes, setBlessing, loadClosures, toggleSecrecy, removeHackEffects, removeBroadcast, toggleClosed, market, setMarket, haltMin, setHaltMin, marketReason, setMarketReason, loadMarket, setMarketControl, loadIncome, loadNews, clearChat, postNews, openTab };
}
export type Admin = ReturnType<typeof useAdmin>;
