'use client';
import { Progress } from '@/components/ui/progress';
import { createElement, useEffect, useState } from 'react';
import { Anchor, Zap, Heart, Shield, Swords, Target, Waves, Coins, Gem, Sword, Diamond, Feather, ArrowUpRight, Mountain, Flame, Snowflake, Star, Music, HeartPulse, Skull, Sparkles, Hammer, ScrollText, Droplet, Droplets, Bone, Hourglass, Bug, Crosshair, Bomb, TrendingUp, TrendingDown, Activity, Axe, WandSparkles, ShieldHalf, ShieldCheck, Dices, FlaskConical, FlaskRound, Drill, Wind, Gauge, BookOpen, PiggyBank, Package, Search, Sprout, Syringe, Crown, Biohazard, Orbit, Award, CircleSlash, HandHeart, Dumbbell, Brain, Eye, Clover, Flag, Megaphone, Layers, Fuel, Sunrise, Snail, VolumeX, ArrowBigUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { skillById } from '@/game/data/skills';
import { jobById, lineageOf, JOB_TREES } from '@/game/data/classes';
import { fxVariantOf } from '@/game/systems/combat-feedback';
import type { Skill } from '@/game/types';
import { skillArtSrc } from '@/game/data/art';
export function Meter({ value, max, label, color = 'teal' }: {
    value: number;
    max: number;
    label?: string;
    color?: string;
}) {
    return <div className={`meter ${color}`}>{label && <div className="meter-label">
        <span>{label}</span>
        <span>{Math.ceil(value).toLocaleString()} / {max.toLocaleString()}</span>
        </div>}<Progress value={Math.max(0, Math.min(100, value / max * 100))} aria-label={label || '진행도'}/>
    </div>;
}
/** v3.258 스킬 갈래별 기본 아이콘(그림 파일이 없을 때). 색은 battle.css의 .skill-glyph.v-<갈래>. */
const VARIANT_ICON: Record<string, LucideIcon> = {
    pierce: ArrowUpRight, slash: Sword, quake: Hammer, bite: Bug, wave: Waves, lightning: Zap, fire: Flame, frost: Snowflake, star: Star, gold: Coins, song: Music,
    ward: Shield, heal: HeartPulse, curse: Skull, arcane: Sparkles, impact: Mountain, glyph: ScrollText, venom: Droplet, ink: Droplets, bone: Bone, time: Hourglass,
};
const ID_ICON: [RegExp, LucideIcon][] = [
    [/^(pistolBurst|suppressFire|fullAuto|doubleTap|shotgunBlast)$/, Zap],
    [/^(snipe|armorPiercer|deadEye)$/, Crosshair],
    [/^(grenadeLauncher|tacticalNuke|flashbang)$/, Bomb],
    [/^(buyOrder|leverage|shortSqueeze)$/, TrendingUp],
    [/^(shortSell|stopLoss|blackSwan)$/, TrendingDown],
    [/^circuitBreaker$/, Activity],
];
/**
 * v3.263 기본 갈래(충격 · 비전)로만 잡히던 스킬은 효과로 아이콘을 다시 고릅니다. 전에는 패시브 176개가 모두 보석, 액티브 43개가 산 · 반짝이로 겹쳤습니다.
 * 패시브: 가장 먼저 적힌 능력치(bonus → 핵심 → 횟수 비례 → 능력치 수련) · 지원 효과. 액티브: 궁극기 · 각성 · 상태이상 · 자기 버프 · 추가타 · 관통 · 연료 순.
 */
const STAT_ICON: Record<string, LucideIcon> = {
    attack: Axe, magic: WandSparkles, hp: Heart, hpRegen: HeartPulse, defense: ShieldHalf, resist: ShieldCheck, statusResist: ShieldCheck, crit: Target, critDamage: Dices,
    mana: FlaskConical, manaRegen: FlaskRound, accuracy: Crosshair, penetration: Drill, evasion: Wind, speed: Gauge, expBonus: BookOpen, goldBonus: PiggyBank, dungeonGoldBonus: PiggyBank,
    dropBonus: Package, variantFind: Search, swarmFind: Search, goldenFind: Search, thorns: Sprout, lifesteal: Syringe, bossDamage: Crown, poisonBonus: Biohazard, dotBonus: Biohazard,
    dotTurnsBonus: Biohazard, bleedBonus: Droplet, arcaneRatioBonus: Orbit, allStats: Award, varietyBonus: Award, stunBonus: CircleSlash, healBonus: HandHeart, executeBonus: Skull,
    combatScale: TrendingUp, str: Dumbbell, dex: Feather, int: Brain, wis: Eye, vit: HeartPulse, luk: Clover,
};
const EFFECT_ICON: Partial<Record<NonNullable<Skill['effect']>, LucideIcon>> = { stun: CircleSlash, bleed: Droplet, poison: Biohazard, burn: Flame, weaken: TrendingDown, drain: Syringe, silence: VolumeX, slow: Snail, corrode: Biohazard, heal: HeartPulse };
function effectGlyph(sk: Skill): LucideIcon | null {
    if (sk.type === 'passive') {
        if (sk.support || sk.supportAmp) return Flag;
        if (sk.commandPer) return Megaphone;
        const key = [...Object.keys(sk.bonus || {}), ...Object.keys({ ...sk.core?.flat, ...sk.core?.scale }), ...(sk.perCount || []).flatMap(p => Object.keys(p.bonus)), ...Object.keys(sk.attrBonus || {})].find(k => STAT_ICON[k]);
        return key ? STAT_ICON[key] : null;
    }
    if (sk.exclusiveUltimate) return Crown;
    if (sk.awaken) return Sunrise;
    if (sk.effect && EFFECT_ICON[sk.effect]) return EFFECT_ICON[sk.effect]!;
    if (sk.selfBuff) return ArrowBigUp;
    if (sk.extraAttacks) return Layers;
    if (sk.sureHit) return Crosshair;
    if (sk.penetrationBonus) return Drill;
    if (sk.fuelCost) return Fuel;
    return null;
}
/**
 * v3.265 스킬 아이콘 색 = 계보 색. 같은 계보의 스킬은 같은 색, 같은 계열(물리 · 마법 …)의 계보끼리는 계열 색 주변(색상 ±30°)에서 갈립니다.
 * 모양은 그대로 효과(갈래)로 고릅니다. 공용 스킬 · 화면에 없는 직업의 스킬은 전처럼 갈래 색입니다.
 */
const lineageTone = new Map<string, string>();
function hueOf(hex: string) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
}
function skillTone(sk: Skill | undefined): string | undefined {
    const job = sk?.job ? jobById(sk.job) : undefined;
    if (!job) return undefined;
    const lineage = lineageOf(job);
    let tone = lineageTone.get(lineage);
    if (!tone) {
        let hash = 0;
        for (const ch of lineage) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
        const base = hueOf(JOB_TREES.find(t => t.id === job.tree)?.accent ?? '#9db3ab');
        tone = `hsl(${Math.round(base + (hash % 61) - 30)} ${62 + (hash >> 8) % 18}% ${70 + (hash >> 16) % 10}%)`;
        lineageTone.set(lineage, tone);
    }
    return tone;
}
export function SkillIcon({ id, size = 24 }: {
    id: string;
    size?: number;
}) {
    // v27.40 아이콘 이미지가 있으면 도트를 살려 그리고, 없거나 못 불러오면 기본 아이콘을 씁니다.
    const [broken, setBroken] = useState(false);
    const art = skillArtSrc(id);
    // v3.369 벡터(svg) 아이콘은 도트 확대 규칙을 빼고 매끈하게 그립니다.
    // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일(목록에 있는 것만 요청)
    if (art && !broken) return <img className={`skill-art${art.endsWith('.svg') ? ' vector' : ''}`} src={art} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setBroken(true)}/>;
    const Icon = id === 'breath' || id === 'spring' || id === 'innerBreath' ? Heart : id === 'temperedSkin' ? Shield : id === 'wave' ? Waves : id === 'focus' ? Target : id === 'anchor' ? Anchor : id === 'hook' || id === 'pierce' ? Swords : null;
    // v3.258 따로 정한 아이콘이 없으면 스킬 갈래(연출과 같은 기준)로 아이콘 · 색을 고릅니다(전에는 모두 번개).
    // v3.258 이계 무기 · 시장 기술은 id로 따로 고릅니다(갈래로는 모두 충격이 되어 구분이 안 됨).
    const own = ID_ICON.find(([re]) => re.test(id))?.[1];
    // v3.265 각성기(턴마다 판정)는 어디서든 금빛 테두리 빛으로 따로 알아보게 합니다.
    const sk = skillById(id), tone = skillTone(sk), awaken = sk?.awaken ? ' awaken' : '', style = tone ? { color: tone } : undefined;
    if (!Icon && own) return createElement(own, { size, className: `skill-glyph v-own${awaken}`, style });
    if (!Icon) {
        const v = fxVariantOf(id, sk?.damageType === 'magic'), plain = v === 'impact' || v === 'arcane';
        const Glyph = (plain && sk && effectGlyph(sk)) || (sk?.type === 'passive' && plain ? Gem : VARIANT_ICON[v] ?? Zap);
        return createElement(Glyph, { size, className: `skill-glyph v-${sk?.type === 'passive' ? 'passive' : v}${awaken}`, style });
    }
    return <Icon size={size} className={awaken ? `skill-glyph${awaken}` : undefined} style={style}/>;
}
export function SlotIcon({ slot, size = 24 }: {
    slot: string;
    size?: number;
}) { const Icon = slot === 'rod' ? Sword : slot === 'coat' ? Shield : slot === 'cape' ? Feather : Diamond; return <Icon size={size}/>; }
/** v3.93 숫자 표시: 매번 새 포매터를 만드는 toLocaleString 대신 하나를 함께 씁니다(결과는 같음). */
const KO_NUMBER = new Intl.NumberFormat('ko-KR');
export const format = (n: number) => KO_NUMBER.format(n);
/** 걸린 시간(분 버림): '2일 3시간' · '5시간 12분' · '37분'. */
export function formatDuration(ms: number) {
    const m = Math.max(0, Math.floor(ms / 60_000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d ? `${d}일 ${h % 24}시간` : h ? `${h}시간 ${m % 60}분` : `${m}분`;
}
/** 남은 시간(분 올림): '3시간 5분' · '42분'. 끝나 가도 min분 아래로는 내려가지 않습니다. */
export const formatRemaining = (ms: number, min = 1) => { const m = Math.max(min, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
/** 큰 수는 짧게(1.2만, 3.4억) 표시합니다. 정확한 값은 Num의 title(마우스 올리기·길게 누르기)로 확인합니다. */
export function short(n: number) {
    const a = Math.abs(n), f = (v: number) => KO_NUMBER.format(Math.floor(v * 10) / 10);
    return a >= 1e8 ? `${f(n / 1e8)}억` : a >= 1e4 ? `${f(n / 1e4)}만` : format(Math.floor(n));
}
/** 1초마다 갱신되는 현재 시각. 렌더 중 Date.now()를 직접 부르지 않기 위한 훅입니다. */
export function useNow(ms = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(timer); }, [ms]);
    return now;
}
