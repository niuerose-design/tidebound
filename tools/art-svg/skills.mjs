// 코프룰루 직업 스킬 아이콘 60개(64×64). 계보별 바탕 + 스킬마다 따로 그린 문양. 액티브는 밝은 사선, 패시브는 안쪽 고리, 각성기는 금테.
import { svg, linear, radial, blur, path, circle, rect, line, ink, star, drop, bolt, poly, glow, spark } from './lib.mjs';

const LIN = {
    ir: { bg1: '#3b4756', bg2: '#161c23', rim: '#d88a68', fg: '#e8eef4', hi: '#ffb86b', lo: '#8fa3b8', k: '#0d1116' },
    hv: { bg1: '#36511f', bg2: '#101a0a', rim: '#b6c86a', fg: '#e6f5c8', hi: '#c6ff5a', lo: '#7fa050', k: '#0a1206' },
};
const K = (c, w = 2) => ink(c, w);
const bullet = (x, y, a, c, k, l = 14) => `<g transform="rotate(${a} ${x} ${y})">${path(`M${x - l / 2} ${y - 3}h${l - 4}l4 3l-4 3h${-l + 4}z`, c, K(k, 1.5))}</g>`;
const crosshair = (cx, cy, r, c, w = 2) => `${circle(cx, cy, r, 'none', K(c, w))}${line(cx - r - 4, cy, cx - r + 4, cy, c, w)}${line(cx + r - 4, cy, cx + r + 4, cy, c, w)}${line(cx, cy - r - 4, cx, cy - r + 4, c, w)}${line(cx, cy + r - 4, cx, cy + r + 4, c, w)}`;
const shield = (cx, cy, s, c, k) => path(`M${cx} ${cy - s}l${s * .9} ${s * .35}v${s * .6}q0 ${s * .7} ${-s * .9} ${s * 1.05}q${-s * .9} ${-s * .35} ${-s * .9} ${-s * 1.05}v${-s * .6}z`, c, K(k, 2));
const flame = (cx, cy, s, c1, c2) => `${path(`M${cx} ${cy - s}q${s * .8} ${s * .6} ${s * .5} ${s * 1.3}q${-s * .1} ${-s * .4} ${-s * .4} ${-s * .5}q${s * .1} ${s * .8} ${-s * .5} ${s * 1.1}q${-s * .9} ${-s * .5} ${-s * .5} ${-s * 1.4}q${s * .2} ${s * .3} ${s * .4} ${s * .2}q${-s * .3} ${-s * .7} ${s * .5} ${-s * 1.7}z`, c1)}${path(`M${cx} ${cy - s * .2}q${s * .4} ${s * .4} ${s * .2} ${s * .9}q${-s * .2} ${-s * .1} ${-s * .2} ${-s * .3}q0 ${s * .3} ${-s * .25} ${s * .35}q${-s * .3} ${-s * .4} ${s * .25} ${-s * .95}z`, c2)}`;
const sporeBall = (cx, cy, r, c, k, dots = 6) => `${circle(cx, cy, r, c, K(k, 2))}${Array.from({ length: dots }, (_, i) => { const a = (i / dots) * Math.PI * 2; return circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * .28, c, K(k, 1.5)); }).join('')}${circle(cx - r * .3, cy - r * .3, r * .25, '#fff', 'opacity=".5"')}`;
const skull = (cx, cy, s, c, k) => `${path(`M${cx - s} ${cy}q0 ${-s * 1.2} ${s} ${-s * 1.2}t${s} ${s * 1.2}v${s * .5}l${-s * .3} ${s * .5}h${-s * 1.4}l${-s * .3} ${-s * .5}z`, c, K(k, 2))}${circle(cx - s * .4, cy - s * .1, s * .28, k)}${circle(cx + s * .4, cy - s * .1, s * .28, k)}${path(`M${cx - s * .3} ${cy + s * .55}v${s * .4}M${cx} ${cy + s * .55}v${s * .4}M${cx + s * .3} ${cy + s * .55}v${s * .4}`, 'none', K(k, 1.5))}`;
const dna = (cx, cy, h, c1, c2) => { let s = ''; for (let i = 0; i < 5; i++) { const y = cy - h / 2 + (i * h) / 4, w = i % 2 ? 9 : 4; s += line(cx - w, y, cx + w, y, i % 2 ? c1 : c2, 2.5); } return `${path(`M${cx - 9} ${cy - h / 2}q18 ${h / 4} 0 ${h / 2}t0 ${h / 2}`, 'none', K(c1, 2.5))}${path(`M${cx + 9} ${cy - h / 2}q-18 ${h / 4} 0 ${h / 2}t0 ${h / 2}`, 'none', K(c2, 2.5))}${s}`; };
const chevrons = (cx, cy, n, c, k) => Array.from({ length: n }, (_, i) => path(`M${cx - 12} ${cy - 10 + i * 9}l12 -7l12 7l0 5l-12 -7l-12 7z`, c, K(k, 1.5))).join('');
const cloud = (cx, cy, s, c, k) => path(`M${cx - s} ${cy}q${-s * .4} ${-s * .8} ${s * .4} ${-s * .8}q${s * .2} ${-s * .8} ${s} ${-s * .4}q${s * .9} ${-s * .2} ${s * .9} ${s * .5}q${s * .5} ${s * .3} 0 ${s * .7}h${-s * 2.1}q${-s * .6} ${-s * .2} ${-s * .2} ${-s * .7}z`, c, K(k, 2));
const eyeG = (cx, cy, w, c, iris, k) => `${path(`M${cx - w} ${cy}q${w} ${-w * .9} ${w * 2} 0q${-w} ${w * .9} ${-w * 2} 0z`, c, K(k, 2))}${circle(cx, cy, w * .4, iris)}${circle(cx, cy, w * .18, k)}`;

