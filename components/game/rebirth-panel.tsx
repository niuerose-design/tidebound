'use client';
import { ConfirmButton } from './confirm-button';
import { GrowthGoals } from './growth-goals';
import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { rebirthExperience, rebirthMemory, rebirthTitle, nextRebirthTitle } from '@/game/data/long-term';
import { RESEARCH, RESEARCH_TABS, RESEARCH_GROUPS, RELICS, ECONOMY, researchCost, researchEffect, researchUnlocked, type ResearchDef, type ResearchTab } from '@/game/data/economy';
import { BALANCE } from '@/game/data/balance';
import { ownsRelic, relicCost, researchRefund } from '@/game/systems/commerce';
import { rebirthRewardParts, nextLifeBonus, tailwindActive, tailwindWindow, tailwindExp, DEEP_VOYAGE_LEVEL, rebirthLevel, rebirthReward, rebirthAP, tideLimit } from '@/game/systems/meta';
import { stats, permanentExpBonus } from '@/game/systems/stats';
import { apCapacity } from '@/game/systems/progression';
import { Heading, Meter, SlotIcon, format, Num } from './shared';
import type { PanelProps } from './panel-props';
import type { State, Action } from '@/game/types';
import { VOW_IDS, VOW_NAMES, vowUnlocked, vowBoost, anchorPayout, breathBonus, roughEnemy, anchorSeal, anchorTargetName, ANCHOR_CATCHES, FOCUS_KINDS, FOCUS_NAMES, FOCUS_TEXT, focusLabel } from '@/game/systems/vows';
import { STAGES } from '@/game/data/world';
import { JOB_TREES } from '@/game/data/classes';
import { BonusList } from './inventory-panel';
import { accountBonusRows, SLOT_COUNT, slotUnlocked } from '@/game/data/account';
import { salvagePreview } from '@/game/systems/actions/lifecycle';
/** 진주 연구 카드: 현재 → 다음 효과, 잠긴 연구는 해금 환생 횟수를 보여줍니다. */
function ResearchCard({ r, s, send, busy }: { r: ResearchDef; s: State; send: (a: Action) => void; busy: boolean }) {
    const rank = s.permanent[r.id] || 0, cost = researchCost(r.id, rank), unlocked = researchUnlocked(s.rebirths, r), maxed = rank >= r.max;
    return <article className={`panel research-card ${unlocked ? '' : 'locked'}`}>
        <div><h2>{r.name}</h2><p>{r.desc}{r.levels ? '' : <small> (1단계당)</small>}</p>
            <p className="research-effect">{maxed ? `${researchEffect(r, rank)} · 최대` : `${rank || r.levels ? researchEffect(r, rank) : `${r.label} +0`} → ${researchEffect(r, rank + 1)}`}</p>
            <small>연구 {rank} / {r.max}</small></div>
        <button className="secondary" disabled={busy || !unlocked || maxed || s.pearls < cost} onClick={() => send({ type: 'permanent', id: r.id })}>{!unlocked ? `환생 ${r.rebirth}회 필요` : maxed ? '연구 완료' : `${cost} 진주`}</button>
    </article>;
}
function ResearchTabView({ tab, s, send, busy }: { tab: ResearchTab; s: State; send: (a: Action) => void; busy: boolean }) {
    const list = RESEARCH.filter(r => r.tab === tab), name = RESEARCH_TABS.find(x => x.id === tab)!.name;
    const groups = tab === 'combat' ? (['attack', 'defense'] as const) : tab === 'utility' ? (['basic', 'special', 'vow'] as const) : [undefined];
    const { refund, spent, first } = researchRefund(s, tab);
    return <>
        {groups.map(g => <section key={g || 'all'} className="research-group">
            {g && <h3 className="research-group-title">{RESEARCH_GROUPS[g]}</h3>}
            <div className="research-grid">{list.filter(r => !g || r.group === g).map(r => <ResearchCard key={r.id} r={r} s={s} send={send} busy={busy}/>)}</div>
        </section>)}
        <div className="panel research-reset">
            <div><strong>{name} 연구 재분배</strong><p>{spent ? `이 탭에 쓴 진주 ${spent}개 중 ${refund}개를 돌려받고 ${name} 연구 단계를 모두 0으로 되돌립니다.` : `${name} 탭에 쓴 진주가 없습니다.`} {first ? '계정당 첫 재분배는 100% 반환됩니다.' : '첫 재분배 이후에는 90%(내림)만 반환됩니다.'} 자동 낚시와 던전을 멈춘 상태에서만 할 수 있습니다.</p></div>
            <ConfirmButton label={`재분배 · 진주 +${refund}`} title={`${name} 연구를 재분배할까요?`} description={`${name} 탭의 연구 단계가 모두 0이 되고 진주 ${refund}개를 돌려받습니다${first ? ' (첫 재분배 100%)' : ` (쓴 진주 ${spent}개의 90%)`}.`} disabled={busy || refund <= 0 || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetResearch', id: tab })}/>
        </div>
    </>;
}
const VOW_TEXT = {
    anchor: (s: State) => `환생 때 사냥터·던전 하나가 지정되고, 그곳에서 ${ANCHOR_CATCHES}마리를 잡기 전까지 레벨 1 · 해역 난이도 0. 풀리면 쌓인 경험치 ×${anchorPayout(s)}. 언제든 포기 가능(보너스 없이 지급).`,
    breath: (s: State) => `쓰러지면 이번 생을 처음부터 다시 시작(환생 횟수·진주 변화 없음, 서약 해제). 한 번도 쓰러지지 않고 환생하면 환생 진주 +${Math.round(breathBonus(s) * 100)}%.`,
    rough: (s: State) => `선택 단계마다 적 체력·공격 +50%, 드롭·골드 +${Math.round(50 * vowBoost(s, 'rough'))}%. 해역 난이도와 별개입니다.`,
};
/** v25.6 이번 생의 조건 카드: 환생 1회부터, 연구 없이 하나를 고릅니다. 다음 환생부터 적용. */
function FocusPanel({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const next = s.nextVows?.focus, nowFocus = focusLabel(s.vows);
    const pick = (value: string) => send({ type: 'nextVow', id: 'focus', value });
    return <section className="panel vow-panel focus-panel">
        <div className="section-title"><h2>이번 생의 조건 카드</h2><span>환생마다 하나를 골라 다음 생을 다르게 삽니다. 연구 없이 바로 고를 수 있습니다.</span></div>
        {nowFocus && <div className="vow-current"><strong>이번 생 카드</strong><span>{nowFocus}</span></div>}
        <div className="vow-grid">{FOCUS_KINDS.map(kind => <article className={`vow-card ${next?.kind === kind ? 'chosen' : ''}`} key={kind}>
            <h3>{FOCUS_NAMES[kind]}</h3><p>{FOCUS_TEXT[kind]}</p>
            {kind === 'stage' ? <select value={next?.kind === 'stage' ? next.id : ''} disabled={busy} aria-label="집중할 해역" onChange={e => pick(e.target.value ? `stage:${e.target.value}` : 'off')}><option value="">고르지 않음</option>{STAGES.filter(st => st.rebirth <= s.rebirths + 1).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}</select>
            : kind === 'tree' ? <select value={next?.kind === 'tree' ? next.id : ''} disabled={busy} aria-label="집중할 계열" onChange={e => pick(e.target.value ? `tree:${e.target.value}` : 'off')}><option value="">고르지 않음</option>{JOB_TREES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            : <button className={next?.kind === 'gold' ? 'primary' : 'secondary'} disabled={busy} aria-pressed={next?.kind === 'gold'} onClick={() => pick(next?.kind === 'gold' ? 'off' : 'gold')}>{next?.kind === 'gold' ? '다음 생에 걸기 · 켜짐' : '다음 생에 걸기'}</button>}
        </article>)}</div>
        <p className="footnote">카드는 한 생에 하나이고, 고르지 않으면 평소처럼 삽니다. 예약은 바꾸기 전까지 이후 환생에도 유지됩니다.</p>
    </section>;
}
/** v25.6 계정 보너스: 모든 캐릭터 슬롯의 기록을 합쳐 각 캐릭터에 적용됩니다. */
function AccountPanel({ s }: { s: State }) {
    const rows = accountBonusRows(s), slots = s.account?.slots || [], openSlots = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).filter(n => slotUnlocked(s.account, n)).length;
    return <section className="panel vow-panel account-panel">
        <div className="section-title"><h2>계정 보너스</h2><span>캐릭터 슬롯 {slots.length || 1}/{openSlots}개 사용 중 · 모든 슬롯의 기록을 합쳐 각 캐릭터에 적용됩니다. 슬롯은 설정(톱니바퀴)에서 바꿉니다.</span></div>
        <ul className="account-rows">{rows.map(r => <li key={r.name}><div><strong>{r.name}</strong><small>{r.value}</small></div><b>{r.effect}</b><small>{r.next}</small></li>)}</ul>
    </section>;
}
/** 환생 화면의 서약: 이번 생 서약과 잠든 닻 진행, 다음 생 서약 예약. */
function VowPanel({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const unlocked = VOW_IDS.filter(id => vowUnlocked(s, id)), seal = anchorSeal(s), now = s.vows, next = s.nextVows || {};
    if (!unlocked.length && !now) return null;
    return <section className="panel vow-panel">
        <div className="section-title"><h2>서약</h2><span>제약을 걸고 고유 보상을 받습니다. 진주 연구 유틸 탭에서 해금합니다.</span></div>
        {now && <div className="vow-current"><strong>이번 생 서약</strong><span>{VOW_IDS.filter(id => now[id]).map(id => id === 'rough' ? `${VOW_NAMES.rough} ${now.rough}단계 (적 ×${roughEnemy(s)})` : VOW_NAMES[id]).join(' · ')}</span>
            {seal && <div className="vow-seal"><Meter value={Math.min(seal.caught, ANCHOR_CATCHES)} max={ANCHOR_CATCHES} label={`잠든 닻 · ${anchorTargetName(seal)} ${seal.caught} / ${ANCHOR_CATCHES}마리 · 쌓인 경험치 ${format(seal.exp)}`}/>
                <ConfirmButton label="잠든 닻 포기" title="잠든 닻을 포기할까요?" description={`봉인이 풀리고 쌓인 경험치 ${format(seal.exp)}를 보너스 없이 받습니다. 달성하면 ×${anchorPayout(s)}를 받을 수 있습니다.`} disabled={busy} onConfirm={() => send({ type: 'anchorGiveUp' })}/></div>}
        </div>}
        <div className="vow-grid">{VOW_IDS.map(id => {
            const open = vowUnlocked(s, id);
            return <article className={`vow-card ${open ? '' : 'locked'}`} key={id}>
                <h3>{VOW_NAMES[id]}</h3><p>{VOW_TEXT[id](s)}</p>
                {!open ? <small>진주 연구에서 해금 (환생 5회)</small> : id === 'rough'
                    ? <div className="vow-rough">{[0, 1, 2, 3].map(n => <button key={n} className={(next.rough || 0) === n ? 'primary' : 'secondary'} disabled={busy} onClick={() => send({ type: 'nextVow', id, value: String(n) })}>{n ? `${n}단계` : '끔'}</button>)}</div>
                    : <button className={next[id] ? 'primary' : 'secondary'} disabled={busy} aria-pressed={!!next[id]} onClick={() => send({ type: 'nextVow', id, value: next[id] ? 'off' : 'on' })}>{next[id] ? '다음 생에 걸기 · 켜짐' : '다음 생에 걸기 · 꺼짐'}</button>}
            </article>;
        })}</div>
        <p className="footnote">예약한 서약은 다음 환생부터 걸리고, 바꾸기 전까지 이후 환생에도 유지됩니다.</p>
    </section>;
}
export function Rebirth({ s, send, busy }: PanelProps) {
    const [tab, setTab] = useState('prepare');
    const [researchTab, setResearchTab] = useState<ResearchTab>('combat');
    const required = rebirthLevel(s), bonus = stats(s).rebirthBonus;
    const reward = rebirthReward({ ...s, level: Math.max(s.level, required) }, bonus), permanentExp = 1 + permanentExpBonus(s);
    const breathExtra = s.vows?.breath ? Math.floor(reward * breathBonus(s)) : 0;
    const apGain = s.rebirths < ECONOMY.rebirthAPCap ? 1 : 0, salvage = salvagePreview(s);
    const projected = { ...s, level: Math.max(s.level, required) }, lifeBonus = nextLifeBonus(projected);
    const parts = rebirthRewardParts(projected, bonus), memoryNow = Number(((rebirthMemory(s.rebirths) - 1) * 100).toFixed(1)), memoryNext = Number(((rebirthMemory(s.rebirths + 1) - 1) * 100).toFixed(1));
    const lifeText = lifeBonus === 'deep' ? `깊은 항해 · 다음 생 동안 직업·스킬 숙련 기본 획득 +2` : lifeBonus === 'tailwind' ? `순풍 · 다음 생 Lv.${rebirthLevel({ ...s, rebirths: s.rebirths + 1 })}까지 경험치 +${Math.round(tailwindExp(s) * 100)}%` : `없음 · Lv.${required + tailwindWindow(s)} 이하면 순풍, Lv.${DEEP_VOYAGE_LEVEL}이면 깊은 항해`;
    return <>
        <Heading eyebrow="REBIRTH & LEGACY" title="환생" description="이번 항해를 마치고, 다음 생에 남길 힘을 선택하세요."/>
        <section className="panel port-resource-bar legacy-resource-bar">
            <div><RefreshCw size={22}/><span>누적 환생<strong>{format(s.rebirths)} <small>회{rebirthTitle(s.rebirths) ? ` · ${rebirthTitle(s.rebirths)}` : ''}{nextRebirthTitle(s.rebirths) ? ` · ${nextRebirthTitle(s.rebirths)!.rebirths}회에 ‘${nextRebirthTitle(s.rebirths)!.title}’` : ''}</small></strong></span></div>
            <div><Sparkles size={22}/><span>보유 진주<strong><Num n={s.pearls}/> <small>개</small></strong></span></div>
            <div><span>영구 경험치 배율<strong>×{permanentExp.toFixed(2)}</strong></span></div>
            <div><span>현재 장착 AP<strong>{apCapacity(s)} <small>환생 +{rebirthAP(s)} · 연구 +{s.permanent.ap || 0}</small></strong></span></div>
        </section>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="prepare">환생 준비</TabsTrigger><TabsTrigger value="research">진주 연구</TabsTrigger><TabsTrigger value="relics">환생 유물</TabsTrigger></TabsList></Tabs>
        {tab === 'prepare' && <>
            <GrowthGoals s={s} send={send} busy={busy}/>
            {s.rebirths > 0 && <FocusPanel s={s} send={send} busy={busy}/>}
            {s.rebirths > 0 && <AccountPanel s={s}/>}
            {s.rebirths > 0 && <VowPanel s={s} send={send} busy={busy}/>}
            <section className="panel rebirth-ready">
                <div className="rebirth-ready-copy"><span className="eyebrow">{s.rebirths + 1}번째 환생</span><h2>{s.level >= required ? '다음 항해를 시작할 준비가 됐습니다' : `Lv.${required}에 새로운 항해가 열립니다`}</h2><Meter value={Math.min(s.level, required)} max={required} label="레벨 조건"/>
                    {s.lifeBonus && <p className="footnote">이번 생 효과: {s.lifeBonus === 'deep' ? '깊은 항해 · 직업·스킬 숙련 기본 획득 +2' : tailwindActive(s) ? `순풍 · Lv.${required}까지 경험치 +${Math.round(tailwindExp(s) * 100)}%` : '순풍 (요구 레벨 도달로 종료)'}</p>}</div>
                <div className="rebirth-reward"><span>{s.level >= required ? '이번에 받을 진주' : '환생 조건 달성 시 예상 진주'}</span><strong><Sparkles size={26}/>{format(reward + breathExtra)}</strong>
                    <ConfirmButton label="환생하기" title="다음 항해를 시작할까요?" description="오른쪽 아래 '초기화되는 것'이 처음 상태로 돌아가고, '유지되는 것'은 그대로 남습니다. 진행 중인 전투·던전은 종료됩니다." disabled={busy || s.level < required} onConfirm={() => send({ type: 'rebirth' })}/>
                </div>
            </section>
            <div className="rebirth-records rebirth-three">
                <article className="panel ledger-gain"><h2>받는 보상</h2><ul>
                    <li><b>진주 +{format(reward + breathExtra)}</b><small>레벨 {parts.level} · 환생 횟수 {parts.count}{parts.bonus ? ` · 연구·스킬 ${parts.bonus}` : ''}{parts.deep ? ` · 깊은 항해 ${parts.deep}` : ''}{breathExtra ? ` · 한 번의 숨 +${breathExtra}` : ''}</small></li>
                    <li><b>환생 영구 보너스: 체력·물리/마법 공격·물리/마법 방어</b><small>현재 +{memoryNow}% → 환생 후 +{memoryNext}%</small></li>
                    <li><b>영구 경험치 획득</b><small>현재 ×{permanentExp.toFixed(2)} → 환생 후 ×{(permanentExp - rebirthExperience(s.rebirths) + rebirthExperience(s.rebirths + 1)).toFixed(2)}</small></li>
                    <li><b>장착 AP {apGain ? '+1' : '+0'}</b><small>{apGain ? `환생 AP ${rebirthAP(s)} → ${rebirthAP(s) + 1}` : `환생 AP 최대치(${ECONOMY.rebirthAPCap}) 도달`}</small></li>
                    <li><b>다음 생 효과</b><small>{lifeText}</small></li>
                    {salvage.rate > 0 && <li><b>환생 정리 · 장비 {salvage.count}개 {salvage.mode === 'dismantle' ? `분해 → 정수 +${format(salvage.essence)}` : `판매 → 시작 골드 +${format(salvage.gold)} G`}</b><small>효율 {Math.round(salvage.rate * 100)}% · 방식은 설정에서 바꿉니다</small></li>}
                    <li><b>해역 난이도 {tideLimit({ ...s, rebirths: s.rebirths + 1 })}까지 선택</b><small>다음 생 시작 골드 {format(100 + (s.permanent.starting || 0) * 500)} G</small></li>
                </ul></article>
                <article className="panel ledger-kept"><h2>유지되는 것</h2><ul><li>진주 · 진주 연구 · 물고기와 장비 도감</li><li>스킬 해금·계승·성장·숙련·특화 · 보유 SP · 장기 목표</li><li>직업 해금과 숙련 기록</li><li>환생 유물 · 유물 강화·옵션·보관 위치</li><li>길드 이름·명예 기부 기록 · 던전 정복 기록 · 심연 최고 깊이</li><li>랭킹 점수와 전적</li></ul></article>
                <article className="panel ledger-reset"><h2>초기화되는 것</h2><ul><li>레벨·경험치 · 현재 직업 → 견습 낚시꾼</li><li>능력치 배분</li><li>일반 장비와 해당 장비의 강화·옵션</li><li>골드 → 시작 골드</li><li>낚시터와 해역 난이도 선택</li><li>진행 중 전투·던전</li></ul></article>
            </div>
            <p className="footnote">진주·영구 보너스의 계산식과 연구 상한은 도움말의 ‘환생’에서 확인할 수 있습니다.{!s.rebirths && ' 첫 환생 뒤에 이번 생의 조건 카드·계정 보너스·서약이 열립니다.'}</p>
            <details className="panel legacy-roadmap legacy-fold"><summary>환생 이후에 열리는 콘텐츠</summary><p><b>1회</b> 윤회의 챔질 · 황금의 기억 · 심해 신전(Lv.30) · 윤회의 낚싯대</p><p><b>2회</b> 영혼의 비늘 · 영혼의 잠수복</p><p><b>3회</b> 영원의 해류 · 심연의 눈 · 무한 심연(Lv.40)</p><p><b>5회</b> 황혼의 열수구(Lv.55) · 칭호 ‘되돌아온 낚시꾼’ · 연구 해금 마무리</p><p><b>8회</b> 열수 대성당(Lv.60)</p><p><b>10·20·30·50회</b> 윤회 칭호 ‘윤회의 항해자’ · ‘조류를 거스른 자’ · ‘심연을 건넌 자’ · ‘영원의 낚시꾼’</p><p>무한 심연은 5연전 정복마다 다음 깊이를 엽니다. 깊을수록 층당 진주가 늘고, 10·25·50·100층 첫 돌파 시 SP 1.</p></details>
            <details className="panel legacy-fold data-management"><summary>저장 데이터 관리</summary><p>전체 초기화는 환생과 다릅니다. 이름을 제외한 모든 성장 기록과 랭킹 방어 등록을 삭제하며 복구할 수 없습니다. 자동 낚시를 중단하고 던전에서 나온 뒤 진행하세요.</p><ConfirmButton label="전체 데이터 초기화" title="정말 모든 데이터를 초기화할까요?" description="레벨·장비·환생·진주·도감·스킬·길드·랭킹을 모두 처음 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다." disabled={busy || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetData' })}/></details>
        </>}
        {tab === 'research' && <><p className="tab-intro">진주 연구는 환생 후에도 유지됩니다. 카드에는 1단계당 증가량과 현재 → 다음 단계 효과를 표시합니다.</p>
            <Tabs value={researchTab} onValueChange={v => setResearchTab(v as ResearchTab)}><TabsList className="game-tabs research-tabs">{RESEARCH_TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.name}</TabsTrigger>)}</TabsList></Tabs>
            <ResearchTabView tab={researchTab} s={s} send={send} busy={busy}/></>}
        {tab === 'relics' && <><p className="tab-intro">환생해도 강화와 옵션까지 남는 장비입니다. 종류당 하나만 보유할 수 있습니다.</p><div className="port-gamble-grid">{RELICS.map(r => {
            const cost = relicCost(s, r.id), owned = ownsRelic(s, r.id);
            return <article className="panel market-card" key={r.id}><SlotIcon slot={r.slot} size={28}/><span className="badge">환생 {r.rebirth}회</span><h2>{r.name}</h2><p>{r.description}</p><BonusList item={{ ...r, id: r.id, rarity: 3, level: 1 }}/>{r.id === 'memoryRod' && <p className="footnote">심해 신전 정복 후 무료 수령 가능</p>}<button className="primary" disabled={busy || owned || s.rebirths < r.rebirth || s.pearls < cost || s.inventory.length >= BALANCE.inventoryCap} onClick={() => send({ type: 'buyRelic', id: r.id })}>{owned ? '보유 중' : s.rebirths < r.rebirth ? `환생 ${r.rebirth}회 필요` : cost === 0 ? '신전 보상 수령' : `${cost} 진주 · 구매`}</button></article>;
        })}</div><p className="footnote">유물은 판매·도감 소모가 불가능합니다. 옵션 재설정 시 전용 옵션도 교체됩니다.</p></>}
    </>;
}

