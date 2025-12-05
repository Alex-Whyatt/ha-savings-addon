import {
  SavingsData,
  SavingsPot,
  Transaction,
  CreateSavingsPot,
  CreateTransaction,
} from "./types";
import * as api from "./api";

const defaultData: SavingsData = {
  pots: [],
  transactions: [],
};

// Always use API now since we have authentication
const useLocalStorage = false;

export const loadSavingsData = async (): Promise<SavingsData> => {
  if (useLocalStorage) {
    // Development fallback to localStorage
    try {
      const stored = localStorage.getItem("savings-tracker-data");
      if (!stored) return defaultData;

      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      parsed.pots = parsed.pots.map((pot: any) => ({
        ...pot,
        createdAt: new Date(pot.createdAt),
        updatedAt: new Date(pot.updatedAt),
      }));
      parsed.transactions = parsed.transactions.map((transaction: any) => ({
        ...transaction,
        date: new Date(transaction.date),
        createdAt: new Date(transaction.createdAt),
      }));

      return parsed;
    } catch (error) {
      console.error("Error loading localStorage data:", error);
      return defaultData;
    }
  }

  try {
    const data = await api.loadSavingsData();
    console.log("Loaded API data:", data);

    // Convert date strings back to Date objects (JSON doesn't preserve Date objects)
    const processedData = {
      pots: data.pots.map((pot: any) => ({
        ...pot,
        createdAt: new Date(pot.createdAt),
        updatedAt: new Date(pot.updatedAt),
      })),
      transactions: data.transactions.map((transaction: any) => ({
        ...transaction,
        date: new Date(transaction.date),
        createdAt: new Date(transaction.createdAt),
      })),
    };

    return processedData;
  } catch (error) {
    console.error(
      "Error loading API data, falling back to localStorage:",
      error
    );
    // Fallback to localStorage if API fails
    return loadSavingsDataLocal();
  }
};

export const loadSavingsDataForUser = async (
  userId: string
): Promise<SavingsData> => {
  if (useLocalStorage) {
    // For localStorage, we just return empty data for other users as we can't easily share
    // or we could implement a mock lookup if needed
    return { pots: [], transactions: [] };
  }

  try {
    const data = await api.loadUserData(userId);

    // Convert date strings back to Date objects
    const processedData = {
      pots: data.pots.map((pot: any) => ({
        ...pot,
        createdAt: new Date(pot.createdAt),
        updatedAt: new Date(pot.updatedAt),
      })),
      transactions: data.transactions.map((transaction: any) => ({
        ...transaction,
        date: new Date(transaction.date),
        createdAt: new Date(transaction.createdAt),
      })),
    };

    return processedData;
  } catch (error) {
    console.error(`Error loading data for user ${userId}:`, error);
    return { pots: [], transactions: [] };
  }
};

// Local storage fallback for development
const loadSavingsDataLocal = (): SavingsData => {
  try {
    const stored = localStorage.getItem("savings-tracker-data");
    if (!stored) return defaultData;

    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    parsed.pots = parsed.pots.map((pot: any) => ({
      ...pot,
      createdAt: new Date(pot.createdAt),
      updatedAt: new Date(pot.updatedAt),
    }));
    parsed.transactions = parsed.transactions.map((transaction: any) => ({
      ...transaction,
      date: new Date(transaction.date),
      createdAt: new Date(transaction.createdAt),
    }));

    return parsed;
  } catch (error) {
    console.error("Error loading localStorage data:", error);
    return defaultData;
  }
};

export const saveSavingsData = async (_data?: SavingsData): Promise<void> => {
  // This function is now a no-op since we save directly to the API
  // It's kept for compatibility with existing code
  console.log("Data is automatically saved to the API");
};

