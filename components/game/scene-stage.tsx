'use client';
import { memo, useEffect, useRef, useState } from 'react';
import type { CombatStats, Log, State } from '@/game/types';
import type { CombatFx } from '@/game/systems/combat-feedback';
import type { Job } from '@/game/data/classes';
import { jobById } from '@/game/data/classes';
import { skillById } from '@/game/data/skills';
import { isHackerJob } from '@/game/data/hacker';
import { displayTitle } from '@/game/data/titles';
import { mineBonusOf } from '@/game/systems/azeroth';
import { MonsterArt } from './art';
import { Meter, format } from './shared';
import { StatusBadges } from './combat-status';
import { CombatBarEffect, hasSceneTitle } from './combat-fx';

/**
 * v3.247 전투 장면 개편: 왼쪽 아래 내 캐릭터(직업 그림 + 이름 · HP · 마나 판), 오른쪽 몬스터(맞으면 번쩍이며 밀리고 처치되면 찌그러져 사라짐),
 * 장면 왼쪽에서 한 줄씩 올라오는 전투 기록, 전용 자원이 있는 직업(이계 · 아제로스 히든)만 왼쪽 위 HUD.
 */

type HeroKind = 'warrior' | 'mage' | 'guardian' | 'rogue' | 'spellblade' | 'merchant' | 'mystic' | 'devour' | 'miner' | 'agent' | 'trader' | 'hacker';
const TREE_HERO: Record<string, HeroKind> = { physical: 'warrior', magic: 'mage', defense: 'guardian', status: 'rogue', hybrid: 'spellblade', support: 'merchant', mystery: 'mystic' };

/** 장면에 그릴 캐릭터 모양. 전용 자원 기술(정수 소모 · 채굴)을 끼면 그 모습, 이계 직업은 요원 · 트레이더, 나머지는 계열별. */
export function heroKind(s: Pick<State, 'job' | 'skills'>, job: Job | undefined): HeroKind {
    const sks = s.skills.map(id => skillById(id));
    if (sks.some(sk => sk?.essenceCost)) return 'devour';
    if (sks.some(sk => sk?.mineChance)) return 'miner';
    if (job?.fuelJob) return job.trader ? 'trader' : 'agent';
    if (isHackerJob(s.job)) return 'hacker';
    return TREE_HERO[job?.tree || ''] ?? 'warrior';
}

