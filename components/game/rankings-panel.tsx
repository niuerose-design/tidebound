'use client';
import { rebirthTitle } from '@/game/data/long-term';
import { useEffect, useRef, useState } from 'react';
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

/** 랭킹 줄과 상세보기에 보여 주는 주요 능력치. */
const MAIN_STATS = ['hp', 'attack', 'magic', 'defense', 'resist', 'speed'] as const;
const DETAIL_STATS = ['hp', 'hpRegen', 'attack', 'magic', 'defense', 'resist', 'speed', 'accuracy', 'evasion', 'crit', 'critDamage', 'mana', 'manaRegen', 'penetration', 'lifesteal'] as const;
const SHORT: Record<typeof MAIN_STATS[number], string> = { hp: '체력', attack: '물공', magic: '마공', defense: '물방', resist: '마방', speed: '속도' };
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
export function Rankings({ s, send, busy, rows, rankError, loadRanking, abyss, loadAbyss, register, result, setResult }: PanelProps & {
    rows: Ranking[];
    rankError: string;
    loadRanking: () => void;
    abyss: { week: string; rows: AbyssRow[] } | null;
    loadAbyss: () => void;
    register: () => void;
    result: DuelResult | null;
    setResult: (v: DuelResult | null) => void;
}) {
    const now = useNow();
    const [detail, setDetail] = useState<Ranking | null>(null);
    const [sort, setSort] = useState<'rating' | 'power' | 'level' | 'rebirths'>('rating');
    const sorted = [...rows].sort((a, b) => (b[sort] - a[sort]) || (b.rating - a.rating) || (b.power - a.power));
    // 등록한 지 오래된 내 방어용 정보는 화면을 열 때 한 번 자동으로 다시 등록합니다(10분 이상 지났을 때).
    const refreshed = useRef(false);
    const me = rows.find(r => r.self);
    useEffect(() => { if (!refreshed.current && me && !busy && Date.now() - me.updatedAt > 10 * 60 * 1000) { refreshed.current = true; register(); } }, [me, busy, register]);
    const detailLoadout = detail ? loadout(detail) : null, detailStats = detail ? normalizeStats(detail.stats) : null;
    return <>
    <Heading eyebrow="ASYNC ARENA" title="낚시꾼의 명예" description="등록된 능력치와 스킬로 겨룹니다. 상대의 접속 여부와 관계없이 전투합니다.">
    <button className="primary" disabled={busy} onClick={register}>
    <ArrowUpRight size={17}/>내 전투 정보 등록</button>
    </Heading>
    <div className="arena-stats">
    <div className="panel">
    <small>내 결투 점수</small>
    <strong>{s.rating}</strong>
    </div>
    <div className="panel">
    <small>랭크 전적</small>
    <strong>{s.wins}승 <span>{s.losses}패</span>
    </strong>
    </div>
    <div className="panel">
    <small>진행 방식</small>
    <strong className="small-type">최대 {BALANCE.duelMaxTurns}턴 · 무승부 지원</strong>
    </div>
    </div>
    <Tabs defaultValue="ranking">
    <TabsList className="game-tabs">
    <TabsTrigger value="ranking">낚시꾼 랭킹</TabsTrigger>
    <TabsTrigger value="training">훈련 상대</TabsTrigger>
    <TabsTrigger value="abyss" onClick={() => { if (!abyss) loadAbyss(); }}>심연 깊이 · 주간</TabsTrigger>
    </TabsList>
    <TabsContent value="abyss"><AbyssBoard s={s} abyss={abyss} reload={loadAbyss}/></TabsContent>
    <TabsContent value="ranking">
    <div className="panel ranking-panel">
    <div className="section-title">
    <h2>등록된 낚시꾼</h2>
    <div className="ranking-sort" role="group" aria-label="정렬">{([['rating', '점수'], ['power', '전투력'], ['level', '레벨'], ['rebirths', '환생']] as const).map(([k, label]) => <button type="button" key={k} className={sort === k ? 'active' : ''} aria-pressed={sort === k} onClick={() => setSort(k)}>{label}</button>)}<button className="text-button" onClick={loadRanking}><RefreshCw size={14}/>새로고침</button></div>
    </div>{rankError ? <div className="error-box">{rankError}</div> : rows.length ? <Table>
        <TableHeader>
        <TableRow>
        <TableHead>순위</TableHead>
        <TableHead>낚시꾼</TableHead>
        <TableHead>길드</TableHead>
        <TableHead>전투력</TableHead>
        <TableHead>점수</TableHead>
        <TableHead>결투</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>{sorted.map((r, i) => <TableRow key={r.id}>
            <TableCell className="rank-number">{i + 1}</TableCell>
            <TableCell className="ranking-who">
            <strong>{rebirthTitle(r.rebirths) ? <small className="rebirth-title">{rebirthTitle(r.rebirths)}</small> : null}{r.name}{r.self ? ' (나)' : ''}</strong>{r.vows?.map(v => <small key={v} className={`vow-badge vow-${v.replace(/\d/, '')}`}>{vowBadgeLabel(v)}</small>)}
            <small className="block">Lv. {r.level} · {jobName(r.job)} · 환생 {r.rebirths}회 · {new Date(r.updatedAt).toLocaleDateString('ko-KR')} 등록</small>
            <MainStats stats={r.stats}/>
            </TableCell>
            <TableCell data-label="길드"><span className="ranking-guild">{r.guild || '무소속'}</span></TableCell>
            <TableCell data-label="전투력">{format(r.power)}</TableCell>
            <TableCell data-label="점수">{r.rating}</TableCell>
            <TableCell className="ranking-actions">
            <button className="secondary small" disabled={busy || r.self || now - s.lastDuel < BALANCE.duelCooldownMs} onClick={() => send({ type: 'ranked', id: r.id }, '/api/duel')}>{r.self ? '내 캐릭터' : '대결'}</button>
            <button className="text-button" onClick={() => setDetail(r)}>상세보기</button>
            </TableCell>
            </TableRow>)}</TableBody>
        </Table> : <Empty title="첫 번째 낚시꾼이 되어보세요" description="전투 정보를 등록하면 랭킹에 등장합니다. 다른 참가자가 없을 때는 훈련 상대와 대결할 수 있습니다."/>}</div>
    <p className="footnote">기본 정렬은 결투 점수 순이고 순위 번호는 고른 정렬 기준의 순서입니다. 랭크 결투는 1분 간격이며 도전자의 점수만 변동합니다. 내 방어용 정보는 등록 후 10분이 지나면 이 화면을 열 때 자동으로 다시 등록되고, 버튼으로 바로 갱신할 수도 있습니다. 상세보기는 등록한 시점의 능력치와 스킬 편성입니다.</p>
    </TabsContent>
    <TabsContent value="training">
    <div className="section-title training-title"><h2><Users size={17}/> 등록된 낚시꾼</h2><span>방어용 등록 정보 그대로 · 점수·전적 변동 없음</span></div>
    {rows.length ? <div className="class-grid">{rows.map(r => <div className="panel training-card" key={r.id}>
        <Swords size={35}/>
        <span className="badge">{r.self ? '내 등록 정보' : '등록된 낚시꾼'}</span>
        <h2>{r.name}</h2>
        <p>Lv. {r.level} · {jobName(r.job)} · 환생 {r.rebirths}회</p>
        <MainStats stats={r.stats}/>
        <div className="training-actions"><button className="primary" disabled={busy} onClick={() => send({ type: 'training', id: `user:${r.id}` }, '/api/duel')}>연습 대결</button><button className="text-button" onClick={() => setDetail(r)}>상세보기</button></div>
        </div>)}</div> : <p className="footnote">등록된 낚시꾼이 없어 던전 보스와 훈련합니다. 전투 정보를 등록하면 내 방어용 정보와도 연습할 수 있습니다.</p>}
    <div className="section-title training-title"><h2><Fish size={17}/> 던전 보스</h2><span>던전 마지막 웨이브와 같은 능력치·스킬</span></div>
    <div className="class-grid">{BOSS_OPPONENTS.map(f => { const b = bossSnapshot(f.id)!, a = normalizeStats(b.stats); return <div className="panel training-card" key={f.id}>
        <Fish size={35}/>
        <span className="badge">던전 보스</span>
        <h2>{f.name}</h2>
        <p>Lv. {f.level} · {f.lore}</p>
        <div className="training-stats">체력 {format(a.hp)} · 공격 {a.attack} · 마법 {a.magic}<br />방어 {a.defense} · 마법 방어 {a.resist} · 속도 {a.speed}</div>
        <button className="primary" disabled={busy} onClick={() => send({ type: 'training', id: `boss:${f.id}` }, '/api/duel')}>연습 대결</button>
        </div>; })}</div>
    <p className="footnote">훈련은 실제 유저 랭킹에 포함되지 않으며 점수·재화·PvE 체력에 영향을 주지 않습니다.</p>
    </TabsContent>
    </Tabs>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}>
    <DialogContent className="duel-dialog ranking-detail">
    <DialogHeader>
    <DialogTitle>{detail?.name}{detail?.self ? ' (나)' : ''}</DialogTitle>
    <DialogDescription>{detail && `Lv. ${detail.level} · ${jobName(detail.job)} · 환생 ${detail.rebirths}회 · ${detail.guild || '무소속'} · 전투력 ${format(detail.power)} · 점수 ${detail.rating} · ${new Date(detail.updatedAt).toLocaleString('ko-KR')} 등록`}</DialogDescription>
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

