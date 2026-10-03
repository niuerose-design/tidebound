import type React from 'react';
import { Sparkles, Swords, Wind } from 'lucide-react';
import type { Log } from '@/game/types';
import { STATUS_NAMES } from '@/game/systems/combat-feedback';

const WORD = { physical: '물리', magic: '마법', split: '복합' } as const;

/** 전투 로그 한 줄. 구조화된 결과가 있으면 피해 종류별 색·아이콘과 본타/추가타/합계를 나눠 보여줍니다. */
export function BattleLogLine({ log, index, playerName }: { log: Log; index?: boolean; playerName?: string }) {
    const ev = log.event;
    const id = index ? <span>{String(log.id).padStart(3, '0')}</span> : null;
    if (!ev) return <p className="battle-line">{id}{log.text}</p>;
    // 내 행동과 적 행동을 왼쪽 띠 색으로 구분합니다(이름을 모르면 구분하지 않음).
    const side = playerName ? ev.actor === playerName ? ' actor-player' : ' actor-enemy' : '';
    const Icon = ev.damageType === 'magic' ? Sparkles : ev.damageType === 'split' ? Wind : Swords;
    const chain = ev.chain ? <em className="status chain">연속 {ev.chain}</em> : null;
    if (ev.stunned || ev.defeated) return <p className={`battle-line log-status${side}`}>{id}{chain}<b>{ev.actor}</b>{ev.dot && <em className="dmg-dot">{ev.dot.name} {ev.dot.value}</em>}{ev.stunned ? '기절로 행동 불가' : '쓰러짐'}</p>;
    const missed = ev.hits.length > 0 && ev.hits.every(h => h.miss);
    const follows = ev.hits.length > 1;
    return <p className={`battle-line dmg-${ev.damageType} ${missed ? 'log-miss' : ''}${side}`}>{id}
        <Icon size={12} className="log-icon" aria-label={`${WORD[ev.damageType]} 피해`}/>
        {chain}<b>{ev.actor}</b> · {ev.skillName}{' '}
        {ev.dot && <em className="dmg-dot">{ev.dot.name} {ev.dot.value}</em>}
        {missed ? <em className="miss">빗나감</em> : ev.hits.map((h, i) => <em key={i} className={`${h.miss ? 'miss' : ''} ${h.critical ? 'crit' : ''}`}>{follows ? (i ? `추가타${ev.hits.length > 2 ? ` ${i}` : ''} ` : '본타 ') : ''}{h.miss ? '빗나감' : h.value.toLocaleString()}{h.critical ? ' 치명' : ''}</em>)}
        {!missed && ev.hits.length > 0 && <strong>{follows ? `합계 ${ev.total.toLocaleString()}` : ''} {WORD[ev.damageType]} 피해</strong>}
        {ev.healed > 0 && <em className="heal">회복 {ev.healed}</em>}
        {ev.drained > 0 && <em className="heal">흡혈 {ev.drained}</em>}
        {ev.statuses.map(st => <em key={st.id} className="status">{STATUS_NAMES[st.id] || st.id} {st.turns}턴{st.onSelf ? '(자신)' : ''}</em>)}
        {ev.linked && <em className="status">연계</em>}{ev.cleansed && <em className="heal">정화</em>}{ev.silenced && <em className="status">침묵 중</em>}
        {ev.gamble !== undefined ? <em className="status">🎲 ×{ev.gamble.toFixed(2)}</em> : null}{ev.reflected ? <em className="dmg-dot">반격 {ev.reflected}</em> : null}{ev.reflectHeal ? <em className="heal">반격 흡혈 {ev.reflectHeal}</em> : null}{ev.endured && <em className="heal">無 체력 1로 버팀{ev.endured.heal ? ` +${ev.endured.heal.toLocaleString()}` : ''}</em>}{ev.finale && <em className="crit">天 일곱 인 해방</em>}{ev.cooldownReset && <em className="status">대기 초기화 {ev.cooldownReset.join('·')}</em>}{ev.multicast && <em className="crit">동시 시전 {ev.multicast.index + 1}/{ev.multicast.count}</em>}{ev.restored && <em className="heal">타임머신</em>}{ev.extraTurn && <em className="status">추가 행동</em>}
    </p>;
}

/** 턴 경계. 로그 목록에서 턴이 바뀌는 자리에 끼웁니다. */
export function LogTurnDivider({ turn }: { turn: number }) {
    return <div className="log-turn-divider" role="separator" aria-label={`${turn}턴`}><span>{turn.toLocaleString()}턴</span></div>;
}
/** 턴 번호가 바뀌는 줄 앞에 구분선을 끼워 렌더합니다(최신순 목록 기준: 각 턴 묶음의 위에 선). 턴 정보가 없는 오래된 로그는 그대로. */
export function withTurnDividers<T extends { turn?: number }>(logs: T[], render: (log: T) => React.ReactNode) {
    const out: React.ReactNode[] = [];
    logs.forEach((log, i) => {
        const prev = logs[i - 1];
        if (log.turn !== undefined && (i === 0 || prev?.turn !== log.turn)) out.push(<LogTurnDivider key={`turn-${log.turn}-${i}`} turn={log.turn}/>);
        out.push(render(log));
    });
    return out;
}
