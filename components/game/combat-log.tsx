import { Sparkles, Swords, Wind } from 'lucide-react';
import type { Log } from '@/game/types';

const WORD = { physical: '물리', magic: '마법', split: '복합' } as const;
const STATUS_NAMES: Record<string, string> = { stun: '기절', silence: '침묵', bleed: '출혈', weaken: '약화', slow: '감속', haste: '가속' };

/** 전투 로그 한 줄. 구조화된 결과가 있으면 피해 종류별 색·아이콘과 본타/추가타/합계를 나눠 보여줍니다. */
export function BattleLogLine({ log, index }: { log: Log; index?: boolean }) {
    const ev = log.event;
    const id = index ? <span>{String(log.id).padStart(3, '0')}</span> : null;
    if (!ev) return <p className="battle-line">{id}{log.text}</p>;
    const Icon = ev.damageType === 'magic' ? Sparkles : ev.damageType === 'split' ? Wind : Swords;
    const chain = ev.chain ? <em className="status chain">연속 {ev.chain}</em> : null;
    if (ev.stunned || ev.defeated) return <p className="battle-line log-status">{id}{chain}<b>{ev.actor}</b>{ev.dot && <em className="dmg-dot">{ev.dot.name} {ev.dot.value}</em>}{ev.stunned ? '기절로 행동 불가' : '쓰러짐'}</p>;
    const missed = ev.hits.every(h => h.miss);
    const follows = ev.hits.length > 1;
    return <p className={`battle-line dmg-${ev.damageType} ${missed ? 'log-miss' : ''}`}>{id}
        <Icon size={12} className="log-icon" aria-label={`${WORD[ev.damageType]} 피해`}/>
        {chain}<b>{ev.actor}</b> · {ev.skillName}{' '}
        {ev.dot && <em className="dmg-dot">{ev.dot.name} {ev.dot.value}</em>}
        {missed ? <em className="miss">빗나감</em> : ev.hits.map((h, i) => <em key={i} className={`${h.miss ? 'miss' : ''} ${h.critical ? 'crit' : ''}`}>{follows ? (i ? `추가타${ev.hits.length > 2 ? ` ${i}` : ''} ` : '본타 ') : ''}{h.miss ? '빗나감' : h.value.toLocaleString()}{h.critical ? ' 치명' : ''}</em>)}
        {!missed && <strong>{follows ? `합계 ${ev.total.toLocaleString()}` : ''} {WORD[ev.damageType]} 피해</strong>}
        {ev.healed > 0 && <em className="heal">회복 {ev.healed}</em>}
        {ev.drained > 0 && <em className="heal">흡혈 {ev.drained}</em>}
        {ev.statuses.map(st => <em key={st.id} className="status">{STATUS_NAMES[st.id] || st.id} {st.turns}턴{st.onSelf ? '(자신)' : ''}</em>)}
        {ev.linked && <em className="status">연계</em>}{ev.cleansed && <em className="heal">정화</em>}{ev.silenced && <em className="status">침묵 중</em>}
    </p>;
}
