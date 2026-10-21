'use client';
/** v3.398 환생(새 토대): 환생 준비(승천 · 서약 · 승천 편의 · 환생 카드 · 장부) · 세계석 연구 · 환생 유물 · 환생 기록. 서버 행동(rebirth · salvageMode · buyRelic · resetData 등)은 전과 같습니다. */
import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SectionHeader, StatBar, ConfirmAction, FoldSection, NumberTicker, formatExact } from '@/components/ui/game';
import { rebirthExperience, rebirthMemory } from '@/game/data/long-term';
import { RESEARCH_TABS, RELICS, RELIC_GROWTH, HEIR_GROWTH, heirFactor, heirPower, ECONOMY, startingLevel, inventoryCap, type ResearchTab } from '@/game/data/economy';
import { PROGRESSION, STAT_LABELS, statDeltaDisplay } from '@/game/data/progression';
import { STARFORCE, starLabel } from '@/game/data/starforce';
import { SLOTS } from '@/game/data/balance';
import { rebirthRewardParts, tailwindActive, tailwindExp, tailwindLevel, xpWall, rebirthLevel, rebirthReward, rebirthAP, tideLimit } from '@/game/systems/meta';
import { permanentExpBonus } from '@/game/systems/stats';
import { apCapacity, researchAP } from '@/game/systems/progression';
import { breathBonus } from '@/game/systems/vows';
import { salvagePreview } from '@/game/systems/actions/lifecycle';
import { ASCENSION } from '@/game/data/ascension';
import { SlotIcon } from '@/components/game/shared';
import { BonusList } from '@/components/features/inventory/parts';
import { cn } from '@/lib/utils';
import { Card, Note, Ledger } from './parts';
import { ResearchTabView } from './research';
import { VowPanel } from './vows';
import { AutoRebirthPanel, AutoFollowPanel, RotationPanel, ResearchPlanPanel, showAutomation } from './automation';
import { AscensionPanel } from './ascension';
import { RebirthHistory } from './rebirth-history';

