import { SavingsData, SavingsPot, Transaction } from "./types";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3001/api";

// Helper function to handle API responses
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Load all savings data
export const loadSavingsData = async (): Promise<SavingsData> => {
  try {
    return await apiRequest<SavingsData>("/data");
  } catch (error) {
    console.error("Error loading savings data:", error);
    return { pots: [], transactions: [] };
  }
};

// Savings Pot operations
export const addSavingsPot = async (
  pot: Omit<SavingsPot, "id" | "createdAt" | "updatedAt">
): Promise<SavingsPot> => {
  return apiRequest<SavingsPot>("/pots", {
    method: "POST",
    body: JSON.stringify(pot),
  });
};

export const updateSavingsPot = async (
  id: string,
  updates: Partial<Omit<SavingsPot, "id" | "createdAt">>
): Promise<SavingsPot | null> => {
  try {
    return await apiRequest<SavingsPot>(`/pots/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error("Error updating pot:", error);
    return null;
  }
};

export const deleteSavingsPot = async (id: string): Promise<boolean> => {
  try {
    await apiRequest(`/pots/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting pot:", error);
    return false;
  }
};

// Transaction operations
export const addTransaction = async (
  transaction: Omit<Transaction, "id" | "createdAt">
): Promise<Transaction> => {
  return apiRequest<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      ...transaction,
      date: transaction.date.toISOString(),
    }),
  });
};

export const updateTransaction = async (
  id: string,
  updates: Partial<Omit<Transaction, "id" | "createdAt">>
): Promise<Transaction | null> => {
  try {
    const updateData = { ...updates };
    if (updates.date) {
      updateData.date = updates.date.toISOString();
    }

    return await apiRequest<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return null;
  }
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  try {
    await apiRequest(`/transactions/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return false;
  }
};
