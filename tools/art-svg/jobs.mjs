// 코프룰루 계보 문장(엠블럼) 2장(128×128). 기존 계보 그림(원형 배지 · 계열 색 테두리 · 반짝임)과 같은 틀.
import { svg, radial, blur, circle, path, line, ink, star, spark, glow, drop } from './lib.mjs';

const badge = (rim, body) => svg(128, `${circle(64, 64, 60, 'url(#bg)', ink('#0b1316', 3))}${circle(64, 64, 60, 'none', ink(rim, 4))}${circle(64, 64, 53, 'none', ink('#0b1316', 2) + ' opacity=".7"')}${body}${spark(34, 36, 4, '#fff1c2')}${spark(96, 34, 3, '#fff1c2')}${spark(100, 92, 3, '#ffcf80')}`, `${radial('bg', '#1f3a40', '#0d1a1e')}${blur('gl', 4)}`);
export const JOBS = [
    {
        // 강철 보병: 소총 + 성단 별 세 개 + 참호 흙더미. 물리 계열 색.
        id: 'irTrooper', rim: '#d88a68', draw: () => `${path('M24 96q20 -14 40 -2q20 -10 40 2', 'none', ink('#3b4756', 10))}${path('M24 96q20 -14 40 -2q20 -10 40 2', 'none', ink('#5a6878', 6))}${path('M30 86l50 -44l6 6l-10 10l6 4l-14 10l-4 -4l-22 20l-10 2z', '#9fb0c2', ink('#0b1316', 3))}${path('M60 88l4 10', 'none', ink('#0b1316', 3))}${glow(90, 36, 12, '#ffb86b', .6)}${star(90, 36, 9, 5, '#ffd27a', ink('#0b1316', 1.5))}${star(70, 22, 5, 5, '#ffd27a')}${star(106, 54, 5, 5, '#ffd27a')}${line(70, 22, 90, 36, '#ffd27a', 1.2, 'opacity=".6"')}${line(90, 36, 106, 54, '#ffd27a', 1.2, 'opacity=".6"')}`,
    },
    {
        // 군체 조율사: 포자 주머니 + 신경 촉각 + 독 방울. 상태이상 계열 색.
        id: 'hvSporeGatherer', rim: '#b6c86a', draw: () => `${path('M64 36q26 2 30 32q0 22 -30 32q-30 -10 -30 -32q4 -30 30 -32z', '#5f8a1c', ink('#0b1316', 3))}${path('M46 56q16 -14 36 0', 'none', ink('#b6e05a', 3) + ' opacity=".6"')}${[[52, 70], [64, 62], [76, 72], [60, 84], [72, 86]].map(([x, y]) => `${circle(x, y, 5, '#c6ff5a', ink('#0b1316', 2))}${circle(x - 1.5, y - 1.5, 1.6, '#fff', 'opacity=".7"')}`).join('')}${path('M40 50q-16 -8 -20 -26M88 50q16 -8 20 -26', 'none', ink('#8a3f5e', 4))}${circle(20, 24, 5, '#c6ff5a', ink('#0b1316', 2))}${circle(108, 24, 5, '#c6ff5a', ink('#0b1316', 2))}${glow(20, 24, 9, '#c6ff5a', .5)}${glow(108, 24, 9, '#c6ff5a', .5)}${drop(64, 108, 5, '#c6ff5a', '#0b1316')}`,
    },
];
export const renderJob = (j) => badge(j.rim, j.draw());
