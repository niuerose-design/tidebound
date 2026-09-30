'use client';
import { ArrowUpRight, RefreshCw, Swords } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import type { DuelResult } from '@/game/types';
import { BALANCE } from '@/game/data/balance';
import { JOBS } from '@/game/data/classes';
import { TRAINING } from '@/game/systems/duel';
import { statDisplay } from '@/game/data/progression';
import { vowBadgeLabel } from '@/game/systems/vows';
import { Empty, Heading, format, useNow } from './shared';
import type { Ranking } from './use-game';
import type { PanelProps } from './panel-props';
export function Rankings({ s, send, busy, rows, rankError, loadRanking, register, result, setResult }: PanelProps & {
    rows: Ranking[];
    rankError: string;
    loadRanking: () => void;
    register: () => void;
    result: DuelResult | null;
    setResult: (v: DuelResult | null) => void;
}) {
    const now = useNow();
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
    <strong className="small-type">최대 80턴 · 무승부 지원</strong>
    </div>
    </div>
    <Tabs defaultValue="ranking">
    <TabsList className="game-tabs">
    <TabsTrigger value="ranking">낚시꾼 랭킹</TabsTrigger>
    <TabsTrigger value="training">훈련 상대</TabsTrigger>
    </TabsList>
    <TabsContent value="ranking">
    <div className="panel ranking-panel">
    <div className="section-title">
    <h2>등록된 낚시꾼</h2>
    <button className="text-button" onClick={loadRanking}>
    <RefreshCw size={14}/>새로고침</button>
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
        <TableBody>{rows.map((r, i) => <TableRow key={r.id}>
            <TableCell className="rank-number">{i + 1}</TableCell>
            <TableCell>
            <strong>{r.name}{r.self ? ' (나)' : ''}</strong>{r.vows?.map(v => <small key={v} className={`vow-badge vow-${v.replace(/\d/, '')}`}>{vowBadgeLabel(v)}</small>)}
            <small className="block">Lv. {r.level} · {JOBS.find(j => j.id === r.job)?.name} · {new Date(r.updatedAt).toLocaleDateString('ko-KR')} 등록</small>
            <small className="block ranking-combat-stats">명중 수치 {statDisplay('accuracy', r.stats.accuracy || 0)} · 회피 수치 {statDisplay('evasion', r.stats.evasion || 0)}</small>
            </TableCell>
            <TableCell><span className="ranking-guild">{r.guild || '무소속'}</span></TableCell>
            <TableCell>{format(r.power)}</TableCell>
            <TableCell>{r.rating}</TableCell>
            <TableCell>
            <button className="secondary small" disabled={busy || r.self || now - s.lastDuel < BALANCE.duelCooldownMs} onClick={() => send({ type: 'ranked', id: r.id }, '/api/duel')}>{r.self ? '내 캐릭터' : '대결'}</button>
            </TableCell>
            </TableRow>)}</TableBody>
        </Table> : <Empty title="첫 번째 낚시꾼이 되어보세요" description="전투 정보를 등록하면 랭킹에 등장합니다. 다른 참가자가 없을 때는 훈련 상대와 대결할 수 있습니다."/>}</div>
    <p className="footnote">랭킹은 결투 점수 순입니다. 랭크 결투는 1분 간격이며 도전자의 점수만 변동합니다. 장비·스킬을 바꾼 뒤 다시 등록하면 방어용 정보가 갱신됩니다.</p>
    </TabsContent>
    <TabsContent value="training">
    <div className="class-grid">{TRAINING.map((t, i) => <div className="panel training-card" key={t.name}>
        <Swords size={35}/>
        <span className="badge">훈련용 NPC</span>
        <h2>{t.name}</h2>
        <p>Lv. {t.level} · {JOBS.find(j => j.id === t.job)?.name}</p>
        <div className="training-stats">공격 {t.stats.attack} · 방어 {t.stats.defense}<br />체력 {t.stats.hp} · 치명타 {Math.round(t.stats.crit * 100)}%</div>
        <button className="primary" disabled={busy} onClick={() => send({ type: 'training', id: String(i) }, '/api/duel')}>연습 대결</button>
        </div>)}</div>
    <p className="footnote">훈련은 실제 유저 랭킹에 포함되지 않으며 점수·재화·PvE 체력에 영향을 주지 않습니다.</p>
    </TabsContent>
    </Tabs>
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
    <div className="duel-log">{result?.logs.map((l, i) => <p key={i}>{l}</p>)}</div>
    </DialogContent>
    </Dialog>
    </>;
}

