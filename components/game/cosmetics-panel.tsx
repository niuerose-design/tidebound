'use client';
import { useEffect, useState } from 'react';
import type { PanelProps } from './panel-props';
import { TITLES, unlockedTitles, displayTitle, titleById } from '@/game/data/titles';
import { RANKS, RANK_CUMULATIVE, RANK_PERKS, rankProgress, rankPointsEarned, rankPointsFree, rankPerkLevel, reenlistCount, REENLIST_BONUS_POINTS } from '@/game/data/rank';
import { ConfirmButton } from './confirm-button';
import { RankInsignia } from './rank-insignia';
import { Heading, Meter } from './shared';
import { ChevronDown, ChevronLeft, ChevronRight, Medal } from 'lucide-react';
const FLOW_KEY = 'tidebound.rankFlow';

/** v27.80 치장: 칭호와 계급. 능력치 화면의 ‘기본 능력치 / 최종 전투 능력치’와 같은 두 칸 구성입니다. */
/** v3.205 칭호 목록: 한 쪽에 TITLE_PAGE개씩, 왼쪽 · 오른쪽 화살표로 넘깁니다(목록이 길어져 화면을 다 덮던 문제). 처음에는 장착 중인 칭호가 있는 쪽을 엽니다. */
const TITLE_PAGE = 8;
function TitlePager({ send, busy, owned, chosenId }: Pick<PanelProps, 's' | 'send' | 'busy'> & { owned: Set<string>; chosenId?: string }) {
    const pages = Math.max(1, Math.ceil(TITLES.length / TITLE_PAGE)), start = Math.max(0, Math.floor(TITLES.findIndex(t => t.id === chosenId) / TITLE_PAGE));
    const [page, setPage] = useState(start), at = Math.min(page, pages - 1), rows = TITLES.slice(at * TITLE_PAGE, at * TITLE_PAGE + TITLE_PAGE);
    return <div className="title-pager">
        <div className="title-pager-nav">
            <button type="button" className="secondary small icon-button" aria-label="이전 칭호" disabled={at === 0} onClick={() => setPage(at - 1)}><ChevronLeft size={16}/></button>
            <span>{at + 1} / {pages}</span>
            <button type="button" className="secondary small icon-button" aria-label="다음 칭호" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}><ChevronRight size={16}/></button>
        </div>
        <div className="title-list">{rows.map(t => { const got = owned.has(t.id), on = chosenId === t.id; return <div key={t.id} className={`title-row ${got ? 'owned' : 'locked'} ${on ? 'on' : ''}`}><span className="title-name"><small className="rebirth-title">{t.name}</small></span><span className="title-desc">{t.group} · {t.desc}</span>{got ? <button type="button" className={on ? 'primary small' : 'secondary small'} disabled={busy || on} onClick={() => send({ type: 'title', id: t.id })}>{on ? '장착 중' : '장착'}</button> : <span className="title-locked">미획득</span>}</div>; })}</div>
    </div>;
}

