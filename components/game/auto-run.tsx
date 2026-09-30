'use client';
import { Activity } from 'lucide-react';
import type { State } from '@/game/types';
import { DUNGEONS, FISH, STAGES } from '@/game/data/world';

/** 자동 진행 한눈에 보기: 현재 목표 · 진행 상황 · 중단 조건 · 마지막 종료 사유. */
export function AutoRunStatus({ s, compact }: { s: State; compact?: boolean }) {
    const d = s.dungeon ? DUNGEONS.find(x => x.id === s.dungeon!.id) : undefined, st = STAGES.find(x => x.id === s.stage);
    const r = s.dungeon?.repeat;
    const target = s.target && s.target !== 'all' ? FISH.find(f => f.id === s.target)?.name : undefined;
    const goal = d ? `${d.name}${d.id === 'abyss' ? ` ${s.dungeon!.depth || s.abyssBest + 1}층` : ''} 정복` : s.running ? `${st?.name || '낚시터'} 자동 낚시${target ? ` · ${target} 집중` : ''}` : '멈춤';
    const progress = d ? `웨이브 ${Math.min(s.dungeon!.wave + 1, d.fish.length)} / ${d.fish.length}${s.recovery > 0 ? ' · 입장 준비 중' : ''}` : s.running ? (s.recovery > 0 ? `회복 중 · ${s.recovery}턴 남음` : `전투 중 · 누적 포획 ${s.kills.toLocaleString()}`) : '시작 버튼을 누르면 자동 낚시를 시작합니다.';
    const stop = d ? (r ? (r.until !== undefined ? `${r.until}층 도달 또는 실패 시 → 자동 낚시로 전환` : r.left === null ? '실패할 때까지 반복 → 이후 자동 낚시' : `${r.left === 0 ? '이번이 마지막 도전' : `이후 ${r.left}회 더`} · 실패 시 중단 → 자동 낚시`) : '정복하거나 실패하면 멈춤 (1회 도전)')
        : s.running ? '직접 멈출 때까지 · 패배하면 잠시 회복 후 계속' : '—';
    const rows = <dl>
            <div><dt>현재 활동</dt><dd>{goal}</dd></div>
            <div><dt>진행 상황</dt><dd>{progress}</dd></div>
            <div><dt>중단 조건</dt><dd>{stop}</dd></div>
            <div><dt>마지막 종료 사유</dt><dd>{s.runEnd ? s.runEnd.reason : '기록 없음'}</dd></div>
        </dl>;
    /** 전투 화면 레일: 한 줄 요약만 보이고 눌러서 펼칩니다. */
    if (compact) return <details className="panel battle-rail-panel auto-run-status compact" aria-label="자동 진행 상태">
        <summary><Activity size={14}/><b>자동 진행</b><span>{d || s.running ? stop : '멈춤'}</span></summary>{rows}
    </details>;
    return <section className="panel auto-run-status" aria-label="자동 진행 상태">
        <div className="section-title"><h2><Activity size={15}/> 자동 진행</h2><span className={`auto-run-state ${s.running ? 'on' : 'off'}`}>{s.running ? '진행 중' : '멈춤'}</span></div>
        {rows}
    </section>;
}
