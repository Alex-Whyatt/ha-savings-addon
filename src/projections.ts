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
} from "date-fns";

export const calculateProjection = (
  pot: SavingsPot,
  transactions: Transaction[],
  monthsAhead: number = 12,
  monthlyContribution?: number
): SavingsProjection => {
  const potTransactions = transactions
    .filter((t) => t.potId === pot.id)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const data: ProjectionData[] = [];

  // Add historical data points (one per month)
  const currentDate = new Date();
  const startDate =
    potTransactions.length > 0
      ? startOfMonth(potTransactions[0].date)
      : startOfMonth(currentDate);

  const months = eachMonthOfInterval({
    start: startDate,
    end: addMonths(currentDate, monthsAhead),
  });

  let cumulativeAmount = 0;

  months.forEach((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // Add transactions for this month
    const monthTransactions = potTransactions.filter(
      (t) => !isBefore(t.date, monthStart) && !isAfter(t.date, monthEnd)
    );

    monthTransactions.forEach((transaction) => {
      cumulativeAmount += transaction.amount;
    });

    // Add recurring transactions for future months
    if (isAfter(month, currentDate)) {
      const recurringTransactions = potTransactions.filter(
        (t) =>
          t.repeatMonthly &&
          t.date.getDate() === month.getDate() &&
          isBefore(t.date, month)
      );

      recurringTransactions.forEach((transaction) => {
        cumulativeAmount += transaction.amount;
      });
    }

    // If this is the current month and we have a monthly contribution, add it
    if (
      monthlyContribution &&
      month.getMonth() === currentDate.getMonth() &&
      month.getFullYear() === currentDate.getFullYear()
    ) {
      cumulativeAmount += monthlyContribution;
    }

    const isProjected = isAfter(month, currentDate);

    data.push({
      date: month,
      amount: cumulativeAmount,
      projected: isProjected,
    });

    // For future months, add monthly contributions
    if (isProjected && monthlyContribution) {
      cumulativeAmount += monthlyContribution;
    }
  });

  return {
    potId: pot.id,
    data,
    monthlyContribution,
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