/** 스킬별 문양. (L: 계보 색) → svg 조각 */
const GLYPH = {
    // 강철 보병
    irRifleShot: (L) => `${path('M12 44l30 -22l4 4l-6 6l4 2l-8 6l-2 -2l-12 10l-6 2z', L.lo, K(L.k, 2))}${path('M30 46l2 6', 'none', K(L.k, 2))}${star(50, 16, 7, 6, L.hi, '', .4)}`,
    irBayonet: (L) => `${path('M32 8l6 10v26h-12v-26z', L.fg, K(L.k, 2))}${rect(24, 44, 16, 6, L.lo, 'rx="1" ' + K(L.k, 2))}${rect(29, 50, 6, 8, L.lo, K(L.k, 2))}${drop(44, 36, 3.5, '#ef4444', L.k)}${drop(20, 30, 2.5, '#ef4444', L.k)}`,
    irDigIn: (L) => `${path('M8 50q14 -22 28 -8q10 -16 20 8z', L.lo, K(L.k, 2))}${rect(8, 50, 48, 6, L.hi, K(L.k, 2) + ' opacity=".9"')}${path('M40 14l-14 28', 'none', K(L.k, 4))}${path('M40 14l-14 28', 'none', K(L.fg, 2))}${path('M22 40l-6 2l2 8l6 -4z', L.fg, K(L.k, 2))}`,
    irDrill: (L) => `${path('M12 18q20 -6 20 0v30q0 -6 -20 0zM52 18q-20 -6 -20 0v30q0 -6 20 0z', L.fg, K(L.k, 2))}${path('M18 26h10M18 32h10M18 38h8M36 26h10M36 32h10M36 38h8', 'none', K(L.lo, 2))}${chevrons(32, 56, 1, L.hi, L.k)}`,
    irFieldKit: (L) => `${rect(12, 20, 40, 32, L.lo, 'rx="5" ' + K(L.k, 2))}${rect(24, 14, 16, 8, L.lo, 'rx="2" ' + K(L.k, 2))}${rect(28, 26, 8, 20, L.fg)}${rect(22, 32, 20, 8, L.fg)}${rect(28, 26, 8, 20, '#ef4444', 'opacity=".9"')}${rect(22, 32, 20, 8, '#ef4444', 'opacity=".9"')}`,
    irSteadyAim: (L) => `${crosshair(32, 28, 14, L.fg, 2.5)}${circle(32, 28, 3, L.hi)}${path('M20 48l-6 10M44 48l6 10M32 48v10', 'none', K(L.lo, 3))}`,
    irLongShot: (L) => `${path('M6 48q20 -14 46 -34', 'none', K(L.hi, 2) + ' stroke-dasharray="3 4"')}${bullet(26, 34, -32, L.fg, L.k, 12)}${circle(52, 14, 6, 'none', K(L.fg, 2))}${circle(52, 14, 2, L.hi)}`,
    irWoundShot: (L) => `${crosshair(32, 30, 13, L.fg, 2.5)}${drop(32, 24, 5, '#ef4444', L.k)}${drop(20, 44, 3, '#ef4444', L.k)}${drop(46, 46, 3, '#ef4444', L.k)}`,
    irFlashRound: (L) => `${glow(32, 32, 16, '#fff', .5)}${star(32, 32, 22, 8, L.hi, K(L.k, 1.5), .35)}${star(32, 32, 10, 8, '#fff', '', .4)}`,
    irScope: (L) => `${circle(32, 32, 20, L.k, K(L.lo, 3))}${circle(32, 32, 15, '#9fd3f0', 'opacity=".9"')}${line(32, 18, 32, 46, L.k, 1.5)}${line(18, 32, 46, 32, L.k, 1.5)}${circle(32, 32, 5, 'none', K(L.k, 1.5))}${circle(24, 24, 4, '#fff', 'opacity=".6"')}`,
    irBloodTrail: (L) => `${[[14, 48], [26, 38], [36, 28], [48, 18]].map(([x, y]) => `${path(`M${x} ${y}q-4 -6 0 -8q4 2 0 8z`, '#ef4444', K(L.k, 1.5))}${circle(x - 3, y - 8, 1.5, '#ef4444')}${circle(x + 2, y - 10, 1.5, '#ef4444')}`).join('')}${path('M8 56q24 -8 48 -42', 'none', K(L.lo, 1.5) + ' stroke-dasharray="2 4"')}`,
    irStillBreath: (L) => `${crosshair(32, 24, 11, L.fg, 2.5)}${circle(32, 24, 2.5, L.hi)}${path('M8 50h12l4 -8l4 16l4 -8h24', 'none', K(L.hi, 2.5))}`,
    irBurstFire: (L) => `${bullet(22, 24, -20, L.fg, L.k)}${bullet(28, 34, 0, L.fg, L.k)}${bullet(22, 44, 20, L.fg, L.k)}${path('M46 18l8 -6M50 34h10M46 50l8 6', 'none', K(L.hi, 2.5))}`,
    irSuppress: (L) => `${[18, 28, 38, 48].map((y, i) => line(10 + (i % 2) * 8, y, 44 + (i % 2) * 8, y, L.fg, 3)).join('')}${[18, 28, 38, 48].map((y, i) => circle(46 + (i % 2) * 8, y, 3, L.hi)).join('')}`,
    irBreach: (L) => `${path('M40 8v48', 'none', K(L.lo, 6))}${path('M40 8v48', 'none', K(L.k, 1.5) + ' stroke-dasharray="6 4"')}${path('M8 32h30M26 20l14 12l-14 12', 'none', K(L.hi, 5))}${path('M46 20l8 -6M48 32h10M46 44l8 6', 'none', K(L.fg, 2))}`,
    irSquadLead: (L) => chevrons(32, 20, 3, L.hi, L.k) + `${line(18, 52, 46, 52, L.fg, 3)}`,
    irHeavyPlate: (L) => `${shield(32, 30, 22, L.lo, L.k)}${path('M32 10v44', 'none', K(L.k, 2))}${[[22, 22], [42, 22], [22, 36], [42, 36]].map(([x, y]) => circle(x, y, 2.5, L.fg)).join('')}`,
    irAdrenaline: (L) => `${rect(14, 28, 30, 10, L.fg, 'rx="2" ' + K(L.k, 2) + ' transform="rotate(-40 29 33)"')}${path('M40 20l10 -10M44 14l4 4', 'none', K(L.k, 3))}${path('M12 48l-4 6', 'none', K(L.k, 3))}${bolt(20, 10, 7, L.hi)}${bolt(46, 40, 7, L.hi)}`,
    irArtillery: (L) => `${path('M10 20q22 -10 36 10', 'none', K(L.lo, 2) + ' stroke-dasharray="3 3"')}${bullet(42, 28, 60, L.fg, L.k, 16)}${path('M30 56q-6 -12 6 -14q-2 -8 8 -8q6 -2 8 6q8 2 4 10q4 6 -4 8z', L.hi, K(L.k, 2))}${path('M36 50q2 -6 8 -6', 'none', K('#fff', 2))}`,
    irMarkTarget: (L) => `${crosshair(28, 34, 14, L.lo, 2.5)}${path('M46 8v30', 'none', K(L.k, 3))}${path('M46 8l12 6l-12 6z', L.hi, K(L.k, 2))}`,
    irExecuteOrder: (L) => `${skull(32, 30, 14, L.fg, L.k)}${path('M14 50l36 -34M14 16l36 34', 'none', K('#ef4444', 3))}`,
    irWarRoom: (L) => `${rect(8, 14, 48, 36, L.fg, 'rx="2" ' + K(L.k, 2))}${path('M8 30q12 -8 24 0t24 -4M20 14v36M40 14v36', 'none', K(L.lo, 1.5))}${path('M18 40l14 -14l10 6', 'none', K('#ef4444', 2.5))}${circle(18, 40, 3, L.hi)}${circle(42, 32, 3, L.hi)}${path('M28 24l6 -6l-2 8z', '#ef4444')}`,
    irIronWill: (L) => `${shield(32, 30, 22, L.lo, L.k)}${path('M32 18l6 4l-2 10h-8l-2 -10z', L.fg, K(L.k, 2))}${path('M22 46h20', 'none', K(L.hi, 3))}`,
    irVeteran: (L) => `${path('M22 6h8l4 20h-8zM42 6h-8l-4 20h8z', '#ef4444', K(L.k, 2))}${circle(32, 40, 14, L.hi, K(L.k, 2))}${star(32, 40, 8, 5, L.fg)}`,
    irOrbitalStrike: (L) => `${path('M28 2h8l6 44h-20z', L.hi, 'opacity=".85"')}${path('M30 2h4l3 44h-10z', '#fff', 'opacity=".8"')}${glow(32, 48, 14, L.hi, .6)}${path('M8 52q24 -12 48 0', 'none', K(L.hi, 2.5))}${path('M4 58q28 -10 56 0', 'none', K(L.fg, 2) + ' opacity=".6"')}`,
    irLastCharge: (L) => `${path('M6 40h30M24 28l12 12l-12 12', 'none', K(L.hi, 5))}${path('M44 10v30', 'none', K(L.k, 3))}${path('M44 10l16 6l-16 6z', '#ef4444', K(L.k, 2))}${path('M6 22h10M4 30h12M6 52h12', 'none', K(L.fg, 2) + ' opacity=".7"')}`,
    irScorchedEarth: (L) => `${flame(20, 36, 12, L.hi, '#fff1a8')}${flame(34, 30, 16, '#f97316', L.hi)}${flame(46, 38, 10, L.hi, '#fff1a8')}${rect(6, 52, 52, 6, L.k, 'rx="2"')}${path('M10 55h44', 'none', K('#f97316', 2) + ' stroke-dasharray="4 4"')}`,
    irMarshalBaton: (L) => `${path('M14 50l36 -36', 'none', K(L.k, 8))}${path('M14 50l36 -36', 'none', K(L.hi, 5))}${circle(50, 14, 5, L.fg, K(L.k, 2))}${circle(14, 50, 4, L.fg, K(L.k, 2))}${path('M8 20q6 14 20 20M56 44q-6 -14 -20 -20', 'none', K(L.lo, 2.5))}${[[10, 22], [14, 30], [20, 36], [54, 42], [50, 34], [44, 28]].map(([x, y]) => circle(x, y, 2, L.lo)).join('')}`,
    irStarBanner: (L) => `${path('M14 6v52', 'none', K(L.k, 3))}${path('M16 8h34l-8 12l8 12h-34z', '#ef4444', K(L.k, 2))}${star(32, 20, 7, 5, L.hi)}`,
    irUnbroken: (L) => `${shield(16, 34, 12, L.lo, L.k)}${shield(48, 34, 12, L.lo, L.k)}${shield(32, 30, 16, L.fg, L.k)}${path('M32 20v18', 'none', K(L.hi, 3))}`,
    // 군체 조율사
    hvSporeShot: (L) => `${sporeBall(40, 26, 12, L.hi, L.k)}${[[22, 40], [14, 48], [8, 54]].map(([x, y], i) => circle(x, y, 4 - i, L.hi, `opacity="${.9 - i * .25}"`)).join('')}`,
    hvToxicSpore: (L) => `${sporeBall(32, 26, 15, '#7fd14a', L.k, 8)}${skull(32, 26, 7, L.k, '#7fd14a')}${drop(32, 50, 4, L.hi, L.k)}`,
    hvSlimeCoat: (L) => `${shield(32, 30, 22, L.lo, L.k)}${path('M20 24q12 10 24 0v10q-12 8 -24 0z', L.hi, 'opacity=".9"')}${drop(26, 44, 3, L.hi, L.k)}${drop(38, 46, 3, L.hi, L.k)}`,
    hvSporeSense: (L) => `${path('M26 54q-4 -20 -14 -36M38 54q4 -20 14 -36', 'none', K(L.lo, 4))}${circle(12, 18, 5, L.hi, K(L.k, 2))}${circle(52, 18, 5, L.hi, K(L.k, 2))}${path('M22 12q10 -6 20 0M24 6q8 -4 16 0', 'none', K(L.fg, 2) + ' opacity=".8"')}${circle(32, 54, 6, L.lo, K(L.k, 2))}`,
    hvVenomGland: (L) => `${path('M32 10q16 2 18 20q0 14 -18 20q-18 -6 -18 -20q2 -18 18 -20z', L.lo, K(L.k, 2))}${path('M24 22q8 -8 16 0', 'none', K(L.fg, 2) + ' opacity=".6"')}${drop(32, 54, 4, L.hi, L.k)}${circle(32, 30, 6, L.hi, 'opacity=".8"')}`,
    hvThickHide: (L) => `${[0, 1, 2].map(r => [0, 1, 2, 3].map(c => path(`M${8 + c * 14 + (r % 2) * 7} ${12 + r * 14}h12l-6 12z`, r ? L.lo : L.fg, K(L.k, 1.5))).join('')).join('')}${shield(32, 32, 24, 'none', L.k)}`,
    hvNerveJolt: (L) => `${circle(26, 34, 8, L.lo, K(L.k, 2))}${path('M26 26v-14M34 34h14M26 42v12M18 34h-10M20 28l-8 -8M32 40l8 8', 'none', K(L.lo, 2.5))}${bolt(44, 10, 9, L.hi)}`,
    hvSporeBurst: (L) => `${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `${line(32 + Math.cos(a) * 10, 32 + Math.sin(a) * 10, 32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24, L.hi, 2.5)}${circle(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26, 3, L.fg)}`; }).join('')}${sporeBall(32, 32, 7, L.hi, L.k, 5)}`,
    hvRegrow: (L) => `${path('M32 54q-20 -14 -20 -28q2 -12 12 -10q6 2 8 8q2 -6 8 -8q10 -2 12 10q0 14 -20 28z', '#e05a7a', K(L.k, 2))}${drop(20, 12, 3, L.hi, L.k)}${drop(44, 10, 3, L.hi, L.k)}${path('M26 30q6 6 12 0', 'none', K(L.hi, 3))}`,
    hvTuningFork: (L) => `${path('M22 8v22q0 10 10 10t10 -10v-22', 'none', K(L.fg, 4))}${path('M32 40v16', 'none', K(L.fg, 4))}${path('M12 16q-4 6 0 12M52 16q4 6 0 12', 'none', K(L.hi, 2.5))}${circle(32, 58, 3, L.hi)}`,
    hvLingerToxin: (L) => `${path('M18 8h28l-10 20v8l10 20h-28l10 -20v-8z', L.fg, K(L.k, 2))}${path('M22 48l10 -16l10 16z', L.hi)}${path('M24 12h16l-6 10h-4z', L.hi, 'opacity=".6"')}${drop(32, 30, 2.5, L.hi)}`,
    hvHiveMind: (L) => `${path('M18 30q-6 -18 14 -20q20 -2 14 20q8 8 -4 14h-20q-12 -6 -4 -14z', L.lo, K(L.k, 2))}${[[22, 22], [32, 16], [42, 24], [28, 32], [38, 36]].map(([x, y]) => circle(x, y, 3, L.hi)).join('')}${path('M22 22l10 -6l10 8l-14 8l10 4', 'none', K(L.hi, 1.5))}${path('M32 44v10M24 44l-4 8M40 44l4 8', 'none', K(L.fg, 2))}`,
    hvDominate: (L) => `${circle(32, 26, 14, L.lo, K(L.k, 2))}${circle(27, 24, 3, L.k)}${circle(37, 24, 3, L.k)}${path('M20 34h24', 'none', K(L.hi, 4))}${path('M24 30v8M32 30v8M40 30v8', 'none', K(L.k, 2))}${path('M18 40q-8 10 -4 18M46 40q8 10 4 18M32 42v16', 'none', K(L.lo, 3))}`,
    hvSwarmCall: (L) => `${[[10, 14], [18, 26], [8, 38], [20, 50], [50, 10], [54, 24], [52, 48]].map(([x, y]) => `${path(`M${x} ${y}q6 -4 10 0q-4 4 -10 0z`, L.hi, K(L.k, 1.5))}${circle(x + 9, y, 1.5, L.k)}`).join('')}${path('M20 32l12 0M44 32l-12 0', 'none', K(L.fg, 2))}${circle(32, 32, 7, L.fg, K(L.k, 2))}${circle(32, 32, 3, L.k)}`,
    hvAcidRain: (L) => `${cloud(32, 24, 12, L.lo, L.k)}${drop(20, 44, 3.5, L.hi, L.k)}${drop(32, 50, 3.5, L.hi, L.k)}${drop(44, 44, 3.5, L.hi, L.k)}`,
    hvSynapseWeb: (L) => `${Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return line(32, 32, 32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26, L.fg, 1.8); }).join('')}${[8, 16, 24].map(r => poly(32, 32, r, 6, 'none', K(L.fg, 1.5))).join('')}${[[32, 8], [53, 44], [11, 44]].map(([x, y]) => circle(x, y, 3.5, L.hi)).join('')}`,
    hvSporeCloud: (L) => `${cloud(32, 30, 13, L.lo, L.k)}${[[20, 28], [30, 22], [40, 30], [26, 34], [36, 38], [14, 46], [32, 50], [48, 46]].map(([x, y]) => circle(x, y, 2.5, L.hi)).join('')}`,
    hvCarapace: (L) => `${shield(32, 30, 24, L.lo, L.k)}${path('M16 24h32M14 34h36M18 44h28', 'none', K(L.k, 2))}${path('M32 8v48', 'none', K(L.k, 2))}${path('M22 16l4 -8M42 16l-4 -8', 'none', K(L.hi, 2.5))}`,
    hvSpawnFeast: (L) => `${path('M10 30q22 -24 44 0q-22 10 -44 0z', L.lo, K(L.k, 2))}${path('M10 34q22 24 44 0q-22 -10 -44 0z', L.lo, K(L.k, 2))}${path('M16 32l4 -6l4 6l4 -6l4 6l4 -6l4 6l4 -6l4 6M16 32l4 6l4 -6l4 6l4 -6l4 6l4 -6l4 6l4 -6', 'none', K(L.fg, 2))}${circle(32, 32, 5, '#e05a7a', K(L.k, 1.5))}`,
    hvCorrosiveSting: (L) => `${path('M46 10l-26 30', 'none', K(L.fg, 5))}${path('M20 40l-8 14l14 -8z', L.fg, K(L.k, 2))}${circle(46, 10, 5, L.lo, K(L.k, 2))}${[[40, 44], [50, 36], [46, 50]].map(([x, y]) => circle(x, y, 3.5, L.hi, K(L.k, 1.5))).join('')}`,
    hvNestQuake: (L) => `${path('M14 48q0 -30 18 -30t18 30z', L.lo, K(L.k, 2))}${path('M22 48q-2 -18 10 -22M32 20l4 10l-4 6l6 8', 'none', K(L.k, 2))}${path('M6 54h8l4 -6l4 10l4 -6h32', 'none', K(L.hi, 3))}`,
    hvBroodCrown: (L) => `${path('M10 48v-28l12 10l10 -18l10 18l12 -10v28z', L.hi, K(L.k, 2))}${rect(10, 48, 44, 8, L.hi, K(L.k, 2))}${[[20, 42], [32, 40], [44, 42]].map(([x, y]) => `${path(`M${x} ${y}q4 -6 0 -10q-4 4 0 10z`, '#e9d7a8', K(L.k, 1.5))}`).join('')}`,
    hvEvolvedGland: (L) => `${path('M32 10q16 2 18 20q0 14 -18 20q-18 -6 -18 -20q2 -18 18 -20z', L.lo, K(L.k, 2))}${dna(32, 30, 28, L.hi, L.fg, L.k)}${drop(32, 56, 3, L.hi, L.k)}`,
    hvNestWard: (L) => `${circle(32, 32, 22, 'none', K(L.hi, 3) + ' stroke-dasharray="8 5"')}${path('M20 40q0 -18 12 -18t12 18z', L.lo, K(L.k, 2))}${circle(32, 36, 4, L.fg)}${[[32, 10], [54, 32], [10, 32], [32, 54]].map(([x, y]) => circle(x, y, 3, L.fg)).join('')}`,
    hvGreatRupture: (L) => `${glow(32, 32, 18, L.hi, .5)}${path('M32 4l6 18l18 -8l-10 16l16 10l-18 2l6 18l-14 -12l-8 16l-2 -18l-18 4l12 -12l-14 -12h18l-4 -18l12 12z', L.hi, K(L.k, 2))}${path('M32 20l4 10l-4 6l6 8', 'none', K(L.k, 2.5))}${circle(32, 32, 5, '#fff', 'opacity=".8"')}`,
    hvEvolve: (L) => `${dna(24, 34, 40, L.hi, L.fg, L.k)}${path('M44 48v-32M36 24l8 -10l8 10', 'none', K(L.hi, 3.5))}`,
    hvApexToxin: (L) => `${skull(32, 32, 16, '#7fd14a', L.k)}${path('M18 18l4 -12l10 8l10 -8l4 12z', L.hi, K(L.k, 2))}${drop(22, 52, 3, L.hi, L.k)}${drop(42, 52, 3, L.hi, L.k)}`,
    hvArchitectEye: (L) => `${eyeG(32, 32, 24, L.fg, L.hi, L.k)}${path('M8 10l16 10M56 10l-16 10M8 54l16 -10M56 54l-16 -10', 'none', K(L.lo, 1.5) + ' stroke-dasharray="2 3"')}${poly(32, 32, 10, 6, 'none', K(L.hi, 1.5))}`,
    hvPerfectStrain: (L) => `${path('M24 8h16v12l10 22q2 12 -18 12t-18 -12l10 -22z', L.fg, K(L.k, 2) + ' opacity=".9"')}${path('M20 42q12 -6 24 0v6q-12 6 -24 0z', L.hi)}${dna(32, 30, 20, L.hi, L.lo, L.k)}`,
    hvLivingArmor: (L) => `${shield(32, 30, 24, L.lo, L.k)}${path('M20 20q8 10 4 24M44 20q-8 10 -4 24M32 14v10', 'none', K('#e05a7a', 2.5))}${path('M32 42q-8 -6 -8 -12q2 -5 8 -1q6 -4 8 1q0 6 -8 12z', '#e05a7a', K(L.k, 1.5))}${glow(32, 34, 10, L.hi, .4)}`,
};