export const addSavingsPot = async (
  pot: CreateSavingsPot
): Promise<SavingsPot> => {
  if (useLocalStorage) {
    const data = loadSavingsDataLocal();
    const newPot: SavingsPot = {
      ...pot,
      userId: "alex", // Default user for localStorage fallback
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    data.pots.push(newPot);
    localStorage.setItem("savings-tracker-data", JSON.stringify(data));
    return newPot;
  }

  return api.addSavingsPot(pot);
};

export const updateSavingsPot = async (
  id: string,
  updates: Partial<Omit<SavingsPot, "id" | "createdAt">>
): Promise<SavingsPot | null> => {
  if (useLocalStorage) {
    const data = loadSavingsDataLocal();
    const potIndex = data.pots.findIndex((pot) => pot.id === id);

    if (potIndex === -1) return null;

    data.pots[potIndex] = {
      ...data.pots[potIndex],
      ...updates,
      updatedAt: new Date(),
    };

    localStorage.setItem("savings-tracker-data", JSON.stringify(data));
    return data.pots[potIndex];
  }

  return api.updateSavingsPot(id, updates);
};

export const deleteSavingsPot = async (id: string): Promise<boolean> => {
  if (useLocalStorage) {
    const data = loadSavingsDataLocal();
    const initialLength = data.pots.length;
    data.pots = data.pots.filter((pot) => pot.id !== id);
    // Also remove all transactions for this pot
    data.transactions = data.transactions.filter(
      (transaction) => transaction.potId !== id
    );

    if (data.pots.length < initialLength) {
      localStorage.setItem("savings-tracker-data", JSON.stringify(data));
      return true;
    }
    return false;
  }

  return api.deleteSavingsPot(id);
};

export const addTransaction = async (
  transaction: CreateTransaction
): Promise<Transaction> => {
  if (useLocalStorage) {
    const data = loadSavingsDataLocal();
    const newTransaction: Transaction = {
      ...transaction,
      userId: "alex", // Default user for localStorage fallback
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    data.transactions.push(newTransaction);

    // Update the pot's current total
    const pot = data.pots.find((p) => p.id === transaction.potId);
    if (pot) {
      pot.currentTotal += transaction.amount;
      pot.updatedAt = new Date();
    }

    localStorage.setItem("savings-tracker-data", JSON.stringify(data));
    return newTransaction;
  }

  return api.addTransaction(transaction);
};

export const updateTransaction = async (
  id: string,
  updates: Partial<Omit<Transaction, "id" | "createdAt">>
): Promise<Transaction | null> => {
  if (useLocalStorage) {
    const data = loadSavingsDataLocal();
    const transactionIndex = data.transactions.findIndex((t) => t.id === id);

    if (transactionIndex === -1) return null;

    const oldTransaction = data.transactions[transactionIndex];
    const newTransaction = { ...oldTransaction, ...updates };

    // Update pot totals if amount changed
    if (
      updates.amount !== undefined &&
      oldTransaction.amount !== updates.amount
    ) {
      const pot = data.pots.find((p) => p.id === oldTransaction.potId);
      if (pot) {
        pot.currentTotal -= oldTransaction.amount;
        pot.currentTotal += updates.amount!;
        pot.updatedAt = new Date();
      }
    }

    data.transactions[transactionIndex] = newTransaction;
    localStorage.setItem("savings-tracker-data", JSON.stringify(data));
    return newTransaction;
  }

  return api.updateTransaction(id, updates);
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  if (useLocalStorage) {
    const data = loadSavingsDataLocal();
    const transactionIndex = data.transactions.findIndex((t) => t.id === id);

    if (transactionIndex === -1) return false;

    const transaction = data.transactions[transactionIndex];

    // Update pot total
    const pot = data.pots.find((p) => p.id === transaction.potId);
    if (pot) {
      pot.currentTotal -= transaction.amount;
      pot.updatedAt = new Date();
    }

    data.transactions.splice(transactionIndex, 1);
    localStorage.setItem("savings-tracker-data", JSON.stringify(data));
    return true;
  }

  return api.deleteTransaction(id);
};
