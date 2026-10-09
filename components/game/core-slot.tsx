'use client';
/** v3.204 보스 코어 칸: 장비 보관함의 착용 장비 아래에 보입니다(던전 주화 상점 보스 코어 탭은 v3.206부터 타일 · 상세 칸). */
import { Hexagon } from 'lucide-react';
import { BOSS_CORES, BOSS_CORE_RULES, ownedCores, coreEntry, coreAwaken } from '@/game/data/boss-core';
import { ATTRIBUTES } from '@/game/data/progression';
import { format } from './shared';
import type { PanelProps } from './panel-props';

const CORE_COLOR = '#d6b879';
const attrName = (k: string) => ATTRIBUTES.find(t => t.id === k)?.name || k;
/** 이 코어의 기본 능력치 줄(지금 레벨 · 각성 · 칸 여부 반영). */
export function coreAttrText(s: PanelProps['s'], id: string, worn = s.coreSlot === id) {
    const e = coreEntry(s.bossCores?.[id]);
    if (!e) return '';
    const m = coreAwaken(e.rank) * (worn ? 1 : BOSS_CORE_RULES.resonance);
    return e.attrs.length ? e.attrs.map(x => `${attrName(x.k)} +${format(Math.floor(Math.max(1, s.level) * x.f * m))} (레벨 ×${x.f})`).join(' · ') : '기본 능력치 없음(재설정으로 채움)';
}

/** 착용 장비 칸과 같은 모양의 보스 코어 칸 한 줄: 낀 코어, 바꾸기, 해제. */
export function CoreSlot({ s, send, busy }: Pick<PanelProps, 's' | 'send' | 'busy'>) {
    const owned = ownedCores(s), id = s.coreSlot && owned.includes(s.coreSlot) ? s.coreSlot : '', core = id ? BOSS_CORES[id] : undefined, e = coreEntry(s.bossCores?.[id]);
    return <article className="panel gear-slot core-slot" style={{ '--rarity': core ? CORE_COLOR : '#5a6f71' } as React.CSSProperties} aria-label="보스 코어 칸">
        <div className="gear-slot-head"><Hexagon size={18}/><span>보스 코어 · 보유 {owned.length}/{Object.keys(BOSS_CORES).length}종</span>{core && <button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'equipCore', id: '' })}>해제</button>}</div>
        {core && e ? <div className="core-slot-body">
            <strong>{core.name} <span className="gold-text">각성 {e.rank}/{BOSS_CORE_RULES.awakenMax}</span></strong>
            <small>{core.desc}</small>
            <small>{coreAttrText(s, id, true)}</small>
        </div> : <p className="gear-slot-empty">{owned.length ? '비어 있음 · 아래 칸에서 낄 코어를 고르세요' : '보스 코어가 없습니다. 지역 던전 보너스 정복이나 던전 주화 상점 상자로 얻습니다.'}</p>}
        {owned.length > 0 && <div className="gear-slot-upgrade"><span>칸에 낀 코어 100% · 나머지는 공명 {Math.round(BOSS_CORE_RULES.resonance * 100)}%(턴 연장 제외)</span>
            <select aria-label="보스 코어 바꾸기" value={id} disabled={busy} onChange={ev => send({ type: 'equipCore', id: ev.target.value })}><option value="">비우기</option>{owned.map(c => <option key={c} value={c}>{BOSS_CORES[c].name}</option>)}</select></div>}
    </article>;
}
