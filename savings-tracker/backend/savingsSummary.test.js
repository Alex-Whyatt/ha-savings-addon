import { describe, it, expect } from 'vitest';
import { buildSavingsSummary, countWeekdayInMonth } from './savingsSummary.js';

const users = [
  { id: 'alex', name: 'Alex' },
  { id: 'beth', name: 'Beth' }
];

const pots = [
  { id: 'isa', user_id: 'alex', name: 'S&S ISA', current_total: 12000.5, target_amount: null },
  { id: 'mb', user_id: 'beth', name: 'Moneybox', current_total: 3500, target_amount: 5000 }
];

const tx = (overrides) => ({
  user_id: 'alex',
  pot_id: 'isa',
  amount: 100,
  date: '2026-10-01T12:00:00.000Z',
  repeat_monthly: 0,
  repeat_weekly: 0,
  ...overrides
});

describe('countWeekdayInMonth', () => {
  it('counts weekdays in the month', () => {
    // October 2026 starts on a Thursday, so it has five Thursdays, Fridays and Saturdays
    expect(countWeekdayInMonth(4, new Date(2026, 9, 15))).toBe(5);
    expect(countWeekdayInMonth(1, new Date(2026, 9, 15))).toBe(4);
  });
});

describe('buildSavingsSummary', () => {
  const now = new Date('2026-10-27T10:00:00.000Z');

  it('totals both people and lists accounts', () => {
    const summary = buildSavingsSummary(users, pots, [], now);
    expect(summary.total).toBe(15500.5);
    expect(summary.people.map(p => [p.name, p.total])).toEqual([['Alex', 12000.5], ['Beth', 3500]]);
    expect(summary.accounts).toEqual([
      { name: 'S&S ISA', owner: 'Alex', total: 12000.5, target: null },
      { name: 'Moneybox', owner: 'Beth', total: 3500, target: 5000 }
    ]);
  });

  it('counts only this month up to today as saved this month', () => {
    const summary = buildSavingsSummary(users, pots, [
      tx({ amount: 250, date: '2026-10-01T12:00:00.000Z' }),
      tx({ user_id: 'beth', pot_id: 'mb', amount: 50, date: '2026-10-20T12:00:00.000Z' }),
      tx({ amount: 999, date: '2026-09-30T12:00:00.000Z' }),
      tx({ amount: 999, date: '2026-10-30T12:00:00.000Z' })
    ], now);
    expect(summary.savedThisMonth).toBe(300);
    expect(summary.people.find(p => p.id === 'beth').savedThisMonth).toBe(50);
  });

  it('adds monthly and weekly recurring payments into the monthly plan', () => {
    const summary = buildSavingsSummary(users, pots, [
      tx({ amount: 500, repeat_monthly: 1, date: '2026-01-28T12:00:00.000Z' }),
      // A Thursday, and October 2026 has five of them
      tx({ user_id: 'beth', pot_id: 'mb', amount: 20, repeat_weekly: 1, date: '2026-10-01T12:00:00.000Z' })
    ], now);
    expect(summary.monthlyPlan).toBe(600);
    expect(summary.people.find(p => p.id === 'alex').monthlyPlan).toBe(500);
    expect(summary.people.find(p => p.id === 'beth').monthlyPlan).toBe(100);
  });
});
