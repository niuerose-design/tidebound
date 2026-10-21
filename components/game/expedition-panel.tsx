'use client';
/** 원정대(오토배틀러) 화면: 8라운드 PvE · 고스트, 횟수 제한 없음(5단계). 상점 5장 → 벤치 → 보드(앞줄 · 뒷줄 4칸) → 전투. 드래그 없이 버튼만으로 390px에서도 쓰이게. */
import { useState } from 'react';
import { Coins, Heart, Swords, Flag, Sparkles } from 'lucide-react';
import { EXPEDITION, ORIGIN_NAMES, ROLE_NAMES, SPECIAL_NAMES, unitById, sellPrice, itemById, ITEM_HOLD, type UnitDef, comboOf, ITEMS, describeTier, EMBLEM_ROUND, TIER2_ROUND, SEASON_REWARDS, isBossRound, actOf, augmentById, augmentName, augmentDesc, weeklyRule, weeklyRuleById, masteryXpFor, MASTERY_MAX, MASTERY_PERKS, questById, CODEX_TIERS, codexTier, ABYSS, isAbyssRound, FEATS, DIFFICULTIES, difficultyOf, difficultyUnlocked, bossUnits, lockedBossUnits, CORE_SHARD, shardChance, CODEX_LINK_KILLS, BOSS_UNLOCK_KILLS, activeSet, nextSet, setById, setUnits, SET_MASTERY, setMasteryXpFor, quarterKey, RENOWN, renownRewardMult, leagueTierName } from '@/game/data/expedition';
import { BOSS_CORES } from '@/game/data/boss-core';
import { weekKey, dayKey } from '@/game/data/time';
import { activeTraits, traitKeys, ACT_BOSSES, abyssBoss } from '@/game/systems/expedition';
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
    // 16단계: 출발 난이도(기기에 기억). 열리지 않은 단계는 잠김.
    const unlocked = difficultyUnlocked(s.expeditionDiffClears);
    const [diff, setDiffState] = useState(() => { try { const v = Number(localStorage.getItem('exp-difficulty')); return v >= 1 && v <= DIFFICULTIES.length ? v : 1; } catch { return 1; } });
    const chosenDiff = Math.min(diff, unlocked), setDiff = (n: number) => { setDiffState(n); try { localStorage.setItem('exp-difficulty', String(n)); } catch { /* 저장 불가 */ } };
    const diffPicker = <div className="exp-diff" aria-label="난이도">
        <div className="section-title"><h2>난이도</h2><span>아래 단계를 완주하면 다음 단계가 열립니다</span></div>
        <div className="exp-diff-list">{DIFFICULTIES.map(d => { const locked = d.level > unlocked, best = s.expeditionDiffBest?.[d.level], clears = s.expeditionDiffClears?.[d.level] || 0; return <button type="button" key={d.level} className={`exp-diff-card${chosenDiff === d.level ? ' on' : ''}${locked ? ' locked' : ''}`} disabled={busy || locked} aria-pressed={chosenDiff === d.level} onClick={() => setDiff(d.level)}><b>{d.icon} {d.name}</b><small>{d.desc}</small><small className="exp-diff-reward">보상 ×{d.reward}{d.score ? ` · 시즌 점수 +${d.score}` : ''}</small><small className="muted">{locked ? `🔒 ${DIFFICULTIES[d.level - 2].name} 완주 필요` : clears ? `완주 ${clears}회 · 최고 ${best?.wins || 0}승${best?.abyss ? ` · 심연 ${best.abyss}` : ''}` : best ? `최고 ${best.wins}승` : '기록 없음'}</small></button>; })}</div>
    </div>;
    // 6단계 아이템: 가진 아이템을 누르면(고른 상태) 유닛마다 ‘장착’ 버튼이 나타나고, 낀 아이템 배지를 누르면 해제합니다.
    const [pick, setPick] = useState<number | null>(null);
    // 8단계: 시너지 칩을 누르면 단계별 효과가 펼쳐집니다.
    const [openTrait, setOpenTrait] = useState<string | null>(null);
    // 11단계: 이번 주 규칙(출발 화면용, useNow는 처음엔 0이라 하이드레이션 뒤에 채워짐) · 숙련.
    const now = useNow(60_000), thisWeek = now ? weeklyRule(weekKey(now)).id : null;
    // 20단계 분기 세트: 지금 세트 · 다음 세트 · 유닛 풀 · 세트 숙련(세트가 다르면 처음부터).
    const curSet = now ? activeSet(now) : setById(undefined), upcoming = now ? nextSet(now) : undefined, pool = setUnits(curSet.id);
    const sm = s.expeditionSetMastery && s.expeditionSetMastery.set === curSet.id ? s.expeditionSetMastery : { set: curSet.id, level: 1, xp: 0, claimed: [] as number[] };
    const mastery = s.expeditionMastery || { level: 1, xp: 0, total: 0 }, nextPerk = MASTERY_PERKS.find(p => p.level > mastery.level);
    const renown = s.expeditionRenown || 0, canRenown = mastery.level >= MASTERY_MAX && (!s.expedition || !!s.expedition.done);
    const masteryBox = <div className="exp-mastery" aria-label="원정 숙련">
        <div className="exp-mastery-head"><b>원정 숙련 {mastery.level}{mastery.level >= MASTERY_MAX ? ' (최대)' : ''}{renown ? <small className="exp-renown"> ✨ 명성 {renown}</small> : null}</b><small>{mastery.level < MASTERY_MAX ? `${mastery.xp} / ${masteryXpFor(mastery.level, renown)}` : '완성'}</small></div>
        <div className="exp-mastery-bar"><i style={{ width: `${mastery.level >= MASTERY_MAX ? 100 : Math.min(100, Math.round(100 * mastery.xp / masteryXpFor(mastery.level, renown)))}%` }}/></div>
        {canRenown ? <div className="exp-renown-box"><p>숙련이 최대입니다. <b>원정 명성</b>을 올리면 숙련이 1로 돌아가고(특전은 그대로) 다음 주기의 경험치 요구가 +{Math.round(RENOWN.xpGrowth * 100)}%, 세계석 보상이 +{Math.round(RENOWN.rewardPer * 100)}%(명성 {RENOWN.rewardCap}까지) 늘어납니다. 명성 {RENOWN.titles.join(' · ')}에 칭호.</p><ConfirmButton label={`✨ 원정 명성 ${renown + 1}로`} title="원정 명성을 올릴까요?" description={`숙련 ${MASTERY_MAX} → 1로 돌아갑니다. 특전 · 도감 · 기록은 그대로이고, 세계석 보상 ×${renownRewardMult(renown + 1).toFixed(2)}가 됩니다.`} disabled={busy} onConfirm={() => send({ type: 'expeditionRenown' })}/></div> : renown ? <small className="muted">명성 {renown} · 세계석 보상 ×{renownRewardMult(renown).toFixed(2)} · 경험치 요구 ×{(1 + RENOWN.xpGrowth * renown).toFixed(1)}</small> : null}
        <small className="muted">판이 끝나면 승리 × 10 · 막 보스 × 20 · 완주 50 경험치. {nextPerk ? `다음 특전 Lv.${nextPerk.level} ${nextPerk.name}: ${nextPerk.desc}` : '모든 특전을 얻었습니다.'}</small>
        <details><summary>특전 목록</summary><ul>{MASTERY_PERKS.map(p => <li key={p.id} className={p.level <= mastery.level ? 'on' : ''}>Lv.{p.level} <b>{p.name}</b> · {p.desc}</li>)}</ul></details>
    </div>;
    const weekRule = thisWeek ? weeklyRuleById(thisWeek) : undefined;
    // 13단계: 과제(일일 · 주간) · 도감.
    const q = s.expeditionQuests, stale = !!(q && now && (q.day !== dayKey(now) || q.week !== weekKey(now)));
    const questList = (list: { id: string; n: number; done?: boolean }[]) => <ul className="exp-quests">{list.map(st => { const def = questById(st.id); if (!def) return null; return <li key={st.id} className={st.done ? 'done' : ''}><div className="exp-quest-head"><b>{def.name}</b><small>{st.done ? '완료' : `${st.n} / ${def.target}`} · 세계석 {def.pearls} · 숙련 {def.xp}</small></div><small className="muted">{def.desc}</small><span className="exp-quest-bar"><i style={{ width: `${Math.min(100, Math.round(100 * st.n / def.target))}%` }}/></span></li>; })}</ul>;
    const questBox = <div className="exp-quest-box" aria-label="원정 과제">
        <div className="section-title"><h2>과제</h2><span>{stale ? '새 과제는 다음 행동 때 바뀝니다' : '한국 시간 자정 · 월요일에 새로'}</span></div>
        {q ? <div className="exp-quest-cols"><div><h3>오늘</h3>{questList(q.daily)}</div><div><h3>이번 주</h3>{questList(q.weekly)}</div></div> : <p className="muted">원정을 출발하면 오늘 · 이번 주 과제가 생깁니다. 완료하면 바로 세계석과 숙련 경험치를 받습니다.</p>}
    </div>;
    const questDone = q ? [...q.daily, ...q.weekly].filter(x => x.done).length : 0, questAll = q ? q.daily.length + q.weekly.length : 0;
    const questDetails = <details className="exp-quest-fold" open={!!q && questDone < questAll}><summary>과제 · {q ? `${questDone}/${questAll} 완료` : '출발하면 생깁니다'}</summary>{questBox}</details>;
    const unitWins = s.expeditionStats?.unitWins || {}, unitUse = s.expeditionStats?.units || {};
    // 15단계: 최근 판 요약(몇 라운드까지 갔는지) · 도전 기록.
    const recent = s.expeditionRecent || [];
    const fmtAt = (t: number) => { const d = new Date(t + 9 * 3600_000); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
    const recentBox = recent.length ? <details className="exp-recent" aria-label="최근 판"><summary>최근 판 · {recent[0].cleared ? `완주${recent[0].abyss ? ` · 심연 ${recent[0].abyss}` : ''}` : `${Math.min(recent[0].round, EXPEDITION.rounds)}라운드까지`} · {recent[0].wins}승{s.expeditionAbyssBest ? ` · 심연 최고 ${s.expeditionAbyssBest}` : ''} · 최고 {s.expeditionBest || 0}승</summary>
        <ul>{recent.slice(0, 5).map((x, i) => <li key={i} className={x.cleared ? 'cleared' : ''}><span className="when">{fmtAt(x.at)}</span><b>{x.difficulty && x.difficulty > 1 ? `${difficultyOf(x.difficulty).icon} ` : ''}{x.cleared ? `완주${x.abyss ? ` · 심연 ${x.abyss}` : ''}` : `${Math.min(x.round, EXPEDITION.rounds)}라운드까지`}</b><span>{x.wins}승 · 세계석 +{x.reward}</span><small className="muted">{x.why}</small></li>)}</ul></details> : null;
    const feats = s.expeditionFeats || {};
    const featBox = <details className="exp-feats"><summary>도전 기록 · {FEATS.filter(f => feats[f.id]).length}/{FEATS.length}</summary><ul>{FEATS.map(f => <li key={f.id} className={feats[f.id] ? 'on' : ''}><b>{f.name}</b> · {f.desc}{feats[f.id] ? <small> · {feats[f.id]}회 · 칭호 {f.title}</small> : <small className="muted"> · 칭호 {f.title}</small>}</li>)}</ul></details>;
    // 19단계 본편 연결: 잠긴 보스 유닛 · 코어 조각 · 도감 연결.
    const locked = lockedBossUnits(s.book), shards = s.expeditionShards || {};
    const linkBox = <details className="exp-link"><summary>본편 연결 · 보스 유닛 {bossUnits(pool).length - locked.size}/{bossUnits(pool).length} 해금 · 코어 조각 {Object.values(shards).reduce((a, n) => a + n, 0)}</summary>
        <ul>
            <li><b>보스 유닛 해금</b> · 본편에서 그 보스를 {BOSS_UNLOCK_KILLS}번 이상 잡아야 상점에 나옵니다(웨이브 · 고스트에는 그대로 나옴). {bossUnits(pool).map(u => <span key={u.id} className={`exp-link-chip${locked.has(u.id) ? ' locked' : ''}`} title={locked.has(u.id) ? `본편 ${u.name} 처치 ${s.book[u.monster] || 0}/${BOSS_UNLOCK_KILLS}` : `본편 처치 ${s.book[u.monster] || 0}`}>{locked.has(u.id) ? '🔒 ' : '✓ '}{u.name}</span>)}</li>
            <li><b>보스 코어 조각</b> · 막 보스 · 심연 보스를 이기면 {Math.round(shardChance(chosenDiff, false) * 100)}%(심연 +{Math.round(CORE_SHARD.abyssBonus * 100)}%p, 난이도마다 +{Math.round(CORE_SHARD.perDifficulty * 100)}%p)로 조각. {CORE_SHARD.per}개면 본편 보스 코어(없으면 획득 · 있으면 각성). 머쉬맘 → {BOSS_CORES.grotto.name}, 자쿰 → {BOSS_CORES.ventCathedral.name}, 칠흑 보스 → 던전 코어 7종 중 무작위. {Object.keys(shards).length ? Object.entries(shards).filter(([, n]) => n > 0).map(([id, n]) => <span key={id} className="exp-link-chip">{BOSS_CORES[id]?.name || id} {n}/{CORE_SHARD.per}</span>) : <small className="muted">아직 조각 없음</small>}</li>
            <li><b>도감 연결</b> · 유닛 도감이 동 · 은 · 금에 닿으면 그 유닛의 본편 몬스터 처치 수 +{CODEX_LINK_KILLS.join(' · +')}(연구 단계가 빨라집니다). 지금까지 {Object.keys(s.expeditionCodexLinked || {}).length}종 연결.</li>
        </ul>
    </details>;
    const codexBox = <details className="exp-codex"><summary>유닛 도감 · {curSet.icon} {curSet.name} {pool.filter(u => unitWins[u.id] > 0).length}/{pool.length} 승리 · 금 {Object.values(unitWins).filter(n => codexTier(n) >= 3).length}</summary>
        <p className="footnote">보드에 두고 이긴 라운드 수로 숙달이 오릅니다: {CODEX_TIERS.map(t => `${t.name} ${t.wins}승`).join(' · ')}. 30종 모두 이기면 칭호 📘, 금 5종이면 🏅. 동 · 은 · 금마다 본편 도감 처치 +{CODEX_LINK_KILLS.join(' · +')}.{setById(curSet.id).remove?.length ? ` 이번 세트에서 쉬는 유닛: ${setById(curSet.id).remove!.map(id => unitById(id)?.name).join(' · ')}(기록은 남고 다음 세트에 돌아올 수 있음).` : ''}</p>
        <div className="exp-codex-grid">{[...pool].sort((a, b) => a.cost - b.cost).map(def => { const w = unitWins[def.id] || 0, tier = codexTier(w); return <div key={def.id} className={`exp-codex-unit cost-${def.cost} tier-${tier}${w ? '' : ' unseen'}`} title={`${def.name} · ${tags(def)} · 배치 ${unitUse[def.id] || 0} · 승리 ${w}`}><UnitArt def={def} size={26}/><b>{def.name}</b><small>{w ? `${w}승${tier ? ` · ${CODEX_TIERS[tier - 1].name}` : ''}` : unitUse[def.id] ? '아직 승리 없음' : '미등록'}</small></div>; })}</div>
    </details>;
    // 20단계 분기 세트: 지금 세트(출발 화면) · 다음 세트 예고 · 세트 숙련.
    const setBanner = <div className="exp-set" aria-label="분기 세트"><div className="exp-set-head"><b>{curSet.icon} {curSet.name} 세트</b><small>{now ? quarterKey(now) : ''}{upcoming ? ` · 다음: ${upcoming.icon} ${upcoming.name}(${upcoming.from})` : ''}</small></div><small className="muted">{curSet.desc}</small>
        <div className="exp-mastery-head" style={{ marginTop: 8 }}><b style={{ fontSize: 13 }}>세트 숙련 {sm.level}{sm.level >= SET_MASTERY.max ? ' (완성)' : ''}</b><small>{sm.level < SET_MASTERY.max ? `${sm.xp} / ${setMasteryXpFor(sm.level)}` : '세트 칭호 획득'}</small></div>
        <div className="exp-mastery-bar"><i className="set" style={{ width: `${sm.level >= SET_MASTERY.max ? 100 : Math.min(100, Math.round(100 * sm.xp / setMasteryXpFor(sm.level)))}%` }}/></div>
        <p className="exp-league-line">주간 리그 · <b>{leagueTierName(s.expeditionLeague?.tier)}</b>{s.expeditionLeague?.last ? ` · 지난주 ${s.expeditionLeague.last.rank}위/${s.expeditionLeague.last.size}명 · 세계석 +${s.expeditionLeague.last.pearls}` : ' · 이번 주 첫 전투 때 같은 등급 8명 조에 들어갑니다'} <small className="muted">(순위 화면 ‘원정 · 주간 리그’ · 1~2위 승급 · 7~8위 강등)</small></p>
        <small className="muted">세트마다 처음부터. 숙련 경험치와 같이 오르고 {Object.entries(SET_MASTERY.rewards).map(([lv, p]) => `${lv}에 세계석 ${p}`).join(' · ')}, 20이면 칭호 {curSet.icon} {curSet.name}의 원정대.</small></div>;
    const weekBanner = weekRule ? <p className="exp-rule">이번 주 규칙 · <b>{weekRule.name}</b> · {weekRule.desc} <small className="muted">(매주 월요일 바뀜 · 판을 시작할 때 규칙이 붙어 끝까지 유지)</small></p> : null;

    // 18단계(모바일 정리): 소개는 한 줄로 줄이고 긴 설명은 접어 둡니다.
    const introShort = `${EXPEDITION.rounds}라운드 · 3막 오토배틀러. 유닛을 사서 보드에 놓고, 시너지를 켜고, 막 보스를 넘으세요.`;
    const intro = <Heading eyebrow="EXPEDITION" title="원정대" description={introShort}><details className="exp-intro-more"><summary>규칙 자세히</summary><p>{`${EXPEDITION.rounds}라운드 · 3막 오토배틀러. 라운드마다 받는 골드로 상점에서 유닛을 사 보드에 배치하고 웨이브 · 다른 모험가의 원정대(2라운드부터)와 싸웁니다. 막 끝(4 · 8 · 12라운드)에는 보스가 나옵니다. 같은 유닛 3개는 ★이 오르고, 지역 · 역할이 겹치면 시너지가 켜집니다. 승리마다 세계석 ${EXPEDITION.pearlsPerWin}, 막 보스 +${EXPEDITION.actPearls}, 완주 +${EXPEDITION.clearPearls}. 2 · 5 · 8라운드에는 판 전체에 걸리는 증강을 고르고, 주마다 규칙이 바뀝니다. 횟수 제한은 없습니다.`}</p></details></Heading>;
    // 9단계: 지난 시즌 정산 내역과 시즌 보상표.
    const season = s.expeditionSeasonLast ? <p className="exp-season">지난 시즌 {s.expeditionSeasonLast.season} · {s.expeditionSeasonLast.rank ? `${s.expeditionSeasonLast.rank}위` : '순위 밖'} / {s.expeditionSeasonLast.total}명 · 최고 {s.expeditionSeasonLast.wins}승 · 세계석 +{s.expeditionSeasonLast.pearls} 받음</p> : null;
    const rewardTable = <p className="footnote">월간 순위 보상(한국 시간 매월 1일 이후 첫 출발 때 지급): {SEASON_REWARDS.map(x => `${x.label} ${x.pearls}`).join(' · ')}.</p>;
    if (!r || (r.done && !r.reward && r.reward !== 0)) return <>{intro}<section className="panel exp-start">
        {season}{weekBanner}
        {setBanner}{diffPicker}
        <button className="primary" disabled={busy} onClick={() => send({ type: 'expeditionStart', id: String(chosenDiff) })}>{difficultyOf(chosenDiff).icon} {difficultyOf(chosenDiff).name} 난이도로 원정 출발{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</button>
        {recentBox}{masteryBox}{questDetails}{linkBox}{featBox}{codexBox}
        <p className="footnote">유닛 {pool.length}종({curSet.name} 세트) · 지역 6 · 역할 6. 보드는 앞줄 4 · 뒷줄 4칸이고 배치 수는 판 레벨(경험치 {EXPEDITION.xp} G)로 늘어납니다. 수호 · 돌격은 앞줄, 마력 · 망령은 뒷줄이 유리합니다.</p>
        {rewardTable}
    </section></>;
    if (r.done) return <>{intro}<section className="panel exp-start">
        <h2>원정 종료{r.difficulty && r.difficulty > 1 ? ` · ${difficultyOf(r.difficulty).icon} ${difficultyOf(r.difficulty).name}` : ''} · {r.wins}승{r.cleared ? ' · 완주' : ` · ${Math.min(r.round, EXPEDITION.rounds)}라운드까지`}{r.abyss ? ` · 심연 ${r.abyss}라운드` : ''}</h2><p>세계석 +{format(r.reward || 0)}{r.cleared ? ` · 완주 +${EXPEDITION.clearPearls}` : ''}{r.acts ? ` · 막 보스 ${r.acts} × ${EXPEDITION.actPearls}` : ''}{r.abyss && Math.floor(r.abyss / ABYSS.bonusEvery) ? ` · 심연 보너스 +${Math.floor(r.abyss / ABYSS.bonusEvery) * ABYSS.bonus}` : ''}{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</p>
        <div className="button-row"><button className="primary" disabled={busy} onClick={() => send({ type: 'expeditionStart', id: String(chosenDiff) })}>바로 다시 출발 · {difficultyOf(chosenDiff).icon} {difficultyOf(chosenDiff).name}</button><button className="secondary" disabled={busy} onClick={() => send({ type: 'expeditionClear' })}>닫기</button></div>
        {setBanner}{diffPicker}{recentBox}{masteryBox}{questDetails}{linkBox}{featBox}{codexBox}{season}{weekBanner}{rewardTable}
    </section></>;
    const mods = runMods(r), runRule = weeklyRuleById(r.rule), bench = benchCap(r);
    const traits = activeTraits(r.board, mods), slots = EXPEDITION.boardSlots[Math.min(EXPEDITION.boardSlots.length - 1, r.level)];
    const held = r.items || [], picking = pick !== null && pick < held.length ? pick : null;
    // 8단계 직관성: 보드에 이미 센 특성 키(상점 카드의 ‘시너지 +’ 표시), 보유 장수(합치기 n/3), 다음 할 일.
    const boardKeys = new Set(traits.map(t => t.trait.id as string)), onBoard = new Set(r.board.map(x => x.unit));
    const ownedCount = (id: string) => [...r.board, ...r.bench].filter(x => x.unit === id).reduce((n, x) => n + (x.star === 3 ? 9 : x.star === 2 ? 3 : 1), 0);
    const freeSlots = Math.max(0, slots - r.board.length);
    const inAbyss = isAbyssRound(r.round), depth = inAbyss ? r.round - EXPEDITION.rounds : 0;
    const bossNext = isBossRound(r.round) ? unitById(inAbyss ? abyssBoss(r.round) : ACT_BOSSES[actOf(r.round)]) : undefined;
    const todo = r.abyssChoice ? '12라운드 완주! 심연으로 계속 갈지, 보상을 받고 마칠지 고르세요.' : r.augmentOffer?.length ? '증강을 하나 고르세요(판 전체에 걸리는 효과).' : r.box?.length ? '상자에서 아이템을 고르거나 건너뛰세요.' : freeSlots && r.bench.length ? `보드에 빈 칸 ${freeSlots} · 벤치 유닛을 앞줄 · 뒷줄에 놓으세요.` : !r.board.length ? '상점에서 유닛을 사서 보드에 놓으세요.' : picking !== null ? '장착할 유닛의 ‘장착’을 누르거나 합쳐지는 아이템(→)을 누르세요.' : held.length && r.board.some(x => !x.item) ? `아이템 ${held.length}개가 놀고 있어요. 장착하면 더 강해집니다.` : r.gold >= EXPEDITION.xp && r.level < 8 && r.bench.length ? '골드가 남으면 경험치를 사서 배치 칸을 늘릴 수 있습니다.' : bossNext ? (inAbyss ? `심연 보스 ${bossNext.name}이(가) 기다립니다.` : `${actOf(r.round)}막 보스 ${bossNext.name}이(가) 기다립니다. 이기면 세계석 +${EXPEDITION.actPearls}.`) : '전투 준비 완료.';
    const equipButton = (where: 'board' | 'bench', i: number) => picking === null ? null : <button type="button" className="primary small exp-equip" disabled={busy} onClick={e => { e.stopPropagation(); send({ type: 'expeditionEquip', value: `${where}:${i}:${picking}` }); setPick(null); }}>장착</button>;
    const itemBadge = (where: 'board' | 'bench', i: number, item?: string) => item ? <button type="button" className={`exp-item-badge${itemById(item)?.tier === 'emblem' ? ' emblem' : itemById(item)?.tier === 2 ? ' tier2' : ''}`} title={`${itemById(item)?.name}: ${itemById(item)?.desc} · 누르면 해제`} disabled={busy} onClick={e => { e.stopPropagation(); send({ type: 'expeditionUnequip', value: `${where}:${i}` }); }}>{itemById(item)?.tier === 'emblem' ? `+${itemById(item)!.name.replace('의 문장', '')}` : itemById(item)?.name}</button> : null;
    const cell = (row: 'front' | 'back', col: number) => { const list = r.board.map((x, i) => [x, i] as const).filter(([x]) => x.row === row); const hit = list[col]; if (!hit) return <div className="exp-cell empty" key={`${row}${col}`}/>; const [x, i] = hit, def = unitById(x.unit)!; return <div className={`exp-cell cost-${def.cost} star-${x.star}${x.item ? ' has-item' : ''}`} key={`${row}${col}`}><button type="button" className="exp-cell-main" title={`${def.name} · ${tags(def)}${x.item && itemById(x.item)?.emblem ? ` (+${itemById(x.item)!.name})` : ''} · 누르면 벤치로`} disabled={busy || picking !== null} onClick={() => send({ type: 'expeditionPlace', value: `board:${i}` })}><UnitArt def={def} size={26}/><b>{def.name}</b><small>{stars(x.star)}</small></button>{itemBadge('board', i, x.item)}{equipButton('board', i)}</div>; };
    return <>{intro}
        <section className="panel port-resource-bar exp-bar" aria-label="원정 상태">
            <div><Flag size={22}/><span>{r.difficulty && r.difficulty > 1 ? `${difficultyOf(r.difficulty).icon} ` : ''}{inAbyss ? '심연 · 라운드' : `${actOf(r.round)}막 · 라운드`}<strong>{r.round} <small>{inAbyss ? `· 심연 ${depth} / ${ABYSS.max}` : `/ ${EXPEDITION.rounds}`}</small></strong></span></div>
            <div><Heart size={22}/><span>원정 체력<strong>{r.hp}<i className="exp-hpbar" aria-hidden><b style={{ width: `${Math.max(0, Math.min(100, r.hp))}%` }}/></i></strong></span></div>
            <div><Coins size={22}/><span>판 골드<strong>{r.gold}</strong></span></div>
            <div><Sparkles size={22}/><span>판 레벨<strong>{r.level} <small>· 배치 {r.board.length}/{slots}</small></strong><small className="exp-xp">경험치 {r.xp}/{EXPEDITION.xpToLevel[r.level] || '-'}</small></span></div>
            <div><Swords size={22}/><span>전적<strong>{r.wins}승 <small>· 연승 {r.streak}</small></strong></span></div>
        </section>
        <ol className={`exp-progress${inAbyss ? ' abyss' : ''}`} aria-label="라운드 진행">{Array.from({ length: EXPEDITION.rounds }, (_, i) => i + 1).map(n => { const boss = isBossRound(n), won = r.history?.[n] && n < r.round ? (n === r.round - 1 ? r.last?.won : undefined) : undefined; return <li key={n} className={`${n < r.round ? 'past' : n === r.round ? 'now' : ''}${boss ? ' boss' : ''}`} title={boss ? `${actOf(n)}막 보스 ${unitById(ACT_BOSSES[actOf(n)])?.name}` : `${n}라운드`}>{boss ? <UnitArt def={unitById(ACT_BOSSES[actOf(n)])!} size={18}/> : n}{won === false ? <i/> : null}</li>; })}</ol>
        <p className={`exp-todo${r.box?.length || r.augmentOffer?.length ? ' urgent' : bossNext ? ' boss' : ''}`} role="status">다음 할 일 · {todo}</p>
        {runRule ? <p className="exp-rule small">{setById(r.set).icon} {setById(r.set).name} 세트 · 이번 판 규칙 · <b>{runRule.name}</b> · {runRule.desc}</p> : null}
        <div className="exp-columns">
        <section className="panel exp-board-panel" aria-label="보드">
            <div className="section-title"><h2>보드</h2><span>앞줄 · 뒷줄 4칸, 누르면 벤치로</span></div>
            <div className="exp-board"><div className="exp-row-label">뒷줄</div>{[0, 1, 2, 3].map(c => cell('back', c))}<div className="exp-row-label">앞줄</div>{[0, 1, 2, 3].map(c => cell('front', c))}</div>
            <div className="exp-traits">{traits.length ? traits.map(t => { const next = t.trait.tiers[t.tier], max = t.tier === t.trait.tiers.length; return <button type="button" key={t.trait.id} className={`${t.tier ? 'on' : ''}${max ? ' max' : ''}${openTrait === t.trait.id ? ' open' : ''}`} aria-expanded={openTrait === t.trait.id} title="누르면 단계별 효과" onClick={() => setOpenTrait(openTrait === t.trait.id ? null : t.trait.id)}>{t.trait.name} <b>{t.count}</b>{max ? ' ✓' : <small>/{next.count}</small>}</button>; }) : <small className="muted">유닛을 배치하면 시너지가 보입니다. 같은 지역 · 역할이 2명부터 켜집니다.</small>}</div>
            {openTrait && traits.some(t => t.trait.id === openTrait) && (() => { const t = traits.find(x => x.trait.id === openTrait)!; return <ul className="exp-trait-tiers">{t.trait.tiers.map((tier, i) => <li key={i} className={t.tier > i ? 'on' : ''}>{t.trait.name} {tier.count}: {describeTier(tier)}{t.tier === i ? <small> · {tier.count - t.count}명 더</small> : null}</li>)}</ul>; })()}
            {r.abyssChoice ? <div className="exp-abyss-choice" aria-label="완주 선택"><h3>🏁 12라운드 완주!</h3><p>여기서 마치면 완주 보상을 받습니다. 심연으로 계속 가면 라운드마다 웨이브가 세지고(예산 ×{ABYSS.budgetGrowth}), 4라운드마다 보스(★2 → ★3), 고스트는 없습니다. 최대 {ABYSS.max}라운드. 심연 승리도 승리로 세고 {ABYSS.bonusEvery}라운드마다 세계석 +{ABYSS.bonus}. 지면 그 자리에서 끝나지만 완주 보상은 그대로입니다.</p><div className="button-row"><button className="primary exp-abyss-btn" disabled={busy} onClick={() => send({ type: 'expeditionAbyss' })}>심연으로 계속</button><button className="secondary" disabled={busy} onClick={() => send({ type: 'expeditionFinish' })}>보상 받고 마치기</button></div></div> : null}
            {inAbyss && !r.abyssChoice ? <p className="exp-rule small abyss">심연 {depth} / {ABYSS.max} · 웨이브 예산 ×{ABYSS.budgetGrowth}<sup>{depth}</sup> · {ABYSS.bonusEvery}라운드마다 세계석 +{ABYSS.bonus}{s.expeditionAbyssBest ? ` · 내 최고 ${s.expeditionAbyssBest}` : ''}</p> : null}
            {r.augmentOffer?.length ? <div className="exp-aug-offer" aria-label="증강 선택지"><div className="section-title"><h2>증강</h2><span>{r.round}라운드 · 하나를 고르세요</span></div><div className="exp-aug-choices">{r.augmentOffer.map((id, k) => { const def = augmentById(id)!; return <button type="button" key={k} className={`exp-aug-choice tier-${def.tier} kind-${def.kind}`} disabled={busy} onClick={() => send({ type: 'expeditionPickAugment', value: String(k) })}><small>{def.kind === 'economy' ? '경제' : def.kind === 'synergy' ? '시너지' : '전투'} · {def.tier}등급</small><b>{augmentName(id)}</b><span>{augmentDesc(id)}</span></button>; })}</div></div> : null}
            {r.augments?.length ? <div className="exp-augments" aria-label="고른 증강"><span className="muted">증강</span>{r.augments.map((id, k) => { const def = augmentById(id)!; return <span key={k} className={`exp-aug tier-${def.tier}`} title={augmentDesc(id)}>{augmentName(id)}</span>; })}</div> : null}
            {r.box?.length ? <div className="exp-box" aria-label="상자 선택지"><div className="section-title"><h2>상자</h2><span>셋 중 하나를 고르세요</span></div><div className="exp-box-choices">{r.box.map((id, k) => { const it = itemById(id); return <button type="button" key={k} className={`exp-box-choice${it?.tier === 'emblem' ? ' emblem' : ''}`} disabled={busy} onClick={() => send({ type: 'expeditionPickBox', value: String(k) })}><b>{it?.name}</b><small>{it?.desc}</small></button>; })}</div><button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'expeditionSkipBox' })}>건너뛰기</button></div> : null}
            <div className="exp-items" aria-label="가진 아이템"><span className="muted">아이템 {held.length}/{ITEM_HOLD}</span>{held.length ? held.map((id, k) => { const it = itemById(id), combo = picking !== null && picking !== k ? comboOf(held[picking], id) : undefined; return <button type="button" key={k} className={`exp-item${picking === k ? ' picked' : ''}${combo ? ' combo' : ''}`} title={combo ? `${it?.name}과 합쳐 ${combo.name}(${combo.desc})` : it?.desc} disabled={busy} aria-pressed={picking === k} onClick={() => { if (combo) { send({ type: 'expeditionCombine', value: `${picking}:${k}` }); setPick(null); } else setPick(picking === k ? null : k); }}>{it?.name}{combo ? <small> → {combo.name}</small> : null}</button>; }) : <small className="muted">라운드를 이기면 상자에서 셋 중 하나를 고릅니다. {EMBLEM_ROUND}라운드부터는 셋째 칸에 문장(시너지 머릿수 +1), {TIER2_ROUND}라운드부터는 첫째 칸에 조합 아이템이 바로 나옵니다.</small>}{picking !== null && <small className="muted">유닛의 ‘장착’을 누르거나, 합쳐지는 아이템(→)을 누르세요 · <button type="button" className="text-button" onClick={() => setPick(null)}>취소</button></small>}</div>
            {held.length > 1 || r.box?.length ? <details className="exp-combos"><summary>조합표</summary><ul>{ITEMS.filter(x => x.tier).map(x => { const pair = ITEMS.filter(a => !a.tier).flatMap(a => ITEMS.filter(b => !b.tier && b.id >= a.id && comboOf(a.id, b.id)?.id === x.id).map(b => `${a.name} + ${b.name}`)); return <li key={x.id}><b>{x.name}</b> = {pair.join(', ')} <small className="muted">· {x.desc}</small></li>; })}</ul></details> : null}
            <div className="button-row exp-actions">
                <button className={`primary${bossNext ? ' exp-boss-btn' : ''}`} disabled={busy || !r.board.length || !!r.box?.length || !!r.augmentOffer?.length || !!r.abyssChoice} title={r.abyssChoice ? '심연으로 계속 갈지 먼저 고르세요.' : r.augmentOffer?.length ? '증강을 고른 뒤 전투할 수 있습니다.' : r.box?.length ? '상자에서 아이템을 고르거나 건너뛴 뒤 전투할 수 있습니다.' : undefined} onClick={() => send({ type: 'expeditionFight' })}>{bossNext ? (inAbyss ? '심연 보스 전투' : `${actOf(r.round)}막 보스 전투`) : inAbyss ? `심연 ${depth}라운드 전투` : `${r.round}라운드 전투`}</button>
                <ConfirmButton label={r.cleared ? '마치기' : '포기'} title={r.cleared ? '여기서 마칠까요?' : '원정을 포기할까요?'} description={r.cleared ? `완주 보상과 심연 ${r.abyss || 0}라운드 보상을 받고 이 원정을 마칩니다.` : `지금까지 ${r.wins}승 보상(세계석 ${expeditionReward(r.wins, false)})만 받고 이 원정을 마칩니다. 바로 새 원정을 시작할 수 있습니다.`} disabled={busy} onConfirm={() => send({ type: 'expeditionQuit' })}/>
            </div>
            {r.last?.frames && r.last.foe && closedReplay !== `${r.startedAt}:${r.round}` ? <BattleReplay key={`${r.startedAt}:${r.round}`} board={r.history?.[r.round - 1] || r.board} foe={r.last.foe} frames={r.last.frames} turns={r.last.turns} won={r.last.won} opponent={r.last.opponent} truncated={r.last.truncated} onClose={() => setClosedReplay(`${r.startedAt}:${r.round}`)}/> : null}
            {r.last && <div className={`exp-last ${r.last.won ? 'won' : 'lost'}`}><b>{r.round - 1}라운드 {r.last.won ? '승리' : '패배'}</b>{r.last.opponent ? <> · 상대 <b>{r.last.opponent}</b>의 원정대{r.last.foeAugments?.length ? <small className="muted" title={r.last.foeAugments.map(augmentDesc).join(' / ')}> (증강 {r.last.foeAugments.map(augmentName).join(' · ')})</small> : null}</> : ' · 웨이브'} · {r.last.turns}턴 · 아군 체력 {r.last.hpLeft[0]}% · 적 {r.last.hpLeft[1]}% <button type="button" className="text-button" onClick={() => setShowLog(v => !v)}>{showLog ? '기록 접기' : '기록 보기'}</button>{r.last.frames && r.last.foe && closedReplay === `${r.startedAt}:${r.round}` ? <> · <button type="button" className="text-button" onClick={() => setClosedReplay('')}>재생 보기</button></> : null}{r.ghostPoints ? <small className="muted"> · 고스트 가산 +{r.ghostPoints}</small> : null}{showLog && <ul className="exp-log">{r.last.log.map((l, i) => <li key={i} style={{ animationDelay: `${Math.min(i, 30) * 70}ms` }}>{l}</li>)}</ul>}</div>}
        </section>
        <section className="panel exp-bench-panel" aria-label="벤치">
            <div className="section-title"><h2>벤치</h2><span>{r.bench.length} / {bench}</span></div>
            {r.bench.length ? <ul className="exp-bench">{r.bench.map((x, i) => { const def = unitById(x.unit)!; return <li key={i} className={`cost-${def.cost}`}><div className="exp-bench-unit"><UnitArt def={def} size={30}/><div><b>{def.name} <small>{stars(x.star)}</small></b><small>{tags(def)}</small>{itemBadge('bench', i, x.item)}</div></div><div className="button-row">{equipButton('bench', i)}<button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:front` })}>앞줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionPlace', value: `bench:${i}:back` })}>뒷줄</button><button className="secondary small" disabled={busy} onClick={() => send({ type: 'expeditionSell', value: `bench:${i}` })}>판매 {sellPrice(def.cost, x.star)}</button></div></li>; })}</ul> : <p className="muted">상점에서 산 유닛이 여기 옵니다.</p>}
        </section>
        </div>
        <section className="panel exp-shop-panel" aria-label="상점">
            <div className="section-title"><h2>상점</h2><span><button className="secondary small" disabled={busy || r.gold < (mods.rerollCost ?? EXPEDITION.reroll)} onClick={() => send({ type: 'expeditionReroll' })}>새로 고침 {mods.rerollCost ?? EXPEDITION.reroll} G</button> <button className="secondary small" disabled={busy || r.gold < EXPEDITION.xp || r.level >= 8} onClick={() => send({ type: 'expeditionXp' })}>경험치 {EXPEDITION.xp} G</button></span></div>
            <div className="exp-shop">{r.shop.map((id, i) => { if (!id) return <div key={i} className="exp-card sold">판매됨</div>; const def = unitById(id)!, sk = enemySkillById(def.skill); const own = ownedCount(id), plus = onBoard.has(id) ? [] : traitKeys({ unit: id, star: 1, row: 'front' }, def).filter(k => boardKeys.has(k)).map(k => (ORIGIN_NAMES as Record<string, string>)[k] || (ROLE_NAMES as Record<string, string>)[k] || (SPECIAL_NAMES as Record<string, string>)[k]); return <button type="button" key={i} className={`exp-card cost-${def.cost}${plus.length ? ' synergy' : ''}`} disabled={busy || r.gold < def.cost || r.bench.length >= bench} title={sk ? `${sk.name}: ${sk.desc}` : undefined} onClick={() => send({ type: 'expeditionBuy', value: String(i) })}><UnitArt def={def} size={34}/><b>{def.name}</b><small>{tags(def)}</small>{plus.length ? <span className="exp-plus">시너지 +{plus.map(n => n.split(' ')[0]).join(' · ')}</span> : null}{own ? <span className="exp-own">{own >= 9 ? '★3 보유' : `합치기 ${own % 3 || 3}/3${own >= 3 ? ' → ★3' : ''}`}</span> : null}<em>{def.cost} G</em></button>; })}</div>
            <details className="exp-shop-help"><summary>상점 · 승급 규칙</summary><p className="footnote">같은 유닛 3개면 ★이 오릅니다(★2 → ★3도 3개, 아이템은 첫 유닛 것을 물려받고 나머지는 되돌아옴). 판매는 산 값 그대로 돌려받고 아이템도 돌아옵니다. {EXPEDITION.synergySlotRound}라운드부터 마지막 칸은 보드 시너지를 늘리는 유닛이 나옵니다. 기술은 마나 100에 발동하고(기본 공격 +10 · 피격 +5), 카드를 길게 누르면 기술 설명이 보입니다.</p></details>
        </section>
        <section className="panel" aria-label="과제">{questBox}</section>
    </>;
}
