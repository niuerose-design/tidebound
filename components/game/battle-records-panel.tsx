'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { JournalLine, withTurnDividers } from './combat-log';
import { useBattleRecords, clearBattleRecords } from './battle-records';
import { Num, useNow } from './shared';
import { compareWithPrevious, BATTLE_RECORD, type BattleRecord } from '@/game/systems/battle-records';

const RESULT = { win: '승리', lose: '패배', flee: '놓침' } as const;
const ago = (ms: number) => { const m = Math.floor(ms / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };

/**
 * v3.101 기록판 ‘기록’ 탭: 몹별 최근 전투(나 vs 몹 · 승패 · 턴 · 피해)와 이전 승리 대비 변화, 전투 로그 펼쳐 보기.
 * 기록은 이 브라우저에만 있습니다(battle-records.ts).
 */
export function BattleRecordsPanel({ playerName }: { playerName: string }) {
    const records = useBattleRecords();
    const [open, setOpen] = useState<number | null>(null), now = useNow(30000);
    if (!records.order.length) return <p className="battle-feed-empty">자동 사냥을 하면 몹별 최근 전투가 여기에 모입니다. 일반 몹은 최근 승리 {BATTLE_RECORD.normal}회, 무리 · 변종 · 보스는 {BATTLE_RECORD.special}회, 패배는 {BATTLE_RECORD.defeats}회까지 남습니다(이 기기에만 저장).</p>;
    return <div className="log-list rail-log battle-records" aria-label="몹별 최근 전투 기록">
        {records.order.map(name => <section key={name} className="battle-record-group">
            <h3>{name}<small>최근 {records.byMob[name]?.length || 0}회</small></h3>
            {(records.byMob[name] || []).map(r => <RecordRow key={r.id} r={r} now={now} playerName={playerName} open={open === r.id} toggle={() => setOpen(v => v === r.id ? null : r.id)}/>)}
        </section>)}
        <p className="battle-records-note">이 기기에만 저장됩니다 · <button type="button" className="text-button" onClick={() => { setOpen(null); clearBattleRecords(); }}>기록 지우기</button></p>
    </div>;
}

function RecordRow({ r, now, playerName, open, toggle }: { r: BattleRecord; now: number; playerName: string; open: boolean; toggle: () => void }) {
    const diff = compareWithPrevious(r);
    return <div className={`battle-record result-${r.result}`}>
        <button type="button" className="battle-record-head" aria-expanded={open} onClick={toggle}>
            <span className="battle-record-title"><b>{playerName}</b> vs <b>{r.golden ? '✦ 황금 ' : ''}{r.label}</b> <em>{RESULT[r.result]}</em></span>
            <span className="battle-record-stats">{r.turns}턴 · 준 피해 <Num n={r.dealt}/> · 최고 <Num n={r.maxHit}/>{r.crits ? ` · 치명 ${r.crits}` : ''} · 받은 피해 <Num n={r.taken}/>{r.partial ? ' · 일부' : ''} · {ago(now - r.at)}</span>
            {diff && <span className="battle-record-diff">지난 승리 대비 {diff.turns === 0 ? '턴 같음' : `턴 ${diff.turns > 0 ? '+' : ''}${diff.turns}`}{diff.maxHit !== undefined ? ` · 최고 한 방 ×${diff.maxHit.toFixed(2)}` : ''}</span>}
            <span className="battle-record-toggle">{open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}로그 보기</span>
        </button>
        {open && <div className="battle-record-log">{r.partial && <p className="battle-feed-empty">앞부분 로그 일부는 남지 않았습니다(최근 {BATTLE_RECORD.lines}줄 · 부재중 정산 중 전투).</p>}{withTurnDividers(r.lines, log => <JournalLine key={log.id} log={log} playerName={playerName}/>)}</div>}
    </div>;
}
