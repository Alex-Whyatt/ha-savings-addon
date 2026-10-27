import { describe, it, expect } from 'vitest';
import { isIsin, pickSymbol, summariseChart } from './fundData.js';

const DAY = 24 * 60 * 60;

// Monthly bars like Yahoo's chart API, newest last
const chart = ({ currency = 'GBP', prices, latest, latestTime, adjusted = true }) => {
  const start = Date.UTC(2021, 9, 1) / 1000;
  const timestamp = prices.map((_, i) => start + i * 30.4375 * DAY);
  const series = adjusted
    ? { quote: [{ close: prices.map(p => (p === null ? null : p * 2)) }], adjclose: [{ adjclose: prices }] }
    : { quote: [{ close: prices }] };
  return {
    chart: {
      result: [{
        meta: { currency, symbol: '0P0001CAZ3.L', regularMarketPrice: latest, regularMarketTime: latestTime ?? timestamp[timestamp.length - 1] },
        timestamp,
        indicators: series
      }]
    }
  };
};

describe('isIsin', () => {
  it('recognises ISINs and leaves tickers alone', () => {
    expect(isIsin('GB00BD3RZ582')).toBe(true);
    expect(isIsin('IE00B50W2R13')).toBe(true);
    expect(isIsin('VWRL.L')).toBe(false);
    expect(isIsin('0P0001CAZ3.L')).toBe(false);
  });
});

describe('pickSymbol', () => {
  it('prefers a London listing', () => {
    expect(pickSymbol({ quotes: [{ symbol: 'VWRL.AS', exchange: 'AMS' }, { symbol: 'VWRL.L', exchange: 'LSE' }] })).toBe('VWRL.L');
  });

  it('falls back to the first match, or null when nothing matched', () => {
    expect(pickSymbol({ quotes: [{ symbol: '0P0001CAZ3.F' }] })).toBe('0P0001CAZ3.F');
    expect(pickSymbol({ quotes: [] })).toBeNull();
    expect(pickSymbol({})).toBeNull();
  });
});

describe('summariseChart', () => {
  // 61 monthly closes: 100 rising to 160 over five years
  const prices = Array.from({ length: 61 }, (_, i) => 100 + i);

  it('works out the latest price, recent changes and average yearly return', () => {
    const summary = summariseChart(chart({ prices, latest: 160 }));
    expect(summary.price).toBe(160);
    expect(summary.change1m).toBe(0.63); // 159 → 160
    expect(summary.change1y).toBe(8.11); // 148 → 160
    expect(summary.historyYears).toBe(5);
    expect(summary.averageReturn).toBe(9.86); // 1.6 ^ (1/5) - 1
  });

  it('uses adjusted closes so distributions count as growth', () => {
    // Unadjusted closes are double the adjusted ones in the fixture
    expect(summariseChart(chart({ prices, latest: 160 })).change1y).toBe(8.11);
  });

  it('converts prices in pence to pounds', () => {
    const summary = summariseChart(chart({ currency: 'GBp', prices, latest: 8500 }));
    expect(summary.price).toBe(85);
    expect(summary.currency).toBe('GBP');
  });

  it('skips gaps and leaves out an average with under a year of history', () => {
    const summary = summariseChart(chart({ prices: [100, null, 104, 105], latest: 106, adjusted: false }));
    expect(summary.change1m).toBe(1.92); // 104 → 106; the gap is skipped
    expect(summary.averageReturn).toBeNull();
  });

  it('throws when the response has no prices', () => {
    expect(() => summariseChart({ chart: { result: [] } })).toThrow();
    expect(() => summariseChart({ chart: { result: [{ meta: {}, timestamp: [], indicators: { quote: [{ close: [] }] } }] } })).toThrow();
  });
});
