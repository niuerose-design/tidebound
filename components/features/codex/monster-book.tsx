'use client';
/** v3.382 개체도감: 특별 도감 · 지역 → 장소 → 몬스터 카드 · 던전 보스 · 칠흑의 보스. 닫힌 구역은 마운트하지 않습니다(FoldSection). */
import { Swords } from 'lucide-react';
import type { State, Stats } from '@/game/types';
import { Button } from '@/components/ui/button';
import { FoldSection, RarityTag, TierBadge, formatExact } from '@/components/ui/game';
import { MonsterArt } from '@/components/game/art';
import { OnyxArt } from '@/components/game/onyx-art';
import { MONSTERS, STAGES, BASE_STAGES, REGIONS, regionMonsters, monsterById } from '@/game/data/world';
import { MIMIC, MIMIC_STAGE_CAP_INDEX, mimicChance, specialLuck } from '@/game/data/mimic';
import { EXP_NURI, nuriChance } from '@/game/data/exp-nuri';
import { ESSENCE_SLIME, slimeChance, slimeBundle } from '@/game/data/essence-slime';
import { KING, KING_KINDS } from '@/game/data/king';
import { STARFORCE } from '@/game/data/starforce';
import { PROGRESSION } from '@/game/data/progression';
import { goldMultiplier, expMultiplier } from '@/game/systems/stats';
import { profile, scaledEnemyStats, abyssEnemyStats } from '@/game/data/encounters';
import { ONYX, ONYX_BOSSES, ONYX_ITEMS, ONYX_SET, ONYX_TOTAL, ONYX_CORE_ID, onyxCollected, onyxSpawnPity } from '@/game/data/onyx';
import { BOSS_CORES, BOSS_CORE_RULES } from '@/game/data/boss-core';
import { onyxDropName, onyxDropRank } from '@/game/systems/onyx-grant';
import { affixDef } from '@/game/data/gear';
import { ownedItems } from '@/game/systems/equipment';
import { abyssReference, stageField } from '@/game/systems/encounter';
import { bookRevealed, regionResearchStage } from '@/game/systems/book';
import { REGION_RESEARCH, REGION_RESEARCH_FROM, REGION_RESEARCH_MAX } from '@/game/data/book-traits';
import { regionSignature } from '@/game/data/variants';
import { bookPending } from '@/game/systems/progression';
import { BookCard, CardHead, Trait, Lore, LockedInfo, EcologyLine, VariantMarks, ResearchBlock, EnemyInfo, type Send } from './parts';

const COMPLETE = PROGRESSION.monsterComplete;
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
const rarityKeyOf = (r?: string) => r === 'rare' ? 'rare' : r === 'epic' ? 'epic' : r === 'legendary' ? 'legendary' : null;

export function MonsterBook({ s, send, busy, player, secret }: { s: State; send: Send; busy: boolean; player: Stats; secret: boolean }) {
    return <div className="grid gap-3">
        <SpecialBook s={s} secret={secret}/>
        {REGIONS.map(region => { const ids = regionMonsters(region), sig = regionSignature(region), here = STAGES.some(x => x.region === region && x.id === s.stage), done = ids.filter(id => (s.book[id] || 0) >= COMPLETE).length, stage = regionResearchStage(s, region), r = REGION_RESEARCH[region];
            return <FoldSection key={region} title={region} defaultOpen={here} summary={`${done} / ${ids.length}종 · 지역 연구 ${stage} / ${REGION_RESEARCH_MAX}`}
                extra={<>{sig.length ? `대표 변종 ${sig.map(v => `${v.mark} ${v.name}`).join(' · ')} · ` : ''}{r ? (stage ? <span className="text-ok">지역 연구 {stage} / {REGION_RESEARCH_MAX}단계 · {r.first.label} · {r.label} ×{stage} 적용 중</span> : `지역 연구 0 / ${REGION_RESEARCH_MAX}단계`) : null}{r && stage < REGION_RESEARCH_MAX && ` · 다음: 지역 몬스터 전부 연구 ${REGION_RESEARCH_FROM + stage}단계 → ${stage ? `${r.label} 한 번 더` : `첫 보너스 ${r.first.label} · ${r.label}`}`}</>}>
                {BASE_STAGES.filter(st => st.region === region).map(st => { const done = st.monsters.filter(id => (s.book[id] || 0) >= COMPLETE).length, pending = st.monsters.reduce((a, id) => a + bookPending(s, id).ranks.length, 0);
                    return <FoldSection key={st.id} level={3} title={st.place} defaultOpen={st.id === s.stage} summary={`${done} / ${st.monsters.length}종 완성`} className="bg-surface-2/60"
                        extra={<>{done === st.monsters.length ? '장소 연구 완료 · 업적 장착 AP +1 적용 중' : `장소 연구 ${done} / ${st.monsters.length}종 완성 · 완성 보상 업적 장착 AP +1`}{pending > 0 && <b className="text-ok"> · 미수령 {pending}단계</b>}</>}>
                        <Grid>{st.monsters.map(id => <StageMonsterCard key={id} s={s} send={send} busy={busy} player={player} stageId={st.id} id={id}/>)}</Grid>
                    </FoldSection>; })}
            </FoldSection>; })}
        <BossBook s={s} send={send} busy={busy} player={player}/>
        <OnyxBook s={s} secret={secret}/>
    </div>;
}

