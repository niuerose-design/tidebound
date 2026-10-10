'use client';
/**
 * v3.173 연출 실험실(개발 전용): 사냥터를 돌리지 않고 스킬 연출을 바로 띄웁니다.
 * v3.269 지금 전투 장면과 같은 구성(같은 지면의 내 캐릭터 · 몬스터, 배경, 투사체 · 피해 숫자 · 스킬 이름)으로 다시 짰습니다.
 * 주소: /fx-lab?skill=<스킬 id>&every=<밀리초>&glow=on|off&tier=5&foe=<몬스터 id>&boss=1&hero=<모양>&bg=<배경>&w=<장면 너비>&h=<장면 높이>
 *   &execute=1(처형 연계) &charge=<중첩>(전탄발사) &reload=1 &overdrive=1(요원) &essence=<정수>&devour=<능력치>(포식) &mined=<세계석>(채굴) &pnl=<손익 -0.35~0.35>(트레이더) &crit=0
 *   &actor=foe: 보스 몬스터가 쓰는 스킬(FOE_FX)로 띄움.
 *   v3.269 &scene=<장면 이름>&title=<제목>: 전용 장면(Skill.scene)만 시험 스킬로 띄움(비밀 스킬은 화면 코드에 없으므로 이 방법으로 봄).
 * 운영 빌드(production)에서는 404입니다. 연출 제작 · 녹화용이라 게임 규칙 · 저장과는 무관합니다.
 */
