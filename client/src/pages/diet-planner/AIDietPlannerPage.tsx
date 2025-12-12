import { useState, useEffect } from "react";
import { ArrowLeft, Flame, Dumbbell, Target, Loader2, Check, Heart, Repeat, Ban, Sparkles, ChevronLeft, ChevronRight, Zap, RefreshCw, Calendar, Apple, Beef, Egg, Salad, Moon, Sun, Coffee, UtensilsCrossed } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type DietGoal = 'fat_loss' | 'muscle_gain' | 'trim_tone';
type DietaryPreference = 'veg' | 'eggetarian' | 'non-veg';
type Duration = 7 | 30;

interface PlanItem {
  id?: string;
  dayNumber: number;
  mealType: string;
  mealId: string;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  isFavorite?: boolean;
  isExcluded?: boolean;
}

interface DietPlan {
  id: string;
  name: string;
  goal: DietGoal;
  durationDays: number;
  targetCalories: number;
  tdee: number;
  dietaryPreference: DietaryPreference;
  macroProtein: number;
  macroCarbs: number;
  macroFat: number;
  items: PlanItem[];
}

export default function AIDietPlannerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedGoal, setSelectedGoal] = useState<DietGoal>('trim_tone');
  const [selectedDuration, setSelectedDuration] = useState<Duration>(7);
  const [selectedDietary, setSelectedDietary] = useState<DietaryPreference>('non-veg');
  
  const [activePlan, setActivePlan] = useState<DietPlan | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: bodyComposition } = useQuery({
    queryKey: ['body-composition'],
    queryFn: async () => {
      const res = await fetch('/api/diet-planner/body-composition', { credentials: 'include' });
      const data = await res.json();
      return data.bodyComposition;
    }
  });

  const { data: savedPlanData, isLoading: isLoadingPlan, isFetching: isFetchingPlan } = useQuery({
    queryKey: ['active-diet-plan'],
    queryFn: async () => {
      const res = await fetch('/api/diet-planner/active-plan', { credentials: 'include' });
      const data = await res.json();
      return data.plan;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (savedPlanData && savedPlanData.items && Array.isArray(savedPlanData.items)) {
      const normalizedPlan = {
        ...savedPlanData,
        items: savedPlanData.items.map((item: any) => ({
          ...item,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
        }))
      };
      setActivePlan(normalizedPlan);
    } else if (savedPlanData === null || (savedPlanData && !savedPlanData.items)) {
      setActivePlan(null);
    }
  }, [savedPlanData]);

  const getActivityMultiplier = (lifestyle: string): number => {
    switch (lifestyle) {
      case 'sedentary': return 1.2;
      case 'moderately_active': return 1.55;
      case 'super_active': return 1.9;
      default: return 1.55;
    }
  };

  const getLifestyleLabel = (lifestyle: string): string => {
    switch (lifestyle) {
      case 'sedentary': return 'Sedentary';
      case 'moderately_active': return 'Moderate';
      case 'super_active': return 'Super Active';
      default: return 'Moderate';
    }
  };

  const activityMultiplier = bodyComposition?.lifestyle 
    ? getActivityMultiplier(bodyComposition.lifestyle) 
    : 1.55;

  const tdee = bodyComposition?.bmr 
    ? Math.round(Number(bodyComposition.bmr) * activityMultiplier) 
    : 2384;

  const handleRefreshBodyComposition = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['body-composition'] });
      toast({ title: 'Updated!', description: 'Body composition data refreshed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to refresh data', variant: 'destructive' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTargetCalories = () => {
    switch (selectedGoal) {
      case 'fat_loss': return tdee - 200;
      case 'muscle_gain': return tdee + 200;
      case 'trim_tone': return tdee;
      default: return tdee;
    }
  };

  const targetCalories = getTargetCalories();

  const generatePlanMutation = useMutation({
    mutationFn: async (params: { goal: DietGoal; duration: Duration; dietaryPreference: DietaryPreference }) => {
      const res = await fetch('/api/diet-planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate plan');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActivePlan(data.plan);
      setActiveDay(1);
      queryClient.invalidateQueries({ queryKey: ['active-diet-plan'] });
      toast({ title: 'Plan generated!', description: `Your ${data.plan.durationDays}-day meal plan is ready.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const swapMealMutation = useMutation({
    mutationFn: async ({ planId, itemId }: { planId: string; itemId: string }) => {
      const res = await fetch(`/api/diet-planner/plans/${planId}/items/${itemId}/swap`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to swap meal');
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (activePlan) {
        const updatedItems = activePlan.items.map(item => 
          item.id === variables.itemId ? { ...item, ...data.newMeal } : item
        );
        setActivePlan({ ...activePlan, items: updatedItems });
      }
      queryClient.invalidateQueries({ queryKey: ['active-diet-plan'] });
      toast({ title: 'Meal swapped!' });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ planId, itemId }: { planId: string; itemId: string }) => {
      const res = await fetch(`/api/diet-planner/plans/${planId}/items/${itemId}/favorite`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to toggle favorite');
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (activePlan) {
        const updatedItems = activePlan.items.map(item => 
          item.id === variables.itemId ? { ...item, isFavorite: data.isFavorite } : item
        );
        setActivePlan({ ...activePlan, items: updatedItems });
      }
      queryClient.invalidateQueries({ queryKey: ['active-diet-plan'] });
    }
  });

  const toggleExcludeMutation = useMutation({
    mutationFn: async ({ planId, itemId }: { planId: string; itemId: string }) => {
      const res = await fetch(`/api/diet-planner/plans/${planId}/items/${itemId}/exclude`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to toggle exclusion');
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (activePlan) {
        const updatedItems = activePlan.items.map(item => 
          item.id === variables.itemId ? { ...item, isExcluded: data.isExcluded } : item
        );
        setActivePlan({ ...activePlan, items: updatedItems });
      }
      queryClient.invalidateQueries({ queryKey: ['active-diet-plan'] });
      toast({ 
        title: data.isExcluded ? 'Meal excluded' : 'Meal restored',
        description: data.isExcluded ? 'This meal will be skipped' : 'This meal is back in your plan'
      });
    }
  });

  const handleGenerate = () => {
    generatePlanMutation.mutate({
      goal: selectedGoal,
      duration: selectedDuration,
      dietaryPreference: selectedDietary
    });
  };

  const handleClearPlan = async () => {
    if (activePlan?.id) {
      try {
        const res = await fetch(`/api/diet-planner/plans/${activePlan.id}/deactivate`, {
          method: 'PATCH',
          credentials: 'include'
        });
        if (!res.ok) {
          toast({ title: 'Error', description: 'Failed to clear plan from server. Try again.', variant: 'destructive' });
          return;
        }
      } catch (e) {
        toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
        return;
      }
    }
    setActivePlan(null);
    setActiveDay(1);
    queryClient.invalidateQueries({ queryKey: ['active-diet-plan'] });
    toast({ title: 'Plan cleared' });
  };

  const getDayMeals = (day: number) => {
    if (!activePlan) return [];
    return activePlan.items.filter(item => item.dayNumber === day);
  };

  const getDailyTotals = (day: number) => {
    const meals = getDayMeals(day).filter(m => !m.isExcluded);
    return {
      calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: meals.reduce((sum, m) => sum + (m.protein || 0), 0),
      carbs: meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
      fat: meals.reduce((sum, m) => sum + (m.fat || 0), 0)
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'veg': return 'bg-emerald-500';
      case 'eggetarian': return 'bg-amber-400';
      case 'non-veg': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'veg': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'eggetarian': return 'bg-amber-500/10 border-amber-500/20';
      case 'non-veg': return 'bg-rose-500/10 border-rose-500/20';
      default: return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  const getMealTypeConfig = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return { icon: Coffee, label: 'Breakfast', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      case 'lunch': return { icon: Sun, label: 'Lunch', color: 'text-orange-400', bg: 'bg-orange-500/10' };
      case 'snack': return { icon: Apple, label: 'Snack', color: 'text-green-400', bg: 'bg-green-500/10' };
      case 'dinner': return { icon: Moon, label: 'Dinner', color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
      default: return { icon: UtensilsCrossed, label: mealType, color: 'text-slate-400', bg: 'bg-slate-500/10' };
    }
  };

  const getDietaryLabel = (pref: DietaryPreference) => {
    switch (pref) {
      case 'veg': return 'Veg';
      case 'eggetarian': return 'Egg';
      case 'non-veg': return 'Non-Veg';
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (!activePlan) return;
    if (direction === 'prev' && activeDay > 1) {
      setActiveDay(activeDay - 1);
    } else if (direction === 'next' && activeDay < activePlan.durationDays) {
      setActiveDay(activeDay + 1);
    }
  };

  // Plan View - Premium Design
  if (activePlan) {
    const dailyTotals = getDailyTotals(activeDay);
    const calorieProgress = Math.min((dailyTotals.calories / activePlan.targetCalories) * 100, 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f1628] via-[#141c32] to-[#1a2340]">
        {/* Premium Sticky Header */}
        <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#0f1628]/80 border-b border-white/5">
          <div className="px-4 py-4 lg:px-8">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleClearPlan}
                  className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5 text-white/70" />
                </button>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">Your Meal Plan</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-orange-400 text-xs font-semibold">{activePlan.targetCalories} kcal/day</span>
                    </div>
                    <span className="text-white/20">•</span>
                    <span className="text-white/40 text-xs">{activePlan.durationDays} days</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleClearPlan}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 active:scale-95"
              >
                New Plan
              </button>
            </div>
          </div>
          
          {/* Day Navigation Carousel */}
          <div className="px-4 pb-4 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateDay('prev')}
                  disabled={activeDay === 1}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 text-white/70" />
                </button>
                
                <div className="flex-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <div className="flex gap-2 py-1" style={{ minWidth: 'max-content' }}>
                    {Array.from({ length: activePlan.durationDays }, (_, i) => i + 1).map(day => (
                      <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`flex-shrink-0 w-11 h-11 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                          activeDay === day 
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/30' 
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => navigateDay('next')}
                  disabled={activeDay === activePlan.durationDays}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 lg:px-8 pb-24 max-w-5xl mx-auto">
          {/* Daily Summary Card - Premium Glass Effect */}
          <div className="relative mb-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-3xl" />
            <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-3xl p-5 md:p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Day {activeDay}</h3>
                    <p className="text-white/40 text-sm">of {activePlan.durationDays} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-white">{Math.round(dailyTotals.calories)}</div>
                  <div className="text-white/40 text-xs">of {activePlan.targetCalories} kcal</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-5">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${calorieProgress}%` }}
                  />
                </div>
              </div>
              
              {/* Macro Grid */}
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="bg-blue-500/10 rounded-2xl p-3 md:p-4 text-center border border-blue-500/10">
                  <div className="text-xl md:text-2xl font-bold text-blue-400">{Math.round(dailyTotals.protein)}g</div>
                  <div className="text-white/40 text-xs mt-1">Protein</div>
                </div>
                <div className="bg-emerald-500/10 rounded-2xl p-3 md:p-4 text-center border border-emerald-500/10">
                  <div className="text-xl md:text-2xl font-bold text-emerald-400">{Math.round(dailyTotals.carbs)}g</div>
                  <div className="text-white/40 text-xs mt-1">Carbs</div>
                </div>
                <div className="bg-amber-500/10 rounded-2xl p-3 md:p-4 text-center border border-amber-500/10">
                  <div className="text-xl md:text-2xl font-bold text-amber-400">{Math.round(dailyTotals.fat)}g</div>
                  <div className="text-white/40 text-xs mt-1">Fat</div>
                </div>
              </div>
            </div>
          </div>

          {/* Meals Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {['breakfast', 'lunch', 'snack', 'dinner'].map(mealType => {
              const meal = getDayMeals(activeDay).find(m => m.mealType === mealType);
              if (!meal) return null;
              
              const mealConfig = getMealTypeConfig(mealType);
              const MealIcon = mealConfig.icon;
              
              return (
                <div 
                  key={mealType}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                    meal.isExcluded 
                      ? 'opacity-60' 
                      : 'hover:scale-[1.02]'
                  }`}
                >
                  <div className={`relative p-5 backdrop-blur-sm ${
                    meal.isExcluded 
                      ? 'bg-rose-500/5 border border-rose-500/20' 
                      : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
                  }`} style={{ borderRadius: '1rem' }}>
                    {/* Meal Type Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${mealConfig.bg} flex items-center justify-center`}>
                          <MealIcon className={`w-6 h-6 ${mealConfig.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${mealConfig.color}`}>
                              {mealConfig.label}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${getCategoryColor(meal.category)}`} />
                          </div>
                          <h4 className={`text-white font-semibold text-base leading-snug ${meal.isExcluded ? 'line-through opacity-60' : ''}`}>
                            {meal.mealName}
                          </h4>
                        </div>
                      </div>
                      
                      {meal.isFavorite && (
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                          <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Nutrition Chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold">
                        <Flame className="w-3 h-3" />
                        {Math.round(meal.calories)} kcal
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs">
                        P: {Math.round(meal.protein)}g
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs">
                        C: {Math.round(meal.carbs)}g
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs">
                        F: {Math.round(meal.fat)}g
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => meal.id && toggleFavoriteMutation.mutate({ planId: activePlan.id, itemId: meal.id })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 ${
                          meal.isFavorite 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${meal.isFavorite ? 'fill-current' : ''}`} />
                        {meal.isFavorite ? 'Saved' : 'Save'}
                      </button>
                      <button 
                        onClick={() => meal.id && swapMealMutation.mutate({ planId: activePlan.id, itemId: meal.id })}
                        disabled={swapMealMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 text-white/60 hover:bg-orange-500/10 hover:text-orange-400 border border-white/10 hover:border-orange-500/30 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        <Repeat className="w-4 h-4" />
                        Swap
                      </button>
                      <button 
                        onClick={() => meal.id && toggleExcludeMutation.mutate({ planId: activePlan.id, itemId: meal.id })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 ${
                          meal.isExcluded 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-white/5 text-white/60 hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 hover:border-rose-500/30'
                        }`}
                      >
                        <Ban className="w-4 h-4" />
                        {meal.isExcluded ? 'Restore' : 'Skip'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Loading State - Premium
  const isHydrating = savedPlanData && !activePlan;
  if (isLoadingPlan || isFetchingPlan || isHydrating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f1628] via-[#141c32] to-[#1a2340] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-amber-500/10 border-b-amber-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-white/50 text-sm font-medium">Loading your plan...</p>
        </div>
      </div>
    );
  }

  // Configuration View - Premium Design
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1628] via-[#141c32] to-[#1a2340]">
      {/* Premium Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#0f1628]/80 border-b border-white/5">
        <div className="px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <Link href="/member/diet-planner">
              <button className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-95">
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">AI Diet Planner</h1>
                <p className="text-white/40 text-xs">Personalised meal plans</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 lg:px-8 pb-32 max-w-3xl mx-auto space-y-6">
        
        {/* TDEE Card - Premium Glass */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent rounded-3xl" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-3xl p-6 border border-white/10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">Your TDEE</p>
                  <p className="text-white/40 text-xs mt-0.5">Total Daily Energy Expenditure</p>
                </div>
              </div>
              <button
                onClick={handleRefreshBodyComposition}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all duration-200 disabled:opacity-50 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-5xl font-bold text-white tracking-tight">
                {tdee.toLocaleString()}
              </p>
              <span className="text-xl font-medium text-white/40">kcal</span>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <span>BMR {bodyComposition?.bmr ? Math.round(Number(bodyComposition.bmr)).toLocaleString() : '—'}</span>
              <span className="text-white/20">×</span>
              <span className="text-cyan-400">{activityMultiplier}</span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs">
                {getLifestyleLabel(bodyComposition?.lifestyle || 'moderately_active')}
              </span>
            </div>
          </div>
        </div>

        {/* Goal Selection - Premium Cards */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-white/40" />
            Select Your Goal
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'fat_loss' as DietGoal, icon: Flame, label: 'Fat Loss', sub: '-200 kcal', color: 'rose', gradient: 'from-rose-500 to-red-500' },
              { id: 'muscle_gain' as DietGoal, icon: Dumbbell, label: 'Build', sub: '+200 kcal', color: 'blue', gradient: 'from-blue-500 to-indigo-500' },
              { id: 'trim_tone' as DietGoal, icon: Target, label: 'Maintain', sub: 'TDEE', color: 'emerald', gradient: 'from-emerald-500 to-teal-500' }
            ].map(goal => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 text-center overflow-hidden group ${
                  selectedGoal === goal.id
                    ? `border-${goal.color}-500 bg-${goal.color}-500/10`
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {selectedGoal === goal.id && (
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-full bg-gradient-to-br ${goal.gradient} flex items-center justify-center`}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <goal.icon className={`w-7 h-7 md:w-8 md:h-8 mx-auto mb-2 transition-colors duration-200 ${
                  selectedGoal === goal.id ? `text-${goal.color}-400` : 'text-white/40 group-hover:text-white/60'
                }`} />
                <p className="text-white text-sm font-semibold mb-0.5">{goal.label}</p>
                <p className="text-white/40 text-xs">{goal.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration - Premium Pills */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/40" />
            Plan Duration
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[7, 30].map(dur => (
              <button
                key={dur}
                onClick={() => setSelectedDuration(dur as Duration)}
                className={`relative py-5 rounded-2xl font-medium transition-all duration-300 overflow-hidden ${
                  selectedDuration === dur
                    ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/30'
                    : 'bg-white/[0.03] text-white/60 hover:bg-white/[0.06] border border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-3xl font-bold">{dur}</span>
                <span className="text-sm ml-1 font-medium">days</span>
                {selectedDuration === dur && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Preference - Premium Toggle Group */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-white/40" />
            Dietary Preference
          </h3>
          <div className="bg-white/[0.02] rounded-2xl p-1.5 border border-white/10">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'veg' as DietaryPreference, icon: Salad, label: 'Veg', color: 'emerald' },
                { id: 'eggetarian' as DietaryPreference, icon: Egg, label: 'Egg', color: 'amber' },
                { id: 'non-veg' as DietaryPreference, icon: Beef, label: 'Non-Veg', color: 'rose' }
              ].map(diet => (
                <button
                  key={diet.id}
                  onClick={() => setSelectedDietary(diet.id)}
                  className={`py-4 rounded-xl font-medium transition-all duration-300 flex flex-col items-center gap-2 ${
                    selectedDietary === diet.id
                      ? `bg-${diet.color}-500 text-white shadow-lg shadow-${diet.color}-500/30`
                      : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <diet.icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{diet.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Card - Premium Glass */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-2xl" />
          <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-2xl p-5 border border-white/10">
            <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">Plan Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-orange-400">{targetCalories.toLocaleString()}</p>
                <p className="text-white/40 text-xs mt-0.5">kcal/day</p>
              </div>
              <div>
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">{selectedDuration}</p>
                <p className="text-white/40 text-xs mt-0.5">days</p>
              </div>
              <div>
                <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
                  selectedDietary === 'veg' ? 'bg-emerald-500/10' :
                  selectedDietary === 'eggetarian' ? 'bg-amber-500/10' : 'bg-rose-500/10'
                }`}>
                  {selectedDietary === 'veg' ? <Salad className="w-6 h-6 text-emerald-400" /> :
                   selectedDietary === 'eggetarian' ? <Egg className="w-6 h-6 text-amber-400" /> :
                   <Beef className="w-6 h-6 text-rose-400" />}
                </div>
                <p className={`text-2xl font-bold ${
                  selectedDietary === 'veg' ? 'text-emerald-400' :
                  selectedDietary === 'eggetarian' ? 'text-amber-400' : 'text-rose-400'
                }`}>{getDietaryLabel(selectedDietary)}</p>
                <p className="text-white/40 text-xs mt-0.5">diet</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-[#0f1628] via-[#0f1628]/95 to-transparent">
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={handleGenerate}
            disabled={generatePlanMutation.isPending}
            className="w-full py-6 text-base font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-600 hover:to-orange-500 rounded-2xl shadow-2xl shadow-orange-500/30 border-0 transition-all duration-300 active:scale-[0.98]"
          >
            {generatePlanMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating your plan...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate My Plan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