/** v25.6 주간 심연 기록판: 한국 시간 월요일에 새 주가 시작되고, 지난주 순위 보상은 다음 행동 때 자동으로 진주로 들어옵니다. */
function AbyssBoard({ s, abyss, reload }: { s: State; abyss: { week: string; rows: AbyssRow[] } | null; reload: () => void }) {
    const mine = s.abyssWeek, rewards = [1, 2, 3, 10, 50].map(r => `${r === 1 ? '1위' : r === 2 ? '2위' : r === 3 ? '3위' : `${r}위 안`} ${abyssWeeklyPearls(r)}`).join(' · ');
    return <section className="panel ranking-panel abyss-board">
        <div className="section-title"><h2><ArrowUpRight size={17}/> 이번 주 심연 깊이{abyss ? ` · ${abyss.week}` : ''}</h2><button className="text-button" onClick={reload}><RefreshCw size={13}/> 새로고침</button></div>
        <p className="footnote">무한 심연(환생 3회)에서 이번 주에 정복한 가장 깊은 층으로 겨룹니다. 한국 시간 월요일 0시에 새 주가 시작되고, 지난주 보상은 다음 행동 때 자동 지급: {rewards} · 참가 1진주. 내 기록은 심연을 정복하면 바로 올라갑니다.</p>
        {mine && <p className="abyss-mine">내 이번 주 기록 <b>{mine.best}층</b>{mine.dirty ? ' · 올리는 중' : ''}</p>}
        {!abyss ? <p className="footnote">불러오는 중…</p> : !abyss.rows.length ? <Empty title="아직 기록이 없습니다" description="이번 주에 무한 심연을 정복한 낚시꾼이 없습니다. 첫 기록을 남겨 보세요."/> :
        <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>낚시꾼</TableHead><TableHead>깊이</TableHead><TableHead>직업</TableHead><TableHead>환생</TableHead></TableRow></TableHeader>
        <TableBody>{abyss.rows.map(r => <TableRow key={r.id} className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''}</TableCell><TableCell><b>{r.depth}층</b></TableCell><TableCell>{jobName(r.job)}</TableCell><TableCell>{r.rebirths}</TableCell></TableRow>)}</TableBody></Table>}
    </section>;
}