/** 직업 모양별 SVG(80×110, 발이 아래 가장자리). 무기 · 소품 끝이 오른쪽(몬스터 쪽)을 향합니다. */
const HERO_SVG: Record<HeroKind, React.ReactNode> = {
    warrior: <><path d="M30 36h20l6 64H24z" fill="#41506a" stroke="#c9d6ea" strokeWidth="1.4"/><circle cx="40" cy="24" r="11" fill="#e7c9a6"/><path d="M28 22q12-16 24 0v-4Q40 4 28 18z" fill="#7b5b3a"/><path d="M56 48 74 8" stroke="#e8eef8" strokeWidth="5" strokeLinecap="round"/><path d="M50 52l12-8" stroke="#8a6b3a" strokeWidth="5" strokeLinecap="round"/><path d="M24 58h32v5H24z" fill="#2b3446"/></>,
    mage: <><path d="M40 30c10 0 14 8 14 14l10 58H16l10-58c0-6 4-14 14-14z" fill="#2d3f7a" stroke="#9fb6ff" strokeWidth="1.4"/><circle cx="40" cy="28" r="10" fill="#e7c9a6"/><path d="M24 24 40 0l16 24z" fill="#33258a" stroke="#9fb6ff" strokeWidth="1.2"/><path d="M62 30v70" stroke="#8a6b3a" strokeWidth="4" strokeLinecap="round"/><circle cx="62" cy="26" r="6" fill="#9fe7ff"/><circle cx="62" cy="26" r="11" fill="#9fe7ff" opacity=".25"/></>,
    guardian: <><path d="M28 34h24l6 66H22z" fill="#55606e" stroke="#d5dce6" strokeWidth="1.4"/><circle cx="40" cy="22" r="11" fill="#e7c9a6"/><path d="M28 20q12-18 24 0v-6H28z" fill="#9aa6b4"/><path d="M50 44h22v26q0 14-11 20-11-6-11-20z" fill="#3f6fa8" stroke="#e8eef8" strokeWidth="2"/><path d="M61 52v28M53 62h16" stroke="#f3d27a" strokeWidth="3"/></>,
    rogue: <><path d="M30 36h20l6 64H24z" fill="#262b33" stroke="#9a7fd1" strokeWidth="1.3"/><path d="M27 30q13-26 26 0l-2 4H29z" fill="#33283f"/><circle cx="40" cy="27" r="8" fill="#d8b896"/><path d="M33 27h14" stroke="#111" strokeWidth="3"/><path d="M54 50l16-10M56 60l18-2" stroke="#d9e2ee" strokeWidth="3" strokeLinecap="round"/><path d="M24 58h32v4H24z" fill="#4a3a63"/></>,
    spellblade: <><path d="M30 36h20l6 64H24z" fill="#3b2f55" stroke="#c7a6ff" strokeWidth="1.4"/><circle cx="40" cy="24" r="11" fill="#e7c9a6"/><path d="M28 22q12-16 24 0v-4Q40 4 28 18z" fill="#c9c2e6"/><path d="M56 48 74 8" stroke="#d7c2ff" strokeWidth="5" strokeLinecap="round"/><path d="M56 48 74 8" stroke="#a96bff" strokeWidth="11" strokeLinecap="round" opacity=".25"/><path d="M50 52l12-8" stroke="#6b5aa0" strokeWidth="5" strokeLinecap="round"/></>,
    merchant: <><path d="M28 36h24l6 64H22z" fill="#6b5232" stroke="#e7c67a" strokeWidth="1.4"/><circle cx="40" cy="24" r="11" fill="#e7c9a6"/><path d="M26 20h28l-4-10H30z" fill="#4b3a22"/><path d="M22 18h36v3H22z" fill="#4b3a22"/><circle cx="62" cy="64" r="10" fill="#c99a3a" stroke="#f3d27a" strokeWidth="2"/><path d="M58 58h8" stroke="#6b5232" strokeWidth="2"/></>,
    mystic: <><path d="M40 8c12 0 18 12 16 22l14 74H10l14-74C22 20 28 8 40 8z" fill="#1f2a33" stroke="#7fd6b3" strokeWidth="1.4"/><path d="M28 22q12-10 24 0-6 12-12 12t-12-12z" fill="#081014"/><circle cx="35" cy="25" r="2" fill="#f3d27a"/><circle cx="45" cy="25" r="2" fill="#f3d27a"/><circle cx="66" cy="56" r="7" fill="#7fd6b3" opacity=".85"/><circle cx="66" cy="56" r="13" fill="#7fd6b3" opacity=".2"/></>,
    devour: <><defs><linearGradient id="heroRobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b2458"/><stop offset="1" stopColor="#160c22"/></linearGradient></defs><path d="M40 8c12 0 18 12 16 22l14 74H10l14-74C22 20 28 8 40 8z" fill="url(#heroRobe)" stroke="#a96bff" strokeWidth="1.5"/><path d="M28 22q12-10 24 0-6 12-12 12t-12-12z" fill="#0b0712"/><circle cx="35" cy="25" r="2.2" fill="#5ef2c8"/><circle cx="45" cy="25" r="2.2" fill="#5ef2c8"/><path d="M56 50q16 2 18 12" stroke="#a96bff" strokeWidth="4" fill="none" strokeLinecap="round"/><circle cx="74" cy="62" r="5" fill="#a96bff"/></>,
    miner: <><path d="M26 34h28l6 68H20z" fill="#5a4630" stroke="#d79a4a" strokeWidth="1.5"/><circle cx="40" cy="22" r="12" fill="#e7c9a6"/><path d="M26 18q14-16 28 0v4H26z" fill="#e0b84a"/><circle cx="40" cy="12" r="4" fill="#fff6c8"/><path d="M22 56h36v6H22z" fill="#3b2c1c"/><path d="M58 40l8 46" stroke="#7a5a33" strokeWidth="4" strokeLinecap="round"/><path d="M50 40q12-10 26 2" stroke="#c9d1db" strokeWidth="5" fill="none" strokeLinecap="round"/></>,
    agent: <><path d="M28 34h24l6 68H22z" fill="#1d2329" stroke="#6fd3ff" strokeWidth="1.3"/><circle cx="40" cy="22" r="11" fill="#d9b896"/><rect x="30" y="18" width="20" height="6" rx="2" fill="#0b0f13"/><path d="M28 14q12-8 24 0v2H28z" fill="#111"/><path d="M52 52l24-2v6l-20 2z" fill="#30363d" stroke="#6fd3ff"/><path d="M38 34l2 26 2-26z" fill="#b33"/></>,
    trader: <><path d="M28 34h24l6 68H22z" fill="#232a3a" stroke="#ffd36b" strokeWidth="1.3"/><circle cx="40" cy="22" r="11" fill="#e2c3a0"/><path d="M29 18q11-12 22 0v-3q-11-10-22 0z" fill="#2b2118"/><path d="M38 34l2 22 2-22z" fill="#ffd36b"/><rect x="52" y="44" width="22" height="16" rx="2" fill="#0d1520" stroke="#ffd36b"/><path d="M55 56l5-5 4 3 7-7" stroke="#31d07f" strokeWidth="2" fill="none"/></>,
    hacker: <><path d="M28 36h24l6 66H22z" fill="#16201a" stroke="#5dff8f" strokeWidth="1.3"/><path d="M27 30q13-26 26 0l-2 4H29z" fill="#1d2b22"/><circle cx="40" cy="27" r="8" fill="#cfb08e"/><rect x="50" y="56" width="24" height="15" rx="2" fill="#0a120d" stroke="#5dff8f"/><path d="M54 61h8M54 65h14" stroke="#5dff8f" strokeWidth="1.5"/></>,
};

