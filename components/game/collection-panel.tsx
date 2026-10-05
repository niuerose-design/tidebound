'use client';
import { BookOpen, ChevronDown, Swords } from 'lucide-react';
import { FishArt } from './art';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { SKILLS } from '@/game/data/skills';
import { FISH, STAGES, PLACES, REGIONS, regionFish } from '@/game/data/world';
import { MIMIC, mimicChance, specialLuck } from '@/game/data/mimic';
import { EXP_NURI, nuriChance } from '@/game/data/exp-nuri';
import { BALANCE, RARITIES, SLOTS } from '@/game/data/balance';
import { EQUIPMENT_NAMES } from '@/game/data/equipment';
import { PROGRESSION, statDisplay, percent } from '@/game/data/progression';
import { completedRegions, itemKey } from '@/game/systems/progression';
import { BookResearch, RegionProgress, RegionResearchLine, pendingBookCount } from './book-research';
import { stats, goldMultiplier, expMultiplier, hitChance, dropRate } from '@/game/systems/stats';
import { ENEMY_SKILLS, profile, scaledEnemyStats, abyssEnemyStats } from '@/game/data/encounters';
import { ONYX, ONYX_BOSSES, ONYX_SET, ownedOnyx } from '@/game/data/onyx';
import { affixDef } from '@/game/data/gear';
import { abyssReference, stageField } from '@/game/systems/encounter';
import { bookEcology, nextEcology, bookRevealed, regionResearchStage, bookStage } from '@/game/systems/book';
import { BOOK_ECOLOGY, BOOK_REVEAL, REGION_THEMES, REGION_RESEARCH, REGION_RESEARCH_FROM, REGION_RESEARCH_MAX } from '@/game/data/book-traits';
import { VARIANTS, regionSignature } from '@/game/data/variants';
import type { State, Stats } from '@/game/types';
import { enemySkillBrief } from '@/game/systems/skill-description';

