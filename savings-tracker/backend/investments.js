/**
 * Helpers for investment accounts: blending fund returns into one expected
 * rate, and splitting an account's value into money paid in and growth.
 */

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Expected yearly return across funds, weighted by allocation.
 * Funds without an allocation share equally when none have one.
 * Returns null when no fund has an expected return.
 */
function blendedReturn(holdings) {
  const withReturn = holdings.filter(h => typeof h.expected_return === 'number');
  if (withReturn.length === 0) return null;

  const allocated = withReturn.filter(h => typeof h.allocation === 'number' && h.allocation > 0);
  if (allocated.length === 0) {
    return round2(withReturn.reduce((sum, h) => sum + h.expected_return, 0) / withReturn.length);
  }

  const totalWeight = allocated.reduce((sum, h) => sum + h.allocation, 0);
  return round2(allocated.reduce((sum, h) => sum + h.allocation * h.expected_return, 0) / totalWeight);
}

/**
 * Growth from recorded values: each value update counts the change in
 * balance it made, so contributions added in between are not counted.
 */
function valuationSummary(pot, valuations) {
  if (valuations.length === 0) {
    return { growth: 0, paidIn: round2(pot.current_total), returnPercent: null, valuationCount: 0, firstValuedAt: null, lastValuedAt: null };
  }

  const sorted = [...valuations].sort((a, b) => a.date.localeCompare(b.date));
  const growth = round2(sorted.reduce((sum, v) => sum + (v.value - v.previous_value), 0));
  const paidIn = round2(pot.current_total - growth);

  return {
    growth,
    paidIn,
    returnPercent: paidIn > 0 ? round2((growth / paidIn) * 100) : null,
    valuationCount: sorted.length,
    firstValuedAt: sorted[0].date,
    lastValuedAt: sorted[sorted.length - 1].date
  };
}

/**
 * Holdings with their expected return filled in from the fund's own
 * average yearly return when none was typed in
 * @param {Array} holdings - pot_holdings rows
 * @param {Map} prices - fund_prices rows by identifier
 */
function effectiveReturns(holdings, prices) {
  return holdings.map(h => {
    if (typeof h.expected_return === 'number') return h;
    const price = h.identifier && prices.get(h.identifier);
    return { ...h, expected_return: price && typeof price.average_return === 'number' ? price.average_return : null };
  });
}

/**
 * New account value from fund prices.
 *
 * With `fromUnits` and units held for every fund, the value is units x price.
 * Otherwise each fund's price change since it was last used moves the value,
 * weighted by what each fund is worth (units held) or its share of the account.
 * Returns the new value (null when nothing moved it) and the prices to
 * remember for next time.
 */
function valueFromPrices(currentTotal, holdings, prices, options = {}) {
  const priced = holdings.map(h => {
    const row = h.identifier && prices.get(h.identifier);
    return { holding: h, price: row && typeof row.price === 'number' ? row.price : null };
  });
  const baselines = new Map(priced.filter(p => p.price !== null).map(p => [p.holding.id, p.price]));

  const allUnits = priced.every(p => p.price !== null && typeof p.holding.units === 'number' && p.holding.units > 0);
  if (options.fromUnits && allUnits) {
    return { value: round2(priced.reduce((sum, p) => sum + p.holding.units * p.price, 0)), baselines };
  }

  const hasAllocations = holdings.some(h => typeof h.allocation === 'number' && h.allocation > 0);
  const weightOf = (p) => {
    if (typeof p.holding.units === 'number' && p.holding.units > 0 && typeof p.holding.last_price_used === 'number') {
      return p.holding.units * p.holding.last_price_used;
    }
    if (hasAllocations) return typeof p.holding.allocation === 'number' ? p.holding.allocation : 0;
    return 1;
  };

  let totalWeight = 0;
  let weightedRatio = 0;
  let moved = false;
  for (const p of priced) {
    const weight = weightOf(p);
    if (weight <= 0) continue;
    const baseline = p.holding.last_price_used;
    const ratio = p.price !== null && typeof baseline === 'number' && baseline > 0 ? p.price / baseline : 1;
    if (ratio !== 1) moved = true;
    totalWeight += weight;
    weightedRatio += weight * ratio;
  }

  if (!moved || totalWeight === 0) return { value: null, baselines };
  return { value: round2(currentTotal * (weightedRatio / totalWeight)), baselines };
}

module.exports = { blendedReturn, valuationSummary, effectiveReturns, valueFromPrices };
