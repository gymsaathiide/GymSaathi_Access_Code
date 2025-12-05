import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = '/api/diet-planner';

export interface MealLogItem {
  id: string;
  user_food_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
  created_at: string;
  user_food?: {
    id: string;
    name: string;
    name_hindi?: string;
    brand?: string;
    serving_description?: string;
    source_id?: string;
    fatsecret_food_id?: string;
    image_url?: string | null;
  };
}

export interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: MealLogItem[];
}

export interface DailyNutritionData {
  date: string;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  byMeal: {
    breakfast: MealTotals;
    lunch: MealTotals;
    dinner: MealTotals;
    snack: MealTotals;
  };
}

interface LogFoodParams {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logDate: string;
  source: 'fatsecret' | 'catalog' | 'manual';
  fatsecretFoodId?: string;
  servingId?: string;
  foodName: string;
  nameHindi?: string;
  brand?: string;
  servingDescription: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  quantity: number;
  notes?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  imageUrl?: string;
}

export function useDailyNutrition(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily-nutrition', date],
    queryFn: async (): Promise<DailyNutritionData> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const emptyTotals = (): MealTotals => ({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        items: []
      });

      try {
        const response = await fetch(`${API_BASE}/meal-logs?date=${date}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          return {
            date,
            totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            byMeal: {
              breakfast: emptyTotals(),
              lunch: emptyTotals(),
              dinner: emptyTotals(),
              snack: emptyTotals(),
            },
          };
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching meal logs:', error);
        return {
          date,
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          byMeal: {
            breakfast: emptyTotals(),
            lunch: emptyTotals(),
            dinner: emptyTotals(),
            snack: emptyTotals(),
          },
        };
      }
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

export function useLogFood() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: LogFoodParams) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE}/log-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to log food');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-nutrition', data.logDate] });
    }
  });
}

export function useDeleteMealLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ logId, date }: { logId: string; date: string }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE}/meal-logs/${logId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete meal log');
      }

      return { logId, date };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-nutrition', data.date] });
    }
  });
}
