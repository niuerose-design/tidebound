'use client';
import { AutoRebirthPanel, AutoFollowPanel, RotationPanel, ResearchPlanPanel, showAutomation } from './automation-panels';
import { ConfirmButton } from './confirm-button';
import { useState } from 'react';
import { Sparkles, RefreshCw, Info, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { rebirthExperience, rebirthMemory } from '@/game/data/long-term';
import { RESEARCH, RESEARCH_TABS, RESEARCH_GROUPS, RELICS, RELIC_GROWTH, HEIR_GROWTH, heirFactor, heirPower, ECONOMY, researchCost, researchEffect, researchUnlocked, researchMaxFor, startingLevel, type ResearchDef, type ResearchTab } from '@/game/data/economy';
import { PROGRESSION, STAT_LABELS, statDeltaDisplay } from '@/game/data/progression';
import { STARFORCE, starLabel } from '@/game/data/starforce';
import { inventoryCap } from '@/game/data/economy';
import { RebirthHistory } from './rebirth-history';
import { SLOTS } from '@/game/data/balance';
import { researchRefund } from '@/game/systems/commerce';
import { rebirthRewardParts, tailwindActive, tailwindExp, tailwindLevel, xpWall, rebirthLevel, rebirthReward, rebirthAP, tideLimit } from '@/game/systems/meta';
import { stats, permanentExpBonus } from '@/game/systems/stats';
import { apCapacity, researchAP } from '@/game/systems/progression';
import { Heading, Meter, SlotIcon, format, Num } from './shared';
import type { PanelProps } from './panel-props';
import type { State, Action } from '@/game/types';
import { VOW_IDS, VOW_NAMES, VOW_RESEARCH, LEVELED_VOWS, type VowId, vowUnlocked, vowBoost, breathBonus, ROUGH, RESTRAINT, hasVows } from '@/game/systems/vows';
import { BonusList } from './inventory-panel';
import { SUPPORT_EFFECTS, supportText, supportOf, isStaff } from '@/game/systems/support';
import { accountBonusRows, SLOT_COUNT, slotUnlocked, VAULT_PEARL_OUT_WEEKLY, VAULT_ONYX_CAP, type VaultInfo } from '@/game/data/account';
import { ownedOnyx } from '@/game/data/onyx';
import { useEffect, useState as useLocalState } from 'react';
import { salvagePreview } from '@/game/systems/actions/lifecycle';
import { AscensionPanel } from './ascension-panel';
import { ASCENSION } from '@/game/data/ascension';
const VOW_TEXT: Record<VowId, (s: State) => string> = {
    breath: (s: State) => `쓰러지면 이번 생을 처음부터 다시 시작(환생 횟수·세계석 변화 없음, 서약 해제). 한 번도 쓰러지지 않고 환생하면 환생 세계석 +${Math.round(breathBonus(s) * 100)}%.`,
    rough: (s: State) => `단계(1·2·3)마다 사냥터 난이도 하한 ${ROUGH.floor.join('·')}(미만이면 보상 꺼짐), 장비 능력치 -${ROUGH.gear.map(n => n * 100).join('·')}%, 처치 후 회복·흡혈·체력 재생 -${ROUGH.heal.map(n => n * 100).join('·')}%. 보상: 골드·장비 드롭 확률 ×(1 + ${Math.round(50 * vowBoost(s, 'rough'))}% × 단계), 드롭 상한 뒤에 곱합니다.`,
    restraint: (s: State) => `단계(1·2·3)마다 장착 AP -${RESTRAINT.ap.join('·')}, 액티브·패시브 장착 각각 최대 ${RESTRAINT.slots.join('·')}개. 보상: 경험치 ×${RESTRAINT.exp.map(n => (1 + n * vowBoost(s, 'restraint')).toFixed(1)).join('·')}(다른 경험치 배율과 곱연산).`,
};
/** 서약 연구 카드의 설명 팝업: 서약이 무엇인지, 어떻게 거는지, 이 서약의 제약과 보상. 누르면 열립니다(모바일 포함). */
function VowInfo({ id, s }: { id: VowId; s: State }) {
    return <Popover>
        <PopoverTrigger asChild><button type="button" className="info-trigger vow-info-trigger" aria-label={`${VOW_NAMES[id]} 서약 설명`}><Info size={15}/><span>서약이란?</span></button></PopoverTrigger>
        <PopoverContent className="game-tooltip vow-info-pop" side="bottom" align="start">
            <strong>서약 · {VOW_NAMES[id]}</strong>
            <p>서약은 다음 생에 스스로 거는 제약입니다. 더 어렵게 플레이하는 대신 고유한 보상을 받습니다.</p>
            <p><b>이 서약:</b> {VOW_TEXT[id](s)}</p>
            <p><b>거는 법:</b> 이 연구로 해금한 뒤 환생 화면 아래 ‘서약’에서 ‘다음 생에 걸기’를 켜고 환생하면 그 생 동안 적용됩니다. 여러 서약을 함께 걸 수 있습니다.</p>
            <p><b>연구 단계:</b> 1단계 해금, 2·3단계는 보상만 50%씩 강화합니다(제약은 그대로).</p>
        </PopoverContent>
    </Popover>;
}
const VOW_BY_RESEARCH = Object.fromEntries(VOW_IDS.map(id => [VOW_RESEARCH[id], id])) as Record<string, VowId>;
/** 세계석 연구 카드: 현재 → 다음 효과, 잠긴 연구는 해금 환생 횟수를 보여줍니다. */
function ResearchCard({ r, s, send, busy }: { r: ResearchDef; s: State; send: (a: Action) => void; busy: boolean }) {
    // v3.31 승천해야 열리는 단계(행운의 편지 6~10)와 환생 200회부터의 연구 구매 잠금.
    const rank = s.permanent[r.id] || 0, cost = researchCost(r.id, rank), unlocked = researchUnlocked(s.rebirths, r), maxed = rank >= r.max, capped = !maxed && rank >= researchMaxFor(s, r), locked200 = s.rebirths >= ASCENSION.researchLockAt;
    return <article className={`panel research-card ${unlocked ? '' : 'locked'}`}>
        <div><h2>{r.name}{VOW_BY_RESEARCH[r.id] && <VowInfo id={VOW_BY_RESEARCH[r.id]} s={s}/>}</h2><p>{r.desc}{r.levels ? '' : <small> (1단계당)</small>}</p>
            <p className="research-effect">{maxed ? `${researchEffect(r, rank)} · 최대` : `${rank || r.levels ? researchEffect(r, rank) : `${r.label} +0`} → ${researchEffect(r, rank + 1)}`}</p>
            <small>연구 {rank} / {r.max}{r.ascendAbove !== undefined ? ` · ${r.ascendAbove + 1}단계부터 승천 후` : ''}</small></div>
        <button className="secondary" disabled={busy || !unlocked || maxed || capped || locked200 || s.pearls < cost} onClick={() => send({ type: 'permanent', id: r.id })}>{!unlocked ? `환생 ${r.rebirth}회 필요` : maxed ? '연구 완료' : capped ? '승천 후 열림' : locked200 ? `환생 ${ASCENSION.researchLockAt}회 · 구매 잠김` : `${cost} 세계석`}</button>
    </article>;
}
function ResearchTabView({ tab, s, send, busy }: { tab: ResearchTab; s: State; send: (a: Action) => void; busy: boolean }) {
    const list = RESEARCH.filter(r => r.tab === tab), name = RESEARCH_TABS.find(x => x.id === tab)!.name;
    const groups = tab === 'combat' ? (['attack', 'defense'] as const) : tab === 'utility' ? (['basic', 'special', 'vow'] as const) : [undefined];
    const { refund, spent } = researchRefund(s, tab);
    // v3.24 묶음(공격·방어·기본·특별·서약)을 화살표로 접고 펼칩니다. 탭을 바꿔도 접어 둔 묶음은 그대로입니다.
    const [folded, setFolded] = useState<Record<string, boolean>>({});
    return <>
        {groups.map(g => { const items = list.filter(r => !g || r.group === g), open = !g || !folded[g], done = items.reduce((n, r) => n + Math.min(r.max, s.permanent[r.id] || 0), 0), total = items.reduce((n, r) => n + r.max, 0);
            return <section key={g || 'all'} className={`research-group ${open ? '' : 'folded'}`}>
                {g && <h3 className="research-group-title"><button type="button" className="research-group-toggle" aria-expanded={open} onClick={() => setFolded(f => ({ ...f, [g]: open }))}><ChevronDown size={16} className="research-group-arrow"/>{RESEARCH_GROUPS[g]}<small>{items.length}개 · 연구 {done} / {total}</small></button></h3>}
                {open && <div className="research-grid">{items.map(r => <ResearchCard key={r.id} r={r} s={s} send={send} busy={busy}/>)}</div>}
            </section>; })}
        <div className="panel research-reset">
            <div><strong>{name} 연구 재분배</strong><p>{spent ? `이 탭에 쓴 세계석 ${spent}개 중 ${refund}개를 돌려받고 ${name} 연구 단계를 모두 0으로 되돌립니다.` : `${name} 탭에 쓴 세계석이 없습니다.`} 재분배는 언제나 무료이며 쓴 세계석을 모두 돌려받습니다. 자동 사냥과 던전을 멈춘 상태에서만 할 수 있습니다.</p></div>
            <ConfirmButton label={`재분배 · 세계석 +${refund}`} title={`${name} 연구를 재분배할까요?`} description={`${name} 탭의 연구 단계가 모두 0이 되고 세계석 ${refund}개를 모두 돌려받습니다.`} disabled={busy || refund <= 0 || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetResearch', id: tab })}/>
        </div>
    </>;
}
/** v25.6 계정 보너스: 모든 캐릭터 슬롯의 기록을 합쳐 각 캐릭터에 적용됩니다. */
export function AccountPanel({ s }: { s: State }) {
    const rows = accountBonusRows(s), slots = s.account?.slots || [], openSlots = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).filter(n => slotUnlocked(s.account, n)).length;
    return <section className="panel vow-panel account-panel">
        <div className="section-title"><h2>계정 보너스</h2><span>슬롯 {slots.length || 1}/{openSlots} 사용 중 · 모든 슬롯 합산</span></div>
        <ul className="account-rows">{rows.map(r => <li key={r.name}><div><strong>{r.name}</strong><small>{r.value}</small></div><b>{r.effect}</b><small>{r.next}</small></li>)}
            {/* v3.219 참모 지원: 다른 분신이 주는 지원(받는 값)과, 참모 계보라면 내가 주는 지원. */}
            {(() => { const got = SUPPORT_EFFECTS.filter(e => s.support?.[e]), mine = isStaff(s) ? supportOf(s) : {}, give = SUPPORT_EFFECTS.filter(e => mine[e]);
                const text = (m: Partial<Record<(typeof SUPPORT_EFFECTS)[number], number>>, list: (typeof SUPPORT_EFFECTS)[number][]) => list.map(e => supportText(e, m[e] || 0)).join(' · ');
                return <>{(got.length > 0 || isStaff(s)) && <li key="support-in"><div><strong>분신 지원(받음)</strong><small>참모 계보 분신</small></div><b>{got.length ? text(s.support!, got) : '없음'}</b><small>효과별 가장 높은 지원 하나 · 다른 분신에 반영까지 최대 10분</small></li>}
                    {isStaff(s) && <li key="support-out"><div><strong>분신 지원(줌)</strong><small>이 캐릭터의 지원 스킬</small></div><b>{give.length ? text(mine, give) : '장착한 지원 스킬 없음'}</b><small>다른 분신에게만 · 자신은 지휘 체계로 강해짐</small></li>}</>; })()}
        </ul>
    </section>;
}
/** v25.13 계정 공유 금고: 슬롯 사이에서 세계석·정수를 옮깁니다. 2번 슬롯이 열린 뒤에 보입니다. */
export function VaultPanel({ s, busy, vault, error, load, act }: { s: State; busy: boolean; vault?: VaultInfo | null; error?: string; load?: () => Promise<void>; act?: (body: Record<string, unknown>) => Promise<boolean> }) {
    const [amount, setAmount] = useLocalState({ pearls: '', essence: '' });
    useEffect(() => { const t = setTimeout(() => { void load?.(); }, 0); return () => clearTimeout(t); }, [load]);
    if (!act) return null;
    const row = (kind: 'pearls' | 'essence', label: string, have: number, cap?: string) => { const n = Math.floor(Number(amount[kind])) || 0; return <li key={kind}>
        <div><strong>{label}</strong><small>보유 {format(have)} · 금고 {vault ? format(vault[kind]) : '…'}{cap ? ` · ${cap}` : ''}</small></div>
        <div className="vault-row"><input type="number" min={1} value={amount[kind]} placeholder="수량" aria-label={`${label} 수량`} onChange={e => setAmount({ ...amount, [kind]: e.target.value })}/>
            <button className="secondary small" disabled={busy || n < 1 || have < n} onClick={() => act({ action: 'deposit', kind, amount: n })}>넣기</button>
            <button className="primary small" disabled={busy || n < 1 || !vault || vault[kind] < n || (kind === 'pearls' && n > vault.pearlOutLeft)} onClick={() => act({ action: 'withdraw', kind, amount: n })}>꺼내기</button></div>
    </li>; };
    return <section className="panel vow-panel vault-panel">
        <div className="section-title"><h2>계정 금고</h2><span>어느 슬롯에서든 넣고 꺼냄 · 세계석 인출 주당 {VAULT_PEARL_OUT_WEEKLY}개 · 골드 불가</span></div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <ul className="account-rows vault-rows">{row('pearls', '세계석', s.pearls, vault ? `이번 주 인출 가능 ${vault.pearlOutLeft}개` : undefined)}{row('essence', '정수', s.essence || 0)}</ul>
        {/* v3.116 칠흑 장신구: 별 · 각성 그대로 옮김. 받는 분신이 같은 종을 가졌으면 각성 +1. 넣은 분신이 승천하면 사라짐. */}
        <h3 className="vault-onyx-title">칠흑 장신구 <small>금고 {vault?.onyx.length ?? '…'}/{VAULT_ONYX_CAP} · 별 · 각성 그대로 · 같은 종을 가진 분신이 꺼내면 각성 +1 · 넣은 분신이 승천하면 금고에서도 사라짐</small></h3>
        <ul className="account-rows vault-rows">
            {s.inventory.filter(i => i.onyx).map(i => <li key={i.id}><div><strong>{i.name}{i.onyxRank ? ` +${i.onyxRank}` : ''}</strong><small>가방 · {starLabel(i.enhance || 0, true)} · Lv.{i.level}</small></div>
                <div className="vault-row"><button className="secondary small" disabled={busy || !vault || vault.onyx.length >= VAULT_ONYX_CAP} onClick={() => act({ action: 'deposit', kind: 'onyx', id: i.id })}>넣기</button></div></li>)}
            {vault?.onyx.map(v => <li key={v.id}><div><strong>{v.item.name}{v.item.onyxRank ? ` +${v.item.onyxRank}` : ''}</strong><small>금고 · {v.slot}번 분신이 넣음 · {starLabel(v.item.enhance || 0, true)} · Lv.{v.item.level}{ownedOnyx(s).has(v.item.onyx!) ? ' · 꺼내면 내 칠흑 각성 +1' : ''}</small></div>
                <div className="vault-row"><button className="primary small" disabled={busy} onClick={() => act({ action: 'withdraw', kind: 'onyx', id: v.id })}>꺼내기</button></div></li>)}
            {!s.inventory.some(i => i.onyx) && !vault?.onyx.length && <li><small>가방에 넣을 칠흑이 없습니다(착용 중인 칠흑은 벗어야 넣을 수 있음).</small></li>}
        </ul>
    </section>;
}
/** v3.210 LV1 모험가(테스트용): 생 도중 바로 걸고 언제든 포기. 다른 서약과 함께 걸 수 없고, 서약 중에는 환생할 수 없습니다. */
function Lv1VowCard({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const on = !!s.vows?.lv1, blocked = !on && hasVows(s.vows);
    return <article className={`vow-card vow-lv1${on ? ' on' : ''}`}>
        <h3>LV1 모험가 <small className="vow-test">테스트용</small></h3>
        <p>지금 바로 걸면 레벨이 1로 고정됩니다(경험치 · 레벨로 받은 능력치 포인트 없음, 레벨 비례 수치도 Lv.1). 장비 · 연구 · 숙련 · 보스 코어는 그대로이고, 사냥터 · 던전 · 스킬의 레벨 제한은 무시합니다. 서약 중에는 환생 · 승천할 수 없고, 언제든 포기하면 원래 레벨로 돌아갑니다. 성장 보상은 없고 최고 무릉도장 층만 기록합니다.</p>
        <small>최고 기록 · 무릉도장 {s.lv1AbyssBest || 0}층{on && s.vows?.lv1 ? ` · 포기하면 Lv.${s.vows.lv1.level}로` : ''}{blocked ? ' · 다른 서약이 걸린 생에는 걸 수 없음' : ''}</small>
        {on ? <ConfirmButton label="LV1 모험가 포기" title="LV1 모험가 서약을 포기할까요?" description={`Lv.${s.vows!.lv1!.level}과 그때의 경험치 · 능력치 배분으로 돌아갑니다. 기록(무릉도장 ${s.lv1AbyssBest || 0}층)은 남습니다.`} disabled={busy} onConfirm={() => send({ type: 'lv1Vow', id: 'quit' })}/>
            : <ConfirmButton label="지금 바로 걸기" title="LV1 모험가(테스트용)를 걸까요?" description="테스트용 서약입니다. 성장 보상은 없고 최고 무릉도장 층만 기록됩니다. 지금 레벨 · 경험치 · 능력치 배분은 보관되고 Lv.1이 됩니다. 서약 중에는 환생할 수 없고, 포기하면 보관한 상태로 돌아갑니다." disabled={busy || blocked || !!s.dungeon} onConfirm={() => send({ type: 'lv1Vow', id: 'start' })}/>}
    </article>;
}
/** 환생 화면의 서약: 이번 생 서약, 다음 생 서약 예약. */
function VowPanel({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const now = s.vows, next = s.nextVows || {}, leveled = (id: VowId) => (LEVELED_VOWS as readonly string[]).includes(id);
    return <section className="panel vow-panel">
        <div className="section-title"><h2>서약</h2><span>제약을 걸고 고유 보상을 받습니다. 모든 서약은 다음 생에 걸리고(환생할 때 적용), 이번 생 도중에는 바꿀 수 없습니다. 세계석 연구 유틸 탭에서 해금합니다.</span></div>
        {now && VOW_IDS.some(id => now[id]) && <div className="vow-current"><strong>이번 생 서약</strong><span>{VOW_IDS.filter(id => now[id]).map(id => leveled(id) ? `${VOW_NAMES[id]} ${now[id]}단계` : VOW_NAMES[id]).join(' · ')}</span></div>}
        <Lv1VowCard s={s} send={send} busy={busy}/>
        <div className="vow-grid">{VOW_IDS.map(id => {
            const open = vowUnlocked(s, id);
            return <article className={`vow-card ${open ? '' : 'locked'}`} key={id}>
                <h3>{VOW_NAMES[id]}</h3><p>{VOW_TEXT[id](s)}</p>
                {!open ? <small>세계석 연구에서 해금 (환생 5회)</small> : leveled(id)
                    ? <><small className="vow-next-label">다음 생에 걸기 · {Number(next[id]) ? `${next[id]}단계 예약` : '꺼짐'}{now?.[id] ? ` · 이번 생 ${now[id]}단계 적용 중` : ''}</small>
                    <div className="vow-rough">{[0, 1, 2, 3].map(n => <button key={n} className={(Number(next[id]) || 0) === n ? 'primary' : 'secondary'} disabled={busy} aria-pressed={(Number(next[id]) || 0) === n} onClick={() => send({ type: 'nextVow', id, value: String(n) })}>{n ? `${n}단계` : '끔'}</button>)}</div></>
                    : <button className={next[id] ? 'primary' : 'secondary'} disabled={busy} aria-pressed={!!next[id]} onClick={() => send({ type: 'nextVow', id, value: next[id] ? 'off' : 'on' })}>{next[id] ? '다음 생에 걸기 · 켜짐' : '다음 생에 걸기 · 꺼짐'}</button>}
            </article>;
        })}</div>
    </section>;
}
export function Rebirth({ s, send, busy }: PanelProps) {
    const [tab, setTab] = useState('prepare');
    const [researchTab, setResearchTab] = useState<ResearchTab>('combat');
    const required = rebirthLevel(s), bonus = stats(s).rebirthBonus;
    const reward = rebirthReward({ ...s, level: Math.max(s.level, required) }, bonus), permanentExp = 1 + permanentExpBonus(s);
    const breathExtra = s.vows?.breath ? Math.floor(reward * breathBonus(s)) : 0;
    const apGain = s.rebirths < ECONOMY.rebirthAPCap ? 1 : 0, salvage = salvagePreview(s);
    const projected = { ...s, level: Math.max(s.level, required) };
    const parts = rebirthRewardParts(projected, bonus), memoryNow = Number(((rebirthMemory(s.rebirths) - 1) * 100).toFixed(1)), memoryNext = Number(((rebirthMemory(s.rebirths + 1) - 1) * 100).toFixed(1));
    const lifeText = `순풍 · 다음 생 Lv.${Math.max(s.level, required)}(이번 생 최고 레벨)까지 경험치 +${Math.round(tailwindExp(s) * 100)}%(합연산) · 그 너머는 레벨마다 필요 경험치 ×${xpWall(s).growth.toFixed(2)}`;
    return <>
        <Heading eyebrow="REBIRTH & LEGACY" title="환생" description="이번 모험을 마치고, 다음 생에 남길 힘을 선택하세요."/>
        <section className="panel port-resource-bar legacy-resource-bar">
            <div><RefreshCw size={22}/><span>누적 환생<strong>{format(s.rebirths)} <small>회</small></strong></span></div>
            <div><Sparkles size={22}/><span>보유 세계석<strong><Num n={s.pearls}/> <small>개</small></strong></span></div>
            <div><span>영구 경험치 배율<strong>×{permanentExp.toFixed(2)}</strong></span></div>
            <div><span>현재 장착 AP<strong>{apCapacity(s)} <small>환생 +{rebirthAP(s)} · 연구 +{researchAP(s)}</small></strong></span></div>
        </section>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="prepare">환생 준비</TabsTrigger><TabsTrigger value="research">세계석 연구</TabsTrigger><TabsTrigger value="relics">환생 유물</TabsTrigger><TabsTrigger value="history">환생 기록</TabsTrigger></TabsList></Tabs>
        {tab === 'history' && <RebirthHistory s={s}/>}
        {tab === 'prepare' && <>
            <AscensionPanel s={s} send={send} busy={busy}/>
            {s.rebirths > 0 && <VowPanel s={s} send={send} busy={busy}/>}
            {showAutomation(s) && <><AutoRebirthPanel s={s} send={send} busy={busy}/><AutoFollowPanel s={s} send={send} busy={busy}/><RotationPanel s={s} send={send} busy={busy}/></>}
            <section className="panel rebirth-ready">
                <div className="rebirth-ready-copy"><span className="eyebrow">{s.rebirths + 1}번째 환생</span><h2>{s.rebirths >= ASCENSION.rebirthCap ? `환생은 ${ASCENSION.rebirthCap}회까지입니다. 위의 승천으로 다시 오를 수 있습니다` : s.level >= required ? '다음 모험을 시작할 준비가 됐습니다' : `Lv.${required}에 새로운 모험이 열립니다`}</h2><Meter value={Math.min(s.level, required)} max={required} label="레벨 조건"/>
                    {s.rebirths > 0 && <p className="footnote">이번 생 효과: {tailwindActive(s) ? `순풍 · Lv.${tailwindLevel(s)}(직전 생 최고 레벨)까지 경험치 +${Math.round(tailwindExp(s) * 100)}%(합연산)` : `역풍 · 요구 레벨 너머 필요 경험치 레벨마다 ×${xpWall(s).growth.toFixed(2)}`}</p>}</div>
                <div className="rebirth-reward"><span>{s.level >= required ? '이번에 받을 세계석' : '환생 조건 달성 시 예상 세계석'}</span><strong><Sparkles size={26}/>{format(reward + breathExtra)}</strong>
                    <ConfirmButton label="환생하기" title="다음 모험을 시작할까요?" description="오른쪽 아래 '초기화되는 것'이 처음 상태로 돌아가고, '유지되는 것'은 그대로 남습니다. 진행 중인 전투·던전은 종료됩니다." disabled={busy || s.level < required || s.rebirths >= ASCENSION.rebirthCap} onConfirm={() => send({ type: 'rebirth' })}/>
                </div>
            </section>
            <div className="rebirth-records rebirth-three">
                <article className="panel ledger-gain"><h2>받는 보상</h2><ul>
                    <li><b>세계석 +{format(reward + breathExtra)}</b><small>레벨 {parts.level} · 환생 횟수 {parts.count}{parts.bonus ? ` · 연구·스킬 ${parts.bonus}` : ''}{breathExtra ? ` · 서약 +${breathExtra}` : ''}</small></li>
                    <li><b>환생 영구 보너스: 체력·마나·물리/마법 공격·물리/마법 방어</b><small>현재 +{memoryNow}% → 환생 후 +{memoryNext}%</small></li>
                    <li><b>영구 경험치 획득</b><small>현재 ×{permanentExp.toFixed(2)} → 환생 후 ×{(permanentExp - rebirthExperience(s.rebirths) + rebirthExperience(s.rebirths + 1)).toFixed(2)}</small></li>
                    <li><b>장착 AP {apGain ? '+1' : '+0'}</b><small>{apGain ? `환생 AP ${rebirthAP(s)} → ${rebirthAP(s) + 1}` : `환생 AP 최대치(${ECONOMY.rebirthAPCap}) 도달`}</small></li>
                    <li><b>다음 생 효과</b><small>{lifeText}</small></li>
                    {salvage.rate > 0 && <li><b>청산 · 장비 {salvage.count}개 {salvage.mode === 'dismantle' ? `분해 → 정수 +${format(salvage.essence)}` : `판매 → 시작 골드 +${format(salvage.gold)} G`}</b><small>효율 {Math.round(salvage.rate * 100)}% · <button type="button" className="text-button inline" disabled={busy} onClick={() => send({ type: 'salvageMode', value: salvage.mode === 'dismantle' ? 'sell' : 'dismantle' })}>{salvage.mode === 'dismantle' ? '판매로 바꾸기' : '분해로 바꾸기'}</button></small></li>}
                    <li><b>사냥터 난이도 {tideLimit({ ...s, rebirths: s.rebirths + 1 })}까지 선택</b><small>다음 생 Lv.{startingLevel(s)}부터 시작{startingLevel(s) > 1 ? ` (전생의 기억 · 능력치 포인트 +${(startingLevel(s) - 1) * PROGRESSION.statPerLevel})` : ''}</small></li>
                </ul></article>
                <article className="panel ledger-kept"><h2>유지되는 것</h2><ul><li>세계석 · 세계석 연구 · 몬스터와 장비 도감</li><li>스킬 해금·계승·성장·숙련 · 보유 SP · 장기 목표</li><li>직업 해금과 숙련 기록</li><li>환생 유물 · 유물 강화·옵션·보관 위치</li><li>길드 소속 · 던전 정복 기록 · 무릉도장 최고 층</li><li>랭킹 점수와 전적</li></ul></article>
                <article className="panel ledger-reset"><h2>초기화되는 것</h2><ul><li>레벨·경험치 → Lv.{startingLevel(s)} · 현재 직업 → 초보자</li><li>능력치 배분</li><li>일반 장비와 해당 장비의 강화·옵션</li><li>골드 → 시작 골드</li><li>사냥터와 사냥터 난이도 선택</li><li>진행 중 전투·던전</li></ul></article>
            </div>
            <details className="panel legacy-roadmap legacy-fold"><summary>환생 이후에 열리는 콘텐츠</summary><p><b>1회</b> 윤회의 일격 · 건 마스터리 · 엘리니아 · 잊힌 마법 사원(Lv.30) · 윤회의 무기</p><p><b>2회</b> 요정의 축복 · 영혼의 보물 사냥꾼의 감</p><p><b>3회</b> 시공의 파동 · 심연의 눈 · 무릉도장(Lv.40)</p><p><b>5회</b> 커닝시티 · 지하 배수로(Lv.55) · 칭호 ‘되돌아온 모험가’ · 연구 해금 마무리</p><p><b>8회</b> 엘나스 · 자쿰의 제단(Lv.60)</p><p><b>10·20·30·50회</b> 윤회 칭호 ‘윤회의 여행자’ · ‘운명을 거스른 자’ · ‘심연을 건넌 자’ · ‘영원의 모험가’</p><p>무릉도장은 5연전 정복마다 다음 깊이를 엽니다. 깊을수록 층당 세계석이 늘고, 10·25·50·100층 첫 돌파 시 SP 1.</p></details>
            <details className="panel legacy-fold data-management"><summary>저장 데이터 관리</summary><p>전체 초기화는 환생과 다릅니다. 이름을 제외한 모든 성장 기록과 랭킹 방어 등록을 삭제하며 복구할 수 없습니다. 자동 사냥을 중단하고 던전에서 나온 뒤 진행하세요.</p><ConfirmButton label="전체 데이터 초기화" title="정말 모든 데이터를 초기화할까요?" description="레벨·장비·환생·세계석·도감·스킬·길드·랭킹을 모두 처음 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다." disabled={busy || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetData' })}/></details>
        </>}
        {tab === 'research' && <><p className="tab-intro">세계석 연구는 환생 후에도 유지됩니다(승천하면 초기화되고 편의 연구는 자동으로 열림). 환생 200회부터는 구매가 잠깁니다. 카드에는 1단계당 증가량과 현재 → 다음 단계 효과를 표시합니다.</p>
            <Tabs value={researchTab} onValueChange={v => setResearchTab(v as ResearchTab)}><TabsList className="game-tabs research-tabs">{RESEARCH_TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.name}</TabsTrigger>)}</TabsList></Tabs>
            {showAutomation(s) && <ResearchPlanPanel s={s} send={send} busy={busy}/>}
            <ResearchTabView tab={researchTab} s={s} send={send} busy={busy}/></>}
        {tab === 'relics' && <RelicTab s={s} send={send} busy={busy}/>}
    </>;
}

/** v3.78 환생 유물 탭: 규칙은 한 줄 요약 칩으로, 유물은 4열 카드(받기 전에는 Lv.1 수령 수치, 보유 중이면 지금 레벨 · 별 · 이식 옵션). */
function RelicTab({ s, send, busy }: PanelProps) {
    const full = s.inventory.length >= inventoryCap();
    const owned = (id: string) => [...s.inventory, ...Object.values(s.equipment)].find(x => x?.relic === id) || null;
    return <>
        <p className="tab-intro">환생을 가로질러 자라는 장비입니다. 세계석 없이 환생 횟수를 채우면 받고, 별과 이식 옵션은 환생해도 남습니다. 강화 · 레벨 올리기 · 옵션 이식은 장비 보관함에서 합니다.</p>
        <div className="relic-facts">
            <span>위력 <b>(레벨 + 2) × 배율</b></span>
            <span>지금 배율 <b>×{heirFactor('relic', s.rebirths).toFixed(2)}</b> <small>환생 {HEIR_GROWTH.toRebirth}회 ×{HEIR_GROWTH.relic.to}</small></span>
            <span>이식 옵션 <b>최대 {RELIC_GROWTH.imprintSlots}줄</b> <small>같은 부위 장비 소비</small></span>
            <span>강화 파괴 시 <b>{STARFORCE.relicResetStar}성</b>으로</span>
            <span>종류당 <b>1개</b></span>
        </div>
        <div className="relic-grid">{RELICS.map(r => {
            const item = owned(r.id), ready = s.rebirths >= r.rebirth;
            const state = item ? '보유 중' : ready ? '받을 수 있음' : `환생 ${r.rebirth}회 필요`;
            return <article className={`panel relic-card${item ? ' owned' : ready ? ' ready' : ''}`} key={r.id}>
                <header><SlotIcon slot={r.slot} size={22}/><div><h2>{r.name}</h2><small>{SLOTS[r.slot]} · 환생 {r.rebirth}회부터</small></div></header>
                <span className="relic-state">{state}</span>
                <p className="relic-desc">{r.description}</p>
                <p className="relic-affix">고유 옵션 · <b>{r.affix.name}</b> {STAT_LABELS[r.affix.stat]} {statDeltaDisplay(r.affix.stat, r.affix.value)}</p>
                {item ? <div className="relic-owned">
                    <b>Lv.{item.level || 1} <span className="gold-text">{starLabel(item.enhance || 0)}</span> · 위력 {item.power}</b>
                    <small>이식 옵션 {item.affixes?.length || 0}/{RELIC_GROWTH.imprintSlots}줄{item.affixes?.length ? ` · ${item.affixes.map(x => x.name).join(' · ')}` : ''}</small>
                    <BonusList item={item}/>
                </div> : <div className="relic-preview"><small>받을 때(Lv.1) 능력치</small><BonusList item={{ ...r, id: r.id, rarity: 3, level: 1, power: heirPower('relic', s.rebirths, 1) }}/></div>}
                {!item && <button className="primary" disabled={busy || !ready || full} onClick={() => send({ type: 'buyRelic', id: r.id })}>{!ready ? `환생 ${r.rebirth}회 필요` : full ? '가방이 가득 참' : '수령'}</button>}
            </article>;
        })}</div>
    </>;
}