import { Suspense, useEffect, useMemo, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { registerSkills, skillById } from '@/game/data/skills';
import { enemySkillById } from '@/game/data/encounters';
import { FOE_FX } from '@/game/data/foe-fx';
import { jobById } from '@/game/data/classes';
import { fxVariantOf, type CombatFx, type CombatFxKind } from '@/game/systems/combat-feedback';
import { SceneFx, FoeCleave, SceneCombatHud } from '@/components/game/combat-fx';
import { SceneBackdrop, type BackdropTheme } from '@/components/game/art';
import { CastFx, HeroFigure, SceneDamage, SceneFoe, SkillReceipt } from '@/components/game/scene-stage';
import { MONSTERS } from '@/game/data/world';
import type { State } from '@/game/types';
import type { HeroKindId } from '@/components/game/scene-look-setting';

const KIND_BY_EFFECT: Record<string, CombatFxKind> = { stun: 'stun', bleed: 'bleed', poison: 'poison', burn: 'burn', silence: 'silence', slow: 'slow', haste: 'haste', heal: 'heal', weaken: 'weaken', corrode: 'corrode' };

export default function FxLab() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <Suspense fallback={null}><FxLabInner/></Suspense>;
}
function FxLabInner() {
    const params = useSearchParams(), num = (k: string, d = 0) => Number(params.get(k)) || d;
    const skillId = params.get('skill') || 'fullAuto', every = Math.max(800, num('every', 4000)), glow = params.get('glow') !== 'off';
    const asFoe = params.get('actor') === 'foe', boss = asFoe || params.get('boss') === '1', crit = params.get('crit') !== '0';
    const scene = params.get('scene');
    if (scene && !skillById(`labScene-${scene}`)) registerSkills([{ id: `labScene-${scene}`, name: params.get('title') || scene, desc: '', type: 'active', level: 1, chance: 1, cooldown: 1, multiplier: 1, damageType: params.get('magic') === '1' ? 'magic' : 'physical', extraAttacks: num('extra'), scene }]);
    const sk = (scene ? skillById(`labScene-${scene}`) : asFoe ? enemySkillById(skillId) : undefined) ?? skillById(skillId), foeId = params.get('foe') || MONSTERS[0].id, execute = params.get('execute') === '1';
    const job = sk ? jobById(sk.job) : undefined, hero = (params.get('hero') || (job?.fuelJob ? job.trader ? 'trader' : 'agent' : sk?.essenceCost ? 'devour' : sk?.mineChance ? 'miner' : 'warrior')) as HeroKindId;
    const [seq, setSeq] = useState(0);
    useEffect(() => { document.documentElement.classList.toggle('fx-no-glow', !glow); return () => document.documentElement.classList.remove('fx-no-glow'); }, [glow]);
    const start = num('start', 300);
    useEffect(() => { const first = setTimeout(() => setSeq(1), start), t = setInterval(() => setSeq(n => n + 1), every); return () => { clearTimeout(first); clearInterval(t); }; }, [every, start]);
    // 녹화 스크립트가 발동 순간을 알 수 있게 <html data-fx-at>에 시각을 남깁니다.
    useEffect(() => { if (seq) document.documentElement.dataset.fxAt = String(Date.now()); }, [seq]);
    const effect = useMemo<CombatFx[]>(() => {
        if (!sk || !seq) return [];
        const magical = sk.damageType === 'magic', effectName = sk.effect && sk.effect !== 'haste' ? sk.effect : undefined;
        const kind: CombatFxKind = effectName && KIND_BY_EFFECT[effectName] ? KIND_BY_EFFECT[effectName] : (sk.damageType ?? 'physical');
        const hits = Array.from({ length: 1 + Math.min(5, sk.extraAttacks || 0) }, (_, i) => ({ value: Math.round(48_000 * (i ? .55 : 1)), critical: crit && i === 0, miss: false }));
        return [{ id: seq, actor: asFoe ? 'enemy' : 'player', target: asFoe ? 'player' : 'enemy', title: sk.name, kind, variant: fxVariantOf(sk.id, magical, sk.effect), basic: false, critical: crit, healing: sk.effect === 'heal' ? 12_000 : 0, drained: 0, status: '',
            damageType: sk.damageType ?? 'physical', hits, delay: 0, skillId: sk.id, tier: num('tier') || job?.tier || 5,
            ...(execute ? { execute: true } : {}), ...(num('charge') ? { charged: num('charge') } : {}), ...(params.get('reload') === '1' ? { reload: true } : {}), ...(params.get('overdrive') === '1' ? { overdrive: true } : {}),
            ...(sk.essenceCost ? { essence: num('essence', sk.essenceCost), ...(params.get('devour') ? { devour: params.get('devour')! } : {}) } : {}), ...(sk.mineChance ? { mineSwing: true, mined: num('mined', 1) } : {}) }];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 주소 값은 seq가 바뀔 때만 다시 읽으면 됩니다.
    }, [sk, seq]);
    const enemy = { id: foeId, name: '실험 몬스터', hp: execute ? 22_000 : 64_000, maxHp: 100_000, attack: 1, defense: 1, boss } as unknown as State['enemy'];
    const w = num('w', 900), h = num('h', 420);
    return <main className="fx-lab" style={{ maxWidth: Math.max(w, 360) + 32, margin: '24px auto', padding: '0 16px', color: '#dfe7e3' }}>
        <h1 style={{ fontSize: 18, margin: '0 0 6px' }}>연출 실험실 · {sk ? `${sk.name} (${asFoe ? '보스 몬스터' : job?.name ?? '공용'})` : `알 수 없는 스킬 ${skillId}`}</h1>
        <p className="footnote" style={{ margin: '0 0 14px' }}>{every / 1000}초마다 발동 · 섬광 {glow ? '켜짐' : '꺼짐'} · {asFoe ? `보스 스킬 id: ${Object.keys(FOE_FX).join(' ')}` : `장면 ${w}×${h}`}</p>
        <section className={`battle-scene running ${boss ? 'boss-lab' : ''}`} style={{ position: 'relative', width: w, height: h, overflow: 'hidden', borderRadius: 12, border: '1px solid #2c4348' }}>
            <SceneBackdrop theme={(params.get('bg') || 'village') as BackdropTheme} fixed/><div className="scene-shade"/>
            <SceneFoe enemy={enemy} hidden={false} effect={effect}/><FoeCleave effect={effect} enemy={{ id: foeId, boss }}/>
            <SceneFx effect={effect} boss={boss} pnl={num('pnl', .2)}/>
            <SceneCombatHud enemy={enemy} effect={effect} combo={null}/>
            <CastFx effect={effect} boss={boss}/><SceneDamage effect={effect}/><SkillReceipt effect={effect} boss={boss}/>
            <div className="scene-me"><div className="scene-hero"><HeroFigure kind={hero} job={job ?? { name: '', tree: 'physical' }}/></div></div>
        </section>
    </main>;
}
