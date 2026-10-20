'use client';
/** 원정대(오토배틀러) 2단계 화면: 하루 1판 · 8라운드 PvE. 상점 5장 → 벤치 → 보드(앞줄 · 뒷줄 4칸) → 전투. 드래그 없이 버튼만으로 390px에서도 쓰이게. */
import { useState } from 'react';
import { Coins, Heart, Swords, Flag, Sparkles } from 'lucide-react';
import { EXPEDITION, UNITS, ORIGIN_NAMES, ROLE_NAMES, SPECIAL_NAMES, unitById, sellPrice, type UnitDef } from '@/game/data/expedition';
import { activeTraits } from '@/game/systems/expedition';
import { expeditionRewardPerWin } from '@/game/systems/actions/expedition';
import { enemySkillById } from '@/game/data/encounters';
import { dayKey } from '@/game/data/time';
import { Heading, format, useNow } from './shared';
import { ConfirmButton } from './confirm-button';
import type { PanelProps } from './panel-props';

const tags = (def: UnitDef) => [ORIGIN_NAMES[def.origin], ...def.roles.map(r => ROLE_NAMES[r]), ...(def.special || []).map(x => SPECIAL_NAMES[x])].join(' · ');
const stars = (n: number) => '★'.repeat(n);

export function Expedition({ s, send, busy }: PanelProps) {
    const r = s.expedition, now = useNow(60_000), today = s.expeditionDay === dayKey(now);
    const [showLog, setShowLog] = useState(false);
    const perWin = expeditionRewardPerWin(s.rebirths || 0);
    const intro = <Heading eyebrow="EXPEDITION" title="원정대" description={`하루 한 판, 8라운드. 라운드마다 받는 골드로 상점에서 유닛을 사 보드에 배치하고 웨이브와 싸웁니다. 같은 유닛 3개는 ★이 오르고, 지역 · 역할이 겹치면 시너지가 켜집니다. 승리마다 정수 ${format(perWin)}, 완주하면 ×${EXPEDITION.clearBonus}.`}/>;
    if (!r || (r.done && !r.reward && r.reward !== 0)) return <>{intro}<section className="panel exp-start">
        {today ? <p className="notice">오늘 원정은 마쳤습니다. 자정(KST)에 다시 열립니다.{s.expeditionBest ? ` 최고 ${s.expeditionBest}승.` : ''}</p> : <button className="primary" disabled={busy} onClick={() => send({ type: 'expeditionStart' })}>원정 출발</button>}
        <p className="footnote">유닛 {UNITS.length}종 · 지역 6 · 역할 6. 보드는 앞줄 4 · 뒷줄 4칸이고 배치 수는 판 레벨(경험치 {EXPEDITION.xp} G)로 늘어납니다. 수호 · 돌격은 앞줄, 마력 · 망령은 뒷줄이 유리합니다.</p>
    </section></>;
    if (r.done) return <>{intro}<section className="panel exp-start">
        <h2>원정 종료 · {r.wins}승</h2><p>정수 +{format(r.reward || 0)}{r.round > EXPEDITION.rounds ? ' · 완주 보너스' : ''}{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</p>
        <button className="secondary" disabled={busy} onClick={() => send({ type: 'expeditionClear' })}>닫기</button>
    </section></>;
    const traits = activeTraits(r.board), slots = EXPEDITION.boardSlots[Math.min(EXPEDITION.boardSlots.length - 1, r.level)];
    const cell = (row: 'front' | 'back', col: number) => { const list = r.board.map((x, i) => [x, i] as const).filter(([x]) => x.row === row); const hit = list[col]; if (!hit) return <div className="exp-cell empty" key={`${row}${col}`}/>; const [x, i] = hit, def = unitById(x.unit)!; return <button type="button" className={`exp-cell cost-${def.cost}`} key={`${row}${col}`} title={`${def.name} · ${tags(def)} · 누르면 벤치로`} disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `board:${i}` })}><b>{def.name}</b><small>{stars(x.star)}</small></button>; };
    return <>{intro}
        <section className="panel port-resource-bar exp-bar" aria-label="원정 상태">
            <div><Flag size={22}/><span>라운드<strong>{r.round} <small>/ {EXPEDITION.rounds}</small></strong></span></div>
            <div><Heart size={22}/><span>원정 체력<strong>{r.hp}</strong></span></div>
            <div><Coins size={22}/><span>판 골드<strong>{r.gold}</strong></span></div>
            <div><Sparkles size={22}/><span>판 레벨<strong>{r.level} <small>· 배치 {r.board.length}/{slots} · 경험치 {r.xp}/{EXPEDITION.xpToLevel[r.level] || '-'}</small></strong></span></div>
            <div><Swords size={22}/><span>전적<strong>{r.wins}승 <small>· 연승 {r.streak}</small></strong></span></div>
        </section>
        <div className="exp-columns">
        <section className="panel exp-board-panel" aria-label="보드">
            <div className="section-title"><h2>보드</h2><span>앞줄 · 뒷줄 4칸, 누르면 벤치로</span></div>
            <div className="exp-board"><div className="exp-row-label">뒷줄</div>{[0, 1, 2, 3].map(c => cell('back', c))}<div className="exp-row-label">앞줄</div>{[0, 1, 2, 3].map(c => cell('front', c))}</div>
            <div className="exp-traits">{traits.length ? traits.map(t => <span key={t.trait.id} className={t.tier ? 'on' : ''} title={t.trait.tiers.map(x => x.count).join(' / ')}>{t.trait.name} {t.count}{t.tier ? ` · ${t.tier}단계` : ''}</span>) : <small className="muted">유닛을 배치하면 시너지가 보입니다.</small>}</div>
            <div className="button-row exp-actions">
                <button className="primary" disabled={busy || !r.board.length} onClick={() => send({ type: 'expeditionFight' })}>{r.round}라운드 전투</button>
                <ConfirmButton label="포기" title="원정을 포기할까요?" description={`지금까지 ${r.wins}승 보상(정수 ${format(r.wins * perWin)})만 받고 오늘 원정을 마칩니다.`} disabled={busy} onConfirm={() => send({ type: 'expeditionQuit' })}/>
            </div>
            {r.last && <div className={`exp-last ${r.last.won ? 'won' : 'lost'}`}><b>{r.round - 1}라운드 {r.last.won ? '승리' : '패배'}</b> · {r.last.turns}턴 · 아군 체력 {r.last.hpLeft[0]}% · 적 {r.last.hpLeft[1]}% <button type="button" className="text-button" onClick={() => setShowLog(v => !v)}>{showLog ? '기록 접기' : '기록 보기'}</button>{showLog && <ul className="exp-log">{r.last.log.map((l, i) => <li key={i}>{l}</li>)}</ul>}</div>}
        </section>
        <section className="panel exp-bench-panel" aria-label="벤치">
            <div className="section-title"><h2>벤치</h2><span>{r.bench.length} / {EXPEDITION.bench}</span></div>
            {r.bench.length ? <ul className="exp-bench">{r.bench.map((x, i) => { const def = unitById(x.unit)!; return <li key={i} className={`cost-${def.cost}`}><div><b>{def.name} <small>{stars(x.star)}</small></b><small>{tags(def)}</small></div><div className="button-row"><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:front` })}>앞줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:back` })}>뒷줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionSell', value: `bench:${i}` })}>판매 {sellPrice(def.cost, x.star)}</button></div></li>; })}</ul> : <p className="muted">상점에서 산 유닛이 여기 옵니다.</p>}
        </section>
        </div>
        <section className="panel exp-shop-panel" aria-label="상점">
            <div className="section-title"><h2>상점</h2><span><button className="secondary small" disabled={busy || r.gold < EXPEDITION.reroll} onClick={() => send({ type: 'expeditionReroll' })}>새로 고침 {EXPEDITION.reroll} G</button> <button className="secondary small" disabled={busy || r.gold < EXPEDITION.xp || r.level >= 8} onClick={() => send({ type: 'expeditionXp' })}>경험치 {EXPEDITION.xp} G</button></span></div>
            <div className="exp-shop">{r.shop.map((id, i) => { if (!id) return <div key={i} className="exp-card sold">판매됨</div>; const def = unitById(id)!, sk = enemySkillById(def.skill); return <button type="button" key={i} className={`exp-card cost-${def.cost}`} disabled={busy || r.gold < def.cost || r.bench.length >= EXPEDITION.bench} title={sk ? `${sk.name}: ${sk.desc}` : undefined} onClick={() => send({ type: 'expeditionBuy', value: String(i) })}><b>{def.name}</b><small>{tags(def)}</small><em>{def.cost} G</em></button>; })}</div>
            <p className="footnote">같은 유닛 3개면 ★이 오릅니다(★2 → ★3도 3개). 판매는 산 값 그대로 돌려받습니다. 기술은 마나 100에 발동하고(기본 공격 +10 · 피격 +5), 카드를 길게 누르면 기술 설명이 보입니다.</p>
        </section>
    </>;
}
