'use client';
import { catchReward } from '@/game/systems/meta';
import { BookOpen, Fish, Swords } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { SKILLS } from '@/game/data/skills';
import { FISH, STAGES, SWARM_UNLOCK } from '@/game/data/world';
import { BALANCE, RARITIES, SLOTS } from '@/game/data/balance';
import { EQUIPMENT_NAMES } from '@/game/data/equipment';
import { PROGRESSION, statDisplay, percent } from '@/game/data/progression';
import { completedRegions, itemKey } from '@/game/systems/progression';
import { BookResearch, RegionProgress, pendingBookCount } from './book-research';
import { stats, mastery, goldMultiplier, hitChance } from '@/game/systems/stats';
import { profile, scaledEnemyStats } from '@/game/data/encounters';
import { Heading, SlotIcon } from './shared';
import type { PanelProps } from './panel-props';
export function Collection({ s, send, busy }: PanelProps) {
    const player = stats(s), bookComplete = PROGRESSION.fishComplete;
    const complete = FISH.filter(f => (s.book[f.id] || 0) >= bookComplete).length, regions = completedRegions(s), pendingBooks = pendingBookCount(s);
    return <>
    <Heading eyebrow="ARCHIVE & RESEARCH" title="기록이 힘이 되는 도감" description="개체도감으로 편성의 폭을 넓히고, 물건도감으로 다음 장비를 만날 확률을 높이세요."/>
    <div className="skill-resource-grid">
    <div className="panel">
    <small>개체도감 완성</small>
    <strong>{complete}<span> / {FISH.length}</span>
    </strong>
    <p>종별 연구 {BALANCE.bookMilestones.map(m => m.toLocaleString()).join(' · ')}회 · 앞 3단계는 골드, 최종 단계는 SP +1 · 지역 완성은 최대 체력 +20 · AP +1</p>
    </div>
    <div className="panel">
    <small>포획 숙련 보너스</small>
    <strong>+{mastery(s)}</strong>
    <p>물리·마법 공격 · 단계마다 +1</p>
    </div>
    <div className="panel">
    <small>지역 연구 완성</small>
    <strong>{regions.length}<span> / {STAGES.length}</span>
    </strong>
    <p>지역 내 모든 종 완성 시 최대 체력 +20 · AP +1</p>
    </div>
    </div>
    {pendingBooks > 0 && <div className="notice book-claim-all"><BookOpen size={20}/><div><strong>받지 않은 연구 보상 {pendingBooks}단계</strong><p>여러 어종의 미수령 보상을 한 번에 받습니다.</p></div><button className="gold-button" disabled={busy} onClick={() => send({ type: 'claimAllBooks' })}>모두 받기</button></div>}
    <p className="footnote">카드마다 연구 진행(플레이어 보상)을 먼저, 적 정보를 아래에 나눠 표시합니다. 달성한 연구 단계는 접혀 있습니다. 실제 적중률은 명중·회피 수치와 속도 차이를 반영한 확률입니다(1~99.5%).</p>
    <Tabs defaultValue="fish">
    <TabsList className="game-tabs">
    <TabsTrigger value="fish">개체도감</TabsTrigger>
    <TabsTrigger value="items">물건도감</TabsTrigger>
    </TabsList>
    <TabsContent value="fish">{STAGES.map(st => <section className="book-section" key={st.id}>
        <div className="section-title">
        <h2>{st.name}</h2>
        <RegionProgress s={s} id={st.id}/>
        </div>
        <div className="book-grid">{st.fish.map(id => {
                const f = FISH.find(x => x.id === id)!, n = s.book[id] || 0, researchDone = (s.bookClaims?.[id] || 0) >= BALANCE.bookMilestones.length, enemy = scaledEnemyStats(f, { tier: s.tide || 0 }), p = profile(id);
                return <article className={`panel book-card ${!n ? 'undiscovered' : ''}`} key={id}>
                <div className="book-icon">
                <Fish size={34}/>
                <span>{n >= bookComplete ? '완성 · 지역 연구에 반영' : `${n} / ${bookComplete} 포획`}</span>
                </div>
                <h3>{f.name} {f.rarity && f.rarity !== 'common' && <small className={`fish-rarity ${f.rarity}`}>{f.rarity === 'rare' ? '희귀' : f.rarity === 'epic' ? '영웅' : '전설'}</small>}</h3>
                <p>{f.lore}</p>
                <div className="fish-trait">
                <strong>{p.name}</strong>
                <span>{p.hint}</span>
                </div>
                <BookResearch s={s} id={id} send={send} busy={busy}/>
                {n >= bookComplete && <small className="book-swarm book-swarm-line">무리 사냥 ×5 해금{n >= SWARM_UNLOCK[100] ? ' · ×100 해금' : ` · ×100까지 ${(SWARM_UNLOCK[100] - n).toLocaleString()}마리`}</small>}
                <details className="book-block book-enemy" open={!researchDone}><summary><h4>적 정보 <small>{s.tide ? `해역 난이도 ${s.tide} 적용 · 일반 낚시터 기준` : '해역 난이도 0 · 일반 낚시터 기준'}</small></h4></summary>
                <div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span><span>명중 수치 {statDisplay('accuracy', enemy.accuracy || 0)}</span><span>회피 수치 {statDisplay('evasion', enemy.evasion || 0)}</span></div>
                <div className="book-stats book-matchup"><span className="positive">실제 적중률 · 내 공격 {percent(hitChance(player, enemy))}</span><span>적 공격 {percent(hitChance(enemy, player))}</span><span>포획 골드 {Math.floor(catchReward(f, s.tide || 0).gold * goldMultiplier(s))} G <small>(기본 {f.gold} · 해역·골드 보너스 적용)</small></span></div></details>
                {s.stage === st.id && !s.dungeon && <button className="text-button" disabled={busy} onClick={() => send({ type: 'target', id })}>{s.target === id ? '집중 사냥 대상' : '이 물고기 집중 사냥'}</button>}</article>;
            })}</div>
        </section>)}<section className="book-section boss-book-section">
        <div className="section-title"><h2>던전 보스 도감</h2><span>{FISH.filter(f => f.boss && (s.book[f.id] || 0) >= bookComplete).length} / {FISH.filter(f => f.boss).length}종 완성</span></div>
        <div className="book-grid">{FISH.filter(f => f.boss).map(f => {
            const n = s.book[f.id] || 0, p = profile(f.id), enemy = scaledEnemyStats(f, { boss: true, wave: 4, tier: f.id === 'abyssSovereign' ? 3 : 0 }), researchDone = (s.bookClaims?.[f.id] || 0) >= BALANCE.bookMilestones.length;
            return <article className={`panel book-card boss-book-card ${!n ? 'undiscovered' : ''}`} key={f.id}>
                <div className="book-icon"><Swords size={34}/><span>{n >= bookComplete ? '완성' : `${n} / ${bookComplete} 포획`}</span></div>
                <h3>{f.name} <small className="fish-rarity legendary">전설 보스</small></h3>
                <p>{f.lore}</p>
                <div className="fish-trait"><strong>{p.name}</strong><span>{p.hint}</span></div>
                <BookResearch s={s} id={f.id} send={send} busy={busy}/>
                <details className="book-block book-enemy" open={!researchDone}><summary><h4>적 정보 <small>{f.id === 'abyssSovereign' ? '무한 심연 1층 최종 웨이브 기준' : '던전 최종 웨이브 기준'}</small></h4></summary><div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span></div><div className="book-stats"><span>스킬 {p.skills.map(id => SKILLS.find(sk => sk.id === id)?.name || id).join(' · ')}</span></div></details>
            </article>;
        })}</div>
        </section></TabsContent>
    <TabsContent value="items">
    <div className="notice">
    <BookOpen size={22}/>
    <div>
    <strong>등록한 종류 {Object.keys(s.itemBook).length} / 12 · 드롭 확률 +{(Object.keys(s.itemBook).length * PROGRESSION.itemDropBonus * 100).toFixed(1)}%p</strong>
    <p>가방의 장비 한 개를 영구 등록하며, 해당 장비는 소모됩니다. 같은 슬롯·등급은 한 번만 등록합니다.</p>
    </div>
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
            <p>{label} · 드롭 확률 +0.5%p</p>
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
    </Tabs>
    <p className="footnote">포획 수·연구 보상·물건도감은 환생 후에도 유지됩니다. 연구 보상은 각 단계에서 한 번만 받을 수 있습니다.</p>
    </>;
}

