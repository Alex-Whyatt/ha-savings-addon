import { SavingsPot, Transaction, ProjectionData, SavingsProjection } from './types';
import { loadSavingsData } from './storage';
import { startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, isAfter, isBefore } from 'date-fns';

export const calculateProjection = (
  pot: SavingsPot,
  transactions: Transaction[],
  monthsAhead: number = 12,
  monthlyContribution?: number
): SavingsProjection => {
  const potTransactions = transactions
    .filter(t => t.potId === pot.id)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const data: ProjectionData[] = [];

  // Add historical data points (one per month)
  const currentDate = new Date();
  const startDate = potTransactions.length > 0
    ? startOfMonth(potTransactions[0].date)
    : startOfMonth(currentDate);

  const months = eachMonthOfInterval({
    start: startDate,
    end: addMonths(currentDate, monthsAhead)
  });

  let cumulativeAmount = 0;

  months.forEach(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // Add transactions for this month
    const monthTransactions = potTransactions.filter(t =>
      !isBefore(t.date, monthStart) && !isAfter(t.date, monthEnd)
    );

    monthTransactions.forEach(transaction => {
      cumulativeAmount += transaction.amount;
    });

    // If this is the current month and we have a monthly contribution, add it
    if (monthlyContribution &&
        month.getMonth() === currentDate.getMonth() &&
        month.getFullYear() === currentDate.getFullYear()) {
      cumulativeAmount += monthlyContribution;
    }

    const isProjected = isAfter(month, currentDate);

    data.push({
      date: month,
      amount: cumulativeAmount,
      projected: isProjected
    });

    // For future months, add monthly contributions
    if (isProjected && monthlyContribution) {
      cumulativeAmount += monthlyContribution;
    }
  });

  return {
    potId: pot.id,
    data,
    monthlyContribution
  };
};

export const calculateAllProjections = (monthsAhead: number = 12): SavingsProjection[] => {
  const { pots, transactions } = loadSavingsData();

  return pots.map(pot => calculateProjection(pot, transactions, monthsAhead));
};

export const getTotalSavings = (): number => {
  const { pots } = loadSavingsData();
  return pots.reduce((total, pot) => total + pot.currentTotal, 0);
};

export const getMonthlySavingsRate = (): number => {
  const { transactions } = loadSavingsData();
  const currentDate = new Date();
  const threeMonthsAgo = addMonths(currentDate, -3);

  const recentTransactions = transactions.filter(t =>
    !isBefore(t.date, threeMonthsAgo) && !isAfter(t.date, currentDate)
  );

  const totalRecent = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
  return totalRecent / 3; // Average monthly savings over last 3 months
};
