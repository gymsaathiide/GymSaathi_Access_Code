import { useState } from "react";
import { ArrowLeft, Flame, Dumbbell, Target, Loader2, Check, Heart, Repeat, Ban, Sparkles, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  
  const [selectedGoal, setSelectedGoal] = useState<DietGoal>('trim_tone');
  const [selectedDuration, setSelectedDuration] = useState<Duration>(7);
  const [selectedDietary, setSelectedDietary] = useState<DietaryPreference>('non-veg');
  
  const [activePlan, setActivePlan] = useState<DietPlan | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);

  const { data: bodyComposition } = useQuery({
    queryKey: ['body-composition'],
    queryFn: async () => {
      const res = await fetch('/api/diet-planner/body-composition', { credentials: 'include' });
      const data = await res.json();
      return data.bodyComposition;
    }
  });

  const tdee = bodyComposition?.bmr 
    ? Math.round(Number(bodyComposition.bmr) * 1.55) 
    : 2384;

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

  const handleClearPlan = () => {
    setActivePlan(null);
    setActiveDay(1);
    toast({ title: 'Plan cleared' });
  };

  const getDayMeals = (day: number) => {
    if (!activePlan) return [];
    return activePlan.items.filter(item => item.dayNumber === day);
  };

  const getDailyTotals = (day: number) => {
    const meals = getDayMeals(day).filter(m => !m.isExcluded);
    return {
      calories: meals.reduce((sum, m) => sum + m.calories, 0),
      protein: meals.reduce((sum, m) => sum + m.protein, 0),
      carbs: meals.reduce((sum, m) => sum + m.carbs, 0),
      fat: meals.reduce((sum, m) => sum + m.fat, 0)
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'veg': return 'bg-green-500';
      case 'eggetarian': return 'bg-amber-500';
      case 'non-veg': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'snack': return '🍎';
      case 'dinner': return '🌙';
      default: return '🍽️';
    }
  };

  const getDietaryLabel = (pref: DietaryPreference) => {
    switch (pref) {
      case 'veg': return 'Veg';
      case 'eggetarian': return 'Egg';
      case 'non-veg': return 'Non-Veg';
    }
  };

  const getDietaryEmoji = (pref: DietaryPreference) => {
    switch (pref) {
      case 'veg': return '🥗';
      case 'eggetarian': return '🍳';
      case 'non-veg': return '🍗';
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

  // Plan View - Mobile optimized
  if (activePlan) {
    const dailyTotals = getDailyTotals(activeDay);
    
    return (
      <div className="min-h-screen bg-[#1b233d]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-[#1b233d]/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearPlan}
                  className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">Your Meal Plan</h1>
                  <p className="text-orange-400 text-xs font-medium">{activePlan.targetCalories} kcal/day target</p>
                </div>
              </div>
              <button 
                onClick={handleClearPlan}
                className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors"
              >
                New Plan
              </button>
            </div>
          </div>
          
          {/* Day Navigation - Fully scrollable */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigateDay('prev')}
                disabled={activeDay === 1}
                className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              
              <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                <div className="flex gap-1.5 py-1 px-1" style={{ minWidth: 'max-content' }}>
                  {Array.from({ length: activePlan.durationDays }, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={`flex-shrink-0 w-9 h-9 rounded-full text-sm font-medium transition-all ${
                        activeDay === day 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
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
                className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 pb-20 space-y-4">
          {/* Daily Summary Card */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Day {activeDay}</h3>
              <span className="text-xs text-white/50">of {activePlan.durationDays} days</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-xl bg-orange-500/10">
                <p className="text-xl md:text-2xl font-bold text-orange-400">{Math.round(dailyTotals.calories)}</p>
                <p className="text-white/50 text-[10px] md:text-xs">kcal</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-blue-500/10">
                <p className="text-xl md:text-2xl font-bold text-blue-400">{Math.round(dailyTotals.protein)}g</p>
                <p className="text-white/50 text-[10px] md:text-xs">Protein</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-green-500/10">
                <p className="text-xl md:text-2xl font-bold text-green-400">{Math.round(dailyTotals.carbs)}g</p>
                <p className="text-white/50 text-[10px] md:text-xs">Carbs</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-yellow-500/10">
                <p className="text-xl md:text-2xl font-bold text-yellow-400">{Math.round(dailyTotals.fat)}g</p>
                <p className="text-white/50 text-[10px] md:text-xs">Fat</p>
              </div>
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-3">
            {['breakfast', 'lunch', 'snack', 'dinner'].map(mealType => {
              const meal = getDayMeals(activeDay).find(m => m.mealType === mealType);
              if (!meal) return null;
              
              return (
                <div 
                  key={mealType}
                  className={`rounded-2xl overflow-hidden transition-all ${
                    meal.isExcluded 
                      ? 'opacity-50' 
                      : ''
                  }`}
                >
                  <div className={`p-4 ${
                    meal.isExcluded 
                      ? 'bg-red-500/5 border border-red-500/20' 
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {/* Meal Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                          {getMealTypeIcon(mealType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-xs uppercase tracking-wide">{mealType}</span>
                            <span className={`w-2 h-2 rounded-full ${getCategoryColor(meal.category)}`}></span>
                          </div>
                          <h4 className="text-white font-medium text-sm md:text-base leading-tight">{meal.mealName}</h4>
                        </div>
                      </div>
                      
                      {meal.isFavorite && (
                        <Heart className="w-4 h-4 fill-red-500 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    {/* Nutrition Row - Responsive */}
                    <div className="bg-white/5 rounded-xl p-2.5 mb-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-orange-400 font-medium">{Math.round(meal.calories)} kcal</span>
                        <span className="text-white/50">P: {Math.round(meal.protein)}g</span>
                        <span className="text-white/50">C: {Math.round(meal.carbs)}g</span>
                        <span className="text-white/50">F: {Math.round(meal.fat)}g</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => meal.id && toggleFavoriteMutation.mutate({ planId: activePlan.id, itemId: meal.id })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                          meal.isFavorite 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${meal.isFavorite ? 'fill-current' : ''}`} />
                        {meal.isFavorite ? 'Saved' : 'Save'}
                      </button>
                      <button 
                        onClick={() => meal.id && swapMealMutation.mutate({ planId: activePlan.id, itemId: meal.id })}
                        className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        Swap
                      </button>
                      <button 
                        onClick={() => meal.id && toggleExcludeMutation.mutate({ planId: activePlan.id, itemId: meal.id })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                          meal.isExcluded 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 border border-white/10'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
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

  // Configuration View - Mobile optimized
  return (
    <div className="min-h-screen bg-[#1b233d]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1b233d]/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/member/diet-planner">
            <button className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Diet Planner</h1>
              <p className="text-white/50 text-xs">Personalised meal plans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-8 space-y-5">
        
        {/* TDEE Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-indigo-500/20 border border-cyan-500/30 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-xs font-medium uppercase tracking-wide">Your TDEE</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {tdee.toLocaleString()}
              <span className="text-lg font-normal text-white/60 ml-1">kcal</span>
            </p>
            <p className="text-white/50 text-xs">Total Daily Energy Expenditure</p>
          </div>
        </div>

        {/* Goal Selection */}
        <div>
          <h3 className="text-white font-semibold mb-3 text-sm">Select Your Goal</h3>
          <div className="grid grid-cols-3 gap-2">
            {/* Fat Loss */}
            <button
              onClick={() => setSelectedGoal('fat_loss')}
              className={`relative p-3 md:p-4 rounded-xl border-2 transition-all text-center ${
                selectedGoal === 'fat_loss'
                  ? 'border-red-500 bg-red-500/15'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {selectedGoal === 'fat_loss' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <Flame className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 ${selectedGoal === 'fat_loss' ? 'text-red-400' : 'text-white/50'}`} />
              <p className="text-white text-xs md:text-sm font-medium">Fat Loss</p>
              <p className="text-white/40 text-[10px] md:text-xs mt-0.5">-200 kcal</p>
            </button>

            {/* Muscle Gain */}
            <button
              onClick={() => setSelectedGoal('muscle_gain')}
              className={`relative p-3 md:p-4 rounded-xl border-2 transition-all text-center ${
                selectedGoal === 'muscle_gain'
                  ? 'border-blue-500 bg-blue-500/15'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {selectedGoal === 'muscle_gain' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <Dumbbell className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 ${selectedGoal === 'muscle_gain' ? 'text-blue-400' : 'text-white/50'}`} />
              <p className="text-white text-xs md:text-sm font-medium">Build Muscle</p>
              <p className="text-white/40 text-[10px] md:text-xs mt-0.5">+200 kcal</p>
            </button>

            {/* Trim & Tone */}
            <button
              onClick={() => setSelectedGoal('trim_tone')}
              className={`relative p-3 md:p-4 rounded-xl border-2 transition-all text-center ${
                selectedGoal === 'trim_tone'
                  ? 'border-green-500 bg-green-500/15'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {selectedGoal === 'trim_tone' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <Target className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 ${selectedGoal === 'trim_tone' ? 'text-green-400' : 'text-white/50'}`} />
              <p className="text-white text-xs md:text-sm font-medium">Maintain</p>
              <p className="text-white/40 text-[10px] md:text-xs mt-0.5">TDEE</p>
            </button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <h3 className="text-white font-semibold mb-3 text-sm">Plan Duration</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedDuration(7)}
              className={`py-4 rounded-xl font-medium transition-all ${
                selectedDuration === 7
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span className="text-2xl font-bold">7</span>
              <span className="text-sm ml-1">days</span>
            </button>
            <button
              onClick={() => setSelectedDuration(30)}
              className={`py-4 rounded-xl font-medium transition-all ${
                selectedDuration === 30
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span className="text-2xl font-bold">30</span>
              <span className="text-sm ml-1">days</span>
            </button>
          </div>
        </div>

        {/* Dietary Preference */}
        <div>
          <h3 className="text-white font-semibold mb-3 text-sm">Dietary Preference</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedDietary('veg')}
              className={`py-3.5 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                selectedDietary === 'veg'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span className="text-xl">🥗</span>
              <span className="text-xs">Veg</span>
            </button>
            <button
              onClick={() => setSelectedDietary('eggetarian')}
              className={`py-3.5 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                selectedDietary === 'eggetarian'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span className="text-xl">🍳</span>
              <span className="text-xs">Egg</span>
            </button>
            <button
              onClick={() => setSelectedDietary('non-veg')}
              className={`py-3.5 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                selectedDietary === 'non-veg'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span className="text-xl">🍗</span>
              <span className="text-xs">Non-Veg</span>
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-white/50 text-[10px] mb-1">Target</p>
              <p className="text-lg font-bold text-orange-400">{targetCalories.toLocaleString()}</p>
              <p className="text-white/40 text-[10px]">kcal/day</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] mb-1">Duration</p>
              <p className="text-lg font-bold text-white">{selectedDuration}</p>
              <p className="text-white/40 text-[10px]">days</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] mb-1">Diet</p>
              <p className="text-lg">{getDietaryEmoji(selectedDietary)}</p>
              <p className="text-white/40 text-[10px]">{getDietaryLabel(selectedDietary)}</p>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generatePlanMutation.isPending}
          className="w-full py-6 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-lg shadow-orange-500/25"
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
  );
}
