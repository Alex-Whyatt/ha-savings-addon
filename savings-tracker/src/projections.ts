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
  addWeeks,
  isAfter,
  isBefore,
  isSameMonth,
  getDate,
  getDay,
  startOfDay,
} from "date-fns";

// Count how many times a specific day of week occurs between two dates
const countWeekdayOccurrences = (
  startDate: Date,
  endDate: Date,
  targetDay: number
): number => {
  let count = 0;
  let current = new Date(startDate);

  // Move to first occurrence of target day
  while (getDay(current) !== targetDay && current <= endDate) {
    current.setDate(current.getDate() + 1);
  }

  // Count occurrences
  while (current <= endDate) {
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
  const currentDate = startOfDay(new Date());
  const projectedTransactions: Transaction[] = [];

  // Find all monthly recurring transactions
  const monthlyRecurringTransactions = transactions.filter(
    (t) => t.repeatMonthly
  );

  for (const recurring of monthlyRecurringTransactions) {
    const recurringDate = recurring.date.getDate(); // Day of month (1-31)
    let nextDate = new Date(recurring.date);

    // Generate projected recurring transactions for the next 6 months
    for (let i = 1; i <= 6; i++) {
      nextDate = addMonths(nextDate, 1);

      // Only include future transactions
      if (!isAfter(startOfDay(nextDate), currentDate)) continue;

      // Check if a transaction already exists for this month
      const existingTransaction = transactions.find(
        (t) =>
          t.potId === recurring.potId &&
          t.repeatMonthly &&
          isSameMonth(t.date, nextDate) &&
          getDate(t.date) === recurringDate
      );

      if (!existingTransaction) {
        // Create a projected transaction for display only
        projectedTransactions.push({
          id: `projected-monthly-${recurring.id}-${i}`,
          userId: recurring.userId,
          potId: recurring.potId,
          amount: recurring.amount,
          date: new Date(nextDate),
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
    let nextDate = new Date(recurring.date);

    // Generate projected weekly transactions for the next 26 weeks (6 months)
    for (let i = 1; i <= 26; i++) {
      nextDate = addWeeks(nextDate, 1);

      // Only include future transactions
      if (!isAfter(startOfDay(nextDate), currentDate)) continue;

      // Create a projected transaction for display only
      projectedTransactions.push({
        id: `projected-weekly-${recurring.id}-${i}`,
        userId: recurring.userId,
        potId: recurring.potId,
        amount: recurring.amount,
        date: new Date(nextDate),
        description: recurring.description,
        repeatWeekly: true,
        createdAt: recurring.createdAt,
      });
    }
  }

  return projectedTransactions;
};