function StageMonsterCard({ s, send, busy, player, stageId, id }: { s: State; send: Send; busy: boolean; player: Stats; stageId: string; id: string }) {
    const f = monsterById(id)!, n = s.book[id] || 0, tide = s.dungeon ? 0 : (s.tide || 0), live = stageField(s, stageId, id, tide), enemy = live.foe, p = profile(id), revealed = bookRevealed(s, id), rk = rarityKeyOf(f.rarity);
    return <BookCard undiscovered={!n}>
        <CardHead art={<MonsterArt id={id} size={56}/>} title={f.name} count={n >= COMPLETE ? '완성 · 지역 연구에 반영' : `${n} / ${COMPLETE} 처치`}
            tags={<>{rk && <RarityTag rarity={rk}/>}{f.minTier ? <TierBadge tier={f.minTier} label={`차수 ${f.minTier}+`}/> : null}<VariantMarks s={s} id={id}/></>}/>
        <Lore>{f.lore}</Lore>
        {revealed ? <Trait title={p.name}>{p.hint}</Trait> : <LockedInfo n={n}/>}
        <EcologyLine s={s} id={id}/>
        <ResearchBlock s={s} id={id} send={send} busy={busy} swarm/>
        {revealed && <EnemyInfo player={player} enemy={enemy} note={`사냥터 난이도 ${tide} 기준 · Lv.${live.level}${live.level > f.level ? ` (기본 Lv.${f.level}에서 상승)` : ''}`} skills={f.level >= 5 ? p.skills : []}
            extra={[{ key: '처치 골드', value: `${formatExact(Math.floor(live.gold * goldMultiplier(s)))} G`, hint: `기본 ${f.gold} · 난이도 · 골드 보너스 적용` }, { key: '처치 경험치', value: formatExact(Math.floor(live.exp * expMultiplier(s))), hint: `기본 ${f.exp} · 난이도 · 경험치 배율 적용` }]}/>}
        {s.stage === stageId && !s.dungeon && <Button type="button" size="sm" variant={s.target === id ? 'default' : 'outline'} disabled={busy} onClick={() => send({ type: 'target', id })}>{s.target === id ? '집중 사냥 대상' : '이 몬스터 집중 사냥'}</Button>}
    </BookCard>;
}

