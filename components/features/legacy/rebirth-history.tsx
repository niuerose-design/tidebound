'use client';
/** v3.398 환생 기록: 누적 환생, 이번 생 경과 시간, 평균·최단 환생 시간, 최근 환생 목록. 통계 화면도 같이 씁니다. */
import type { State, RebirthRecord } from '@/game/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatExact } from '@/components/ui/game';
import { formatDuration } from '@/components/game/shared';
import { Card, Note } from './parts';

const fmt = formatExact;
const when = (at: number) => new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
/** partial(업데이트 이전에 시작한 생)을 뺀 기록의 평균·최단. */
export function rebirthPace(log: RebirthRecord[] = []) {
    const full = log.filter(r => !r.partial);
    const avg = (f: (r: RebirthRecord) => number) => full.length ? full.reduce((a, r) => a + f(r), 0) / full.length : 0;
    const fastest = full.length ? full.reduce((a, r) => r.realMs < a.realMs ? r : a) : null;
    return { count: full.length, realMs: avg(r => r.realMs), playMs: avg(r => r.playMs), fastest };
}
const Tile = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) => <div className="grid gap-0.5 rounded-m bg-surface-1 p-3"><small className="text-xs text-ink-3">{label}</small><strong className="font-num text-l">{value}</strong>{sub && <small className="text-xs text-ink-3">{sub}</small>}</div>;
export function RebirthHistory({ s }: { s: State }) {
    const log = s.rebirthLog || [], pace = rebirthPace(log), life = s.lifeStart, now = s.lastTick;
    const lifeReal = life ? Math.max(0, now - life.at) : 0, lifePlay = life ? Math.max(0, (s.playMs || 0) - life.playMs) : 0;
    return <div className="grid gap-3">
        <Note>환생할 때마다 걸린 시간을 기록합니다. ‘실제 시간’은 생을 시작한 뒤 환생까지 흐른 시간, ‘사냥 시간’은 그동안 전투가 진행된 시간(부재중 정산 포함)입니다. 업데이트 전에 시작한 생은 업데이트 시점부터 잰 값이라 ‘일부’로 표시하고 평균에서 뺍니다.</Note>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="기록된 환생" value={<>{fmt(log.length)} <span className="text-xs text-ink-3">회</span></>} sub={`누적 ${fmt(s.rebirths)}회 중 최근 기록`}/>
            <Tile label={`이번 생 경과${life?.partial ? ' (일부)' : ''}`} value={life ? formatDuration(lifeReal) : '-'} sub={`사냥 ${life ? formatDuration(lifePlay) : '-'} · Lv.${s.level}`}/>
            <Tile label="평균 환생 시간" value={pace.count ? formatDuration(pace.realMs) : '-'} sub={pace.count ? `사냥 ${formatDuration(pace.playMs)} · 최근 ${pace.count}회 기준` : '전체를 잰 환생이 아직 없습니다'}/>
            <Tile label="가장 빠른 환생" value={pace.fastest ? formatDuration(pace.fastest.realMs) : '-'} sub={pace.fastest ? `${pace.fastest.n}번째 · Lv.${pace.fastest.level}` : ''}/>
        </div>
        <Card title="최근 환생" aside={`최근 ${log.length}회 · 최대 20회 보관`}>
            {log.length ? <div className="overflow-x-auto"><Table className="min-w-[520px]"><TableHeader><TableRow><TableHead>회차</TableHead><TableHead>날짜</TableHead><TableHead>실제 시간</TableHead><TableHead>사냥 시간</TableHead><TableHead>레벨</TableHead><TableHead>세계석</TableHead></TableRow></TableHeader>
                <TableBody>{[...log].reverse().map(r => <TableRow key={`${r.n}-${r.at}`}><TableCell className="font-num">{r.n}번째</TableCell><TableCell>{when(r.at)}</TableCell><TableCell className="font-num">{formatDuration(r.realMs)}{r.partial ? <small className="text-ink-3"> 일부</small> : null}</TableCell><TableCell className="font-num">{formatDuration(r.playMs)}</TableCell><TableCell className="font-num">Lv.{r.level}</TableCell><TableCell className="font-num">+{fmt(r.pearls)}</TableCell></TableRow>)}</TableBody></Table></div>
                : <Note>아직 기록된 환생이 없습니다. 이번 업데이트 이후 환생부터 기록됩니다.</Note>}
        </Card>
    </div>;
}