type Send = (a: Action) => void;
const fmt = formatExact;
const TABS = [['prepare', '환생 준비'], ['research', '세계석 연구'], ['relics', '환생 유물'], ['history', '환생 기록']] as const;
const Tile = ({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) => <div className="flex items-center gap-3 rounded-l border border-line bg-surface-2 p-3 shadow-1">{icon && <span className="text-accent" aria-hidden="true">{icon}</span>}<div className="grid min-w-0 flex-1 gap-0.5"><span className="text-xs text-ink-3">{label}</span><span className="flex items-baseline gap-1 font-num text-l font-semibold">{children}</span></div></div>;

export function RebirthScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const [tab, setTab] = useState<typeof TABS[number][0]>('prepare');
    const [researchTab, setResearchTab] = useState<ResearchTab>('combat');
    const required = rebirthLevel(s);
    const reward = rebirthReward({ ...s, level: Math.max(s.level, required) }), permanentExp = 1 + permanentExpBonus(s);
    const breathExtra = s.vows?.breath ? Math.floor(reward * breathBonus(s)) : 0;
    const apGain = s.rebirths < ECONOMY.rebirthAPCap ? 1 : 0, salvage = salvagePreview(s);
    const projected = { ...s, level: Math.max(s.level, required) };
    const parts = rebirthRewardParts(projected), memoryNow = Number(((rebirthMemory(s.rebirths) - 1) * 100).toFixed(1)), memoryNext = Number(((rebirthMemory(s.rebirths + 1) - 1) * 100).toFixed(1));
    const lifeText = `순풍 · 다음 생 Lv.${Math.max(s.level, required)}(이번 생 최고 레벨)까지 경험치 +${Math.round(tailwindExp(s) * 100)}%(합연산) · 그 너머는 레벨마다 필요 경험치 ×${xpWall(s).growth.toFixed(2)}`;
    const capped = s.rebirths >= ASCENSION.rebirthCap, ready = s.level >= required;
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="REBIRTH & LEGACY" title="환생" description="이번 모험을 마치고, 다음 생에 남길 힘을 선택하세요."/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={<RefreshCw size={18}/>} label="누적 환생"><NumberTicker value={s.rebirths}/><span className="text-xs text-ink-3">회</span></Tile>
            <Tile icon={<Sparkles size={18}/>} label="보유 세계석"><NumberTicker value={s.pearls}/><span className="text-xs text-ink-3">개</span></Tile>
            <Tile label="영구 경험치 배율">×{permanentExp.toFixed(2)}</Tile>
            <Tile label="현재 장착 AP">{apCapacity(s)}<span className="text-xs text-ink-3">환생 +{rebirthAP(s)} · 연구 +{researchAP(s)}</span></Tile>
        </div>
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}><TabsList className="h-auto flex-wrap">{TABS.map(([id, name]) => <TabsTrigger key={id} value={id} className="min-h-9 pointer-coarse:min-h-11">{name}</TabsTrigger>)}</TabsList></Tabs>
        {tab === 'history' && <RebirthHistory s={s}/>}
        {tab === 'prepare' && <>
            <AscensionPanel s={s} send={send} busy={busy}/>
            {s.rebirths > 0 && <VowPanel s={s} send={send} busy={busy}/>}
            {showAutomation(s) && <div className="grid gap-3 lg:grid-cols-3"><AutoRebirthPanel s={s} send={send} busy={busy}/><AutoFollowPanel s={s} send={send} busy={busy}/><RotationPanel s={s} send={send} busy={busy}/></div>}
            <Card className={cn(ready && !capped && 'border-accent/60')}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                    <div className="grid gap-2"><span className="eyebrow">{s.rebirths + 1}번째 환생</span><h2 className="font-display text-l font-bold">{capped ? `환생은 ${ASCENSION.rebirthCap}회까지입니다. 위의 승천으로 다시 오를 수 있습니다` : ready ? '다음 모험을 시작할 준비가 됐습니다' : `Lv.${required}에 새로운 모험이 열립니다`}</h2><StatBar value={Math.min(s.level, required)} max={required} tone="exp" label="레벨 조건"/>
                        {s.rebirths > 0 && <Note>이번 생 효과: {tailwindActive(s) ? `순풍 · Lv.${tailwindLevel(s)}(직전 생 최고 레벨)까지 경험치 +${Math.round(tailwindExp(s) * 100)}%(합연산)` : `역풍 · 요구 레벨 너머 필요 경험치 레벨마다 ×${xpWall(s).growth.toFixed(2)}`}</Note>}</div>
                    <div className="grid justify-items-center gap-2 rounded-m bg-surface-1 p-4 text-center"><span className="text-xs text-ink-3">{ready ? '이번에 받을 세계석' : '환생 조건 달성 시 예상 세계석'}</span><strong className="inline-flex items-center gap-1 font-num text-2xl text-accent"><Sparkles size={24}/>{fmt(reward + breathExtra)}</strong>
                        <ConfirmAction label="환생하기" variant="default" className="bg-accent text-accent-ink hover:bg-accent/90" title="다음 모험을 시작할까요?" description="아래 ‘초기화되는 것’이 처음 상태로 돌아가고, ‘유지되는 것’은 그대로 남습니다. 진행 중인 전투·던전은 종료됩니다." confirmLabel="환생" disabled={busy || !ready || capped} onConfirm={() => send({ type: 'rebirth' })}/>
                    </div>
                </div>
                <Ledger gain={[
                    [`세계석 +${fmt(reward + breathExtra)}`, `레벨 ${parts.level} · 환생 횟수 ${parts.count}${breathExtra ? ` · 서약 +${breathExtra}` : ''}`],
                    ['환생 영구 보너스: 체력·마나·물리/마법 공격·물리/마법 방어', `현재 +${memoryNow}% → 환생 후 +${memoryNext}%`],
                    ['영구 경험치 획득', `현재 ×${permanentExp.toFixed(2)} → 환생 후 ×${(permanentExp - rebirthExperience(s.rebirths) + rebirthExperience(s.rebirths + 1)).toFixed(2)}`],
                    [`장착 AP ${apGain ? '+1' : '+0'}`, apGain ? `환생 AP ${rebirthAP(s)} → ${rebirthAP(s) + 1}` : `환생 AP 최대치(${ECONOMY.rebirthAPCap}) 도달`],
                    ['다음 생 효과', lifeText],
                    ...(salvage.rate > 0 ? [[`청산 · 장비 ${salvage.count}개 ${salvage.mode === 'dismantle' ? `분해 → 정수 +${fmt(salvage.essence)}` : `판매 → 시작 골드 +${fmt(salvage.gold)} G`}`, <>효율 {Math.round(salvage.rate * 100)}% · <Button type="button" size="xs" variant="link" className="h-auto p-0 text-xs" disabled={busy} onClick={() => send({ type: 'salvageMode', value: salvage.mode === 'dismantle' ? 'sell' : 'dismantle' })}>{salvage.mode === 'dismantle' ? '판매로 바꾸기' : '분해로 바꾸기'}</Button></>] as [React.ReactNode, React.ReactNode]] : []),
                    [`사냥터 난이도 ${tideLimit({ ...s, rebirths: s.rebirths + 1 })}까지 선택`, `다음 생 Lv.${startingLevel(s)}부터 시작${startingLevel(s) > 1 ? ` (전생의 기억 · 능력치 포인트 +${(startingLevel(s) - 1) * PROGRESSION.statPerLevel})` : ''}`],
                ]} kept={['세계석 · 세계석 연구 · 몬스터와 장비 도감', '스킬 해금·계승·성장·숙련 · 보유 SP · 장기 목표', '직업 해금과 숙련 기록', '환생 유물 · 유물 강화·옵션·보관 위치', '길드 소속 · 던전 정복 기록 · 무릉도장 최고 층', '랭킹 점수와 전적']}
                    reset={[`레벨·경험치 → Lv.${startingLevel(s)} · 현재 직업 → 초보자`, '능력치 배분', '일반 장비와 해당 장비의 강화·옵션', '골드 → 시작 골드', '사냥터와 사냥터 난이도 선택', '진행 중 전투·던전']}/>
            </Card>
            <FoldSection title="환생 이후에 열리는 콘텐츠"><div className="grid gap-1 text-xs leading-relaxed text-ink-2"><p><b>1회</b> 건 마스터리 · 엘리니아 · 잊힌 마법 사원(Lv.30) · 윤회의 무기</p><p><b>2회</b> 요정의 축복 · 영혼의 갑주</p><p><b>3회</b> 심연의 눈 · 무릉도장(Lv.40)</p><p><b>5회</b> 커닝시티 · 지하 배수로(Lv.55) · 칭호 ‘되돌아온 모험가’ · 연구 해금 마무리</p><p><b>8회</b> 엘나스 · 자쿰의 제단(Lv.60)</p><p><b>10·20·30·50회</b> 윤회 칭호 ‘윤회의 여행자’ · ‘운명을 거스른 자’ · ‘심연을 건넌 자’ · ‘영원의 모험가’</p><p>무릉도장은 5연전 정복마다 다음 깊이를 엽니다. 깊을수록 층당 세계석이 늘고, 10·25·50·100층 첫 돌파 시 SP 1.</p></div></FoldSection>
            <FoldSection title="저장 데이터 관리"><Note>전체 초기화는 환생과 다릅니다. 이름을 제외한 모든 성장 기록과 랭킹 방어 등록을 삭제하며 복구할 수 없습니다. 자동 사냥을 중단하고 던전에서 나온 뒤 진행하세요.</Note><ConfirmAction className="justify-self-start border-danger/60 text-danger" label="전체 데이터 초기화" title="정말 모든 데이터를 초기화할까요?" description="레벨·장비·환생·세계석·도감·스킬·길드·랭킹을 모두 처음 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다." confirmLabel="초기화" disabled={busy || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetData' })}/></FoldSection>
        </>}
        {tab === 'research' && <>
            <Note>세계석 연구는 환생 후에도 유지됩니다(승천하면 초기화되고 편의 연구는 자동으로 열림). 환생 200회부터는 구매가 잠깁니다. 카드에는 1단계당 증가량과 현재 → 다음 단계 효과를 표시합니다.</Note>
            <Tabs value={researchTab} onValueChange={v => setResearchTab(v as ResearchTab)}><TabsList className="h-auto flex-wrap">{RESEARCH_TABS.map(t => <TabsTrigger key={t.id} value={t.id} className="min-h-9 pointer-coarse:min-h-11">{t.name}</TabsTrigger>)}</TabsList></Tabs>
            {showAutomation(s) && <ResearchPlanPanel s={s} send={send} busy={busy}/>}
            <ResearchTabView tab={researchTab} s={s} send={send} busy={busy}/>
        </>}
        {tab === 'relics' && <RelicTab s={s} send={send} busy={busy}/>}
    </div>;
}

