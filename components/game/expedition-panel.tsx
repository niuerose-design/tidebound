'use client';
/** 원정대(오토배틀러) 화면: 8라운드 PvE · 고스트, 횟수 제한 없음(5단계). 상점 5장 → 벤치 → 보드(앞줄 · 뒷줄 4칸) → 전투. 드래그 없이 버튼만으로 390px에서도 쓰이게. */
import { useState } from 'react';
import { Coins, Heart, Swords, Flag, Sparkles } from 'lucide-react';
import { EXPEDITION, UNITS, ORIGIN_NAMES, ROLE_NAMES, SPECIAL_NAMES, unitById, sellPrice, itemById, ITEM_HOLD, type UnitDef, comboOf, ITEMS, describeTier, EMBLEM_ROUND, TIER2_ROUND, SEASON_REWARDS, isBossRound, actOf, augmentById, augmentName, augmentDesc, weeklyRule, weeklyRuleById, masteryXpFor, MASTERY_MAX, MASTERY_PERKS } from '@/game/data/expedition';
import { weekKey } from '@/game/data/time';
import { activeTraits, traitKeys, ACT_BOSSES } from '@/game/systems/expedition';
import { expeditionReward, runMods, benchCap } from '@/game/systems/actions/expedition';
import { enemySkillById } from '@/game/data/encounters';
import { Heading, format, useNow } from './shared';
import { ConfirmButton } from './confirm-button';
import { BattleReplay, UnitArt } from './expedition-replay';
import type { PanelProps } from './panel-props';

const tags = (def: UnitDef) => [ORIGIN_NAMES[def.origin], ...def.roles.map(r => ROLE_NAMES[r]), ...(def.special || []).map(x => SPECIAL_NAMES[x])].join(' · ');
const stars = (n: number) => '★'.repeat(n);
/** 유닛 아이콘: 본편 몬스터 그림(없으면 실루엣), 칠흑 보스는 칠흑 아트. */

