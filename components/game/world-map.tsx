'use client';
/**
 * v3.368 사냥터 월드맵: 사냥터 화면 위에 그린 SVG 지도. 메이플 월드(판게아 대륙, 바다)와 코프룰루 구역(별의 바다) 두 장을 탭으로 나눠 보여 주고,
 * 지역마다 사냥터 · 무리 서식지 점을 찍어 점을 고르면 아래 안내 줄에서 바로 입장합니다. 그림은 원작 그림을 쓰지 않고 지역 분위기를 실루엣으로 그렸습니다.
 * 잠긴 곳(레벨 · 환생 · 점검 · 던전 탐험 중)은 흐리게 보이고 안내 줄에 이유가 뜹니다. 지도 좌표는 480×300 기준이고 화면 폭에 맞춰 줄어듭니다.
 */
import { useState, type ReactNode } from 'react';
import { Lock, MapPin, Sparkles } from 'lucide-react';
import { STAGES, REGIONS, closedIn, CLOSED_NOTE } from '@/game/data/world';
import { levelGateOk } from '@/game/systems/meta';
import { onyxBossFor } from '@/game/data/onyx';
import type { PanelProps } from './panel-props';

type WorldId = 'maple' | 'koprulu';
const WORLD_INFO: Record<WorldId, { name: string; sub: string; accent: string; note: string }> = {
    maple: { name: '메이플 월드', sub: 'PANGAEA · MAPLE WORLD', accent: '#e0a24f', note: '리스항구 선착장에서 시작해 아케인 리버까지 이어지는 판게아의 땅.' },
    koprulu: { name: '코프룰루 구역', sub: 'STAR SEA · KOPRULU SECTOR', accent: '#a784c9', note: '바다 위의 바다. 환생 50회를 넘긴 모험가만 하늘로 난 문을 지난다.' },
};
const KOPRULU_REGIONS = new Set(['잿빛 궤도', '광맥 황야', '군체 늪지', '고요한 성단']);
export const worldOfRegion = (region: string): WorldId => KOPRULU_REGIONS.has(region) ? 'koprulu' : 'maple';
/** 지역 중심 좌표(480×300). 메이플은 아래줄 왼→오, 윗줄 오→왼으로 굽이치는 길. 코프룰루는 별 사이를 오르는 대각선. */
const LAYOUT: Record<string, [number, number]> = {
    '리스항구': [58, 236], '헤네시스': [150, 222], '페리온': [242, 240], '엘리니아': [330, 212], '커닝시티': [418, 236],
    '아케인 리버': [60, 104], '시간의 신전': [160, 92], '리프레': [258, 110], '아쿠아로드': [360, 118],
    '잿빛 궤도': [86, 224], '광맥 황야': [196, 166], '군체 늪지': [300, 214], '고요한 성단': [404, 92],
};
/** 지역 안의 점 자리: 일반 사냥터는 아래 양옆, 무리 서식지는 위. */
const SLOT: [number, number][] = [[-20, 16], [20, 16], [0, 36]];
const HAB: [number, number] = [0, -14];

const Sea = () => <>
    <defs><linearGradient id="wm-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d2a36"/><stop offset="1" stopColor="#0a1a22"/></linearGradient>
        <linearGradient id="wm-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#24433a"/><stop offset="1" stopColor="#15302c"/></linearGradient></defs>
    <rect width="480" height="300" rx="10" fill="url(#wm-sea)"/>
    {[40, 90, 140, 190, 240, 290].map(y => <path key={y} d={`M0 ${y}c60-6 120 6 180 0s120-6 180 0 90 4 120 0`} stroke="#9fd8ff" strokeWidth=".8" fill="none" opacity=".12"/>)}
    {/* 판게아 대륙: 아래쪽 큰 땅과 위쪽 섬들 */}
    <path d="M18 262c20-26 60-30 96-24 40 6 70-14 118-12 46 2 70-22 118-14 44 8 70 2 112 18v54H18z" fill="url(#wm-land)" opacity=".95"/>
    <path d="M20 134c30-30 70-36 110-28 30 6 60-22 108-18 50 4 76-20 124-6 40 12 66 2 98 20-20 34-60 42-104 36-40-6-72 10-116 8-44-2-74 16-120 12-50-6-78 0-100-24z" fill="url(#wm-land)" opacity=".8"/>
    <path d="M20 150c40-10 80 4 120 0s80-12 120-4 80 10 120 4 60-12 80-6" stroke="#5fa8a0" strokeWidth="1" fill="none" opacity=".25"/>
    <circle cx="430" cy="40" r="14" fill="#ffe2a8" opacity=".85"/><circle cx="430" cy="40" r="22" fill="#ffe2a8" opacity=".12"/>
