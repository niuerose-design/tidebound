// SVG 그림 생성 공용 도구. 모든 그림은 외부 참조 없이 한 파일로 닫히고, 글자 · 스크립트를 넣지 않습니다.
export const esc = (s) => String(s);
/** 루트 svg. 몬스터는 128, 스킬 · 칠흑은 64 좌표계. */
export const svg = (vb, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${vb}" height="${vb}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
/** 흐림 필터(은은한 빛). */
export const blur = (id, sd = 3) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
export const radial = (id, c1, c2, o1 = 1, o2 = 0) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c1}" stop-opacity="${o1}"/><stop offset="1" stop-color="${c2}" stop-opacity="${o2}"/></radialGradient>`;
export const linear = (id, c1, c2, rot = 90) => `<linearGradient id="${id}" gradientTransform="rotate(${rot} .5 .5)"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
/** 선(먹선) 속성. */
export const ink = (c, w = 2.5) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
export const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
export const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
export const line = (x1, y1, x2, y2, c, w = 2.5, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
export const g = (body, extra = '') => `<g ${extra}>${body}</g>`;
/** 빛 번짐 원. */
export const glow = (cx, cy, r, c, o = .35, f = 'gl') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${o}" filter="url(#${f})"/>`;
/** 눈: 흰자 없이 빛나는 눈(괴물용). */
export const eye = (cx, cy, r, c, pupil = '#0b0810', shape = 'round') => shape === 'slit'
    ? `${circle(cx, cy, r, c)}${ellipse(cx, cy, r * .3, r * .85, pupil)}`
    : shape === 'angry'
        ? `${path(`M${cx - r} ${cy - r * .2}l${r * 2} ${-r * .6}v${r * 1.6}h${-r * 2}z`, c)}${circle(cx + r * .1, cy + r * .2, r * .4, pupil)}`
        : `${circle(cx, cy, r, c)}${circle(cx + r * .15, cy + r * .1, r * .45, pupil)}${circle(cx - r * .3, cy - r * .35, r * .22, '#fff', 'opacity=".8"')}`;
/** 작은 반짝임(십자별). */
export const spark = (cx, cy, s, c, o = .9) => path(`M${cx} ${cy - s}q${s * .15} ${s * .85} ${s} ${s}q${-s * .85} ${s * .15} ${-s} ${s}q${-s * .15} ${-s * .85} ${-s} ${-s}q${s * .85} ${-s * .15} ${s} ${-s}z`, c, `opacity="${o}"`);
/** 뿔 두 개. */
export const horns = (cx, cy, w, h, c, k) => `${path(`M${cx - w} ${cy}q${-w * .6} ${-h * .5} ${-w * .3} ${-h}q${w * .3} ${h * .5} ${w * .9} ${h * .7}z`, c, ink(k, 2))}${path(`M${cx + w} ${cy}q${w * .6} ${-h * .5} ${w * .3} ${-h}q${-w * .3} ${h * .5} ${-w * .9} ${h * .7}z`, c, ink(k, 2))}`;
/** 결정 조각(위로 솟는 삼각 결정). */
export const crystal = (x, y, w, h, c, hi, k) => `${path(`M${x} ${y}l${w * .5} ${-h}l${w * .5} ${h}z`, c, ink(k, 2))}${path(`M${x + w * .5} ${y - h}l${w * .22} ${h * .55}l${-w * .22} ${h * .45}z`, hi, 'opacity=".7"')}`;
/** 가시 줄(위쪽 방향). */
export const spikes = (x, y, n, step, h, c, k) => Array.from({ length: n }, (_, i) => path(`M${x + i * step} ${y}l${step * .5} ${-h}l${step * .5} ${h}z`, c, ink(k, 1.8))).join('');
/** 연기 · 안개 덩어리. */
export const puff = (cx, cy, r, c, o = .5) => `${circle(cx, cy, r, c, `opacity="${o}"`)}${circle(cx + r * .9, cy - r * .3, r * .7, c, `opacity="${o}"`)}${circle(cx - r * .8, cy - r * .2, r * .6, c, `opacity="${o}"`)}`;
/** 물방울(독 · 피). */
export const drop = (cx, cy, s, c, k) => path(`M${cx} ${cy - s}c${s * .9} ${s * 1.2} ${s * .9} ${s * 1.4} 0 ${s * 2.4}c${-s * .9} ${-s} ${-s * .9} ${-s * 1.2} 0 ${-s * 2.4}z`, c, k ? ink(k, 1.5) : '');
/** 번개 선. */
export const bolt = (x, y, s, c, w = 2) => path(`M${x} ${y}l${-s * .4} ${s}h${s * .5}l${-s * .5} ${s * 1.1}l${s * 1.2} ${-s * 1.4}h${-s * .55}l${s * .35} ${-s * .7}z`, c, `stroke="${c}" stroke-width="${w * .3}" stroke-linejoin="round"`);
/** 톱니바퀴. */
export const gear = (cx, cy, r, n, c, k, hole = .35) => {
    let d = '';
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
        const ro = r, ri = r * .78;
        const p = (a, rr) => `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
        d += `${i ? 'L' : 'M'}${p(a0 - .12, ri)}L${p(a0 - .08, ro)}L${p(a0 + .08, ro)}L${p(a0 + .12, ri)}L${p(a1 - .14, ri)}`;
    }
    return `${path(d + 'z', c, ink(k, 2))}${circle(cx, cy, r * hole, k)}`;
};
/** 다각형(정n각). */
export const poly = (cx, cy, r, n, c, extra = '', rot = -Math.PI / 2) => path(Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2; return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`; }).join('') + 'z', c, extra);
/** 별(n꼭지). */
export const star = (cx, cy, r, n, c, extra = '', inner = .45) => path(Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * inner : r; return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join('') + 'z', c, extra);
/** 둥근 그림자(바닥). */
export const shadow = (cx, cy, rx, ry = rx * .3, o = .35) => ellipse(cx, cy, rx, ry, '#000', `opacity="${o}" filter="url(#gl)"`);
