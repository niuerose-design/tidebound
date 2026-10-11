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
import { Meter, format, short } from './shared';
import { StatusBadges } from './combat-status';
import { hasSceneTitle, sceneImpactMs } from './combat-fx';
import { useSceneLoot } from './skill-fx-setting';
import { useHeroImage, useSceneLook, type HeroKindId, type WeaponId } from './scene-look-setting';

/**
 * v3.247 전투 장면 개편: 왼쪽 아래 내 캐릭터(직업 그림 + 이름 · HP · 마나 판), 오른쪽 몬스터(맞으면 번쩍이며 밀리고 처치되면 찌그러져 사라짐),
 * 장면 왼쪽에서 한 줄씩 올라오는 전투 기록, 전용 자원이 있는 직업(이계 · 아제로스 히든)만 왼쪽 위 HUD.
 */

type HeroKind = HeroKindId;
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

/**
 * v3.252 계열 몸 + 무기 소품: 메이플 직업 이름(아처 · 다크나이트 · 섀도어 · 캡틴 · 비숍 …)으로 무기를 고릅니다. 이름에 단서가 없으면 계열 기본 무기.
 * 전용 자원 직업(정수 소모 · 채굴 · 이계 · 해커)과 히든(신비) 계열은 위의 전용 그림을 그대로 씁니다.
 */
