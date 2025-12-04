export interface SavingsPot {
  id: string;
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
  potId: string;
  amount: number;
  date: Date;
  description?: string;
  createdAt: Date;
}

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
