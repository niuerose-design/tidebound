'use client';
import { useState } from 'react';
import { RegionProgress, RegionResearchLine } from './book-research';
import { regionSignature } from '@/game/data/variants';
import { catalogNow } from '@/game/data/catalog';
import { levelGateOk } from '@/game/systems/meta';
import { ArrowUpRight, ChevronDown, Lock, MapPin } from 'lucide-react';
import { STAGES, REGIONS, HABITAT, closedIn, CLOSED_NOTE } from '@/game/data/world';
import { onyxBossFor } from '@/game/data/onyx';
import { mimicStageMultiplier, MIMIC, WHISTLE } from '@/game/data/mimic';
import { EXP_NURI } from '@/game/data/exp-nuri';
import { dayKey } from '@/game/data/goals';
import { Heading } from './shared';
import type { PanelProps } from './panel-props';
import { TideSelector } from './tide-selector';
export function Stages({ s, send, busy }: PanelProps) {
    // 사냥터와 던전은 동시에 돌지 않습니다. 던전 탐험 중에는 현재 사냥터 표시를 지우고 이동을 막습니다(전투 레일과 같은 규칙).
    // v3.49 정보 비공개가 켜져 있으면 무리 규모 비율·까미 출현 배율을 숨깁니다.
    const inDungeon = !!s.dungeon, secret = catalogNow().secret;
    // v27.80 지역별 접기·펴기: 처음에는 지금 사냥터가 있는 지역만 펼칩니다. 고른 상태는 이 브라우저에만 기억합니다.
    const [openRegions, setOpenRegions] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('tidebound:stage-regions') || '{}'); } catch { return {}; } });
    const toggle = (region: string, open: boolean) => setOpenRegions(prev => { const next = { ...prev, [region]: open }; try { localStorage.setItem('tidebound:stage-regions', JSON.stringify(next)); } catch { /* 저장소를 못 쓰면 이번 화면에서만 기억 */ } return next; });
    return <>
    <Heading eyebrow="WORLD MAP" title="사냥터" description="더 먼 곳, 더 강한 몬스터. 오늘의 사냥터를 선택하세요."/>
    <TideSelector s={s} send={send} busy={busy}/>
    <WhistleCard s={s} send={send} busy={busy}/>
    {inDungeon && <p className="footnote">던전 탐험 중에는 사냥이 멈춰 있고 사냥터를 바꿀 수 없습니다. 던전에서 귀환하거나 반복이 끝나면 사냥터로 돌아옵니다.</p>}
    {/* v27.34 지역(헤네시스 등)별로 묶어 보여 줍니다. 번호는 전체 순서 그대로입니다. */}
    {/* v27.34 지역(헤네시스 등)별로 묶어 보여 줍니다. v27.80 지역마다 접고 펼 수 있고, 무리 서식지가 지역 끝에 붙습니다. 번호는 전체 순서 그대로입니다. */}
    {REGIONS.map(region => { const places = STAGES.filter(st => st.region === region), here = places.some(st => st.id === s.stage), sig = regionSignature(region);
    return <details className="stage-region" key={region} open={openRegions[region] ?? here} onToggle={e => { const open = (e.currentTarget as HTMLDetailsElement).open; if ((openRegions[region] ?? here) !== open) toggle(region, open); }}>
    <summary className="stage-region-title"><ChevronDown size={18} className="stage-region-chevron"/>{region}<small>{places.filter(st => !st.habitat).length}곳 · 무리 서식지{sig.length ? ` · 대표 변종 ${sig.map(v => `${v.mark} ${v.name}`).join('·')}` : ''}{here ? ' · 현재 지역' : ''}</small></summary>
    <RegionResearchLine s={s} region={region}/>
    <div className="stage-grid">{places.map(st => { const i = STAGES.indexOf(st);
                const closed = closedIn(s, 'stages', st.id), locked = closed || !levelGateOk(s, st.level) || s.rebirths < st.rebirth;
                const current = s.stage === st.id && !inDungeon;
                return <button key={st.id} className={`stage-card ${current ? 'selected' : ''} ${st.habitat ? 'habitat' : ''}`} disabled={busy || locked || inDungeon} onClick={() => send({ type: 'stage', id: st.id })} style={{ '--stage-color': st.tone } as React.CSSProperties}>
                <div className="stage-top">
                <span className="stage-num">{String(i + 1).padStart(2, '0')}</span>{locked ? <Lock size={20}/> : current ? <span className="badge">현재 사냥터</span> : <ArrowUpRight />}</div>
                <MapPin className="stage-wave" size={48}/>
                <div className="eyebrow">{closed ? CLOSED_NOTE : st.subtitle}</div>
                <h2>{st.place}</h2>
                <p>{st.description}</p>
                <div className="stage-footer">
                <span>Lv. {st.level}+{st.rebirth ? ` · 환생 ${st.rebirth}회` : ''}{(st.fit ?? 0) > st.rebirth ? <em className={`stage-fit ${s.rebirths >= st.fit! ? 'met' : ''}`} title="기준 몸 측정: 난이도 0에서 무리 없이 사냥할 수 있는 환생(도움말 ‘사냥터’)"> · 적정 환생 {st.fit}</em> : null}</span>
                <span>{st.habitat ? `${st.fish.length}종 · ${secret ? `무리 ×${HABITAT.sizes[0]}·×${HABITAT.sizes[1]}` : `무리 ×${HABITAT.sizes[0]} ${Math.round((1 - HABITAT.bigChance) * 100)}% · ×${HABITAT.sizes[1]} ${Math.round(HABITAT.bigChance * 100)}%`} 확정 · 까미·누리 없음${onyxBossFor(st.region) ? ` · 칠흑 보스 ${onyxBossFor(st.region)!.name}` : ''}` : `${st.fish.length}종 서식${secret ? '' : ` · 까미 ×${mimicStageMultiplier(i).toFixed(2)}`}`}</span>
                </div>
                {st.habitat ? <span className="region-research">고위험 고보상 · 처치 한 번에 마리 수만큼 보상·도감 · ×500은 보상 1.5배</span> : <RegionProgress s={s} id={st.id}/>}
                </button>;
        })}</div>
    </details>; })}
    </>;
}

