'use client';
import { SEASON_REWARDS, difficultyOf, LEAGUE, leagueTierName } from '@/game/data/expedition';
import { rebirthTitle } from '@/game/data/long-term';
import { duelTier, recommendOpponents, RECOMMEND_RANGE, duelAllowance } from '@/game/systems/duel';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, RefreshCw, Swords, Fish, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import type { DuelResult, Snapshot, State } from '@/game/types';
import { BALANCE } from '@/game/data/balance';
import { jobById } from '@/game/data/classes';
import { skillById } from '@/game/data/skills';
import { BOSS_OPPONENTS, bossSnapshot } from '@/game/systems/duel';
import { skillLevel } from '@/game/systems/progression';
import { normalizeStats } from '@/game/systems/stats';
import { STAT_LABELS, statDisplay } from '@/game/data/progression';
import { vowBadgeLabel } from '@/game/systems/vows';
import { Empty, Heading, SkillIcon, format, useNow } from './shared';
import { BattleLogLine, withTurnDividers } from './combat-log';
import type { Ranking, AbyssRow } from './use-game';
import { abyssWeeklyPearls } from '@/game/systems/progress';
import type { PanelProps } from './panel-props';
import { isHackerJob } from '@/game/data/hacker';
import { adguardLevel, canAttack, hackCost, hackCap } from '@/game/systems/hacker';
import { HACKER } from '@/game/data/hacker';
import { dayKey } from '@/game/data/time';