</>;
const StarSea = () => <>
    <defs><radialGradient id="wm-space" cx=".7" cy=".2" r="1"><stop offset="0" stopColor="#1c1f44"/><stop offset=".6" stopColor="#0b0d1f"/><stop offset="1" stopColor="#05060e"/></radialGradient></defs>
    <rect width="480" height="300" rx="10" fill="url(#wm-space)"/>
    {Array.from({ length: 70 }, (_, i) => { const x = (i * 97) % 480, y = (i * 61) % 300; return <circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 1.6 : .8} fill="#e8ecff" opacity={.35 + (i % 5) * .12}/>; })}
    <path d="M0 290c80-40 140-60 200-70s120-10 180-50 70-60 100-110" stroke="#9fd8ff" strokeWidth="1" fill="none" strokeDasharray="4 6" opacity=".35"/>
    {/* 아래 끝: 바다 너머의 하늘(판게아에서 올라오는 문) */}
    <path d="M0 300V282c40-10 80-6 120 0s80 10 120 4 80-14 120-8 80 10 120 6V300z" fill="#123540" opacity=".9"/>
    <path d="M14 282v-16a8 8 0 0 1 16 0v16" stroke="#9fd8ff" strokeWidth="1.5" fill="#fff3c4" fillOpacity=".25"/>
</>;
/** 지역 실루엣(원작 없이 지형만). */
const REGION_ART: Record<string, (x: number, y: number) => ReactNode> = {
    '리스항구': (x, y) => <g fill="#0b1c22"><rect x={x - 26} y={y - 4} width="40" height="3"/>{[-22, -12, -2, 8].map(d => <rect key={d} x={x + d} y={y - 1} width="2" height="8"/>)}<path d={`M${x + 20} ${y - 2}l4-22h3l4 22z`}/><path d={`M${x + 22} ${y - 24}l-14 6M${x + 25} ${y - 24}l14 6`} stroke="#ffe7b3" strokeWidth="3" opacity=".25"/></g>,
    '헤네시스': (x, y) => <g>{[-18, 0, 16].map((d, i) => <g key={d}><rect x={x + d - 2} y={y - 8} width="4" height="8" fill="#e9dcc0"/><path d={`M${x + d - 9 - i} ${y - 8}q9-${12 + i * 2} ${18 + i * 2} 0z`} fill={['#d9774a', '#e08a52', '#c2603a'][i]}/></g>)}</g>,
    '페리온': (x, y) => <path d={`M${x - 28} ${y}l10-22 8 10 8-18 10 14 8-10 10 26z`} fill="#4a3426"/>,
    '엘리니아': (x, y) => <g fill="#1e3d2c">{[-18, -6, 8, 20].map((d, i) => <path key={d} d={`M${x + d} ${y}v-6l-5 0 7-10-4 0 6-10 6 10-4 0 7 10-5 0v6z`} opacity={.8 + (i % 2) * .2}/>)}</g>,
    '커닝시티': (x, y) => <g fill="#1a2838">{[-24, -14, -2, 10, 20].map((d, i) => <rect key={d} x={x + d} y={y - 10 - (i % 3) * 8} width="9" height={10 + (i % 3) * 8}/>)}{[-20, 0, 14].map(d => <rect key={d} x={x + d} y={y - 6} width="2" height="2" fill="#4dffb4"/>)}</g>,
    '아쿠아로드': (x, y) => <g>{[-16, -4, 10].map((d, i) => <path key={d} d={`M${x + d} ${y}c-6-8-2-16 2-18 2 6 8 10 4 18z`} fill={['#e879a6', '#4fa3c7', '#79d07a'][i]}/>)}<path d={`M${x - 24} ${y - 2}c10-4 20 4 30 0s20-4 30 0`} stroke="#9fd8ff" strokeWidth="1" fill="none" opacity=".5"/></g>,
    '리프레': (x, y) => <g><path d={`M${x - 30} ${y}l14-26 10 12 12-20 14 34z`} fill="#2f4a2a"/><path d={`M${x + 2} ${y - 20}c6-6 12-6 18 0-6-2-10 0-14 4-2-2-3-3-4-4z`} fill="#0b1c22"/></g>,
    '시간의 신전': (x, y) => <g fill="#5a4a2a">{[-18, -8, 2, 12].map(d => <rect key={d} x={x + d} y={y - 18} width="5" height="18"/>)}<rect x={x - 22} y={y - 22} width="44" height="4"/><circle cx={x} cy={y - 28} r="4" fill="#c9a85c"/></g>,
    '아케인 리버': (x, y) => <g><path d={`M${x - 30} ${y - 4}c12-12 24 8 36-4s16-10 28-2`} stroke="#8b7fd6" strokeWidth="3" fill="none" opacity=".8"/>{[-14, 4, 18].map(d => <circle key={d} cx={x + d} cy={y - 14 + (d % 2)} r="2.5" fill="#c7b8ff"/>)}</g>,
    '잿빛 궤도': (x, y) => <g><ellipse cx={x} cy={y - 10} rx="30" ry="9" fill="none" stroke="#7f8a99" strokeWidth="2" strokeDasharray="22 10"/><rect x={x - 9} y={y - 22} width="18" height="22" fill="#2a3142"/><rect x={x - 3} y={y - 30} width="6" height="8" fill="#3b4458"/><circle cx={x + 6} cy={y - 14} r="1.6" fill="#8fd0ff"/></g>,
    '광맥 황야': (x, y) => <g><circle cx={x} cy={y - 8} r="22" fill="#3a2a52"/>{[-12, 0, 10].map((d, i) => <path key={d} d={`M${x + d} ${y - 8 + i * 2}l5-12 5 12-5 10z`} fill="#d9a8ff" opacity=".9"/>)}<circle cx={x + 14} cy={y - 18} r="5" fill="#c9b24f" opacity=".7"/></g>,
    '군체 늪지': (x, y) => <g><circle cx={x} cy={y - 8} r="22" fill="#3a1f4a"/>{[[-10, -14], [8, -4], [-2, 2]].map(([dx, dy], i) => <ellipse key={i} cx={x + dx} cy={y - 8 + dy} rx={7 - i} ry={5 - i} fill="#7a3f9a"/>)}<circle cx={x + 10} cy={y - 16} r="3" fill="#ff7a9a" opacity=".8"/></g>,
    '고요한 성단': (x, y) => <g>{[[-22, -4], [22, -10], [-8, -30], [14, -26]].map(([dx, dy], i) => <circle key={i} cx={x + dx} cy={y + dy} r={1.5 + (i % 2)} fill="#fff3c4"/>)}<path d={`M${x - 6} ${y}v-26l6-8 6 8v26z`} fill="#3a3a4a"/><circle cx={x} cy={y - 36} r="4" fill="#ffe7a0"/><circle cx={x} cy={y - 36} r="9" fill="#ffe7a0" opacity=".2"/></g>,
};

