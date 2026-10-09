'use client';
import { AutoRunStatus } from './auto-run';
import { FIRST_CLEAR_SP } from '@/game/data/achievements';
import { dungeonGoldMultiplier, stats } from '@/game/systems/stats';
import { dungeonTier, levelGateOk, dungeonLevelAt, tierHealth, tierAttack } from '@/game/systems/meta';
import { clearCoinBase, dailyBonusLeft, growthOffer, onyxOffer, hunterBlock, allItems, qualityLines, lineQuality, QUALITY_PRICE } from '@/game/systems/dungeon-coins';
import { DUNGEON_SHOP, DAILY_BONUS, GROWTH_GOODS, GROWTH_MAX_REBIRTHS, type GrowthGood } from '@/game/data/dungeon-shop';
import { ONYX, ONYX_BOSSES } from '@/game/data/onyx';
import { BOSS_LOOT_SET, BOSS_LOOT_SLOTS, ownedLoot } from '@/game/data/boss-loot';
import { useState } from 'react';
import { Lock, Swords, Gem, Skull } from 'lucide-react';
import { FishArt } from './art';
import { BALANCE, MONSTER_TUNING, DUNGEON_MODES, type DungeonMode } from '@/game/data/balance';
import { FISH, DUNGEONS, PLAIN_DUNGEONS , closedIn, CLOSED_NOTE } from '@/game/data/world';
import { SKILLS } from '@/game/data/skills';
import { ENEMY_SKILLS, profile } from '@/game/data/encounters';
import { bookRevealed } from '@/game/systems/book';
import { BOOK_REVEAL } from '@/game/data/book-traits';
import { statDisplay } from '@/game/data/progression';
import { Heading, Meter, format, useNow } from './shared';
import { useSkillFx } from './skill-fx-setting';
import { CombatFxOverlay, CombatBarEffect, PlayerHitEffect, useCombatFx } from './combat-fx';
import { StatusBadges } from './combat-status';
import { BattleLogLine } from './combat-log';
import { abyssPearls, nextAbyssMilestone } from '@/game/data/long-term';
import type { PanelProps } from './panel-props';
import { RANDOM_GAME, randomGameTier, waveStake, stakeUpTo } from '@/game/data/random-game';
import { randomGameRank, randomGamePayout, randomGameRunsLeft, stakePayout } from '@/game/systems/random-game';
export function Dungeons({ s, send, busy }: PanelProps) {
    const activeDungeon = s.dungeon ? DUNGEONS.find(d => d.id === s.dungeon?.id) : undefined;
    const playerStats = stats(s);
    const enemyFish = s.enemy ? FISH.find(f => f.id === s.enemy?.id) : undefined;
    const revealed = !!enemyFish && bookRevealed(s, enemyFish.id);
    const enemyProfile = enemyFish && revealed ? profile(enemyFish.id) : undefined;
    const activeWave = s.dungeon?.wave ?? 0;
    const randomRun = activeDungeon?.id === RANDOM_GAME.id;
    const skillFx = useSkillFx(), { effects: combatFx, combo: fxCombo } = useCombatFx(s.logs, s.name, skillFx);
    const [repeatChoice, setRepeatChoice] = useState<Record<string, string>>({});
    // v27.70 던전 난이도(노말·헬·나이트메어)는 던전마다 고릅니다. 입장 값은 '<난이도>@<반복>'.
    const [modeChoice, setModeChoice] = useState<Record<string, DungeonMode>>({});
    const coinMult = dungeonGoldMultiplier(s), now = useNow(60_000), bonusLeft = dailyBonusLeft(s, now);
    const repeat = s.dungeon?.repeat;
    const repeatStatus = repeat ? (repeat.until ? `반복 중 · ${repeat.until}층까지` : repeat.left === null ? '반복 중 · 실패할 때까지' : repeat.left === 0 ? '반복 중 · 마지막 도전' : `반복 중 · 이후 ${repeat.left}회 더`) : '';

    return <>
    <Heading eyebrow="DUNGEON" title="세계의 숨겨진 던전" description="연속 전투와 보스에 도전하세요. 현재 전투·웨이브·전투 로그를 이 화면에서 바로 확인할 수 있습니다."/>
    {!activeDungeon && <p className="footnote">현재 HP {format(s.hp)} / {format(playerStats.hp)} · MP {format(s.mana)} / {format(playerStats.mana)} · 입장 후 {MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 준비가 끝나면 모두 회복됩니다.</p>}
    <AutoRunStatus s={s}/>
    {activeDungeon && <section className="panel dungeon-run-panel">
        <div className="dungeon-run-header">
        <div><span className="eyebrow">ACTIVE EXPEDITION{repeatStatus && ` · ${repeatStatus}`}</span><h2>{activeDungeon.name}{activeDungeon.id === 'abyss' && <b className="abyss-floor"> {s.dungeon!.depth || s.abyssBest + 1}층</b>}{randomRun && <b className="abyss-floor"> {activeWave + 1}웨이브</b>}</h2><p>{activeDungeon.description}{activeDungeon.id === 'abyss' ? ` · 최고 기록 ${s.abyssBest}층` : ''}</p></div>
        {randomRun ? <button className="gold-button" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>받고 나가기 · 정수 {stakePayout(s)}</button> : <button className="secondary" disabled={busy} onClick={() => send({ type: 'leaveDungeon' })}>던전 귀환</button>}
        </div>
        {randomRun ? <p className="random-game-stake">판돈 · 정수 {stakePayout(s)} (×{randomGamePayout(s)}) · 다음 웨이브 돌파 시 정수 +{Math.floor(waveStake(activeWave + 1) * randomGamePayout(s))} · 난이도 {randomGameTier(activeWave)}{s.dungeon?.until ? ` · 목표 ${s.dungeon.until}웨이브에서 자동으로 받고 나감` : ' · 목표 없음'} · 쓰러지면 판돈 소멸</p> : <div className="dungeon-wave-track">{activeDungeon.fish.map((id, index) => {
            const isDone = s.dungeon!.wave > index;
            const isCurrent = s.dungeon!.wave === index;
            const isBoss = index === activeDungeon.fish.length - 1;
            const fish = isBoss && activeDungeon.bossFish ? FISH.find(f => f.id === activeDungeon.bossFish) : FISH.find(f => f.id === id);
            return <div className={`dungeon-wave ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isBoss ? 'boss' : ''}`} key={`${id}-${index}`}><FishArt id={fish?.id || id} boss={isBoss} size={28}/><span>{isBoss ? 'BOSS' : `W${index + 1}`}</span><strong>{fish?.name || id}</strong></div>;
        })}</div>}
        <div className="dungeon-combat-grid dungeon-combat-fx-host">
        <CombatFxOverlay effect={combatFx} combo={fxCombo}/>
        <div className="dungeon-combatant player-combatant"><span className="eyebrow">내 모험가</span><div className="combatant-name"><h3>{s.name}</h3><StatusBadges effects={s.effects} stun={s.playerStun} recent={combatFx} target="player"/></div><div className="player-hp-anchor"><Meter value={s.hp} max={playerStats.hp} label="HP" color="teal"/><PlayerHitEffect effect={combatFx}/></div><Meter value={s.mana} max={playerStats.mana} label="MP" color="blue"/><small>속도 {playerStats.speed} · 명중 수치 {statDisplay('accuracy', playerStats.accuracy || 0)} · 회피 수치 {statDisplay('evasion', playerStats.evasion || 0)}</small></div>
        <div className="dungeon-vs">VS<span>{randomRun ? `${activeWave + 1}웨이브` : `${activeWave + 1}/${activeDungeon.fish.length}`}</span></div>
        <div className="dungeon-combatant enemy-combatant"><span className="eyebrow">{s.enemy?.boss ? 'BOSS ENCOUNTER' : 'CURRENT TARGET'}</span><div className="combatant-name"><h3>{s.enemy?.name || (s.recovery > 0 ? `출정 준비 · ${Math.ceil(s.recovery * BALANCE.turnMs / 1000)}초 남음` : '다음 몬스터를 기다리는 중')}</h3>{s.enemy && <StatusBadges effects={s.enemy.effects} stun={s.enemy.stun} recent={combatFx} target="enemy"/>}</div>{s.enemy ? <><div className="player-hp-anchor"><Meter value={s.enemy.hp} max={s.enemy.maxHp} label="HP" color="rose"/><CombatBarEffect effect={combatFx} target="enemy"/></div><small>{enemyProfile?.name || '미확인 개체'} · 속도 {s.enemy.combatStats?.speed || '-'}{revealed ? ` · 공격 스킬 ${s.enemy.skills?.map(id => [...ENEMY_SKILLS, ...SKILLS].find(sk => sk.id === id)?.name || id).join(', ') || '기본 공격'}` : ` · 도감 ${BOOK_REVEAL}회 처치 시 성향·스킬 공개`}</small>{enemyProfile?.hint && <p className="dungeon-hint">{enemyProfile.hint}</p>}</> : <p className="dungeon-hint">{s.recovery > 0 ? '준비가 끝나면 체력·마나가 모두 회복되고 탐험이 시작됩니다.' : '자동 사냥이 다음 웨이브를 준비하고 있습니다.'}</p>}</div>
        </div>
        <div className="dungeon-combat-log"><div className="section-title"><h3>최근 전투 로그</h3><span>자동 갱신</span></div>{s.logs.filter(log => log.type === 'battle').slice(-6).reverse().map(log => <BattleLogLine key={log.id} log={log} playerName={s.name}/>)}</div>
    </section>}
    {!activeDungeon && <RandomGameCard s={s} send={send} busy={busy}/>}
    <DungeonCoinShop s={s} send={send} busy={busy}/>
    <div className="stage-grid dungeon-grid">{[...PLAIN_DUNGEONS].sort((a, b) => a.level - b.level).map((d, i) => {
            const closed = closedIn(s, 'dungeons', d.id), locked = closed || !levelGateOk(s, d.level) || s.rebirths < d.rebirth;
            const mode = modeChoice[d.id] || 'normal', modeDef = DUNGEON_MODES.find(m => m.id === mode)!, tier = dungeonTier(d.id, s.abyssBest + 1, mode), dLevel = dungeonLevelAt(d, tier, s.level);
            const research = FIRST_CLEAR_SP[d.id], claimed = !!s.achievementClaims?.[`firstClear:${d.id}`], active = s.dungeon?.id === d.id;
            return <article className={`stage-card dungeon-stage-card ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} key={d.id}>
            <div className="stage-top"><span className="stage-num">{String(i + 1).padStart(2, '0')}</span>{locked ? <Lock size={20}/> : active ? <span className="badge">탐험 중</span> : d.id === 'abyss' ? <span className="badge">최고 {s.abyssBest}층</span> : s.clears[d.id] ? <span className="badge">{s.clears[d.id]}회 정복</span> : <span className="badge muted">미탐험</span>}</div>
            <Swords className="stage-wave" size={40}/>
            <div className="eyebrow">{closed ? CLOSED_NOTE : d.id === 'abyss' ? `다음 도전 ${s.abyssBest + 1}층` : `${d.fish.length}웨이브 · 보스 ${d.boss?.split('·').pop()?.trim() || ''}`}</div>
            <h2>{d.name}</h2>
            <p>{d.description}</p>
            <div className="dungeon-reward-lines">
                <span><b>최초</b>{d.id === 'abyss' ? `${s.abyssBest + 1}층 세계석 ${abyssPearls(s.abyssBest + 1)} · 10층마다 보너스 세계석(층 수만큼)${nextAbyssMilestone(s.abyssBest) ? ` · ${nextAbyssMilestone(s.abyssBest)}층 SP 1` : ''}` : `세계석 ${d.pearls}${research ? ` · 업적 SP ${research}` : ''}`}{d.id !== 'abyss' && s.clears[d.id] && (!research || claimed) ? ' · 받음' : ''}</span>
                <span><b>정복</b>던전 코인 {d.id === 'abyss' ? format(Math.floor(clearCoinBase(d.id, mode, s.abyssBest + 1) * coinMult)) : `${format(Math.floor(clearCoinBase(d.id, mode, 1, true) * coinMult))} (오늘 보너스 ${bonusLeft}/${DAILY_BONUS.clears}회 남음) · 보너스 뒤 ${format(Math.floor(clearCoinBase(d.id, mode) * coinMult))}`}{d.id !== 'abyss' && mode !== 'normal' ? ` · ${modeDef.name}: 몬스터 Lv.${dLevel} · 체력 ×${tierHealth(tier).toFixed(2)} · 공격 ×${tierAttack(tier).toFixed(2)}` : ''}{d.id === 'abyss' ? ' · 5층마다 확정 드롭에 무릉도장 전용 옵션' : ''} · 처치 골드 · 경험치 · 숙련 · 장비 없음</span>
            </div>
            <div className="stage-footer dungeon-actions">
                <span>Lv. {d.level}+{d.rebirth ? ` · 환생 ${d.rebirth}회` : ''}</span>
                {d.id !== 'abyss' && <select aria-label={`${d.name} 난이도`} value={mode} disabled={busy || locked || !!s.dungeon} onChange={e => setModeChoice({ ...modeChoice, [d.id]: e.target.value as DungeonMode })}>{DUNGEON_MODES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
                <select aria-label={`${d.name} 반복 설정`} value={repeatChoice[d.id] || 'once'} disabled={busy || locked || !!s.dungeon} onChange={e => setRepeatChoice({ ...repeatChoice, [d.id]: e.target.value })}>
                    <option value="once">1회</option>
                    {d.id === 'abyss' ? [5, 10, 25].map(n => <option key={n} value={`deeper:${n}`}>{s.abyssBest + n}층까지</option>) : [5, 10, 25].map(n => <option key={n} value={String(n)}>{n}회</option>)}
                    <option value="fail">실패까지</option>
                </select>
                <button className="primary small" disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'dungeon', id: d.id, value: `${mode}@${repeatChoice[d.id] || 'once'}` })}>{locked ? <Lock size={14}/> : <Swords size={14}/>}도전</button>
            </div>
            </article>;
        })}</div>
    </>;
}

/** v3.188 던전 코인샵: 정복으로 모은 던전 코인을 칠흑 장신구 제작 · 각성, 장비 상자, 포식자 각인으로 바꿉니다. */
function DungeonCoinShop({ s, send, busy }: PanelProps) {
    const now = useNow(60_000), hour = growthOffer(s, 'growth1', now), coins = s.dungeonCoins || 0, bonus = dungeonGoldMultiplier(s) - 1, left = dailyBonusLeft(s, now);
    const eligible = allItems(s).filter(x => !hunterBlock(x));
    const [pick, setPick] = useState(''), [line, setLine] = useState(-1);
    const item = eligible.find(x => x.id === pick) || eligible[0], lines = (item?.affixes || []).map((x, i) => ({ x, i })).filter(({ x }) => !x.rule);
    const index = lines.some(l => l.i === line) ? line : lines[0]?.i ?? -1;
    const buy = (id: string, value?: string) => send({ type: 'dungeonShop', id, ...(value ? { value } : {}) });
    return <section className="panel dungeon-coin-shop">
        <div className="section-title"><h3>던전 코인샵</h3><span>보유 {format(coins)} 코인 · 오늘 보너스 정복 {left}/{DAILY_BONUS.clears}회 남음{bonus > 0 ? ` · 코인 보너스 +${Math.round(bonus * 100)}%` : ''}</span></div>
        <p className="footnote">던전에서는 처치 보상이 없고, 정복할 때마다 던전 코인을 받습니다. 지역 던전은 하루(한국 시간 자정 기준) 처음 {DAILY_BONUS.clears}번의 정복이 보너스라 코인을 더 받습니다(노말 {DAILY_BONUS.coins.normal} · 헬 {DAILY_BONUS.coins.hell} · 나이트메어 {DAILY_BONUS.coins.nightmare}, 던전 공용, 다음 날로 넘어가지 않음, 무릉도장 제외). 보너스 정복에서는 드물게 그 던전 보스의 전용 옵션(◆)이 붙은 태초 전리품이 나옵니다(칠흑처럼 환생해도 남고, 다시 얻으면 각성). 코인은 환생해도 남습니다.</p>
        <div className="dungeon-reward-lines">
            <span><b>전리품</b>보스 전리품 {ownedLoot(s).size}/{Object.keys(BOSS_LOOT_SLOTS).length}종 · 세트 {BOSS_LOOT_SET.map(b => `${ownedLoot(s).size >= b.count ? '✓' : '·'}${b.count}개 ${b.label}`).join(' / ')}</span>
            {ONYX_BOSSES.map(b => { const o = onyxOffer(s, b.id, now); return <span key={b.id}><b>칠흑</b>{b.name} · {b.accessory.name} {o.kind === 'awaken' ? `각성 ${o.rank}/${ONYX.awakenMax}` : '제작'}{o.reason ? ` · ${o.reason}` : ''} <button className="secondary small" disabled={busy || !!o.reason || coins < o.price} onClick={() => buy(`onyx:${b.id}`)}>{o.kind === 'awaken' ? '각성' : '제작'} · {format(o.price)}</button></span>; })}
            <span><b>성장</b>최근 24시간 중 가장 많이 번 1시간의 골드 · 경험치 × 시간(환생 {GROWTH_MAX_REBIRTHS}회 미만){(Object.keys(GROWTH_GOODS) as GrowthGood[]).map(g => { const o = growthOffer(s, g, now); return <button key={g} className="secondary small" title={o.reason || `골드 +${format(o.gold)} · 경험치 +${format(o.exp)}`} disabled={busy || !!o.reason || coins < o.price} onClick={() => buy(g)}>{o.hours}시간 · {format(o.price)} (오늘 {o.left}회)</button>; })} <small>{hour.reason || `1시간 = 골드 +${format(hour.gold)} · 경험치 +${format(hour.exp)}`}</small></span>
            <span><b>장비</b>전설 이상 확정 장비 상자(내 레벨 · 고대 · 태초는 일반 드롭 하나와 비슷한 확률) <button className="secondary small" disabled={busy || coins < DUNGEON_SHOP.gearBox} onClick={() => buy('gearBox')}>구매 · {format(DUNGEON_SHOP.gearBox)}</button></span>
            <span><b>각인</b>{item ? <>
                <select aria-label="포식자 각인 장비" value={item.id} disabled={busy} onChange={e => { setPick(e.target.value); setLine(-1); }}>{eligible.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                <select aria-label="바꿀 옵션" value={index} disabled={busy} onChange={e => setLine(Number(e.target.value))}>{lines.map(({ x, i }) => <option key={i} value={i}>{i + 1}. {x.name}</option>)}</select>
                <button className="secondary small" disabled={busy || index < 0 || coins < DUNGEON_SHOP.hunterImprint} onClick={() => buy('hunter', `${item.id}|${index}`)}>포식자 각인 · {format(DUNGEON_SHOP.hunterImprint)}</button>
            </> : '고대 이상이고 포식자 옵션이 없는 장비가 있어야 합니다.'} <small>고른 옵션 한 줄을 포식자(보스 · 사냥감 피해)로 바꿉니다. 장비당 한 줄.</small></span>
            <QualityGoods s={s} send={send} busy={busy}/>
        </div>
    </section>;
}

/** v3.189 옵션 수치 상품: 고른 장비 · 옵션 줄의 수치를 100%로, 또는 120~150%로. 장비는 착용 · 가방 모두. */
function QualityGoods({ s, send, busy }: PanelProps) {
    const coins = s.dungeonCoins || 0;
    const items = allItems(s).filter(x => qualityLines(x, 'quality100').length || qualityLines(x, 'quality120').length);
    const [pick, setPick] = useState(''), [line, setLine] = useState(-1);
    const item = items.find(x => x.id === pick) || items[0];
    if (!item) return <span><b>수치</b>수치를 올릴 수 있는 옵션이 있는 장비가 없습니다.</span>;
    const rows = (item.affixes || []).map((x, i) => ({ x, i, q: lineQuality(item, i) })).filter(r => r.q !== null && r.q < 1.2 - 1e-6);
    const index = rows.some(r => r.i === line) ? line : rows[0]?.i ?? -1, q = lineQuality(item, index) ?? 0;
    const ok100 = qualityLines(item, 'quality100').includes(index), ok120 = qualityLines(item, 'quality120').includes(index);
    return <span><b>수치</b>
        <select aria-label="수치 올릴 장비" value={item.id} disabled={busy} onChange={e => { setPick(e.target.value); setLine(-1); }}>{items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select aria-label="수치 올릴 옵션" value={index} disabled={busy} onChange={e => setLine(Number(e.target.value))}>{rows.map(r => <option key={r.i} value={r.i}>{r.i + 1}. {r.x.name} · {Math.round(r.q! * 100)}%</option>)}</select>
        <button className="secondary small" disabled={busy || !ok100 || coins < QUALITY_PRICE.quality100} onClick={() => send({ type: 'dungeonShop', id: 'quality100', value: `${item.id}|${index}` })}>100%로 · {format(QUALITY_PRICE.quality100)}</button>
        <button className="secondary small" disabled={busy || !ok120 || coins < QUALITY_PRICE.quality120} onClick={() => send({ type: 'dungeonShop', id: 'quality120', value: `${item.id}|${index}` })}>120~150%로 · {format(QUALITY_PRICE.quality120)}</button>
        <small>지금 {Math.round(q * 100)}%. 100%는 보통 최고 굴림, 120~150%는 보통 최고를 넘습니다(계승 장비 최고까지). 규칙 · 고정 · 장식 옵션은 제외. 재련하면 다시 보통 범위로 굴립니다.</small>
    </span>;
}

/** v27.86 랜덤게임 입장 카드. v27.91 두 칸 구성: 왼쪽 규칙 세 줄, 오른쪽 목표 웨이브 칩(받는 판돈 표시)과 시작 버튼. 판돈 표는 목표까지 모두 깼을 때 받는 양(연구 배율 포함). */
function RandomGameCard({ s, send, busy }: PanelProps) {
    const [target, setTarget] = useState<number>(10), now = useNow(60_000);
    const rank = randomGameRank(s), left = randomGameRunsLeft(s, now), m = randomGamePayout(s);
    if (s.rebirths < 5 && !rank) return null;
    const payout = (n: number) => `정수 ${Math.floor(stakeUpTo(n) * m)}`;
    return <section className={`panel random-game ${rank ? '' : 'locked'}`}>
        <div className="random-game-head">
            <div><span className="eyebrow">RANDOM GAME · 던전</span><h2>랜덤게임</h2></div>
            <div className="random-game-chips">{rank ? <><span className={left ? 'chip on' : 'chip'} title="하루(한국 시간 자정)가 지나거나 환생하면 다시 채워집니다">오늘 남은 입장 {left} / {rank}</span><span className="chip gold">판돈 ×{m}</span></> : <span className="chip">세계석 연구 ‘랜덤게임’에서 해금 · 환생 5회</span>}</div>
        </div>
        <div className="random-game-body">
            <ul className="random-game-rules">
                <li><Swords size={14}/><span>해금한 사냥터의 몬스터가 웨이브마다 무작위로 나옵니다. 웨이브마다 난이도 +{RANDOM_GAME.tierPerWave}, {RANDOM_GAME.bossEvery}웨이브마다 보스.</span></li>
                <li><Gem size={14}/><span>처치 경험치·골드·장비는 없습니다. 웨이브를 깰 때마다 판돈(정수 {RANDOM_GAME.essencePerWave} × 웨이브)이 쌓입니다.</span></li>
                <li><Skull size={14}/><span>목표 웨이브에 닿거나 ‘받고 나가기’를 누르면 받습니다. <b>쓰러지면 판돈을 모두 잃습니다.</b></span></li>
            </ul>
            {rank > 0 && <div className="random-game-pick">
                <div className="random-game-pick-title">목표 웨이브 <small>칩의 숫자는 목표까지 모두 깼을 때 받는 정수</small></div>
                <div className="random-game-targets" role="radiogroup" aria-label="목표 웨이브">{RANDOM_GAME.targets.map(n => <button key={n} type="button" role="radio" aria-checked={target === n} className={`random-game-target ${target === n ? 'on' : ''}`} disabled={busy} onClick={() => setTarget(n)}><b>{n ? `${n}` : '∞'}</b><small>{n ? payout(n) : '목표 없음'}</small></button>)}</div>
                <div className="random-game-go">
                    <span>{target ? `${target}웨이브까지 모두 깨면 ${payout(target)}` : '받고 나가기를 누르거나 쓰러질 때까지 계속합니다.'}</span>
                    <button className="gold-button" disabled={busy || !left || !!s.dungeon} onClick={() => send({ type: 'dungeon', id: RANDOM_GAME.id, value: `until:${target}` })}>{left ? '랜덤게임 시작' : '오늘 입장 횟수를 모두 썼습니다 · 내일 또는 환생 뒤 다시'}</button>
                </div>
            </div>}
        </div>
    </section>;
}
