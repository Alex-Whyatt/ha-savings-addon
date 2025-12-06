import {
  SavingsData,
  SavingsPot,
  Transaction,
  CreateSavingsPot,
  CreateTransaction,
  User,
  UpcomingSpend,
  CreateUpcomingSpend,
  ExpenseCategory,
  CreateExpenseCategory,
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

// Fetch all available users
export const fetchUsers = async (): Promise<User[]> => {
  try {
    return await apiRequest<User[]>("/users");
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

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

// ==================== Upcoming Spends API ====================

// Fetch all upcoming spends (collaborative - all users see all)
export const fetchUpcomingSpends = async (): Promise<UpcomingSpend[]> => {
  try {
    const spends = await apiRequest<any[]>("/upcoming-spends");
    return spends.map((spend) => ({
      ...spend,
      dueDate: spend.dueDate ? new Date(spend.dueDate) : null,
      createdAt: new Date(spend.createdAt),
      updatedAt: new Date(spend.updatedAt),
    }));
  } catch (error) {
    console.error("Error fetching upcoming spends:", error);
    return [];
  }
};

// Create a new upcoming spend
export const createUpcomingSpend = async (
  spend: CreateUpcomingSpend
): Promise<UpcomingSpend> => {
  const result = await apiRequest<any>("/upcoming-spends", {
    method: "POST",
    body: JSON.stringify({
      ...spend,
      dueDate: spend.dueDate?.toISOString() || null,
    }),
  });

  return {
    ...result,
    dueDate: result.dueDate ? new Date(result.dueDate) : null,
    createdAt: new Date(result.createdAt),
    updatedAt: new Date(result.updatedAt),
  };
};

// Update an upcoming spend
export const updateUpcomingSpend = async (
  id: string,
  updates: Partial<
    Omit<UpcomingSpend, "id" | "userId" | "createdAt" | "updatedAt">
  >
): Promise<UpcomingSpend | null> => {
  try {
    const updateData = { ...updates };
    if (updates.dueDate) {
      (updateData as any).dueDate = updates.dueDate.toISOString();
    }

    const result = await apiRequest<any>(`/upcoming-spends/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    return {
      ...result,
      dueDate: result.dueDate ? new Date(result.dueDate) : null,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt),
    };
  } catch (error) {
    console.error("Error updating upcoming spend:", error);
    return null;
  }
};

// Delete an upcoming spend
export const deleteUpcomingSpend = async (id: string): Promise<boolean> => {
  try {
    await apiRequest(`/upcoming-spends/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting upcoming spend:", error);
    return false;
  }
};

// ==================== Expense Categories API ====================

// Fetch all expense categories (collaborative - all users see all)
export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  try {
    const categories = await apiRequest<any[]>("/expense-categories");
    return categories.map((cat) => ({
      ...cat,
      createdAt: new Date(cat.createdAt),
      updatedAt: new Date(cat.updatedAt),
    }));
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    return [];
  }
};

// Create a new expense category
export const createExpenseCategory = async (
  category: CreateExpenseCategory
): Promise<ExpenseCategory> => {
  const result = await apiRequest<any>("/expense-categories", {
    method: "POST",
    body: JSON.stringify(category),
  });

  return {
    ...result,
    createdAt: new Date(result.createdAt),
    updatedAt: new Date(result.updatedAt),
  };
};

// Update an expense category
export const updateExpenseCategory = async (
  id: string,
  updates: Partial<
    Omit<ExpenseCategory, "id" | "userId" | "createdAt" | "updatedAt">
  >
): Promise<ExpenseCategory | null> => {
  try {
    const result = await apiRequest<any>(`/expense-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });

    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt),
    };
  } catch (error) {
    console.error("Error updating expense category:", error);
    return null;
  }
};

// Delete an expense category
export const deleteExpenseCategory = async (id: string): Promise<boolean> => {
  try {
    await apiRequest(`/expense-categories/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting expense category:", error);
    return false;
  }
};
