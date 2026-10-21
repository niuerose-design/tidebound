// 코프룰루 구역 몬스터 80종(칠흑 4 포함)의 그림 명세. 한 종마다 몸체 원형 · 팔레트 · 고유 장식을 따로 정합니다.
import * as A from './archetypes.mjs';
import { svg, blur, glow, spark, star, circle, path, ink, puff, crystal, shadow } from './lib.mjs';

/** 지역 팔레트. base(몸) · dark(그늘) · light(밝은 면) · ink(먹선) · glow(빛) · eye(눈) · accent(포인트). */
export const PAL = {
    steel: { base: '#6f7a86', dark: '#3d4652', light: '#a9b4c0', ink: '#1b2027', glow: '#6ee7f0', eye: '#8ff6ff', accent: '#b4552f' },
    rust: { base: '#9a5a3a', dark: '#5a3220', light: '#c98a5f', ink: '#231410', glow: '#ffb347', eye: '#ffd27a', accent: '#5f6b76' },
    ghostSteel: { base: '#7c8fa6', dark: '#3b4a5e', light: '#c3d2e6', ink: '#1a2230', glow: '#9ad7ff', eye: '#d7f3ff', accent: '#4b5a6b' },
    crystal: { base: '#8b5cf6', dark: '#4c2a9a', light: '#d8c7ff', ink: '#1e1038', glow: '#c4b5fd', eye: '#f0e7ff', accent: '#b794ff' },
    rock: { base: '#a16a2f', dark: '#5a3a15', light: '#d9a460', ink: '#2a1a08', glow: '#facc15', eye: '#ffe27a', accent: '#8b5cf6' },
    gas: { base: '#b9a325', dark: '#6f5f10', light: '#f0e36a', ink: '#2b2508', glow: '#fde047', eye: '#fff5a0', accent: '#7c6f1e' },
    ember: { base: '#b3461f', dark: '#5e1f0a', light: '#f08a4b', ink: '#2a0d04', glow: '#ffb020', eye: '#ffe08a', accent: '#f5e76b' },
    flesh: { base: '#8a3f5e', dark: '#4a1a30', light: '#c7779a', ink: '#1f0a14', glow: '#a3e635', eye: '#c6ff5a', accent: '#5b1d2e' },
    bile: { base: '#6f9b1c', dark: '#3b5a0c', light: '#b6e05a', ink: '#14200a', glow: '#d9f99d', eye: '#f0ffb0', accent: '#8a3f5e' },
    bone: { base: '#d9c9a8', dark: '#8a7658', light: '#f3ead6', ink: '#2a2016', glow: '#a3e635', eye: '#9ef01a', accent: '#8a3f5e' },
    blackHive: { base: '#2f1b2e', dark: '#140a14', light: '#5a3d5c', ink: '#070308', glow: '#84cc16', eye: '#b6ff3a', accent: '#8a3f5e' },
    light: { base: '#f3dcab', dark: '#b8923f', light: '#fff7dd', ink: '#3a2a10', glow: '#ffe9a0', eye: '#ffffff', accent: '#7f8fd8' },
    void: { base: '#2b2358', dark: '#120c2a', light: '#5b4d9e', ink: '#07040f', glow: '#9f7aea', eye: '#e9d5ff', accent: '#f5deb3' },
    marble: { base: '#c9d3e6', dark: '#7a879f', light: '#f0f4fb', ink: '#232a3a', glow: '#ffe9a0', eye: '#ffd166', accent: '#b8923f' },
    shade: { base: '#1e1a2e', dark: '#0b0914', light: '#3f3760', ink: '#040308', glow: '#ffd166', eye: '#ffe08a', accent: '#f5deb3' },
    onyx: { base: '#1f1626', dark: '#0b0710', light: '#4a3a58', ink: '#050308', glow: '#b05fc0', eye: '#f2b8ff', accent: '#d4af37' },
};
const P = (name, over = {}) => ({ ...PAL[name], ...over });