const skillOf = (id: string) => [...ENEMY_SKILLS, ...SKILLS].find(sk => sk.id === id);
/** 몬스터 스킬 상세: 발동률·재사용 대기와 실제 효과(피해식·상태이상·추가타). */
function EnemySkillList({ ids, enemy }: { ids: string[]; enemy: Stats }) {
    return <div className="enemy-skill-list"><h5>사용 스킬 <small>치명 {percent(enemy.crit || 0)} · 치명 피해 ×{BALANCE.critMultiplier}</small></h5><ul>{ids.map(id => {
        const sk = skillOf(id); if (!sk) return null;
        return <li key={id}><strong>{sk.name}</strong><span>{enemySkillBrief(sk)}</span><small>발동 {percent(sk.chance)} · 재사용 {sk.cooldown}턴</small></li>;
    })}</ul></div>;
}
/** v27.81 생태 연구: 이 몬스터 상대 주는 피해·받는 공격 피해. 최대 +50% / -25%. */
function EcologyLine({ s, id }: { s: State; id: string }) {
    const eco = bookEcology(s, id), next = nextEcology(s, id), pct = (n: number) => Number((n * 100).toFixed(1));
    const max = { dealt: BOOK_ECOLOGY.dealt.reduce((a, n) => a + n, 0), taken: BOOK_ECOLOGY.taken.reduce((a, n) => a + n, 0) };
    return <div className="fish-trait book-trait-line">
        <strong>생태 연구 {eco.stages} / {BOOK_ECOLOGY.dealt.length}</strong>
        <span>{eco.stages ? <b className="positive">이 몬스터 상대 주는 피해 +{pct(eco.dealt)}% · 받는 공격 피해 -{pct(eco.taken)}%</b> : `연구 ${BOOK_ECOLOGY.fromStage}단계(${BALANCE.bookMilestones[BOOK_ECOLOGY.fromStage - 1].toLocaleString()}회)부터 적용`}{next ? ` · 다음 단계 +${pct(next.dealt)}% / -${pct(next.taken)}%` : ''} · 최대 +{pct(max.dealt)}% / -{pct(max.taken)}%</span>
    </div>;
}
/** v25.21 몬스터 이름 옆 변종 아이콘 줄. 잡은 변종은 색이 켜지고 횟수가 붙으며, 아직 못 만난 변종은 흐리게 자리만 보여 줍니다. */
function GoldenMark({ s, id }: { s: State; id: string }) {
    const row = s.variantBook?.[id] || {}, golden = s.goldenBook?.[id] || 0;
    const marks = [{ id: 'golden', mark: '✦', name: '황금 개체', n: golden }, ...VARIANTS.map(v => ({ id: v.id, mark: v.mark, name: v.name, n: row[v.id] || 0 }))];
    return <span className="variant-marks" aria-label="변종 처치 기록">{marks.map(m => <i key={m.id} className={`variant-mark variant-${m.id} ${m.n ? 'lit' : ''}`} title={m.n ? `${m.name} ${m.n}회 처치` : `${m.name} · 아직 못 만남`}>{m.mark}{m.n > 1 ? <b>{m.n > 99 ? '99+' : m.n}</b> : null}</i>)}</span>;
}
/** 처치 50회 전에는 적 성향·스킬·능력치를 숨깁니다. */
/** v27.81 적의 치명·관통: 치명 확률, 치명 피해 배율, 방어 관통(내 방어를 그만큼 무시). */
function EnemyStrike({ enemy }: { enemy: Partial<Stats> }) {
    return <><span>치명 확률 {percent(enemy.crit || 0)}</span><span>치명 피해 ×{(enemy.critDamage || BALANCE.critMultiplier).toFixed(2)}</span><span>방어 관통 {percent(enemy.penetration || 0)}</span></>;
}
function LockedInfo({ n }: { n: number }) {
    return <div className="fish-trait book-locked"><strong>미확인 개체</strong><span>{BOOK_REVEAL}회 처치하면 성향·스킬·능력치 정보가 공개됩니다 ({Math.min(n, BOOK_REVEAL)} / {BOOK_REVEAL}).</span></div>;
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
    {pendingBooks > 0 && <div className="notice book-claim-all"><BookOpen size={18}/><div><strong>받지 않은 연구 보상 {pendingBooks}단계</strong><span>몬스터별 미수령 보상을 한 번에 받습니다</span></div><button className="gold-button" disabled={busy} onClick={() => send({ type: 'claimAllBooks' })}>모두 받기</button></div>}
    <Tabs defaultValue="fish">
    <TabsList className="game-tabs">
    <TabsTrigger value="fish">개체도감</TabsTrigger>
    <TabsTrigger value="items">물건도감</TabsTrigger>
    <TabsTrigger value="bonus">연구 보너스</TabsTrigger>
    </TabsList>
    <TabsContent value="fish">{(() => { const n = s.book[MIMIC.id] || 0, m = s.book[EXP_NURI.id] || 0, luck = specialLuck(s); return <details className="book-section book-region book-special" open={n + m > 0}>
        <summary className="section-title"><h2><ChevronDown size={18} className="book-region-chevron"/>특별 도감 <small>{n + m ? [n ? `숙련의 까미 ${n}회` : '', m ? `경험의 누리 ${m}회` : ''].filter(Boolean).join(' · ') + ' 처치' : '아직 만나지 못함'}</small></h2></summary>
        <div className="book-grid"><article className={`panel book-card ${!n ? 'undiscovered' : ''}`}>
            <div className="book-icon"><FishArt id={MIMIC.id} size={56}/><span>{n ? `${n}회 처치` : '미발견'}</span></div>
            <h3>{n ? '숙련의 까미' : '???'} <small className="fish-rarity legendary">특별</small></h3>
            <p>{n ? FISH.find(f => f.id === MIMIC.id)!.lore : `사냥터 난이도 ${MIMIC.minTier} 이상에서 아주 드물게 나타난다고 합니다.`}</p>
            <div className="fish-trait"><strong>숙련 로또</strong><span>잡으면 현재 직업과 장착 스킬의 숙련이 한꺼번에 오릅니다: {MIMIC.tiers.map(t => `${t.label} ${t.mastery.toLocaleString()} (${Math.round(t.chance * 100)}%)`).join(' · ')}.</span><span>출현마다 ({(MIMIC.chance * 100).toFixed(2)}% + 사냥터 난이도 1단계당 {(MIMIC.chancePerTier * 100).toFixed(2)}%p) × 사냥터 배율(첫 사냥터 ×1, 한 곳 뒤로 갈 때마다 +{MIMIC.stageStep}) · 지금 사냥터(행운의 편지 포함) {(s.tide || 0) >= MIMIC.minTier ? `${(mimicChance(s.tide || 0, Math.max(0, STAGES.findIndex(x => x.id === s.stage))) * luck * 100).toFixed(2)}%` : '등장 안 함'} · 사냥터 난이도 {MIMIC.minTier} 이상 · Lv.{MIMIC.minLevel}·누적 처치 {MIMIC.minKills}마리부터 · 던전 제외 · 그 사냥터에서 가장 강한 몬스터의 몸집(체력 ×{MIMIC.hp}, 공격 ×{MIMIC.attack}).</span></div>
        </article>
        <article className={`panel book-card ${!m ? 'undiscovered' : ''}`}>
            <div className="book-icon"><FishArt id={EXP_NURI.id} size={56}/><span>{m ? `${m}회 처치` : '미발견'}</span></div>
            <h3>{m ? '경험의 누리' : '???'} <small className="fish-rarity legendary">특별</small></h3>
            <p>{m ? FISH.find(f => f.id === EXP_NURI.id)!.lore : `사냥터 난이도 ${EXP_NURI.minTier} 이상, Lv.${EXP_NURI.minLevel}이 넘은 모험가 앞에 아주 드물게 나타난다고 합니다.`}</p>
            <div className="fish-trait"><strong>경험치 로또</strong><span>잡으면 지금 레벨에 필요한 경험치의 일부를 한 번에 얻습니다(경험치 배율·서약과 무관): {EXP_NURI.tiers.map(t => `${t.label} ${Math.round(t.pct * 100)}% (${Math.round(t.chance * 100)}%)`).join(' · ')}.</span><span>출현마다 {(EXP_NURI.chance * 100).toFixed(2)}% + 사냥터 난이도 1단계당 {(EXP_NURI.chancePerTier * 100).toFixed(2)}%p · 지금(행운의 편지 포함) {(s.tide || 0) >= EXP_NURI.minTier ? `${(nuriChance(s.tide || 0) * luck * 100).toFixed(2)}%` : '등장 안 함'} · 사냥터 난이도 {EXP_NURI.minTier} 이상 · Lv.{EXP_NURI.minLevel}~99·누적 처치 {EXP_NURI.minKills.toLocaleString()}마리부터 · 던전 제외 · 오프라인 정산 중 ×{EXP_NURI.offlineScale} · 그 사냥터에서 가장 강한 몬스터의 몸집(체력 ×{EXP_NURI.hp}, 공격 ×{EXP_NURI.attack}).</span></div>
        </article></div>
    </details>; })()}{REGIONS.map(region => { const ids = regionFish(region), sig = regionSignature(region), here = STAGES.some(x => x.region === region && x.id === s.stage);
    /* v27.80 도감: 지역 → 장소 2단. 지역 제목에 완성 종 수·지역 연구 단계·대표 변종. */
    return <details className="book-section book-region book-area" key={region} open={here}>
        <summary className="section-title"><h2><ChevronDown size={18} className="book-region-chevron"/>{region} <small>{ids.filter(id => (s.book[id] || 0) >= bookComplete).length} / {ids.length}종 완성 · 지역 연구 {regionResearchStage(s, region)} / {REGION_RESEARCH_MAX}단계{sig.length ? ` · 대표 변종 ${sig.map(v => `${v.mark} ${v.name}`).join('·')}` : ''}</small></h2></summary>
        <RegionResearchLine s={s} region={region}/>
        {PLACES.filter(st => st.region === region).map(st => <details className="book-section book-region" key={st.id} open={st.id === s.stage}>
        <summary className="section-title">
        <h2><ChevronDown size={18} className="book-region-chevron"/>{st.place} <small>{st.fish.filter(id => (s.book[id] || 0) >= bookComplete).length} / {st.fish.length}종 완성</small></h2>
        <RegionProgress s={s} id={st.id}/>
        </summary>
        <div className="book-grid">{st.fish.map(id => {
                const f = FISH.find(x => x.id === id)!, n = s.book[id] || 0, tide = s.dungeon ? 0 : (s.tide || 0), live = stageField(s, st.id, id, tide), enemy = live.foe, p = profile(id);
                return <article className={`panel book-card ${!n ? 'undiscovered' : ''}`} key={id}>
                <div className="book-icon">
                <FishArt id={id} size={56}/>
                <span>{n >= bookComplete ? '완성 · 지역 연구에 반영' : `${n} / ${bookComplete} 처치`}</span>
                </div>
                <h3>{f.name} {f.rarity && f.rarity !== 'common' && <small className={`fish-rarity ${f.rarity}`}>{f.rarity === 'rare' ? '희귀' : f.rarity === 'epic' ? '영웅' : '전설'}</small>}{f.minTier ? <small className="fish-rarity tier">차수 {f.minTier}+</small> : null}<GoldenMark s={s} id={id}/></h3>
                <p>{f.lore}</p>
                {bookRevealed(s, id) ? <div className="fish-trait">
                <strong>{p.name}</strong>
                <span>{p.hint}</span>
                </div> : <LockedInfo n={n}/>}
                <EcologyLine s={s} id={id}/>
                <BookResearch s={s} id={id} send={send} busy={busy} swarm/>
                {bookRevealed(s, id) && <details className="book-block book-enemy"><summary><h4><ChevronDown size={14} className="book-enemy-chevron"/>적 정보 <small>{`사냥터 난이도 ${tide} 기준 · Lv.${live.level}${live.level > f.level ? ` (기본 Lv.${f.level}에서 상승)` : ''}`}</small></h4></summary>
                <div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span><span>명중 수치 {statDisplay('accuracy', enemy.accuracy || 0)}</span><span>회피 수치 {statDisplay('evasion', enemy.evasion || 0)}</span><EnemyStrike enemy={enemy}/></div>
                <div className="book-stats book-matchup"><span className="positive">실제 적중률 · 물리 {percent(hitChance(player, enemy))} · 마법 {percent(hitChance(player, enemy, true))}</span><span>적 공격 {percent(hitChance(enemy, player))}</span><span>처치 골드 {Math.floor(live.gold * goldMultiplier(s))} G <small>(기본 {f.gold} · 난이도·골드 보너스 적용)</small></span><span>처치 경험치 {Math.floor(live.exp * expMultiplier(s)).toLocaleString()} <small>(기본 {f.exp} · 난이도·경험치 배율 적용)</small></span></div>{f.level >= 5 && p.skills.length > 0 ? <EnemySkillList ids={p.skills} enemy={enemy}/> : <p className="footnote">스킬 없이 기본 공격만 합니다 · 치명 {percent(enemy.crit || 0)}</p>}</details>}
                {s.stage === st.id && !s.dungeon && <button className="text-button" disabled={busy} onClick={() => send({ type: 'target', id })}>{s.target === id ? '집중 사냥 대상' : '이 몬스터 집중 사냥'}</button>}</article>;
            })}</div>
        </details>)}
    </details>; })}<details className="book-section book-region boss-book-section">
        <summary className="section-title"><h2><ChevronDown size={18} className="book-region-chevron"/>던전 보스 도감</h2><span>{FISH.filter(f => f.boss && (s.book[f.id] || 0) >= bookComplete).length} / {FISH.filter(f => f.boss).length}종 완성</span></summary>
        <div className="book-grid">{FISH.filter(f => f.boss).map(f => {
            const n = s.book[f.id] || 0, p = profile(f.id), enemy = f.id === 'abyssSovereign' ? abyssEnemyStats(f, abyssReference(), 1, { boss: true, wave: 4 }) : scaledEnemyStats(f, { boss: true, wave: 4, tier: 0 });
            return <article className={`panel book-card boss-book-card ${!n ? 'undiscovered' : ''}`} key={f.id}>
                <div className="book-icon"><Swords size={34}/><span>{n >= bookComplete ? '완성' : `${n} / ${bookComplete} 처치`}</span></div>
                <h3>{f.name} <small className="fish-rarity legendary">전설 보스</small><GoldenMark s={s} id={f.id}/></h3>
                <p>{f.lore}</p>
                {bookRevealed(s, f.id) ? <div className="fish-trait"><strong>{p.name}</strong><span>{p.hint}</span></div> : <LockedInfo n={n}/>}
                <EcologyLine s={s} id={f.id}/>
                <BookResearch s={s} id={f.id} send={send} busy={busy}/>
                {bookRevealed(s, f.id) && <details className="book-block book-enemy"><summary><h4><ChevronDown size={14} className="book-enemy-chevron"/>적 정보 <small>{f.id === 'abyssSovereign' ? '무릉도장 1층 최종 웨이브 기준' : '던전 최종 웨이브 기준'}</small></h4></summary><div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span><EnemyStrike enemy={enemy}/></div><EnemySkillList ids={p.skills} enemy={enemy}/></details>}
            </article>;
        })}</div>
        </details><details className="book-section book-region boss-book-section onyx-book-section">
        <summary className="section-title"><h2><ChevronDown size={18} className="book-region-chevron"/>칠흑의 보스</h2><span>{ONYX_BOSSES.filter(b => ownedOnyx(s).has(b.id)).length} / {ONYX_BOSSES.length} 장신구 보유</span></summary>
        <p className="footnote">무리 서식지에서만 출현마다 {Math.round(ONYX.chance * 1000) / 10}%(난이도 50마다 +100%, {ONYX.pity.toLocaleString()}회 못 보면 확정)로 나타나는 지역 보스입니다. 집중 사냥 대상이 될 수 없고 {ONYX.turns}턴 안에 못 잡으면 떠납니다. 처치하면 {Math.round(ONYX.drop * 100)}%로 그 보스의 칠흑 장신구(태초 · 고유 옵션 1줄 + 무작위 {ONYX.affixes}줄)를 받고({ONYX.dropPity}번째 연속 미획득 격파는 확정), 장신구는 환생해도 남습니다(종당 1개, 이미 있으면 세계석 +{ONYX.duplicatePearls}). 보스마다 쓰는 기술이 다르니 도감 성향을 확인하세요.</p>
        <ul className="bonus-rows">{ONYX_SET.map(b => <li key={b.count} className={ownedOnyx(s).size >= b.count ? 'done' : ''}><b>{b.count}종 보유</b> · <span>{b.label}</span>{ownedOnyx(s).size >= b.count ? ' ✓' : ''}</li>)}</ul>
        <div className="book-grid">{ONYX_BOSSES.map(b => { const f = FISH.find(x => x.id === b.id)!, n = s.onyxBook?.[b.id] || 0, got = ownedOnyx(s).has(b.id), def = affixDef(b.accessory.affix.id);
            return <article className={`panel book-card boss-book-card ${!n ? 'undiscovered' : ''}`} key={b.id}>
                <div className="book-icon"><Swords size={34}/><span>{n ? `${n}회 격파` : '미발견'}</span></div>
                <h3>{b.name} <small className="fish-rarity legendary">{b.region} 서식지</small></h3>
                <p>{f.lore}</p>
                <div className="fish-trait"><strong>{got ? '✓ ' : ''}{b.accessory.name}</strong><span>{def?.description || b.accessory.desc}</span></div>
            </article>; })}</div>
        </details></TabsContent>
    <TabsContent value="items">
    <div className="notice">
    <BookOpen size={22}/>
    <div>
    <strong>등록한 종류 {registeredCount} / {Object.keys(SLOTS).length * RARITIES.length} · 장비 드롭 확률 {percent(currentDrop, 3)}</strong>
    <p>도감 보너스 +{Math.round(registeredCount * PROGRESSION.itemDropBonus / BALANCE.dropBonusScale * 100)}% 포함, 행운·연구·이벤트를 모두 더한 실제 값입니다. 한 종류 더 등록하면 약 +{percent(perEntryDrop, 4)}p. 가방의 장비 한 개를 영구 등록하며 해당 장비는 소모됩니다. 같은 슬롯·등급은 한 번만 등록합니다.</p>
    </div>
    <AlertDialog>
    <AlertDialogTrigger asChild><button className="secondary" disabled={busy || !bulkCandidates.length}>{bulkCandidates.length ? `일괄 등록 (${bulkCandidates.length}종)` : '일괄 등록할 장비 없음'}</button></AlertDialogTrigger>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>미등록 {bulkCandidates.length}종을 한 번에 등록할까요?</AlertDialogTitle>
    <AlertDialogDescription>종류마다 가방에서 가장 약한 장비 1개를 골라 소모합니다: {bulkCandidates.map(c => `${c.name}${c.enhance ? ` ★${c.enhance}` : ''}`).join(', ')}. 보호 장비와 유물은 제외되며 돌려받을 수 없습니다.</AlertDialogDescription>
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
            <p>{label} · 장비 드롭 확률 +{percent(perEntryDrop, 4)}p</p>
            <AlertDialog>
            <AlertDialogTrigger asChild>
            <button className="secondary" disabled={busy || !!registered || !candidate}>{registered ? '영구 보너스 적용 중' : candidate ? '장비 1개 등록' : '가방에 해당 장비 없음'}</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>장비를 도감에 등록할까요?</AlertDialogTitle>
            <AlertDialogDescription>{candidate?.name} (★{candidate?.enhance || 0}) 한 개를 소모합니다. 등록 보너스는 환생 후에도 유지되며 장비를 돌려받을 수 없습니다.</AlertDialogDescription>
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
    {(() => { const eco = FISH.map(f => bookEcology(s, f.id).stages), maxStage = FISH.length * BOOK_ECOLOGY.dealt.length, pct = (n: number) => Number((n * 100).toFixed(1)); return <div className="bonus-stack">
    <details className="bonus-block" open>
    <summary><div><h2>생태 연구</h2><p>몬스터를 {BALANCE.bookMilestones.slice(BOOK_ECOLOGY.fromStage - 1).map(m => m.toLocaleString()).join(' · ')}회 처치할 때마다(6단계는 난이도 {BALANCE.bookTierReq[5]} 이상 처치 필요) 그 몬스터를 상대로 주는 피해가 오르고 받는 공격 피해가 줄어듭니다. 단계마다 {BOOK_ECOLOGY.dealt.map(pct).join('·')}% / {BOOK_ECOLOGY.taken.map(pct).join('·')}%, 최대 +{pct(BOOK_ECOLOGY.dealt.reduce((a, n) => a + n, 0))}% / -{pct(BOOK_ECOLOGY.taken.reduce((a, n) => a + n, 0))}%.</p></div><span className="bonus-count">{eco.reduce((a, n) => a + n, 0)}<small> / {maxStage}</small></span><ChevronDown size={18} className="bonus-chevron"/></summary>
    <div className="bonus-body">
    <ul className="bonus-grid">{BOOK_ECOLOGY.dealt.map((_, i) => { const n = eco.filter(x => x > i).length; return <li key={i} className={n ? 'active' : ''}><span>생태 {i + 1}단계 · 누적 +{pct(BOOK_ECOLOGY.dealt.slice(0, i + 1).reduce((a, x) => a + x, 0))}% / -{pct(BOOK_ECOLOGY.taken.slice(0, i + 1).reduce((a, x) => a + x, 0))}%</span><strong>{n} / {FISH.length}종</strong></li>; })}</ul>
    <h3>몬스터별 진행 <small>장소별 · 칩의 숫자는 그 몬스터의 생태 단계({BOOK_ECOLOGY.dealt.length}단계가 최대)</small></h3>
    <ul className="bonus-rows">{PLACES.map(st => { const ids = [...new Set(st.fish)], max = ids.length * BOOK_ECOLOGY.dealt.length, sum = ids.reduce((a, id) => a + bookEcology(s, id).stages, 0); return <li key={st.id} className={sum >= max ? 'done' : sum ? 'active' : ''}>
        <div className="bonus-row-head"><strong>{st.name}</strong><small>{st.rebirth ? `환생 ${st.rebirth} · ` : ''}Lv.{st.level}</small><span className="bonus-count small">{sum}<small> / {max}</small></span></div>
        <Meter value={sum} max={max}/>
        <dl><dt>몬스터</dt><dd>{ids.map(id => { const f = FISH.find(x => x.id === id)!, n = s.book[id] || 0, e = bookEcology(s, id); return <span key={id} className={`bonus-chip ${e.stages >= BOOK_ECOLOGY.dealt.length ? 'done' : e.stages ? 'seen' : ''}`} title={n ? `${f.name} · 처치 ${n.toLocaleString()}회 · 주는 피해 +${pct(e.dealt)}% · 받는 공격 피해 -${pct(e.taken)}%` : '미발견'}>{n ? f.name : '???'}{n ? ` ${e.stages}/${BOOK_ECOLOGY.dealt.length}` : ''}</span>; })}</dd></dl>
    </li>; })}</ul>
    </div>
    </details>
    <details className="bonus-block">
    <summary><div><h2>개체도감 완성</h2><p>몬스터를 {bookComplete}회 처치하면 완성입니다. 완성한 종은 장소 연구에 반영되고, {BOOK_REVEAL}회부터 적 정보가 열립니다. 종별 연구는 2단계부터 그 몬스터 상대 생태 연구가 오르고, 4·5·6단계는 SP +{PROGRESSION.bookSP[3]}·+{PROGRESSION.bookSP[4]}·+{PROGRESSION.bookSP[5]}을 줍니다. 6단계는 그 몬스터를 난이도 {BALANCE.bookTierReq[5]} 이상에서 처치해야 열립니다.</p></div><span className="bonus-count">{complete}<small> / {FISH.length}</small></span><ChevronDown size={18} className="bonus-chevron"/></summary>
    <div className="bonus-body">
    <ul className="bonus-rows">{PLACES.map(st => { const ids = [...new Set(st.fish)], done = ids.filter(id => (s.book[id] || 0) >= bookComplete).length; return <li key={st.id} className={done === ids.length ? 'done' : done ? 'active' : ''}>
        <div className="bonus-row-head"><strong>{st.name}</strong><small>{st.rebirth ? `환생 ${st.rebirth} · ` : ''}Lv.{st.level}</small><span className="bonus-count small">{done}<small> / {ids.length}</small></span></div>
        <Meter value={done} max={ids.length}/>
        <dl><dt>몬스터</dt><dd>{ids.map(id => { const f = FISH.find(x => x.id === id)!, n = s.book[id] || 0; return <span key={id} className={`bonus-chip ${n >= bookComplete ? 'done' : n ? 'seen' : ''}`}>{n ? f.name : '???'}{n && n < bookComplete ? ` ${n}` : ''}</span>; })}</dd></dl>
    </li>; })}</ul>
    </div>
    </details>
    <details className="bonus-block">
    <summary><div><h2>지역 연구</h2><p>지역(리스항구 등)의 모든 몬스터가 연구 {REGION_RESEARCH_FROM}·{REGION_RESEARCH_FROM + 1}·{REGION_RESEARCH_FROM + 2}단계 이상이면 지역 연구 1·2·3단계입니다. 단계마다 지역 효과가 한 번씩 쌓입니다.</p></div><span className="bonus-count">{REGIONS.reduce((a, r) => a + regionResearchStage(s, r), 0)}<small> / {REGIONS.length * REGION_RESEARCH_MAX}</small></span><ChevronDown size={18} className="bonus-chevron"/></summary>
    <div className="bonus-body">
    <ul className="bonus-rows">{REGIONS.map(region => { const n = regionResearchStage(s, region), r = REGION_RESEARCH[region], ids = regionFish(region), need = REGION_RESEARCH_FROM + n; return <li key={region} className={n >= REGION_RESEARCH_MAX ? 'done' : n ? 'active' : ''}>
        <div className="bonus-row-head"><strong>{region}</strong><small>단계마다 {r?.label}{n ? ` · ×${n} 적용 중` : ''}</small><span className="bonus-count small">{n}<small> / {REGION_RESEARCH_MAX}단계</small></span></div>
        <Meter value={n} max={REGION_RESEARCH_MAX}/>
        <dl><dt>몬스터</dt><dd>{ids.map(id => { const f = FISH.find(x => x.id === id)!, k = s.book[id] || 0, stage = bookStage(s, id); return <span key={id} className={`bonus-chip ${stage >= REGION_RESEARCH_FROM + REGION_RESEARCH_MAX - 1 ? 'done' : stage >= need ? 'seen' : ''}`} title={k ? `${f.name} · 연구 ${stage}단계${n < REGION_RESEARCH_MAX ? ` · 다음 지역 연구에 ${need}단계 필요` : ''}` : '미발견'}>{k ? f.name : '???'}{k ? ` ${stage}단계` : ''}</span>; })}</dd></dl>
        {n < REGION_RESEARCH_MAX && <p className="bonus-empty">다음 단계: 지역의 모든 몬스터가 연구 {need}단계 이상.</p>}
    </li>; })}</ul>
    </div>
    </details>
    <details className="bonus-block">
    <summary><div><h2>장소 연구</h2><p>사냥터(장소)의 모든 종을 완성하면 장소 테마 보너스와 장착 AP +1을 받습니다.</p></div><span className="bonus-count">{regions.length}<small> / {PLACES.length}</small></span><ChevronDown size={18} className="bonus-chevron"/></summary>
    <div className="bonus-body">
    <ul className="bonus-grid wide">{PLACES.map(st => { const t = REGION_THEMES[st.id], done = regions.some(r => r.id === st.id); return <li key={st.id} className={done ? 'done' : ''}><span>{st.name}</span><strong>{t ? t.label : '테마 없음'}{done ? <em> · 적용 중</em> : null}</strong></li>; })}</ul>
    </div>
    </details>
    </div>; })()}
    </TabsContent>
    </Tabs>
    </>;
}