type Weapon = WeaponId;
const WEAPON_RULES: [RegExp, Weapon][] = [
    [/키네시스|일리움|라라/, 'orb'],
    [/^검사|파이터|크루세이더|아델|제로|데몬슬레이어/, 'sword'],
    [/아처|헌터|사수|레인저|저격수|보우|신궁|패스파인더|메르세데스|윈드브레이커|와일드헌터/, 'bow'],
    [/다크나이트|스피어|아란|창술/, 'spear'],
    [/팔라딘|페이지|^나이트$|카이저|미하일|종거북/, 'shield'],
    [/캡틴|건슬링거|발키리|메카닉|엔젤릭버스터|캐논|블래스터/, 'gun'],
    [/인파이터|바이퍼|버커니어|스트라이커|썬더 브레이커|은월|아크$|아크 /, 'fist'],
    [/시프|어쌔신|허밋|나이트로드|섀도어|듀얼|카데나|칼리|팬텀|나이트워커|데몬어벤져/, 'dagger'],
    [/호영|해커/, 'fan'],
    [/매지션|위자드|메이지|비숍|클레릭|프리스트|썬콜|불독|플레임|에반|루미너스|배틀메이지/, 'staff'],
];
const TREE_WEAPON: Record<string, Weapon> = { physical: 'sword', magic: 'staff', defense: 'shield', status: 'dagger', hybrid: 'sword', support: 'fan', mystery: 'orb' };
export function heroWeapon(job: Pick<Job, 'name' | 'tree'> | undefined): Weapon {
    const name = job?.name || '';
    return WEAPON_RULES.find(([re]) => re.test(name))?.[1] ?? TREE_WEAPON[job?.tree || ''] ?? 'sword';
}
const TREE_TONE: Record<string, [string, string]> = { physical: ['#41506a', '#c9d6ea'], magic: ['#2d3f7a', '#9fb6ff'], defense: ['#55606e', '#d5dce6'], status: ['#262b33', '#9a7fd1'], hybrid: ['#3b2f55', '#c7a6ff'], support: ['#6b5232', '#e7c67a'], mystery: ['#1f2a33', '#7fd6b3'] };
const ROBED = new Set<Weapon>(['staff', 'orb']);
function heroBody(tree: string, weapon: Weapon) {
    const [cloth, trim] = TREE_TONE[tree] ?? TREE_TONE.physical;
    if (ROBED.has(weapon)) return <><path d="M40 30c10 0 14 8 14 14l10 58H16l10-58c0-6 4-14 14-14z" fill={cloth} stroke={trim} strokeWidth="1.4"/><circle cx="40" cy="28" r="10" fill="#e7c9a6"/>{weapon === 'staff' ? <path d="M24 24 40 0l16 24z" fill={cloth} stroke={trim} strokeWidth="1.2"/> : <path d="M29 24q11-14 22 0v-4q-11-10-22 0z" fill="#c9c2e6"/>}</>;
    return <><path d="M30 36h20l6 64H24z" fill={cloth} stroke={trim} strokeWidth="1.4"/><circle cx="40" cy="24" r="11" fill="#e7c9a6"/>{weapon === 'dagger' ? <><path d="M27 30q13-26 26 0l-2 4H29z" fill={cloth}/><path d="M33 27h14" stroke="#111" strokeWidth="2.5"/></> : <path d="M28 22q12-16 24 0v-4Q40 4 28 18z" fill="#7b5b3a"/>}<path d="M24 58h32v5H24z" fill="#2b3446"/></>;
}
const WEAPON_SVG: Record<Weapon, React.ReactNode> = {
    sword: <><path d="M56 48 74 8" stroke="#e8eef8" strokeWidth="5" strokeLinecap="round"/><path d="M50 52l12-8" stroke="#8a6b3a" strokeWidth="5" strokeLinecap="round"/></>,
    spear: <><path d="M50 102 70 6" stroke="#8a6b3a" strokeWidth="3.5" strokeLinecap="round"/><path d="M70 6l-4 14 8-1z" fill="#e8eef8" stroke="#e8eef8" strokeWidth="2" strokeLinejoin="round"/></>,
    bow: <><path d="M60 18q22 34 0 70" stroke="#8a6b3a" strokeWidth="3.5" fill="none" strokeLinecap="round"/><path d="M60 18v70" stroke="#e9e2cf" strokeWidth="1"/><path d="M48 53h30" stroke="#d9c7a0" strokeWidth="2"/><path d="M78 53l-5-3v6z" fill="#e8eef8"/></>,
    dagger: <><path d="M54 50l15-11" stroke="#d9e2ee" strokeWidth="3" strokeLinecap="round"/><path d="M55 62l18-3" stroke="#d9e2ee" strokeWidth="3" strokeLinecap="round"/><circle cx="54" cy="50" r="2.5" fill="#6b4a8a"/><circle cx="55" cy="62" r="2.5" fill="#6b4a8a"/></>,
    gun: <><path d="M52 52l24-2v6l-20 2z" fill="#30363d" stroke="#c9d6ea"/><path d="M56 56l-1 9h5l1-8z" fill="#30363d"/></>,
    fist: <><circle cx="60" cy="56" r="7.5" fill="#c9773a" stroke="#ffd9a8" strokeWidth="1.5"/><path d="M55 53h10M55 57h10" stroke="#7a4420" strokeWidth="1.2"/></>,
    staff: <><path d="M62 30v70" stroke="#8a6b3a" strokeWidth="4" strokeLinecap="round"/><circle cx="62" cy="26" r="6" fill="#9fe7ff"/><circle cx="62" cy="26" r="11" fill="#9fe7ff" opacity=".25"/></>,
    shield: <><path d="M50 44h22v26q0 14-11 20-11-6-11-20z" fill="#3f6fa8" stroke="#e8eef8" strokeWidth="2"/><path d="M61 52v28M53 62h16" stroke="#f3d27a" strokeWidth="3"/></>,
    orb: <><circle cx="64" cy="48" r="6" fill="#c9a6ff" opacity=".9"/><circle cx="64" cy="48" r="12" fill="#c9a6ff" opacity=".2"/><circle cx="72" cy="66" r="3.5" fill="#9fe7ff" opacity=".85"/><circle cx="56" cy="34" r="3" fill="#9fe7ff" opacity=".8"/></>,
    fan: <><path d="M54 56l20-18a18 18 0 0 1 2 22z" fill="#e7c67a" stroke="#8a6b3a" strokeWidth="1.2"/><path d="M54 56l20-18M54 56l22-12M54 56l22-4" stroke="#8a6b3a" strokeWidth=".8"/></>,
};
const SPECIAL = new Set<HeroKind>(['devour', 'miner', 'agent', 'trader', 'hacker', 'mystic']);
/** v3.268 모양을 직접 고르면(꾸미기) 그 모양의 계열 몸 색을 씁니다. */
const HERO_TREE: Partial<Record<HeroKind, string>> = Object.fromEntries(Object.entries(TREE_HERO).map(([tree, kind]) => [kind, tree]));
export const HeroFigure = memo(function HeroFigure({ kind, job, weapon: chosen, tree: bodyTree }: { kind: HeroKind; job?: Pick<Job, 'name' | 'tree'>; weapon?: Weapon; tree?: string }) {
    if (bodyTree && !SPECIAL.has(kind)) { const weapon = chosen ?? heroWeapon(job); return <svg className={`scene-hero-art hero-${kind} weapon-${weapon}`} viewBox="0 0 80 110" aria-hidden="true">{heroBody(bodyTree, weapon)}{WEAPON_SVG[weapon]}</svg>; }
    if (SPECIAL.has(kind) || !job) return <svg className={`scene-hero-art hero-${kind}`} viewBox="0 0 80 110" aria-hidden="true">{HERO_SVG[kind]}</svg>;
    const weapon = chosen ?? heroWeapon(job);
    return <svg className={`scene-hero-art hero-${kind} weapon-${weapon}`} viewBox="0 0 80 110" aria-hidden="true">{heroBody(job.tree, weapon)}{WEAPON_SVG[weapon]}</svg>;
});

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FRAMES: Record<string, { k: Keyframe[]; ms: number }> = {
    hit: { k: [{ filter: 'brightness(2.6)', transform: 'translateX(0)' }, { filter: 'brightness(1.4)', transform: 'translateX(9px)', offset: .4 }, { filter: 'none', transform: 'translateX(0)' }], ms: 300 },
    crit: { k: [{ filter: 'brightness(3.4) saturate(0)', transform: 'translateX(0) scale(1)' }, { filter: 'brightness(1.6)', transform: 'translateX(18px) scale(1.05,.95)', offset: .3 }, { filter: 'none', transform: 'translateX(0) scale(1)' }], ms: 420 },
    cast: { k: [{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(10px,-6px) scale(1.06)', offset: .4 }, { transform: 'translate(0,0) scale(1)' }], ms: 450 },
    // v3.272 내 캐릭터 판 피격: 좌우로 흔들리며 붉게 번쩍(치명타는 더 세게).
    hurt: { k: [{ transform: 'translateX(0)', boxShadow: '0 0 0 0 #ff4d4d00' }, { transform: 'translateX(-6px)', boxShadow: '0 0 0 2px #ff4d4dcc, 0 0 18px #ff4d4d88', offset: .2 }, { transform: 'translateX(5px)', offset: .45 }, { transform: 'translateX(-2px)', offset: .7 }, { transform: 'translateX(0)', boxShadow: '0 0 0 0 #ff4d4d00' }], ms: 380 },
    hurtCrit: { k: [{ transform: 'translateX(0) scale(1)', boxShadow: '0 0 0 0 #ff4d4d00', background: '#06100fcc' }, { transform: 'translateX(-10px) scale(1.03)', boxShadow: '0 0 0 3px #ff4d4d, 0 0 26px #ff4d4daa', background: '#3a0b0bdd', offset: .18 }, { transform: 'translateX(8px)', offset: .42 }, { transform: 'translateX(-4px)', offset: .68 }, { transform: 'translateX(0) scale(1)', boxShadow: '0 0 0 0 #ff4d4d00', background: '#06100fcc' }], ms: 520 },
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
            timers.push(window.setTimeout(() => ref.current?.animate?.(FRAMES[kind].k, { duration: FRAMES[kind].ms, easing: 'ease-out' }), fx.delay + (kind === 'hit' || kind === 'crit' ? sceneImpactMs(fx) : 0)));
        }
        if (seen.current.size > 200) seen.current = new Set([...seen.current].slice(-50));
        return () => timers.forEach(clearTimeout);
    }, [effect, pick]);
    return ref;
}
const landed = (fx: CombatFx) => fx.hits.some(h => !h.miss);
const foePick = (fx: CombatFx) => fx.target === 'enemy' && landed(fx) ? (fx.critical ? 'crit' : 'hit') : null;
const platePick = (fx: CombatFx) => fx.target === 'player' && fx.actor === 'enemy' && landed(fx) ? (fx.critical ? 'hurtCrit' : 'hurt') : null;
const mePick = (fx: CombatFx) => fx.actor === 'player' && !fx.basic && !(fx.kind === 'stun' && !fx.hits.length) ? 'cast' : fx.target === 'player' && fx.actor === 'enemy' && landed(fx) ? 'recoil' : null;

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
/** v3.268 꾸미기 설정을 반영한 내 캐릭터: 올린 그림 → 고른 모양 · 무기 → 직업 자동 순서. */
export function MyHero({ s, job }: { s: Pick<State, 'job' | 'skills'>; job: Job | undefined }) {
    const look = useSceneLook(), image = useHeroImage();
    // eslint-disable-next-line @next/next/no-img-element -- 이 기기에 저장한 data URL 그림
    if (image) return <img className="scene-hero-art hero-image" src={image} alt=""/>;
    const kind = look.hero === 'auto' ? heroKind(s, job) : look.hero, weapon = look.weapon === 'auto' ? undefined : look.weapon;
    return <HeroFigure kind={kind} job={job} weapon={weapon} tree={look.hero === 'auto' ? (weapon && job ? job.tree : undefined) : HERO_TREE[look.hero]}/>;
}
export function SceneMe({ s, stats, effect }: { s: State; stats: CombatStats; effect: CombatFx[] }) {
    const ref = usePulse(effect, mePick), plate = usePulse(effect, platePick), job = jobById(s.job), title = displayTitle(s);
    return <div className="scene-me">
        <div ref={ref} className="scene-hero"><MyHero s={s} job={job}/></div>
        <div ref={plate} className="scene-me-plate">
            <div className="scene-me-name"><b>{title ? <small>{title}</small> : null}{s.name}</b><StatusBadges effects={s.effects} stun={s.playerStun} recent={effect} target="player"/></div>
            <small className="scene-me-sub">{job?.name || '초보자'} · Lv.{s.level}{s.rebirths ? ` · 환생 ${s.rebirths}` : ''}</small>
            <div className="player-hp-anchor"><Meter value={s.hp} max={stats.hp} label="HP"/></div>
            <div className="scene-me-mana" title={`마나 ${Math.ceil(s.mana)} / ${stats.mana}`}><i style={{ width: `${Math.max(0, Math.min(100, s.mana / Math.max(1, stats.mana) * 100))}%` }}/></div>
        </div>
    </div>;
}