// kind: archetypes.mjs의 함수 이름. o: 옵션. extra: 그 종만의 추가 장식(SVG 조각). boss: 금빛 고리.
export const MONSTERS = [
    // ── 잿빛 궤도: 폐기된 격납고 ──
    { id: 'aoScrapDrone', kind: 'drone', pal: P('steel'), o: { rust: true, antenna: true } },
    { id: 'aoRustSentry', kind: 'mech', pal: P('rust'), o: { rust: true, lamp: true } },
    { id: 'aoHangarSpore', kind: 'spore', pal: P('steel', { base: '#5e6f6b', light: '#9fb3ad', glow: '#8be9c4', eye: '#a7ffdc' }), o: { root: true } },
    { id: 'aoDriftJelly', kind: 'jelly', pal: P('ghostSteel', { base: '#5fa8c9', light: '#bfe8ff' }), o: { tentacles: 5, spark: true } },
    { id: 'aoCargoSpider', kind: 'spider', pal: P('steel', { base: '#55606c', accent: '#f59e0b' }), o: { thread: true, mark: true } },
    { id: 'aoWeldHound', kind: 'hound', pal: P('rust', { glow: '#ff7a1a' }), o: { fire: true }, extra: (p) => path('M92 64q6 -2 10 2', 'none', ink(p.glow, 3)) },
    { id: 'aoCoreLeech', kind: 'worm', pal: P('steel', { base: '#4b5563', light: '#7dd3fc', glow: '#7dd3fc' }), o: { suction: true, eyes: true }, extra: (p) => `${glow(88, 58, 14, p.glow, .4)}${path('M30 106q10 -4 20 2', 'none', ink(p.glow, 2) + ' opacity=".7"')}` },
    { id: 'aoBlackBoxWarden', kind: 'statue', pal: P('steel', { base: '#2f3640', light: '#5c6673', accent: '#f97316', glow: '#f97316', eye: '#ffb86b' }), o: { gears: true }, extra: (p) => `${path('M56 66h16v16h-16z', p.ink)}${circle(64, 74, 3, p.glow)}` },
    { id: 'aoGhostDrone', kind: 'drone', pal: P('ghostSteel'), o: { ghost: true }, extra: (p) => `${glow(64, 64, 34, p.glow, .25)}${circle(64, 64, 40, 'none', ink(p.glow, 1) + ' opacity=".5" stroke-dasharray="3 7"')}` },
    // ── 잿빛 궤도: 갈라진 갑판 ──
    { id: 'aoDeckWraith', kind: 'wraith', pal: P('ghostSteel'), o: { cap: true, mouth: true } },
    { id: 'aoStarMoth', kind: 'moth', pal: P('steel', { base: '#5b6b9a', dark: '#36406a', light: '#dfe7ff', glow: '#fff1a8', eye: '#fff' }), o: { glowWings: true }, extra: (p) => [[20, 30], [108, 26], [16, 96]].map(([x, y]) => star(x, y, 4, 4, p.glow)).join('') },
    { id: 'aoPatrolUnit', kind: 'unit', pal: P('steel', { accent: '#f59e0b' }), o: {}, extra: (p) => path('M54 82h20', 'none', ink(p.accent, 2.5) + ' stroke-dasharray="4 3"') },
    { id: 'aoHullBarnacle', kind: 'barnacle', pal: P('steel', { base: '#8b7f72', light: '#c9bcae', glow: '#6ee7f0' }), o: { rivets: true } },
    { id: 'aoRiftLurker', kind: 'kraken', pal: P('void', { base: '#3a2f6b', glow: '#6ee7f0' }), o: { eyes: true }, extra: (p) => path('M10 40l30 10M118 40l-30 10', 'none', ink(p.glow, 1.5) + ' opacity=".5"') },
    { id: 'aoSignalEel', kind: 'serpent', pal: P('steel', { base: '#3b82f6', dark: '#1e3a8a', light: '#93c5fd', glow: '#fef08a', eye: '#fef9c3', accent: '#fef08a' }), o: { spark: true } },
    { id: 'aoVoidCrab', kind: 'crab', pal: P('void', { base: '#352c66', light: '#7c6fcf' }), o: { void: true, shell: true } },
    { id: 'aoStarEater', kind: 'drake', pal: P('shade', { base: '#2a2440', light: '#4b4370', glow: '#fff1a8', eye: '#fff' }), o: { stars: true, dark: true } },
    { id: 'aoEclipseMoth', kind: 'moth', pal: P('shade', { base: '#1b1830', dark: '#0d0b1a', light: '#5b5480', glow: '#f59e0b', eye: '#fcd34d' }), o: { dark: true }, extra: (p) => `${circle(64, 20, 9, p.ink)}${path('M64 11a9 9 0 0 1 0 18', 'none', ink(p.glow, 2))}` },
    // ── 잿빛 궤도: 던전 · 보스 ──
    { id: 'aoBridgeGuard', kind: 'mech', pal: P('steel', { base: '#5a6573', light: '#95a2b1' }), o: { lamp: true }, extra: (p) => path('M46 58h36l-2 6h-32z', p.accent, 'opacity=".8"') },
    { id: 'aoRustAdmiral', kind: 'clockwork', pal: P('rust', { base: '#6b4a3a', dark: '#3b2418', light: '#d9b48f', eye: '#ffd27a', glow: '#ffb347' }), o: { figure: true, cap: true, rust: true, reverse: true }, boss: true },
    { id: 'onyxVesper', kind: 'vesper', pal: P('onyx'), o: {}, boss: true },
    // ── 광맥 황야: 결정 채굴장 ──
    { id: 'vwShardBeetle', kind: 'beetle', pal: P('crystal', { base: '#6d4bc4', accent: '#d8c7ff' }), o: { crystals: true } },
    { id: 'vwDigger', kind: 'mech', pal: P('rock', { base: '#8c6a3a', light: '#c9a46a', glow: '#fde047', eye: '#ffe27a' }), o: { drill: true, lamp: true } },
    { id: 'vwDustWing', kind: 'moth', pal: P('crystal', { base: '#a78bfa', dark: '#6d4bc4', light: '#ede9fe' }), o: {}, extra: (p) => [[24, 90], [36, 104], [96, 96], [108, 84], [64, 110]].map(([x, y]) => circle(x, y, 2, p.light, 'opacity=".8"')).join('') },
    { id: 'vwQuarryWorm', kind: 'worm', pal: P('rock', { base: '#8c5a2b', accent: '#d8c7ff' }), o: { crystal: true } },
    { id: 'vwPrismLizard', kind: 'lizard', pal: P('crystal', { base: '#5b4a8a', light: '#c4b5fd' }), o: { prism: true, heat: true } },
    { id: 'vwOreGolem', kind: 'golem', pal: P('rock'), o: { crystals: true } },
    { id: 'vwVeinSpirit', kind: 'wisp', pal: P('crystal', { base: '#7c3aed', light: '#e9d5ff' }), o: { halo: true, stars: true }, extra: (p) => `${crystal(20, 110, 12, 18, p.base, '#fff', p.ink)}${crystal(98, 112, 14, 22, p.base, '#fff', p.ink)}` },
    { id: 'vwCrystalTitan', kind: 'golem', pal: P('crystal', { base: '#5b3fa8', dark: '#33206b', light: '#b9a3ff', accent: '#e9d5ff' }), o: { crystals: true, cracks: true, scale: 1.1 } },
    { id: 'vwHollowShard', kind: 'statue', pal: P('crystal', { base: '#3b2a6b', light: '#8b73d6', glow: '#c4b5fd' }), o: { cracked: true, crystals: true }, extra: (p) => `${path('M52 64h24v24h-24z', p.ink, 'opacity=".75"')}${circle(64, 76, 4, p.glow)}` },
    // ── 광맥 황야: 가스 분화구 ──
    { id: 'vwGasToad', kind: 'toad', pal: P('gas', { base: '#9aa33a', light: '#e1ea7a' }), o: { bloat: true, warts: true, legs: true, gas: true } },
    { id: 'vwStingWisp', kind: 'wisp', pal: P('gas', { base: '#8b8a2a', light: '#f0e36a' }), o: { sting: true }, extra: (p) => `${puff(24, 40, 9, p.glow, .4)}${puff(104, 44, 8, p.glow, .4)}` },
    { id: 'vwSulfurCrab', kind: 'crab', pal: P('gas', { base: '#c9a227', light: '#f5e76b', dark: '#7a5c0f' }), o: { smoke: true, shell: true } },
    { id: 'vwPipeKeeper', kind: 'mech', pal: P('rust', { base: '#7a6a4a', light: '#b3a07a', glow: '#fde047', eye: '#fff5a0' }), o: { lamp: true }, extra: (p) => `${path('M14 70h14v6h-14zM100 70h14v6h-14z', p.dark, ink(p.ink, 2))}${circle(21, 60, 6, p.light, ink(p.ink, 2))}${path('M21 54v12M15 60h12', 'none', ink(p.ink, 2))}${puff(110, 54, 6, p.glow, .5)}` },
    { id: 'vwBloatHound', kind: 'hound', pal: P('gas', { base: '#8f9a3a', light: '#d6e07a', glow: '#fde047' }), o: { bloat: true, drool: true } },
    { id: 'vwCinderWasp', kind: 'wasp', pal: P('ember', { glow: '#ffb020' }), o: { flame: true } },
    { id: 'vwFumeSerpent', kind: 'serpent', pal: P('gas', { base: '#7f7a2a', light: '#d6cf6a', glow: '#e9e27a', accent: '#f0e36a' }), o: { smoke: true, stripes: true } },
    { id: 'vwCalderaMaw', kind: 'drake', pal: P('ember', { base: '#7a2a12', light: '#d35a2a' }), o: { fire: true, crown: true } },
    { id: 'vwYellowTitan', kind: 'golem', pal: P('gas', { base: '#a9a040', dark: '#6b6218', light: '#e6e07a', accent: '#f5e76b' }), o: { gas: true, scale: 1.12 } },
    { id: 'onyxHalder', kind: 'halder', pal: P('onyx', { accent: '#c4b5fd', glow: '#a78bfa' }), o: {}, boss: true },
    // ── 군체 늪지: 산란 늪 ──
    { id: 'hmLarva', kind: 'larva', pal: P('flesh', { base: '#b06a8a', light: '#e0a4c0' }), o: { spots: true } },
    { id: 'hmMarshSlider', kind: 'kraken', pal: P('bile', { base: '#5f8a1c' }), o: { slime: true, eyes: true } },
    { id: 'hmAcidHound', kind: 'hound', pal: P('flesh'), o: { spines: true, drool: true } },
    { id: 'hmEggSac', kind: 'eggsac', pal: P('bone', { base: '#e5d2b0' }), o: { embryo: true, crack: true } },
    { id: 'hmSpineCrawler', kind: 'crab', pal: P('flesh', { base: '#7a3350', light: '#b06a8a' }), o: { spiky: true } },
    { id: 'hmBroodWatcher', kind: 'eyeball', pal: P('flesh', { base: '#7a9b1c', white: '#f3ecf0' }), o: { tendrils: true, lids: true, r: 26 } },
    { id: 'hmSpawner', kind: 'slime', pal: P('flesh', { base: '#9a4a6e', light: '#d08aae' }), o: { mouth: true, spawn: true } },
    { id: 'hmMarshTyrant', kind: 'broodmother', pal: P('flesh', { base: '#6b2a44', light: '#c08a9f', accent: '#b6e05a' }), o: { crown: true, tentacles: true } },
    { id: 'hmBlackLarva', kind: 'larva', pal: P('blackHive'), o: { speed: true } },
    // ── 군체 늪지: 신경 회랑 ──
    { id: 'hmNerveRunner', kind: 'hound', pal: P('flesh', { base: '#a84a7a', glow: '#fef08a' }), o: { spark: true } },
    { id: 'hmSpinePillar', kind: 'pillar', pal: P('bone'), o: { pulse: true } },
    { id: 'hmMindEye', kind: 'eyeball', pal: P('flesh', { base: '#c026d3', glow: '#e879f9' }), o: { tendrils: true, rings: true, r: 28 } },
    { id: 'hmPlateBrute', kind: 'golem', pal: P('flesh', { base: '#6b3a4a', light: '#9a6a7a', accent: '#8a7658' }), o: {}, extra: (p) => path('M42 46l44 -4l6 10l-52 6zM40 60l50 -4l4 10l-56 6z', p.accent, ink(p.ink, 2)) },
    { id: 'hmSynapseHound', kind: 'hound', pal: P('flesh', { base: '#5b4a8a', light: '#9a8acb', glow: '#fef08a' }), o: { spark: true, spines: true } },
    { id: 'hmVeinLeech', kind: 'worm', pal: P('flesh', { base: '#8a2a3a', light: '#c2546a' }), o: { suction: true } },
    { id: 'hmOverseer', kind: 'overlord', pal: P('flesh'), o: { aura: true } },
    { id: 'hmCorridorKing', kind: 'overlord', pal: P('flesh', { base: '#5a1f3a', light: '#8a4a66', accent: '#d9f99d' }), o: { crown: true, wings: true, aura: true } },
    { id: 'hmPaleOverseer', kind: 'overlord', pal: P('bone', { base: '#cdbfa8', dark: '#8a7658', light: '#f3ead6', glow: '#a78bfa', eye: '#c4b5fd' }), o: { pale: true, aura: true } },
    // ── 군체 늪지: 던전 · 보스 ──
    { id: 'hmMuscleWall', kind: 'wall', pal: P('flesh', { base: '#8a2a3a', dark: '#4a1020', light: '#c2546a', accent: '#d92a4a', glow: '#ff6b7a' }), o: { heal: true } },
    { id: 'hmHiveMother', kind: 'broodmother', pal: P('flesh', { base: '#5a1f3a', dark: '#2e0a1c', light: '#b06a8a', accent: '#a3e635' }), o: { crown: true, tentacles: true, aura: true }, boss: true },
    { id: 'onyxMirren', kind: 'mirren', pal: P('onyx', { base: '#7a2a86', glow: '#b05fc0', accent: '#b3001b' }), o: {}, boss: true },
    // ── 고요한 성단: 빛의 첨탑 ──
    { id: 'scLightWeaver', kind: 'weaver', pal: P('light'), o: { threads: true, faceless: true } },
    { id: 'scGlimmer', kind: 'wisp', pal: P('light', { base: '#fde68a', light: '#fff' }), o: { stars: true }, extra: (p) => `${circle(26, 100, 6, p.base, ink(p.ink, 2))}${circle(104, 96, 5, p.base, ink(p.ink, 2))}` },
    { id: 'scMemoryLens', kind: 'eyeball', pal: P('light', { base: '#60a5fa', glow: '#bfdbfe', white: '#eef4ff', accent: '#93c5fd' }), o: { rings: true, r: 28 }, extra: (p) => `${circle(64, 68, 40, 'none', ink(p.accent, 3))}${path('M30 44l-8 -8M98 44l8 -8', 'none', ink(p.accent, 3))}` },
    { id: 'scStairStatue', kind: 'statue', pal: P('marble'), o: { crystals: true } },
    { id: 'scPrismGuard', kind: 'guardian', pal: P('marble', { glow: '#ff9fb0' }), o: { prism: true } },
    { id: 'scHaloWisp', kind: 'wraith', pal: P('light', { base: '#fff1c2', glow: '#ff9f43' }), o: { halo: true } },
    { id: 'scShadowEater', kind: 'overlord', pal: P('shade', { glow: '#ffd166' }), o: { wings: true }, extra: () => glow(64, 74, 46, '#000', .5) },
    { id: 'scSpireKeeper', kind: 'guardian', pal: P('light', { base: '#e6c56a', dark: '#9a7a2a', light: '#fff2c8', glow: '#fff1a8' }), o: { plume: true }, extra: (p) => path('M100 30v76M92 30l8 -12l8 12z', 'none', ink(p.dark, 3)) },
    { id: 'scDawnWeaver', kind: 'weaver', pal: P('light', { base: '#f7c59f', dark: '#d97706', glow: '#fff7ae' }), o: { threads: true, faceless: true, dawn: true } },
    // ── 고요한 성단: 공허 회랑 ──
    { id: 'scUnsealed', kind: 'unit', pal: P('marble', { base: '#8a94ad', light: '#d7deee', glow: '#f87171', eye: '#fecaca' }), o: { sealed: true } },
    { id: 'scVoidJelly', kind: 'jelly', pal: P('void'), o: { tentacles: 6, void: true } },
    { id: 'scDimStatue', kind: 'statue', pal: P('void', { base: '#1c1733', light: '#3a3160', glow: '#9f7aea', eye: '#2b2358' }), o: { dim: true, cracked: true } },
    { id: 'scReverser', kind: 'clockwork', pal: P('void', { light: '#c7bdf5' }), o: { figure: true, reverse: true } },
    { id: 'scHollowSentinel', kind: 'hollow', pal: P('void', { base: '#4b4477', light: '#8d84bf' }), o: { wind: true } },
    { id: 'scGravityMaw', kind: 'kraken', pal: P('void', { base: '#1f1a3d', light: '#8d84bf' }), o: { gravity: true } },
    { id: 'scEchoOfEnd', kind: 'wraith', pal: P('void', { base: '#3b3270', glow: '#c4b5fd' }), o: { rings: true } },
    { id: 'scLastWarden', kind: 'statue', pal: P('marble', { base: '#9aa6c2', accent: '#ffd166', glow: '#ffd166' }), o: { crown: true, crystals: true }, extra: (p) => `${path('M20 112v-70q22 -16 44 -16t44 16v70', 'none', ink(p.dark, 3))}${path('M20 60h88', 'none', ink(p.dark, 2) + ' opacity=".6"')}` },
    { id: 'scStillReverser', kind: 'clockwork', pal: P('marble', { base: '#8fa3c7', dark: '#4e5f80', glow: '#bfdbfe', eye: '#dbeafe' }), o: { figure: true, frozen: true } },
    { id: 'onyxSolenne', kind: 'solenne', pal: P('onyx', { glow: '#ffe9a0', accent: '#d4af37' }), o: {}, boss: true },
];

export const renderMonster = (m) => {
    const draw = A[m.kind];
    if (!draw) throw new Error(`unknown kind ${m.kind} (${m.id})`);
    const ring = m.boss ? `${circle(64, 70, 58, 'none', ink('#d4af37', 1.5) + ' opacity=".55"')}${[[64, 12], [122, 70], [64, 128], [6, 70]].map(([x, y]) => spark(x, y, 4, '#ffe9a0', .9)).join('')}` : '';
    return svg(128, `${shadow(64, 112, 34)}${ring}${draw(m.pal, m.o || {})}${m.extra ? m.extra(m.pal) : ''}`, blur('gl', 3));
};