/** 랭킹 줄과 상세보기에 보여 주는 주요 능력치. */
const MAIN_STATS = ['hp', 'attack', 'magic', 'defense', 'resist', 'speed'] as const;
const DETAIL_STATS = ['hp', 'hpRegen', 'attack', 'magic', 'defense', 'resist', 'speed', 'accuracy', 'evasion', 'crit', 'critDamage', 'mana', 'manaRegen', 'penetration', 'lifesteal'] as const;
const SHORT: Record<typeof MAIN_STATS[number], string> = { hp: '체력', attack: '물공', magic: '마공', defense: '물방', resist: '마방', speed: '속도' };
/** v3.18 가린 항목(v3.26 신원 조작)이면 ???로 그립니다. */
const hid = (r: { masked?: string[] }, f: string) => !!r.masked?.includes(f);
const jobName = (id: string) => id === 'boss' ? '던전 보스' : jobById(id)?.name || '??';
/** 등록 시점의 스킬 편성: 액티브는 판정 순서대로, 패시브는 그 뒤에. 성장 레벨은 등록된 SP·숙련으로 계산합니다. */
function loadout(snap: Snapshot) {
    const rows = snap.skills.map(id => { const sk = skillById(id); return sk ? { sk, level: skillLevel(sk, snap.skillRanks?.[id] || 1, snap.skillMastery?.[id] || 0) } : null; }).filter((x): x is NonNullable<typeof x> => !!x);
    return { active: rows.filter(r => r.sk.type === 'active'), passive: rows.filter(r => r.sk.type === 'passive') };
}
function MainStats({ stats }: { stats: Snapshot['stats'] }) {
    const a = normalizeStats(stats);
    return <small className="block ranking-main-stats">{MAIN_STATS.map(k => <span key={k}>{SHORT[k]} <b>{statDisplay(k, a[k])}</b></span>)}</small>;
}
export function Rankings({ s, send, busy, rows, rankError, loadRanking, abyss, loadAbyss, register, result, setResult , season }: PanelProps & {
    rows: Ranking[];
    rankError: string;
    loadRanking: () => void;
    season?: string;
    abyss: { week: string; rows: AbyssRow[] } | null;
    loadAbyss: () => void;
    register: () => void;
    result: DuelResult | null;
    setResult: (v: DuelResult | null) => void;
}) {
    // v3.93 시계: 결투 대기(60초) 중일 때만 1초마다, 아니면 10초마다 갱신합니다(순위표 100줄을 매초 다시 그리지 않음).
    const slow = useNow(10_000), cooling = slow - s.lastDuel < BALANCE.duelCooldownMs + 10_000, fast = useNow(cooling ? 1000 : 60_000), now = Math.max(slow, fast);
    const [detail, setDetail] = useState<Ranking | null>(null);
    const [sort, setSort] = useState<'rating' | 'power' | 'level' | 'rebirths'>('rating');
    const sorted = useMemo(() => [...rows].sort((a, b) => (b[sort] - a[sort]) || (b.rating - a.rating) || (b.power - a.power)), [rows, sort]);
    // 등록한 지 오래된 내 방어용 정보는 화면을 열 때 한 번 자동으로 다시 등록합니다(10분 이상 지났을 때).
    const refreshed = useRef(false);
    const me = rows.find(r => r.self);
    useEffect(() => { if (!refreshed.current && me && !busy && Date.now() - me.updatedAt > 10 * 60 * 1000) { refreshed.current = true; register(); } }, [me, busy, register]);
    const detailLoadout = detail ? loadout(detail) : null, detailStats = detail ? normalizeStats(detail.stats) : null;
    return <>
    <Heading eyebrow="ASYNC ARENA" title="모험가의 명예" description="등록된 능력치와 스킬로 겨룹니다. 상대의 접속 여부와 관계없이 전투합니다.">
    <button className="primary" disabled={busy || isHackerJob(s.job)} onClick={register} title={isHackerJob(s.job) ? '해커는 결투 정보를 등록하지 않습니다. 다른 직업으로 등록해 둔 기록은 그대로 남습니다.' : undefined}>
    <ArrowUpRight size={17}/>{isHackerJob(s.job) ? '해커는 등록 불가' : '내 전투 정보 등록'}</button>
    </Heading>
    <p className="arena-season">결투 시즌 <b>{season || '—'}</b> · 매달 1일 0시(한국 시간) 점수 1000으로 초기화 · 시즌 순위 보상은 없습니다(점수 · 순위 기록만)</p>
    <div className="arena-stats">
    <div className="panel">
    <small>내 결투 점수</small>
    <strong>{s.rating} <span className={`duel-tier tier-${duelTier(s.rating).id}`}>{duelTier(s.rating).name}</span></strong>
    </div>
    <div className="panel">
    <small>랭크 전적</small>
    <strong>{s.wins}승 <span>{s.losses}패</span>
    </strong>
    </div>
    {(() => { const a = duelAllowance(s, now); return <div className="panel" title={`랭크 결투는 하루 ${a.perDay}회, 같은 상대와는 하루 ${a.perOpponent}회, ${Math.round(BALANCE.duelCooldownMs / 1000)}초에 한 번입니다(한국 시간 자정에 초기화). 연습 대결은 점수·전적이 바뀌지 않고 횟수 제한이 없습니다.`}>
    <small>오늘 랭크 결투</small>
    <strong>{a.left} <span>/ {a.perDay}회 남음</span></strong>
    <small className="block">같은 상대 하루 {a.perOpponent}회 · {a.cooldown > 0 ? `${Math.ceil(a.cooldown / 1000)}초 뒤 가능` : '지금 가능'} · 연습은 무제한</small>
    </div>; })()}
    </div>
    <Tabs defaultValue="ranking">
    <TabsList className="game-tabs">
    <TabsTrigger value="ranking">모험가 랭킹</TabsTrigger>
    <TabsTrigger value="training">훈련 상대</TabsTrigger>
    {s.rebirths >= 3 && <TabsTrigger value="abyss" onClick={() => { if (!abyss) loadAbyss(); }}>무릉도장 · 주간</TabsTrigger>}
    {(s.hacker || s.rebirths >= 3) && <TabsTrigger value="hacker">해커 · 월간</TabsTrigger>}
    {(s.hacker || s.rebirths >= 3) && <TabsTrigger value="crew">조직 · 주간</TabsTrigger>}
    <TabsTrigger value="expedition">원정대 · 월간</TabsTrigger>
    <TabsTrigger value="league">원정 · 주간 리그</TabsTrigger>
    </TabsList>
    <TabsContent value="abyss"><AbyssBoard s={s} abyss={abyss} reload={loadAbyss}/></TabsContent>
    <TabsContent value="hacker"><HackerBoard s={s} send={send} busy={busy}/></TabsContent>
    <TabsContent value="crew"><CrewBoard s={s}/></TabsContent>
    <TabsContent value="expedition"><ExpeditionBoard s={s}/></TabsContent>
    <TabsContent value="league"><LeagueBoard s={s}/></TabsContent>
    <TabsContent value="ranking">
    {(() => { const picks = recommendOpponents(rows, s.rating); return picks.length ? <div className="panel ranking-panel recommend-panel">
        <div className="section-title"><h2>추천 상대</h2><span>내 점수 ±{RECOMMEND_RANGE} 안에서 가까운 순</span></div>
        <div className="recommend-list">{picks.map(r => <div key={r.id} className="recommend-row"><div><strong>{r.name}</strong><small>Lv. {hid(r, 'level') ? '???' : r.level} · {hid(r, 'job') ? '???' : jobName(r.job)} · 점수 {r.rating} <span className={`duel-tier tier-${duelTier(r.rating).id}`}>{duelTier(r.rating).name}</span></small></div>
            <button className="secondary small" disabled={busy || now - s.lastDuel < BALANCE.duelCooldownMs} onClick={() => send({ type: 'ranked', id: r.id }, '/api/duel')}>대결</button></div>)}</div>
    </div> : null; })()}
    <div className="panel ranking-panel">
    <div className="section-title">
    <h2>등록된 모험가 <small className="micro">최대 {BALANCE.duelMaxTurns}턴 · 무승부 지원 · 1분 간격</small></h2>
    <div className="ranking-sort" role="group" aria-label="정렬">{([['rating', '점수'], ['power', '전투력'], ['level', '레벨'], ['rebirths', '환생']] as const).map(([k, label]) => <button type="button" key={k} className={sort === k ? 'active' : ''} aria-pressed={sort === k} onClick={() => setSort(k)}>{label}</button>)}<button className="text-button" onClick={loadRanking}><RefreshCw size={14}/>새로고침</button></div>
    </div>{rankError ? <div className="error-box">{rankError}</div> : rows.length ? <Table>
        <TableHeader>
        <TableRow>
        <TableHead>순위</TableHead>
        <TableHead>모험가</TableHead>
        <TableHead>길드</TableHead>
        <TableHead>전투력</TableHead>
        <TableHead>점수</TableHead>
        <TableHead>결투</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>{sorted.map((r, i) => <TableRow key={r.id}>
            <TableCell className="rank-number">{i + 1}</TableCell>
            <TableCell className="ranking-who">
            <strong>{!r.masked && (r.title ?? rebirthTitle(r.rebirths)) ? <small className="rebirth-title">{r.title ?? rebirthTitle(r.rebirths)}</small> : null}{r.seasonRank && r.seasonRank <= 3 ? <small className="rebirth-title season-rank">지난 시즌 {r.seasonRank}위</small> : null}{r.name}{r.self ? ' (나)' : ''}</strong>{r.vows?.map(v => <small key={v} className={`vow-badge vow-${v.replace(/\d/, '')}`}>{vowBadgeLabel(v)}</small>)}
            <small className="block">Lv. {hid(r, 'level') ? '???' : r.level} · {hid(r, 'job') ? '???' : jobName(r.job)} · 환생 {hid(r, 'level') ? '???' : r.rebirths}회 · {new Date(r.updatedAt).toLocaleDateString('ko-KR')} 등록</small>
            {hid(r, 'gear') ? <small className="block ranking-main-stats">능력치 ???</small> : <MainStats stats={r.stats}/>}
            </TableCell>
            <TableCell data-label="길드"><span className="ranking-guild">{hid(r, 'guild') ? '???' : r.guild || '무소속'}</span></TableCell>
            <TableCell data-label="전투력">{hid(r, 'gear') ? '???' : format(r.power)}</TableCell>
            <TableCell data-label="점수">{r.rating} <span className={`duel-tier tier-${duelTier(r.rating).id}`}>{duelTier(r.rating).name}</span></TableCell>
            <TableCell className="ranking-actions">
            {(() => { const a = duelAllowance(s, now, r.id); return <><button className="secondary small" disabled={busy || r.self || a.cooldown > 0 || a.left <= 0 || a.vs <= 0} title={r.self ? undefined : `이 상대와 오늘 ${a.vs}회 남음`} onClick={() => send({ type: 'ranked', id: r.id }, '/api/duel')}>{r.self ? '내 캐릭터' : `대결 ${a.vs}/${a.perOpponent}`}</button><button className="secondary small" disabled={busy || r.self} title="점수·전적이 바뀌지 않는 연습 대결" onClick={() => send({ type: 'training', id: `user:${r.id}` }, '/api/duel')}>연습</button></>; })()}
            <button className="text-button" onClick={() => setDetail(r)}>상세보기</button>
            {r.masked && canAttack(s) && (s.hacker?.tier || 0) >= 1 && <button className="secondary small" disabled={busy} title="신원 조작을 1시간 동안 풉니다(비트 소모)" onClick={() => send({ type: 'hackRun', id: 'crack', value: r.id }, '/api/hack')}>크래킹</button>}
            {!r.masked && !r.self && isHackerJob(s.job) && adguardLevel(s) >= 1 && <button className="secondary small" disabled={busy} title="이 모험가의 정보를 무기한 ???로 가립니다(전부 가림, 비트 소모). 기간·공개 항목은 해킹 화면에서 정합니다" onClick={() => send({ type: 'hackRun', id: 'spoof', value: `${r.id}||0` }, '/api/hack')}>신원 조작</button>}
            </TableCell>
            </TableRow>)}</TableBody>
        </Table> : <Empty title="첫 번째 모험가가 되어보세요" description="전투 정보를 등록하면 랭킹에 등장합니다. 다른 참가자가 없을 때는 훈련 상대와 대결할 수 있습니다."/>}</div>
    </TabsContent>
    <TabsContent value="training">
    <div className="section-title training-title"><h2><Users size={17}/> 등록된 모험가</h2><span>방어용 등록 정보 그대로 · 점수·전적 변동 없음</span></div>
    {rows.length ? <div className="class-grid">{rows.map(r => <div className="panel training-card" key={r.id}>
        <Swords size={35}/>
        <span className="badge">{r.self ? '내 등록 정보' : '등록된 모험가'}</span>
        <h2>{r.name}</h2>
        <p>Lv. {hid(r, 'level') ? '???' : r.level} · {hid(r, 'job') ? '???' : jobName(r.job)} · 환생 {hid(r, 'level') ? '???' : r.rebirths}회</p>
        {hid(r, 'gear') ? <small className="block ranking-main-stats">능력치 ???</small> : <MainStats stats={r.stats}/>}
        <div className="training-actions"><button className="primary" disabled={busy} onClick={() => send({ type: 'training', id: `user:${r.id}` }, '/api/duel')}>연습 대결</button><button className="text-button" onClick={() => setDetail(r)}>상세보기</button></div>
        </div>)}</div> : <p className="footnote">등록된 모험가가 없어 던전 보스와 훈련합니다. 전투 정보를 등록하면 내 방어용 정보와도 연습할 수 있습니다.</p>}
    <div className="section-title training-title"><h2><Fish size={17}/> 던전 보스</h2><span>던전 마지막 웨이브와 같은 능력치·스킬</span></div>
    <div className="class-grid">{BOSS_OPPONENTS.map(f => { const b = bossSnapshot(f.id)!, a = normalizeStats(b.stats); return <div className="panel training-card" key={f.id}>
        <Fish size={35}/>
        <span className="badge">던전 보스</span>
        <h2>{f.name}</h2>
        <p>Lv. {f.level} · {f.lore}</p>
        <div className="training-stats">체력 {format(a.hp)} · 공격 {a.attack} · 마법 {a.magic}<br />방어 {a.defense} · 마법 방어 {a.resist} · 속도 {a.speed}</div>
        <button className="primary" disabled={busy} onClick={() => send({ type: 'training', id: `boss:${f.id}` }, '/api/duel')}>연습 대결</button>
        </div>; })}</div>
    </TabsContent>
    </Tabs>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}>
    <DialogContent className="duel-dialog ranking-detail">
    <DialogHeader>
    <DialogTitle>{detail?.name}{detail?.self ? ' (나)' : ''}</DialogTitle>
    <DialogDescription>{detail && `Lv. ${hid(detail, 'level') ? '???' : detail.level} · ${hid(detail, 'job') ? '???' : jobName(detail.job)} · 환생 ${hid(detail, 'level') ? '???' : detail.rebirths}회 · ${hid(detail, 'guild') ? '???' : detail.guild || '무소속'} · 전투력 ${hid(detail, 'gear') ? '???' : format(detail.power)} · 점수 ${detail.rating} · ${new Date(detail.updatedAt).toLocaleString('ko-KR')} 등록`}</DialogDescription>
    </DialogHeader>
    {detailStats && <div className="ranking-detail-stats">{DETAIL_STATS.map(k => <span key={k}><small>{STAT_LABELS[k]}</small><b>{statDisplay(k, detailStats[k])}</b></span>)}</div>}
    {detailLoadout && <div className="ranking-detail-skills">
        <div><h3>액티브 <small>판정 순서</small></h3>{detailLoadout.active.length ? <ul>{detailLoadout.active.map((r, i) => <li key={r.sk.id}><span className="skill-symbol"><SkillIcon id={r.sk.id}/></span><span><strong>{i + 1}. {r.sk.name}</strong><small>성장 Lv.{r.level}{r.sk.job ? ` · ${jobName(r.sk.job)}` : ' · 공용'}</small></span></li>)}</ul> : <p className="footnote">등록된 액티브 스킬이 없습니다. 기본 공격만 합니다.</p>}</div>
        <div><h3>패시브</h3>{detailLoadout.passive.length ? <ul>{detailLoadout.passive.map(r => <li key={r.sk.id}><span className="skill-symbol"><SkillIcon id={r.sk.id}/></span><span><strong>{r.sk.name}</strong><small>성장 Lv.{r.level}{r.sk.job ? ` · ${jobName(r.sk.job)}` : ' · 공용'}</small></span></li>)}</ul> : <p className="footnote">등록된 패시브 스킬이 없습니다.</p>}</div>
    </div>}
    </DialogContent>
    </Dialog>
    <Dialog open={!!result} onOpenChange={open => {
            if (!open)
                setResult(null);
        }}>
    <DialogContent className="duel-dialog">
    <DialogHeader>
    <DialogTitle>{result?.winner === 'player' ? '승리했습니다' : result?.winner === 'draw' ? '무승부' : '다음 결투를 준비하세요'}</DialogTitle>
    <DialogDescription>{result?.opponent} · {result?.turns}턴 전투 · {result?.training ? '훈련 대결' : `점수 ${result?.ratingChange && result.ratingChange > 0 ? '+' : ''}${result?.ratingChange}`}</DialogDescription>
    </DialogHeader>
    <div className="duel-hp">
    <span>내 남은 체력 <b>{result?.playerHp}</b>
    </span>
    <span>상대 남은 체력 <b>{result?.opponentHp}</b>
    </span>
    </div>
    <div className="duel-hit-summary">
    <span>내 명중률 <b>{result ? Math.round(result.playerHitChance * 100) : 0}%</b> · 명중 수치 {result ? statDisplay('accuracy', result.playerAccuracy) : '-'}</span>
    <span>상대 명중률 <b>{result ? Math.round(result.opponentHitChance * 100) : 0}%</b> · 상대 회피 수치 {result ? statDisplay('evasion', result.opponentEvasion) : '-'}</span>
    <span>내 회피 수치 {result ? statDisplay('evasion', result.playerEvasion) : '-'} · 상대 명중 수치 {result ? statDisplay('accuracy', result.opponentAccuracy) : '-'}</span>
    </div>
    <div className="duel-log">{result?.rounds?.length ? withTurnDividers(result.rounds.map((r, i) => ({ id: i, turn: r.turn, text: '', type: 'battle' as const, event: r.event })), log => <div key={log.id} className="log-line battle"><BattleLogLine log={log} playerName={s.name}/></div>) : result?.logs.map((l, i) => <p key={i}>{l}</p>)}</div>
    </DialogContent>
    </Dialog>
    </>;
}