export function Cosmetics({ s, send, busy }: PanelProps) {
    const owned = new Set(unlockedTitles(s).map(t => t.id)), current = displayTitle(s), chosen = titleById(s.title), badge = s.badge || 'title';
    const p = rankProgress(s), earned = rankPointsEarned(s), free = rankPointsFree(s);
    const reenlisted = reenlistCount(s), top = !p.next;
    // v3.18 계급 흐름도 방향(세로 기본). 이 기기에 기억.
    const [flow, setFlow] = useState<'column' | 'row'>('column');
    useEffect(() => { const t = setTimeout(() => { try { if (localStorage.getItem(FLOW_KEY) === 'row') setFlow('row'); } catch { /* 저장소 없음 */ } }, 0); return () => clearTimeout(t); }, []);
    const pickFlow = (v: 'column' | 'row') => { setFlow(v); try { localStorage.setItem(FLOW_KEY, v); } catch { /* 저장소 없음 */ } };
    return <>
    <Heading eyebrow="APPEARANCE" title="칭호와 계급" description="이름 옆에는 칭호나 계급장 중 하나를 보여 줍니다(채팅도 같음). 칭호는 업적으로, 계급은 처치한 마릿수로 얻습니다."/>
    <div className="build-columns">
    {/* v27.88 칭호·계급 칸은 제목(화살표)으로 접고 펼칩니다. */}
    <details className="panel attribute-panel cosmetics-fold" open>
    <summary className="section-title"><h2>칭호</h2><span>{current ? `표시 중 · ${current}` : '표시 안 함'} · {owned.size} / {TITLES.length} 획득</span><ChevronDown size={16} className="achievement-chevron"/></summary>
    <div className="title-actions"><button type="button" className={badge === 'title' ? 'primary small' : 'secondary small'} disabled={busy || badge === 'title'} onClick={() => send({ type: 'badge', id: 'title' })}>이름 옆에 칭호 표시</button><button type="button" className={s.title === undefined ? 'primary small' : 'secondary small'} disabled={busy} onClick={() => send({ type: 'title', id: 'auto' })}>자동(최근 획득)</button><button type="button" className={s.title === null ? 'primary small' : 'secondary small'} disabled={busy} onClick={() => send({ type: 'title', id: 'none' })}>표시 안 함</button></div>
    <TitlePager s={s} send={send} busy={busy} owned={owned} chosenId={chosen?.id}/>
    </details>
    <details className="panel derived-panel cosmetics-fold" open>
    <summary className="section-title"><h2>계급</h2><span>{p.rank.name}{reenlisted ? ` ★${reenlisted}` : ''} · 진급 포인트 {free} / {earned}</span><ChevronDown size={16} className="achievement-chevron"/></summary>
    <div className="title-actions"><button type="button" className={badge === 'rank' ? 'primary small' : 'secondary small'} disabled={busy || badge === 'rank'} onClick={() => send({ type: 'badge', id: 'rank' })}>이름 옆에 계급장 표시</button><button type="button" className="secondary small" disabled={busy || earned === free} title="쓴 진급 포인트를 모두 돌려받습니다 (무료)" onClick={() => send({ type: 'rankPerk', id: 'reset' })}>특전 초기화</button></div>
    <div className="rank-head" title={`계급표(각 계급까지 추가 처치 수): ${RANKS.map((r, i) => `${r.name}${i ? ` ${r.need.toLocaleString()}` : ''}`).join(' → ')}`}>
        <RankInsignia index={p.index} size={44} title={p.rank.name} ring={reenlisted}/>
        <div className="rank-head-text"><b>{p.rank.name}{reenlisted ? <small className="rank-reenlist"> ★ 재입대 {reenlisted}회 · 진급 포인트 +{reenlisted * REENLIST_BONUS_POINTS}</small> : null}</b><small>{p.next ? `${p.next.name}까지 ${(p.need - p.have).toLocaleString()}마리` : '최고 계급'} · 누적 처치 {p.exp.toLocaleString()}마리</small>{p.next && <Meter value={p.have} max={p.need} label=""/>}</div>
        {/* v3.165 재입대 버튼: 계급 옆 빨간 테두리. 중장일 때만 켜집니다(자동 사냥 중 · 던전 안에서는 꺼짐). */}
        <ConfirmButton className="rank-reenlist-button" label="재입대" icon={<Medal size={15}/>} title="재입대"
            hint={!top ? `${RANKS[RANKS.length - 1].name}에서만 재입대할 수 있습니다. 계급을 ${RANKS[0].name}으로 되돌리고 진급 포인트를 영구로 +${REENLIST_BONUS_POINTS} 받습니다(지금 +${reenlisted * REENLIST_BONUS_POINTS}).` : s.running || s.dungeon ? '자동 사냥을 멈추고 던전 밖에서 재입대할 수 있습니다.' : `계급을 ${RANKS[0].name}으로 되돌리고 진급 포인트를 영구로 +${REENLIST_BONUS_POINTS} 받습니다(지금 +${reenlisted * REENLIST_BONUS_POINTS}). 특전은 초기화되어 새 계급 기준으로 다시 찍습니다.`}
            description={`계급 ${p.rank.name} → ${RANKS[0].name}. 특전 초기화 · 진급 포인트 영구 +${REENLIST_BONUS_POINTS}(${reenlisted + 1}회째). 되돌릴 수 없습니다.`} disabled={busy || !top || s.running || !!s.dungeon} onConfirm={() => send({ type: 'reenlist' })} confirmLabel="재입대"/>
    </div>
    <div className="title-list">{RANK_PERKS.map(perk => { const level = rankPerkLevel(s, perk.id), maxed = level >= perk.max; return <div key={perk.id} className={`title-row ${level ? 'owned' : 'locked'}`}><span className="title-name"><small className="rebirth-title">{perk.name} {level}/{perk.max}</small></span><span className="title-desc">{perk.desc(Math.max(1, level))}{level ? '' : ' (1단계 기준)'}</span><button type="button" className={maxed ? 'secondary small' : 'primary small'} disabled={busy || maxed || free < perk.cost} onClick={() => send({ type: 'rankPerk', id: perk.id })}>{maxed ? '최대' : '올리기 · 1P'}</button></div>; })}</div>
    <h3 className="rank-flow-title">계급 흐름도 <small>계급 이름 아래는 그 계급에 오르는 누적 처치 수</small><span className="rank-flow-switch" role="tablist" aria-label="흐름도 방향"><button type="button" role="tab" aria-selected={flow === 'column'} className={flow === 'column' ? 'primary small' : 'secondary small'} onClick={() => pickFlow('column')}>세로</button><button type="button" role="tab" aria-selected={flow === 'row'} className={flow === 'row' ? 'primary small' : 'secondary small'} onClick={() => pickFlow('row')}>가로</button></span></h3>
    <ol className={`rank-flow ${flow}`} aria-label="계급 흐름도">{RANKS.map((r, i) => <li key={r.id} className={`rank-step ${i < p.index ? 'passed' : i === p.index ? 'current' : 'locked'} group-${r.group}`} title={`${r.name} · ${r.group} · 진급 포인트 +${r.points}`}>
        <RankInsignia index={i} size={flow === 'row' ? 34 : 30} title={r.name}/>
        <b>{r.name}</b>
        <small>{i ? `${RANK_CUMULATIVE[i].toLocaleString()}마리` : '시작'}</small>
        {flow === 'column' && <span className="rank-step-meta">{r.group} · 진급 +{r.points}P{i === p.index && p.next ? ` · ${p.next.name}까지 ${(p.need - p.have).toLocaleString()}마리` : ''}</span>}
        {i === p.index && <em>현재</em>}
    </li>)}</ol>
    <p className="footnote">진급 포인트는 병 1 · 부사관 2 · 장교 3 · 장성 4(합계 41)이고 특전은 단계당 1P입니다. 언제든 무료로 초기화합니다.</p>
    </details>
    </div>
    </>;
}
