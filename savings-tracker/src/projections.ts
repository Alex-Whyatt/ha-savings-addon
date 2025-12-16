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
  eachMonthOfInterval,
  addMonths,
  isAfter,
  isBefore,
  isSameMonth,
  getDate,
  getDay,
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

// Count how many times a specific day of week occurs between two dates
const countWeekdayOccurrences = (
  startDate: Date,
  endDate: Date,
  targetDay: number
): number => {
  let count = 0;
  // Normalize dates to noon to avoid timezone issues
  let current = normalizeToNoon(new Date(startDate));
  const end = normalizeToNoon(new Date(endDate));

  // Move to first occurrence of target day
  while (getDay(current) !== targetDay && current <= end) {
    current.setDate(current.getDate() + 1);
  }

  // Count occurrences
  while (current <= end) {
    count++;
    current.setDate(current.getDate() + 7);
  }

  return count;
};

export const calculateProjection = (
  pot: SavingsPot,
  transactions: Transaction[],
  monthsAhead: number = 12
): SavingsProjection => {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();

  // Get monthly recurring transactions for this pot
  const monthlyRecurringTxns = transactions.filter(
    (t) => t.potId === pot.id && t.repeatMonthly
  );

  // Get weekly recurring transactions for this pot
  const weeklyRecurringTxns = transactions.filter(
    (t) => t.potId === pot.id && t.repeatWeekly
  );

  // Calculate total monthly recurring amount
  const monthlyRecurringTotal = monthlyRecurringTxns.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  // Calculate outstanding monthly payments for current month (scheduled for days after today)
  const outstandingMonthlyThisMonth = monthlyRecurringTxns
    .filter((t) => t.date.getDate() > currentDay)
    .reduce((sum, t) => sum + t.amount, 0);

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

      // Calculate weekly recurring for this month
      let weeklyTotal = 0;
      weeklyRecurringTxns.forEach((t) => {
        const txnDayOfWeek = getDay(t.date);
        const occurrences = countWeekdayOccurrences(
          monthStart,
          monthEnd,
          txnDayOfWeek
        );
        weeklyTotal += t.amount * occurrences;
      });

      if (index === 1) {
        // First future month: add outstanding monthly + full month recurring + weekly
        // Also add remaining weekly occurrences from current month
        let remainingWeeklyThisMonth = 0;
        weeklyRecurringTxns.forEach((t) => {
          const txnDayOfWeek = getDay(t.date);
          const tomorrow = new Date(currentDate);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const occurrences = countWeekdayOccurrences(
            tomorrow,
            endOfMonth(currentDate),
            txnDayOfWeek
          );
          remainingWeeklyThisMonth += t.amount * occurrences;
        });

        cumulativeAmount +=
          outstandingMonthlyThisMonth +
          monthlyRecurringTotal +
          remainingWeeklyThisMonth +
          weeklyTotal;
      } else {
        // Subsequent future months: add monthly + weekly recurring
        cumulativeAmount += monthlyRecurringTotal + weeklyTotal;
      }

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
  const projectedTransactions: Transaction[] = [];

  // Find all monthly recurring transactions
  const monthlyRecurringTransactions = transactions.filter(
    (t) => t.repeatMonthly
  );

  for (const recurring of monthlyRecurringTransactions) {
    // Normalize the original date to noon and get the day of month
    const originalDate = normalizeToNoon(new Date(recurring.date));
    const recurringDayOfMonth = getDate(originalDate); // Day of month (1-31)

    // Generate projected recurring transactions for the next 6 months
    for (let i = 1; i <= 6; i++) {
      // Add months from the original date to ensure consistency
      const nextDate = normalizeToNoon(addMonths(originalDate, i));

      // Include projections from start of current month (to show past-due ones)
      if (isBefore(nextDate, monthStart)) continue;

      // Check if a transaction already exists for this month
      const existingTransaction = transactions.find(
        (t) =>
          t.potId === recurring.potId &&
          t.repeatMonthly &&
          isSameMonth(t.date, nextDate) &&
          getDate(normalizeToNoon(t.date)) === recurringDayOfMonth
      );

      if (!existingTransaction) {
        // Create a projected transaction for display only
        projectedTransactions.push({
          id: `projected-monthly-${recurring.id}-${i}`,
          userId: recurring.userId,
          potId: recurring.potId,
          amount: recurring.amount,
          date: nextDate,
          description: recurring.description,
          repeatMonthly: true,
          createdAt: recurring.createdAt,
        });
      }
    }
  }

  // Find all weekly recurring transactions
  const weeklyRecurringTransactions = transactions.filter(
    (t) => t.repeatWeekly
  );

  for (const recurring of weeklyRecurringTransactions) {
    // Normalize the original transaction date to noon to avoid timezone issues
    const originalDate = normalizeToNoon(new Date(recurring.date));

    // Generate projected weekly transactions for the next 26 weeks (6 months)
    for (let i = 1; i <= 26; i++) {
      // Calculate the next occurrence by adding weeks from the original date
      // This ensures we always land on the same day of the week
      const nextDate = addWeeksFromOriginal(originalDate, i);

      // Include projections from start of current month (to show past-due ones)
      // Skip dates before the start of this month
      if (isBefore(nextDate, monthStart)) continue;

      // Create a projected transaction for display only
      projectedTransactions.push({
        id: `projected-weekly-${recurring.id}-${i}`,
        userId: recurring.userId,
        potId: recurring.potId,
        amount: recurring.amount,
        date: nextDate,
        description: recurring.description,
        repeatWeekly: true,
        createdAt: recurring.createdAt,
      });
    }
  }

  return projectedTransactions;
};