/** 장면 전투 기록: 최근 4줄이 아래에서 올라오고 위로 갈수록 흐려집니다. 전체 기록은 오른쪽 기록판에 그대로. */
export const SceneLog = memo(function SceneLog({ logs, playerName }: { logs: Log[]; playerName: string }) {
    // v3.263 보상 알림이 몬스터 쪽에 뜨면(설정 켜짐) 여기에는 전투 줄만 둡니다.
    const loot = useSceneLoot(), rows = logs.filter(l => l.type === 'battle' || (!loot && l.type === 'reward')).slice(-4);
    return <div className="scene-log" aria-hidden="true">{rows.map(l => <SceneLogLine key={l.id} log={l} playerName={playerName}/>)}</div>;
}, (a, b) => a.logs.at(-1)?.id === b.logs.at(-1)?.id && a.playerName === b.playerName);

const SceneLogLine = memo(function SceneLogLine({ log, playerName }: { log: Log; playerName: string }) {
    const ev = log.event;
    if (!ev) return <p className={log.type === 'reward' ? 'reward' : ''}>{log.text}</p>;
    const mine = ev.actor === playerName, missed = ev.hits.length > 0 && ev.hits.every(h => h.miss), crit = ev.hits.some(h => h.critical && !h.miss);
    if (ev.stunned || ev.defeated) return <p className={mine ? '' : 'foe'}>{ev.actor} · {ev.stunned ? '기절로 행동 불가' : '쓰러짐'}</p>;
    return <p className={`${mine ? 'me' : 'foe'} ${crit ? 'crit' : ''}`}>
        {mine ? null : <span className="who">{ev.actor} · </span>}<b>{ev.skillName}</b>{' '}
        {missed ? <span className="miss">빗나감</span> : ev.hits.length > 0 ? <span className="n">{ev.total.toLocaleString()}{crit ? <small className="crit-word"> 치명</small> : null}</span> : null}
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
const SLIP_MS = 2600, SLIP_MAX = 4, SLIP_GAP = 260;
const SLIP_LOOK = [{ o: 1, s: 1 }, { o: .78, s: .92 }, { o: .55, s: .85 }, { o: .32, s: .78 }];
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
    const seen = useRef(new Set<number>()), timers = useRef(new Set<number>()), nextAt = useRef(0);
    useEffect(() => {
        const bag = timers.current;
        for (const fx of effect) {
            if (seen.current.has(fx.id)) continue;
            seen.current.add(fx.id);
            if (fx.basic || !fx.skillId || (fx.kind === 'stun' && !fx.hits.length) || fx.status === '행동 불가' || hasSceneTitle(fx, boss)) continue;
            const tags = [fx.extreme && '極限突破', fx.critical && fx.actor === 'player' && '치명', fx.mined && `세계석 +${fx.mined}`, fx.devour && '포식', fx.status].filter((t): t is string => !!t);
            const slip: Slip = { id: fx.id, title: fx.title, tags, side: fx.actor === 'player' ? 'me' : 'foe', big: !!fx.finale || (fx.tier || 0) >= 4, boss: fx.actor === 'enemy' && boss };
            // v3.250 한꺼번에 여러 이름이 와도 SLIP_GAP 간격으로 하나씩 올립니다(따다닥 튀지 않게).
            const now = performance.now(), at = Math.max(now + fx.delay, nextAt.current);
            nextAt.current = at + SLIP_GAP;
            later(bag, () => {
                setSlips(prev => [...prev.filter(x => x.id !== slip.id), slip].slice(-SLIP_MAX));
                later(bag, () => setSlips(prev => prev.filter(x => x.id !== slip.id)), SLIP_MS);
            }, at - now);
        }
        if (seen.current.size > 200) { const keep = [...seen.current].slice(-50); seen.current.clear(); keep.forEach(id => seen.current.add(id)); }
    }, [effect, boss]);
    useEffect(() => { const pending = timers.current; return () => pending.forEach(clearTimeout); }, []);
    if (!slips.length) return null;
    // 줄마다 아래에서 몇 번째인지(--y)로 자리를 잡아, 새 이름이 오면 이전 이름이 부드럽게 위로 미끄러집니다.
    return <div className="skill-receipt" aria-hidden="true">{slips.map((s, i) => { const y = slips.length - 1 - i, look = SLIP_LOOK[y] ?? SLIP_LOOK[3]; return <div key={s.id} className={`skill-slip ${s.side} ${s.big ? 'big' : ''}`} style={{ '--y': y, '--o': look.o, '--s': look.s } as React.CSSProperties}>
        {s.side === 'foe' && <small className="who">{s.boss ? 'BOSS' : '몬스터'}</small>}<b>{s.title}</b>{s.tags.map(t => <small key={t}>{t}</small>)}
    </div>; })}</div>;
}

/** v3.249 공용 스킬 연출 색(갈래별). */
const CAST_COLOR: Record<string, string> = {
    pierce: '#f1e3b6', slash: '#ffe9cf', quake: '#e0b98a', bite: '#b7f08a', wave: '#8ce4ed', lightning: '#ffe38b', fire: '#ff9a4a', frost: '#a8e4ff', star: '#fff2a8',
    gold: '#ffd36b', song: '#f7b6e8', ward: '#9fd3ff', heal: '#8ff0b0', curse: '#c08bff', arcane: '#b9a6ff', impact: '#ffd9a8', glyph: '#ffe38b', venom: '#9fe870', ink: '#8c8cff', bone: '#e8e2d0', time: '#9fe0d8',
};
const CAST_SHAPE: Record<string, 'blade' | 'orb' | 'bolt' | 'aura'> = {
    pierce: 'bolt', slash: 'blade', quake: 'blade', bite: 'blade', bone: 'blade', impact: 'blade', lightning: 'bolt',
    heal: 'aura', ward: 'aura', song: 'aura', gold: 'aura',
};
/** v3.272 갈래별 타격 자국(닿는 순간 몬스터 위): 베기 X 검흔, 관통 창끝 섬광, 불 화염, 얼음 파편, 번개 낙뢰, 대지 균열, 물기 발톱, 물결 물보라, 저주 · 독 · 먹물 검은 고리. */
const MARK: Partial<Record<string, string>> = { slash: 'slash', pierce: 'pierce', fire: 'fire', frost: 'frost', lightning: 'bolt', quake: 'crack', impact: 'crack', bite: 'claw', wave: 'splash', curse: 'dark', venom: 'dark', ink: 'dark', bone: 'dark' };
/**
 * v3.249 2단계 공용 연출: 스킬을 쓰면 왼쪽 아래 내 캐릭터가 빛나고(시전), 갈래별 투사체(검기 · 마력 구체 · 번개 화살)가 몬스터로 날아가 맞는 순간 터집니다.
 * 기본 공격은 몬스터 위 짧은 베기, 몬스터에게 맞으면 내 캐릭터 위에 붉은 할퀴기. 전용 연출(이계 · 아제로스 · 제논 · 각성기 등)이 있는 스킬은 시전 빛만 더합니다.
 * 투사체는 타격 박자(fx.delay)보다 조금 먼저 출발해 피해 숫자와 함께 닿습니다.
 */
export function CastFx({ effect, boss = false }: { effect: CombatFx[]; boss?: boolean }) {
    return <div className="cast-layer" aria-hidden="true">{effect.map(fx => {
        // v3.271 기절을 거는 스킬(kind 'stun', 타격 있음)도 투사체를 그립니다. 빼는 것은 기절해 행동하지 못한 턴(타격 없음)뿐.
        if (fx.status === '행동 불가' || (fx.kind === 'stun' && !fx.hits.length)) return null;
        // v3.271 투사체 CSS는 --fx-delay(닿는 순간)보다 0.27초 먼저 출발하므로, 일반 스킬은 닿는 순간을 비행 시간만큼 뒤로 미룹니다(시전 빛은 그대로 시전 순간).
        const style = { '--fx-delay': `${fx.delay + sceneImpactMs(fx)}ms`, '--fx': CAST_COLOR[fx.variant] || '#ffe9cf' } as React.CSSProperties;
        const landed = fx.hits.some(h => !h.miss);
        if (fx.actor === 'enemy') return fx.target === 'player' && landed ? <div key={fx.id} className={`cast-fx cast-claw ${fx.critical ? 'critical' : ''}`} style={style}><i/><i/><i/></div> : null;
        if (fx.basic) return landed ? <div key={fx.id} className={`cast-fx cast-basic ${fx.damageType === 'physical' ? 'phys' : 'mag'} ${fx.critical ? 'critical' : ''}`} style={style}><i/></div> : null;
        const own = hasSceneTitle(fx, boss), shape = fx.target === 'player' ? 'aura' : CAST_SHAPE[fx.variant] ?? 'orb', big = (fx.tier || 0) >= 4;
        return <div key={fx.id} className={`cast-fx cast-skill cast-${shape} ${big ? 'big' : ''} ${fx.critical ? 'critical' : ''}`} style={style}>
            <i className="cast-glow"/>
            {!own && shape !== 'aura' && <><i className="cast-shot"/>{fx.hits.length > 1 && <i className="cast-shot late"/>}<i className="cast-burst"/>{landed && <i className="cast-ring"/>}{landed && MARK[fx.variant] && <i className={`cast-mark m-${MARK[fx.variant]}`}><b/><b/><b/></i>}</>}
            {shape === 'aura' && <i className="cast-aura"/>}
        </div>;
    })}</div>;
}

/**
 * v3.250 장면 피해 숫자(연출 시안 방식): 몬스터 · 내 캐릭터 위에서 크게 튀어 올랐다가 위로 흩어집니다. 추가타는 160ms 박자로 조금씩 엇갈려 쌓이고,
 * 치명타는 노란 큰 숫자에 CRITICAL, 빗나감은 MISS, 지속 피해는 보라, 회복 · 흡혈은 초록. 예전 HP 바 위 숫자(CombatBarEffect)는 장면에서 쓰지 않습니다.
 */
type Pop = { key: string; at: 'foe' | 'me'; text: string; kind: 'hit' | 'crit' | 'super' | 'miss' | 'heal' | 'dot' | 'taken'; delay: number; dx: number; dy: number };
/** v3.269 연타 숫자는 위로 25px씩 쌓고, 장면 안쪽으로 조금씩 비켜 둡니다(몬스터는 오른쪽 끝이라 왼쪽, 내 캐릭터는 왼쪽 끝이라 오른쪽). */
const jitter = (n: number, spread: number) => ((n * 37) % 11 - 5) / 5 * spread;
function popsOf(fx: CombatFx): Pop[] {
    const out: Pop[] = [], target = fx.target === 'player' ? 'me' : 'foe', self = fx.actor === 'player' ? 'me' : 'foe';
    const impact = target === 'foe' ? sceneImpactMs(fx) : 0;
    if (fx.dot) out.push({ key: `${fx.id}-dot`, at: self, text: `${fx.dot.name} −${fx.dot.value.toLocaleString()}`, kind: 'dot', delay: fx.delay, dx: 0, dy: 26 });
    fx.hits.forEach((h, i) => out.push({
        key: `${fx.id}-${i}`, at: target, delay: fx.delay + impact + i * 160, dx: (target === 'foe' ? -1 : 1) * i * 12 + jitter(fx.id + i * 3, 4), dy: -i * 25,
        text: h.miss ? 'MISS' : `${target === 'me' ? '−' : ''}${h.value.toLocaleString()}`,
        kind: h.miss ? 'miss' : target === 'me' ? 'taken' : h.superCritical ? 'super' : h.critical ? 'crit' : 'hit',
    }));
    if (fx.healing > 0) out.push({ key: `${fx.id}-heal`, at: self, text: `+${fx.healing.toLocaleString()}`, kind: 'heal', delay: fx.delay + 150, dx: 18, dy: 0 });
    if (fx.drained > 0) out.push({ key: `${fx.id}-drain`, at: self, text: `흡혈 +${fx.drained.toLocaleString()}`, kind: 'heal', delay: fx.delay + 300, dx: 18, dy: -20 });
    if (fx.endured) out.push({ key: `${fx.id}-endure`, at: fx.endured.self ? self : target, text: `無 버팀${fx.endured.heal ? ` +${fx.endured.heal.toLocaleString()}` : ''}`, kind: 'heal', delay: fx.delay + 320, dx: 0, dy: -40 });
    return out;
}
export function SceneDamage({ effect }: { effect: CombatFx[] }) {
    return <div className="scene-dmg-layer" aria-hidden="true">{effect.flatMap(popsOf).map(p => <b key={p.key} className={`scene-dmg ${p.at} ${p.kind}`} style={{ '--fx-delay': `${p.delay}ms`, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as React.CSSProperties}>{p.kind === 'crit' || p.kind === 'super' ? <small>{p.kind === 'super' ? 'SUPER CRITICAL' : 'CRITICAL'}</small> : null}{p.text}</b>)}</div>;
}

/**
 * v3.258 처치 보상 팝업: 새 처치 · 획득 기록이 오면 몬스터 자리에서 경험치 · 골드 · 숙련, 세계석 · 정수 · 장비 같은 획득이 차례로 떠오릅니다.
 * 기록 문구(엔진의 ‘○○ 처치 · +G · +EXP · 숙련 +N’)를 읽어 숫자는 짧게(만 · 억) 보여 줍니다.
 */
type Loot = { key: string; text: string; kind: 'exp' | 'gold' | 'mastery' | 'pearl' | 'essence' | 'item' | 'other'; delay: number };
const LOOT_MS = 1900, LOOT_MAX = 5;
function lootOf(log: Log): Omit<Loot, 'key' | 'delay'>[] {
    const kill = /처치(?: · \+([\d,]+) G · \+([\d,]+) EXP)?(?: · 숙련 \+([\d,]+))?/.exec(log.text);
    if (kill && /처치/.test(log.text.split(' · ')[0])) {
        const n = (v?: string) => Number((v || '0').replace(/,/g, ''));
        return [kill[2] && { text: `+${short(n(kill[2]))} EXP`, kind: 'exp' as const }, kill[1] && { text: `+${short(n(kill[1]))} G`, kind: 'gold' as const }, kill[3] && { text: `숙련 +${short(n(kill[3]))}`, kind: 'mastery' as const }].filter(Boolean) as Omit<Loot, 'key' | 'delay'>[];
    }
    const kind = /세계석/.test(log.text) ? 'pearl' : /정수/.test(log.text) ? 'essence' : /장비 발견|획득/.test(log.text) ? 'item' : 'other';
    const text = log.text.replace(/^[✦◆◇★☆♦👑\s]+/, '').split(' · ').slice(0, 2).join(' · ');
    return [{ text: text.length > 26 ? `${text.slice(0, 25)}…` : text, kind }];
}
export function SceneLoot({ logs }: { logs: Log[] }) {
    const last = useRef<number | null>(null), timers = useRef(new Set<number>());
    const [pops, setPops] = useState<Loot[]>([]), on = useSceneLoot();
    const latest = logs.at(-1)?.id ?? 0;
    useEffect(() => {
        if (last.current === null || latest < last.current) { last.current = latest; return; }
        if (latest === last.current) return;
        const since = last.current;
        last.current = latest;
        if (!on) return;
        const fresh = logs.filter(l => l.id > since && l.type === 'reward').flatMap(l => lootOf(l).map((x, i) => ({ ...x, key: `${l.id}-${i}` }))).slice(0, LOOT_MAX).map((x, i) => ({ ...x, delay: i * 140 }));
        if (!fresh.length) return;
        const keys = new Set(fresh.map(x => x.key));
        setPops(prev => [...prev.filter(p => !keys.has(p.key)), ...fresh].slice(-8));
        later(timers.current, () => setPops(prev => prev.filter(p => !keys.has(p.key))), LOOT_MS + fresh.length * 140);
    }, [latest, logs, on]);
    useEffect(() => { const pending = timers.current; return () => pending.forEach(clearTimeout); }, []);
    if (!pops.length || !on) return null;
    return <div className="scene-loot-layer" aria-hidden="true">{pops.map((p, i) => <b key={p.key} className={`scene-loot ${p.kind}`} style={{ '--d': `${p.delay}ms`, '--row': i % 5 } as React.CSSProperties}>{p.text}</b>)}</div>;
}

/** 값이 바뀌는 순간에만 잠깐 켜지는 표시(처음 그릴 때는 켜지 않음). key가 같으면 다시 켜지지 않습니다. */
function useFlash(key: string, ms: number, fire: (was: string, now: string) => boolean = () => true) {
    const prev = useRef<string | null>(null), [on, setOn] = useState<string | null>(null);
    useEffect(() => {
        const was = prev.current;
        prev.current = key;
        if (was === null || !key || was === key || reduced() || !fire(was, key)) return;
        setOn(key);
        const timer = window.setTimeout(() => setOn(v => v === key ? null : v), ms);
        return () => window.clearTimeout(timer);
    }, [key, ms, fire]);
    return on;
}
const levelRose = (was: string, now: string) => Number(now) > Number(was);

/** v3.259 보스 등장: 보스가 나타나면 장면이 어두워지고 붉은 띠에 ‘BOSS’와 이름이 가로질러 지나갑니다(약 2.4초). */
export function BossIntro({ enemy }: { enemy: State['enemy'] }) {
    const key = enemy?.boss ? `${enemy.id}:${enemy.maxHp}` : '';
    const on = useFlash(key, 2400);
    if (!on || !enemy) return null;
    return <div className="boss-intro" aria-hidden="true"><i className="boss-intro-dark"/><div className="boss-intro-band"><small>WARNING · BOSS</small><strong>{enemy.name}</strong></div></div>;
}

/** v3.259 레벨 업: 레벨이 오르는 순간 내 캐릭터 둘레에 빛기둥이 서고 ‘LEVEL UP · Lv.N’이 떠오릅니다(약 2초). */
export function LevelUpFx({ level }: { level: number }) {
    const on = useFlash(String(level), 2000, levelRose);
    if (!on) return null;
    return <div className="levelup-fx" aria-hidden="true"><i className="levelup-pillar"/><i className="levelup-ring"/><strong>LEVEL UP<small>Lv.{level}</small></strong></div>;
}