export function Expedition({ s, send, busy }: PanelProps) {
    const r = s.expedition;
    const [showLog, setShowLog] = useState(false);
    // 12단계: 전투 재생. 새 결과가 오면 자동으로 열리고, 닫으면 그 결과 키를 기억합니다.
    const [closedReplay, setClosedReplay] = useState('');
    // 6단계 아이템: 가진 아이템을 누르면(고른 상태) 유닛마다 ‘장착’ 버튼이 나타나고, 낀 아이템 배지를 누르면 해제합니다.
    const [pick, setPick] = useState<number | null>(null);
    // 8단계: 시너지 칩을 누르면 단계별 효과가 펼쳐집니다.
    const [openTrait, setOpenTrait] = useState<string | null>(null);
    // 11단계: 이번 주 규칙(출발 화면용, useNow는 처음엔 0이라 하이드레이션 뒤에 채워짐) · 숙련.
    const now = useNow(60_000), thisWeek = now ? weeklyRule(weekKey(now)).id : null;
    const mastery = s.expeditionMastery || { level: 1, xp: 0, total: 0 }, nextPerk = MASTERY_PERKS.find(p => p.level > mastery.level);
    const masteryBox = <div className="exp-mastery" aria-label="원정 숙련">
        <div className="exp-mastery-head"><b>원정 숙련 {mastery.level}{mastery.level >= MASTERY_MAX ? ' (최대)' : ''}</b><small>{mastery.level < MASTERY_MAX ? `${mastery.xp} / ${masteryXpFor(mastery.level)}` : '완성'}</small></div>
        <div className="exp-mastery-bar"><i style={{ width: `${mastery.level >= MASTERY_MAX ? 100 : Math.min(100, Math.round(100 * mastery.xp / masteryXpFor(mastery.level)))}%` }}/></div>
        <small className="muted">판이 끝나면 승리 × 10 · 막 보스 × 20 · 완주 50 경험치. {nextPerk ? `다음 특전 Lv.${nextPerk.level} ${nextPerk.name}: ${nextPerk.desc}` : '모든 특전을 얻었습니다.'}</small>
        <details><summary>특전 목록</summary><ul>{MASTERY_PERKS.map(p => <li key={p.id} className={p.level <= mastery.level ? 'on' : ''}>Lv.{p.level} <b>{p.name}</b> · {p.desc}</li>)}</ul></details>
    </div>;
    const weekRule = thisWeek ? weeklyRuleById(thisWeek) : undefined;
    const weekBanner = weekRule ? <p className="exp-rule">이번 주 규칙 · <b>{weekRule.name}</b> · {weekRule.desc} <small className="muted">(매주 월요일 바뀜 · 판을 시작할 때 규칙이 붙어 끝까지 유지)</small></p> : null;

    const intro = <Heading eyebrow="EXPEDITION" title="원정대" description={`${EXPEDITION.rounds}라운드 · 3막 오토배틀러. 라운드마다 받는 골드로 상점에서 유닛을 사 보드에 배치하고 웨이브 · 다른 모험가의 원정대(2라운드부터)와 싸웁니다. 막 끝(4 · 8 · 12라운드)에는 보스가 나옵니다. 같은 유닛 3개는 ★이 오르고, 지역 · 역할이 겹치면 시너지가 켜집니다. 승리마다 세계석 ${EXPEDITION.pearlsPerWin}, 막 보스 +${EXPEDITION.actPearls}, 완주 +${EXPEDITION.clearPearls}. 2 · 5 · 8라운드에는 판 전체에 걸리는 증강을 고르고, 주마다 규칙이 바뀝니다. 횟수 제한은 없습니다.`}/>;
    // 9단계: 지난 시즌 정산 내역과 시즌 보상표.
    const season = s.expeditionSeasonLast ? <p className="exp-season">지난 시즌 {s.expeditionSeasonLast.season} · {s.expeditionSeasonLast.rank ? `${s.expeditionSeasonLast.rank}위` : '순위 밖'} / {s.expeditionSeasonLast.total}명 · 최고 {s.expeditionSeasonLast.wins}승 · 세계석 +{s.expeditionSeasonLast.pearls} 받음</p> : null;
    const rewardTable = <p className="footnote">월간 순위 보상(한국 시간 매월 1일 이후 첫 출발 때 지급): {SEASON_REWARDS.map(x => `${x.label} ${x.pearls}`).join(' · ')}.</p>;
    if (!r || (r.done && !r.reward && r.reward !== 0)) return <>{intro}<section className="panel exp-start">
        {season}{weekBanner}
        <button className="primary" disabled={busy} onClick={() => send({ type: 'expeditionStart' })}>원정 출발{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</button>
        {masteryBox}
        <p className="footnote">유닛 {UNITS.length}종 · 지역 6 · 역할 6. 보드는 앞줄 4 · 뒷줄 4칸이고 배치 수는 판 레벨(경험치 {EXPEDITION.xp} G)로 늘어납니다. 수호 · 돌격은 앞줄, 마력 · 망령은 뒷줄이 유리합니다.</p>
        {rewardTable}
    </section></>;
    if (r.done) return <>{intro}<section className="panel exp-start">
        <h2>원정 종료 · {r.wins}승</h2><p>세계석 +{format(r.reward || 0)}{r.round > EXPEDITION.rounds ? ` · 완주 +${EXPEDITION.clearPearls}` : ''}{r.acts ? ` · 막 보스 ${r.acts} × ${EXPEDITION.actPearls}` : ''}{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</p>
        <div className="button-row"><button className="primary" disabled={busy} onClick={() => send({ type: 'expeditionStart' })}>바로 다시 출발</button><button className="secondary" disabled={busy} onClick={() => send({ type: 'expeditionClear' })}>닫기</button></div>
        {masteryBox}{season}{weekBanner}{rewardTable}
    </section></>;
    const mods = runMods(r), runRule = weeklyRuleById(r.rule), bench = benchCap(r);
    const traits = activeTraits(r.board, mods), slots = EXPEDITION.boardSlots[Math.min(EXPEDITION.boardSlots.length - 1, r.level)];
    const held = r.items || [], picking = pick !== null && pick < held.length ? pick : null;
    // 8단계 직관성: 보드에 이미 센 특성 키(상점 카드의 ‘시너지 +’ 표시), 보유 장수(합치기 n/3), 다음 할 일.
    const boardKeys = new Set(traits.map(t => t.trait.id as string)), onBoard = new Set(r.board.map(x => x.unit));
    const ownedCount = (id: string) => [...r.board, ...r.bench].filter(x => x.unit === id).reduce((n, x) => n + (x.star === 3 ? 9 : x.star === 2 ? 3 : 1), 0);
    const freeSlots = Math.max(0, slots - r.board.length);
    const bossNext = isBossRound(r.round) ? unitById(ACT_BOSSES[actOf(r.round)]) : undefined;
    const todo = r.augmentOffer?.length ? '증강을 하나 고르세요(판 전체에 걸리는 효과).' : r.box?.length ? '상자에서 아이템을 고르거나 건너뛰세요.' : freeSlots && r.bench.length ? `보드에 빈 칸 ${freeSlots} · 벤치 유닛을 앞줄 · 뒷줄에 놓으세요.` : !r.board.length ? '상점에서 유닛을 사서 보드에 놓으세요.' : picking !== null ? '장착할 유닛의 ‘장착’을 누르거나 합쳐지는 아이템(→)을 누르세요.' : held.length && r.board.some(x => !x.item) ? `아이템 ${held.length}개가 놀고 있어요. 장착하면 더 강해집니다.` : r.gold >= EXPEDITION.xp && r.level < 8 && r.bench.length ? '골드가 남으면 경험치를 사서 배치 칸을 늘릴 수 있습니다.' : bossNext ? `${actOf(r.round)}막 보스 ${bossNext.name}이(가) 기다립니다. 이기면 세계석 +${EXPEDITION.actPearls}.` : '전투 준비 완료.';
    const equipButton = (where: 'board' | 'bench', i: number) => picking === null ? null : <button type="button" className="primary small exp-equip" disabled={busy} onClick={e => { e.stopPropagation(); send({ type: 'expeditionEquip', value: `${where}:${i}:${picking}` }); setPick(null); }}>장착</button>;
    const itemBadge = (where: 'board' | 'bench', i: number, item?: string) => item ? <button type="button" className={`exp-item-badge${itemById(item)?.tier === 'emblem' ? ' emblem' : itemById(item)?.tier === 2 ? ' tier2' : ''}`} title={`${itemById(item)?.name}: ${itemById(item)?.desc} · 누르면 해제`} disabled={busy} onClick={e => { e.stopPropagation(); send({ type: 'expeditionUnequip', value: `${where}:${i}` }); }}>{itemById(item)?.tier === 'emblem' ? `+${itemById(item)!.name.replace('의 문장', '')}` : itemById(item)?.name}</button> : null;
    const cell = (row: 'front' | 'back', col: number) => { const list = r.board.map((x, i) => [x, i] as const).filter(([x]) => x.row === row); const hit = list[col]; if (!hit) return <div className="exp-cell empty" key={`${row}${col}`}/>; const [x, i] = hit, def = unitById(x.unit)!; return <div className={`exp-cell cost-${def.cost} star-${x.star}${x.item ? ' has-item' : ''}`} key={`${row}${col}`}><button type="button" className="exp-cell-main" title={`${def.name} · ${tags(def)}${x.item && itemById(x.item)?.emblem ? ` (+${itemById(x.item)!.name})` : ''} · 누르면 벤치로`} disabled={busy || picking !== null} onClick={() => send({ type: 'expeditionPlace', value: `board:${i}` })}><UnitArt def={def} size={26}/><b>{def.name}</b><small>{stars(x.star)}</small></button>{itemBadge('board', i, x.item)}{equipButton('board', i)}</div>; };
    return <>{intro}
        <section className="panel port-resource-bar exp-bar" aria-label="원정 상태">
            <div><Flag size={22}/><span>{actOf(r.round)}막 · 라운드<strong>{r.round} <small>/ {EXPEDITION.rounds}</small></strong></span></div>
            <div><Heart size={22}/><span>원정 체력<strong>{r.hp}</strong></span></div>
            <div><Coins size={22}/><span>판 골드<strong>{r.gold}</strong></span></div>
            <div><Sparkles size={22}/><span>판 레벨<strong>{r.level} <small>· 배치 {r.board.length}/{slots} · 경험치 {r.xp}/{EXPEDITION.xpToLevel[r.level] || '-'}</small></strong></span></div>
            <div><Swords size={22}/><span>전적<strong>{r.wins}승 <small>· 연승 {r.streak}</small></strong></span></div>
        </section>
        <ol className="exp-progress" aria-label="라운드 진행">{Array.from({ length: EXPEDITION.rounds }, (_, i) => i + 1).map(n => { const boss = isBossRound(n), won = r.history?.[n] && n < r.round ? (n === r.round - 1 ? r.last?.won : undefined) : undefined; return <li key={n} className={`${n < r.round ? 'past' : n === r.round ? 'now' : ''}${boss ? ' boss' : ''}`} title={boss ? `${actOf(n)}막 보스 ${unitById(ACT_BOSSES[actOf(n)])?.name}` : `${n}라운드`}>{boss ? <UnitArt def={unitById(ACT_BOSSES[actOf(n)])!} size={18}/> : n}{won === false ? <i/> : null}</li>; })}</ol>
        <p className={`exp-todo${r.box?.length || r.augmentOffer?.length ? ' urgent' : bossNext ? ' boss' : ''}`} role="status">다음 할 일 · {todo}</p>
        {runRule ? <p className="exp-rule small">이번 판 규칙 · <b>{runRule.name}</b> · {runRule.desc}</p> : null}
        <div className="exp-columns">
        <section className="panel exp-board-panel" aria-label="보드">
            <div className="section-title"><h2>보드</h2><span>앞줄 · 뒷줄 4칸, 누르면 벤치로</span></div>
            <div className="exp-board"><div className="exp-row-label">뒷줄</div>{[0, 1, 2, 3].map(c => cell('back', c))}<div className="exp-row-label">앞줄</div>{[0, 1, 2, 3].map(c => cell('front', c))}</div>
            <div className="exp-traits">{traits.length ? traits.map(t => { const next = t.trait.tiers[t.tier], max = t.tier === t.trait.tiers.length; return <button type="button" key={t.trait.id} className={`${t.tier ? 'on' : ''}${max ? ' max' : ''}${openTrait === t.trait.id ? ' open' : ''}`} aria-expanded={openTrait === t.trait.id} title="누르면 단계별 효과" onClick={() => setOpenTrait(openTrait === t.trait.id ? null : t.trait.id)}>{t.trait.name} <b>{t.count}</b>{max ? ' ✓' : <small>/{next.count}</small>}</button>; }) : <small className="muted">유닛을 배치하면 시너지가 보입니다. 같은 지역 · 역할이 2명부터 켜집니다.</small>}</div>
            {openTrait && traits.some(t => t.trait.id === openTrait) && (() => { const t = traits.find(x => x.trait.id === openTrait)!; return <ul className="exp-trait-tiers">{t.trait.tiers.map((tier, i) => <li key={i} className={t.tier > i ? 'on' : ''}>{t.trait.name} {tier.count}: {describeTier(tier)}{t.tier === i ? <small> · {tier.count - t.count}명 더</small> : null}</li>)}</ul>; })()}
            {r.augmentOffer?.length ? <div className="exp-aug-offer" aria-label="증강 선택지"><div className="section-title"><h2>증강</h2><span>{r.round}라운드 · 하나를 고르세요</span></div><div className="exp-aug-choices">{r.augmentOffer.map((id, k) => { const def = augmentById(id)!; return <button type="button" key={k} className={`exp-aug-choice tier-${def.tier} kind-${def.kind}`} disabled={busy} onClick={() => send({ type: 'expeditionPickAugment', value: String(k) })}><small>{def.kind === 'economy' ? '경제' : def.kind === 'synergy' ? '시너지' : '전투'} · {def.tier}등급</small><b>{augmentName(id)}</b><span>{augmentDesc(id)}</span></button>; })}</div></div> : null}
            {r.augments?.length ? <div className="exp-augments" aria-label="고른 증강"><span className="muted">증강</span>{r.augments.map((id, k) => { const def = augmentById(id)!; return <span key={k} className={`exp-aug tier-${def.tier}`} title={augmentDesc(id)}>{augmentName(id)}</span>; })}</div> : null}
            {r.box?.length ? <div className="exp-box" aria-label="상자 선택지"><div className="section-title"><h2>상자</h2><span>셋 중 하나를 고르세요</span></div><div className="exp-box-choices">{r.box.map((id, k) => { const it = itemById(id); return <button type="button" key={k} className={`exp-box-choice${it?.tier === 'emblem' ? ' emblem' : ''}`} disabled={busy} onClick={() => send({ type: 'expeditionPickBox', value: String(k) })}><b>{it?.name}</b><small>{it?.desc}</small></button>; })}</div><button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'expeditionSkipBox' })}>건너뛰기</button></div> : null}
            <div className="exp-items" aria-label="가진 아이템"><span className="muted">아이템 {held.length}/{ITEM_HOLD}</span>{held.length ? held.map((id, k) => { const it = itemById(id), combo = picking !== null && picking !== k ? comboOf(held[picking], id) : undefined; return <button type="button" key={k} className={`exp-item${picking === k ? ' picked' : ''}${combo ? ' combo' : ''}`} title={combo ? `${it?.name}과 합쳐 ${combo.name}(${combo.desc})` : it?.desc} disabled={busy} aria-pressed={picking === k} onClick={() => { if (combo) { send({ type: 'expeditionCombine', value: `${picking}:${k}` }); setPick(null); } else setPick(picking === k ? null : k); }}>{it?.name}{combo ? <small> → {combo.name}</small> : null}</button>; }) : <small className="muted">라운드를 이기면 상자에서 셋 중 하나를 고릅니다. {EMBLEM_ROUND}라운드부터는 셋째 칸에 문장(시너지 머릿수 +1), {TIER2_ROUND}라운드부터는 첫째 칸에 조합 아이템이 바로 나옵니다.</small>}{picking !== null && <small className="muted">유닛의 ‘장착’을 누르거나, 합쳐지는 아이템(→)을 누르세요 · <button type="button" className="text-button" onClick={() => setPick(null)}>취소</button></small>}</div>
            {held.length > 1 || r.box?.length ? <details className="exp-combos"><summary>조합표</summary><ul>{ITEMS.filter(x => x.tier).map(x => { const pair = ITEMS.filter(a => !a.tier).flatMap(a => ITEMS.filter(b => !b.tier && b.id >= a.id && comboOf(a.id, b.id)?.id === x.id).map(b => `${a.name} + ${b.name}`)); return <li key={x.id}><b>{x.name}</b> = {pair.join(', ')} <small className="muted">· {x.desc}</small></li>; })}</ul></details> : null}
            <div className="button-row exp-actions">
                <button className={`primary${bossNext ? ' exp-boss-btn' : ''}`} disabled={busy || !r.board.length || !!r.box?.length || !!r.augmentOffer?.length} title={r.augmentOffer?.length ? '증강을 고른 뒤 전투할 수 있습니다.' : r.box?.length ? '상자에서 아이템을 고르거나 건너뛴 뒤 전투할 수 있습니다.' : undefined} onClick={() => send({ type: 'expeditionFight' })}>{bossNext ? `${actOf(r.round)}막 보스 전투` : `${r.round}라운드 전투`}</button>
                <ConfirmButton label="포기" title="원정을 포기할까요?" description={`지금까지 ${r.wins}승 보상(세계석 ${expeditionReward(r.wins, false)})만 받고 이 원정을 마칩니다. 바로 새 원정을 시작할 수 있습니다.`} disabled={busy} onConfirm={() => send({ type: 'expeditionQuit' })}/>
            </div>
            {r.last?.frames && r.last.foe && closedReplay !== `${r.startedAt}:${r.round}` ? <BattleReplay key={`${r.startedAt}:${r.round}`} board={r.history?.[r.round - 1] || r.board} foe={r.last.foe} frames={r.last.frames} turns={r.last.turns} won={r.last.won} opponent={r.last.opponent} truncated={r.last.truncated} onClose={() => setClosedReplay(`${r.startedAt}:${r.round}`)}/> : null}
            {r.last && <div className={`exp-last ${r.last.won ? 'won' : 'lost'}`}><b>{r.round - 1}라운드 {r.last.won ? '승리' : '패배'}</b>{r.last.opponent ? <> · 상대 <b>{r.last.opponent}</b>의 원정대</> : ' · 웨이브'} · {r.last.turns}턴 · 아군 체력 {r.last.hpLeft[0]}% · 적 {r.last.hpLeft[1]}% <button type="button" className="text-button" onClick={() => setShowLog(v => !v)}>{showLog ? '기록 접기' : '기록 보기'}</button>{r.last.frames && r.last.foe && closedReplay === `${r.startedAt}:${r.round}` ? <> · <button type="button" className="text-button" onClick={() => setClosedReplay('')}>재생 보기</button></> : null}{r.ghostPoints ? <small className="muted"> · 고스트 가산 +{r.ghostPoints}</small> : null}{showLog && <ul className="exp-log">{r.last.log.map((l, i) => <li key={i} style={{ animationDelay: `${Math.min(i, 30) * 70}ms` }}>{l}</li>)}</ul>}</div>}
        </section>
        <section className="panel exp-bench-panel" aria-label="벤치">
            <div className="section-title"><h2>벤치</h2><span>{r.bench.length} / {bench}</span></div>
            {r.bench.length ? <ul className="exp-bench">{r.bench.map((x, i) => { const def = unitById(x.unit)!; return <li key={i} className={`cost-${def.cost}`}><div className="exp-bench-unit"><UnitArt def={def} size={30}/><div><b>{def.name} <small>{stars(x.star)}</small></b><small>{tags(def)}</small>{itemBadge('bench', i, x.item)}</div></div><div className="button-row">{equipButton('bench', i)}<button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:front` })}>앞줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:back` })}>뒷줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionSell', value: `bench:${i}` })}>판매 {sellPrice(def.cost, x.star)}</button></div></li>; })}</ul> : <p className="muted">상점에서 산 유닛이 여기 옵니다.</p>}
        </section>
        </div>
        <section className="panel exp-shop-panel" aria-label="상점">
            <div className="section-title"><h2>상점</h2><span><button className="secondary small" disabled={busy || r.gold < (mods.rerollCost ?? EXPEDITION.reroll)} onClick={() => send({ type: 'expeditionReroll' })}>새로 고침 {mods.rerollCost ?? EXPEDITION.reroll} G</button> <button className="secondary small" disabled={busy || r.gold < EXPEDITION.xp || r.level >= 8} onClick={() => send({ type: 'expeditionXp' })}>경험치 {EXPEDITION.xp} G</button></span></div>
            <div className="exp-shop">{r.shop.map((id, i) => { if (!id) return <div key={i} className="exp-card sold">판매됨</div>; const def = unitById(id)!, sk = enemySkillById(def.skill); const own = ownedCount(id), plus = onBoard.has(id) ? [] : traitKeys({ unit: id, star: 1, row: 'front' }, def).filter(k => boardKeys.has(k)).map(k => (ORIGIN_NAMES as Record<string, string>)[k] || (ROLE_NAMES as Record<string, string>)[k] || (SPECIAL_NAMES as Record<string, string>)[k]); return <button type="button" key={i} className={`exp-card cost-${def.cost}${plus.length ? ' synergy' : ''}`} disabled={busy || r.gold < def.cost || r.bench.length >= bench} title={sk ? `${sk.name}: ${sk.desc}` : undefined} onClick={() => send({ type: 'expeditionBuy', value: String(i) })}><UnitArt def={def} size={34}/><b>{def.name}</b><small>{tags(def)}</small>{plus.length ? <span className="exp-plus">시너지 +{plus.map(n => n.split(' ')[0]).join(' · ')}</span> : null}{own ? <span className="exp-own">{own >= 9 ? '★3 보유' : `합치기 ${own % 3 || 3}/3${own >= 3 ? ' → ★3' : ''}`}</span> : null}<em>{def.cost} G</em></button>; })}</div>
            <p className="footnote">같은 유닛 3개면 ★이 오릅니다(★2 → ★3도 3개, 아이템은 첫 유닛 것을 물려받고 나머지는 되돌아옴). 판매는 산 값 그대로 돌려받고 아이템도 돌아옵니다. {EXPEDITION.synergySlotRound}라운드부터 마지막 칸은 보드 시너지를 늘리는 유닛이 나옵니다. 기술은 마나 100에 발동하고(기본 공격 +10 · 피격 +5), 카드를 길게 누르면 기술 설명이 보입니다.</p>
        </section>
    </>;
}
