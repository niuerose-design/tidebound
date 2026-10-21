'use client';
/**
 * v3.399 전투 기록(새 토대): 몹별 최근 전투(나 vs 몹 · 승패 · 턴 · 피해)와 이전 승리 대비 변화, 전투 로그 펼쳐 보기.
 * 기록은 이 브라우저에만 있습니다(components/game/battle-records.ts). 로그 줄(JournalLine)은 연출 CSS 예외로 그대로 씁니다.
 */
import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SectionHeader, FoldSection, EmptyState, ConfirmAction, formatShort, formatExact } from '@/components/ui/game';
import { JournalLine, withTurnDividers } from '@/components/game/combat-log';
import { useBattleRecords, clearBattleRecords } from '@/components/game/battle-records';
import { useNow } from '@/components/game/shared';
import { compareWithPrevious, BATTLE_RECORD, type BattleRecord } from '@/game/systems/battle-records';
import { cn } from '@/lib/utils';

const RESULT = { win: '승리', lose: '패배', flee: '놓침' } as const;
const TONE = { win: 'text-ok', lose: 'text-danger', flee: 'text-warn' } as const;
const ago = (ms: number) => { const m = Math.floor(ms / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
const N = ({ n }: { n: number }) => <span className="font-num" title={formatExact(n)}>{formatShort(n)}</span>;

export function RecordsScreen({ playerName }: { playerName: string }) {
    const records = useBattleRecords(), now = useNow(30000);
    const rule = `일반 몹은 최근 승리 ${BATTLE_RECORD.normal}회, 무리 · 변종 · 보스는 ${BATTLE_RECORD.special}회, 패배는 ${BATTLE_RECORD.defeats}회까지 남습니다. 이 기기(브라우저)에만 저장됩니다.`;
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="BATTLE RECORDS" title="전투 기록" description={`몹별 최근 전투와 지난 승리 대비 변화입니다. ${rule}`}
            actions={records.order.length > 0 && <ConfirmAction icon={<Trash2 size={14}/>} label="기록 지우기" title="전투 기록을 지울까요?" description="이 기기에 저장된 몹별 전투 기록을 모두 지웁니다." confirmLabel="지우기" onConfirm={clearBattleRecords}/>}/>
        {!records.order.length ? <EmptyState title="아직 기록이 없습니다" description="자동 사냥을 하면 몹별 최근 전투가 여기에 모입니다."/>
        : <div className="grid gap-2" aria-label="몹별 최근 전투 기록">
            {/* v3.119 몹마다 접어 둡니다(기본 접힘). 제목 줄에 가장 최근 결과만 보이고, 펼치면 전투 목록이 나옵니다. */}
            {records.order.map(name => { const list = records.byMob[name] || [], last = list[0]; return <FoldSection key={name} level={3} title={name} summary={`${last ? `${RESULT[last.result]} · ${last.turns}턴 · ${ago(now - last.at)} · ` : ''}최근 ${list.length}회`}>
                <div className="grid gap-2">{list.map(r => <RecordRow key={r.id} r={r} now={now} playerName={playerName}/>)}</div>
            </FoldSection>; })}
        </div>}
    </div>;
}

function RecordRow({ r, now, playerName }: { r: BattleRecord; now: number; playerName: string }) {
    const [open, setOpen] = useState(false), diff = compareWithPrevious(r);
    return <Collapsible open={open} onOpenChange={setOpen} className={cn('rounded-m border bg-surface-1', r.result === 'win' ? 'border-line' : r.result === 'lose' ? 'border-danger/40' : 'border-warn/40')}>
        <CollapsibleTrigger className="grid w-full gap-1 rounded-m p-3 text-left outline-none hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-accent/50">
            <span className="flex flex-wrap items-center gap-x-2 text-s"><b>{playerName}</b><span className="text-ink-3">vs</span><b>{r.golden ? '✦ 황금 ' : ''}{r.label}</b><em className={cn('not-italic font-semibold', TONE[r.result])}>{RESULT[r.result]}</em><ChevronDown size={14} className={cn('ml-auto shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} aria-hidden/></span>
            <span className="text-xs text-ink-2">{r.turns}턴 · 준 피해 <N n={r.dealt}/> · 최고 <N n={r.maxHit}/>{r.crits ? ` · 치명 ${r.crits}` : ''} · 받은 피해 <N n={r.taken}/>{r.partial ? ' · 일부' : ''} · {ago(now - r.at)}</span>
            {diff && <span className="text-xs text-ink-3">지난 승리 대비 {diff.turns === 0 ? '턴 같음' : `턴 ${diff.turns > 0 ? '+' : ''}${diff.turns}`}{diff.maxHit !== undefined ? ` · 최고 한 방 ×${diff.maxHit.toFixed(2)}` : ''}</span>}
        </CollapsibleTrigger>
        <CollapsibleContent><div className="battle-record-log max-h-80 overflow-auto border-t border-line px-3 py-2 text-xs">{r.partial && <p className="text-ink-3">앞부분 로그 일부는 남지 않았습니다(최근 {BATTLE_RECORD.lines}줄 · 부재중 정산 중 전투).</p>}{withTurnDividers(r.lines, log => <JournalLine key={log.id} log={log} playerName={playerName}/>)}</div></CollapsibleContent>
    </Collapsible>;
}
