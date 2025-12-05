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
