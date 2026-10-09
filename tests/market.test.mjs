// v3.212 주화 증권거래소(공유 시장): 결정론적 시세 · 인스턴스 캐시 · 매수 · 매도 · 한도 · 시세 조각 · 환생/승천.
import { assert, test, act, newState } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { load } = loadGame();
const market = await load('systems/market'), data = await load('data/market');
const { MARKET, MARKET_TICK_MS, STOCKS, buyCost, sellGain, marketTick } = data;
const T = 3_000_000 * MARKET_TICK_MS + 1234;

test('v3.212 market: shared deterministic prices, cached window = direct calculation, hidden behind the server key', () => {
    const t = marketTick(T), w = market.marketWindow(T);
    assert.equal(w.tick, t); assert.equal(w.rows.length, MARKET.history); assert.equal(market.marketWindow(T), w, 'same tick → same cached window');
    for (const [i, d] of STOCKS.entries()) assert.equal(w.rows.at(-1)[i], market.stockSeries(d.id, t, t)[0], `${d.id}: cache = direct`);
    const run = market.stockSeries('arcane', t - 200, t);
    for (let i = 0; i < run.length; i += 7) assert.equal(run[i], market.stockSeries('arcane', t - 200 + i, t - 200 + i)[0], 'chart = trade price on every tick (across blocks)');
    const before = STOCKS.map(d => market.stockPrice(d.id, t));
    market.setMarketKey('another-server-key');
    assert.notDeepEqual(STOCKS.map(d => market.stockPrice(d.id, t)), before, 'prices depend on the server key (cache cleared on key change)');
    market.setMarketKey('tidebound-local-market-key');
    assert.deepEqual(STOCKS.map(d => market.stockPrice(d.id, t)), before);
    for (const d of STOCKS) { const x = market.stockPrice(d.id, t); assert.ok(x >= d.base * MARKET.floor - .1 && x <= d.base * MARKET.ceil + .1, `${d.id} in range`); }
});

test('v3.212 market: buy/sell settle at the server tick price with fees, cap, daily limit and realized PnL', () => {
    const s = newState(0), p = market.stockPrice('lith', marketTick(T)), c = buyCost(p, 5);
    s.dungeonCoins = 10;
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: '5' }, T), /주화가 부족/);
    assert.equal(s.market, undefined, 'failed buy opens nothing');
    assert.throws(() => act(s, { type: 'market', id: 'sell:lith', value: '1' }, T), /갖고 있지 않/);
    s.dungeonCoins = 10000;
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: '0' }, T), /정수/);
    assert.throws(() => act(s, { type: 'market', id: 'buy:nope', value: '1' }, T), /없는 종목/);
    act(s, { type: 'market', id: 'buy:lith', value: '5' }, T);
    assert.equal(s.dungeonCoins, 10000 - c.total); assert.deepEqual(s.market.holdings.lith, { qty: 5, cost: c.total }); assert.equal(s.market.trades, 1);
    assert.ok(c.fee >= 1 && c.total === c.gross + c.fee);
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: String(Math.ceil(MARKET.maxCost / p) + 1) }, T), /총 보유 원금/);
    assert.throws(() => act(s, { type: 'market', id: 'sell:lith', value: '6' }, T), /갖고 있지 않/);
    const later = T + 5 * MARKET_TICK_MS, q = market.stockPrice('lith', marketTick(later)), g = sellGain(q, 2), part = Math.round(c.total * 2 / 5);
    const coins = s.dungeonCoins; act(s, { type: 'market', id: 'sell:lith', value: '2' }, later);
    assert.equal(s.dungeonCoins, coins + g.net); assert.deepEqual(s.market.holdings.lith, { qty: 3, cost: c.total - part }); assert.equal(s.market.realized, g.net - part);
    act(s, { type: 'market', id: 'sell:lith', value: '3' }, later);
    assert.equal(s.market.holdings.lith, undefined, 'selling everything clears the line');
    s.market.trades = MARKET.tradesPerDay;
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: '1' }, later), /하루/);
    act(s, { type: 'market', id: 'buy:lith', value: '1' }, later + 86400000);
    assert.equal(s.market.trades, 1, 'daily trade count resets on the next KST day');
});

test('v3.212 market feed: only past ticks, full day first, then only new ticks, nothing when up to date', () => {
    const t = marketTick(T), f = market.marketFeed('', T);
    assert.equal(f.tick, t); assert.equal(f.from, t - MARKET.history + 1); assert.equal(f.prices.length, MARKET.history); assert.equal(f.prices[0].length, STOCKS.length);
    assert.deepEqual(f.prices.at(-1), STOCKS.map(d => market.stockSeries(d.id, t, t)[0]), 'last row = current prices, no future rows');
    assert.ok(STOCKS.some(d => d.id === f.rumor.stock) && typeof f.rumor.up === 'boolean');
    assert.equal(market.marketFeed(String(t), T), null, 'up to date → nothing');
    const n = market.marketFeed(String(t), T + 2 * MARKET_TICK_MS);
    assert.equal(n.from, t + 1); assert.equal(n.prices.length, 2);
    assert.equal(market.marketFeed(String(t - 1000), T + 2 * MARKET_TICK_MS).prices.length, MARKET.history, 'long gap → full day again');
    let hit = 0, total = 0;
    for (let k = 0; k < 3000; k++) { const r = market.rumorAt(t + k), a = market.stockSeries(r.stock, t + k, t + k + 1); if (a[1] === a[0]) continue; total++; if ((a[1] > a[0]) === r.up) hit++; }
    assert.ok(hit / total > .58 && hit / total < .8, `rumor accuracy ${hit / total}`);
});

test('v3.212 market: holdings survive rebirth, ascension clears them', () => {
    const s = newState(0); s.level = 100; s.dungeonCoins = 5000;
    act(s, { type: 'market', id: 'buy:henesys', value: '3' }, T);
    const kept = JSON.parse(JSON.stringify(s.market));
    act(s, { type: 'rebirth' }, T);
    assert.deepEqual(s.market, kept);
    s.rebirths = 100; delete s.dungeon; act(s, { type: 'ascend' }, T + 1000);
    assert.equal(s.market, undefined);
});