/** 특별 도감: 까미 · 누리 · 정수의 슬라임 · 대왕 3종. */
function SpecialBook({ s, secret }: { s: State; secret: boolean }) {
    const n = s.book[MIMIC.id] || 0, m = s.book[EXP_NURI.id] || 0, sl = s.book[ESSENCE_SLIME.id] || 0, kings = KING_KINDS.map(k => s.book[KING[k].id] || 0), luck = specialLuck(s), tier = s.tide || 0, bundle = slimeBundle(tier);
    const seen = [n ? `까미 ${n}` : '', m ? `누리 ${m}` : '', sl ? `슬라임 ${sl}` : '', ...KING_KINDS.map((k, i) => kings[i] ? `${KING[k].name} ${kings[i]}` : '')].filter(Boolean);
    const special = (got: number) => <RarityTag rarity="legendary" label={got ? '특별' : '???'}/>;
    return <FoldSection title="특별 도감" summary={seen.length ? seen.join(' · ') : '아직 만나지 못함'}>
        <Grid>
            <BookCard undiscovered={!n}>
                <CardHead art={<MonsterArt id={MIMIC.id} size={56}/>} title={n ? '숙련의 까미' : '???'} tags={special(n)} count={n ? `${n}회 처치` : '미발견'}/>
                <Lore>{n ? monsterById(MIMIC.id)!.lore : `사냥터 난이도 ${MIMIC.minTier} 이상에서 아주 드물게 나타난다고 합니다.`}</Lore>
                <Trait title="숙련 로또">잡으면 현재 직업과 장착 스킬의 숙련이 한꺼번에 오릅니다: {MIMIC.tiers.map(t => `${t.label} ${t.mastery.toLocaleString()}${secret ? '' : ` (${Math.round(t.chance * 100)}%)`}`).join(' · ')}.<br/>
                    {secret ? '출현 확률은 공개하지 않습니다(난이도가 높고 뒤쪽 사냥터일수록 자주 나타납니다).' : <>출현마다 ({(MIMIC.chance * 100).toFixed(2)}% + 난이도 1단계당 {(MIMIC.chancePerTier * 100).toFixed(2)}%p, 난이도 {MIMIC.tierCap}까지) × 사냥터 배율(첫 사냥터 ×1, 한 곳 뒤로 갈 때마다 +{MIMIC.stageStep}, {STAGES[MIMIC_STAGE_CAP_INDEX]?.name ?? ''}까지) · 지금(행운의 편지 포함) {tier >= MIMIC.minTier ? `${(mimicChance(tier, Math.max(0, STAGES.findIndex(x => x.id === s.stage))) * luck * 100).toFixed(2)}%` : '난이도 부족'}.</>}</Trait>
            </BookCard>
            <BookCard undiscovered={!m}>
                <CardHead art={<MonsterArt id={EXP_NURI.id} size={56}/>} title={m ? '경험의 누리' : '???'} tags={special(m)} count={m ? `${m}회 처치` : '미발견'}/>
                <Lore>{m ? monsterById(EXP_NURI.id)!.lore : `사냥터 난이도 ${EXP_NURI.minTier} 이상, Lv.${EXP_NURI.minLevel}이 넘은 모험가 앞에 아주 드물게 나타난다고 합니다.`}</Lore>
                <Trait title="경험치 로또">잡으면 지금 레벨에 필요한 경험치의 일부를 한 번에 얻습니다(경험치 배율 · 서약과 무관): {EXP_NURI.tiers.map(t => `${t.label} ${Math.round(t.pct * 100)}%${secret ? '' : ` (${Math.round(t.chance * 100)}%)`}`).join(' · ')}.<br/>
                    {secret ? '출현 확률은 공개하지 않습니다(난이도가 높을수록 자주 나타납니다).' : <>출현마다 {(EXP_NURI.chance * 100).toFixed(2)}% + 난이도 1단계당 {(EXP_NURI.chancePerTier * 100).toFixed(2)}%p · 지금(행운의 편지 포함) {tier >= EXP_NURI.minTier ? `${(nuriChance(tier) * luck * 100).toFixed(2)}%` : '난이도 부족'}.</>}</Trait>
            </BookCard>
            <BookCard undiscovered={!sl}>
                <CardHead art={<MonsterArt id={ESSENCE_SLIME.id} size={56}/>} title={sl ? '정수의 슬라임' : '???'} tags={special(sl)} count={sl ? `${sl}회 처치` : '미발견'}/>
                <Lore>{sl ? monsterById(ESSENCE_SLIME.id)!.lore : `사냥터 난이도 ${ESSENCE_SLIME.minTier} 이상, Lv.${ESSENCE_SLIME.minLevel}이 넘은 모험가 앞에 아주 드물게 나타난다고 합니다.`}</Lore>
                <Trait title="정수 로또">잡으면 이 사냥터 난이도의 정수 묶음(1 + ⌊난이도 ÷ {ESSENCE_SLIME.bundleTiers}⌋, 지금 {bundle})에 배수를 곱해 정수를 얻습니다: {ESSENCE_SLIME.tiers.map(t => `${t.label} ×${t.mul}${secret ? '' : ` (${Math.round(t.chance * 100)}%)`}`).join(' · ')}.<br/>
                    {secret ? '출현 확률은 공개하지 않습니다(난이도가 높을수록 자주 나타납니다).' : <>출현마다 {(ESSENCE_SLIME.chance * 100).toFixed(2)}% + 난이도 1단계당 {(ESSENCE_SLIME.chancePerTier * 100).toFixed(2)}%p · 지금(행운의 편지 포함) {tier >= ESSENCE_SLIME.minTier ? `${(slimeChance(tier) * luck * 100).toFixed(2)}%` : '난이도 부족'}.</>}</Trait>
            </BookCard>
            {KING_KINDS.map((k, i) => { const def = KING[k], got = kings[i], base = monsterById(def.base)!, baseKills = s.book[def.base] || 0, ready = baseKills >= KING.minBookKills;
                const reward = k === 'mimic' ? `직업 · 장착 스킬 숙련 +${(MIMIC.tiers[2].mastery * KING.rewardMul).toLocaleString()}` : k === 'nuri' ? `경험치 Lv 필요량의 ${Math.round(EXP_NURI.tiers[2].pct * KING.rewardMul * 100)}% 또는 이 사냥터 출현 ${Math.round(EXP_NURI.tiers[2].pct * KING.rewardMul * EXP_NURI.encountersPerPct)}회분 중 큰 쪽` : `정수 묶음 ×${ESSENCE_SLIME.tiers[2].mul * KING.rewardMul}(지금 ${(bundle * ESSENCE_SLIME.tiers[2].mul * KING.rewardMul).toLocaleString()})`;
                const bodyHp = (k === 'mimic' ? MIMIC.hp : k === 'nuri' ? EXP_NURI.hp : ESSENCE_SLIME.hp) * KING.hp;
                return <BookCard key={def.id} undiscovered={!got}>
                    <CardHead art={<MonsterArt id={def.id} size={56} boss/>} title={got ? def.name : '???'} tags={<RarityTag rarity="legendary" label="대왕"/>} count={got ? `${got}회 처치` : '미발견'}/>
                    <Lore>{got ? monsterById(def.id)!.lore : `${base.name}을(를) ${KING.minBookKills}마리 잡은 사냥꾼 앞에, ${base.name}이(가) 나올 자리에 아주 드물게 대신 나타난다고 합니다.${ready ? '' : ` (지금 ${baseKills} / ${KING.minBookKills})`}`}</Lore>
                    <Trait title="확정 대박 · 도망">잡으면 {base.name} ‘대’ 당첨의 ×{KING.rewardMul}이 확정: {reward}.<br/>{secret ? `${base.name} 출현 중 일부가 대왕으로 바뀝니다(비율은 공개하지 않음)` : `${base.name} 출현 ${Math.round(1 / KING.share)}번 중 1번이 대왕으로 바뀝니다`} · {base.name} {KING.minBookKills}마리 처치 뒤부터 · 호루라기로는 부를 수 없음 · 체력은 {base.name}의 ×{KING.hp}(그 사냥터 최강 몬스터의 ×{bodyHp}), 공격은 최강 몬스터의 ×{KING.attack} · {KING.turns}턴({Math.round(KING.turns * 2 / 60)}분) 안에 못 잡으면 달아납니다.</Trait>
                </BookCard>; })}
        </Grid>
    </FoldSection>;
}

