'use client';
import { Activity, Flag, Gauge, History, Target } from 'lucide-react';
import type { State } from '@/game/types';
import { monsterById, stageById, dungeonById } from '@/game/data/world';

/** 자동 진행 한눈에 보기: 현재 목표 · 진행 상황 · 중단 조건 · 마지막 종료 사유. */
export function AutoRunStatus({ s }: { s: State }) {
    const d = s.dungeon ? dungeonById(s.dungeon!.id) : undefined, st = stageById(s.stage);
    const r = s.dungeon?.repeat;
    const target = s.target && s.target !== 'all' ? monsterById(s.target)?.name : undefined;
    const goal = d ? `${d.name}${d.id === 'abyss' ? ` ${s.dungeon!.depth || s.abyssBest + 1}층` : ''} 정복` : s.running ? `${st?.name || '사냥터'} 자동 사냥${target ? ` · ${target} 집중` : ''}` : '멈춤';
    const progress = d ? `웨이브 ${Math.min(s.dungeon!.wave + 1, d.monsters.length)} / ${d.monsters.length}${s.recovery > 0 ? ' · 입장 준비 중' : ''}` : s.running ? (s.recovery > 0 ? `회복 중 · ${s.recovery}턴 남음` : `전투 중 · 누적 처치 ${s.kills.toLocaleString()}`) : '시작 버튼을 누르면 자동 사냥을 시작합니다.';
    const stop = d ? (r ? (r.until !== undefined ? `${r.until}층 도달 또는 실패 시 → 자동 사냥으로 전환` : r.left === null ? '실패할 때까지 반복 → 이후 자동 사냥' : `${r.left === 0 ? '이번이 마지막 도전' : `이후 ${r.left}회 더`} · 실패 시 중단 → 자동 사냥`) : '정복하거나 실패하면 멈춤 (1회 도전)')
        : s.running ? '직접 멈출 때까지 · 패배하면 잠시 회복 후 계속' : '—';
    const items = [
        { icon: <Target size={14}/>, label: '현재 활동', value: goal, tone: 'goal' },
        { icon: <Gauge size={14}/>, label: '진행 상황', value: progress, tone: s.recovery > 0 ? 'warn' : '' },
        { icon: <Flag size={14}/>, label: '중단 조건', value: stop, tone: '' },
        { icon: <History size={14}/>, label: '마지막 종료 사유', value: s.runEnd ? s.runEnd.reason : '기록 없음', tone: 'muted' },
    ];
    return <section className={`panel auto-run-status ${s.running ? 'running' : ''}`} aria-label="자동 진행 상태">
        <div className="auto-run-head">
            <div><span className="eyebrow">AUTO RUN · 사냥 · 던전</span><h2><Activity size={18}/> 자동 진행</h2></div>
            <span className={`auto-run-state ${s.running ? 'on' : 'off'}`}><i/>{s.running ? '진행 중' : '멈춤'}</span>
        </div>
        <div className="auto-run-grid">{items.map(x => <div key={x.label} className={`auto-run-tile ${x.tone}`}>
            <span className="auto-run-label">{x.icon}{x.label}</span><p>{x.value}</p>
        </div>)}</div>
    </section>;
}
