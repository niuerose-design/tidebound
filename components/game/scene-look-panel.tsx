'use client';
import { useRef, useState } from 'react';
import type { State } from '@/game/types';
import { jobById } from '@/game/data/classes';
import { dungeonById, stageById } from '@/game/data/world';
import { SceneBackdrop, backdropTheme, type BackdropTheme } from './art';
import { MyHero } from './scene-stage';
import { BACKDROP_LABELS, HERO_LABELS, WEAPON_LABELS, setHeroImage, setSceneLook, useHeroImage, useSceneLook, type HeroKindId, type WeaponId } from './scene-look-setting';

/** v3.268 설정 › 전투 장면 꾸미기: 배경 · 캐릭터 모양 · 무기 · 직접 올린 그림(이 기기에만 저장)과 작은 미리보기. */
export function SceneLookSettings({ s }: { s: State | null }) {
    const look = useSceneLook(), image = useHeroImage(), file = useRef<HTMLInputElement>(null), [error, setError] = useState('');
    const st = s ? stageById(s.stage) : undefined, d = s ? dungeonById(s.dungeon?.id) : undefined;
    const auto = backdropTheme(d ? d.name : st?.region, st?.name), job = s ? jobById(s.job) : undefined;
    const upload = async (f: File | null | undefined) => { if (!f) return; setError(await setHeroImage(f) ?? ''); if (file.current) file.current.value = ''; };
    return <div className="setting-toggle scene-look-setting">
        <div>
            <strong>전투 장면 꾸미기</strong>
            <p>전투 장면의 배경과 내 캐릭터 모습을 고릅니다. ‘자동’은 지금처럼 사냥터 · 직업으로 고릅니다. 그림을 올리면 캐릭터 대신 그 그림이 서고(160×220 안으로 줄여 저장), 이 기기에만 저장됩니다.</p>
            <div className="scene-look-grid">
                <label>배경<select value={look.backdrop} onChange={e => setSceneLook({ backdrop: e.target.value as BackdropTheme | 'auto' })}>
                    <option value="auto">자동 · 사냥터별 (지금: {BACKDROP_LABELS[auto]})</option>
                    {(Object.keys(BACKDROP_LABELS) as BackdropTheme[]).map(t => <option key={t} value={t}>{BACKDROP_LABELS[t]}</option>)}
                </select></label>
                <label>캐릭터 모양<select value={look.hero} disabled={!!image} onChange={e => setSceneLook({ hero: e.target.value as HeroKindId | 'auto' })}>
                    <option value="auto">자동 · 직업별</option>
                    {(Object.keys(HERO_LABELS) as HeroKindId[]).map(k => <option key={k} value={k}>{HERO_LABELS[k]}</option>)}
                </select></label>
                <label>무기<select value={look.weapon} disabled={!!image} onChange={e => setSceneLook({ weapon: e.target.value as WeaponId | 'auto' })}>
                    <option value="auto">자동 · 직업별</option>
                    {(Object.keys(WEAPON_LABELS) as WeaponId[]).map(w => <option key={w} value={w}>{WEAPON_LABELS[w]}</option>)}
                </select></label>
                <div className="scene-look-image">
                    <span>내 그림</span>
                    <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={e => upload(e.target.files?.[0])}/>
                    <div className="button-row"><button type="button" className="secondary" onClick={() => file.current?.click()}>{image ? '바꾸기' : '그림 올리기'}</button>{image && <button type="button" className="text-button" onClick={() => { setHeroImage(null); setError(''); }}>지우기</button>}</div>
                </div>
            </div>
            {error && <p className="scene-look-error" role="alert">{error}</p>}
            <p className="footnote">요원 · 트레이더 · 해커 · 광부 · 포식자 · 두건 신비가 모양은 전용 그림이라 무기를 고르지 않습니다.</p>
        </div>
        <div className="scene-look-preview battle-scene" aria-label="미리보기">
            <SceneBackdrop theme={look.backdrop === 'auto' ? auto : look.backdrop} fixed/>
            {s && <div className="scene-look-hero"><MyHero s={s} job={job}/></div>}
        </div>
    </div>;
}