/** 스킬 명세: id → 계보(ir · hv), 액티브 · 패시브, 각성기 여부. */
export const SKILLS = Object.keys(GLYPH).map(id => ({ id, lineage: id.slice(0, 2), awaken: ['irOrbitalStrike', 'irLastCharge', 'irScorchedEarth', 'hvGreatRupture', 'hvEvolve', 'hvApexToxin'].includes(id) }));
export const PASSIVES = new Set(['irDrill', 'irFieldKit', 'irSteadyAim', 'irScope', 'irBloodTrail', 'irStillBreath', 'irSquadLead', 'irHeavyPlate', 'irAdrenaline', 'irWarRoom', 'irIronWill', 'irVeteran', 'irMarshalBaton', 'irStarBanner', 'irUnbroken', 'hvSporeSense', 'hvVenomGland', 'hvThickHide', 'hvTuningFork', 'hvLingerToxin', 'hvHiveMind', 'hvSynapseWeb', 'hvSporeCloud', 'hvCarapace', 'hvBroodCrown', 'hvEvolvedGland', 'hvNestWard', 'hvArchitectEye', 'hvPerfectStrain', 'hvLivingArmor']);

export const renderSkill = ({ id, lineage, awaken }) => {
    const L = LIN[lineage], passive = PASSIVES.has(id), rim = awaken ? '#ffd166' : L.rim;
    const defs = `${linear('bg', L.bg1, L.bg2, 70)}${radial('sh', '#ffffff', '#ffffff', .18, 0)}${blur('gl', 2.5)}`;
    const body = `${rect(2, 2, 60, 60, 'url(#bg)', 'rx="12"')}${passive ? circle(32, 32, 24, 'none', ink(rim, 1.2) + ' opacity=".45"') : path('M2 40l44 -38h-20l-24 24z', 'url(#sh)')}${GLYPH[id](L)}${rect(2, 2, 60, 60, 'none', `rx="12" ${ink(rim, awaken ? 3 : 2.2)}`)}${awaken ? `${spark(10, 10, 3, '#fff5c0')}${spark(54, 54, 3, '#fff5c0')}` : ''}`;
    return svg(64, body, defs);
};
