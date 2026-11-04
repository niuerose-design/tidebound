'use client';
/**
 * v3.399 전투 기록(새 토대): 몹별 최근 전투(나 vs 몹 · 승패 · 턴 · 피해)와 이전 승리 대비 변화, 전투 로그 펼쳐 보기.
 * 기록은 이 브라우저에만 있습니다(components/game/battle-records.ts). 로그 줄(JournalLine)은 연출 CSS 예외로 그대로 씁니다.
 */
import { Fragment, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SectionHeader, FoldSection, EmptyState, ConfirmAction, FinePrint, formatShort, formatExact } from '@/components/ui/game';
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
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="BATTLE RECORDS" title="전투 기록" description="몹별 최근 전투와 지난 승리 대비 변화입니다."
            actions={records.order.length > 0 && <ConfirmAction icon={<Trash2 size={14}/>} label="기록 지우기" title="전투 기록을 지울까요?" description="이 기기에 저장된 몹별 전투 기록을 모두 지웁니다." confirmLabel="지우기" onConfirm={clearBattleRecords}/>}/>
        <FinePrint summary="보관 규칙">
            <p>일반 몹은 최근 승리 {BATTLE_RECORD.normal}회, 무리 · 변종 · 보스는 {BATTLE_RECORD.special}회, 패배는 {BATTLE_RECORD.defeats}회까지 남습니다.</p>
            <p>기록은 이 기기의 브라우저에만 저장됩니다.</p>
        </FinePrint>
        {!records.order.length ? <EmptyState title="아직 기록이 없습니다" description="자동 사냥을 하면 몹별 최근 전투가 여기에 모입니다."/>
        : <div className="grid gap-2" aria-label="몹별 최근 전투 기록">
            {/* v3.119 몹마다 접어 둡니다(기본 접힘). 제목 줄에 가장 최근 결과만 보이고, 펼치면 전투 표가 나옵니다. */}
            {records.order.map(name => { const list = records.byMob[name] || [], last = list[0]; return <FoldSection key={name} level={3} title={name} summary={`${last ? `${RESULT[last.result]} ${last.turns}턴 · ${ago(now - last.at)} · ` : ''}${list.length}회`}>
                <RecordTable list={list} now={now} playerName={playerName}/>
            </FoldSection>; })}
        </div>}
    </div>;
}

/** v3.453 몹 하나의 최근 전투 표(docs/writing.md 4단계 · 기록은 표): 결과 · 턴 · 준 피해 · 최고 한 방 · 받은 피해 · 때. 줄을 펼치면 그 전투의 로그. */
function RecordTable({ list, now, playerName }: { list: BattleRecord[]; now: number; playerName: string }) {
    const [openId, setOpenId] = useState<number | null>(null);
    const th = 'h-8 px-1.5 text-right text-xs font-medium text-ink-3 first:text-left';
    return <Table className="font-num text-xs">
        <TableHeader><TableRow className="border-line"><TableHead className={th}>결과</TableHead><TableHead className={th}>턴</TableHead><TableHead className={th}>준 피해</TableHead><TableHead className={th}>최고</TableHead><TableHead className={th}>받은 피해</TableHead><TableHead className={th}>때</TableHead></TableRow></TableHeader>
        <TableBody>{list.map(r => { const open = openId === r.id, diff = compareWithPrevious(r); return <Fragment key={r.id}>
            <TableRow className={cn('cursor-pointer border-line', r.result === 'lose' && 'bg-danger/5', r.result === 'flee' && 'bg-warn/5')} onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open}>
                <TableCell className="px-1 py-0.5 text-left"><button type="button" className="inline-flex min-h-8 items-center gap-1 rounded-s px-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50 pointer-coarse:min-h-11" aria-expanded={open} aria-label={`${RESULT[r.result]} · 로그 ${open ? '접기' : '펼치기'}`} onClick={e => { e.stopPropagation(); setOpenId(open ? null : r.id); }}><ChevronDown size={13} className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} aria-hidden/><em className={cn('not-italic font-semibold', TONE[r.result])}>{RESULT[r.result]}</em>{r.golden && <span className="text-gold-ink" title="황금 개체">✦</span>}</button></TableCell>
                <TableCell className="px-1.5 py-1.5 text-right tabular-nums">{r.turns}{diff && diff.turns !== 0 && <small className={cn('ml-1', diff.turns < 0 ? 'text-ok' : 'text-danger')}>{diff.turns > 0 ? '+' : ''}{diff.turns}</small>}</TableCell>
                <TableCell className="px-1.5 py-1.5 text-right tabular-nums"><N n={r.dealt}/></TableCell>
                <TableCell className="px-1.5 py-1.5 text-right tabular-nums"><N n={r.maxHit}/>{diff?.maxHit !== undefined && <small className={cn('ml-1', diff.maxHit >= 1 ? 'text-ok' : 'text-danger')}>×{diff.maxHit.toFixed(2)}</small>}</TableCell>
                <TableCell className="px-1.5 py-1.5 text-right tabular-nums"><N n={r.taken}/></TableCell>
                <TableCell className="whitespace-nowrap px-1.5 py-1.5 text-right text-ink-3">{ago(now - r.at)}</TableCell>
            </TableRow>
            {open && <TableRow className="border-line hover:bg-transparent"><TableCell colSpan={6} className="p-0"><div className="battle-record-log max-h-80 overflow-auto bg-surface-0 px-3 py-2 text-xs font-sans">
                <p className="mb-1 text-ink-3"><b>{playerName}</b> vs <b>{r.label}</b> · {r.turns}턴{r.crits ? ` · 치명 ${r.crits}` : ''}{r.partial ? ` · 앞부분 로그 일부는 남지 않았습니다. 최근 ${BATTLE_RECORD.lines}줄.` : ''}</p>
                {withTurnDividers(r.lines, log => <JournalLine key={log.id} log={log} playerName={playerName}/>)}</div></TableCell></TableRow>}
        </Fragment>; })}</TableBody>
    </Table>;
}