function BossBook({ s, send, busy, player }: { s: State; send: Send; busy: boolean; player: Stats }) {
    const bosses = MONSTERS.filter(f => f.boss), done = bosses.filter(f => (s.book[f.id] || 0) >= COMPLETE).length;
    return <FoldSection title="던전 보스 도감" summary={`${done} / ${bosses.length}종 완성`}>
        <Grid>{bosses.map(f => { const n = s.book[f.id] || 0, p = profile(f.id), enemy = f.id === 'abyssSovereign' ? abyssEnemyStats(f, abyssReference(), 1, { boss: true, wave: 4 }) : scaledEnemyStats(f, { boss: true, wave: 4, tier: 0 }), revealed = bookRevealed(s, f.id);
            return <BookCard key={f.id} undiscovered={!n}>
                <CardHead art={<div className="grid size-14 place-items-center text-ink-2"><Swords size={30}/></div>} title={f.name} tags={<><RarityTag rarity="legendary" label="전설 보스"/><VariantMarks s={s} id={f.id}/></>} count={n >= COMPLETE ? '완성' : `${n} / ${COMPLETE} 처치`}/>
                <Lore>{f.lore}</Lore>
                {revealed ? <Trait title={p.name}>{p.hint}</Trait> : <LockedInfo n={n}/>}
                <EcologyLine s={s} id={f.id}/>
                <ResearchBlock s={s} id={f.id} send={send} busy={busy}/>
                {revealed && <EnemyInfo player={player} enemy={enemy} note={f.id === 'abyssSovereign' ? '무릉도장 1층 최종 웨이브 기준' : '던전 최종 웨이브 기준'} skills={p.skills}/>}
            </BookCard>; })}</Grid>
    </FoldSection>;
}

