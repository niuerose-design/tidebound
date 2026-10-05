'use client';
import { Activity, Flag, History, Repeat } from 'lucide-react';
import type { State } from '@/game/types';
import { DUNGEONS, FISH, STAGES } from '@/game/data/world';

/** 자동 진행 한눈에 보기: 현재 목표 · 진행 상황 · 중단 조건 · 마지막 종료 사유. */
export function AutoRunStatus({ s, compact }: { s: State; compact?: boolean }) {
    const d = s.dungeon ? DUNGEONS.find(x => x.id === s.dungeon!.id) : undefined, st = STAGES.find(x => x.id === s.stage);
    const r = s.dungeon?.repeat;
    const target = s.target && s.target !== 'all' ? FISH.find(f => f.id === s.target)?.name : undefined;
    const goal = d ? `${d.name}${d.id === 'abyss' ? ` ${s.dungeon!.depth || s.abyssBest + 1}층` : ''} 정복` : s.running ? `${st?.name || '사냥터'} 자동 사냥${target ? ` · ${target} 집중` : ''}` : '멈춤';
    const progress = d && 'random' in d && d.random ? `랜덤게임 ${s.dungeon!.wave + 1}웨이브${s.recovery > 0 ? ' · 입장 준비 중' : ''}` : d ? `웨이브 ${Math.min(s.dungeon!.wave + 1, d.fish.length)} / ${d.fish.length}${s.recovery > 0 ? ' · 입장 준비 중' : ''}` : s.running ? (s.recovery > 0 ? `회복 중 · ${s.recovery}턴 남음` : `전투 중 · 누적 처치 ${s.kills.toLocaleString()}`) : '시작 버튼을 누르면 자동 사냥을 시작합니다.';
    const stop = d ? (r ? (r.until !== undefined ? `${r.until}층 도달 또는 실패 시 → 자동 사냥으로 전환` : r.left === null ? '실패할 때까지 반복 → 이후 자동 사냥' : `${r.left === 0 ? '이번이 마지막 도전' : `이후 ${r.left}회 더`} · 실패 시 중단 → 자동 사냥`) : '정복하거나 실패하면 멈춤 (1회 도전)')
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
    // v3.22 던전 화면 카드: 랜덤게임 카드처럼 머리(활동 이름 + 상태 칩) · 왼쪽 아이콘 목록 · 오른쪽 진행 게이지.
    const random = !!d && 'random' in d && !!d.random, until = s.dungeon?.until || 0;
    const wave = d ? (random ? s.dungeon!.wave + 1 : Math.min(s.dungeon!.wave + 1, d.fish.length)) : 0;
    const meter = random ? { label: '진행 웨이브', big: wave.toLocaleString(), unit: until ? `/ ${until} 웨이브` : '웨이브', ratio: until ? (wave - 1) / until : undefined }
        : d ? { label: d.id === 'abyss' ? `${s.dungeon!.depth || s.abyssBest + 1}층 진행` : '진행 웨이브', big: String(wave), unit: `/ ${d.fish.length} 웨이브`, ratio: s.dungeon!.wave / d.fish.length }
        : s.running ? { label: '누적 처치', big: s.kills.toLocaleString(), unit: '마리', ratio: undefined }
        : { label: '대기 중', big: '—', unit: '', ratio: undefined };
    const mode = d ? (r ? (r.until !== undefined ? `${r.until}층까지` : r.left === null ? '실패까지 반복' : r.left === 0 ? '마지막 도전' : `이후 ${r.left}회 더`) : random ? (until ? `목표 ${until}웨이브` : '목표 없음') : '1회 도전') : s.running ? '자동 사냥' : '';
    return <section className={`panel auto-run-status auto-run-card ${s.running ? 'on' : 'off'}`} aria-label="자동 진행 상태">
        <div className="auto-run-head">
            <div><span className="eyebrow">AUTO RUN · 자동 진행</span><h2>{goal}</h2></div>
            <div className="auto-run-chips">
                <span className={`chip ${s.running ? 'on' : 'off'}`}><i aria-hidden="true"/>{s.running ? '진행 중' : '멈춤'}</span>
                {s.recovery > 0 && <span className="chip">{d ? '입장 준비 중' : '회복 중'}</span>}
                {mode && <span className="chip gold">{mode}</span>}
            </div>
        </div>
        <div className="auto-run-body">
            <ul className="auto-run-rules">
                <li><Activity size={14}/><span><small>진행 상황</small>{progress}</span></li>
                <li><Flag size={14}/><span><small>중단 조건</small>{stop}</span></li>
                <li><History size={14}/><span><small>마지막 종료 사유</small>{s.runEnd ? s.runEnd.reason : '기록 없음'}</span></li>
            </ul>
            <div className="auto-run-meter">
                <div className="auto-run-meter-label"><Repeat size={13}/>{meter.label}</div>
                <div className="auto-run-meter-value"><b>{meter.big}</b>{meter.unit && <small>{meter.unit}</small>}</div>
                {meter.ratio !== undefined ? <div className="auto-run-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(1, meter.ratio)) * 100)}><i style={{ width: `${Math.max(0, Math.min(1, meter.ratio)) * 100}%` }}/></div>
                    : <div className="auto-run-bar idle"><i/></div>}
            </div>
        </div>
    </section>;
}
