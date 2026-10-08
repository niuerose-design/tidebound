'use client';
/**
 * v3.172 연출 실험실(개발 전용): 사냥터를 돌리지 않고 가상의 몹 카드 위에 스킬 연출을 바로 띄웁니다.
 * 주소: /fx-lab?skill=<스킬 id>&every=<밀리초>&glow=on|off&tier=5
 * 운영 빌드(production)에서는 404입니다. 연출 제작 · 녹화용이라 게임 규칙 · 저장과는 무관합니다.
 */
import { Suspense, useEffect, useMemo, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { SKILLS, skillById } from '@/game/data/skills';
import { jobById } from '@/game/data/classes';
import { fxVariantOf, type CombatFx, type CombatFxKind } from '@/game/systems/combat-feedback';
import { CombatFxOverlay, SceneFx } from '@/components/game/combat-fx';

const KIND_BY_EFFECT: Record<string, CombatFxKind> = { stun: 'stun', bleed: 'bleed', poison: 'poison', burn: 'burn', silence: 'silence', slow: 'slow', haste: 'haste', heal: 'heal', weaken: 'weaken', corrode: 'corrode' };

export default function FxLab() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <Suspense fallback={null}><FxLabInner/></Suspense>;
}
function FxLabInner() {
    const params = useSearchParams();
    const skillId = params.get('skill') || 'infiniteChant', every = Math.max(800, Number(params.get('every')) || 4000), glow = params.get('glow') !== 'off';
    const sk = skillById(skillId);
    const [seq, setSeq] = useState(0);
    useEffect(() => { document.documentElement.classList.toggle('fx-no-glow', !glow); return () => document.documentElement.classList.remove('fx-no-glow'); }, [glow]);
    useEffect(() => { const t = setInterval(() => setSeq(n => n + 1), every); return () => clearInterval(t); }, [every]);
    const effect = useMemo<CombatFx[]>(() => {
        if (!sk || !seq) return [];
        const magical = sk.damageType === 'magic', effectName = sk.effect && sk.effect !== 'haste' ? sk.effect : undefined;
        const kind: CombatFxKind = effectName && KIND_BY_EFFECT[effectName] ? KIND_BY_EFFECT[effectName] : (sk.damageType ?? 'physical');
        const hits = Array.from({ length: 1 + Math.min(4, sk.extraAttacks || 0) }, (_, i) => ({ value: Math.round(48_000 * (i ? .55 : 1)), critical: i === 0, miss: false }));
        return [{ id: seq, actor: 'player', target: 'enemy', title: sk.name, kind, variant: fxVariantOf(sk.id, magical, sk.effect), basic: false, critical: true, healing: sk.effect === 'heal' ? 12_000 : 0, drained: 0, status: '',
            damageType: sk.damageType ?? 'physical', hits, delay: 0, skillId: sk.id, tier: Number(params.get('tier')) || jobById(sk.job)?.tier || 5 }];
    }, [sk, seq, params]);
    const job = sk && jobById(sk.job);
    return <main className="fx-lab" style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px', color: '#dfe7e3' }}>
        <h1 style={{ fontSize: 18, margin: '0 0 6px' }}>연출 실험실 · {sk ? `${sk.name} (${job?.name ?? '공용'})` : `알 수 없는 스킬 ${skillId}`}</h1>
        <p className="footnote" style={{ margin: '0 0 14px' }}>{every / 1000}초마다 발동 · 섬광 {glow ? '켜짐' : '꺼짐'} · 스킬 id: {SKILLS.filter(s => s.awaken).map(s => s.id).slice(0, 40).join(' ')}</p>
        <div className="battle-console" style={{ display: 'block' }}>
            <div className="battle-opponent-strip battle-fx-host">
                <CombatFxOverlay effect={effect}/>
                <div className="opponent-card player-opponent"><span className="eyebrow">MY CHARACTER</span><div className="combatant-name"><strong>실험 모험가</strong></div><div className="meter"><i style={{ width: '100%' }}/></div></div>
                <div style={{ display: 'grid', placeItems: 'center', color: '#8fab9f' }}>VS</div>
                <div className="opponent-card"><span className="eyebrow">CURRENT TARGET</span><div className="combatant-name"><strong>가상의 몹</strong></div><div className="meter"><i style={{ width: '64%' }}/></div></div>
            </div>
            <section className="battle-scene running" style={{ position: 'relative', isolation: 'isolate', height: 270, overflow: 'hidden', borderRadius: 12, border: '1px solid #2c4348' }}>
                {/* 실제 화면처럼 연출층(z-index -1)이 배경 위 · 몹 아래에 오도록 배경을 -2로 둡니다. */}
                <div className="ocean-art" style={{ position: 'absolute', inset: 0, zIndex: -2, background: 'linear-gradient(180deg,#132a3a 0%,#0d1f2b 55%,#0a1418 100%)' }}/>
                <div className="scene-shade"/>
                <div aria-hidden style={{ position: 'absolute', left: '62%', top: '48%', width: 96, height: 96, translate: '-50% -50%', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%,#e8f0ea,#7f9a90 70%,#3c5a55)', boxShadow: '0 10px 24px #0008', display: 'grid', placeItems: 'center', fontSize: 34 }}>👾</div>
                <SceneFx effect={effect}/>
            </section>
        </div>
    </main>;
}
