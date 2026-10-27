import { describe, it, expect } from 'vitest';
import { blendedReturn, valuationSummary, effectiveReturns, valueFromPrices } from './investments.js';

describe('blendedReturn', () => {
  it('weights fund returns by allocation', () => {
    expect(blendedReturn([
      { allocation: 80, expected_return: 7 },
      { allocation: 20, expected_return: 2 }
    ])).toBe(6);
  });

  it('weights relative to each other when shares do not add up to 100', () => {
    expect(blendedReturn([
      { allocation: 30, expected_return: 8 },
      { allocation: 10, expected_return: 4 }
    ])).toBe(7);
  });

  it('averages returns when no allocations are set', () => {
    expect(blendedReturn([
      { allocation: null, expected_return: 6 },
      { allocation: null, expected_return: 3 }
    ])).toBe(4.5);
  });

  it('returns null when no fund has an expected return', () => {
    expect(blendedReturn([{ allocation: 100, expected_return: null }])).toBeNull();
    expect(blendedReturn([])).toBeNull();
  });
});

describe('valuationSummary', () => {
  it('treats the whole balance as paid in before any value is recorded', () => {
    expect(valuationSummary({ current_total: 5000 }, [])).toMatchObject({ growth: 0, paidIn: 5000, valuationCount: 0 });
  });

  it('counts only the changes made by value updates as growth', () => {
    // £10,000 → valued at £10,400; then £500 paid in (10,900); then valued at £10,700
    const summary = valuationSummary({ current_total: 10700 }, [
      { value: 10700, previous_value: 10900, date: '2026-09-01T09:00:00.000Z' },
      { value: 10400, previous_value: 10000, date: '2026-06-01T09:00:00.000Z' }
    ]);
    expect(summary).toMatchObject({
      growth: 200,
      paidIn: 10500,
      returnPercent: 1.9,
      valuationCount: 2,
      firstValuedAt: '2026-06-01T09:00:00.000Z',
      lastValuedAt: '2026-09-01T09:00:00.000Z'
    });
  });
});

describe('effectiveReturns', () => {
  it('uses the fund average when no expected return was typed in', () => {
    const prices = new Map([['GB1', { average_return: 9.5 }], ['GB2', { average_return: 4 }]]);
    const result = effectiveReturns([
      { identifier: 'GB1', expected_return: null },
      { identifier: 'GB2', expected_return: 6 },
      { identifier: null, expected_return: null }
    ], prices);
    expect(result.map(h => h.expected_return)).toEqual([9.5, 6, null]);
  });
});

describe('valueFromPrices', () => {
  const prices = new Map([['A', { price: 110 }], ['B', { price: 95 }]]);

  it('values the account from units held when asked and every fund has them', () => {
    const { value, baselines } = valueFromPrices(1000, [
      { id: 'a', identifier: 'A', units: 10 },
      { id: 'b', identifier: 'B', units: 4 }
    ], prices, { fromUnits: true });
    expect(value).toBe(1480);
    expect([...baselines]).toEqual([['a', 110], ['b', 95]]);
  });

  it('moves the value by each fund\'s change, weighted by share of the account', () => {
    // 80% up 10%, 20% down 5% → +7%
    const { value } = valueFromPrices(10000, [
      { id: 'a', identifier: 'A', allocation: 80, last_price_used: 100 },
      { id: 'b', identifier: 'B', allocation: 20, last_price_used: 100 }
    ], prices);
    expect(value).toBe(10700);
  });

  it('weights by what each fund is worth when units are known', () => {
    // A worth 10 x 100 = 1000 (+10%), B worth 30 x 100 = 3000 (−5%) → −1.25%
    const { value } = valueFromPrices(4000, [
      { id: 'a', identifier: 'A', units: 10, last_price_used: 100 },
      { id: 'b', identifier: 'B', units: 30, last_price_used: 100 }
    ], prices);
    expect(value).toBe(3950);
  });

  it('leaves the value alone until there is a price to compare with', () => {
    const { value, baselines } = valueFromPrices(5000, [
      { id: 'a', identifier: 'A', allocation: 50, last_price_used: null },
      { id: 'c', identifier: 'C', allocation: 50, last_price_used: 100 }
    ], prices);
    expect(value).toBeNull();
    expect([...baselines]).toEqual([['a', 110]]);
  });
});
