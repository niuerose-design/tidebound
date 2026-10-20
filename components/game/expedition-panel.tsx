'use client';
/** 원정대(오토배틀러) 화면: 8라운드 PvE · 고스트, 횟수 제한 없음(5단계). 상점 5장 → 벤치 → 보드(앞줄 · 뒷줄 4칸) → 전투. 드래그 없이 버튼만으로 390px에서도 쓰이게. */
import { useState } from 'react';
import { Coins, Heart, Swords, Flag, Sparkles } from 'lucide-react';
import { EXPEDITION, UNITS, ORIGIN_NAMES, ROLE_NAMES, SPECIAL_NAMES, unitById, sellPrice, itemById, ITEM_HOLD, type UnitDef, comboOf, ITEMS } from '@/game/data/expedition';
import { activeTraits } from '@/game/systems/expedition';
import { expeditionReward } from '@/game/systems/actions/expedition';
import { enemySkillById } from '@/game/data/encounters';
import { Heading, format } from './shared';
import { ConfirmButton } from './confirm-button';
import { MonsterArt } from './art';
import { OnyxArt } from './onyx-art';
import type { PanelProps } from './panel-props';

const tags = (def: UnitDef) => [ORIGIN_NAMES[def.origin], ...def.roles.map(r => ROLE_NAMES[r]), ...(def.special || []).map(x => SPECIAL_NAMES[x])].join(' · ');
const stars = (n: number) => '★'.repeat(n);
/** 유닛 아이콘: 본편 몬스터 그림(없으면 실루엣), 칠흑 보스는 칠흑 아트. */
const UnitArt = ({ def, size }: { def: UnitDef; size: number }) => def.special?.includes('onyx') ? <OnyxArt id={def.monster} size={size}/> : <MonsterArt id={def.monster} size={size} boss={!!def.special?.includes('boss')}/>;

