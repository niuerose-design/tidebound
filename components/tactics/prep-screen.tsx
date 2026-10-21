'use client';
import { useState } from 'react';
import type { ChapterDef, Unit } from '@/game/srpg/engine/types';
import { classDef } from '@/game/srpg/data/classes';
import { UNIT_MAP } from '@/game/srpg/data/units';
import { deployable, type Campaign } from '@/game/srpg/state/campaign';
import { MapPreview } from './map-view';
import { StatGrid, UnitHeader, ItemList } from './unit-sheet';
import { DialogueBox } from './dialogue';
/** 출격 준비: 출격 유닛 선택(순서 = 배치 칸 순서). 전투 전 대사는 전투 화면에서 나옵니다. */
export function PrepScreen({ campaign: c, chapter: ch, onBack, onDeploy }: { campaign: Campaign; chapter: ChapterDef; onBack: () => void; onDeploy: (units: Unit[]) => void }) {
    const pool = deployable(c);
    const forced = pool.filter(u => u.defId && ch.forced_units.includes(u.defId)).map(u => u.uid);
    const [chosen, setChosen] = useState<string[]>(() => { const auto = [...forced]; for (const u of pool) if (auto.length < ch.max_deploy && !auto.includes(u.uid)) auto.push(u.uid); return auto; });
    const [peek, setPeek] = useState<string | null>(null);
    const [showIntro, setShowIntro] = useState(false);
    const toggle = (uid: string) => { if (forced.includes(uid)) return; setChosen(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : prev.length < ch.max_deploy ? [...prev, uid] : prev); };
    const move = (uid: string, dir: -1 | 1) => setChosen(prev => { const i = prev.indexOf(uid), j = i + dir; if (i < 0 || j < 0 || j >= prev.length) return prev; const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    const units = chosen.map(uid => pool.find(u => u.uid === uid)!);
    const peekUnit = pool.find(u => u.uid === peek);
    return <div className="tx-base tx-prep">
        <header className="tx-base-head"><div><p className="eyebrow">출격 준비</p><h1>{ch.number}장 — {ch.title}</h1><p className="tx-lead">{ch.objective.text} · 최대 {ch.max_deploy}명 · 권장 레벨 {ch.recommended_level}</p></div>
            <div className="tx-base-cta"><button type="button" className="primary" disabled={!chosen.length} onClick={() => onDeploy(units)}>출격 ({chosen.length}/{ch.max_deploy})</button><button type="button" className="text-button" onClick={onBack}>베이스로 가기</button></div></header>
        {ch.tips && <div className="tx-tips"><strong>이 장에서 배우는 것</strong><ul>{ch.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
        <div className="tx-two-col">
            <section className="tx-detail">
                <h3>부대 <small>누르면 출격 · 순서가 배치 칸 순서입니다</small></h3>
                <ul className="tx-roster tx-prep-list">{pool.map(u => { const i = chosen.indexOf(u.uid); const isForced = forced.includes(u.uid); return <li key={u.uid} className={i >= 0 ? 'on' : ''}>
                    <button type="button" className={`tx-pick ${isForced ? 'forced' : ''}`} onClick={() => toggle(u.uid)} aria-disabled={isForced} title={isForced ? '강제 출격' : undefined}><span className={`tx-order ${i >= 0 ? 'on' : ''}`}>{i >= 0 ? i + 1 : ''}</span><span className="tx-token side-player">{classDef(u.classId).glyph}</span><div><strong>{u.name}</strong><small>{classDef(u.classId).name} Lv.{u.level} · 체력 {u.stats.hp}{isForced ? ' · 주인공' : ''}</small></div></button>
                    <span className="tx-row-actions">{i >= 0 && <><button type="button" className="text-button" onClick={() => move(u.uid, -1)} aria-label="앞으로">▲</button><button type="button" className="text-button" onClick={() => move(u.uid, 1)} aria-label="뒤로">▼</button></>}<button type="button" className="text-button" onClick={() => setPeek(u.uid)}>정보 보기</button></span>
                </li>; })}</ul>
            </section>
            <section className="tx-detail">
                <h3>배치 미리보기 <small>밝은 칸 = 출격 위치, 노란 칸 = 목표</small></h3>
                <MapPreview chapter={ch} size={14}/>
                <p className="tx-note">증원 {ch.reinforcements.length}회 예고 · 민가 {ch.map_events.filter(e => e.kind === 'village').length} · 상자 {ch.map_events.filter(e => e.kind === 'chest').length} · 영입 가능 {Object.values(UNIT_MAP).filter(d => d.join_chapter === ch.number && d.recruit.method !== 'auto').map(d => `${d.name}(${d.recruit.condition_text})`).join(', ') || '없음'}</p>
                <button type="button" className="secondary" onClick={() => setShowIntro(true)}>전투 전 대사 미리 보기</button>
                {peekUnit && <div className="tx-peek"><UnitHeader u={peekUnit}/><StatGrid u={peekUnit} compact/><ItemList u={peekUnit}/></div>}
            </section>
        </div>
        {showIntro && <DialogueBox lines={ch.dialogue.pre} onDone={() => setShowIntro(false)} title={`${ch.number}장 ${ch.title}`}/>}
    </div>;
}
