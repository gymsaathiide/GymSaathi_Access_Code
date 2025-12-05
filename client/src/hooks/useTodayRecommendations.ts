import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface Recommendation {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  source: 'catalog' | 'fatsecret';
  catalogMealId?: number;
  fatsecretFoodId?: string;
  foodName: string;
  nameHindi?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingDescription: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isFastingFriendly?: boolean;
  cuisine?: string;
  region?: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
}

export interface RecommendationsResponse {
  ok: boolean;
  date: string;
  remainingCalories: number;
  remainingProtein: number;
  recommendations: Recommendation[];
}

interface UseRecommendationsParams {
  date: string;
  dietGoal?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFats?: number;
  consumedCalories?: number;
  consumedProtein?: number;
  consumedCarbs?: number;
  consumedFats?: number;
  preferences?: {
    isVegetarian?: boolean;
    isVegan?: boolean;
    isFasting?: boolean;
    noOnionGarlic?: boolean;
    indianOnly?: boolean;
  };
  recentFoodNames?: string[];
}

export function useTodayRecommendations(params: UseRecommendationsParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'recommend-today', 
      params.date, 
      params.dietGoal,
      params.targetCalories,
      params.targetProtein,
      params.targetCarbs,
      params.targetFats,
      params.consumedCalories,
      params.consumedProtein,
      params.consumedCarbs,
      params.consumedFats,
      params.preferences?.isVegetarian,
      params.preferences?.isVegan,
      params.preferences?.isFasting,
      params.preferences?.noOnionGarlic,
      params.preferences?.indianOnly,
      params.recentFoodNames?.join(',')
    ],
    queryFn: async (): Promise<RecommendationsResponse> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/diet-planner/recommend-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          date: params.date,
          dietGoal: params.dietGoal,
          targetCalories: params.targetCalories,
          targetProtein: params.targetProtein,
          targetCarbs: params.targetCarbs,
          targetFats: params.targetFats,
          consumedCalories: params.consumedCalories,
          consumedProtein: params.consumedProtein,
          consumedCarbs: params.consumedCarbs,
          consumedFats: params.consumedFats,
          preferences: params.preferences,
          recentFoodNames: params.recentFoodNames
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to get recommendations');
      }

      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
