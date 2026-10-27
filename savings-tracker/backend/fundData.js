/**
 * Parsing for fund price lookups (Yahoo Finance search and chart responses).
 * Kept free of network and database code so it can be tested on its own.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

const round2 = (n) => Math.round(n * 100) / 100;

function isIsin(identifier) {
  return ISIN_PATTERN.test(identifier);
}

/**
 * Choose the best match from a Yahoo search, preferring London listings
 */
function pickSymbol(searchResult) {
  const quotes = (searchResult && searchResult.quotes) || [];
  const withSymbol = quotes.filter(q => q && q.symbol);
  if (withSymbol.length === 0) return null;
  const london = withSymbol.find(q => q.symbol.endsWith('.L') || q.exchange === 'LSE');
  return (london || withSymbol[0]).symbol;
}

/**
 * Turn a Yahoo chart response (monthly bars) into the figures we keep.
 * Prices quoted in pence (GBp/GBX) are converted to pounds.
 */
function summariseChart(chart) {
  const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!result) throw new Error('No price data returned');

  const meta = result.meta || {};
  const scale = meta.currency === 'GBp' || meta.currency === 'GBX' ? 0.01 : 1;
  const timestamps = result.timestamp || [];
  const adjusted = result.indicators && result.indicators.adjclose && result.indicators.adjclose[0] && result.indicators.adjclose[0].adjclose;
  const closes = adjusted || (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];

  const series = timestamps
    .map((t, i) => ({ time: t * 1000, price: closes[i] }))
    .filter(p => typeof p.price === 'number' && p.price > 0);
  if (series.length === 0 && typeof meta.regularMarketPrice !== 'number') {
    throw new Error('No prices in response');
  }

  const latest = typeof meta.regularMarketPrice === 'number'
    ? { time: (meta.regularMarketTime || timestamps[timestamps.length - 1] || Date.now() / 1000) * 1000, price: meta.regularMarketPrice }
    : series[series.length - 1];

  // Last price on or before a given time
  const priceAt = (time) => {
    let found = null;
    for (const point of series) {
      if (point.time <= time) found = point;
    }
    return found;
  };
  const changeSince = (days) => {
    const then = priceAt(latest.time - days * DAY_MS);
    return then ? round2((latest.price / then.price - 1) * 100) : null;
  };

  const first = series[0];
  const years = first ? (latest.time - first.time) / (365.25 * DAY_MS) : 0;
  const averageReturn = years >= 1 ? round2((Math.pow(latest.price / first.price, 1 / years) - 1) * 100) : null;

  return {
    symbol: meta.symbol || null,
    currency: meta.currency === 'GBp' || meta.currency === 'GBX' ? 'GBP' : (meta.currency || null),
    price: latest.price * scale,
    priceAt: new Date(latest.time).toISOString(),
    change1m: changeSince(30),
    change1y: changeSince(365),
    averageReturn,
    historyYears: round2(years)
  };
}

module.exports = { isIsin, pickSymbol, summariseChart };
