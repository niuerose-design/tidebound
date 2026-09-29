'use client';
import { catchReward } from '@/game/systems/meta';
import { BookOpen, Fish, RefreshCw, Swords } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { State, Action } from '@/game/types';
import { SKILLS } from '@/game/data/skills';
import { FISH, STAGES, SWARM_UNLOCK } from '@/game/data/world';
import { RARITIES, SLOTS } from '@/game/data/balance';
import { EQUIPMENT_NAMES } from '@/game/data/equipment';
import { ATTRIBUTES, PROGRESSION, STAT_LABELS, CORE_STATS, DETAIL_STATS, RATING_STATS, statDisplay } from '@/game/data/progression';
import { attributes, apCapacity, apUsed, completedRegions, bookReward, itemKey } from '@/game/systems/progression';
import { stats, dropRate, mastery, goldMultiplier, hitChance, expMultiplier } from '@/game/systems/stats';
import { profile, scaledEnemyStats } from '@/game/data/encounters';
import { Heading, Meter, SlotIcon } from './shared';
type Props = {
    s: State;
    send: (a: Action, path?: string) => void;
    busy: boolean;
};
function Reset({ title, description, disabled, onConfirm, label }: {
    title: string;
    description: string;
    disabled: boolean;
    onConfirm: () => void;
    label: string;
}) {
    return <AlertDialog>
    <AlertDialogTrigger asChild>
    <button className="secondary" disabled={disabled}>
    <RefreshCw size={15}/>{label}</button>
    </AlertDialogTrigger>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>{title}</AlertDialogTitle>
    <AlertDialogDescription>{description}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel>취소</AlertDialogCancel>
    <AlertDialogAction onClick={onConfirm}>초기화</AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>;
}
export function Character({ s, send, busy }: Props) {
    const a = stats(s), v = attributes(s);
    return <>
    <Heading eyebrow="CHARACTER BUILD" title="어떤 낚시꾼이 될 것인가" description="기본 능력치는 전직 조건과 전투 특성을 함께 결정합니다. 레벨마다 4포인트를 직접 배분하세요.">
    <Reset title="능력치를 재분배할까요?" description="투자한 포인트를 전부 돌려받습니다. 전직 해금 기록은 유지되며 체력·마나는 새 최대값을 초과할 수 없습니다." disabled={busy || s.running} onConfirm={() => send({ type: 'resetAttributes' })} label="무료 재분배"/>
    </Heading>
    <div className="build-banner panel">
    <div>
    <div className="eyebrow">UNSPENT POINTS</div>
    <strong>{s.statPoints}<small>남은 능력치 포인트</small>
    </strong>
    </div>
    <p>근력은 물리, 지능은 마법.<br />기민·체질·정신·행운으로 전투의 빈틈을 채우세요.</p>
    </div>
    <div className="build-columns">
    <section className="panel attribute-panel">
    <div className="section-title">
    <h2>기본 능력치</h2>
    <span>기본 + 성장 + 직접 투자</span>
    </div>{ATTRIBUTES.map(attr => <div className="attribute-row" key={attr.id}>
        <div className="attribute-code">{attr.code}</div>
        <div className="attribute-copy">
        <h3>{attr.name}<strong>{v[attr.id]}</strong>
        </h3>
        <p>{attr.description}</p>
        <small>직접 투자 {s.attributes[attr.id]}포인트</small>
        </div>
        <div className="attribute-buttons">
        <button className="secondary small" aria-label={`${attr.name} 1 증가`} disabled={busy || s.statPoints < 1} onClick={() => send({ type: 'attribute', id: attr.id, value: '1' })}>+1</button>
        <button className="secondary small" aria-label={`${attr.name} 5 증가`} disabled={busy || s.statPoints < 5} onClick={() => send({ type: 'attribute', id: attr.id, value: '5' })}>+5</button>
        </div>
        </div>)}</section>
    <section className="panel derived-panel">
    <div className="section-title">
    <h2>최종 전투 능력치</h2>
    <span>직업·장비·스킬 포함</span>
    </div>
    <div className="derived-grid">{CORE_STATS.map(key => <div key={key} className={['hp', 'speed', 'crit'].includes(key) ? 'wide' : undefined}>
        <span>{STAT_LABELS[key]}{RATING_STATS.has(key) ? ' 수치' : ''}</span>
        <strong>{statDisplay(key, a[key])}</strong>
        </div>)}</div>
    <details className="derived-details"><summary>상세 능력치</summary><div className="derived-grid">{DETAIL_STATS.filter(key => key === 'harmony' ? s.job === 'allRounder' || s.skills.includes('harmonicWeight') : key === 'thorns' || key === 'dotBonus' ? (a[key] || 0) > 0 : true).map(key => <div key={key}>
        <span>{STAT_LABELS[key]}</span>
        <strong>{statDisplay(key, a[key])}</strong>
        </div>)}</div></details>
    <div className="derived-summary">
    <span>장비 드롭 확률<strong>{(dropRate(s) * 100).toFixed(1)}%</strong>
    </span>
    <span>골드 획득 배율<strong>×{goldMultiplier(s).toFixed(2)}</strong>
    </span>
    <span>경험치 획득 배율<strong>×{expMultiplier(s).toFixed(2)}</strong></span>
    <span>스킬 장착 AP<strong>{apUsed(s)} / {apCapacity(s)}</strong>
    </span>
    </div>
    <p className="footnote">명중·회피는 수치입니다. 실제 적중률은 상대의 회피·명중과 속도 차이로 1~99.5% 범위에서 정해지며, 물고기 도감에서 어종별로 확인할 수 있습니다. 치명타·보너스는 %, 치명 피해는 배율, 나머지는 고정 수치입니다.</p>
    </section>
    </div>
    <section className="panel build-guide">
    <h2>빌드의 출발점</h2>
    <div>
    <p>
    <b>작살 사냥꾼</b>근력 12 · 기민 10<br />물리 공격과 치명타, 관통.</p>
    <p>
    <b>조류 술사</b>지능 12 · 정신 10<br />마법 공격과 마나 순환.</p>
    <p>
    <b>산호 수호자</b>체질 12 · 근력 10<br />방어와 체력, 기절 제어.</p>
    </div>
    <small>모두 레벨 10부터 해금합니다. 이미 해금한 직업은 능력치를 재분배해도 다시 선택할 수 있습니다.</small>
    </section>
    </>;
}
export { Classes } from './classes-panel';
export { Skills } from './skills-panel';
export function Collection({ s, send, busy }: Props) {
    const player = stats(s), bookComplete = PROGRESSION.fishComplete;
    const complete = FISH.filter(f => (s.book[f.id] || 0) >= bookComplete).length, regions = completedRegions(s);
    return <>
    <Heading eyebrow="ARCHIVE & RESEARCH" title="기록이 힘이 되는 도감" description="개체도감으로 편성의 폭을 넓히고, 물건도감으로 다음 장비를 만날 확률을 높이세요."/>
    <div className="skill-resource-grid">
    <div className="panel">
    <small>개체도감 완성</small>
    <strong>{complete}<span> / {FISH.length}</span>
    </strong>
    <p>종별 연구는 골드 · 최종 10,000회 연구는 SP 1 · 지역 완성은 AP +1</p>
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
    <p className="footnote">카드마다 적 능력치 · 연구 진행도 · 다음 연구 보상을 나눠 표시합니다. 실제 적중률은 명중·회피 수치와 속도 차이를 반영한 확률입니다(1~99.5%).</p>
    <Tabs defaultValue="fish">
    <TabsList className="game-tabs">
    <TabsTrigger value="fish">개체도감</TabsTrigger>
    <TabsTrigger value="items">물건도감</TabsTrigger>
    </TabsList>
    <TabsContent value="fish">{STAGES.map(st => <section className="book-section" key={st.id}>
        <div className="section-title">
        <h2>{st.name}</h2>
        <span>{regions.some(r => r.id === st.id) ? '지역 연구 완료 · HP +20 · AP +1' : `${st.fish.filter(id => (s.book[id] || 0) >= bookComplete).length} / ${st.fish.length}종 완성`}</span>
        </div>
        <div className="book-grid">{st.fish.map(id => {
                const f = FISH.find(x => x.id === id)!, n = s.book[id] || 0, reward = bookReward(s, id), enemy = scaledEnemyStats(f, { tier: s.tide || 0 }), p = profile(id);
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
                <section className="book-block"><h4>적 능력치 <small>{s.tide ? `해역 난이도 ${s.tide} 적용 · 일반 낚시터 기준` : '해역 난이도 0 · 일반 낚시터 기준'}</small></h4>
                <div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span><span>명중 수치 {statDisplay('accuracy', enemy.accuracy || 0)}</span><span>회피 수치 {statDisplay('evasion', enemy.evasion || 0)}</span></div>
                <div className="book-stats book-matchup"><span className="positive">실제 적중률 · 내 공격 {Number((hitChance(player, enemy) * 100).toFixed(1))}%</span><span>적 공격 {Number((hitChance(enemy, player) * 100).toFixed(1))}%</span><span>포획 골드 {Math.floor(catchReward(f, s.tide || 0).gold * goldMultiplier(s))} G <small>(기본 {f.gold} · 해역·골드 보너스 적용)</small></span></div></section>
                <section className="book-block"><h4>연구 진행도</h4><Meter value={Math.min(n, reward.required || 200)} max={reward.required || 200} label={`누적 ${n.toLocaleString()}회 · 연구 ${reward.rank} / 4단계`}/>{n >= bookComplete && <small className="book-swarm">무리 사냥 ×5 해금{n >= SWARM_UNLOCK[100] ? ' · ×100 해금' : ` · ×100까지 ${(SWARM_UNLOCK[100] - n).toLocaleString()}마리`}</small>}</section>
                <section className="book-block"><h4>다음 연구 보상</h4><p>{reward.rank >= 4 ? '모든 연구 보상을 받았습니다.' : `${reward.required.toLocaleString()}회 포획 → ${reward.gold.toLocaleString()} G${reward.sp ? ' · SP +1' : ''}`}</p><button className={reward.ready ? 'gold-button' : 'secondary'} disabled={busy || !reward.ready} onClick={() => send({ type: 'claimBook', id })}>{reward.rank >= 4 ? '연구 완료' : reward.ready ? '연구 보상 받기' : '포획 수 부족'}</button></section>
                {s.stage === st.id && !s.dungeon && <button className="text-button" disabled={busy} onClick={() => send({ type: 'target', id })}>{s.target === id ? '집중 사냥 대상' : '이 물고기 집중 사냥'}</button>}</article>;
            })}</div>
        </section>)}<section className="book-section boss-book-section">
        <div className="section-title"><h2>던전 보스 도감</h2><span>{FISH.filter(f => f.boss && (s.book[f.id] || 0) >= bookComplete).length} / {FISH.filter(f => f.boss).length}종 완성</span></div>
        <div className="book-grid">{FISH.filter(f => f.boss).map(f => {
            const n = s.book[f.id] || 0, p = profile(f.id), enemy = scaledEnemyStats(f, { boss: true, wave: 4, tier: f.id === 'abyssSovereign' ? 3 : 0 }), reward = bookReward(s, f.id);
            return <article className={`panel book-card boss-book-card ${!n ? 'undiscovered' : ''}`} key={f.id}>
                <div className="book-icon"><Swords size={34}/><span>{n >= bookComplete ? '완성' : `${n} / ${bookComplete} 포획`}</span></div>
                <h3>{f.name} <small className="fish-rarity legendary">전설 보스</small></h3>
                <p>{f.lore}</p>
                <div className="fish-trait"><strong>{p.name}</strong><span>{p.hint}</span></div>
                <section className="book-block"><h4>적 능력치 <small>{f.id === 'abyssSovereign' ? '무한 심연 1층 최종 웨이브 기준' : '던전 최종 웨이브 기준'}</small></h4><div className="book-stats"><span>HP {enemy.hp}</span><span>물공 {enemy.attack}</span><span>마공 {enemy.magic || 0}</span><span>물방 {enemy.defense}</span><span>마방 {enemy.resist}</span><span>속도 {enemy.speed}</span></div><div className="book-stats"><span>스킬 {p.skills.map(id => SKILLS.find(sk => sk.id === id)?.name || id).join(' · ')}</span></div></section>
                <section className="book-block"><h4>연구 진행도</h4><Meter value={Math.min(n, reward.required || 200)} max={reward.required || 200} label={`누적 ${n.toLocaleString()}회 · 연구 ${reward.rank} / 4단계`}/></section>
                <section className="book-block"><h4>다음 연구 보상</h4><p>{reward.rank >= 4 ? '모든 연구 보상을 받았습니다.' : `${reward.required.toLocaleString()}회 포획 → ${reward.gold.toLocaleString()} G${reward.sp ? ' · SP +1' : ''}`}</p><button className={reward.ready ? 'gold-button' : 'secondary'} disabled={busy || !reward.ready} onClick={() => send({ type: 'claimBook', id: f.id })}>{reward.rank >= 4 ? '연구 완료' : reward.ready ? '연구 보상 받기' : '포획 수 부족'}</button></section>
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
