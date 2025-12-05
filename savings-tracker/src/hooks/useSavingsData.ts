import { useState, useEffect } from "react";
import { SavingsData, SavingsProjection } from "../types";
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

export const useSavingsData = (userId: string | null): UseSavingsDataResult => {
  const [data, setData] = useState<SavingsData>({ pots: [], transactions: [] });
  const [combinedData, setCombinedData] = useState<SavingsData>({
    pots: [],
    transactions: [],
  });
  const [projections, setProjections] = useState<SavingsProjection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDataForUser = async (user: string) => {
    try {
      setError(null);
      setIsLoading(true);

      console.log("Loading data for user:", user);
      const savingsData = await loadSavingsData();
      console.log("Loaded user's own data:", savingsData);
      setData(savingsData);

      // Load the other user's data
      const otherUserId = user === "alex" ? "beth" : "alex";
      console.log("Loading other user's data for:", otherUserId);
      const otherUserData = await loadSavingsDataForUser(otherUserId);
      console.log("Loaded other user's data:", otherUserData);

      // Combine the data
      const combinedDataObj = {
        pots: [...savingsData.pots, ...otherUserData.pots],
        transactions: [
          ...savingsData.transactions,
          ...otherUserData.transactions,
        ],
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
      await loadDataForUser(userId);
    }
  };

  useEffect(() => {
    if (userId) {
      loadDataForUser(userId);
    }
  }, [userId]);

  return {
    data,
    combinedData,
    projections,
    isLoading,
    error,
    refreshData,
  };
};