/** v3.160 호루라기: SP를 내고 다음 사냥터 출현을 숙련의 까미 · 경험의 누리로 정합니다(하루 WHISTLE.perDay개). */
function WhistleCard({ s, send, busy }: PanelProps) {
    const mimicOk = s.level >= MIMIC.minLevel && s.kills >= MIMIC.minKills, nuriOk = s.level >= EXP_NURI.minLevel && s.kills >= EXP_NURI.minKills;
    if (!mimicOk && !nuriOk) return null;
    const used = s.whistleDay?.key === dayKey(s.lastTick || 0) ? s.whistleDay.used : 0, left = Math.max(0, WHISTLE.perDay - used), pending = s.whistle;
    const locked = busy || !!s.dungeon || !!pending || left <= 0 || s.sp < WHISTLE.sp;
    return <section className="panel whistle-card">
        <div><h3>호루라기 <small>SP {WHISTLE.sp} · 오늘 {left} / {WHISTLE.perDay}</small></h3>
        <p className="footnote">{pending ? `불었습니다. 다음 사냥터 출현에 ${pending === 'mimic' ? '숙련의 까미' : '경험의 누리'}가 나타납니다.` : '다음 사냥터 출현을 고른 희귀 몬스터로 정합니다. 던전 · 랜덤게임에서는 쓰이지 않고, 던전에서 나온 뒤 사냥터 출현에 씁니다.'}</p></div>
        <div className="title-actions">
            <button type="button" className="secondary small" disabled={locked || !mimicOk} title={mimicOk ? `숙련 로또: ${MIMIC.tiers.map(t => `${t.label} ${t.mastery.toLocaleString()}`).join(' · ')}` : `Lv.${MIMIC.minLevel} · 누적 처치 ${MIMIC.minKills}마리부터`} onClick={() => send({ type: 'whistle', id: 'mimic' })}>숙련의 까미</button>
            <button type="button" className="secondary small" disabled={locked || !nuriOk} title={nuriOk ? '경험치 로또' : `Lv.${EXP_NURI.minLevel} · 누적 처치 ${EXP_NURI.minKills.toLocaleString()}마리부터`} onClick={() => send({ type: 'whistle', id: 'nuri' })}>경험의 누리</button>
        </div>
    </section>;
}
