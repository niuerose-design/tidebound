'use client';
import { GrowthGoals } from './growth-goals';
import { useState } from 'react';
import { Sparkles, Coins, RefreshCw, ShoppingBag } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { State, Action, Item, Stats } from '@/game/types';
import { rebirthExperience, rebirthMemory } from '@/game/data/long-term';
import { SHOP, GAMBLE_CATEGORIES, RESEARCH, RELICS, ECONOMY, APPRAISAL, AFFIXES, researchCost } from '@/game/data/economy';
import { SLOTS, RARITIES, BALANCE } from '@/game/data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay } from '@/game/data/progression';
import { itemStats, itemDescription, enhanceCost, reforgeCost, bulkItems, saleValue } from '@/game/systems/equipment';
import { shopCost, gambleCost, ownsRelic, relicCost, shopPreview } from '@/game/systems/commerce';
import { rebirthRewardParts, nextLifeBonus, tailwindActive, TAILWIND_WINDOW, TAILWIND_EXP, DEEP_VOYAGE_LEVEL, rebirthLevel, rebirthReward, rebirthAP, tideLimit, tierReward, tierHealth, tierAttack } from '@/game/systems/meta';
import { stats, permanentExpBonus } from '@/game/systems/stats';
import { apCapacity } from '@/game/systems/progression';
import { Heading, Meter, SlotIcon, format } from './shared';
type Props = {
    s: State;
    send: (a: Action) => void;
    busy: boolean;
};
function Confirm({ label, title, description, disabled, onConfirm }: {
    label: string;
    title: string;
    description: string;
    disabled: boolean;
    onConfirm: () => void;
}) {
    return <AlertDialog>
    <AlertDialogTrigger asChild>
    <button className="secondary" disabled={disabled}>{label}</button>
    </AlertDialogTrigger>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>{title}</AlertDialogTitle>
    <AlertDialogDescription>{description}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel>취소</AlertDialogCancel>
    <AlertDialogAction onClick={onConfirm}>확인</AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>;
}
function BonusList({ item }: {
    item: Item;
}) {
    return <div className="equipment-numbers">{byStatOrder(Object.entries(itemStats(item))).map(([key, value]) => <span key={key}>{STAT_LABELS[key as keyof Stats]}<b>{statDeltaDisplay(key, value as number)}</b>
        </span>)}</div>;
}
export function Inventory({ s, send, busy }: Props) {
    const [filter, setFilter] = useState('all');
    const current = stats(s);
    const card = (item: Item, equipped = false) => {
        const after = stats({ ...s, equipment: { ...s.equipment, [item.slot]: item } });
        const delta = Object.entries(after).filter(([k, n]) => Math.abs(n - current[k as keyof Stats]) > .001);
        return <article key={item.id} className="panel item-card" style={{ '--rarity': RARITIES[item.rarity].color } as React.CSSProperties}>
 <div className="item-top">
        <span>{RARITIES[item.rarity].name} · {SLOTS[item.slot]}</span>
        <small>{item.relic ? '환생 보존 유물' : `획득 Lv.${item.level}`}{item.locked ? ' · 보호' : ''}</small>
        </div>
        <h3>
        <SlotIcon slot={item.slot}/>{item.name} <span className="gold-text">+{item.enhance || 0}</span>
        </h3>
        <p>{itemDescription(item)}</p>
        <BonusList item={item}/>
        <p className="footnote">직업 배율 적용 전 장비 기여 수치 · 강화 +{(item.enhance || 0) * 15}%</p>
 {item.affix && <div className="affix-explanation">
            <b>추가 옵션 · {item.affix.name}</b>
            <span>{STAT_LABELS[item.affix.stat]} {statDeltaDisplay(item.affix.stat, item.affix.value)}</span>
            <p>{AFFIXES.find(a => a.stat === item.affix?.stat)?.description || '장착 시 해당 능력치에 더해집니다.'} 위 수치에 포함됩니다.</p>
            </div>}
 {!equipped && <div className="equipment-comparison">
            <small>교체 후 최종 능력치 변화</small>{delta.length ? byStatOrder(delta).map(([k, n]) => { const d = n - current[k as keyof Stats]; return <span key={k} className={d > 0 ? 'positive' : 'negative'}>{STAT_LABELS[k as keyof Stats]} {statDeltaDisplay(k, d)}</span>; }) : <span>변화 없음</span>}</div>}
 <div className="button-row">
        <button className="primary small" disabled={busy} onClick={() => send({ type: equipped ? 'unequip' : 'equip', id: equipped ? item.slot : item.id })}>{equipped ? '장착 해제' : '장착'}</button>{!equipped && <>
            <button className="secondary small" disabled={busy} onClick={() => send({ type: 'lockItem', id: item.id })}>{item.locked ? '보호 해제' : '보호'}</button>
            <button className="text-button" disabled={busy || !!item.locked || !!item.relic} onClick={() => send({ type: 'sell', id: item.id })}>{format(saleValue(item))} G 판매</button>
            </>}</div>
 <details className="forge-details"><summary>강화 · 옵션 재설정</summary><EquipmentForge s={s} send={send} busy={busy} item={item}/></details>
 </article>;
    };
    return <>
    <Heading eyebrow="EQUIPMENT & FORGE" title="장비 보관함" description="실제 능력치와 교체 결과를 비교하세요. 보호한 장비와 유물은 일괄판매에서 제외됩니다.">
    <span className="badge">{s.inventory.length} / {BALANCE.inventoryCap}</span>
    </Heading>
    <h2 className="economy-section-title">착용 장비</h2>
    <div className="item-grid">{Object.values(s.equipment).filter((i): i is Item => !!i).map(i => card(i, true))}</div>
    <section className="panel bulk-sale">
    <div>
    <h2>등급별 일괄판매</h2>
    <p>현재 부위 필터와 관계없이 가방 전체에서 선택한 등급만 판매합니다.</p>
    </div>
    <div className="button-row">{RARITIES.map((r, i) => { const items = bulkItems(s, i), gold = items.reduce((sum, item) => sum + saleValue(item), 0); return <Confirm key={r.name} label={`${r.name} ${items.length}개`} title={`${r.name} 장비 ${items.length}개를 판매할까요?`} description={`보호하지 않은 일반 장비만 판매하여 ${format(gold)} G를 받습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'sellRarity', id: String(i) })}/>; })}</div>
    </section>
    <Tabs value={filter} onValueChange={setFilter}>
    <TabsList className="game-tabs">
    <TabsTrigger value="all">전체 가방</TabsTrigger>{Object.entries(SLOTS).map(([id, n]) => <TabsTrigger key={id} value={id}>{n}</TabsTrigger>)}</TabsList>
    </Tabs>
    <div className="item-grid">{s.inventory.filter(i => filter === 'all' || i.slot === filter).map(i => card(i))}</div>{!s.inventory.length && <div className="notice">가방이 비어 있습니다. 낚시 또는 항구 상점에서 장비를 획득하세요.</div>}</>;
}
function EquipmentForge({ s, send, busy, item }: Props & { item: Item }) {
    const rank = item.enhance || 0, cost = enhanceCost(item);
    return <div className="forge-actions">
        <p className="footnote">강화 1회당 기본 수치 +{ECONOMY.enhanceGain * 100}%. 실패·파괴 없이 최대 +{ECONOMY.enhanceMax}. 추가 옵션은 그대로입니다.</p>
        <button className="primary" disabled={busy || rank >= ECONOMY.enhanceMax || s.gold < cost} onClick={() => send({ type: 'enhance', id: item.id })}>{rank >= ECONOMY.enhanceMax ? '최대 강화' : `+${rank + 1} 강화 · ${format(cost)} G`}</button>
        <Confirm label={`옵션 재설정 · ${format(reforgeCost(item))} G`} title="추가 옵션을 무작위로 바꿀까요?" description="기존 추가 옵션이 사라지고 8종 중 하나가 같은 확률로 선택됩니다. 같은 옵션이 다시 나올 수 있으며, 유물의 전용 옵션도 교체됩니다." disabled={busy || item.rarity === 0 || s.gold < reforgeCost(item)} onConfirm={() => send({ type: 'reforge', id: item.id })}/>
    </div>;
}
export function Shop({ s, send, busy }: Props) {
    const [tab, setTab] = useState('gamble');
    const cost = shopCost(s), gamble = gambleCost(s), full = s.inventory.length >= BALANCE.inventoryCap;
    return <>
        <Heading eyebrow="HARBOR MARKET" title="항구 상점" description="장비를 고르고, 감정하고, 단련하는 곳."/>
        <section className="panel port-resource-bar" aria-label="상점 재화와 보관함">
            <div><Coins size={22}/><span>보유 골드<strong>{format(s.gold)} <small>G</small></strong></span></div>
            <div><ShoppingBag size={22}/><span>장비 가방<strong>{s.inventory.length} <small>/ {BALANCE.inventoryCap}</small></strong></span></div>
            <div><span>현재 구매 장비<strong>Lv.{s.level}</strong></span></div>
        </section>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="gamble">장비 감정</TabsTrigger><TabsTrigger value="buy">확정 구매</TabsTrigger><TabsTrigger value="forge">장비 강화</TabsTrigger></TabsList></Tabs>
        {tab === 'gamble' && <section aria-label="부위별 장비 감정">
            <div className="appraisal-odds"><span>감정 등급 확률</span>{APPRAISAL.map(r => <b key={r.rarity} style={{ color: RARITIES[r.rarity].color }}>{RARITIES[r.rarity].name} {Math.round(r.chance * 100)}%</b>)}</div>
            <div className="port-gamble-grid">{GAMBLE_CATEGORIES.map(o => <article className="panel market-card gamble-card" key={o.id}>
                <div className="gamble-icon"><SlotIcon slot={o.slot} size={34}/></div>
                <div><span className="eyebrow">미확인 장비</span><h2>{o.name}</h2></div><p>{o.description}</p>
                <span className="gamble-guarantee">Lv.{s.level} · 희귀 이상 · 무작위 옵션 1개</span>
                <Confirm label={`${format(gamble)} G · 감정`} title={`${o.name}을 감정할까요?`} description={`골드 ${format(gamble)} G를 사용합니다. ${APPRAISAL.map(r => `${RARITIES[r.rarity].name} ${Math.round(r.chance * 100)}%`).join(' · ')}. ${o.description} 추가 옵션 8종은 같은 확률이며, 결과는 가방에 보관됩니다.`} disabled={busy || s.gold < gamble || full} onConfirm={() => send({ type: 'gamble', id: o.id })}/>
            </article>)}</div>
            <p className="footnote">장비 드롭 보너스는 감정 확률에 영향을 주지 않습니다. 획득한 장비는 보관함에서 직접 장착하세요.</p>
        </section>}
        {tab === 'buy' && <section aria-label="확정 장비 구매"><div className="port-purchase-grid">{SHOP.map(o => <article className="panel market-card" key={o.id}>
            <SlotIcon slot={o.slot} size={26}/><h2>{o.name}</h2><p>{o.description} · 희귀 · Lv.{s.level}</p>
            <BonusList item={shopPreview(s, o.id)}/><button className="primary" disabled={busy || s.gold < cost || full} onClick={() => send({ type: 'buy', id: o.id })}>구매 · {format(cost)} G</button>
        </article>)}</div><p className="footnote">표시된 등급과 추가 옵션을 확정적으로 획득합니다. 일반 장비는 환생 시 초기화됩니다.</p></section>}
        {tab === 'forge' && <section aria-label="장비 강화">
            <div className="section-title"><h2>착용 장비 강화</h2><span>보관 중인 장비는 장비 보관함에서 강화</span></div>
            <div className="port-gamble-grid">{Object.entries(SLOTS).map(([slot, name]) => {
                const item = s.equipment[slot as keyof typeof s.equipment];
                return <article className="panel market-card forge-card" key={slot}><SlotIcon slot={slot}/><small>{name}</small>{item ? <><h2>{item.name} <span className="gold-text">+{item.enhance || 0}</span></h2><BonusList item={item}/><EquipmentForge s={s} send={send} busy={busy} item={item}/></> : <><h2>착용 장비 없음</h2><p>장비 보관함에서 {name}을 장착하세요.</p></>}</article>;
            })}</div>
        </section>}
        {full && <div className="notice">가방이 가득 찼습니다. 장비를 정리하면 다시 구매·감정할 수 있습니다.</div>}
        <p className="footnote">구매·강화·옵션 변경 비용은 판매할 때 환급되지 않습니다.</p>
    </>;
}
export function TideSelector({ s, send, busy }: Props) {
    return <section className="panel tide-selector">
    <div>
    <h3>환생 해역 · 난이도 {s.tide || 0}</h3>
    <p>적 HP ×{tierHealth(s.tide || 0).toFixed(2)} · 공격 ×{tierAttack(s.tide || 0).toFixed(2)} · 골드/EXP ×{tierReward(s.tide || 0).toFixed(2)} · 장비 생성 레벨 +{(s.tide || 0) * 5}</p>
    <small>환생마다 1단계 해금(최대 200). 일반 낚시터에만 적용하며 선택은 자유입니다.</small>
    </div>
    <div className="button-row">
    <button className="secondary" disabled={busy || !!s.dungeon || !s.tide} onClick={() => send({ type: 'tide', id: String(s.tide - 1) })}>−</button>
    <span>{s.tide || 0} / {tideLimit(s)}</span>
    <button className="secondary" disabled={busy || !!s.dungeon || (s.tide || 0) >= tideLimit(s)} onClick={() => send({ type: 'tide', id: String((s.tide || 0) + 1) })}>+</button>
    </div>
    </section>;
}
export function Rebirth({ s, send, busy }: Props) {
    const [tab, setTab] = useState('prepare');
    const required = rebirthLevel(s), bonus = stats(s).rebirthBonus;
    const reward = rebirthReward({ ...s, level: Math.max(s.level, required) }, bonus), permanentExp = 1 + permanentExpBonus(s);
    const apGain = s.rebirths < ECONOMY.rebirthAPCap ? 1 : 0;
    const projected = { ...s, level: Math.max(s.level, required) }, lifeBonus = nextLifeBonus(projected);
    const parts = rebirthRewardParts(projected, bonus), memoryNow = Number(((rebirthMemory(s.rebirths) - 1) * 100).toFixed(1)), memoryNext = Number(((rebirthMemory(s.rebirths + 1) - 1) * 100).toFixed(1));
    const lifeText = lifeBonus === 'deep' ? `깊은 항해 · 다음 생 동안 직업·스킬 숙련 기본 획득 +2` : lifeBonus === 'tailwind' ? `순풍 · 다음 생 Lv.${rebirthLevel({ ...s, rebirths: s.rebirths + 1 })}까지 경험치 +${TAILWIND_EXP * 100}%` : `없음 · Lv.${required + TAILWIND_WINDOW} 이하면 순풍, Lv.${DEEP_VOYAGE_LEVEL}이면 깊은 항해`;
    return <>
        <Heading eyebrow="REBIRTH & LEGACY" title="환생" description="이번 항해를 마치고, 다음 생에 남길 힘을 선택하세요."/>
        <section className="panel port-resource-bar legacy-resource-bar">
            <div><RefreshCw size={22}/><span>누적 환생<strong>{format(s.rebirths)} <small>회</small></strong></span></div>
            <div><Sparkles size={22}/><span>보유 진주<strong>{format(s.pearls)} <small>개</small></strong></span></div>
            <div><span>영구 경험치 배율<strong>×{permanentExp.toFixed(2)}</strong></span></div>
            <div><span>현재 장착 AP<strong>{apCapacity(s)} <small>환생 +{rebirthAP(s)} · 연구 +{s.permanent.ap || 0}</small></strong></span></div>
        </section>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="prepare">환생 준비</TabsTrigger><TabsTrigger value="research">진주 연구</TabsTrigger><TabsTrigger value="relics">환생 유물</TabsTrigger></TabsList></Tabs>
        {tab === 'prepare' && <>
            <GrowthGoals s={s} send={send} busy={busy}/>
            <section className="panel rebirth-ready">
                <div className="rebirth-ready-copy"><span className="eyebrow">{s.rebirths + 1}번째 환생</span><h2>{s.level >= required ? '다음 항해를 시작할 준비가 됐습니다' : `Lv.${required}에 새로운 항해가 열립니다`}</h2><Meter value={Math.min(s.level, required)} max={required} label="레벨 조건"/>
                    {s.lifeBonus && <p className="footnote">이번 생 효과: {s.lifeBonus === 'deep' ? '깊은 항해 · 직업·스킬 숙련 기본 획득 +2' : tailwindActive(s) ? `순풍 · Lv.${required}까지 경험치 +${TAILWIND_EXP * 100}%` : '순풍 (요구 레벨 도달로 종료)'}</p>}</div>
                <div className="rebirth-reward"><span>{s.level >= required ? '이번에 받을 진주' : '환생 조건 달성 시 예상 진주'}</span><strong><Sparkles size={26}/>{format(reward)}</strong>
                    <Confirm label="환생하기" title="다음 항해를 시작할까요?" description="오른쪽 아래 '초기화되는 것'이 처음 상태로 돌아가고, '유지되는 것'은 그대로 남습니다. 진행 중인 전투·던전은 종료됩니다." disabled={busy || s.level < required} onConfirm={() => send({ type: 'rebirth' })}/>
                </div>
            </section>
            <div className="rebirth-records rebirth-three">
                <article className="panel ledger-gain"><h2>받는 보상</h2><ul>
                    <li><b>진주 +{format(reward)}</b><small>레벨 {parts.level} · 환생 횟수 {parts.count}{parts.bonus ? ` · 연구·스킬 ${parts.bonus}` : ''}{parts.deep ? ` · 깊은 항해 ${parts.deep}` : ''}</small></li>
                    <li><b>환생 영구 보너스: 체력·물리/마법 공격·물리/마법 방어</b><small>현재 +{memoryNow}% → 환생 후 +{memoryNext}%</small></li>
                    <li><b>영구 경험치 획득</b><small>현재 ×{permanentExp.toFixed(2)} → 환생 후 ×{(permanentExp - rebirthExperience(s.rebirths) + rebirthExperience(s.rebirths + 1)).toFixed(2)}</small></li>
                    <li><b>장착 AP {apGain ? '+1' : '+0'}</b><small>{apGain ? `환생 AP ${rebirthAP(s)} → ${rebirthAP(s) + 1}` : `환생 AP 최대치(${ECONOMY.rebirthAPCap}) 도달`}</small></li>
                    <li><b>다음 생 효과</b><small>{lifeText}</small></li>
                    <li><b>해역 난이도 {tideLimit({ ...s, rebirths: s.rebirths + 1 })}까지 선택</b><small>다음 생 시작 골드 {format(100 + (s.permanent.starting || 0) * 500)} G</small></li>
                </ul></article>
                <article className="panel ledger-kept"><h2>유지되는 것</h2><ul><li>진주 · 진주 연구 · 물고기와 장비 도감</li><li>스킬 해금·계승·성장·숙련·특화 · 보유 SP · 항해 목표</li><li>직업 해금과 숙련 기록</li><li>환생 유물 · 유물 강화·옵션·보관 위치</li><li>길드·공헌·연구·레이드 · 던전 정복 기록 · 심연 최고 깊이</li><li>랭킹 점수와 전적</li></ul></article>
                <article className="panel ledger-reset"><h2>초기화되는 것</h2><ul><li>레벨·경험치 · 현재 직업 → 견습 낚시꾼</li><li>능력치 배분</li><li>일반 장비와 해당 장비의 강화·옵션</li><li>골드 → 시작 골드</li><li>낚시터와 해역 난이도 선택</li><li>진행 중 전투·던전</li></ul></article>
            </div>
            <p className="footnote">진주·영구 보너스의 계산식과 연구 상한은 도움말의 ‘환생’에서 확인할 수 있습니다.</p>
            <details className="panel legacy-roadmap legacy-fold"><summary>환생 이후에 열리는 콘텐츠</summary><p><b>1회</b> 윤회의 챔질 · 황금의 기억 · 심해 신전(Lv.30) · 윤회의 낚싯대</p><p><b>2회</b> 영혼의 비늘 · 영혼의 잠수복</p><p><b>3회</b> 영원의 해류 · 심연의 눈 · 무한 심연(Lv.40)</p><p>무한 심연은 5연전 정복마다 다음 깊이를 엽니다. 깊을수록 층당 진주가 늘고, 10·25·50·100층 첫 돌파 시 SP 1.</p></details>
            <details className="panel legacy-fold data-management"><summary>저장 데이터 관리</summary><p>전체 초기화는 환생과 다릅니다. 이름을 제외한 모든 성장 기록과 랭킹 방어 등록을 삭제하며 복구할 수 없습니다. 자동 낚시를 중단하고 던전에서 나온 뒤 진행하세요.</p><Confirm label="전체 데이터 초기화" title="정말 모든 데이터를 초기화할까요?" description="레벨·장비·환생·진주·도감·스킬·길드·랭킹을 모두 처음 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다." disabled={busy || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetData' })}/></details>
        </>}
        {tab === 'research' && <><p className="tab-intro">진주 연구는 환생 후에도 유지됩니다. 수치는 연구 1단계당 증가량입니다.</p><div className="research-grid">{RESEARCH.map(r => {
            const rank = s.permanent[r.id] || 0, cost = researchCost(r.id, rank);
            return <article className="panel research-card" key={r.id}><div><h2>{r.name}</h2><p>{r.desc}</p><small>연구 {rank} / {r.max}</small></div><button className="secondary" disabled={busy || rank >= r.max || s.pearls < cost} onClick={() => send({ type: 'permanent', id: r.id })}>{rank >= r.max ? '연구 완료' : `${cost} 진주`}</button></article>;
        })}</div></>}
        {tab === 'relics' && <><p className="tab-intro">환생해도 강화와 옵션까지 남는 장비입니다. 종류당 하나만 보유할 수 있습니다.</p><div className="port-gamble-grid">{RELICS.map(r => {
            const cost = relicCost(s, r.id), owned = ownsRelic(s, r.id);
            return <article className="panel market-card" key={r.id}><SlotIcon slot={r.slot} size={28}/><span className="badge">환생 {r.rebirth}회</span><h2>{r.name}</h2><p>{r.description}</p><BonusList item={{ ...r, id: r.id, rarity: 3, level: 1 }}/>{r.id === 'memoryRod' && <p className="footnote">심해 신전 정복 후 무료 수령 가능</p>}<button className="primary" disabled={busy || owned || s.rebirths < r.rebirth || s.pearls < cost || s.inventory.length >= BALANCE.inventoryCap} onClick={() => send({ type: 'buyRelic', id: r.id })}>{owned ? '보유 중' : s.rebirths < r.rebirth ? `환생 ${r.rebirth}회 필요` : cost === 0 ? '신전 보상 수령' : `${cost} 진주 · 구매`}</button></article>;
        })}</div><p className="footnote">유물은 판매·도감 소모가 불가능합니다. 옵션 재설정 시 전용 옵션도 교체됩니다.</p></>}
    </>;
}
