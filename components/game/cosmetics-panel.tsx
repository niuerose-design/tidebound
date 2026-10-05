'use client';
import type { PanelProps } from './panel-props';
import { TITLES, unlockedTitles, displayTitle, titleById } from '@/game/data/titles';
import { RANKS, RANK_PERKS, rankProgress, rankPointsEarned, rankPointsFree, rankPerkLevel } from '@/game/data/rank';
import { RankInsignia } from './rank-insignia';
import { Heading, Meter } from './shared';
import { ChevronDown } from 'lucide-react';

/** v27.80 치장: 칭호와 계급. 능력치 화면의 ‘기본 능력치 / 최종 전투 능력치’와 같은 두 칸 구성입니다. */
export function Cosmetics({ s, send, busy }: PanelProps) {
    const owned = new Set(unlockedTitles(s).map(t => t.id)), current = displayTitle(s), chosen = titleById(s.title), badge = s.badge || 'title';
    const p = rankProgress(s), earned = rankPointsEarned(s), free = rankPointsFree(s);
    return <>
    <Heading eyebrow="APPEARANCE" title="칭호와 계급" description="이름 옆에는 칭호나 계급장 중 하나를 보여 줍니다(채팅도 같음). 칭호는 업적으로, 계급은 처치한 마릿수로 얻습니다."/>
    <div className="build-columns">
    {/* v27.88 칭호·계급 칸은 제목(화살표)으로 접고 펼칩니다. */}
    <details className="panel attribute-panel cosmetics-fold" open>
    <summary className="section-title"><h2>칭호</h2><span>{current ? `표시 중 · ${current}` : '표시 안 함'} · {owned.size} / {TITLES.length} 획득</span><ChevronDown size={16} className="achievement-chevron"/></summary>
    <div className="title-actions"><button type="button" className={badge === 'title' ? 'primary small' : 'secondary small'} disabled={busy || badge === 'title'} onClick={() => send({ type: 'badge', id: 'title' })}>이름 옆에 칭호 표시</button><button type="button" className={s.title === undefined ? 'primary small' : 'secondary small'} disabled={busy} onClick={() => send({ type: 'title', id: 'auto' })}>자동(최근 획득)</button><button type="button" className={s.title === null ? 'primary small' : 'secondary small'} disabled={busy} onClick={() => send({ type: 'title', id: 'none' })}>표시 안 함</button></div>
    <div className="title-list">{TITLES.map(t => { const got = owned.has(t.id), on = chosen?.id === t.id; return <div key={t.id} className={`title-row ${got ? 'owned' : 'locked'} ${on ? 'on' : ''}`}><span className="title-name"><small className="rebirth-title">{t.name}</small></span><span className="title-desc">{t.group} · {t.desc}</span>{got ? <button type="button" className={on ? 'primary small' : 'secondary small'} disabled={busy || on} onClick={() => send({ type: 'title', id: t.id })}>{on ? '장착 중' : '장착'}</button> : <span className="title-locked">미획득</span>}</div>; })}</div>
    </details>
    <details className="panel derived-panel cosmetics-fold" open>
    <summary className="section-title"><h2>계급</h2><span>{p.rank.name} · 진급 포인트 {free} / {earned}</span><ChevronDown size={16} className="achievement-chevron"/></summary>
    <div className="title-actions"><button type="button" className={badge === 'rank' ? 'primary small' : 'secondary small'} disabled={busy || badge === 'rank'} onClick={() => send({ type: 'badge', id: 'rank' })}>이름 옆에 계급장 표시</button><button type="button" className="secondary small" disabled={busy || earned === free} title="쓴 진급 포인트를 모두 돌려받습니다 (무료)" onClick={() => send({ type: 'rankPerk', id: 'reset' })}>특전 초기화</button></div>
    <div className="rank-head" title={`계급표(각 계급까지 추가 처치 수): ${RANKS.map((r, i) => `${r.name}${i ? ` ${r.need.toLocaleString()}` : ''}`).join(' → ')}`}>
        <RankInsignia index={p.index} size={44} title={p.rank.name}/>
        <div className="rank-head-text"><b>{p.rank.name}</b><small>{p.next ? `${p.next.name}까지 ${(p.need - p.have).toLocaleString()}마리` : '최고 계급'} · 누적 처치 {p.exp.toLocaleString()}마리 (무리는 마릿수만큼, 환생해도 유지)</small>{p.next && <Meter value={p.have} max={p.need} label=""/>}</div>
    </div>
    <div className="title-list">{RANK_PERKS.map(perk => { const level = rankPerkLevel(s, perk.id), maxed = level >= perk.max; return <div key={perk.id} className={`title-row ${level ? 'owned' : 'locked'}`}><span className="title-name"><small className="rebirth-title">{perk.name} {level}/{perk.max}</small></span><span className="title-desc">{perk.desc(Math.max(1, level))}{level ? '' : ' (1단계 기준)'}</span><button type="button" className={maxed ? 'secondary small' : 'primary small'} disabled={busy || maxed || free < perk.cost} onClick={() => send({ type: 'rankPerk', id: perk.id })}>{maxed ? '최대' : '올리기 · 1P'}</button></div>; })}</div>
    <p className="footnote">진급 포인트는 병 1 · 부사관 2 · 장교 3 · 장성 4(합계 41)이고 특전은 단계당 1P입니다. 언제든 무료로 초기화합니다.</p>
    </details>
    </div>
    </>;
}
