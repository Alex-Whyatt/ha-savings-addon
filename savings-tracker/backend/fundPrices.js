/**
 * Fund Prices Module
 *
 * Looks up fund prices by ISIN or ticker so investment accounts can follow
 * the market on their own. Uses Yahoo Finance's public (unofficial) search
 * and chart endpoints, which cover most UK funds and ETFs; when a lookup
 * fails the last good figures are kept and manual value updates still work.
 */

const { v4: uuidv4 } = require('uuid');
const { runQuery, getRow, getAllRows } = require('./database');
const { blendedReturn, effectiveReturns, valueFromPrices } = require('./investments');
const { isIsin, pickSymbol, summariseChart } = require('./fundData');

const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 15000;
const REQUEST_TIMEOUT_MS = 10000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Home Assistant savings tracker)' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up one fund: find its Yahoo symbol (for an ISIN) and its price history
 */
async function lookupFund(identifier, knownSymbol) {
  let symbol = knownSymbol;
  if (!symbol) {
    if (isIsin(identifier)) {
      const search = await fetchJson(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(identifier)}&quotesCount=6&newsCount=0`);
      symbol = pickSymbol(search);
      if (!symbol) throw new Error('Fund not found');
    } else {
      symbol = identifier;
    }
  }

  const chart = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1mo`);
  return { ...summariseChart(chart), symbol };
}

/**
 * Refresh prices for every fund (or just the given identifiers)
 */
async function refreshPrices(identifiers) {
  const rows = await getAllRows('SELECT DISTINCT identifier FROM pot_holdings WHERE identifier IS NOT NULL');
  const wanted = rows.map(r => r.identifier).filter(id => !identifiers || identifiers.includes(id));

  for (const identifier of wanted) {
    const existing = await getRow('SELECT * FROM fund_prices WHERE identifier = ?', [identifier]);
    const now = new Date().toISOString();
    try {
      const fund = await lookupFund(identifier, existing && existing.symbol);
      await runQuery(
        `INSERT INTO fund_prices (identifier, symbol, currency, price, price_at, change_1m, change_1y, average_return, history_years, error, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
         ON CONFLICT(identifier) DO UPDATE SET symbol = excluded.symbol, currency = excluded.currency, price = excluded.price,
           price_at = excluded.price_at, change_1m = excluded.change_1m, change_1y = excluded.change_1y,
           average_return = excluded.average_return, history_years = excluded.history_years, error = NULL, fetched_at = excluded.fetched_at`,
        [identifier, fund.symbol, fund.currency, fund.price, fund.priceAt, fund.change1m, fund.change1y, fund.averageReturn, fund.historyYears, now]
      );
      console.log(`   📈 ${identifier} (${fund.symbol}): £${fund.price.toFixed(4)}`);
    } catch (error) {
      console.error(`   ❌ Price lookup failed for ${identifier}:`, error.message);
      // Keep the last good price; forget a symbol that no longer works
      await runQuery(
        `INSERT INTO fund_prices (identifier, error, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(identifier) DO UPDATE SET error = excluded.error, fetched_at = excluded.fetched_at, symbol = NULL`,
        [identifier, error.message, now]
      );
    }
  }
}

async function getPriceMap() {
  const prices = await getAllRows('SELECT * FROM fund_prices');
  return new Map(prices.map(p => [p.identifier, p]));
}

/**
 * Move an account's value with its funds' prices, record it as growth,
 * and keep its expected return in step with the funds
 * @param {string} potId
 * @param {object} options - { fromUnits: value the account from units held when every fund has them }
 */
async function applyPricesToPot(potId, options = {}) {
  const pot = await getRow('SELECT * FROM savings_pots WHERE id = ?', [potId]);
  if (!pot) return;
  const holdings = await getAllRows('SELECT * FROM pot_holdings WHERE pot_id = ?', [potId]);
  if (holdings.length === 0) return;

  const prices = await getPriceMap();
  const now = new Date().toISOString();
  const { value, baselines } = valueFromPrices(pot.current_total, holdings, prices, options);

  if (value !== null && Math.abs(value - pot.current_total) >= 0.01) {
    await runQuery(
      `INSERT INTO pot_valuations (id, pot_id, user_id, value, previous_value, date, created_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'prices')`,
      [uuidv4(), potId, pot.user_id, value, pot.current_total, now, now]
    );
    await runQuery('UPDATE savings_pots SET current_total = ?, updated_at = ? WHERE id = ?', [value, now, potId]);
    console.log(`   💹 ${pot.name}: £${pot.current_total.toFixed(2)} → £${value.toFixed(2)}`);
  }

  for (const [holdingId, price] of baselines) {
    await runQuery('UPDATE pot_holdings SET last_price_used = ? WHERE id = ?', [price, holdingId]);
  }

  const expected = blendedReturn(effectiveReturns(holdings, prices));
  if (expected !== null && expected !== pot.interest_rate) {
    await runQuery('UPDATE savings_pots SET interest_rate = ?, updated_at = ? WHERE id = ?', [expected, now, potId]);
  }
}

/**
 * Restart price tracking from the current prices, e.g. after the value was typed in
 */
async function resetBaselines(potId) {
  const holdings = await getAllRows('SELECT * FROM pot_holdings WHERE pot_id = ?', [potId]);
  const prices = await getPriceMap();
  for (const h of holdings) {
    const price = h.identifier && prices.get(h.identifier);
    if (price && typeof price.price === 'number') {
      await runQuery('UPDATE pot_holdings SET last_price_used = ? WHERE id = ?', [price.price, h.id]);
    }
  }
}

let onUpdate = null;
let running = false;

/**
 * Refresh all prices and move every invested account along with them
 */
async function runPriceUpdate() {
  if (running) return;
  running = true;
  try {
    const holdings = await getAllRows('SELECT DISTINCT pot_id FROM pot_holdings WHERE identifier IS NOT NULL');
    if (holdings.length === 0) return;
    console.log('📈 Updating fund prices');
    await refreshPrices();
    for (const { pot_id } of holdings) {
      await applyPricesToPot(pot_id);
    }
    if (onUpdate) await onUpdate();
  } catch (error) {
    console.error('❌ Error updating fund prices:', error.message);
  } finally {
    running = false;
  }
}

function initializeFundPrices(afterUpdate) {
  if (process.env.FUND_PRICES_ENABLED === 'false') {
    console.log('📈 Fund price lookups disabled');
    return false;
  }
  onUpdate = afterUpdate;
  setTimeout(runPriceUpdate, STARTUP_DELAY_MS);
  setInterval(runPriceUpdate, REFRESH_INTERVAL_MS);
  console.log('📈 Fund price lookups enabled (every 12 hours)');
  return true;
}

module.exports = {
  refreshPrices,
  applyPricesToPot,
  resetBaselines,
  runPriceUpdate,
  initializeFundPrices
};