export const HeroFigure = memo(function HeroFigure({ kind }: { kind: HeroKind }) {
    return <svg className={`scene-hero-art hero-${kind}`} viewBox="0 0 80 110" aria-hidden="true">{HERO_SVG[kind]}</svg>;
});

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FRAMES: Record<string, { k: Keyframe[]; ms: number }> = {
    hit: { k: [{ filter: 'brightness(2.6)', transform: 'translateX(0)' }, { filter: 'brightness(1.4)', transform: 'translateX(9px)', offset: .4 }, { filter: 'none', transform: 'translateX(0)' }], ms: 300 },
    crit: { k: [{ filter: 'brightness(3.4) saturate(0)', transform: 'translateX(0) scale(1)' }, { filter: 'brightness(1.6)', transform: 'translateX(18px) scale(1.05,.95)', offset: .3 }, { filter: 'none', transform: 'translateX(0) scale(1)' }], ms: 420 },
    cast: { k: [{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(10px,-6px) scale(1.06)', offset: .4 }, { transform: 'translate(0,0) scale(1)' }], ms: 450 },
    recoil: { k: [{ transform: 'translateX(0)', filter: 'none' }, { transform: 'translateX(-8px)', filter: 'brightness(1.8) drop-shadow(0 0 6px #f55)', offset: .3 }, { transform: 'translateX(0)', filter: 'none' }], ms: 360 },
};
/** 새 연출이 들어올 때마다 그 타격 박자(fx.delay)에 맞춰 요소를 한 번 흔듭니다(Web Animations, 다시 그리지 않음). */
function usePulse(effect: CombatFx[], pick: (fx: CombatFx) => keyof typeof FRAMES | null) {
    const ref = useRef<HTMLDivElement>(null), seen = useRef(new Set<number>());
    useEffect(() => {
        const timers: number[] = [];
        for (const fx of effect) {
            if (seen.current.has(fx.id)) continue;
            seen.current.add(fx.id);
            const kind = pick(fx);
            if (!kind || reduced()) continue;
            timers.push(window.setTimeout(() => ref.current?.animate?.(FRAMES[kind].k, { duration: FRAMES[kind].ms, easing: 'ease-out' }), fx.delay));
        }
        if (seen.current.size > 200) seen.current = new Set([...seen.current].slice(-50));
        return () => timers.forEach(clearTimeout);
    }, [effect, pick]);
    return ref;
}
const landed = (fx: CombatFx) => fx.hits.some(h => !h.miss);
const foePick = (fx: CombatFx) => fx.target === 'enemy' && landed(fx) ? (fx.critical ? 'crit' : 'hit') : null;
const mePick = (fx: CombatFx) => fx.actor === 'player' && !fx.basic && fx.kind !== 'stun' ? 'cast' : fx.target === 'player' && fx.actor === 'enemy' && landed(fx) ? 'recoil' : null;

/** 오른쪽 몬스터: 맞으면 번쩍이며 밀리고, 사라지는(처치 · 교체) 순간에는 찌그러지며 흐려지는 잔상을 잠깐 남깁니다. */
export function SceneFoe({ enemy, hidden, effect, kkami = false }: { enemy: State['enemy']; hidden: boolean; effect: CombatFx[]; kkami?: boolean }) {
    const ref = usePulse(effect, foePick);
    const key = enemy && !hidden ? `${enemy.id}:${enemy.maxHp}` : '';
    const [ghost, setGhost] = useState<{ id: string; boss: boolean; n: number } | null>(null);
    const prev = useRef<{ key: string; id: string; boss: boolean }>({ key: '', id: '', boss: false }), n = useRef(0);
    useEffect(() => {
        const was = prev.current;
        prev.current = { key, id: enemy?.id || '', boss: !!enemy?.boss };
        if (!was.key || was.key === key || reduced()) return;
        const mine = ++n.current;
        setGhost({ id: was.id, boss: was.boss, n: mine });
        const timer = window.setTimeout(() => setGhost(g => g?.n === mine ? null : g), 800);
        return () => window.clearTimeout(timer);
    }, [key, enemy?.id, enemy?.boss]);
    return <>
        {ghost && <div key={ghost.n} className="scene-foe-wrap dying" aria-hidden="true"><MonsterArt id={ghost.id} boss={ghost.boss} size={128} className="scene-foe"/></div>}
        <div ref={ref} className="scene-foe-wrap" aria-hidden="true">{key && enemy && <MonsterArt key={key} id={enemy.id} boss={!!enemy.boss} size={128} className={`scene-foe spawn ${kkami ? 'kkami' : ''}`}/>}</div>
    </>;
}

/** 왼쪽 아래 내 캐릭터: 직업 그림 + 이름 · 상태이상 · HP(받은 피해 숫자) · 마나. 기술을 쓰면 앞으로 내딛고, 맞으면 뒤로 밀립니다. */
export function SceneMe({ s, stats, effect }: { s: State; stats: CombatStats; effect: CombatFx[] }) {
    const ref = usePulse(effect, mePick), job = jobById(s.job), title = displayTitle(s);
    return <div className="scene-me">
        <div ref={ref} className="scene-hero"><HeroFigure kind={heroKind(s, job)}/></div>
        <div className="scene-me-plate">
            <div className="scene-me-name"><b>{title ? <small>{title}</small> : null}{s.name}</b><StatusBadges effects={s.effects} stun={s.playerStun} recent={effect} target="player"/></div>
            <small className="scene-me-sub">{job?.name || '초보자'} · Lv.{s.level}{s.rebirths ? ` · 환생 ${s.rebirths}` : ''}</small>
            <div className="player-hp-anchor"><Meter value={s.hp} max={stats.hp} label="HP"/><CombatBarEffect effect={effect} target="player"/></div>
            <div className="scene-me-mana" title={`마나 ${Math.ceil(s.mana)} / ${stats.mana}`}><i style={{ width: `${Math.max(0, Math.min(100, s.mana / Math.max(1, stats.mana) * 100))}%` }}/></div>
        </div>
    </div>;
}

/** 장면 전투 기록: 최근 4줄이 아래에서 올라오고 위로 갈수록 흐려집니다. 전체 기록은 오른쪽 기록판에 그대로. */
export const SceneLog = memo(function SceneLog({ logs, playerName }: { logs: Log[]; playerName: string }) {
    const rows = logs.filter(l => l.type === 'battle' || l.type === 'reward').slice(-4);
    return <div className="scene-log" aria-hidden="true">{rows.map(l => <SceneLogLine key={l.id} log={l} playerName={playerName}/>)}</div>;
}, (a, b) => a.logs.at(-1)?.id === b.logs.at(-1)?.id && a.playerName === b.playerName);

const SceneLogLine = memo(function SceneLogLine({ log, playerName }: { log: Log; playerName: string }) {
    const ev = log.event;
    if (!ev) return <p className={log.type === 'reward' ? 'reward' : ''}>{log.text}</p>;
    const mine = ev.actor === playerName, missed = ev.hits.length > 0 && ev.hits.every(h => h.miss), crit = ev.hits.some(h => h.critical && !h.miss);
    if (ev.stunned || ev.defeated) return <p className={mine ? '' : 'foe'}>{ev.actor} · {ev.stunned ? '기절로 행동 불가' : '쓰러짐'}</p>;
    return <p className={`${mine ? 'me' : 'foe'} ${crit ? 'crit' : ''}`}>
        {mine ? null : <>{ev.actor} · </>}<b>{ev.skillName}</b>{' '}
        {missed ? <span className="miss">빗나감</span> : ev.hits.length > 0 ? <span className="n">{ev.total.toLocaleString()}{crit ? ' 치명' : ''}</span> : null}
        {ev.healed > 0 && <span className="heal"> 회복 {ev.healed.toLocaleString()}</span>}
        {ev.drained > 0 && <span className="heal"> 흡혈 {ev.drained.toLocaleString()}</span>}
    </p>;
});

const ATTR_SHORT: Record<string, string> = { str: '힘', dex: '민첩', int: '지능', vit: '체질', wis: '정신', luk: '행운' };
/** 아제로스 전용 자원 HUD(장면 왼쪽 위): 정수를 소모하는 기술을 끼면 정수 · 포식 능력치, 채굴 기술을 끼면 캔 세계석 · 채굴 확률. 해당 기술이 없으면 그리지 않습니다. */
export function AzerothHud({ s }: { s: State }) {
    const sks = s.skills.map(id => skillById(id));
    const eat = sks.find(sk => sk?.essenceCost), mine = sks.find(sk => sk?.mineChance);
    if (eat) {
        const gained = Object.entries(s.devoured || {}).filter(([, v]) => v);
        return <div className="scene-job-hud az-hud devour" role="status">
            <span className="t">ESSENCE</span>
            <span className="row"><span>정수</span><b>{format(s.essence || 0)}</b></span>
            <span className="row"><span>1회 소모</span><span>{format(eat.essenceCost!)}</span></span>
            {gained.length > 0 && <span className="attrs">{gained.map(([k, v]) => <span key={k}>{ATTR_SHORT[k] || k} <b>+{v}</b></span>)}</span>}
            {(s.essence || 0) < eat.essenceCost! && <span className="warn">정수 부족 · 기술이 나가지 않습니다</span>}
        </div>;
    }
    if (mine) {
        const growth = sks.find(sk => sk?.mineGrowth)?.mineGrowth, mined = s.pearlsMined || 0;
        const chance = mine.mineChance! + mineBonusOf(s, sks), full = !growth || Math.floor(mined / growth.per) * growth.bonus >= growth.cap;
        return <div className="scene-job-hud az-hud mine" role="status">
            <span className="t">WORLD STONE</span>
            <span className="row"><span>캔 세계석</span><b>{format(mined)}</b></span>
            <span className="row"><span>채굴 확률</span><b>{Math.round(chance * 100)}%</b></span>
            {growth && !full && <><span className="gauge"><i style={{ width: `${(mined % growth.per) / growth.per * 100}%` }}/></span><small>다음 +{Math.round(growth.bonus * 100)}%p까지 {format(growth.per - mined % growth.per)}개</small></>}
        </div>;
    }
    return null;
}

type Slip = { id: number; title: string; tags: string[]; side: 'me' | 'foe'; big: boolean; boss: boolean };
const SLIP_MS = 2600, SLIP_MAX = 4;
/** 컴포넌트가 사라질 때 한꺼번에 지울 수 있게 타이머를 모아 둡니다. */
function later(bag: Set<number>, fn: () => void, ms: number) {
    const t = window.setTimeout(() => { bag.delete(t); fn(); }, ms);
    bag.add(t);
}
/**
 * v3.247 스킬 이름 쌓기: 몬스터 옆 캡션 · 몬스터 스킬 알림으로 뜨던 스킬 이름을 한 곳에 모아, 새 스킬이 맨 아래에 찍히고
 * 이전 줄은 위로 밀려 올라가며 흐려집니다. 여러 스킬이 한꺼번에 나가도 겹치지 않습니다. 각 줄은 그 타격 박자(fx.delay)에 찍힙니다.
 */
export function SkillReceipt({ effect, boss = false }: { effect: CombatFx[]; boss?: boolean }) {
    const [slips, setSlips] = useState<Slip[]>([]);
    const seen = useRef(new Set<number>()), timers = useRef(new Set<number>());
    useEffect(() => {
        const bag = timers.current;
        for (const fx of effect) {
            if (seen.current.has(fx.id)) continue;
            seen.current.add(fx.id);
            if (fx.basic || !fx.skillId || fx.kind === 'stun' || fx.status === '행동 불가' || hasSceneTitle(fx, boss)) continue;
            const tags = [fx.extreme && '極限突破', fx.critical && fx.actor === 'player' && '치명', fx.mined && `세계석 +${fx.mined}`, fx.devour && '포식', fx.status].filter((t): t is string => !!t);
            const slip: Slip = { id: fx.id, title: fx.title, tags, side: fx.actor === 'player' ? 'me' : 'foe', big: !!fx.finale || (fx.tier || 0) >= 4, boss: fx.actor === 'enemy' && boss };
            later(bag, () => {
                setSlips(prev => [...prev.filter(x => x.id !== slip.id), slip].slice(-SLIP_MAX));
                later(bag, () => setSlips(prev => prev.filter(x => x.id !== slip.id)), SLIP_MS);
            }, fx.delay);
        }
        if (seen.current.size > 200) { const keep = [...seen.current].slice(-50); seen.current.clear(); keep.forEach(id => seen.current.add(id)); }
    }, [effect, boss]);
    useEffect(() => { const pending = timers.current; return () => pending.forEach(clearTimeout); }, []);
    if (!slips.length) return null;
    return <div className="skill-receipt" aria-hidden="true">{slips.map(s => <div key={s.id} className={`skill-slip ${s.side} ${s.big ? 'big' : ''}`}>
        {s.side === 'foe' && <small className="who">{s.boss ? 'BOSS' : '몬스터'}</small>}<b>{s.title}</b>{s.tags.map(t => <small key={t}>{t}</small>)}
    </div>)}</div>;
}

/** v3.248 공용 스킬 연출 색(갈래별). */
const CAST_COLOR: Record<string, string> = {
    pierce: '#f1e3b6', slash: '#ffe9cf', quake: '#e0b98a', bite: '#b7f08a', wave: '#8ce4ed', lightning: '#ffe38b', fire: '#ff9a4a', frost: '#a8e4ff', star: '#fff2a8',
    gold: '#ffd36b', song: '#f7b6e8', ward: '#9fd3ff', heal: '#8ff0b0', curse: '#c08bff', arcane: '#b9a6ff', impact: '#ffd9a8', glyph: '#ffe38b', venom: '#9fe870', ink: '#8c8cff', bone: '#e8e2d0', time: '#9fe0d8',
};
const CAST_SHAPE: Record<string, 'blade' | 'orb' | 'bolt' | 'aura'> = {
    pierce: 'bolt', slash: 'blade', quake: 'blade', bite: 'blade', bone: 'blade', impact: 'blade', lightning: 'bolt',
    heal: 'aura', ward: 'aura', song: 'aura', gold: 'aura',
};
/**
 * v3.248 2단계 공용 연출: 스킬을 쓰면 왼쪽 아래 내 캐릭터가 빛나고(시전), 갈래별 투사체(검기 · 마력 구체 · 번개 화살)가 몬스터로 날아가 맞는 순간 터집니다.
 * 기본 공격은 몬스터 위 짧은 베기, 몬스터에게 맞으면 내 캐릭터 위에 붉은 할퀴기. 전용 연출(이계 · 아제로스 · 제논 · 각성기 등)이 있는 스킬은 시전 빛만 더합니다.
 * 투사체는 타격 박자(fx.delay)보다 조금 먼저 출발해 피해 숫자와 함께 닿습니다.
 */
export function CastFx({ effect, boss = false }: { effect: CombatFx[]; boss?: boolean }) {
    return <div className="cast-layer" aria-hidden="true">{effect.map(fx => {
        if (fx.kind === 'stun' || fx.status === '행동 불가') return null;
        const style = { '--fx-delay': `${fx.delay}ms`, '--fx': CAST_COLOR[fx.variant] || '#ffe9cf' } as React.CSSProperties;
        const landed = fx.hits.some(h => !h.miss);
        if (fx.actor === 'enemy') return fx.target === 'player' && landed ? <div key={fx.id} className={`cast-fx cast-claw ${fx.critical ? 'critical' : ''}`} style={style}><i/><i/><i/></div> : null;
        if (fx.basic) return landed ? <div key={fx.id} className={`cast-fx cast-basic ${fx.damageType === 'physical' ? 'phys' : 'mag'} ${fx.critical ? 'critical' : ''}`} style={style}><i/></div> : null;
        const own = hasSceneTitle(fx, boss), shape = fx.target === 'player' ? 'aura' : CAST_SHAPE[fx.variant] ?? 'orb', big = (fx.tier || 0) >= 4;
        return <div key={fx.id} className={`cast-fx cast-skill cast-${shape} ${big ? 'big' : ''} ${fx.critical ? 'critical' : ''}`} style={style}>
            <i className="cast-glow"/>
            {!own && shape !== 'aura' && <><i className="cast-shot"/>{fx.hits.length > 1 && <i className="cast-shot late"/>}<i className="cast-burst"/>{landed && <i className="cast-ring"/>}</>}
            {shape === 'aura' && <i className="cast-aura"/>}
        </div>;
    })}</div>;
}
