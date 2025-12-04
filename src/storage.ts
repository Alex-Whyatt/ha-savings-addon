import { SavingsData, SavingsPot, Transaction } from './types';
import * as api from './api';

const defaultData: SavingsData = {
  pots: [],
  transactions: []
};

export const loadSavingsData = async (): Promise<SavingsData> => {
  try {
    return await api.loadSavingsData();
  } catch (error) {
    console.error('Error loading savings data:', error);
    return defaultData;
  }
};

export const saveSavingsData = async (data: SavingsData): Promise<void> => {
  // This function is now a no-op since we save directly to the API
  // It's kept for compatibility with existing code
  console.log('Data is automatically saved to the API');
};

export const addSavingsPot = async (pot: Omit<SavingsPot, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavingsPot> => {
  return api.addSavingsPot(pot);
};

export const updateSavingsPot = async (id: string, updates: Partial<Omit<SavingsPot, 'id' | 'createdAt'>>): Promise<SavingsPot | null> => {
  return api.updateSavingsPot(id, updates);
};

export const deleteSavingsPot = async (id: string): Promise<boolean> => {
  return api.deleteSavingsPot(id);
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
  return api.addTransaction(transaction);
};

export const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null> => {
  return api.updateTransaction(id, updates);
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  return api.deleteTransaction(id);
};