export function WorldMap({ s, send, busy }: PanelProps) {
    const hereRegion = STAGES.find(st => st.id === s.stage)?.region;
    const [world, setWorld] = useState<WorldId>(() => { try { const v = localStorage.getItem('tidebound:world-map'); if (v === 'maple' || v === 'koprulu') return v; } catch { /* 저장소를 못 쓰면 현재 사냥터의 세계 */ } return hereRegion ? worldOfRegion(hereRegion) : 'maple'; });
    const [pick, setPick] = useState<string | null>(null);
    const pickWorld = (w: WorldId) => { setWorld(w); setPick(null); try { localStorage.setItem('tidebound:world-map', w); } catch { /* 이번 화면에서만 */ } };
    const inDungeon = !!s.dungeon, info = WORLD_INFO[world];
    const regions = REGIONS.filter(r => worldOfRegion(r) === world);
    const lockOf = (st: (typeof STAGES)[number]) => closedIn(s, 'stages', st.id) ? CLOSED_NOTE : inDungeon ? '던전 탐험 중' : s.rebirths < st.rebirth ? `환생 ${st.rebirth}회부터` : !levelGateOk(s, st.level) ? `Lv.${st.level}부터` : null;
    const picked = STAGES.find(st => st.id === (pick ?? s.stage));
    const pickedLock = picked ? lockOf(picked) : null;
    const route = regions.map(r => LAYOUT[r]);
    return <section className="world-map" style={{ '--world-accent': info.accent } as React.CSSProperties}>
    <div className="world-map-tabs" role="tablist" aria-label="세계">
        {(Object.keys(WORLD_INFO) as WorldId[]).map(w => <button key={w} role="tab" aria-selected={world === w} className={`world-tab ${world === w ? 'on' : ''}`} style={{ '--world-accent': WORLD_INFO[w].accent } as React.CSSProperties} onClick={() => pickWorld(w)}>
            <small>{WORLD_INFO[w].sub}</small><b>{WORLD_INFO[w].name}</b>{w === 'koprulu' && s.rebirths < 50 ? <Lock size={13}/> : hereRegion && worldOfRegion(hereRegion) === w ? <MapPin size={13}/> : null}
        </button>)}
    </div>
    <svg viewBox="0 0 480 300" className="world-map-svg" role="img" aria-label={`${info.name} 지도`}>
        {world === 'maple' ? <Sea/> : <StarSea/>}
        {/* 지역을 잇는 길 */}
        <path d={route.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y + 4}`).join(' ')} stroke={info.accent} strokeWidth="1.5" fill="none" strokeDasharray="3 5" opacity=".45"/>
        {regions.map(region => { const [x, y] = LAYOUT[region], places = STAGES.filter(st => st.region === region), base = places.filter(st => !st.habitat), hab = places.find(st => st.habitat), here = places.some(st => st.id === s.stage) && !inDungeon, onyx = onyxBossFor(region);
            return <g key={region} className={`map-region ${here ? 'here' : ''}`}>
                {REGION_ART[region]?.(x, y - 8)}
                <text x={x} y={y + 54} textAnchor="middle" className="map-label">{region}</text>
                {[...base.map((st, i) => [st, SLOT[Math.min(i, SLOT.length - 1)]] as const), ...(hab ? [[hab, HAB] as const] : [])].map(([st, [dx, dy]]) => {
                    const lock = lockOf(st), current = s.stage === st.id && !inDungeon, on = pick === st.id;
                    return <g key={st.id} className={`map-node ${lock ? 'locked' : ''} ${current ? 'current' : ''} ${on ? 'picked' : ''}`} transform={`translate(${x + dx} ${y + dy})`} onClick={() => setPick(st.id)} role="button" aria-label={`${st.name}${lock ? ` · ${lock}` : ''}`} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPick(st.id); } }}>
                        <title>{`${st.name} · Lv.${st.level}+${st.rebirth ? ` · 환생 ${st.rebirth}회` : ''}${lock ? ` · ${lock}` : ''}`}</title>
                        <circle r="17" fill="transparent"/>
                        {current && <circle r="13" className="map-pulse" fill="none" stroke={st.tone} strokeWidth="1.5"/>}
                        {st.habitat ? <path d="M0-9l8 9-8 9-8-9z" fill={st.tone} stroke="#0b1522" strokeWidth="1.2"/> : <circle r="7.5" fill={st.tone} stroke="#0b1522" strokeWidth="1.2"/>}
                        {lock ? <path d="M-2.5 1v-2a2.5 2.5 0 0 1 5 0v2M-3.5 1h7v4h-7z" fill="#0b1522" stroke="#0b1522" strokeWidth=".8"/> : current ? <circle r="2.2" fill="#0b1522"/> : null}
                        {st.habitat && onyx && !lock ? <circle cx="7" cy="-7" r="2.4" fill="#f08a6c"/> : null}
                    </g>; })}
            </g>; })}
    </svg>
    <div className="world-map-info">
        {picked ? <>
            <span className="map-dot" style={{ background: picked.tone }}/>
            <div className="map-info-text"><b>{picked.name}</b><small>Lv.{picked.level}+{picked.rebirth ? ` · 환생 ${picked.rebirth}회` : ''}{picked.habitat ? ' · 무리 서식지' : ` · 몬스터 ${picked.monsters.length}종`}{picked.habitat && onyxBossFor(picked.region) ? ` · 칠흑 ${onyxBossFor(picked.region)!.name}` : ''}{pickedLock ? ` · ${pickedLock}` : ''}</small></div>
            {picked.id === s.stage && !inDungeon ? <span className="badge">현재 사냥터</span> : <button className="small" disabled={busy || !!pickedLock} onClick={() => send({ type: 'stage', id: picked.id })}>{pickedLock ? <Lock size={13}/> : <Sparkles size={13}/>} 입장</button>}
        </> : <small className="map-info-text">{info.note} 지도의 점을 누르면 바로 들어갈 수 있습니다.</small>}
    </div>
    </section>;
}
