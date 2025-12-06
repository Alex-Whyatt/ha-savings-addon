import { useState, useEffect, useRef } from "react";
import { SavingsData, SavingsProjection, User } from "../types";
import { loadSavingsData, loadSavingsDataForUser } from "../storage";
import { calculateAllProjections } from "../projections";

interface UseSavingsDataResult {
  data: SavingsData;
  combinedData: SavingsData;
  projections: SavingsProjection[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export const useSavingsData = (
  userId: string | null,
  otherUsers: User[] = []
): UseSavingsDataResult => {
  const [data, setData] = useState<SavingsData>({ pots: [], transactions: [] });
  const [combinedData, setCombinedData] = useState<SavingsData>({
    pots: [],
    transactions: [],
  });
  const [projections, setProjections] = useState<SavingsProjection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to otherUsers for use in refreshData
  const otherUsersRef = useRef(otherUsers);
  otherUsersRef.current = otherUsers;

  const loadDataForUser = async (user: string, others: User[]) => {
    try {
      setError(null);
      setIsLoading(true);

      console.log("Loading data for user:", user);
      const savingsData = await loadSavingsData();
      console.log("Loaded user's own data:", savingsData);
      setData(savingsData);

      // Load all other users' data
      const otherUsersData = await Promise.all(
        others.map(async (otherUser) => {
          console.log("Loading other user's data for:", otherUser.id);
          return loadSavingsDataForUser(otherUser.id);
        })
      );

      // Combine all data
      const allOtherPots = otherUsersData.flatMap((d) => d.pots);
      const allOtherTransactions = otherUsersData.flatMap(
        (d) => d.transactions
      );

      const combinedDataObj = {
        pots: [...savingsData.pots, ...allOtherPots],
        transactions: [...savingsData.transactions, ...allOtherTransactions],
      };
      console.log("Combined data pots:", combinedDataObj.pots);
      setCombinedData(combinedDataObj);

      const proj = calculateAllProjections(combinedDataObj);
      console.log("Projections:", proj);
      setProjections(proj);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load data. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    if (userId) {
      await loadDataForUser(userId, otherUsersRef.current);
    }
  };

  useEffect(() => {
    if (userId) {
      loadDataForUser(userId, otherUsers);
    }
  }, [userId, otherUsers.length]);

  return {
    data,
    combinedData,
    projections,
    isLoading,
    error,
    refreshData,
  };
};
