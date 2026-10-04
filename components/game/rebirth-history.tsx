'use client';
import type { State, RebirthRecord } from '@/game/types';
import { format } from './shared';

/** 걸린 시간 표시: 2일 3시간 · 5시간 12분 · 37분. */
export function formatDuration(ms: number) {
    const m = Math.max(0, Math.floor(ms / 60_000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d ? `${d}일 ${h % 24}시간` : h ? `${h}시간 ${m % 60}분` : `${m}분`;
}
const when = (at: number) => new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
/** partial(업데이트 이전에 시작한 생)을 뺀 기록의 평균·최단. */
export function rebirthPace(log: RebirthRecord[] = []) {
    const full = log.filter(r => !r.partial);
    const avg = (f: (r: RebirthRecord) => number) => full.length ? full.reduce((a, r) => a + f(r), 0) / full.length : 0;
    const fastest = full.length ? full.reduce((a, r) => r.realMs < a.realMs ? r : a) : null;
    return { count: full.length, realMs: avg(r => r.realMs), playMs: avg(r => r.playMs), fastest };
}

/** v27.63 환생 기록: 누적 환생, 이번 생 경과 시간, 평균·최단 환생 시간, 최근 환생 목록. */
export function RebirthHistory({ s }: { s: State }) {
    const log = s.rebirthLog || [], pace = rebirthPace(log), life = s.lifeStart, now = s.lastTick;
    const lifeReal = life ? Math.max(0, now - life.at) : 0, lifePlay = life ? Math.max(0, (s.playMs || 0) - life.playMs) : 0;
    return <>
        <p className="tab-intro">환생할 때마다 걸린 시간을 기록합니다. ‘실제 시간’은 생을 시작한 뒤 환생까지 흐른 시간, ‘사냥 시간’은 그동안 전투가 진행된 시간(부재중 정산 포함)입니다. 업데이트 전에 시작한 생은 업데이트 시점부터 잰 값이라 ‘일부’로 표시하고 평균에서 뺍니다.</p>
        <section className="panel port-resource-bar rebirth-stat-bar">
            <div><span>기록된 환생<strong>{format(log.length)} <small>회</small></strong><small>누적 {format(s.rebirths)}회 중 최근 기록</small></span></div>
            <div><span>이번 생 경과{life?.partial ? ' (일부)' : ''}<strong>{life ? formatDuration(lifeReal) : '-'}</strong><small>사냥 {life ? formatDuration(lifePlay) : '-'} · Lv.{s.level}</small></span></div>
            <div><span>평균 환생 시간<strong>{pace.count ? formatDuration(pace.realMs) : '-'}</strong><small>{pace.count ? `사냥 ${formatDuration(pace.playMs)} · 최근 ${pace.count}회 기준` : '전체를 잰 환생이 아직 없습니다'}</small></span></div>
            <div><span>가장 빠른 환생<strong>{pace.fastest ? formatDuration(pace.fastest.realMs) : '-'}</strong><small>{pace.fastest ? `${pace.fastest.n}번째 · Lv.${pace.fastest.level}` : ''}</small></span></div>
        </section>
        <section className="panel rebirth-history">
            <div className="section-title"><h2>최근 환생</h2><span>최근 {log.length}회 · 최대 20회 보관</span></div>
            {log.length ? <div className="rebirth-history-scroll"><table className="rebirth-history-table">
                <thead><tr><th>회차</th><th>날짜</th><th>실제 시간</th><th>사냥 시간</th><th>레벨</th><th>세계석</th></tr></thead>
                <tbody>{[...log].reverse().map(r => <tr key={`${r.n}-${r.at}`}><td>{r.n}번째</td><td>{when(r.at)}</td><td>{formatDuration(r.realMs)}{r.partial ? <small> 일부</small> : null}</td><td>{formatDuration(r.playMs)}</td><td>Lv.{r.level}</td><td>+{format(r.pearls)}</td></tr>)}</tbody>
            </table></div> : <p className="footnote">아직 기록된 환생이 없습니다. 이번 업데이트 이후 환생부터 기록됩니다.</p>}
        </section>
    </>;
}
