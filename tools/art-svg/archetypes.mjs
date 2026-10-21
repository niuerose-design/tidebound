// 몬스터 몸체 원형(아키타입). 128×128 좌표계, 바닥 중심 (64, 104) 근처. 각 함수는 팔레트 P와 옵션 o를 받아 조각을 돌려줍니다.
import { path, circle, ellipse, rect, line, ink, eye, glow, horns, crystal, spikes, puff, star, g, bolt, gear } from './lib.mjs';

const E = (P, cx, cy, r, shape) => eye(cx, cy, r, P.eye, P.ink, shape);

/** 드론(고철 · 유령): 둥근 동체 + 로터 팔 4개 + 렌즈 눈. */
export const drone = (P, o = {}) => {
    const k = ink(P.ink), arms = [[-30, -18], [30, -18], [-30, 20], [30, 20]].map(([dx, dy]) => `${line(64, 64, 64 + dx, 64 + dy, P.dark, 5)}${ellipse(64 + dx, 64 + dy, 14, 4, P.light, ink(P.ink, 2) + ` opacity="${o.ghost ? .5 : .9}"`)}${circle(64 + dx, 64 + dy, 3, P.dark)}`).join('');
    return `${arms}${path('M40 56q0-14 24-14t24 14v14q0 12-24 12T40 70z', P.base, k)}${rect(46, 50, 36, 8, P.light, 'rx="4" opacity=".5"')}${circle(64, 66, 11, P.dark, k)}${circle(64, 66, 7, P.eye)}${circle(64, 66, 3, P.ink)}${glow(64, 66, 9, P.glow, .4)}${o.rust ? `${path('M48 72q6 4 12 2', 'none', ink(P.accent, 3))}${circle(80, 58, 3.5, P.accent)}` : ''}${o.antenna ? `${line(64, 42, 64, 30, P.dark, 3)}${circle(64, 28, 3, P.glow)}` : ''}`;
};
/** 나방: 날개 4장 + 더듬이 + 털 몸통. */
export const moth = (P, o = {}) => {
    const k = ink(P.ink), wing = (s) => `${path(`M64 62q${22 * s} -34 ${46 * s} -26q${8 * s} 10 ${-18 * s} 30z`, P.base, k)}${path(`M64 66q${26 * s} 4 ${34 * s} 24q${-14 * s} 6 ${-30 * s} -16z`, P.dark, k)}${circle(64 + 30 * s, 48, 6, P.light, 'opacity=".9"')}${circle(64 + 30 * s, 48, 3, P.glow)}${o.dark ? '' : `${circle(64 + 36 * s, 78, 3.5, P.light, 'opacity=".8"')}`}`;
    return `${wing(-1)}${wing(1)}${ellipse(64, 70, 9, 22, P.light, k)}${path('M58 62h12M57 72h14M58 82h12', 'none', ink(P.dark, 2))}${circle(64, 50, 8, P.light, k)}${E(P, 60, 49, 2.6)}${E(P, 68, 49, 2.6)}${path('M60 44q-8 -10 -18 -12M68 44q8 -10 18 -12', 'none', ink(P.dark, 2))}${path('M44 32l-2 -4M48 30l0 -4M52 30l2 -4M84 32l2 -4M80 30l0 -4M76 30l-2 -4', 'none', ink(P.dark, 1.5))}${o.glowWings ? `${glow(34, 50, 14, P.glow, .35)}${glow(94, 50, 14, P.glow, .35)}` : ''}`;
};
/** 말벌: 줄무늬 배 + 투명 날개 + 침. */
export const wasp = (P, o = {}) => {
    const k = ink(P.ink);
    return `${ellipse(40, 50, 22, 9, P.light, ink(P.ink, 1.5) + ' opacity=".55" transform="rotate(-25 40 50)"')}${ellipse(88, 50, 22, 9, P.light, ink(P.ink, 1.5) + ' opacity=".55" transform="rotate(25 88 50)"')}${path('M64 70q22 0 30 14t-8 20q-14 0 -24 -8z', P.base, k)}${path('M80 76q4 6 6 12M74 70q2 8 2 16', 'none', ink(P.ink, 3))}${path('M86 98l10 10l-4 -14z', P.ink)}${ellipse(60, 66, 14, 12, P.dark, k)}${circle(46, 60, 10, P.base, k)}${E(P, 43, 58, 4, 'slit')}${path('M40 52q-6 -8 -4 -16M46 50q0 -10 6 -14', 'none', ink(P.dark, 2))}${path('M56 76l-10 12M62 78l-6 14M68 78l-2 14', 'none', ink(P.ink, 2.5))}${o.flame ? `${path('M90 84q8 -14 2 -24q-2 8 -8 10q4 -10 -2 -16q-4 12 -10 18q2 10 18 12z', P.glow, 'opacity=".85"')}${path('M88 80q4 -8 1 -14q-4 6 -6 10z', '#fff', 'opacity=".7"')}` : ''}`;
};
/** 기계 병기(중장갑): 상자 몸통 + 바이저 + 집게 팔 + 무한궤도. */
export const mech = (P, o = {}) => {
    const k = ink(P.ink);
    return `${rect(28, 92, 72, 16, P.dark, 'rx="8" ' + k)}${circle(40, 100, 4, P.light)}${circle(64, 100, 4, P.light)}${circle(88, 100, 4, P.light)}${rect(36, 52, 56, 40, P.base, 'rx="6" ' + k)}${rect(42, 58, 44, 12, P.ink, 'rx="4"')}${rect(46, 61, 36, 6, P.eye, 'rx="3"')}${glow(64, 64, 16, P.glow, .35)}${rect(44, 76, 40, 4, P.dark, 'rx="2"')}${rect(44, 83, 24, 4, P.dark, 'rx="2"')}${rect(20, 56, 14, 30, P.light, 'rx="4" ' + k)}${rect(94, 56, 14, 30, P.light, 'rx="4" ' + k)}${path('M20 86l-6 10h10l4 -10zM108 86l6 10h-10l-4 -10z', P.dark, k)}${rect(52, 40, 24, 12, P.dark, 'rx="4" ' + k)}${o.lamp ? `${circle(64, 36, 5, P.glow, k)}${glow(64, 36, 10, P.glow, .5)}` : ''}${o.rust ? `${path('M40 86q10 -4 20 2', 'none', ink(P.accent, 3))}${path('M80 54q4 8 10 10', 'none', ink(P.accent, 3))}` : ''}${o.drill ? `${path('M108 70l16 6l-16 6z', P.light, k)}${path('M112 73l8 3l-8 3', 'none', ink(P.ink, 1.5))}` : ''}`;
};
/** 골렘(돌 · 광석): 울퉁불퉁한 몸통 + 작은 머리 + 큰 주먹. */
export const golem = (P, o = {}) => {
    const k = ink(P.ink), s = o.scale || 1, t = `transform="translate(${64 - 64 * s} ${108 - 108 * s}) scale(${s})"`;
    return g(`${path('M38 100l-6 -30l10 -22l24 -8l24 10l8 24l-8 26z', P.base, k)}${path('M46 56l18 -10l20 8l4 18l-6 20h-32l-8 -20z', P.light, 'opacity=".35"')}${path('M32 70l-14 6l-6 24l16 2l6 -16z', P.dark, k)}${path('M96 70l14 6l6 24l-16 2l-6 -16z', P.dark, k)}${path('M44 100l-2 10h18l-2 -10zM70 100l-2 10h18l-2 -10z', P.dark, k)}${path('M52 40l12 -14l14 12l-4 10h-18z', P.base, k)}${E(P, 60, 42, 3, 'angry')}${E(P, 72, 42, 3, 'angry')}${o.crystals ? `${crystal(52, 44, 14, 24, P.accent, '#fff', P.ink)}${crystal(70, 40, 12, 18, P.accent, '#fff', P.ink)}${crystal(82, 54, 10, 14, P.accent, '#fff', P.ink)}` : ''}${o.cracks ? path('M56 70l6 8l-4 8M80 64l-6 10l6 8', 'none', ink(P.glow, 2)) : ''}${o.gas ? `${puff(28, 50, 7, P.glow, .55)}${puff(100, 44, 6, P.glow, .5)}` : ''}`, t);
};
/** 포자 · 버섯: 갓 + 자루 + 주름 + 떠다니는 포자. */
export const spore = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M48 66q0 -10 8 -12l-2 -4q10 -2 20 0l-2 4q8 2 8 12v28q0 10 -16 10t-16 -10z', P.light, k)}${path('M52 76h24M53 86h22', 'none', ink(P.dark, 2) + ' opacity=".5"')}${path('M22 62q0 -34 42 -34t42 34q-10 6 -42 6t-42 -6z', P.base, k)}${path('M30 56q4 -20 34 -22q30 2 34 22', 'none', ink(P.light, 3) + ' opacity=".5"')}${circle(44, 46, 6, P.light, 'opacity=".9"')}${circle(74, 40, 8, P.light, 'opacity=".9"')}${circle(92, 52, 4, P.light, 'opacity=".9"')}${E(P, 58, 74, 3)}${E(P, 70, 74, 3)}${o.root ? path('M48 100q-10 4 -16 14M80 100q10 4 16 14M64 104v12', 'none', ink(P.dark, 3)) : ''}${[[18, 80], [108, 72], [100, 94], [26, 98]].map(([x, y]) => `${circle(x, y, 3, P.glow, 'opacity=".8"')}${glow(x, y, 6, P.glow, .4)}`).join('')}`;
};
/** 알주머니: 막 + 혈관 + 속 그림자 + 바닥 촉수. */
export const eggsac = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M30 104q-12 -2 -8 -8M98 104q12 -2 8 -8M44 106q-6 6 -12 6M84 106q6 6 12 6', 'none', ink(P.dark, 4))}${path('M64 26q32 4 34 46q2 32 -34 34q-36 -2 -34 -34q2 -42 34 -46z', P.base, k)}${path('M44 48q10 -18 28 -16M38 70q8 8 10 24M90 60q-6 8 -6 24', 'none', ink(P.dark, 3) + ' opacity=".6"')}${ellipse(64, 72, 16, 20, P.dark, 'opacity=".55"')}${o.embryo ? `${circle(60, 66, 6, P.ink, 'opacity=".6"')}${path('M64 74q6 6 2 14', 'none', ink(P.ink, 3) + ' opacity=".6"')}` : ''}${ellipse(52, 44, 8, 12, P.light, 'opacity=".45" transform="rotate(-20 52 44)"')}${E(P, 58, 62, 3)}${E(P, 70, 64, 3)}${o.crack ? path('M70 34l6 10l-4 8l6 8', 'none', ink(P.glow, 2.5)) : ''}`;
};
/** 해파리: 갓 + 속 고리 + 촉수. */
export const jelly = (P, o = {}) => {
    const k = ink(P.ink), n = o.tentacles || 5, ts = Array.from({ length: n }, (_, i) => { const x = 40 + (i * 48) / (n - 1), s = i % 2 ? 1 : -1; return path(`M${x} 70q${8 * s} 12 0 24t${6 * s} 26`, 'none', ink(P.light, 3) + ' opacity=".85"'); }).join('');
    return `${ts}${path('M28 66q0 -38 36 -38t36 38q-10 8 -36 8t-36 -8z', P.base, k + ' opacity=".92"')}${path('M40 60q4 -22 24 -24q20 2 24 24', 'none', ink(P.light, 3) + ' opacity=".6"')}${ellipse(64, 58, 16, 7, P.glow, 'opacity=".5"')}${glow(64, 52, 18, P.glow, .35)}${E(P, 56, 56, 3)}${E(P, 72, 56, 3)}${o.spark ? `${bolt(40, 78, 7, P.glow)}${bolt(86, 84, 7, P.glow)}` : ''}${o.void ? `${circle(64, 50, 8, P.ink, 'opacity=".8"')}${circle(64, 50, 4, P.glow)}` : ''}`;
};
/** 빛 조각 · 안개 요정: 둥근 핵 + 꼬리 + 고리. */
export const wisp = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M64 70q-26 10 -40 40q22 -20 44 -22z', P.light, 'opacity=".55"')}${path('M64 70q26 8 36 36q-20 -18 -40 -20z', P.light, 'opacity=".45"')}${glow(64, 60, 30, P.glow, .35)}${circle(64, 60, 22, P.base, k)}${circle(64, 60, 14, P.light, 'opacity=".8"')}${E(P, 57, 58, 3.5)}${E(P, 71, 58, 3.5)}${o.halo ? `${ellipse(64, 32, 22, 6, 'none', ink(P.glow, 3))}` : ''}${o.sting ? `${path('M48 76l-8 16l4 -16zM80 76l8 16l-4 -16z', P.dark)}${path('M30 96l-4 10M98 96l4 10M64 86v12', 'none', ink(P.dark, 2.5))}` : ''}${o.stars ? [[30, 40], [100, 34], [96, 90]].map(([x, y]) => star(x, y, 5, 4, P.glow, 'opacity=".9"')).join('') : ''}`;
};
/** 망령(유령): 두건진 천 + 빈 눈 + 물결 자락. */
export const wraith = (P, o = {}) => {
    const k = ink(P.ink);
    return `${glow(64, 70, 34, P.glow, .25)}${path('M30 110q4 -10 0 -20v-32q0 -34 34 -34t34 34v32q-4 10 0 20q-8 -8 -14 0t-12 0t-16 0t-12 0t-14 0z', P.base, k)}${path('M38 60q0 -24 26 -24t26 24v12q-12 -6 -26 -6t-26 6z', P.dark, 'opacity=".45"')}${circle(54, 60, 6, P.ink)}${circle(74, 60, 6, P.ink)}${circle(54, 60, 2.5, P.eye)}${circle(74, 60, 2.5, P.eye)}${o.mouth ? ellipse(64, 76, 5, 7, P.ink) : ''}${o.cap ? `${path('M34 40h60l-6 -10h-48z', P.accent, k)}${path('M40 30q24 -8 48 0', 'none', ink(P.ink, 2.5))}${rect(58, 32, 12, 6, P.glow, 'rx="1"')}` : ''}${o.chains ? `${path('M30 70q-10 10 -4 24M98 70q10 10 4 24', 'none', ink(P.light, 2.5) + ' stroke-dasharray="4 4"')}` : ''}${o.halo ? `${ellipse(64, 30, 20, 6, 'none', ink(P.glow, 3.5))}${glow(64, 30, 20, P.glow, .4)}` : ''}${o.rings ? `${circle(64, 70, 44, 'none', ink(P.glow, 1.5) + ' opacity=".5"')}${circle(64, 70, 54, 'none', ink(P.glow, 1) + ' opacity=".3"')}` : ''}`;
};
/** 순찰 기계: 공 바퀴 + 기둥 몸통 + 양팔 방패 + 램프 머리. */
export const unit = (P, o = {}) => {
    const k = ink(P.ink);
    return `${circle(64, 98, 14, P.dark, k)}${circle(64, 98, 6, P.light)}${rect(50, 58, 28, 30, P.base, 'rx="6" ' + k)}${rect(54, 64, 20, 6, P.ink, 'rx="3"')}${rect(56, 76, 16, 4, P.dark, 'rx="2"')}${rect(30, 60, 16, 26, P.light, 'rx="5" ' + k)}${rect(82, 60, 16, 26, P.light, 'rx="5" ' + k)}${rect(34, 66, 8, 14, P.dark, 'rx="2"')}${rect(86, 66, 8, 14, P.dark, 'rx="2"')}${path('M56 58v-8h16v8', 'none', ink(P.dark, 4))}${circle(64, 40, 10, P.dark, k)}${circle(64, 40, 5.5, P.eye)}${glow(64, 40, 12, P.glow, .5)}${o.sealed ? `${path('M44 50h40', 'none', ink(P.glow, 2) + ' stroke-dasharray="3 3"')}${spikes(50, 58, 4, 7, 6, P.light, P.ink)}` : ''}`;
};
/** 수호자(인간형 갑주): 투구 + 흉갑 핵 + 견갑 + 다리. */
export const guardian = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M48 50h32l6 36h-44z', P.base, k)}${path('M52 54h24l4 26h-32z', P.light, 'opacity=".3"')}${circle(64, 66, 7, P.eye, k)}${glow(64, 66, 12, P.glow, .5)}${path('M34 54l14 -4l2 14l-14 2zM94 54l-14 -4l-2 14l14 2z', P.dark, k)}${path('M34 66l-4 22l10 2l6 -20zM94 66l4 22l-10 2l-6 -20z', P.base, k)}${path('M46 86h14l-2 22h-12zM68 86h14l0 22h-12z', P.dark, k)}${path('M52 50q0 -22 12 -22t12 22z', P.dark, k)}${rect(54, 38, 20, 6, P.eye, 'rx="2"')}${o.plume ? path('M64 28q-10 -14 -16 -4q8 0 10 8M64 28q10 -14 16 -4q-8 0 -10 8', P.glow, k) : ''}${o.prism ? `${path('M64 56l10 10l-10 10l-10 -10z', P.glow, 'opacity=".8"')}${path('M64 56v20M54 66h20', 'none', ink('#fff', 1.2))}` : ''}${o.empty ? `${circle(64, 66, 7, P.ink)}${rect(54, 38, 20, 6, P.ink, 'rx="2"')}${rect(56, 40, 16, 2, P.glow, 'opacity=".9"')}` : ''}`;
};
/** 게: 껍데기 + 집게 + 다리 + 눈자루. */
export const crab = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M26 84l-10 10M30 90l-8 12M98 90l8 12M102 84l10 10M40 92l-4 14M88 92l4 14', 'none', ink(P.dark, 4))}${path('M22 60l-12 -14l4 -10l12 8l6 -8l6 10z', P.base, k)}${path('M106 60l12 -14l-4 -10l-12 8l-6 -8l-6 10z', P.base, k)}${path('M30 62h68q6 14 -4 28q-30 10 -60 0q-10 -14 -4 -28z', P.base, k)}${path('M38 66h52q4 10 -2 18q-24 6 -48 0q-6 -8 -2 -18z', P.light, 'opacity=".3"')}${o.spiky ? spikes(36, 62, 6, 10, 10, P.dark, P.ink) : ''}${o.shell ? `${path('M40 70q24 -14 48 0M44 80q20 -10 40 0', 'none', ink(P.dark, 2.5))}` : ''}${line(52, 60, 50, 48, P.dark, 3)}${line(76, 60, 78, 48, P.dark, 3)}${E(P, 50, 46, 4)}${E(P, 78, 46, 4)}${o.smoke ? `${puff(14, 40, 6, P.glow, .6)}${puff(114, 40, 6, P.glow, .6)}` : ''}${o.void ? `${circle(64, 76, 8, P.ink)}${circle(64, 76, 4, P.glow)}` : ''}`;
};
/** 딱정벌레: 결정 겉날개 + 뿔 + 다리. */
export const beetle = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M30 86l-12 10M36 92l-8 14M92 92l8 14M98 86l12 10M48 94l-2 14M80 94l2 14', 'none', ink(P.dark, 3.5))}${path('M24 70q0 -36 40 -36t40 36q0 24 -40 24t-40 -24z', P.base, k)}${path('M64 36v56', 'none', ink(P.ink, 2.5))}${path('M40 50l12 -8l6 12l-10 10zM88 50l-12 -8l-6 12l10 10z', P.light, 'opacity=".55"')}${path('M34 72l10 -6l8 8l-8 10zM94 72l-10 -6l-8 8l8 10z', P.light, 'opacity=".4"')}${circle(64, 34, 10, P.dark, k)}${path('M64 26l-6 -14l6 4l6 -4z', P.dark, k)}${E(P, 59, 34, 2.6)}${E(P, 69, 34, 2.6)}${o.crystals ? `${crystal(44, 56, 12, 16, P.accent, '#fff', P.ink)}${crystal(72, 54, 12, 18, P.accent, '#fff', P.ink)}` : ''}`;
};
/** 거미: 배 + 머리가슴 + 다리 8 + 눈 무리 + 실. */
export const spider = (P, o = {}) => {
    const k = ink(P.ink), legs = [[-1, 60], [-1, 72], [-1, 84], [-1, 94], [1, 60], [1, 72], [1, 84], [1, 94]].map(([s, y], i) => path(`M${64 + 14 * s} ${y}q${20 * s} ${-14 + (i % 4) * 6} ${40 * s} ${8 + (i % 4) * 10}`, 'none', ink(P.dark, 3.5))).join('');
    return `${o.thread ? line(64, 0, 64, 40, P.light, 1.5) : ''}${legs}${ellipse(64, 82, 24, 20, P.base, k)}${path('M52 74q12 -6 24 0M50 86q14 -6 28 0', 'none', ink(P.dark, 2.5))}${o.mark ? path('M64 70l6 10l-6 10l-6 -10z', P.accent, k) : ''}${circle(64, 54, 13, P.dark, k)}${E(P, 58, 52, 3)}${E(P, 70, 52, 3)}${circle(55, 58, 1.6, P.eye)}${circle(73, 58, 1.6, P.eye)}${circle(61, 46, 1.6, P.eye)}${circle(67, 46, 1.6, P.eye)}${path('M58 64l-4 6M70 64l4 6', 'none', ink(P.ink, 2.5))}`;
};
/** 따개비: 외벽 판 + 원뿔 껍질 + 깃털 다리. */
export const barnacle = (P, o = {}) => {
    const k = ink(P.ink), cone = (x, y, s) => `${path(`M${x - 18 * s} ${y}q${8 * s} ${-26 * s} ${18 * s} ${-28 * s}q${10 * s} ${2 * s} ${18 * s} ${28 * s}z`, P.base, k)}${path(`M${x - 10 * s} ${y}l${4 * s} ${-18 * s}M${x + 10 * s} ${y}l${-4 * s} ${-18 * s}`, 'none', ink(P.dark, 2))}${ellipse(x, y - 24 * s, 7 * s, 3 * s, P.ink)}${path(`M${x - 4 * s} ${y - 26 * s}q${4 * s} ${-10 * s} ${10 * s} ${-6 * s}M${x} ${y - 26 * s}q${2 * s} ${-12 * s} ${8 * s} ${-10 * s}`, 'none', ink(P.glow, 1.8))}`;
    return `${path('M14 104l20 -16h60l20 16z', P.dark, k)}${path('M34 88h60', 'none', ink(P.light, 2) + ' opacity=".4"')}${cone(40, 90, .8)}${cone(90, 90, .7)}${cone(64, 92, 1.1)}${E(P, 58, 84, 2.5)}${E(P, 70, 84, 2.5)}${o.rivets ? [24, 44, 64, 84, 104].map(x => circle(x, 100, 2, P.light)).join('') : ''}`;
};
/** 석상: 받침 + 흉상 + 머리 + 금. */
export const statue = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M28 110l6 -10h60l6 10z', P.dark, k)}${rect(40, 92, 48, 8, P.base, k)}${path('M44 92l4 -34h32l4 34z', P.base, k)}${path('M34 62l12 -6l2 24l-14 2zM94 62l-12 -6l-2 24l14 2z', P.light, k)}${path('M48 58q0 -10 16 -12t16 12', P.dark, k)}${path('M52 44q0 -16 12 -16t12 16v8q-12 6 -24 0z', P.base, k)}${rect(54, 40, 20, 5, P.ink, 'rx="2"')}${rect(56, 41.5, 16, 2, P.eye)}${glow(64, 42, 12, P.glow, .35)}${o.cracked ? path('M50 70l6 10l-4 10M78 64l-4 12l6 8M60 32l-4 6', 'none', ink(P.ink, 1.6)) : ''}${o.crystals ? `${crystal(42, 60, 12, 20, P.accent, '#fff', P.ink)}${crystal(74, 58, 14, 24, P.accent, '#fff', P.ink)}` : ''}${o.dim ? `${rect(56, 41.5, 16, 2, P.ink)}${path('M46 70q18 8 36 0', 'none', ink(P.ink, 2))}` : ''}${o.crown ? path('M52 30l4 -10l8 6l8 -6l4 10z', P.accent, k) : ''}${o.gears ? `${gear(40, 80, 7, 8, P.light, P.ink)}${gear(88, 78, 6, 8, P.light, P.ink)}` : ''}`;
};
/** 뱀: 두꺼운 S자 몸 + 삼각 머리 + 혀. */
export const serpent = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M20 96q10 -22 30 -16t30 -6q10 -14 -2 -30', 'none', ink(P.ink, 15))}${path('M20 96q10 -22 30 -16t30 -6q10 -14 -2 -30', 'none', ink(P.base, 11))}${path('M22 94q10 -18 28 -14', 'none', ink(P.light, 3) + ' opacity=".5"')}${o.stripes ? path('M40 84l4 -8M50 80l2 -8M62 78l0 -8M74 70l-4 -6', 'none', ink(P.dark, 3)) : ''}${path('M62 46q6 -16 24 -12t12 14q0 10 -16 10t-20 -12z', P.base, k)}${E(P, 86, 42, 3.5, 'slit')}${path('M98 50l12 2l-4 2l4 4l-12 -4z', P.accent)}${o.spark ? `${bolt(30, 60, 6, P.glow)}${bolt(50, 54, 5, P.glow)}` : ''}${o.smoke ? `${puff(28, 70, 7, P.glow, .5)}${puff(70, 90, 6, P.glow, .45)}` : ''}${o.suck ? circle(104, 50, 4, P.ink) : ''}`;
};
/** 지렁이 · 거머리: 마디 몸 + 둥근 아가리. */
export const worm = (P, o = {}) => {
    const k = ink(P.ink), segs = [[36, 100, 12], [46, 88, 13], [58, 78, 14], [72, 70, 15]].map(([x, y, r]) => circle(x, y, r, P.base, k)).join('');
    return `${segs}${path('M40 92q6 -2 10 2M52 80q6 -2 10 2M64 70q6 -2 10 2', 'none', ink(P.dark, 2.5))}${circle(88, 58, 20, P.dark, k)}${circle(88, 58, 12, P.ink)}${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return path(`M${88 + Math.cos(a) * 12} ${58 + Math.sin(a) * 12}L${88 + Math.cos(a) * 6} ${58 + Math.sin(a) * 6}L${88 + Math.cos(a + .35) * 12} ${58 + Math.sin(a + .35) * 12}z`, o.crystal ? P.accent : P.light); }).join('')}${o.eyes ? `${E(P, 76, 44, 2.5)}${E(P, 100, 44, 2.5)}` : ''}${o.suction ? circle(88, 58, 3, P.glow) : ''}`;
};
/** 두꺼비 · 슬라임: 부푼 몸 + 큰 눈 + (다리). */
export const toad = (P, o = {}) => {
    const k = ink(P.ink), sw = o.bloat ? 1.15 : 1;
    return `${o.legs ? `${path('M30 96l-12 8l6 4l14 -4zM98 96l12 8l-6 4l-14 -4z', P.dark, k)}` : ''}${ellipse(64, 80, 40 * sw, 28, P.base, k)}${ellipse(64, 88, 28 * sw, 16, P.light, 'opacity=".45"')}${o.warts ? [[40, 66], [86, 62], [60, 58], [92, 80]].map(([x, y]) => circle(x, y, 3.5, P.dark, 'opacity=".7"')).join('') : ''}${circle(48, 56, 11, P.base, k)}${circle(80, 56, 11, P.base, k)}${E(P, 48, 56, 6)}${E(P, 80, 56, 6)}${path('M44 86q20 10 40 0', 'none', ink(P.ink, 2.5))}${o.gas ? `${puff(104, 60, 7, P.glow, .55)}${puff(22, 62, 6, P.glow, .5)}` : ''}${o.drip ? path('M52 104q0 8 -3 12M78 104q0 8 3 12', 'none', ink(P.glow, 3)) : ''}`;
};
/** 슬라임(점액 덩어리): 흐르는 몸. */
export const slime = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M24 96q-6 -26 18 -38q8 -22 24 -20t22 22q22 12 16 36q-10 10 -40 10t-40 -10z', P.base, k)}${path('M34 88q4 -20 20 -28', 'none', ink(P.light, 4) + ' opacity=".5"')}${E(P, 54, 70, 5)}${E(P, 76, 70, 5)}${o.mouth ? path('M54 84q10 8 20 0', 'none', ink(P.ink, 2.5)) : ''}${o.spawn ? [[20, 104], [108, 100], [96, 110]].map(([x, y]) => `${ellipse(x, y, 7, 5, P.light, k)}${circle(x - 2, y - 1, 1.5, P.ink)}${circle(x + 2, y - 1, 1.5, P.ink)}`).join('') : ''}${o.drops ? `${path('M30 60q-4 -10 -2 -16M98 62q4 -10 2 -16', 'none', ink(P.glow, 3))}` : ''}`;
};
/** 유충: 마디 몸 + 큰 턱. */
export const larva = (P, o = {}) => {
    const k = ink(P.ink), segs = [[30, 92, 12], [44, 86, 14], [60, 82, 16], [78, 80, 17]].map(([x, y, r]) => ellipse(x, y, r, r * .85, P.base, k)).join('');
    return `${segs}${path('M24 100l-6 6M38 100l-2 8M54 100l0 8M72 98l2 8', 'none', ink(P.dark, 3))}${circle(94, 74, 16, P.dark, k)}${E(P, 90, 70, 4)}${E(P, 102, 72, 3)}${path('M100 86l12 8l-4 -12zM88 88l-6 12l10 -8z', P.light, k)}${o.spots ? [[44, 80], [60, 76], [78, 74]].map(([x, y]) => circle(x, y, 3, P.dark, 'opacity=".6"')).join('') : ''}${o.speed ? path('M12 80h10M8 90h14M14 100h8', 'none', ink(P.glow, 2) + ' opacity=".7"') : ''}`;
};
/** 사냥개(네발짐승): 몸 + 머리 턱 + 다리 + 꼬리 + 등 가시. */
export const hound = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M22 70q-12 -6 -14 -18q10 2 18 10', P.base, k)}${path('M28 66q6 -16 30 -16h26q16 0 20 14q2 12 -10 16l-6 14h-10l2 -12h-28l-4 12h-10l2 -14q-16 -2 -12 -14z', P.base, k)}${path('M34 60q10 -10 28 -8', 'none', ink(P.light, 3) + ' opacity=".4"')}${path('M90 56q18 -4 26 10q-4 10 -14 10l2 8l-12 -6q-10 -2 -8 -12z', P.base, k)}${path('M96 74l4 8l4 -8M104 74l3 6l3 -6', 'none', ink(P.light, 2))}${E(P, 100, 60, 3.5, 'angry')}${o.spines ? spikes(40, 52, 4, 10, 10, P.dark, P.ink) : ''}${o.fire ? `${path('M112 76q10 -6 10 -14q-2 6 -8 6q4 -8 0 -12q-2 10 -10 12q0 8 8 8z', P.glow, 'opacity=".9"')}` : ''}${o.spark ? `${bolt(52, 40, 6, P.glow)}${bolt(74, 42, 5, P.glow)}` : ''}${o.drool ? path('M100 78q0 8 -2 12', 'none', ink(P.glow, 3)) : ''}${o.bloat ? `${ellipse(60, 70, 18, 10, P.light, 'opacity=".35"')}${puff(24, 46, 6, P.glow, .5)}` : ''}`;
};
/** 도마뱀: 낮은 몸 + 꼬리 + 프리즘 비늘. */
export const lizard = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M28 84q-16 2 -20 -12q8 -2 14 4q0 -8 -6 -14q14 2 20 16z', P.base, k)}${path('M34 78q0 -20 30 -20h20q18 0 20 16q-2 12 -14 12h-44q-12 0 -12 -8z', P.base, k)}${path('M30 86l-6 10h8l4 -10zM54 86l-4 12h8l2 -12zM82 86l0 12h8l-2 -12z', P.dark, k)}${path('M92 58q16 -6 24 6q-4 8 -12 8l-14 -2z', P.base, k)}${E(P, 106, 62, 3, 'slit')}${o.prism ? [[44, 66, '#ff6b6b'], [56, 62, '#ffd166'], [68, 62, '#06d6a0'], [80, 64, '#4cc9f0'], [50, 74, '#c77dff']].map(([x, y, c]) => path(`M${x} ${y}l5 -6l5 6l-5 6z`, c, 'opacity=".85"')).join('') : ''}${o.heat ? `${path('M18 52q4 -8 0 -14M26 50q4 -8 0 -14', 'none', ink(P.glow, 2.5) + ' opacity=".8"')}` : ''}`;
};
/** 눈알: 떠 있는 눈 + 혈관 + 촉수 · 눈꺼풀. */
export const eyeball = (P, o = {}) => {
    const k = ink(P.ink), r = o.r || 30;
    return `${o.tendrils ? path(`M${64 - r * .7} ${70 + r * .6}q-10 14 -6 30M${64 + r * .7} ${70 + r * .6}q10 14 6 30M64 ${70 + r}q0 14 -6 26`, 'none', ink(P.dark, 4)) : ''}${glow(64, 68, r + 6, P.glow, .3)}${circle(64, 68, r, o.white || '#f3ecf0', k)}${path(`M${64 - r * .8} 60q${r * .4} -6 ${r * .6} 2M${64 + r * .8} 60q${-r * .4} -6 ${-r * .6} 2M${64 - r * .7} 84q${r * .4} 4 ${r * .6} -2M${64 + r * .7} 84q${-r * .4} 4 ${-r * .6} -2`, 'none', ink(P.accent, 1.6) + ' opacity=".7"')}${circle(64 + (o.look || 0), 68, r * .55, P.base, ink(P.dark, 2))}${circle(64 + (o.look || 0), 68, r * .5, P.glow, 'opacity=".35"')}${circle(64 + (o.look || 0), 68, r * .28, P.ink)}${circle(64 + (o.look || 0) - r * .18, 60, r * .12, '#fff', 'opacity=".9"')}${o.closed ? `${path(`M${64 - r} 68q${r} ${-r * .3} ${r * 2} 0q${-r} ${r * 1.2} ${-r * 2} 0z`, P.dark, k)}${path(`M${64 - r} 68q${r} ${r * .5} ${r * 2} 0`, 'none', ink(P.ink, 3))}${path(`M${64 - r * .6} ${74 + r * .2}l-4 6M64 ${76 + r * .2}v7M${64 + r * .6} ${74 + r * .2}l4 6`, 'none', ink(P.ink, 2.5))}` : ''}${o.lids ? `${path(`M${64 - r} 68q${r} ${-r * 1.3} ${r * 2} 0q${-r * .2} ${-r * .3} ${-r * 2} 0z`, P.dark, k)}` : ''}${o.rings ? `${circle(64, 68, r + 12, 'none', ink(P.glow, 2) + ' opacity=".6" stroke-dasharray="6 6"')}` : ''}${o.wings ? `${path(`M${64 - r} 62q-26 -16 -34 -2q10 -2 16 6q-8 4 -10 14q16 -4 28 -10zM${64 + r} 62q26 -16 34 -2q-10 -2 -16 6q8 4 10 14q-16 -4 -28 -10z`, P.dark, k)}` : ''}`;
};
/** 직조자(빛 · 로브): 긴 로브 + 빛 얼굴 + 손끝에서 뻗는 실. */
export const weaver = (P, o = {}) => {
    const k = ink(P.ink);
    return `${o.threads ? `${path('M30 70q-20 -20 -8 -46M98 70q20 -20 8 -46M36 74q-24 10 -22 34M92 74q24 10 22 34', 'none', ink(P.glow, 2) + ' opacity=".8"')}${[[22, 24], [106, 24], [14, 108], [114, 108]].map(([x, y]) => star(x, y, 4, 4, P.glow)).join('')}` : ''}${path('M44 112q-6 -40 6 -62h28q12 22 6 62z', P.base, k)}${path('M50 56q14 -6 28 0v50q-14 4 -28 0z', P.dark, 'opacity=".4"')}${path('M50 50l-16 22l8 6l12 -16zM78 50l16 22l-8 6l-12 -16z', P.base, k)}${circle(30, 78, 5, P.light, k)}${circle(98, 78, 5, P.light, k)}${path('M48 50q0 -24 16 -24t16 24q-8 8 -16 8t-16 -8z', P.dark, k)}${glow(64, 40, 12, P.glow, .6)}${o.faceless ? `${ellipse(64, 40, 8, 10, P.glow, 'opacity=".9"')}` : `${E(P, 59, 40, 2.5)}${E(P, 69, 40, 2.5)}`}${o.dawn ? `${circle(64, 14, 8, P.glow, 'opacity=".9"')}${glow(64, 14, 14, P.glow, .6)}` : ''}${o.loom ? `${rect(10, 86, 108, 3, P.accent)}${path('M20 86v-40M40 86v-50M88 86v-50M108 86v-40', 'none', ink(P.accent, 2))}` : ''}`;
};
/** 역행자(시계): 고리 + 눈금 + 거꾸로 도는 바늘 + 안쪽 형상. */
export const clockwork = (P, o = {}) => {
    const k = ink(P.ink), ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return line(64 + Math.cos(a) * 36, 66 + Math.sin(a) * 36, 64 + Math.cos(a) * 30, 66 + Math.sin(a) * 30, P.light, i % 3 ? 1.5 : 3); }).join('');
    return `${circle(64, 66, 42, P.dark, k)}${circle(64, 66, 36, P.base, ink(P.ink, 2))}${ticks}${path('M64 66l-18 -16M64 66l10 -24', 'none', ink(P.eye, 4))}${circle(64, 66, 4, P.eye)}${glow(64, 66, 20, P.glow, .3)}${o.figure ? `${path('M56 90q0 -14 8 -14t8 14z', P.ink, 'opacity=".8"')}${circle(64, 74, 5, P.ink)}${circle(62, 73, 1.4, P.eye)}${circle(66, 73, 1.4, P.eye)}` : ''}${o.reverse ? path('M28 44a40 40 0 0 1 12 -14l-2 8M100 88a40 40 0 0 1 -12 14l2 -8', 'none', ink(P.glow, 3)) : ''}${o.frozen ? `${path('M22 66h-8M106 66h8M64 24v-8M64 108v8', 'none', ink(P.light, 2))}${path('M40 40l-6 -6M88 40l6 -6M40 92l-6 6M88 92l6 6', 'none', ink(P.light, 2))}` : ''}${o.cap ? `${path('M40 26h48l-4 -10h-40z', P.accent, k)}${path('M44 16q20 -6 40 0', 'none', ink(P.ink, 2.5))}${star(64, 20, 4, 5, P.glow)}` : ''}${o.rust ? `${path('M30 50q8 6 16 2', 'none', ink(P.accent, 3))}${path('M92 80q-8 6 -16 2', 'none', ink(P.accent, 3))}` : ''}`;
};
/** 드레이크(비행 생물): 날개 + 긴 목 + 턱 + 꼬리. */
export const drake = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M48 60l-40 -24l12 24l-18 12l40 0z', P.dark, k)}${path('M80 60l40 -24l-12 24l18 12l-40 0z', P.dark, k)}${path('M30 100q6 -8 20 -10', 'none', ink(P.base, 6))}${path('M40 74q0 -16 24 -16t24 16q0 14 -24 16t-24 -16z', P.base, k)}${path('M80 66q10 -22 26 -24q8 2 10 10l-8 2l6 6q-10 6 -22 2q-6 4 -12 4z', P.base, k)}${E(P, 104, 50, 3, 'slit')}${path('M110 60l4 6l-8 -2zM100 62l2 6l-6 -4', P.light)}${path('M44 86l-4 14M84 86l4 14', 'none', ink(P.dark, 4))}${o.fire ? `${path('M116 60q12 2 8 12q-4 -4 -8 -2q6 6 0 12q-6 -8 -14 -8q2 -10 14 -14z', P.glow, 'opacity=".9"')}` : ''}${o.stars ? [[26, 44], [100, 36], [112, 90]].map(([x, y]) => star(x, y, 4, 4, P.glow)).join('') : ''}${o.dark ? `${circle(64, 74, 8, P.ink, 'opacity=".7"')}` : ''}${o.crown ? spikes(50, 58, 3, 10, 10, P.accent, P.ink) : ''}`;
};
/** 지배종(군체 상위 개체): 갑각 + 뿔 + 여러 눈 + 낫 팔. */
export const overlord = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M40 70l-26 -10l6 20l14 2zM88 70l26 -10l-6 20l-14 2z', P.dark, k)}${path('M24 82q-12 12 -4 26l6 -8l4 10q4 -14 -6 -28zM104 82q12 12 4 26l-6 -8l-4 10q-4 -14 6 -28z', P.base, k)}${path('M42 94q0 -36 22 -42t22 42q-10 10 -22 10t-22 -10z', P.base, k)}${path('M48 60q16 -8 32 0v30q-16 6 -32 0z', P.dark, 'opacity=".4"')}${horns(64, 54, 10, 22, P.dark, P.ink)}${E(P, 56, 68, 4)}${E(P, 72, 68, 4)}${circle(64, 62, 2.5, P.eye)}${circle(50, 76, 2, P.eye)}${circle(78, 76, 2, P.eye)}${path('M54 86q10 6 20 0', 'none', ink(P.ink, 2.5))}${path('M56 86l2 5M64 87l0 5M72 86l-2 5', 'none', ink(P.light, 2))}${o.pale ? `${path('M48 60q16 -8 32 0v30q-16 6 -32 0z', P.light, 'opacity=".4"')}` : ''}${o.crown ? path('M46 46l4 -14l8 8l6 -14l6 14l8 -8l4 14z', P.accent, k) : ''}${o.aura ? glow(64, 72, 44, P.glow, .25) : ''}${o.wings ? `${path('M40 70q-30 -30 -34 0q10 -6 20 2q-8 8 -4 20q14 -8 18 -22zM88 70q30 -30 34 0q-10 -6 -20 2q8 8 4 20q-14 -8 -18 -22z', P.dark, k)}` : ''}`;
};
/** 속 빈 갑주: 떠 있는 투구 + 흉갑 + 건틀릿, 안은 공허. */
export const hollow = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M46 56h36l6 40h-48z', P.base, k)}${path('M52 60h24l4 30h-32z', P.ink)}${glow(64, 76, 14, P.glow, .35)}${circle(64, 76, 4, P.glow)}${path('M30 60l14 -2l-2 16l-14 0zM98 60l-14 -2l2 16l14 0z', P.light, k)}${path('M26 80l-4 18l10 0l4 -16zM102 80l4 18l-10 0l-4 -16z', P.dark, k)}${path('M48 100h12l-2 12h-10zM68 100h12l0 12h-10z', P.dark, k)}${path('M52 44q0 -18 12 -18t12 18l-4 6h-16z', P.base, k)}${rect(54, 36, 20, 6, P.ink, 'rx="2"')}${rect(58, 38, 12, 2, P.glow)}${o.wind ? path('M20 40q10 -6 20 0M14 50q10 -6 20 0M94 40q10 -6 20 0', 'none', ink(P.light, 2) + ' opacity=".7"') : ''}`;
};
/** 촉수 덩어리(미끄럼이 · 잠복자 · 중력 아가리): 중심 입 + 촉수. */
export const kraken = (P, o = {}) => {
    const k = ink(P.ink), arm = (d) => `${path(d, 'none', ink(P.ink, 9))}${path(d, 'none', ink(P.base, 6))}`;
    const tents = ['M44 78q-26 -8 -30 -34q8 14 20 14', 'M50 72q-14 -26 2 -48q-4 20 10 32', 'M64 70q0 -30 22 -42q-10 16 -4 34', 'M78 72q14 -26 36 -26q-20 6 -24 26', 'M84 78q26 -10 36 8q-16 -8 -30 6', 'M40 84q-24 4 -32 24q12 -12 30 -10'].map(arm).join('');
    return `${tents}${ellipse(64, 86, 34, 22, P.base, k)}${ellipse(64, 86, 16, 11, P.ink)}${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return path(`M${64 + Math.cos(a) * 16} ${86 + Math.sin(a) * 11}L${64 + Math.cos(a) * 8} ${86 + Math.sin(a) * 5.5}L${64 + Math.cos(a + .3) * 16} ${86 + Math.sin(a + .3) * 11}z`, P.light); }).join('')}${o.eyes ? `${E(P, 46, 72, 4)}${E(P, 82, 72, 4)}` : ''}${o.gravity ? `${circle(64, 86, 44, 'none', ink(P.glow, 1.5) + ' opacity=".5" stroke-dasharray="4 8"')}${circle(64, 86, 56, 'none', ink(P.glow, 1) + ' opacity=".3" stroke-dasharray="3 10"')}` : ''}${o.slime ? path('M40 102q0 8 -4 12M88 102q0 8 4 12', 'none', ink(P.glow, 3)) : ''}`;
};
/** 가시 기둥: 벽에서 자란 뼈 기둥 + 혈관. */
export const pillar = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M24 112q10 -10 40 -10t40 10z', P.dark, k)}${path('M48 104l-2 -70q18 -14 36 0l-2 70z', P.base, k)}${path('M56 40q4 20 0 60M72 40q-4 20 0 60', 'none', ink(P.accent, 2.5) + ' opacity=".7"')}${path('M46 50l-14 -6l12 14zM82 50l14 -6l-12 14zM46 70l-16 -2l14 12zM82 70l16 -2l-14 12zM47 90l-12 2l12 8zM81 90l12 2l-12 8z', P.light, k)}${path('M64 20l-6 16h12z', P.light, k)}${E(P, 58, 62, 3)}${E(P, 70, 62, 3)}${o.pulse ? glow(64, 60, 20, P.glow, .3) : ''}`;
};
/** 근육 벽: 힘줄 슬래브 + 심장. */
export const wall = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M16 108l4 -78q22 -10 44 -10t44 10l4 78z', P.base, k)}${path('M30 36q6 30 2 66M50 26q4 40 0 80M78 26q-4 40 0 80M98 36q-6 30 -2 66', 'none', ink(P.dark, 4) + ' opacity=".7"')}${path('M24 56q40 10 80 0M22 80q42 10 84 0', 'none', ink(P.light, 3) + ' opacity=".4"')}${path('M64 56q-14 -12 -16 4q0 12 16 22q16 -10 16 -22q-2 -16 -16 -4z', P.accent, k)}${glow(64, 68, 16, P.glow, .4)}${E(P, 40, 46, 3)}${E(P, 88, 46, 3)}${o.heal ? path('M36 90l6 -6l6 6M84 90l6 -6l6 6', 'none', ink(P.glow, 2)) : ''}`;
};
/** 거대 군체(폭군 · 모체): 알주머니를 두른 큰 몸 + 턱. */
export const broodmother = (P, o = {}) => {
    const k = ink(P.ink);
    return `${path('M14 104q0 -40 50 -44t50 44q-20 10 -50 10t-50 -10z', P.base, k)}${[[30, 92], [52, 98], [76, 98], [98, 92]].map(([x, y]) => `${ellipse(x, y, 9, 11, P.light, ink(P.ink, 2))}${circle(x, y + 2, 3.5, P.dark, 'opacity=".6"')}`).join('')}${path('M40 64q0 -30 24 -30t24 30q-12 10 -24 10t-24 -10z', P.dark, k)}${horns(64, 40, 10, 20, P.dark, P.ink)}${E(P, 54, 56, 4.5)}${E(P, 74, 56, 4.5)}${circle(64, 48, 3, P.eye)}${path('M48 72l6 10l-2 -12M80 72l-6 10l2 -12M60 74l4 8l4 -8', P.light, k)}${o.crown ? path('M44 36l4 -16l10 10l6 -18l6 18l10 -10l4 16z', P.accent, k) : ''}${o.tentacles ? path('M14 96q-12 -6 -10 -20M114 96q12 -6 10 -20', 'none', ink(P.dark, 5)) : ''}${o.aura ? glow(64, 80, 50, P.glow, .25) : ''}`;
};
/** 칠흑 베스퍼: 정적의 망령 — 봉인된 입, 소리 없는 종, 흩어지는 음표 대신 꺼진 파문. */
export const vesper = (P) => {
    const k = ink(P.ink);
    return `${circle(64, 68, 50, 'none', ink(P.glow, 1.2) + ' opacity=".35" stroke-dasharray="2 10"')}${glow(64, 66, 36, P.glow, .3)}${path('M26 112q6 -14 0 -26v-30q0 -34 38 -34t38 34v30q-6 12 0 26q-10 -10 -18 -2q-8 -10 -20 0q-12 -10 -20 0q-8 -8 -18 2z', P.base, k)}${path('M36 56q0 -22 28 -22t28 22v14q-14 -8 -28 -8t-28 8z', P.dark, 'opacity=".6"')}${path('M44 60q6 -6 12 0M72 60q6 -6 12 0', 'none', ink(P.eye, 3))}${path('M54 78h20', 'none', ink(P.accent, 3))}${path('M56 74v8M62 74v8M68 74v8M74 74v8', 'none', ink(P.accent, 2))}${path('M20 46q-10 -8 -6 -20q6 10 14 12zM108 46q10 -8 6 -20q-6 10 -14 12z', P.dark, k)}${path('M64 26l0 -12', 'none', ink(P.accent, 2.5))}${path('M56 14q8 -8 16 0', 'none', ink(P.accent, 2.5))}${circle(64, 8, 3, P.glow)}`;
};
/** 칠흑 할더: 여섯 팔의 결정 석상 — 팔마다 채굴 결정. */
export const halder = (P) => {
    const k = ink(P.ink), arm = (x, y, dx, dy, i) => `${path(`M${x} ${y}l${dx} ${dy}`, 'none', ink(P.base, 9))}${path(`M${x} ${y}l${dx} ${dy}`, 'none', ink(P.ink, 1.5) + ' opacity=".4"')}${crystal(x + dx - 7, y + dy + 2, 14, 18 + (i % 2) * 6, P.accent, '#fff', P.ink)}`;
    return `${glow(64, 70, 40, P.glow, .25)}${path('M26 112l6 -12h64l6 12z', P.dark, k)}${arm(50, 70, -32, -26, 0)}${arm(78, 70, 32, -26, 1)}${arm(48, 78, -38, -2, 2)}${arm(80, 78, 38, -2, 3)}${arm(50, 86, -30, 18, 4)}${arm(78, 86, 30, 18, 5)}${path('M44 100l4 -40h32l4 40z', P.base, k)}${path('M50 64q14 -6 28 0v30q-14 4 -28 0z', P.light, 'opacity=".25"')}${path('M50 60q0 -10 14 -12t14 12', P.dark, k)}${path('M52 46q0 -18 12 -18t12 18v6q-12 6 -24 0z', P.base, k)}${rect(54, 42, 20, 5, P.ink, 'rx="2"')}${rect(56, 43.5, 16, 2, P.accent)}${crystal(58, 30, 12, 16, P.accent, '#fff', P.ink)}${path('M56 72l4 8l-3 8M72 72l-4 8l3 8', 'none', ink(P.glow, 2))}`;
};
/** 칠흑 미렌: 늪 위를 떠도는 거대한 눈 — 감기는 눈꺼풀, 아래로 늘어지는 촉수. */
export const mirren = (P) => {
    const k = ink(P.ink);
    return `${path('M34 90q-12 16 -6 34M50 96q-6 16 0 30M78 96q6 16 0 30M94 90q12 16 6 34', 'none', ink(P.dark, 5))}${glow(64, 64, 44, P.glow, .3)}${path('M14 64q50 -50 100 0q-50 50 -100 0z', '#e9dcea', k)}${path('M20 64q44 -38 88 0', 'none', ink(P.accent, 1.5) + ' opacity=".7"')}${path('M30 60q6 -10 16 -8M98 60q-6 -10 -16 -8M28 70q8 8 18 6M100 70q-8 8 -18 6', 'none', ink(P.accent, 1.5) + ' opacity=".6"')}${circle(64, 64, 20, P.base, ink(P.dark, 2))}${circle(64, 64, 18, P.glow, 'opacity=".3"')}${circle(64, 64, 10, P.ink)}${circle(58, 58, 3, '#fff', 'opacity=".9"')}${path('M14 64q50 -50 100 0q-50 -22 -100 0z', P.dark, k)}${path('M24 50q40 -28 80 0', 'none', ink(P.light, 2) + ' opacity=".4"')}${path('M28 44l-4 -8M44 34l-2 -10M64 30v-10M84 34l2 -10M100 44l4 -8', 'none', ink(P.ink, 3))}${circle(64, 100, 4, P.glow, 'opacity=".9"')}${circle(40, 108, 3, P.glow, 'opacity=".7"')}${circle(90, 110, 3, P.glow, 'opacity=".7"')}`;
};
/** 칠흑 솔렌: 빛을 짠 첫 직조자 — 베틀 뒤 로브, 얼굴은 빛, 양손에서 빛실. */
export const solenne = (P) => {
    const k = ink(P.ink);
    return `${rect(8, 104, 112, 4, P.accent, 'rx="2"')}${path('M16 104v-56M32 104v-72M96 104v-72M112 104v-56', 'none', ink(P.accent, 2.5))}${path('M16 48h16M96 32h16', 'none', ink(P.accent, 2.5))}${[20, 24, 28].map(x => line(x, 104, x, 50 + (x - 20), P.glow, 1.2, 'opacity=".7"')).join('')}${[100, 104, 108].map(x => line(x, 104, x, 34 + (108 - x), P.glow, 1.2, 'opacity=".7"')).join('')}${glow(64, 60, 40, P.glow, .3)}${path('M42 112q-8 -44 8 -66h28q16 22 8 66z', P.base, k)}${path('M50 50q14 -6 28 0v54q-14 4 -28 0z', P.dark, 'opacity=".5"')}${path('M50 48l-20 18l6 6l16 -14zM78 48l20 18l-6 6l-16 -14z', P.base, k)}${path('M30 66q-16 -24 2 -44M98 66q16 -24 -2 -44', 'none', ink(P.glow, 2.5))}${path('M30 66q-22 10 -18 40M98 66q22 10 18 40', 'none', ink(P.glow, 2))}${circle(30, 66, 5, P.accent, k)}${circle(98, 66, 5, P.accent, k)}${path('M48 46q0 -26 16 -26t16 26q-8 8 -16 8t-16 -8z', P.dark, k)}${ellipse(64, 36, 9, 11, P.glow, 'opacity=".95"')}${glow(64, 36, 14, '#fff', .5)}${path('M44 18q20 -14 40 0', 'none', ink(P.accent, 3))}${star(64, 10, 6, 4, P.accent)}${[[20, 20], [108, 18], [12, 90], [116, 92]].map(([x, y]) => star(x, y, 4, 4, P.glow)).join('')}`;
};
