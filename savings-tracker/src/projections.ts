import {
  SavingsPot,
  Transaction,
  ProjectionData,
  SavingsProjection,
} from "./types";
import { loadSavingsData } from "./storage";
import {
  startOfMonth,
  eachMonthOfInterval,
  addMonths,
  isAfter,
  isBefore,
  isSameMonth,
  getDate,
} from "date-fns";

export const calculateProjection = (
  pot: SavingsPot,
  transactions: Transaction[],
  monthsAhead: number = 12
): SavingsProjection => {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();

  // Get recurring transactions for this pot
  const recurringTransactions = transactions.filter(
    (t) => t.potId === pot.id && t.repeatMonthly
  );

  // Calculate total monthly recurring amount (sum of all recurring payments)
  const monthlyRecurringTotal = recurringTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  // Calculate outstanding payments for current month (scheduled for days after today)
  const outstandingThisMonth = recurringTransactions
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

    if (isCurrentMonth) {
      // Current month: show actual current total (already includes payments up to today)
      data.push({
        date: month,
        amount: cumulativeAmount,
        projected: false,
      });
    } else if (index === 1) {
      // First future month: add outstanding from this month + full month's recurring
      cumulativeAmount += outstandingThisMonth + monthlyRecurringTotal;
      data.push({
        date: month,
        amount: cumulativeAmount,
        projected: true,
      });
    } else {
      // Subsequent future months: add full month's recurring payments
      cumulativeAmount += monthlyRecurringTotal;
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
  const currentDate = new Date();
  const projectedTransactions: Transaction[] = [];

  // Find all recurring transactions (original ones that started the recurrence)
  const recurringTransactions = transactions.filter((t) => t.repeatMonthly);

  for (const recurring of recurringTransactions) {
    const recurringDate = recurring.date.getDate(); // Day of month (1-31)
    let nextDate = new Date(recurring.date);

    // Generate projected recurring transactions for the next 6 months
    for (let i = 1; i <= 6; i++) {
      nextDate = addMonths(nextDate, 1);

      // Only include future transactions
      if (!isAfter(nextDate, currentDate)) continue;

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
          id: `projected-${recurring.id}-${i}`,
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

  return projectedTransactions;
};
