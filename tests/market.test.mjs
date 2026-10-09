// v3.212 주화 증권거래소(개인 시장): 계좌 · 결정론적 시세 · 매수 · 매도 · 한도 · 시세 조각 · 환생/승천.
import { assert, test, act, newState } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { load } = loadGame();
const market = await load('systems/market'), data = await load('data/market');
const { MARKET, MARKET_TICK_MS, STOCKS, buyCost, sellGain, marketTick } = data;
const fixed = () => .5, T = 3_000_000 * MARKET_TICK_MS + 1234;

test('v3.212 market: open account once, price is per-seed deterministic and hidden behind the server key', () => {
    const s = newState(0);
    assert.throws(() => act(s, { type: 'market', id: 'buy:perion', value: '1' }, T), /계좌를 여세요/);
    act(s, { type: 'market', id: 'open' }, T, fixed);
    assert.ok(s.market.seed > 0); assert.deepEqual(s.market.holdings, {});
    assert.throws(() => act(s, { type: 'market', id: 'open' }, T, fixed), /이미/);
    const t = marketTick(T), p = market.stockPrice(s.market.seed, 'perion', t);
    assert.equal(market.stockPrice(s.market.seed, 'perion', t), p, 'same seed + tick = same price');
    const run = market.stockSeries(s.market.seed, 'arcane', t - 200, t);
    for (let i = 0; i < run.length; i += 7) assert.equal(run[i], market.stockPrice(s.market.seed, 'arcane', t - 200 + i), 'chart = trade price on every tick (across blocks)');
    const others = [2, 3, 4, 5].map(seed => market.stockPrice(seed, 'perion', t));
    assert.ok(others.some(x => x !== p), 'v3.212 personal market: other seeds see other prices');
    market.setMarketKey('another-server-key');
    const keyed = STOCKS.map(d => market.stockPrice(s.market.seed, d.id, t));
    market.setMarketKey('tidebound-local-market-key');
    assert.notDeepEqual(keyed, STOCKS.map(d => market.stockPrice(s.market.seed, d.id, t)), 'prices depend on the server key');
    for (const d of STOCKS) { const x = market.stockPrice(s.market.seed, d.id, t); assert.ok(x >= d.base * MARKET.floor - .1 && x <= d.base * MARKET.ceil + .1, `${d.id} in range`); }
});

test('v3.212 market: buy/sell settle at the server tick price with fees, cap, daily limit and realized PnL', () => {
    const s = newState(0); act(s, { type: 'market', id: 'open' }, T, fixed);
    const p = market.stockPrice(s.market.seed, 'lith', marketTick(T)), c = buyCost(p, 5);
    s.dungeonCoins = 10;
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: '5' }, T), /주화가 부족/);
    s.dungeonCoins = 10000;
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: '0' }, T), /정수/);
    assert.throws(() => act(s, { type: 'market', id: 'buy:nope', value: '1' }, T), /없는 종목/);
    act(s, { type: 'market', id: 'buy:lith', value: '5' }, T);
    assert.equal(s.dungeonCoins, 10000 - c.total); assert.deepEqual(s.market.holdings.lith, { qty: 5, cost: c.total }); assert.equal(s.market.trades, 1);
    assert.ok(c.fee >= 1 && c.total === c.gross + c.fee);
    const big = Math.ceil(MARKET.maxCost / p) + 1;
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: String(big) }, T), /총 보유 원금/);
    assert.throws(() => act(s, { type: 'market', id: 'sell:lith', value: '6' }, T), /갖고 있지 않/);
    const later = T + 5 * MARKET_TICK_MS, q = market.stockPrice(s.market.seed, 'lith', marketTick(later)), g = sellGain(q, 2), part = Math.round(c.total * 2 / 5);
    const before = s.dungeonCoins; act(s, { type: 'market', id: 'sell:lith', value: '2' }, later);
    assert.equal(s.dungeonCoins, before + g.net); assert.deepEqual(s.market.holdings.lith, { qty: 3, cost: c.total - part }); assert.equal(s.market.realized, g.net - part);
    act(s, { type: 'market', id: 'sell:lith', value: '3' }, later);
    assert.equal(s.market.holdings.lith, undefined, 'selling everything clears the line');
    s.market.trades = MARKET.tradesPerDay;
    assert.throws(() => act(s, { type: 'market', id: 'buy:lith', value: '1' }, later), /하루/);
    act(s, { type: 'market', id: 'buy:lith', value: '1' }, later + 86400000);
    assert.equal(s.market.trades, 1, 'daily trade count resets on the next KST day');
});

test('v3.212 market feed: only past ticks, full day first, then only new ticks, nothing when up to date', () => {
    const s = newState(0);
    assert.equal(market.marketFeed(s, '', T), null, 'no account → nothing');
    act(s, { type: 'market', id: 'open' }, T, fixed);
    const t = marketTick(T), f = market.marketFeed(s, '', T);
    assert.equal(f.tick, t); assert.equal(f.from, t - MARKET.history + 1); assert.equal(f.prices.length, MARKET.history); assert.equal(f.prices[0].length, STOCKS.length);
    assert.deepEqual(f.prices.at(-1), STOCKS.map(d => market.stockPrice(s.market.seed, d.id, t)), 'last row = current prices, no future rows');
    assert.ok(STOCKS.some(d => d.id === f.rumor.stock) && typeof f.rumor.up === 'boolean');
    assert.equal(market.marketFeed(s, `${s.market.seed}:${t}`, T), null, 'up to date → nothing');
    const n = market.marketFeed(s, `${s.market.seed}:${t}`, T + 2 * MARKET_TICK_MS);
    assert.equal(n.from, t + 1); assert.equal(n.prices.length, 2);
    assert.equal(market.marketFeed(s, `999:${t}`, T).prices.length, MARKET.history, 'other seed (new account) → full day again');
    // 소문은 다음 틱 충격 방향을 대략 rumorTruth 확률로 맞힙니다.
    let hit = 0, n2 = 0;
    for (let k = 0; k < 3000; k++) { const r = market.rumorAt(77, t + k), a = market.stockSeries(77, r.stock, t + k, t + k + 1); if (a[1] === a[0]) continue; n2++; if ((a[1] > a[0]) === r.up) hit++; }
    assert.ok(hit / n2 > .58 && hit / n2 < .8, `rumor accuracy ${hit / n2}`);
});

test('v3.212 market: holdings survive rebirth, ascension closes the account', () => {
    const s = newState(0); s.level = 100; act(s, { type: 'market', id: 'open' }, T, fixed); s.dungeonCoins = 5000;
    act(s, { type: 'market', id: 'buy:henesys', value: '3' }, T);
    const kept = JSON.parse(JSON.stringify(s.market));
    act(s, { type: 'rebirth' }, T);
    assert.deepEqual(s.market, kept);
    s.rebirths = 100; delete s.dungeon; act(s, { type: 'ascend' }, T + 1000);
    assert.equal(s.market, undefined);
});