/** v25.6 주간 심연 기록판: 한국 시간 월요일에 새 주가 시작되고, 지난주 순위 보상은 다음 행동 때 자동으로 세계석으로 들어옵니다. */
function AbyssBoard({ s, abyss, reload }: { s: State; abyss: { week: string; rows: AbyssRow[] } | null; reload: () => void }) {
    const mine = s.abyssWeek, rewards = [1, 2, 3, 10, 50].map(r => `${r === 1 ? '1위' : r === 2 ? '2위' : r === 3 ? '3위' : `${r}위 안`} ${abyssWeeklyPearls(r)}`).join(' · ');
    return <section className="panel ranking-panel abyss-board">
        <div className="section-title"><h2><ArrowUpRight size={17}/> 이번 주 무릉도장 최고 층{abyss ? ` · ${abyss.week}` : ''}</h2><button className="text-button" onClick={reload}><RefreshCw size={13}/> 새로고침</button></div>
        <p className="footnote">무릉도장(환생 3회)에서 이번 주에 정복한 가장 깊은 층으로 겨룹니다. 한국 시간 월요일 0시에 새 주가 시작되고, 지난주 보상은 다음 행동 때 자동 지급: {rewards} · 참가 1세계석. 내 기록은 심연을 정복하면 바로 올라갑니다.</p>
        {mine && <p className="abyss-mine">내 이번 주 기록 <b>{mine.best}층</b>{mine.dirty ? ' · 올리는 중' : ''}</p>}
        {!abyss ? <p className="footnote">불러오는 중…</p> : !abyss.rows.length ? <Empty title="아직 기록이 없습니다" description="이번 주에 무릉도장을 정복한 모험가가 없습니다. 첫 기록을 남겨 보세요."/> :
        <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead><TableHead>층</TableHead><TableHead>직업</TableHead><TableHead>환생</TableHead></TableRow></TableHeader>
        <TableBody>{abyss.rows.map(r => <TableRow key={r.id} className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''}</TableCell><TableCell><b>{r.depth}층</b></TableCell><TableCell>{hid(r, 'job') ? '???' : jobName(r.job)}</TableCell><TableCell>{hid(r, 'level') ? '???' : r.rebirths}</TableCell></TableRow>)}</TableBody></Table>}
    </section>;
}

