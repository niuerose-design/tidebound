// v3.212 주화 증권거래소 시세 점검: node scripts/check-market.mjs [계좌 수=40]
// 계산 속도, 종목별 하루 변동 · 기준가 이탈 폭, 그리고 '공략'(싸게 사서 하루 들기 · 소문 따라 한 틱 거래)의 수수료 뺀 기대 수익을 봅니다.
// 기대 수익이 왕복 수수료(2%)를 크게 넘으면 거래소가 주화를 찍어내는 곳이 되므로 σ · λ · 수수료를 다시 봅니다.
import { loadGame } from './lib/game-modules.mjs';
const { load } = loadGame();
const { stockSeries, rumorAt } = await load('systems/market');
const { STOCKS, MARKET, buyCost, sellGain } = await load('data/market');
const seeds = Number(process.argv[2]) || 40, DAY = 144, SPAN = DAY * 30, T0 = 3_000_000;

let t = performance.now();
for (let i = 0; i < 20; i++) for (const d of STOCKS) stockSeries(1000 + i, d.id, T0, T0);
console.log(`가격 1개(6종목) 계산: ${((performance.now() - t) / 20).toFixed(2)}ms · 하루치 보내기(6종목 × 144틱)도 거의 같음`);
t = performance.now(); for (const d of STOCKS) stockSeries(7, d.id, T0 - DAY + 1, T0); console.log(`하루치 시세 조각: ${(performance.now() - t).toFixed(2)}ms`);

const net = (buy, sell) => { const q = Math.max(1, Math.floor(1000 / buy)), c = buyCost(buy, q), g = sellGain(sell, q); return (g.net - c.total) / c.total; };
const pct = x => `${(x * 100).toFixed(2)}%`, mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length), sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const bad = [];
console.log('\n종목 | 하루 변동 | 기준가 이탈(로그 σ) | 바닥·천장 % | 아무 때나 하루 | 1σ 아래 사서 하루 | 소문 따라 한 틱');
for (const d of STOCKS) {
    const daily = [], dev = [], hold = [], dip = [], rumor = [];
    let clamp = 0, n = 0;
    for (let k = 0; k < seeds; k++) {
        const seed = 101 + k * 7919, p = stockSeries(seed, d.id, T0, T0 + SPAN);
        for (let i = 0; i < p.length; i++) { const r = p[i] / d.base; dev.push(Math.log(r)); n++; if (r <= MARKET.floor + 1e-9 || r >= MARKET.ceil - 1e-9) clamp++; }
        for (let i = 0; i + DAY < p.length; i += DAY) daily.push(Math.log(p[i + DAY] / p[i]));
        const s = sd(dev.slice(-p.length));
        for (let i = 0; i + DAY < p.length; i += 12) { hold.push(net(p[i], p[i + DAY])); if (Math.log(p[i] / d.base) < -s) dip.push(net(p[i], p[i + DAY])); }
        for (let i = 0; i + 1 < p.length; i++) { const r = rumorAt(seed, T0 + i); if (r.stock === d.id && r.up) rumor.push(net(p[i], p[i + 1])); }
    }
    if (mean(hold) > .01 || mean(dip) > .05 || mean(rumor) > 0) bad.push(d.name);
    console.log(`${d.name} | ${pct(sd(daily))} | ${pct(sd(dev))} | ${pct(clamp / n)} | ${pct(mean(hold))} | ${pct(mean(dip))} (${dip.length}) | ${pct(mean(rumor))} (${rumor.length})`);
}
console.log(`\n상한: 원금 ${MARKET.maxCost} · 하루 ${MARKET.tradesPerDay}회. '1σ 아래 사서 하루' 수익률 × ${MARKET.maxCost} ≈ 하루 기대 이익(헬 하루 보너스 1,200과 비교).`);
if (bad.length) { console.error(`기대 수익이 너무 큰 종목: ${bad.join(', ')} (아무 때나 하루 > 1% · 1σ 아래 하루 > 5% · 소문 > 0%)`); process.exit(1); }
