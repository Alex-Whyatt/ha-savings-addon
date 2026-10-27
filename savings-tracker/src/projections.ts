import {
  SavingsPot,
  Transaction,
  ProjectionData,
  SavingsProjection,
} from "./types";
import { loadSavingsData } from "./storage";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachMonthOfInterval,
  addDays,
  addMonths,
  isAfter,
  isBefore,
} from "date-fns";

// Normalize a date to noon local time to avoid edge cases
// This ensures consistent date handling regardless of how dates are stored
export const normalizeToNoon = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  return result;
};

// Add weeks while preserving the exact day of week
// Uses simple arithmetic: add weeks * 7 days
const addWeeksFromOriginal = (originalDate: Date, weeks: number): Date => {
  const normalized = normalizeToNoon(originalDate);
  const result = new Date(normalized);
  result.setDate(result.getDate() + weeks * 7);
  return result;
};

// Dates a recurring transaction repeats on between `from` and `to` (inclusive).
// The transaction's own date is its first occurrence and is not included;
// repeats stop before `repeatUntil` when it is set.
export const getRepeatDates = (
  transaction: Transaction,
  from: Date,
  to: Date
): { date: Date; index: number }[] => {
  if (!transaction.repeatMonthly && !transaction.repeatWeekly) return [];

  const originalDate = normalizeToNoon(new Date(transaction.date));
  const rangeStart = startOfDay(from);
  const rangeEnd = endOfDay(to);
  const until = transaction.repeatUntil
    ? startOfDay(new Date(transaction.repeatUntil))
    : null;
  const dates: { date: Date; index: number }[] = [];

  for (let i = 1; ; i++) {
    const date = transaction.repeatWeekly
      ? addWeeksFromOriginal(originalDate, i)
      : normalizeToNoon(addMonths(originalDate, i));
    if (isAfter(date, rangeEnd) || (until && !isBefore(date, until))) break;
    if (!isBefore(date, rangeStart)) dates.push({ date, index: i });
  }

  return dates;
};

export const calculateProjection = (
  pot: SavingsPot,
  transactions: Transaction[],
  monthsAhead: number = 12
): SavingsProjection => {
  const currentDate = new Date();

  const recurringTxns = transactions.filter(
    (t) => t.potId === pot.id && (t.repeatMonthly || t.repeatWeekly)
  );

  // Total of the recurring payments that land in a date range
  const recurringTotalBetween = (from: Date, to: Date): number =>
    recurringTxns.reduce(
      (sum, t) => sum + t.amount * getRepeatDates(t, from, to).length,
      0
    );

  // Calculate monthly growth rate from annual interest rate
  // Monthly rate = (1 + annual_rate/100)^(1/12) - 1
  const annualRate = pot.interestRate || 0;
  const monthlyGrowthMultiplier =
    annualRate > 0 ? Math.pow(1 + annualRate / 100, 1 / 12) : 1;

  // Start with the pot's actual current total
  let cumulativeAmount = pot.currentTotal;

  const data: ProjectionData[] = [];

  // Generate months from current month onwards
  const months = eachMonthOfInterval({
    start: startOfMonth(currentDate),
    end: addMonths(currentDate, monthsAhead),
  });

  months.forEach((month, index) => {
    const isCurrentMonth = index === 0;
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    if (isCurrentMonth) {
      // Current month: show actual current total (already includes payments up to today)
      data.push({
        date: month,
        amount: cumulativeAmount,
        projected: false,
      });
    } else {
      // Apply monthly compound growth from interest/returns (applied to balance at start of month)
      if (annualRate > 0) {
        cumulativeAmount *= monthlyGrowthMultiplier;
      }

      // The first future month also picks up what's still to come this month
      const from =
        index === 1 ? addDays(startOfDay(currentDate), 1) : monthStart;
      cumulativeAmount += recurringTotalBetween(from, monthEnd);

      data.push({
        date: month,
        amount: cumulativeAmount,
        projected: true,
      });
    }
  });

  return {
    potId: pot.id,
    data,
  };
};

export const calculateAllProjections = (
  data: { pots: SavingsPot[]; transactions: Transaction[] },
  monthsAhead: number = 12
): SavingsProjection[] => {
  const { pots, transactions } = data;

  return pots.map((pot) => calculateProjection(pot, transactions, monthsAhead));
};

export const getTotalSavings = async (): Promise<number> => {
  const { transactions, pots } = await loadSavingsData();

  // Calculate actual totals from real transactions (exclude projected ones)
  const actualTotals: { [potId: string]: number } = {};

  // Initialize with 0 for all pots
  pots.forEach((pot) => {
    actualTotals[pot.id] = 0;
  });

  // Sum up actual transactions only
  transactions.forEach((transaction) => {
    if (!transaction.id.startsWith("projected-")) {
      actualTotals[transaction.potId] =
        (actualTotals[transaction.potId] || 0) + transaction.amount;
    }
  });

  return Object.values(actualTotals).reduce(
    (total, potTotal) => total + potTotal,
    0
  );
};

export const getMonthlySavingsRate = async (): Promise<number> => {
  const { transactions } = await loadSavingsData();
  const currentDate = new Date();
  const threeMonthsAgo = addMonths(currentDate, -3);

  const recentTransactions = transactions.filter(
    (t) => !isBefore(t.date, threeMonthsAgo) && !isAfter(t.date, currentDate)
  );

  const totalRecent = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
  return totalRecent / 3; // Average monthly savings over last 3 months
};

// Get projected recurring transactions for display (without creating database entries)
export const getProjectedRecurringTransactions = async (): Promise<
  Transaction[]
> => {
  const { transactions } = await loadSavingsData();
  const currentDate = normalizeToNoon(new Date());
  // Show projections from start of current month (so past-due ones in current month still show)
  const monthStart = startOfMonth(currentDate);
  // Look six months ahead
  const horizon = endOfMonth(addMonths(currentDate, 6));
  const projectedTransactions: Transaction[] = [];

  for (const recurring of transactions) {
    const kind = recurring.repeatWeekly ? "weekly" : "monthly";
    for (const { date, index } of getRepeatDates(recurring, monthStart, horizon)) {
      // Projected transactions are for display only
      projectedTransactions.push({
        id: `projected-${kind}-${recurring.id}-${index}`,
        seriesId: recurring.id,
        userId: recurring.userId,
        potId: recurring.potId,
        amount: recurring.amount,
        date,
        description: recurring.description,
        repeatMonthly: recurring.repeatMonthly,
        repeatWeekly: recurring.repeatWeekly,
        repeatUntil: recurring.repeatUntil,
        createdAt: recurring.createdAt,
      });
    }
  }

  return projectedTransactions;
};