type HackerRow = { rank: number; id: string; name: string; job: string; depth: number; hacks: number; restores: number; grade: number; score: number; self: boolean; masked?: string[]; /** v3.34 조직 이름(이름을 가리면 함께 가림) */ crew?: string };
/** v3.25 해커 순위(월): 침투 작전 최고 깊이 ×10 + 해킹 실행 ×5 + 화이트 해커 복구 ×5. 탭을 열 때 한 번 불러옵니다. */
function HackerBoard({ s, send, busy }: { s: State; send: PanelProps['send']; busy: boolean }) {
    const [board, setBoard] = useState<{ month: string; rows: HackerRow[] } | null>(null), [error, setError] = useState('');
    const [nonce, setNonce] = useState(0), load = () => setNonce(n => n + 1);
    useEffect(() => {
        let alive = true;
        fetch('/api/ranking?board=hacker', { cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || '불러오지 못했습니다.'); if (alive) { setBoard(d); setError(''); } }).catch(e => { if (alive) setError(e instanceof Error ? e.message : '불러오지 못했습니다.'); });
        return () => { alive = false; };
    }, [nonce]);
    const mine = s.hacker?.season, clock = useNow(60_000);
    // v3.27 해커(화이트 해커 제외)는 다른 해커를 견제합니다(역추적·과부하, 각각 하루 1회). v3.28 블랙 해커는 2회.
    // v3.28 블랙 해커도 견제합니다(비트 두 배).
    const rival = canAttack(s) && (s.hacker?.tier || 0) >= 1, today = s.hacker?.day === dayKey(clock), used = today ? s.hacker?.used || {} : {}, bits = s.hacker?.bits || 0;
    return <section className="panel ranking-panel abyss-board">
        <div className="section-title"><h2><ArrowUpRight size={17}/> 이번 달 해커 순위{board ? ` · ${board.month}` : ''}</h2><button className="text-button" onClick={load}><RefreshCw size={13}/> 새로고침</button></div>
        <p className="footnote">점수 = 침투 작전 최고 깊이 ×10 + 해킹 실행 ×5 + 화이트 해커 복구 ×5. 한국 시간 매월 1일에 새로 셉니다. 신원 조작으로 가린 이름은 ???로 보입니다. 해커·블랙 해커는 다른 해커를 역추적(오늘 침투 입장 −1)하거나 과부하(브루트포스 비트 절반 2시간)로 견제할 수 있습니다(각각 하루 1회, 블랙 해커는 2회, 화이트 해커 방화벽이 하루 한 번 막음).</p>
        {mine && <p className="abyss-mine">내 이번 달 기록 <b>깊이 {mine.depth} · 해킹 {mine.hacks} · 복구 {mine.restores}</b></p>}
        {error ? <p className="footnote negative">{error}</p> : !board ? <p className="footnote">불러오는 중…</p> : !board.rows.length ? <Empty title="아직 기록이 없습니다" description="이번 달에 침투 작전·해킹을 한 해커가 없습니다."/> :
        <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>해커</TableHead><TableHead>점수</TableHead><TableHead>깊이</TableHead><TableHead>해킹</TableHead><TableHead>복구</TableHead>{rival && <TableHead>견제</TableHead>}</TableRow></TableHeader>
        <TableBody>{board.rows.map(r => <TableRow key={r.id} className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.crew ? <small> [{r.crew}]</small> : null}{r.self ? ' (나)' : ''}{r.job === 'whiteHacker' && !r.masked?.includes('job') ? <small> · 화이트</small> : r.job === 'blackHacker' && !r.masked?.includes('job') ? <small> · 블랙</small> : null}</TableCell><TableCell><b>{format(r.score)}</b></TableCell><TableCell>{r.depth}</TableCell><TableCell>{r.hacks}</TableCell><TableCell>{r.restores}</TableCell>{rival && <TableCell className="ranking-actions">{!r.self && <><button className="secondary small" disabled={busy || (used.trace || 0) >= hackCap(s, 1) || bits < hackCost(s, HACKER.trace.bits)} title={`이 해커의 오늘 침투 작전 입장 −1(하루 ${hackCap(s, 1)}회, 비트 ${hackCost(s, HACKER.trace.bits)})`} onClick={() => send({ type: 'hackRun', id: 'trace', value: r.id }, '/api/hack')}>역추적</button><button className="secondary small" disabled={busy || (used.overload || 0) >= hackCap(s, 1) || bits < hackCost(s, HACKER.overload.bits)} title={`이 해커의 브루트포스 비트를 ${HACKER.overload.minutes / 60}시간 동안 절반으로(하루 ${hackCap(s, 1)}회, 비트 ${hackCost(s, HACKER.overload.bits)})`} onClick={() => send({ type: 'hackRun', id: 'overload', value: r.id }, '/api/hack')}>과부하</button></>}</TableCell>}</TableRow>)}</TableBody></Table>}
    </section>;
}

