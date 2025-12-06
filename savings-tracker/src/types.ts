export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface SavingsPot {
  id: string;
  userId: string;
  name: string;
  description?: string;
  currentTotal: number;
  targetAmount?: number;
  color: string;
  interestRate?: number | null; // Annual percentage rate (e.g., 3.1 for 3.1%)
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  potId: string;
  amount: number;
  date: Date;
  description?: string;
  repeatMonthly?: boolean;
  repeatWeekly?: boolean;
  createdAt: Date;
}

// Types for creating new items (without server-generated fields)
export type CreateSavingsPot = Omit<
  SavingsPot,
  "id" | "userId" | "createdAt" | "updatedAt"
>;
export type CreateTransaction = Omit<
  Transaction,
  "id" | "userId" | "createdAt"
>;

export interface ProjectionData {
  date: Date;
  amount: number;
  projected: boolean;
}

export interface SavingsProjection {
  potId: string;
  data: ProjectionData[];
  targetDate?: Date;
  monthlyContribution?: number;
}

export interface SavingsData {
  pots: SavingsPot[];
  transactions: Transaction[];
}

export interface UpcomingSpend {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDate?: Date | null;
  isRecurring: boolean;
  recurrenceInterval?: string | null;
  categoryId?: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUpcomingSpend = Omit<
  UpcomingSpend,
  "id" | "userId" | "completed" | "createdAt" | "updatedAt"
>;

export interface ExpenseCategory {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateExpenseCategory = Omit<
  ExpenseCategory,
  "id" | "userId" | "createdAt" | "updatedAt"
>;
