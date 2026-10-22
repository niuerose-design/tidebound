import { masteryXpFor, MASTERY_MAX, MASTERY_PERKS, bossUnits, lockedBossUnits, CORE_SHARD, shardChance, CODEX_LINK_KILLS, BOSS_UNLOCK_KILLS, nextSet, setById, setUnits, SET_MASTERY, setMasteryXpFor, quarterKey, RENOWN, renownRewardMult, leagueTierName } from '@/game/data/expedition';
import { BOSS_CORES } from '@/game/data/boss-core';
import { FoldSection, StatBar, ConfirmAction } from '@/components/ui/game';
import type { PanelProps } from '@/components/game/panel-props';
import { Head, Muted, Box } from './parts';
import type { State } from '@/game/types';

/** v3.413 성장 탭(expedition-screen.tsx 에서 분리): 원정 숙련 · 명성, 분기 세트 안내, 세트 숙련 · 리그, 본편 연결. */
type Send = PanelProps['send'];
type SetDef = ReturnType<typeof setById>;
type Pool = ReturnType<typeof setUnits>;

export function MasteryBox({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const mastery = s.expeditionMastery || { level: 1, xp: 0, total: 0 }, nextPerk = MASTERY_PERKS.find(p => p.level > mastery.level);
    const renown = s.expeditionRenown || 0, canRenown = mastery.level >= MASTERY_MAX && (!s.expedition || !!s.expedition.done);
    return <Box aria-label="원정 숙련">
        <Head level={3} title={<>원정 숙련 {mastery.level}{mastery.level >= MASTERY_MAX ? ' (최대)' : ''}{renown ? <small className="ml-1.5 text-xs font-semibold text-gold-ink">✨ 명성 {renown}</small> : null}</>} aside={mastery.level < MASTERY_MAX ? `${mastery.xp} / ${masteryXpFor(mastery.level, renown)}` : '완성'}/>
        <StatBar tone="exp" size="s" showText={false} value={mastery.level >= MASTERY_MAX ? 1 : mastery.xp} max={mastery.level >= MASTERY_MAX ? 1 : masteryXpFor(mastery.level, renown)}/>
        {canRenown ? <Box className="border-gold-ink/60 bg-gold-ink/10"><p className="leading-relaxed">숙련이 최대입니다. <b>원정 명성</b>을 올리면 숙련이 1로 돌아가고(특전은 그대로) 다음 주기의 경험치 요구가 +{Math.round(RENOWN.xpGrowth * 100)}%, 세계석 보상이 +{Math.round(RENOWN.rewardPer * 100)}%(명성 {RENOWN.rewardCap}까지) 늘어납니다. 명성 {RENOWN.titles.join(' · ')}에 칭호.</p><ConfirmAction className="justify-self-start" label={`✨ 원정 명성 ${renown + 1}로`} title="원정 명성을 올릴까요?" description={`숙련 ${MASTERY_MAX} → 1로 돌아갑니다. 특전 · 도감 · 기록은 그대로이고, 세계석 보상 ×${renownRewardMult(renown + 1).toFixed(2)}가 됩니다.`} disabled={busy} onConfirm={() => send({ type: 'expeditionRenown' })}/></Box> : renown ? <Muted>명성 {renown} · 세계석 보상 ×{renownRewardMult(renown).toFixed(2)} · 경험치 요구 ×{(1 + RENOWN.xpGrowth * renown).toFixed(1)}</Muted> : null}
        <Muted>판이 끝날 때 경험치를 받습니다: 승리마다 10, 막 보스마다 20, 완주하면 50. {nextPerk ? `다음 특전 Lv.${nextPerk.level} ${nextPerk.name}: ${nextPerk.desc}` : '모든 특전을 얻었습니다.'}</Muted>
        <FoldSection level={3} title="특전 목록" className="bg-surface-2"><ul className="grid gap-0.5 text-xs">{MASTERY_PERKS.map(p => <li key={p.id} className={p.level <= mastery.level ? 'text-ink-1' : 'text-ink-3'}>{p.level <= mastery.level ? <span className="text-ok">✓ </span> : null}Lv.{p.level} <b>{p.name}</b> · {p.desc}</li>)}</ul></FoldSection>
    </Box>;
}

export function SetBanner({ curSet, upcoming, now }: { curSet: SetDef; upcoming: ReturnType<typeof nextSet>; now: number }) {
    return <Box className="border-[#3a4a6a] bg-gradient-to-br from-surface-1 to-[#1b1733]" aria-label="분기 세트"><Head level={3} title={`${curSet.icon} ${curSet.name} 세트`} aside={`${now ? quarterKey(now) : ''}${upcoming ? ` · 다음: ${upcoming.icon} ${upcoming.name}(${upcoming.from})` : ''}`}/><Muted>{curSet.desc}</Muted></Box>;
}

export function SetMasteryBox({ s, curSet, sm, now }: { s: State; curSet: SetDef; sm: { level: number; xp: number }; now: number }) {
    return <Box aria-label="세트 숙련"><Head level={3} title={`${curSet.icon} ${curSet.name} 세트`} aside={now ? quarterKey(now) : ''}/><div className="flex items-baseline justify-between gap-2"><b className="text-s">세트 숙련 {sm.level}{sm.level >= SET_MASTERY.max ? ' (완성)' : ''}</b><small className="text-ink-3">{sm.level < SET_MASTERY.max ? `${sm.xp} / ${setMasteryXpFor(sm.level)}` : '세트 칭호 획득'}</small></div>
        <StatBar tone="accent" size="s" showText={false} value={sm.level >= SET_MASTERY.max ? 1 : sm.xp} max={sm.level >= SET_MASTERY.max ? 1 : setMasteryXpFor(sm.level)}/>
        <p className="text-xs text-ink-2">주간 리그 · <b className="text-gold-ink">{leagueTierName(s.expeditionLeague?.tier)}</b>{s.expeditionLeague?.last ? ` · 지난주 ${s.expeditionLeague.last.rank}위/${s.expeditionLeague.last.size}명 · 세계석 +${s.expeditionLeague.last.pearls}` : ' · 이번 주 첫 전투 때 같은 등급 8명 조에 들어갑니다'} <small className="text-ink-3">(순위 화면 ‘원정 · 주간 리그’ · 1~2위 승급 · 7~8위 강등)</small></p>
        <Muted>세트마다 처음부터. 숙련 경험치와 같이 오르고 {Object.entries(SET_MASTERY.rewards).map(([lv, p]) => `${lv}에 세계석 ${p}`).join(' · ')}, 20이면 칭호 {curSet.icon} {curSet.name}의 원정대.</Muted></Box>;
}

export function LinkBox({ s, pool, chosenDiff }: { s: State; pool: Pool; chosenDiff: number }) {
    const locked = lockedBossUnits(s.book), shards = s.expeditionShards || {};
    return <FoldSection level={3} defaultOpen title="본편 연결" summary={`보스 유닛 ${bossUnits(pool).filter(u => !locked.has(u.id)).length}/${bossUnits(pool).length} 해금 · 코어 조각 ${Object.values(shards).reduce((a, n) => a + n, 0)}`}>
        <ul className="grid list-disc gap-1.5 pl-4 text-xs leading-relaxed text-ink-2 [&_b]:text-ink-1">
            <li><b>보스 유닛 해금</b> · 본편에서 그 보스를 {BOSS_UNLOCK_KILLS}번 이상 잡아야 상점에 나옵니다(웨이브 · 고스트에는 그대로 나옴). {bossUnits(pool).map(u => <span key={u.id} className={`exp-link-chip${locked.has(u.id) ? ' locked' : ''}`} title={locked.has(u.id) ? `본편 ${u.name} 처치 ${s.book[u.monster] || 0}/${BOSS_UNLOCK_KILLS}` : `본편 처치 ${s.book[u.monster] || 0}`}>{locked.has(u.id) ? '🔒 ' : '✓ '}{u.name}</span>)}</li>
            <li><b>보스 코어 조각</b> · 막 보스 · 심연 보스를 이기면 {Math.round(shardChance(chosenDiff, false) * 100)}%(심연 +{Math.round(CORE_SHARD.abyssBonus * 100)}%p, 난이도마다 +{Math.round(CORE_SHARD.perDifficulty * 100)}%p)로 조각. {CORE_SHARD.per}개면 본편 보스 코어(없으면 획득 · 있으면 각성). 머쉬맘 → {BOSS_CORES.grotto.name}, 자쿰 → {BOSS_CORES.ventCathedral.name}, 칠흑 보스 → 던전 코어 7종 중 무작위. {Object.keys(shards).length ? Object.entries(shards).filter(([, n]) => n > 0).map(([id, n]) => <span key={id} className="exp-link-chip">{BOSS_CORES[id]?.name || id} {n}/{CORE_SHARD.per}</span>) : <small className="text-ink-3">아직 조각 없음</small>}</li>
            <li><b>도감 연결</b> · 유닛 도감이 동 · 은 · 금에 닿으면 그 유닛의 본편 몬스터 처치 수 +{CODEX_LINK_KILLS.join(' · +')}(연구 단계가 빨라집니다). 지금까지 {Object.keys(s.expeditionCodexLinked || {}).length}종 연결.</li>
        </ul>
    </FoldSection>;
}
