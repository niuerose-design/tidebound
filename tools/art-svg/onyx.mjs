// 칠흑 장신구 4종(64×64). components/game/onyx-art.tsx 의 기존 장신구와 같은 톤(칠흑 바탕 · 보랏빛 번짐 · 금테).
import { svg, blur, circle, path, rect, ink, ellipse, star, glow, crystal, spark } from './lib.mjs';

const K = '#050308';
export const ONYX = [
    {
        // 정적의 귀마개(베스퍼): 머리띠로 이어진 두 귀마개, 안쪽은 소리가 꺼진 보랏빛 파문.
        id: 'onyxVesper', draw: () => `${path('M14 34q0 -24 18 -24t18 24', 'none', ink('#4a3a58', 5))}${path('M14 34q0 -24 18 -24t18 24', 'none', ink('#8a6aa0', 2))}${[14, 50].map(x => `${ellipse(x, 40, 9, 12, '#1f1626', ink('#6b2d75', 2))}${ellipse(x, 40, 5, 8, '#7a2a86', 'opacity=".8"')}${circle(x, 40, 2, '#f2b8ff')}${glow(x, 40, 8, '#b05fc0', .5)}`).join('')}${path('M26 44h12', 'none', ink('#d4af37', 2) + ' stroke-dasharray="2 3"')}${star(32, 56, 3, 4, '#d4af37')}`,
    },
    {
        // 여섯 팔의 결정 반지(할더): 칠흑 반지 둘레에 보랏빛 결정 여섯이 팔처럼 솟음.
        id: 'onyxHalder', draw: () => `${circle(32, 36, 16, 'none', ink('#1f1626', 9))}${circle(32, 36, 16, 'none', ink('#6b2d75', 2))}${circle(32, 36, 16, 'none', ink('#d4af37', 1.2) + ' opacity=".8"')}${Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + (i / 6) * Math.PI * 2, x = 32 + Math.cos(a) * 24, y = 36 + Math.sin(a) * 24; return `<g transform="rotate(${(a * 180) / Math.PI + 90} ${x} ${y})">${crystal(x - 5, y + 2, 10, 14, '#a78bfa', '#fff', K)}</g>`; }).join('')}${circle(32, 36, 5, '#c4b5fd', ink(K, 1.5))}${glow(32, 36, 10, '#a78bfa', .6)}`,
    },
    {
        // 감긴 눈의 목걸이(미렌): 사슬 아래 눈꺼풀이 감긴 눈 펜던트, 속눈썹 세 가닥.
        id: 'onyxMirren', draw: () => `${path('M8 8q24 22 48 0', 'none', ink('#d4af37', 2.5) + ' stroke-dasharray="3 2"')}${path('M32 20v8', 'none', ink('#d4af37', 2))}${circle(32, 20, 2.5, '#d4af37')}${path('M12 40q20 -24 40 0q-20 24 -40 0z', '#1f1626', ink('#6b2d75', 2))}${path('M12 40q20 -24 40 0', 'none', ink('#b3001b', 1.5) + ' opacity=".7"')}${path('M14 40q18 10 36 0', 'none', ink('#f2b8ff', 2.5))}${path('M20 46l-2 5M32 48v6M44 46l2 5', 'none', ink('#f2b8ff', 2))}${glow(32, 40, 12, '#b05fc0', .45)}`,
    },
    {
        // 첫 직조의 실타래(솔렌): 칠흑 실패에 감긴 금빛 빛실, 풀려 나가는 실 끝에 별.
        id: 'onyxSolenne', draw: () => `${rect(20, 12, 24, 40, '#1f1626', 'rx="4" ' + ink('#6b2d75', 2))}${rect(16, 8, 32, 6, '#4a3a58', 'rx="2" ' + ink(K, 1.5))}${rect(16, 50, 32, 6, '#4a3a58', 'rx="2" ' + ink(K, 1.5))}${[18, 24, 30, 36, 42].map(y => path(`M20 ${y}q12 -4 24 0`, 'none', ink('#ffe9a0', 2.2))).join('')}${[21, 27, 33, 39, 45].map(y => path(`M20 ${y}q12 4 24 0`, 'none', ink('#d4af37', 1.6) + ' opacity=".8"')).join('')}${path('M44 46q12 2 14 12', 'none', ink('#ffe9a0', 2))}${star(58, 58, 4, 4, '#fff5c0')}${glow(32, 32, 16, '#d4af37', .3)}${spark(10, 20, 2.5, '#fff5c0')}`,
    },
];
export const renderOnyx = (o) => svg(64, o.draw(), blur('gl', 2.5));
