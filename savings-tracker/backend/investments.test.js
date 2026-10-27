import { describe, it, expect } from 'vitest';
import { blendedReturn, valuationSummary } from './investments.js';

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