function OnyxBook({ s, secret }: { s: State; secret: boolean }) {
    const got = onyxCollected(s);
    return <FoldSection title="칠흑의 보스" summary={`${got} / ${ONYX_TOTAL} 칠흑 보유`}>
        <p className="text-s leading-relaxed text-ink-3">{secret
            ? <>무리 서식지에서 드물게 나타나는 지역 보스입니다. 집중 사냥 대상이 될 수 없고 {ONYX.turns}턴 안에 못 잡으면 떠납니다. 처치하면 낮은 확률로 그 보스의 칠흑 장신구(태초 · 고유 옵션 1줄 + 최고 굴림 무작위 {ONYX.affixes}줄 · 위력은 골드로 레벨을 올려 키움 · 강화 파괴 시 {STARFORCE.relicResetStar}성으로)를 받고(오래 못 얻으면 반드시 받음), 장신구는 환생해도 남습니다(종당 1개, 이미 있으면 세계석 +{ONYX.duplicatePearls}, 같은 확률로 각성 +1 · 최대 {ONYX.awakenMax}단계).</>
            : <>무리 서식지에서만 출현마다 {Math.round(ONYX.chance * 1000) / 10}%(난이도 50마다 +100%, {onyxSpawnPity(s).toLocaleString()}회 못 보면 확정{onyxSpawnPity(s) < ONYX.pity ? ' · 칠흑 추적' : ''})로 나타나는 지역 보스입니다. 집중 사냥 대상이 될 수 없고 {ONYX.turns}턴 안에 못 잡으면 떠납니다. 처치하면 {Math.round(ONYX.drop * 1000) / 10}%로 그 보스의 칠흑 장신구(태초 · 고유 옵션 1줄 + 최고 굴림 무작위 {ONYX.affixes}줄 · 강화 파괴 시 {STARFORCE.relicResetStar}성으로)를 받고({ONYX.dropPity}번째 연속 미획득 격파는 확정), 장신구는 환생해도 남습니다(종당 1개, 이미 있으면 세계석 +{ONYX.duplicatePearls} · 각성 +1, 최대 {ONYX.awakenMax}단계).</>}</p>
        <ul className="flex flex-wrap gap-2 text-xs">{ONYX_SET.map(b => <li key={b.count} className={`rounded-s border px-2 py-1 ${got >= b.count ? 'border-accent/60 bg-accent-soft text-ink-1' : 'border-line text-ink-3'}`}><b>{b.count}종</b> {b.label}{got >= b.count ? ' ✓' : ''}</li>)}</ul>
        <Grid>{ONYX_BOSSES.map(b => { const f = monsterById(b.id)!, n = s.onyxBook?.[b.id] || 0, rank = onyxDropRank(s, b), have = rank >= 0, core = 'core' in b.drop ? BOSS_CORES[b.drop.core] : undefined, charm = 'charm' in b.drop ? ONYX_ITEMS.find(x => x.id === (b.drop as { charm: string }).charm) : undefined;
            const desc = core ? core.desc : charm ? affixDef(charm.affix.id)?.description || charm.desc : '', artId = core ? ONYX_CORE_ID : charm?.id || b.id;
            const own = charm && have ? ownedItems(s).find(x => x?.onyx === charm.id) : undefined, worn = core ? s.coreSlot === ONYX_CORE_ID : !!own && Object.values(s.equipment).some(x => x?.id === own.id);
            return <BookCard key={b.id} undiscovered={!n}>
                <CardHead art={<div className="flex items-center gap-1"><MonsterArt id={b.id} size={48} boss/><OnyxArt id={artId} size={40} className={have ? 'owned' : ''}/></div>} title={b.name} tags={<RarityTag rarity="primal" label={`${b.region} 서식지`}/>} count={n ? `${n}회 격파` : '미발견'}/>
                <Lore>{f.lore}</Lore>
                <Trait title={`${have ? '✓ ' : ''}${onyxDropName(b)}${core ? ' (칠흑 보스코어)' : ''}${have ? ` · 각성 ${rank}/${ONYX.awakenMax}` : ''}`} tone={have ? 'ok' : undefined}>{desc}{have && <div className="mt-1 text-xs text-ink-3">{worn ? (core ? '보스 코어 칸에 장착(효과 전부)' : '착용 중(고유 옵션 전부)') : `공명 중(${core ? '효과' : '고유 옵션'} ${Math.round((core ? BOSS_CORE_RULES.resonance : ONYX.resonance) * 100)}%)`}{rank ? ` · 각성 +${Math.round(rank * ONYX.awakenStep * 100)}%` : ''}</div>}</Trait>
            </BookCard>; })}</Grid>
    </FoldSection>;
}
