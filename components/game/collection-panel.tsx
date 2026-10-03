'use client';
import { catchReward } from '@/game/systems/meta';
import { BookOpen, ChevronDown, Fish, Swords } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { SKILLS } from '@/game/data/skills';
import { FISH, STAGES } from '@/game/data/world';
import { BALANCE, RARITIES, SLOTS } from '@/game/data/balance';
import { EQUIPMENT_NAMES } from '@/game/data/equipment';
import { PROGRESSION, STAT_LABELS, statDisplay, percent } from '@/game/data/progression';
import { completedRegions, itemKey } from '@/game/systems/progression';
import { BookResearch, RegionProgress, pendingBookCount } from './book-research';
import { stats, mastery, goldMultiplier, hitChance, dropRate } from '@/game/systems/stats';
import { ENEMY_SKILLS, profile, scaledEnemyStats } from '@/game/data/encounters';
import { bookStage, bookStatBonus, bookTrait, bookEcology, bookRevealed, bonusLabel } from '@/game/systems/book';
import { BOOK_TRAITS, BOOK_ECOLOGY, BOOK_REVEAL, REGION_THEMES } from '@/game/data/book-traits';
import { VARIANTS } from '@/game/data/variants';
import type { State, Stats } from '@/game/types';
import { skillEffectLines } from '@/game/systems/skill-description';

