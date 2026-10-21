'use client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { Battle, ChapterDef } from '@/game/srpg/engine/types';
import { itemDef } from '@/game/srpg/data/items';
import { classDef } from '@/game/srpg/data/classes';
import { UNIT_MAP } from '@/game/srpg/data/units';
import type { Campaign } from '@/game/srpg/state/campaign';
import { DialogueBox } from './dialogue';
/** 승리 결과: 전투 후 대사 → 집계. */
export function ResultScreen({ campaign, battle: b, chapter: ch, onDone }: { campaign: Campaign; battle: Battle; chapter: ChapterDef; onDone: () => void }) {
    const [talked, setTalked] = useState(false);
    if (!talked) return <DialogueBox lines={ch.dialogue.post} onDone={() => setTalked(true)} title={`${ch.number}장 ${ch.title} — 전투 후`}/>;
    const players = b.units.filter(u => u.side === 'player');
    const fallen = players.filter(u => b.fallen.includes(u.uid));
    const loot = [...b.loot, ...ch.rewards.items];
    return <div className="tx-base tx-result">
        <header className="tx-base-head"><div><p className="tx-eyebrow">{ch.number}장 클리어</p><h1>{ch.title}</h1><p className="tx-lead">{b.turn}턴 · 보상 {b.gold + ch.rewards.gold}골드{loot.length ? ` · ${loot.map(id => itemDef(id).name).join(', ')}` : ''}</p></div><div className="tx-base-cta"><Button type="button" size="sm" className="bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11" onClick={onDone}>베이스로 가기</Button></div></header>
        <section className="tx-detail">
            <h3>출격 유닛</h3>
            <div className="tx-table-wrap"><table className="tx-table"><thead><tr><th>이름</th><th>클래스</th><th>레벨</th><th>얻은 경험</th><th>격파</th><th>상태</th></tr></thead><tbody>{players.map(u => { const orig = campaign.roster.find(r => r.uid === u.uid); return <tr key={u.uid} className={b.fallen.includes(u.uid) ? 'dim' : ''}><td>{u.name}</td><td>{classDef(u.classId).name}</td><td>{orig && orig.level !== u.level ? `${orig.level} → ${u.level}` : u.level}</td><td>+{u.gained}</td><td>{u.kills}</td><td>{b.fallen.includes(u.uid) ? (campaign.mode === 'classic' ? '전사' : '후퇴 (다음 장 복귀)') : b.recruited.includes(u.defId ?? '') ? '합류' : '건재'}</td></tr>; })}</tbody></table></div>
            {fallen.length > 0 && <ul className="tx-fallen">{fallen.map(u => { const d = u.defId ? UNIT_MAP[u.defId] : null; return <li key={u.uid}><strong>{u.name}</strong> — {d ? (campaign.mode === 'classic' ? d.lines.death : d.lines.retreat) : ''}</li>; })}</ul>}
            {b.recruited.length > 0 && <p className="tx-note">새 동료: {b.recruited.map(id => UNIT_MAP[id]?.name).join(', ')}</p>}
        </section>
    </div>;
}