type ExpeditionRow = { rank: number; id: string; name: string; wins: number; cleared: boolean; round: number; abyss?: number; difficulty?: number; runs: number; score: number; ghostPoints: number; units: string[]; self: boolean; /** 23단계: 마지막 보드의 공유 코드 · 길드 이름. */ code?: string; guild?: string };
type ExpeditionGuildRow = { rank: number; id: string; name: string; members: number; score: number; best: { name: string; score: number } };
/** 원정대 3단계: 이번 달 원정대 순위(최고 승수 · 완주 · 닿은 라운드). 다른 플레이어의 보드는 2라운드부터 고스트 상대로 나옵니다. */
type LeagueRow = { rank: number; id: string; name: string; score: number; bestRun: number; wins: number; runs: number; self: boolean };
/** 21단계 원정 주간 리그: 같은 등급 8명 조의 이번 주 순위. 점수 = 최고 판 점수 + 끝난 판들의 승리 합. 월요일(한국 시간) 뒤 첫 출발 때 정산. */
function LeagueBoard({ s }: { s: State }) {
    const [board, setBoard] = useState<{ week: string; tier: number; group: number | null; joined: boolean; rows: LeagueRow[] } | null>(null), [error, setError] = useState('');
    const [nonce, setNonce] = useState(0), load = () => setNonce(n => n + 1);
    useEffect(() => {
        let alive = true;
        fetch('/api/ranking?board=league', { cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || '불러오지 못했습니다.'); if (alive) { setBoard(d); setError(''); } }).catch(e => { if (alive) setError(e instanceof Error ? e.message : '불러오지 못했습니다.'); });
        return () => { alive = false; };
    }, [nonce]);
    const tier = board?.tier || s.expeditionLeague?.tier || 1;
    return <section className="panel ranking-panel abyss-board">
        <div className="section-title"><h2><ArrowUpRight size={17}/> 원정 주간 리그 · {leagueTierName(tier)}{board ? ` · ${board.week}` : ''}</h2><button className="text-button" onClick={load}><RefreshCw size={13}/> 새로고침</button></div>
        <p className="footnote">같은 등급의 모험가 {LEAGUE.size}명이 한 조(이번 주 첫 전투 순서). 점수 = 이번 주 최고 판 점수 + 끝난 판들의 승리 합. 한국 시간 월요일에 끝나고 다음 ‘원정 출발’ 때 정산: 1~{LEAGUE.promote}위 승급 · {LEAGUE.size - LEAGUE.demote + 1}~{LEAGUE.size}위({LEAGUE.demoteMin}명 이상인 조) 강등 · 세계석 {LEAGUE.rewards.join(' · ')}. 등급: {LEAGUE.tiers.map((t, i) => `${LEAGUE.icons[i]} ${t}`).join(' → ')}.{s.expeditionLeague?.best ? ` 내 최고 등급 ${leagueTierName(s.expeditionLeague.best)}.` : ''}</p>
        {error ? <p className="footnote negative">{error}</p> : !board ? <p className="footnote">불러오는 중…</p> : !board.joined ? <Empty title="아직 조에 들어가지 않았습니다" description="이번 주 원정 전투를 한 번 하면 같은 등급 조에 들어갑니다."/> :
        <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead><TableHead>점수</TableHead><TableHead>최고 판</TableHead><TableHead>승리</TableHead><TableHead>판</TableHead></TableRow></TableHeader>
        <TableBody>{board.rows.map(r => <TableRow key={r.id} className={`${r.self ? 'self' : ''}${r.rank <= LEAGUE.promote ? ' promote' : board.rows.length >= LEAGUE.demoteMin && r.rank > board.rows.length - LEAGUE.demote ? ' demote' : ''}`}><TableCell>{r.rank}{r.rank <= LEAGUE.promote ? ' ▲' : board.rows.length >= LEAGUE.demoteMin && r.rank > board.rows.length - LEAGUE.demote ? ' ▼' : ''}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''}</TableCell><TableCell><b>{r.score}</b></TableCell><TableCell>{r.bestRun}</TableCell><TableCell>{r.wins}</TableCell><TableCell>{r.runs}</TableCell></TableRow>)}</TableBody></Table>}
    </section>;
}
function ExpeditionBoard({ s }: { s: State }) {
    const [board, setBoard] = useState<{ month: string; rows: ExpeditionRow[] } | null>(null), [error, setError] = useState('');
    const [nonce, setNonce] = useState(0), load = () => setNonce(n => n + 1);
    const [copied, setCopied] = useState(''), copy = async (id: string, code: string) => { try { await navigator.clipboard.writeText(code); setCopied(id); setTimeout(() => setCopied(c => c === id ? '' : c), 1500); } catch { /* 클립보드 없음 */ } };
    useEffect(() => {
        let alive = true;
        fetch('/api/ranking?board=expedition', { cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || '불러오지 못했습니다.'); if (alive) { setBoard(d); setError(''); } }).catch(e => { if (alive) setError(e instanceof Error ? e.message : '불러오지 못했습니다.'); });
        return () => { alive = false; };
    }, [nonce]);
    return <section className="panel ranking-panel abyss-board">
        <div className="section-title"><h2><ArrowUpRight size={17}/> 이번 달 원정대 순위{board ? ` · ${board.month}` : ''}</h2><button className="text-button" onClick={load}><RefreshCw size={13}/> 새로고침</button></div>
        <p className="footnote">점수는 이번 달에 가장 잘한 판으로 셉니다: 승리 1번에 100점, 완주 50점, 닿은 라운드만큼 1점씩, 난이도 보너스(숙련 60 · 정예 120 · 악몽 180 · 전설 240), 심연 1라운드마다 20점. 여기에 다른 모험가의 원정대를 이길 때마다 받는 점수(상대 승수 × 10)가 이번 달 내내 쌓입니다. 한국 시간 매월 1일에 처음부터 다시 셉니다. 순위에 오른 보드는 다른 모험가의 원정에 2라운드부터 상대로 나옵니다.{s.expeditionBest ? ` 내 최고 ${s.expeditionBest}승.` : ''} 월말 순위 보상(세계석, 다음 달 첫 출발 때 지급): {SEASON_REWARDS.map(x => `${x.label} ${x.pearls}`).join(' · ')}.</p>
        {error ? <p className="footnote negative">{error}</p> : !board ? <p className="footnote">불러오는 중…</p> : !board.rows.length ? <Empty title="아직 기록이 없습니다" description="이번 달에 원정을 다녀온 모험가가 없습니다."/> :
        <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead><TableHead>점수</TableHead><TableHead>승</TableHead><TableHead>완주</TableHead><TableHead>라운드</TableHead><TableHead>고스트</TableHead><TableHead>판</TableHead><TableHead>코드</TableHead></TableRow></TableHeader>
        <TableBody>{board.rows.map(r => <TableRow key={r.id} className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''}{r.guild ? <small className="muted"> · {r.guild}</small> : null}</TableCell><TableCell><b>{r.score}</b></TableCell><TableCell>{r.wins}</TableCell><TableCell>{r.difficulty && r.difficulty > 1 ? `${difficultyOf(r.difficulty).icon} ` : ''}{r.cleared ? '완주' : '-'}</TableCell><TableCell>{r.round}{r.abyss ? <small> +심연 {r.abyss}</small> : null}</TableCell><TableCell>{r.ghostPoints ? `+${r.ghostPoints}` : '-'}</TableCell><TableCell>{r.runs}</TableCell><TableCell>{r.code ? <button type="button" className="text-button" title="이 보드의 공유 코드를 복사합니다(원정대 출발 화면의 ‘보드 공유’에 붙여 넣으면 목표 보드가 됩니다)" onClick={() => copy(r.id, r.code!)}>{copied === r.id ? '복사됨' : '복사'}</button> : '-'}</TableCell></TableRow>)}</TableBody></Table>}
        <ExpeditionGuildBoard s={s} nonce={nonce}/>
    </section>;
}
/** 23단계 길드 원정 점수: 이번 달 길드원 점수 합(상위 200행 기준). */
function ExpeditionGuildBoard({ s, nonce }: { s: State; nonce: number }) {
    const [rows, setRows] = useState<ExpeditionGuildRow[] | null>(null);
    useEffect(() => {
        let alive = true;
        fetch('/api/ranking?board=expeditionGuild', { cache: 'no-store' }).then(async r => { const d = await r.json(); if (r.ok && alive) setRows(d.rows || []); }).catch(() => { if (alive) setRows([]); });
        return () => { alive = false; };
    }, [nonce]);
    const mine = s.guildMember?.id;
    return <div className="exp-guild-board">
        <h3><Users size={15}/> 길드 원정 점수</h3>
        <p className="footnote">같은 길드 모험가들의 이번 달 원정 점수를 더한 값입니다(순위표 상위 200행 기준). 길드에 들어가 있으면 내 점수가 자동으로 더해집니다.{mine && rows && !rows.some(g => g.id === mine) ? ' 내 길드는 아직 점수가 없습니다: 원정을 한 번 다녀오면 올라갑니다.' : ''}</p>
        {!rows ? <p className="footnote">불러오는 중…</p> : !rows.length ? <p className="footnote muted">아직 길드 점수가 없습니다.</p> :
        <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>길드</TableHead><TableHead>점수 합</TableHead><TableHead>인원</TableHead><TableHead>최고 모험가</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map(g => <TableRow key={g.id} className={g.id === mine ? 'self' : ''}><TableCell>{g.rank}</TableCell><TableCell>{g.name}{g.id === mine ? ' (내 길드)' : ''}</TableCell><TableCell><b>{g.score}</b></TableCell><TableCell>{g.members}</TableCell><TableCell>{g.best.name} <small className="muted">{g.best.score}</small></TableCell></TableRow>)}</TableBody></Table>}
    </div>;
}
type CrewRow = { rank: number; id: string; name: string; side: string; members: number; grade: number; nodes: number; hacks: number; score: number };
const SIDE_NAME: Record<string, string> = { gray: '회색', white: '화이트', black: '블랙' };
/** v3.34 해커 조직 순위(주간): 합동 작전 노드 합 ×10 + 조직원 해킹 수 ×2. 탭을 열 때 한 번 불러옵니다(서버 5분 캐시). */
function CrewBoard({ s }: { s: State }) {
    const [board, setBoard] = useState<{ week: string; rows: CrewRow[] } | null>(null), [error, setError] = useState('');
    const [nonce, setNonce] = useState(0), load = () => setNonce(n => n + 1), mine = s.hacker?.crew?.id;
    useEffect(() => {
        let alive = true;
        fetch('/api/ranking?board=crew', { cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || '불러오지 못했습니다.'); if (alive) { setBoard(d); setError(''); } }).catch(e => { if (alive) setError(e instanceof Error ? e.message : '불러오지 못했습니다.'); });
        return () => { alive = false; };
    }, [nonce]);
    return <section className="panel ranking-panel abyss-board">
        <div className="section-title"><h2><ArrowUpRight size={17}/> 이번 주 해커 조직 순위{board ? ` · ${board.week}` : ''}</h2><button className="text-button" onClick={load}><RefreshCw size={13}/> 새로고침</button></div>
        <p className="footnote">점수 = 합동 작전에서 뚫은 노드 합 ×10 + 조직원 해킹 실행 ×2. 한국 시간 월요일 0시에 새로 셉니다. 순위는 5분마다 갱신됩니다.</p>
        {error ? <p className="footnote negative">{error}</p> : !board ? <p className="footnote">불러오는 중…</p> : !board.rows.length ? <Empty title="아직 기록이 없습니다" description="이번 주 합동 작전 기록이 있는 조직이 없습니다."/> :
        <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>조직</TableHead><TableHead>점수</TableHead><TableHead>노드</TableHead><TableHead>해킹</TableHead><TableHead>인원 · 등급</TableHead></TableRow></TableHeader>
        <TableBody>{board.rows.map(r => <TableRow key={r.id} className={r.id === mine ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}<small> · {SIDE_NAME[r.side] || r.side}</small>{r.id === mine ? ' (내 조직)' : ''}</TableCell><TableCell><b>{format(r.score)}</b></TableCell><TableCell>{format(r.nodes)}</TableCell><TableCell>{format(r.hacks)}</TableCell><TableCell>{r.members}명 · {r.grade}</TableCell></TableRow>)}</TableBody></Table>}
    </section>;
}