export function Expedition({ s, send, busy }: PanelProps) {
    const r = s.expedition;
    const [showLog, setShowLog] = useState(false);
    // 6단계 아이템: 가진 아이템을 누르면(고른 상태) 유닛마다 ‘장착’ 버튼이 나타나고, 낀 아이템 배지를 누르면 해제합니다.
    const [pick, setPick] = useState<number | null>(null);

    const intro = <Heading eyebrow="EXPEDITION" title="원정대" description={`8라운드 오토배틀러. 라운드마다 받는 골드로 상점에서 유닛을 사 보드에 배치하고 웨이브 · 다른 모험가의 원정대(2라운드부터)와 싸웁니다. 같은 유닛 3개는 ★이 오르고, 지역 · 역할이 겹치면 시너지가 켜집니다. 승리마다 세계석 ${EXPEDITION.pearlsPerWin}, 완주하면 +${EXPEDITION.clearPearls}. 횟수 제한은 없습니다.`}/>;
    if (!r || (r.done && !r.reward && r.reward !== 0)) return <>{intro}<section className="panel exp-start">
        <button className="primary" disabled={busy} onClick={() => send({ type: 'expeditionStart' })}>원정 출발{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</button>
        <p className="footnote">유닛 {UNITS.length}종 · 지역 6 · 역할 6. 보드는 앞줄 4 · 뒷줄 4칸이고 배치 수는 판 레벨(경험치 {EXPEDITION.xp} G)로 늘어납니다. 수호 · 돌격은 앞줄, 마력 · 망령은 뒷줄이 유리합니다.</p>
    </section></>;
    if (r.done) return <>{intro}<section className="panel exp-start">
        <h2>원정 종료 · {r.wins}승</h2><p>세계석 +{format(r.reward || 0)}{r.round > EXPEDITION.rounds ? ` · 완주 +${EXPEDITION.clearPearls}` : ''}{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</p>
        <div className="button-row"><button className="primary" disabled={busy} onClick={() => send({ type: 'expeditionStart' })}>바로 다시 출발</button><button className="secondary" disabled={busy} onClick={() => send({ type: 'expeditionClear' })}>닫기</button></div>
    </section></>;
    const traits = activeTraits(r.board), slots = EXPEDITION.boardSlots[Math.min(EXPEDITION.boardSlots.length - 1, r.level)];
    const held = r.items || [], picking = pick !== null && pick < held.length ? pick : null;
    const equipButton = (where: 'board' | 'bench', i: number) => picking === null ? null : <button type="button" className="primary small exp-equip" disabled={busy} onClick={e => { e.stopPropagation(); send({ type: 'expeditionEquip', value: `${where}:${i}:${picking}` }); setPick(null); }}>장착</button>;
    const itemBadge = (where: 'board' | 'bench', i: number, item?: string) => item ? <button type="button" className="exp-item-badge" title={`${itemById(item)?.name}: ${itemById(item)?.desc} · 누르면 해제`} disabled={busy} onClick={e => { e.stopPropagation(); send({ type: 'expeditionUnequip', value: `${where}:${i}` }); }}>{itemById(item)?.name}</button> : null;
    const cell = (row: 'front' | 'back', col: number) => { const list = r.board.map((x, i) => [x, i] as const).filter(([x]) => x.row === row); const hit = list[col]; if (!hit) return <div className="exp-cell empty" key={`${row}${col}`}/>; const [x, i] = hit, def = unitById(x.unit)!; return <div className={`exp-cell cost-${def.cost}${x.item ? ' has-item' : ''}`} key={`${row}${col}`}><button type="button" className="exp-cell-main" title={`${def.name} · ${tags(def)} · 누르면 벤치로`} disabled={busy || picking !== null} onClick={() => send({ type: 'expeditionPlace', value: `board:${i}` })}><UnitArt def={def} size={26}/><b>{def.name}</b><small>{stars(x.star)}</small></button>{itemBadge('board', i, x.item)}{equipButton('board', i)}</div>; };
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
            {r.box?.length ? <div className="exp-box" aria-label="상자 선택지"><div className="section-title"><h2>상자</h2><span>셋 중 하나를 고르세요</span></div><div className="exp-box-choices">{r.box.map((id, k) => { const it = itemById(id); return <button type="button" key={k} className="exp-box-choice" disabled={busy} onClick={() => send({ type: 'expeditionPickBox', value: String(k) })}><b>{it?.name}</b><small>{it?.desc}</small></button>; })}</div><button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'expeditionSkipBox' })}>건너뛰기</button></div> : null}
            <div className="exp-items" aria-label="가진 아이템"><span className="muted">아이템 {held.length}/{ITEM_HOLD}</span>{held.length ? held.map((id, k) => { const it = itemById(id), combo = picking !== null && picking !== k ? comboOf(held[picking], id) : undefined; return <button type="button" key={k} className={`exp-item${picking === k ? ' picked' : ''}${combo ? ' combo' : ''}`} title={combo ? `${it?.name}과 합쳐 ${combo.name}(${combo.desc})` : it?.desc} disabled={busy} aria-pressed={picking === k} onClick={() => { if (combo) { send({ type: 'expeditionCombine', value: `${picking}:${k}` }); setPick(null); } else setPick(picking === k ? null : k); }}>{it?.name}{combo ? <small> → {combo.name}</small> : null}</button>; }) : <small className="muted">라운드를 이기면 상자에서 셋 중 하나를 고릅니다.</small>}{picking !== null && <small className="muted">유닛의 ‘장착’을 누르거나, 합쳐지는 아이템(→)을 누르세요 · <button type="button" className="text-button" onClick={() => setPick(null)}>취소</button></small>}</div>
            {held.length > 1 || r.box?.length ? <details className="exp-combos"><summary>조합표</summary><ul>{ITEMS.filter(x => x.tier).map(x => { const pair = ITEMS.filter(a => !a.tier).flatMap(a => ITEMS.filter(b => !b.tier && b.id >= a.id && comboOf(a.id, b.id)?.id === x.id).map(b => `${a.name} + ${b.name}`)); return <li key={x.id}><b>{x.name}</b> = {pair.join(', ')} <small className="muted">· {x.desc}</small></li>; })}</ul></details> : null}
            <div className="button-row exp-actions">
                <button className="primary" disabled={busy || !r.board.length || !!r.box?.length} title={r.box?.length ? '상자에서 아이템을 고르거나 건너뛴 뒤 전투할 수 있습니다.' : undefined} onClick={() => send({ type: 'expeditionFight' })}>{r.round}라운드 전투</button>
                <ConfirmButton label="포기" title="원정을 포기할까요?" description={`지금까지 ${r.wins}승 보상(세계석 ${expeditionReward(r.wins, false)})만 받고 이 원정을 마칩니다. 바로 새 원정을 시작할 수 있습니다.`} disabled={busy} onConfirm={() => send({ type: 'expeditionQuit' })}/>
            </div>
            {r.last && <div className={`exp-last ${r.last.won ? 'won' : 'lost'}`}><b>{r.round - 1}라운드 {r.last.won ? '승리' : '패배'}</b>{r.last.opponent ? <> · 상대 <b>{r.last.opponent}</b>의 원정대</> : ' · 웨이브'} · {r.last.turns}턴 · 아군 체력 {r.last.hpLeft[0]}% · 적 {r.last.hpLeft[1]}% <button type="button" className="text-button" onClick={() => setShowLog(v => !v)}>{showLog ? '기록 접기' : '기록 보기'}</button>{r.ghostPoints ? <small className="muted"> · 고스트 가산 +{r.ghostPoints}</small> : null}{showLog && <ul className="exp-log">{r.last.log.map((l, i) => <li key={i} style={{ animationDelay: `${Math.min(i, 30) * 70}ms` }}>{l}</li>)}</ul>}</div>}
        </section>
        <section className="panel exp-bench-panel" aria-label="벤치">
            <div className="section-title"><h2>벤치</h2><span>{r.bench.length} / {EXPEDITION.bench}</span></div>
            {r.bench.length ? <ul className="exp-bench">{r.bench.map((x, i) => { const def = unitById(x.unit)!; return <li key={i} className={`cost-${def.cost}`}><div className="exp-bench-unit"><UnitArt def={def} size={30}/><div><b>{def.name} <small>{stars(x.star)}</small></b><small>{tags(def)}</small>{itemBadge('bench', i, x.item)}</div></div><div className="button-row">{equipButton('bench', i)}<button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:front` })}>앞줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:back` })}>뒷줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionSell', value: `bench:${i}` })}>판매 {sellPrice(def.cost, x.star)}</button></div></li>; })}</ul> : <p className="muted">상점에서 산 유닛이 여기 옵니다.</p>}
        </section>
        </div>
        <section className="panel exp-shop-panel" aria-label="상점">
            <div className="section-title"><h2>상점</h2><span><button className="secondary small" disabled={busy || r.gold < EXPEDITION.reroll} onClick={() => send({ type: 'expeditionReroll' })}>새로 고침 {EXPEDITION.reroll} G</button> <button className="secondary small" disabled={busy || r.gold < EXPEDITION.xp || r.level >= 8} onClick={() => send({ type: 'expeditionXp' })}>경험치 {EXPEDITION.xp} G</button></span></div>
            <div className="exp-shop">{r.shop.map((id, i) => { if (!id) return <div key={i} className="exp-card sold">판매됨</div>; const def = unitById(id)!, sk = enemySkillById(def.skill); return <button type="button" key={i} className={`exp-card cost-${def.cost}`} disabled={busy || r.gold < def.cost || r.bench.length >= EXPEDITION.bench} title={sk ? `${sk.name}: ${sk.desc}` : undefined} onClick={() => send({ type: 'expeditionBuy', value: String(i) })}><UnitArt def={def} size={34}/><b>{def.name}</b><small>{tags(def)}</small><em>{def.cost} G</em></button>; })}</div>
            <p className="footnote">같은 유닛 3개면 ★이 오릅니다(★2 → ★3도 3개, 아이템은 첫 유닛 것을 물려받고 나머지는 되돌아옴). 판매는 산 값 그대로 돌려받고 아이템도 돌아옵니다. 기술은 마나 100에 발동하고(기본 공격 +10 · 피격 +5), 카드를 길게 누르면 기술 설명이 보입니다.</p>
        </section>
    </>;
}