/** v3.78 환생 유물 탭: 규칙은 한 줄 요약 칩으로, 유물은 카드(받기 전에는 Lv.1 수령 수치, 보유 중이면 지금 레벨 · 별 · 이식 옵션). */
function RelicTab({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const full = s.inventory.length >= inventoryCap();
    const owned = (id: string) => [...s.inventory, ...Object.values(s.equipment)].find(x => x?.relic === id) || null;
    const fact = (k: string, v: React.ReactNode, sub?: string) => <span key={k} className="rounded-s border border-line bg-surface-1 px-2 py-1 text-xs text-ink-2">{k} <b className="text-ink-1">{v}</b>{sub && <small className="text-ink-3"> {sub}</small>}</span>;
    return <>
        <Note>환생을 가로질러 자라는 장비입니다. 세계석 없이 환생 횟수를 채우면 받고, 별과 이식 옵션은 환생해도 남습니다. 강화 · 레벨 올리기 · 옵션 이식은 장비 보관함에서 합니다.</Note>
        <div className="flex flex-wrap gap-2">{fact('위력', '(레벨 + 2) × 배율')}{fact('지금 배율', `×${heirFactor('relic', s.rebirths).toFixed(2)}`, `환생 ${HEIR_GROWTH.toRebirth}회 ×${HEIR_GROWTH.relic.to}`)}{fact('이식 옵션', `최대 ${RELIC_GROWTH.imprintSlots}줄`, '같은 부위 장비 소비')}{fact('강화 파괴 시', `${STARFORCE.relicResetStar}성으로`)}{fact('종류당', '1개')}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{RELICS.map(r => {
            const item = owned(r.id), ready = s.rebirths >= r.rebirth;
            const state = item ? '보유 중' : ready ? '받을 수 있음' : `환생 ${r.rebirth}회 필요`;
            return <article className={cn('grid content-start gap-2 rounded-l border bg-surface-2 p-4 shadow-1', item ? 'border-accent/60' : ready ? 'border-ok/50' : 'border-line opacity-80')} key={r.id}>
                <header className="flex items-center gap-2"><SlotIcon slot={r.slot} size={22}/><div className="grid min-w-0"><h2 className="font-display text-m font-bold">{r.name}</h2><small className="text-xs text-ink-3">{SLOTS[r.slot]} · 환생 {r.rebirth}회부터</small></div></header>
                <span className={cn('justify-self-start rounded-s px-1.5 py-0.5 text-xs font-semibold', item ? 'bg-accent text-accent-ink' : ready ? 'bg-ok/15 text-ok' : 'bg-surface-3 text-ink-3')}>{state}</span>
                <p className="text-xs leading-relaxed text-ink-2">{r.description}</p>
                <p className="text-xs text-ink-2">고유 옵션 · <b className="text-ink-1">{r.affix.name}</b> {STAT_LABELS[r.affix.stat]} {statDeltaDisplay(r.affix.stat, r.affix.value)}</p>
                {item ? <div className="grid gap-1 rounded-m bg-surface-1 p-2 text-xs">
                    <b className="text-s">Lv.{item.level || 1} <span className="text-gold-ink">{starLabel(item.enhance || 0)}</span> · 위력 {item.power}</b>
                    <small className="text-ink-3">이식 옵션 {item.affixes?.length || 0}/{RELIC_GROWTH.imprintSlots}줄{item.affixes?.length ? ` · ${item.affixes.map(x => x.name).join(' · ')}` : ''}</small>
                    <BonusList item={item} columns={1}/>
                </div> : <div className="grid gap-1 rounded-m bg-surface-1 p-2 text-xs"><small className="text-ink-3">받을 때(Lv.1) 능력치</small><BonusList item={{ ...r, id: r.id, rarity: 3, level: 1, power: heirPower('relic', s.rebirths, 1) }} columns={1}/></div>}
                {!item && <Button type="button" size="sm" className="mt-auto bg-accent text-accent-ink hover:bg-accent/90" disabled={busy || !ready || full} onClick={() => send({ type: 'buyRelic', id: r.id })}>{!ready ? `환생 ${r.rebirth}회 필요` : full ? '가방이 가득 참' : '수령'}</Button>}
            </article>;
        })}</div>
    </>;
}
