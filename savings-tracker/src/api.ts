import {
  SavingsData,
  SavingsPot,
  Transaction,
  CreateSavingsPot,
  CreateTransaction,
} from "./types";

// Use relative URL for production (HA ingress), absolute URL only for local dev
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "./api";

// Helper function to handle API responses
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get session ID for authorization
  const sessionId = localStorage.getItem("sessionId");

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(sessionId && { Authorization: sessionId }),
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

// Load user-specific savings data
export const loadSavingsData = async (): Promise<SavingsData> => {
  try {
    return await apiRequest<SavingsData>("/user/data");
  } catch (error) {
    console.error("Error loading API data:", error);
    return { pots: [], transactions: [] };
  }
};

// Load data for a specific user (admin/shared view)
export const loadUserData = async (userId: string): Promise<SavingsData> => {
  try {
    return await apiRequest<SavingsData>(`/admin/user/${userId}/data`);
  } catch (error) {
    console.error(`Error loading data for user ${userId}:`, error);
    return { pots: [], transactions: [] };
  }
};

// Savings Pot operations
export const addSavingsPot = async (
  pot: CreateSavingsPot
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
  transaction: CreateTransaction
): Promise<Transaction> => {
  const result = await apiRequest<any>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      ...transaction,
      date: transaction.date.toISOString(),
    }),
  });

  // Convert date strings back to Date objects
  return {
    ...result,
    date: new Date(result.date),
    createdAt: new Date(result.createdAt),
  };
};

export const updateTransaction = async (
  id: string,
  updates: Partial<Omit<Transaction, "id" | "createdAt">>
): Promise<Transaction | null> => {
  try {
    const updateData = { ...updates };
    if (updates.date) {
      (updateData as any).date = updates.date.toISOString();
    }

    const result = await apiRequest<any>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    // Convert date strings back to Date objects
    return {
      ...result,
      date: new Date(result.date),
      createdAt: new Date(result.createdAt),
    };
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