const skillOf = (id: string) => [...ENEMY_SKILLS, ...SKILLS].find(sk => sk.id === id);
/** 몬스터 스킬 상세: 발동률·재사용 대기와 실제 효과(피해식·상태이상·추가타). */
function EnemySkillList({ ids, enemy }: { ids: string[]; enemy: Stats }) {
    return <div className="enemy-skill-list"><h5>사용 스킬 <small>치명 {percent(enemy.crit || 0)} · 치명 피해 ×{BALANCE.critMultiplier}</small></h5><ul>{ids.map(id => {
        const sk = skillOf(id); if (!sk) return null;
        return <li key={id}><strong>{sk.name}</strong><small>발동 {percent(sk.chance)} · 재사용 {sk.cooldown}턴{sk.statusOnly ? ' · 피해 없음' : ''}</small><span>{skillEffectLines(sk).join(' · ')}</span></li>;
    })}</ul></div>;
}
/** 도감 카드의 플레이어 보상 요약: 성향 연구 능력치와 생태 연구 보정. */
function BookTraitLine({ s, id }: { s: State; id: string }) {
    const trait = BOOK_TRAITS[bookTrait(id)], eco = bookEcology(s, id);
    return <div className="fish-trait book-trait-reward">
        <strong>{trait.name} 연구</strong>
        <span>단계마다 {bonusLabel(trait.perStage)}</span>
        <span>{eco.stages ? <b className="positive">생태 연구 적용 중 · 이 어종 상대 주는 피해 +{Math.round(eco.dealt * 100)}% · 받는 공격 피해 -{Math.round(eco.taken * 100)}%</b> : `생태 연구(${BALANCE.bookMilestones[BOOK_ECOLOGY.fromStage - 1].toLocaleString()}회~) · 이 어종 상대 주는 피해 +${BOOK_ECOLOGY.dealtPerStage * 100}% · 받는 공격 피해 -${BOOK_ECOLOGY.takenPerStage * 100}% (단계마다)`}</span>
    </div>;
}
/** v25.21 어종 이름 옆 변종 아이콘 줄. 잡은 변종은 색이 켜지고 횟수가 붙으며, 아직 못 만난 변종은 흐리게 자리만 보여 줍니다. */
function GoldenMark({ s, id }: { s: State; id: string }) {
    const row = s.variantBook?.[id] || {}, golden = s.goldenBook?.[id] || 0;
    const marks = [{ id: 'golden', mark: '✦', name: '황금 개체', n: golden }, ...VARIANTS.map(v => ({ id: v.id, mark: v.mark, name: v.name, n: row[v.id] || 0 }))];
    return <span className="variant-marks" aria-label="변종 포획 기록">{marks.map(m => <i key={m.id} className={`variant-mark variant-${m.id} ${m.n ? 'lit' : ''}`} title={m.n ? `${m.name} ${m.n}회 포획` : `${m.name} · 아직 못 만남`}>{m.mark}{m.n > 1 ? <b>{m.n > 99 ? '99+' : m.n}</b> : null}</i>)}</span>;
}
/** 포획 50회 전에는 적 성향·스킬·능력치를 숨깁니다. */
function LockedInfo({ n }: { n: number }) {
    return <div className="fish-trait book-locked"><strong>미확인 개체</strong><span>{BOOK_REVEAL}회 포획하면 성향·스킬·능력치 정보가 공개됩니다 ({Math.min(n, BOOK_REVEAL)} / {BOOK_REVEAL}).</span></div>;
}
import { Heading, Meter, SlotIcon } from './shared';
import type { PanelProps } from './panel-props';
export function Collection({ s, send, busy }: PanelProps) {
    const player = stats(s), bookComplete = PROGRESSION.fishComplete;
    const complete = FISH.filter(f => (s.book[f.id] || 0) >= bookComplete).length, regions = completedRegions(s), pendingBooks = pendingBookCount(s);
    // v26.8 물건도감: 표시 확률은 전체 장비 드롭 확률(행운·연구·이벤트 포함) 기준. 한 종류 더 등록했을 때의 증가분을 %p로 보여 줍니다.
    const registeredCount = Object.keys(s.itemBook).length, currentDrop = dropRate(s);
    const perEntryDrop = Math.max(0, dropRate({ ...s, itemBook: { ...s.itemBook, ['preview:next']: true } }) - currentDrop);
    const bulkCandidates = Object.keys(SLOTS).flatMap(slot => RARITIES.map((_, i) => s.itemBook[itemKey(slot, i)] ? null : s.inventory.filter(x => x.slot === slot && x.rarity === i && !x.locked && !x.relic).sort((a, b) => a.power - b.power || (a.enhance || 0) - (b.enhance || 0))[0] || null)).filter((x): x is NonNullable<typeof x> => !!x);

    return <>
    <Heading eyebrow="ARCHIVE & RESEARCH" title="기록이 힘이 되는 도감" description="개체도감으로 편성의 폭을 넓히고, 물건도감으로 다음 장비를 만날 확률을 높이세요."/>
    {pendingBooks > 0 && <div className="notice book-claim-all"><BookOpen size={18}/><div><strong>받지 않은 연구 보상 {pendingBooks}단계</strong><span>어종별 미수령 보상을 한 번에 받습니다</span></div><button className="gold-button" disabled={busy} onClick={() => send({ type: 'claimAllBooks' })}>모두 받기</button></div>}
    <Tabs defaultValue="fish">
    <TabsList className="game-tabs">
    <TabsTrigger value="fish">개체도감</TabsTrigger>
    <TabsTrigger value="items">물건도감</TabsTrigger>
    <TabsTrigger value="bonus">연구 보너스</TabsTrigger>
    </TabsList>
    <TabsContent value="fish">{STAGES.map(st => <details className="book-section book-region" key={st.id} open={st.id === s.stage}>
        <summary className="section-title">
        <h2><ChevronDown size={18} className="book-region-chevron"/>{st.name} <small>{st.fish.filter(id => (s.book[id] || 0) >= bookComplete).length} / {st.fish.length}종 완성</small></h2>
        <RegionProgress s={s} id={st.id}/>
        </summary>
        <div className="book-grid">{st.fish.map(id => {
                const f = FISH.find(x => x.id === id)!, n = s.book[id] || 0, researchDone = (s.bookClaims?.[id] || 0) >= BALANCE.bookMilestones.length, enemy = scaledEnemyStats(f, { tier: s.tide || 0 }), p = profile(id);
                return <article className={`panel book-card ${!n ? 'undiscovered' : ''}`} key={id}>
                <div className="book-icon">
                <Fish size={34}/>
                <span>{n >= bookComplete ? '완성 · 지역 연구에 반영' : `${n} / ${bookComplete} 포획`}</span>
                </div>
                <h3>{f.name} {f.rarity && f.rarity !== 'common' && <small className={`fish-rarity ${f.rarity}`}>{f.rarity === 'rare' ? '희귀' : f.rarity === 'epic' ? '영웅' : '전설'}</small>}{f.minTier ? <small className="fish-rarity tier">차수 {f.minTier}+</small> : null}<GoldenMark s={s} id={id}/></h3>
                <p>{f.lore}</p>
                {bookRevealed(s, id) ? <div className="fish-trait">
                <strong>{p.name}</strong>
                <span>{p.hint}</span>
                </div> : <LockedInfo n={n}/>}
                <BookTraitLine s={s} id={id}/>
                <BookResearch s={s} id={id} send={send} busy={busy} swarm/>
                {bookRevealed(s, id) && <details className="book-block book-enemy" open={!researchDone}><summary><h4>적 정보 <small>{s.tide ? `해역 난이도 ${s.tide} 적용 · 일반 낚시터 기준` : '해역 난이도 0 · 일반 낚시터 기준'}</small></h4></summary>
                <div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span><span>명중 수치 {statDisplay('accuracy', enemy.accuracy || 0)}</span><span>회피 수치 {statDisplay('evasion', enemy.evasion || 0)}</span></div>
                <div className="book-stats book-matchup"><span className="positive">실제 적중률 · 물리 {percent(hitChance(player, enemy))} · 마법 {percent(hitChance(player, enemy, true))}</span><span>적 공격 {percent(hitChance(enemy, player))}</span><span>포획 골드 {Math.floor(catchReward(f, s.tide || 0).gold * goldMultiplier(s))} G <small>(기본 {f.gold} · 해역·골드 보너스 적용)</small></span></div>{f.level >= 5 && p.skills.length > 0 ? <EnemySkillList ids={p.skills} enemy={enemy}/> : <p className="footnote">스킬 없이 기본 공격만 합니다 · 치명 {percent(enemy.crit || 0)}</p>}</details>}
                {s.stage === st.id && !s.dungeon && <button className="text-button" disabled={busy} onClick={() => send({ type: 'target', id })}>{s.target === id ? '집중 사냥 대상' : '이 물고기 집중 사냥'}</button>}</article>;
            })}</div>
        </details>)}<details className="book-section book-region boss-book-section">
        <summary className="section-title"><h2><ChevronDown size={18} className="book-region-chevron"/>던전 보스 도감</h2><span>{FISH.filter(f => f.boss && (s.book[f.id] || 0) >= bookComplete).length} / {FISH.filter(f => f.boss).length}종 완성</span></summary>
        <div className="book-grid">{FISH.filter(f => f.boss).map(f => {
            const n = s.book[f.id] || 0, p = profile(f.id), enemy = scaledEnemyStats(f, { boss: true, wave: 4, tier: f.id === 'abyssSovereign' ? 3 : 0 }), researchDone = (s.bookClaims?.[f.id] || 0) >= BALANCE.bookMilestones.length;
            return <article className={`panel book-card boss-book-card ${!n ? 'undiscovered' : ''}`} key={f.id}>
                <div className="book-icon"><Swords size={34}/><span>{n >= bookComplete ? '완성' : `${n} / ${bookComplete} 포획`}</span></div>
                <h3>{f.name} <small className="fish-rarity legendary">전설 보스</small><GoldenMark s={s} id={f.id}/></h3>
                <p>{f.lore}</p>
                {bookRevealed(s, f.id) ? <div className="fish-trait"><strong>{p.name}</strong><span>{p.hint}</span></div> : <LockedInfo n={n}/>}
                <BookTraitLine s={s} id={f.id}/>
                <BookResearch s={s} id={f.id} send={send} busy={busy}/>
                {bookRevealed(s, f.id) && <details className="book-block book-enemy" open={!researchDone}><summary><h4>적 정보 <small>{f.id === 'abyssSovereign' ? '무한 심연 1층 최종 웨이브 기준' : '던전 최종 웨이브 기준'}</small></h4></summary><div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span></div><EnemySkillList ids={p.skills} enemy={enemy}/></details>}
            </article>;
        })}</div>
        </details></TabsContent>
    <TabsContent value="items">
    <div className="notice">
    <BookOpen size={22}/>
    <div>
    <strong>등록한 종류 {registeredCount} / {Object.keys(SLOTS).length * RARITIES.length} · 장비 드롭 확률 {percent(currentDrop, 3)}/포획</strong>
    <p>도감 보너스 +{Math.round(registeredCount * PROGRESSION.itemDropBonus / BALANCE.dropBonusScale * 100)}% 포함, 행운·연구·이벤트를 모두 더한 실제 값입니다. 한 종류 더 등록하면 약 +{percent(perEntryDrop, 4)}p. 가방의 장비 한 개를 영구 등록하며 해당 장비는 소모됩니다. 같은 슬롯·등급은 한 번만 등록합니다.</p>
    </div>
    <AlertDialog>
    <AlertDialogTrigger asChild><button className="secondary" disabled={busy || !bulkCandidates.length}>{bulkCandidates.length ? `일괄 등록 (${bulkCandidates.length}종)` : '일괄 등록할 장비 없음'}</button></AlertDialogTrigger>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>미등록 {bulkCandidates.length}종을 한 번에 등록할까요?</AlertDialogTitle>
    <AlertDialogDescription>종류마다 가방에서 가장 약한 장비 1개를 골라 소모합니다: {bulkCandidates.map(c => `${c.name}${c.enhance ? ` +${c.enhance}` : ''}`).join(', ')}. 보호 장비와 유물은 제외되며 돌려받을 수 없습니다.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel>취소</AlertDialogCancel>
    <AlertDialogAction onClick={() => send({ type: 'registerItemAll' })}>모두 등록</AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    </div>
    <div className="item-grid">{Object.entries(SLOTS).flatMap(([slot, label]) => RARITIES.map((rarity, i) => {
            const key = itemKey(slot, i), registered = s.itemBook[key], candidate = s.inventory.find(item => item.slot === slot && item.rarity === i && !item.locked && !item.relic);
            return <article className="panel item-card" style={{ '--rarity': rarity.color } as React.CSSProperties} key={key}>
            <div className="item-top">
            <span>{rarity.name}</span>
            <small>{registered ? '등록 완료' : '미등록'}</small>
            </div>
            <div className="item-icon">
            <SlotIcon slot={slot} size={32}/>
            </div>
            <h3>{EQUIPMENT_NAMES[slot as keyof typeof EQUIPMENT_NAMES][i]}</h3>
            <p>{label} · 장비 드롭 확률 +{percent(perEntryDrop, 4)}p (전체 드롭 확률 기준)</p>
            <AlertDialog>
            <AlertDialogTrigger asChild>
            <button className="secondary" disabled={busy || !!registered || !candidate}>{registered ? '영구 보너스 적용 중' : candidate ? '장비 1개 등록' : '가방에 해당 장비 없음'}</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>장비를 도감에 등록할까요?</AlertDialogTitle>
            <AlertDialogDescription>{candidate?.name} (+{candidate?.enhance || 0} 강화) 한 개를 소모합니다. 등록 보너스는 환생 후에도 유지되며 장비를 돌려받을 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => candidate && send({ type: 'registerItem', id: candidate.id })}>도감에 등록</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
            </article>;
        }))}</div>
    </TabsContent>
    <TabsContent value="bonus">
    {(() => { const total = bookStatBonus(s), entries = (Object.entries(total) as [keyof Stats, number][]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])), maxStage = FISH.length * BALANCE.bookMilestones.length; return <div className="bonus-stack">
    <details className="bonus-block" open>
    <summary><div><h2>성향 연구</h2><p>어종을 {BALANCE.bookMilestones.map(m => m.toLocaleString()).join(' · ')}회 포획할 때마다 그 어종 성향의 능력치가 오릅니다. 2단계부터는 그 어종 상대 피해 보정도 붙습니다.</p></div><span className="bonus-count">{mastery(s)}<small> / {maxStage}</small></span><ChevronDown size={18} className="bonus-chevron"/></summary>
    <div className="bonus-body">
    <h3>능력치 합계 <small>능력치 화면의 ‘도감’ 기여와 같은 값</small></h3>
    {entries.length ? <ul className="bonus-grid">{entries.map(([k, v]) => <li key={k}><span>{STAT_LABELS[k]}</span><strong>+{statDisplay(k, v)}</strong></li>)}</ul> : <p className="bonus-empty">아직 달성한 단계가 없습니다. 어종을 {BALANCE.bookMilestones[0]}회 포획하면 첫 단계가 열립니다.</p>}
    <h3>성향별 진행</h3>
    <ul className="bonus-rows">{(Object.keys(BOOK_TRAITS) as (keyof typeof BOOK_TRAITS)[]).map(g => { const ids = FISH.filter(f => bookTrait(f.id) === g).map(f => f.id), stages = ids.reduce((acc, id) => acc + bookStage(s, id), 0), max = ids.length * BALANCE.bookMilestones.length; return <li key={g} className={stages ? 'active' : ''}>
        <div className="bonus-row-head"><strong>{BOOK_TRAITS[g].name}</strong><small>{ids.length}종</small><span className="bonus-count small">{stages}<small> / {max}</small></span></div>
        <Meter value={stages} max={max}/>
        <dl><dt>단계마다</dt><dd>{bonusLabel(BOOK_TRAITS[g].perStage)}</dd>{stages > 0 && <><dt>현재</dt><dd className="positive">{bonusLabel(BOOK_TRAITS[g].perStage, stages)}</dd></>}</dl>
    </li>; })}</ul>
    </div>
    </details>
    <details className="bonus-block">
    <summary><div><h2>개체도감 완성</h2><p>어종을 {bookComplete}회 포획하면 완성입니다. 완성한 종은 지역 연구에 반영되고, {BOOK_REVEAL}회부터 적 정보가 열립니다. 종별 연구 앞 3단계는 골드, 마지막 단계는 SP +1을 줍니다.</p></div><span className="bonus-count">{complete}<small> / {FISH.length}</small></span><ChevronDown size={18} className="bonus-chevron"/></summary>
    <div className="bonus-body">
    <ul className="bonus-rows">{STAGES.map(st => { const ids = [...new Set(st.fish)], done = ids.filter(id => (s.book[id] || 0) >= bookComplete).length; return <li key={st.id} className={done === ids.length ? 'done' : done ? 'active' : ''}>
        <div className="bonus-row-head"><strong>{st.name}</strong><small>{st.rebirth ? `환생 ${st.rebirth} · ` : ''}Lv.{st.level}</small><span className="bonus-count small">{done}<small> / {ids.length}</small></span></div>
        <Meter value={done} max={ids.length}/>
        <dl><dt>어종</dt><dd>{ids.map(id => { const f = FISH.find(x => x.id === id)!, n = s.book[id] || 0; return <span key={id} className={`bonus-chip ${n >= bookComplete ? 'done' : n ? 'seen' : ''}`}>{n ? f.name : '???'}{n && n < bookComplete ? ` ${n}` : ''}</span>; })}</dd></dl>
    </li>; })}</ul>
    </div>
    </details>
    <details className="bonus-block">
    <summary><div><h2>지역 연구</h2><p>지역의 모든 종을 완성하면 지역 테마 보너스와 장착 AP +1을 받습니다.</p></div><span className="bonus-count">{regions.length}<small> / {STAGES.length}</small></span><ChevronDown size={18} className="bonus-chevron"/></summary>
    <div className="bonus-body">
    <ul className="bonus-grid wide">{STAGES.map(st => { const t = REGION_THEMES[st.id], done = regions.some(r => r.id === st.id); return <li key={st.id} className={done ? 'done' : ''}><span>{st.name}</span><strong>{t ? t.label : '테마 없음'}{done ? <em> · 적용 중</em> : null}</strong></li>; })}</ul>
    </div>
    </details>
    </div>; })()}
    </TabsContent>
    </Tabs>
    </>;
}

