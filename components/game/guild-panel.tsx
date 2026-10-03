'use client';
import type { PanelProps } from './panel-props';
import { useEffect, useState } from 'react';
import { Flag, Users, Copy, Check, Trophy, Crown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading, Meter, format } from './shared';
import { ConfirmButton } from './confirm-button';
import { GUILD_CREATE_COST, GUILD_RENAME_COST, GUILD_DONATIONS, GUILD_MAX_MEMBERS, guildLevelXp } from '@/game/data/guild';
import type { GuildInfo } from './use-game';

type Props = PanelProps & { info: GuildInfo | null; error: string; load: () => Promise<void>; act: (body: Record<string, unknown>) => Promise<boolean> };
/**
 * v25.11 공유 길드 화면. 창설·코드 가입, 주간 길드 목표(길드원 각자 수령), 길드원 기여, 기부, 이번 주 길드 기록판.
 * 개인 능력치 보너스는 없습니다(v20.7 결정 유지). 이전의 혼자 쓰던 길드 기록(명예 레벨·기부)은 아래 작은 카드로만 남깁니다.
 */
export function Guild({ s, busy, info, error, load, act }: Props) {
    const [name, setName] = useState('심해개척단'), [code, setCode] = useState(''), [rename, setRename] = useState(''), [copied, setCopied] = useState(false);
    useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
    useEffect(() => { if (info?.guild) { const t = setTimeout(() => setRename(info.guild!.name), 0); return () => clearTimeout(t); } }, [info?.guild]);
    const legacy = s.guild?.name && (s.guild.contribution > 0 || s.guild.level > 1);
    const copy = async () => { try { await navigator.clipboard.writeText(info?.guild?.code || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 클립보드 없음 */ } };
    const board = <section className="panel guild-board">
        <div className="section-title"><h2><Trophy size={16}/> 이번 주 길드 기록판 <small className="micro">{info?.week}</small></h2><span title="포획 1 · 던전 정복 20 · 보스 5 · 심연 최고 깊이 10 · 기부 1,000 G당 1점">주간 점수 · 월요일 0시(한국 시간) 초기화</span></div>
        {info?.board.length ? <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>길드</TableHead><TableHead>점수</TableHead></TableRow></TableHeader>
            <TableBody>{info.board.map(r => <TableRow key={r.id} className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (내 길드)' : ''}</TableCell><TableCell><b>{format(r.points)}</b></TableCell></TableRow>)}</TableBody></Table>
            : <p className="footnote">이번 주 기록이 있는 길드가 아직 없습니다.</p>}
    </section>;
    const legacyCard = legacy ? <section className="panel guild-legacy"><small>이전 기록 (혼자 쓰던 길드)</small><strong>{s.guild.name} · 명예 Lv.{s.guild.level}</strong><p>누적 기부 {format(s.guild.contribution)} G · 명예 경험치 {s.guild.xp.toLocaleString()} / {guildLevelXp(Math.max(1, s.guild.level)).toLocaleString()}. 공유 길드로 바뀌며 기록만 남습니다.</p></section> : null;
    if (!info) return <><Heading eyebrow="GUILD HALL" title="길드" description="불러오는 중…"/>{error && <p className="login-error" role="alert">{error}</p>}</>;
    if (!info.guild) return <>
        <Heading eyebrow="GUILD HALL" title="함께 항해할 길드" description={`길드는 계정 단위로 최대 ${GUILD_MAX_MEMBERS}명. 주간 길드 목표를 함께 채우면 길드원 각자가 진주를 받고, 길드 채팅이 열립니다. 능력치 보너스는 없습니다.`}/>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="guild-entry-grid">
            <section className="panel guild-join-card"><Flag size={42}/><div><h2>길드 창설</h2><p>창설 비용 {GUILD_CREATE_COST.toLocaleString()} G. 창설자가 길드장이 되고 가입 코드를 받습니다.</p></div>
                <div className="guild-join-form"><input value={name} maxLength={16} onChange={e => setName(e.target.value)} aria-label="길드 이름"/><button className="primary" disabled={busy || s.gold < GUILD_CREATE_COST || name.trim().length < 2} onClick={() => act({ action: 'create', name })}>{GUILD_CREATE_COST.toLocaleString()} G로 창설</button></div></section>
            <section className="panel guild-join-card"><Users size={42}/><div><h2>코드로 가입</h2><p>길드장에게 받은 6자 가입 코드를 입력하세요.</p></div>
                <div className="guild-join-form"><input value={code} maxLength={8} placeholder="예: K7PQ2M" onChange={e => setCode(e.target.value.toUpperCase())} aria-label="가입 코드"/><button className="secondary" disabled={busy || code.trim().length < 6} onClick={() => act({ action: 'join', code })}>가입</button></div></section>
        </div>
        {legacyCard}
        {board}
    </>;
    const g = info.guild, me = g.members.find(m => m.self);
    return <>
        <Heading eyebrow="GUILD HALL" title={g.name} description={`길드원 ${g.members.length} / ${GUILD_MAX_MEMBERS} · 이번 주 ${format(g.points)}점 · 금고 ${format(g.treasury)} G`}>
            {g.leader && <span className="badge"><Crown size={12}/> 길드장</span>}
        </Heading>
        {error && <p className="login-error" role="alert">{error}</p>}
        {g.leader && <section className="panel guild-name-panel"><div><h2>가입 코드 <code className="guild-code">{g.code}</code></h2><p>길드원에게 알려주세요. 이름 변경 {GUILD_RENAME_COST} G.</p></div>
            <div className="guild-name-form"><button className="secondary" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} 코드 복사</button><input value={rename} maxLength={16} onChange={e => setRename(e.target.value)} aria-label="길드 이름 변경"/><button className="secondary" disabled={busy || s.gold < GUILD_RENAME_COST || rename.trim().length < 2 || rename.trim() === g.name} onClick={() => act({ action: 'rename', name: rename })}>이름 변경</button></div></section>}
        <section className="panel guild-goals">
            <div className="section-title"><h2>주간 길드 목표</h2><span>길드원 수에 비례 · 달성하면 각자 한 번씩 수령</span></div>
            <ul className="goal-list">{g.goals.map(goal => <li key={goal.id} className={goal.progress >= goal.target ? 'done' : ''}>
                <div><strong>{goal.title}</strong><small>{format(goal.progress)} / {format(goal.target)} · 진주 +{goal.pearls}</small></div>
                <span className="guild-goal-meter"><Meter value={goal.progress} max={goal.target}/></span>
                {goal.progress >= goal.target && <button className={goal.claimed ? 'secondary small' : 'primary small'} disabled={busy || goal.claimed} onClick={() => act({ action: 'claim', goal: goal.id })}>{goal.claimed ? '받음' : '보상 받기'}</button>}
            </li>)}</ul>
        </section>
        <section className="panel guild-members">
            <div className="section-title"><h2>길드원 · 이번 주 기여</h2><span>60초마다 반영</span></div>
            <Table><TableHeader><TableRow><TableHead>낚시꾼</TableHead><TableHead>포획</TableHead><TableHead>던전</TableHead><TableHead>보스</TableHead><TableHead>심연</TableHead><TableHead>기부</TableHead><TableHead>점수</TableHead>{g.leader && <TableHead/>}</TableRow></TableHeader>
                <TableBody>{g.members.map(m => <TableRow key={m.account} className={m.self ? 'self' : ''}><TableCell>{m.leader && <Crown size={12}/>} {m.name}{m.self ? ' (나)' : ''}</TableCell><TableCell>{format(m.totals.catches)}</TableCell><TableCell>{m.totals.clears}</TableCell><TableCell>{m.totals.bosses}</TableCell><TableCell>{m.totals.abyss}층</TableCell><TableCell>{format(m.totals.donated)} G</TableCell><TableCell><b>{format(m.points)}</b></TableCell>
                    {g.leader && <TableCell>{!m.self && <ConfirmButton label="내보내기" title={`${m.name}을(를) 내보낼까요?`} description="길드에서 내보냅니다. 다시 가입하려면 코드가 필요합니다." disabled={busy} onConfirm={() => act({ action: 'kick', target: m.account })}/>}</TableCell>}</TableRow>)}</TableBody></Table>
        </section>
        <section className="panel guild-donate">
            <div><h2>길드 금고 기부</h2><p>기부는 이번 주 길드 점수(1,000 G당 1점)와 내 기여에 더해집니다. 돌려받을 수 없고 능력치 보상은 없습니다.{me ? ` 내 이번 주 기부 ${format(me.totals.donated)} G.` : ''}</p></div>
            <div className="button-row">{GUILD_DONATIONS.map(amount => <button key={amount} className="secondary" disabled={busy || s.gold < amount} onClick={() => act({ action: 'donate', amount })}>+{format(amount)} G</button>)}</div>
        </section>
        {board}
        {legacyCard}
        <div className="button-row guild-leave"><ConfirmButton label="길드 탈퇴" title="길드를 떠날까요?" description={g.leader ? '길드장이 떠나면 가장 먼저 가입한 길드원이 길드장이 됩니다. 혼자였다면 길드가 사라집니다.' : '이번 주 기여와 받은 보상은 그대로입니다.'} disabled={busy} onConfirm={() => act({ action: 'leave' })}/></div>
    </>;
}
