'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Unit } from '@/game/srpg/engine/types';
import { CHAPTERS } from '@/game/srpg/data/chapters/index';
import { SHOP_ITEMS, itemDef } from '@/game/srpg/data/items';
import { classDef, SKILL_TEXT } from '@/game/srpg/data/classes';
import { UNIT_MAP } from '@/game/srpg/data/units';
import { canPromote } from '@/game/srpg/engine/unit';
import { currentChapter, deployable, buy, sell, sellPrice, giveItem, storeItem, equipItem, applyConvoyItem, type Campaign } from '@/game/srpg/state/campaign';
import { MODE_NAMES } from './storage';
import { StatGrid, UnitHeader, ItemList } from './unit-sheet';
import { TerrainLegend } from './map-view';
import { MapPreview } from './map-view';
type Tab = 'units' | 'convoy' | 'shop' | 'records';
/** 베이스(출격 사이): 다음 장 안내, 부대, 창고 · 상점, 기록. */
export function BaseScreen({ campaign: c, setCampaign, onSortie, onTitle }: { campaign: Campaign; setCampaign: (c: Campaign) => void; onSortie: () => void; onTitle: () => void }) {
    const ch = currentChapter(c)!;
    const [tab, setTab] = useState<Tab>('units');
    const [picked, setPicked] = useState<string | null>(deployable(c)[0]?.uid ?? null);
    const [notices, setNotices] = useState<string[]>(c.notices);
    const apply = (fn: () => Campaign) => { try { const next = fn(); setCampaign({ ...next, notices: [] }); } catch (e) { toast.error((e as Error).message); } };
    const unit = c.roster.find(u => u.uid === picked) ?? null;
    const dismissNotices = () => { setNotices([]); setCampaign({ ...c, notices: [] }); };
    return <div className="tx-base">
        <header className="tx-base-head">
            <div><p className="eyebrow">소금바람 해안 전기 · {MODE_NAMES[c.mode]}</p><h1>{ch.number}장 — {ch.title}</h1><p className="tx-lead">{ch.subtitle}</p></div>
            <div className="tx-base-cta"><div className="tx-gold">{c.gold.toLocaleString()} 골드</div><button type="button" className="primary" onClick={onSortie}>출격 준비</button><button type="button" className="text-button" onClick={onTitle}>제목으로</button></div>
        </header>
        {notices.length > 0 && <div className="tx-notices" role="status"><ul>{notices.map((n, i) => <li key={i}>{n}</li>)}</ul><button type="button" className="text-button" onClick={dismissNotices}>확인</button></div>}
        <section className="tx-chapter-card">
            <div className="tx-chapter-info">
                <div><span>목표</span><strong>{ch.objective.text}</strong></div>
                <div><span>패배 조건</span><strong>{ch.defeat_conditions.join(' · ')}</strong></div>
                <div><span>권장 레벨</span><strong>{ch.recommended_level}</strong></div>
                <div><span>출격 인원</span><strong>최대 {ch.max_deploy}명 (부대 {deployable(c).length}명)</strong></div>
                <div><span>맵</span><strong>{ch.map.width}×{ch.map.height}</strong></div>
            </div>
            <MapPreview chapter={ch} size={10}/>
        </section>
        <nav className="tx-tabs" aria-label="베이스 메뉴">{([['units', '부대'], ['convoy', '창고 · 장비'], ['shop', '상점'], ['records', '기록']] as [Tab, string][]).map(([id, name]) => <button type="button" key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{name}</button>)}</nav>
        {tab === 'units' && <div className="tx-two-col">
            <ul className="tx-roster">{c.roster.map(u => <li key={u.uid} className={`${u.uid === picked ? 'on' : ''} ${u.status === 'dead' ? 'dead' : ''}`} onClick={() => setPicked(u.uid)} role="button"><span className={`tx-token side-player`}>{classDef(u.classId).glyph}</span><div><strong>{u.name}</strong><small>{classDef(u.classId).name} Lv.{u.level}{u.status === 'dead' ? ' · 전사' : ''}</small></div></li>)}</ul>
            {unit && <UnitDetail u={unit} c={c} apply={apply}/>}
        </div>}
        {tab === 'convoy' && <ConvoyPanel c={c} apply={apply} picked={picked} setPicked={setPicked}/>}
        {tab === 'shop' && <ShopPanel c={c} apply={apply}/>}
        {tab === 'records' && <RecordsPanel c={c}/>}
        <TerrainLegend/>
    </div>;
}
function UnitDetail({ u, c, apply }: { u: Unit; c: Campaign; apply: (fn: () => Campaign) => void }) {
    const cls = classDef(u.classId), def = u.defId ? UNIT_MAP[u.defId] : null;
    const seals = c.convoy.filter(i => itemDef(i.id).kind === 'promote');
    const boosts = c.convoy.filter(i => itemDef(i.id).kind === 'boost');
    const [promoTo, setPromoTo] = useState<string>(cls.promotes_to[0] ?? '');
    return <section className="tx-detail">
        <UnitHeader u={u}/>
        <StatGrid u={u}/>
        <p className="tx-skill"><b>클래스 규칙</b> {SKILL_TEXT[cls.skill]} · <b>이동</b> {cls.move} ({{ infantry: '보병', cavalry: '기병', armored: '중갑', flying: '비행' }[cls.move_type]}) · <b>무기</b> {cls.weapons.map(w => ({ sword: '검', lance: '창', axe: '도끼', bow: '활', fire: '불', wind: '바람', thunder: '번개', light: '빛', dark: '어둠', staff: '지팡이', dagger: '단검', claw: '발톱' })[w]).join(' · ')} · <b>격파</b> {u.kills}</p>
        {def && <p className="tx-bio">{def.bio}</p>}
        <h3>소지품 <small>장착할 무기를 누르세요</small></h3>
        <ItemList u={u} onPick={i => { const d = itemDef(u.items[i].id); if (d.weapon) apply(() => equipItem(c, u.uid, i)); }} action={i => <button type="button" className="text-button" onClick={e => { e.stopPropagation(); apply(() => storeItem(c, u.uid, i)); }}>창고로</button>}/>
        {u.status !== 'dead' && <div className="tx-promote">
            {cls.rank === 'base' && <>
                <strong>승급</strong> <span>{canPromote(u) ? '가능' : `10레벨부터 (지금 ${u.level})`} · 조류의 증표 {seals.length}개</span>
                {cls.promotes_to.length > 1 && <select value={promoTo} onChange={e => setPromoTo(e.target.value)}>{cls.promotes_to.map(id => <option key={id} value={id}>{classDef(id).name}</option>)}</select>}
                <button type="button" className="secondary" disabled={!canPromote(u) || !seals.length} onClick={() => apply(() => applyConvoyItem(c, u.uid, seals[0].n, promoTo || cls.promotes_to[0]))}>{classDef(promoTo || cls.promotes_to[0]).name}(으)로 승급</button>
            </>}
            {boosts.length > 0 && <div className="tx-boosts">{boosts.map(b => <button type="button" key={b.n} className="secondary small" onClick={() => apply(() => applyConvoyItem(c, u.uid, b.n))}>{itemDef(b.id).name} 쓰기</button>)}</div>}
        </div>}
    </section>;
}
function ConvoyPanel({ c, apply, picked, setPicked }: { c: Campaign; apply: (fn: () => Campaign) => void; picked: string | null; setPicked: (uid: string) => void }) {
    const target = c.roster.find(u => u.uid === picked && u.status !== 'dead') ?? deployable(c)[0];
    return <div className="tx-two-col">
        <section className="tx-detail">
            <h3>창고 <small>{c.convoy.length}개 · 누르면 {target?.name ?? '유닛'}에게</small></h3>
            <ul className="tx-items">{c.convoy.map(it => { const d = itemDef(it.id); return <li key={it.n} role="button" onClick={() => target && apply(() => giveItem(c, target.uid, it.n))}><span className="tx-item-name">{d.weapon ? <b className={`wt wt-${d.weapon.type}`}/> : <b className="wt wt-item"/>}{d.name}</span><small>{it.uses}/{d.uses} · {d.desc}</small><button type="button" className="text-button" onClick={e => { e.stopPropagation(); apply(() => sell(c, it.n)); }}>팔기 {sellPrice(it)}G</button></li>; })}{c.convoy.length === 0 && <li className="empty">창고가 비었다</li>}</ul>
        </section>
        <section className="tx-detail">
            <h3>받을 유닛</h3>
            <div className="tx-chips">{deployable(c).map(u => <button type="button" key={u.uid} className={u.uid === target?.uid ? 'on' : ''} onClick={() => setPicked(u.uid)}>{u.name} <small>{u.items.length}/5</small></button>)}</div>
            {target && <><UnitHeader u={target}/><ItemList u={target} onPick={i => { const d = itemDef(target.items[i].id); if (d.weapon) apply(() => equipItem(c, target.uid, i)); }} action={i => <button type="button" className="text-button" onClick={e => { e.stopPropagation(); apply(() => storeItem(c, target.uid, i)); }}>창고로</button>}/></>}
        </section>
    </div>;
}
function ShopPanel({ c, apply }: { c: Campaign; apply: (fn: () => Campaign) => void }) {
    return <section className="tx-detail">
        <h3>행상 <small>산 물건은 창고로 들어갑니다 · {c.gold.toLocaleString()} 골드</small></h3>
        <ul className="tx-items tx-shop">{SHOP_ITEMS.map(d => <li key={d.id}><span className="tx-item-name">{d.weapon ? <b className={`wt wt-${d.weapon.type}`}/> : <b className="wt wt-item"/>}{d.name}</span><small>{d.desc}{d.weapon && <> · 위력 {d.weapon.might} 명중 {d.weapon.hit} 필살 {d.weapon.crit} 내구 {d.uses}</>}</small><button type="button" className="secondary small" disabled={c.gold < d.price} onClick={() => apply(() => buy(c, d.id))}>{d.price}G</button></li>)}</ul>
    </section>;
}
function RecordsPanel({ c }: { c: Campaign }) {
    return <section className="tx-detail">
        <h3>기록</h3>
        <table className="tx-table"><thead><tr><th>장</th><th>제목</th><th>턴</th><th>쓰러진 동료</th></tr></thead><tbody>{CHAPTERS.map(ch => { const r = c.cleared[ch.id]; return <tr key={ch.id} className={r ? '' : 'dim'}><td>{ch.number}</td><td>{ch.title}</td><td>{r ? r.turns : '—'}</td><td>{r ? (r.fallen.length ? r.fallen.join(', ') : '없음') : ''}</td></tr>; })}</tbody></table>
        <p className="tx-note">총 턴 {c.totalTurns} · 시작 {new Date(c.startedAt).toLocaleDateString()}</p>
    </section>;
}
