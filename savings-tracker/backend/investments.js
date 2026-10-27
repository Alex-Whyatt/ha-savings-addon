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

module.exports = { blendedReturn, valuationSummary };
