'use client';
import { BOSS_RESEARCH, SPECIALIZATIONS } from '@/game/data/specializations';
import { goldMultiplier, dungeonGoldMultiplier, stats } from '@/game/systems/stats';
import { tierReward, tierHealth, tierAttack } from '@/game/systems/meta';
import { TideSelector } from './economy-panels';
import { useState } from 'react';
import { Anchor, ArrowUp, ArrowUpRight, Check, ChevronRight, Compass, Fish, Heart, Lock, Play, RefreshCw, Shield, Sparkles, Swords, Trophy, Waves, BookOpen, Coins } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import type { State, Action, DuelResult } from '@/game/types';
import { BALANCE, MONSTER_TUNING, RARITIES, SLOTS, upgradeCost } from '@/game/data/balance';
import { STAGES, FISH, DUNGEONS } from '@/game/data/world';
import { SKILLS } from '@/game/data/skills';
import { JOBS } from '@/game/data/classes';
import { TRAINING } from '@/game/systems/duel';
import { ENEMY_SKILLS, profile, scaledEnemyStats } from '@/game/data/encounters';
import { STAT_LABELS, formatStat } from '@/game/data/progression';
import { mastery, skillUnlocked } from '@/game/systems/stats';
import { Empty, Heading, Meter, SkillIcon, SlotIcon, format } from './shared';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import type { Ranking } from './use-game';
import { abyssPearls, nextAbyssMilestone } from '@/game/data/long-term';
type Props = {
    s: State;
    send: (a: Action, path?: string) => void;
    busy: boolean;
};
export function Stages({ s, send, busy }: Props) {
    return <>
    <Heading eyebrow="WORLD MAP" title="낚시터" description="더 깊은 바다, 더 강한 물고기. 오늘의 항해를 선택하세요."/>
    <TideSelector s={s} send={send} busy={busy}/>
    <div className="stage-grid">{STAGES.map((st, i) => {
            const locked = s.level < st.level || s.rebirths < st.rebirth;
            return <button key={st.id} className={`stage-card ${s.stage === st.id ? 'selected' : ''}`} disabled={busy || locked} onClick={() => send({ type: 'stage', id: st.id })} style={{ '--stage-color': st.tone } as React.CSSProperties}>
            <div className="stage-top">
            <span className="stage-num">0{i + 1}</span>{locked ? <Lock size={20}/> : s.stage === st.id ? <span className="badge">현재 낚시터</span> : <ArrowUpRight />}</div>
            <Waves className="stage-wave" size={48}/>
            <div className="eyebrow">{st.subtitle}</div>
            <h2>{st.name}</h2>
            <p>{st.description}</p>
            <div className="stage-footer">
            <span>Lv. {st.level}+{st.rebirth ? ` · 환생 ${st.rebirth}회` : ''}</span>
            <span>{st.fish.length}종 서식</span>
            </div>
            </button>;
        })}</div>
    </>;
}
export function Dungeons({ s, send, busy }: Props) {
    const activeDungeon = s.dungeon ? DUNGEONS.find(d => d.id === s.dungeon?.id) : undefined;
    const playerStats = stats(s);
    const enemyFish = s.enemy ? FISH.find(f => f.id === s.enemy?.id) : undefined;
    const enemyProfile = enemyFish ? profile(enemyFish.id) : undefined;
    const activeWave = s.dungeon?.wave ?? 0;
    const combatFx = useCombatFx(s.logs, s.name);
    const [repeatChoice, setRepeatChoice] = useState<Record<string, string>>({});
    const repeat = s.dungeon?.repeat;
    const repeatStatus = repeat ? (repeat.until ? `반복 중 · ${repeat.until}층까지` : repeat.left === null ? '반복 중 · 실패할 때까지' : repeat.left === 0 ? '반복 중 · 마지막 도전' : `반복 중 · 이후 ${repeat.left}회 더`) : '';

    return <>
    <Heading eyebrow="DUNGEON" title="바다의 잊힌 장소" description="연속 전투와 보스에 도전하세요. 현재 전투·웨이브·전투 로그를 이 화면에서 바로 확인할 수 있습니다."/>
    {!activeDungeon && <p className="footnote">현재 HP {format(s.hp)} / {format(playerStats.hp)} · MP {format(s.mana)} / {format(playerStats.mana)} · 입장 후 {MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 준비가 끝나면 모두 회복됩니다.</p>}
    {activeDungeon && <section className="panel dungeon-run-panel">
        <div className="dungeon-run-header">
        <div><span className="eyebrow">ACTIVE EXPEDITION{repeatStatus && ` · ${repeatStatus}`}</span><h2>{activeDungeon.name}</h2><p>{activeDungeon.description}</p></div>
        <button className="secondary" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>던전 귀환</button>
        </div>
        <div className="dungeon-wave-track">{activeDungeon.fish.map((id, index) => {
            const isDone = s.dungeon!.wave > index;
            const isCurrent = s.dungeon!.wave === index;
            const isBoss = index === activeDungeon.fish.length - 1;
            const fish = isBoss && activeDungeon.bossFish ? FISH.find(f => f.id === activeDungeon.bossFish) : FISH.find(f => f.id === id);
            return <div className={`dungeon-wave ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isBoss ? 'boss' : ''}`} key={`${id}-${index}`}><span>{isBoss ? 'BOSS' : `W${index + 1}`}</span><strong>{fish?.name || id}</strong></div>;
        })}</div>
        <div className="dungeon-combat-grid dungeon-combat-fx-host">
        <CombatFxOverlay effect={combatFx}/>
        <div className="dungeon-combatant player-combatant"><span className="eyebrow">내 낚시꾼</span><div className="combatant-name"><h3>{s.name}</h3><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label="HP" color="teal"/><PlayerHitEffect effect={combatFx}/></div><Meter value={s.mana} max={playerStats.mana} label="MP" color="blue"/><small>속도 {playerStats.speed} · 명중 {Math.round((playerStats.accuracy || 0) * 100)}% · 회피 {Math.round((playerStats.evasion || 0) * 100)}%</small></div>
        <div className="dungeon-vs">VS<span>{activeWave + 1}/{activeDungeon.fish.length}</span></div>
        <div className="dungeon-combatant enemy-combatant"><span className="eyebrow">{s.enemy?.boss ? 'BOSS ENCOUNTER' : 'CURRENT CATCH'}</span><div className="combatant-name"><h3>{s.enemy?.name || (s.recovery > 0 ? `출정 준비 · ${Math.ceil(s.recovery * BALANCE.turnMs / 1000)}초 남음` : '다음 입질을 기다리는 중')}</h3>{s.enemy && <StatusBadges effects={s.enemy.effects} stun={s.enemy.stun} recent={combatFx} target="enemy"/>}</div>{s.enemy ? <><div className="player-hp-anchor"><Meter value={s.enemy.hp} max={s.enemy.maxHp} label="HP" color="rose"/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemyProfile?.name || '미확인 개체'} · 속도 {s.enemy.combatStats?.speed || '-'} · 공격 스킬 {s.enemy.skills?.map(id => [...ENEMY_SKILLS, ...SKILLS].find(sk => sk.id === id)?.name || id).join(', ') || '기본 공격'}</small>{enemyProfile?.hint && <p className="dungeon-hint">{enemyProfile.hint}</p>}</> : <p className="dungeon-hint">{s.recovery > 0 ? '준비가 끝나면 체력·마나가 모두 회복되고 탐험이 시작됩니다.' : '자동 낚시가 다음 웨이브를 준비하고 있습니다.'}</p>}</div>
        </div>
        <div className="dungeon-combat-log"><div className="section-title"><h3>최근 전투 로그</h3><span>자동 갱신</span></div>{s.logs.filter(log => log.type === 'battle').slice(-6).reverse().map(log => <p key={log.id}>{log.text}</p>)}</div>
    </section>}
    <div className="dungeon-list">{[...DUNGEONS].sort((a, b) => a.level - b.level).map((d, i) => {
            const locked = s.level < d.level || s.rebirths < d.rebirth;
            const tier = d.id === 'abyss' ? s.abyssBest + 3 : 0;
            const bossFish = FISH.find(f => f.id === d.bossFish)!;
            const bossStats = scaledEnemyStats(bossFish, { boss: true, tier, wave: d.fish.length - 1 });
            return <section className="panel dungeon-card" key={d.id}>
            <div className="dungeon-emblem">
            <Anchor size={44}/>
            <span>0{i + 1}</span>
            </div>
            <div className="dungeon-copy">
            <span className="eyebrow">Lv. {d.level} {d.rebirth ? `· 환생 ${d.rebirth}회` : ''}</span>
            <h2>{d.name}</h2>
            <p>{d.description}</p>{d.bossFish&&<p className="dungeon-hint">보스 특성 · {profile(d.bossFish).name}<br/>{profile(d.bossFish).hint}</p>}{d.id === 'abyss' && <p>다음 깊이: 적 HP ×{tierHealth(tier).toFixed(2)} · 공격 ×{tierAttack(tier).toFixed(2)} · 보상 ×{tierReward(tier).toFixed(2)}</p>}
            <p className="dungeon-hint">최종 보스 · HP {format(bossStats.hp)} · 물공 {format(bossStats.attack)} · 마공 {format(bossStats.magic || 0)}<br/>물방 {format(bossStats.defense)} · 마방 {format(bossStats.resist || 0)}</p><div className="dungeon-wave-list">{d.fish.map((id, index) => { const boss = index === d.fish.length - 1; const fish = boss && d.bossFish ? FISH.find(f => f.id === d.bossFish) : FISH.find(f => f.id === id); return <span className={boss ? 'boss-wave' : ''} key={`${id}-${index}`}>{boss ? 'BOSS' : `W${index + 1}`} · {fish?.name || id}</span>; })}</div>
            <div className="rewards">
            <span>
            <Coins size={15}/>{format(Math.floor(d.gold * tierReward(tier) * goldMultiplier(s) * dungeonGoldMultiplier(s)))} G</span>
            <span>
            <Sparkles size={15}/>희귀 이상 장비</span>
            <span>{d.id === 'abyss' ? `${s.abyssBest + 1}층 진주 ${abyssPearls(s.abyssBest + 1)}` : `첫 클리어 진주 ${d.pearls}`}</span>{d.id === 'abyss' && nextAbyssMilestone(s.abyssBest) && <span>{nextAbyssMilestone(s.abyssBest)}층 첫 돌파 SP 1</span>}
            </div>
            </div>
            <div className="dungeon-action">
            {BOSS_RESEARCH[d.id]&&<div className="boss-research"><strong>첫 정복 연구 · {BOSS_RESEARCH[d.id].sp} SP</strong>{BOSS_RESEARCH[d.id].specialization&&<p>{SPECIALIZATIONS.find(x=>x.id===BOSS_RESEARCH[d.id].specialization)?.name} 특화 해금</p>}<button className="secondary" disabled={busy||!s.clears[d.id]||!!s.bossResearchClaims?.[d.id]} onClick={()=>send({type:'bossResearch',id:d.id})}>{s.bossResearchClaims?.[d.id]?'연구 보상 수령 완료':s.clears[d.id]?'연구 보상 받기':'첫 정복 후 수령'}</button></div>}
            <button className="text-button" disabled={busy} onClick={()=>send({type:'growthGoal',id:d.id,value:'dungeon'})}>이 연구를 항해 목표로</button>
            <small>{d.id === 'abyss' ? `다음 도전 ${s.abyssBest + 1}층 · 최고 ${s.abyssBest}층` : s.clears[d.id] ? `${s.clears[d.id]}회 정복` : '미탐험'}</small>
            <label className="dungeon-repeat"><span>반복</span><select value={repeatChoice[d.id] || 'once'} disabled={busy || locked || !!s.dungeon} onChange={e => setRepeatChoice({ ...repeatChoice, [d.id]: e.target.value })}>
                <option value="once">1회</option>
                {d.id === 'abyss' ? [5, 10, 25].map(n => <option key={n} value={`deeper:${n}`}>{s.abyssBest + n}층까지 (+{n})</option>) : [5, 10, 25].map(n => <option key={n} value={String(n)}>{n}회</option>)}
                <option value="fail">실패할 때까지</option>
            </select></label>
            <button className="primary" disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'dungeon', id: d.id, value: repeatChoice[d.id] || 'once' })}>{locked ? <Lock size={16}/> : <Swords size={16}/>}도전하기</button>
            </div>
            </section>;
        })}</div><p className="footnote">입장 레벨은 최소 조건이며 클리어 보장이 아닙니다. 입장 후 {MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 준비를 마쳐야 체력·마나가 회복됩니다. 후반 웨이브일수록 적이 강화되고, 처치 후 체력 회복은 일반 사냥 16%에서 던전 8%로 줄어듭니다. 보스 연구의 SP·특화는 던전별 한 번만 받으며 환생해도 다시 지급하지 않습니다. 이미 정복한 던전도 미수령 연구 보상을 받을 수 있습니다. 일반 던전 진주는 최초 정복만 지급합니다. 무한 심연은 새 깊이마다 진주를 지급하며 정복할수록 적 체력·공격과 골드·경험치·장비 수준이 증가합니다. 심해 신전 정복 후 환생 상점에서 윤회의 낚싯대를 무료로 받을 수 있습니다. 마지막 웨이브는 별도 보스 물고기와 전용 스킬 프로필을 사용합니다.</p>
    </>;
}
export { Inventory, Rebirth } from './economy-panels';
export { Skills, Classes, Collection } from './progression-panels';
export function Rankings({ s, send, busy, rows, rankError, loadRanking, register, result, setResult }: Props & {
    rows: Ranking[];
    rankError: string;
    loadRanking: () => void;
    register: () => void;
    result: DuelResult | null;
    setResult: (v: DuelResult | null) => void;
}) {
    return <>
    <Heading eyebrow="ASYNC ARENA" title="낚시꾼의 명예" description="등록된 능력치와 스킬로 겨룹니다. 상대의 접속 여부와 관계없이 전투합니다.">
    <button className="primary" disabled={busy} onClick={register}>
    <ArrowUpRight size={17}/>내 전투 정보 등록</button>
    </Heading>
    <div className="arena-stats">
    <div className="panel">
    <small>내 결투 점수</small>
    <strong>{s.rating}</strong>
    </div>
    <div className="panel">
    <small>랭크 전적</small>
    <strong>{s.wins}승 <span>{s.losses}패</span>
    </strong>
    </div>
    <div className="panel">
    <small>진행 방식</small>
    <strong className="small-type">최대 80턴 · 무승부 지원</strong>
    </div>
    </div>
    <Tabs defaultValue="ranking">
    <TabsList className="game-tabs">
    <TabsTrigger value="ranking">낚시꾼 랭킹</TabsTrigger>
    <TabsTrigger value="training">훈련 상대</TabsTrigger>
    </TabsList>
    <TabsContent value="ranking">
    <div className="panel ranking-panel">
    <div className="section-title">
    <h2>등록된 낚시꾼</h2>
    <button className="text-button" onClick={loadRanking}>
    <RefreshCw size={14}/>새로고침</button>
    </div>{rankError ? <div className="error-box">{rankError}</div> : rows.length ? <Table>
        <TableHeader>
        <TableRow>
        <TableHead>순위</TableHead>
        <TableHead>낚시꾼</TableHead>
        <TableHead>길드</TableHead>
        <TableHead>전투력</TableHead>
        <TableHead>점수</TableHead>
        <TableHead>결투</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>{rows.map((r, i) => <TableRow key={r.id}>
            <TableCell className="rank-number">{i + 1}</TableCell>
            <TableCell>
            <strong>{r.name}{r.self ? ' (나)' : ''}</strong>
            <small className="block">Lv. {r.level} · {JOBS.find(j => j.id === r.job)?.name} · {new Date(r.updatedAt).toLocaleDateString('ko-KR')} 등록</small>
            <small className="block ranking-combat-stats">명중 {formatStat('accuracy', r.stats.accuracy || 0)} · 회피 {formatStat('evasion', r.stats.evasion || 0)}</small>
            </TableCell>
            <TableCell><span className="ranking-guild">{r.guild || '무소속'}</span></TableCell>
            <TableCell>{format(r.power)}</TableCell>
            <TableCell>{r.rating}</TableCell>
            <TableCell>
            <button className="secondary small" disabled={busy || r.self || Date.now() - s.lastDuel < BALANCE.duelCooldownMs} onClick={() => send({ type: 'ranked', id: r.id }, '/api/duel')}>{r.self ? '내 캐릭터' : '대결'}</button>
            </TableCell>
            </TableRow>)}</TableBody>
        </Table> : <Empty title="첫 번째 낚시꾼이 되어보세요" description="전투 정보를 등록하면 랭킹에 등장합니다. 다른 참가자가 없을 때는 훈련 상대와 대결할 수 있습니다."/>}</div>
    <p className="footnote">랭킹은 결투 점수 순입니다. 랭크 결투는 1분 간격이며 도전자의 점수만 변동합니다. 장비·스킬을 바꾼 뒤 다시 등록하면 방어용 정보가 갱신됩니다.</p>
    </TabsContent>
    <TabsContent value="training">
    <div className="class-grid">{TRAINING.map((t, i) => <div className="panel training-card" key={t.name}>
        <Swords size={35}/>
        <span className="badge">훈련용 NPC</span>
        <h2>{t.name}</h2>
        <p>Lv. {t.level} · {JOBS.find(j => j.id === t.job)?.name}</p>
        <div className="training-stats">공격 {t.stats.attack} · 방어 {t.stats.defense}<br />체력 {t.stats.hp} · 치명타 {Math.round(t.stats.crit * 100)}%</div>
        <button className="primary" disabled={busy} onClick={() => send({ type: 'training', id: String(i) }, '/api/duel')}>연습 대결</button>
        </div>)}</div>
    <p className="footnote">훈련은 실제 유저 랭킹에 포함되지 않으며 점수·재화·PvE 체력에 영향을 주지 않습니다.</p>
    </TabsContent>
    </Tabs>
    <Dialog open={!!result} onOpenChange={open => {
            if (!open)
                setResult(null);
        }}>
    <DialogContent className="duel-dialog">
    <DialogHeader>
    <DialogTitle>{result?.winner === 'player' ? '승리했습니다' : result?.winner === 'draw' ? '무승부' : '다음 결투를 준비하세요'}</DialogTitle>
    <DialogDescription>{result?.opponent} · {result?.turns}턴 전투 · {result?.training ? '훈련 대결' : `점수 ${result?.ratingChange && result.ratingChange > 0 ? '+' : ''}${result?.ratingChange}`}</DialogDescription>
    </DialogHeader>
    <div className="duel-hp">
    <span>내 남은 체력 <b>{result?.playerHp}</b>
    </span>
    <span>상대 남은 체력 <b>{result?.opponentHp}</b>
    </span>
    </div>
    <div className="duel-hit-summary">
    <span>내 명중률 <b>{result ? Math.round(result.playerHitChance * 100) : 0}%</b> · 명중 {result ? formatStat('accuracy', result.playerAccuracy) : '-'}</span>
    <span>상대 명중률 <b>{result ? Math.round(result.opponentHitChance * 100) : 0}%</b> · 회피 {result ? formatStat('evasion', result.opponentEvasion) : '-'}</span>
    <span>내 회피 {result ? formatStat('evasion', result.playerEvasion) : '-'} · 상대 명중 {result ? formatStat('accuracy', result.opponentAccuracy) : '-'}</span>
    </div>
    <div className="duel-log">{result?.logs.map((l, i) => <p key={i}>{l}</p>)}</div>
    </DialogContent>
    </Dialog>
    </>;
}
