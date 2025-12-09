import { useState } from "react";
import { ArrowLeft, Flame, Dumbbell, Target, Loader2, Check, Heart, Repeat, Ban, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type MealTab = 'breakfast' | 'lunch' | 'dinner';
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
  
  // State for configuration
  const [activeMealTab, setActiveMealTab] = useState<MealTab>('breakfast');
  const [selectedGoal, setSelectedGoal] = useState<DietGoal>('trim_tone');
  const [selectedDuration, setSelectedDuration] = useState<Duration>(7);
  const [selectedDietary, setSelectedDietary] = useState<DietaryPreference>('non-veg');
  
  // State for generated plan
  const [activePlan, setActivePlan] = useState<DietPlan | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);

  // Fetch body composition data to get TDEE
  // TDEE (Total Daily Energy Expenditure) comes from BMR calculated in body composition
  const { data: bodyComposition } = useQuery({
    queryKey: ['body-composition'],
    queryFn: async () => {
      const res = await fetch('/api/diet-planner/body-composition', { credentials: 'include' });
      const data = await res.json();
      return data.bodyComposition;
    }
  });

  // Calculate TDEE from BMR with activity multiplier (default: moderately active = 1.55)
  const tdee = bodyComposition?.bmr 
    ? Math.round(Number(bodyComposition.bmr) * 1.55) 
    : 2384;

  // Calculate target calories based on selected goal
  // Fat Loss: TDEE - 200 kcal (caloric deficit)
  // Muscle Gain: TDEE + 200 kcal (caloric surplus)
  // Trim and Tone: TDEE (maintenance)
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

  const getDietaryLabel = () => {
    switch (selectedDietary) {
      case 'veg': return 'Veg';
      case 'eggetarian': return 'Egg';
      case 'non-veg': return 'Non-Veg';
    }
  };

  // If plan is generated, show the plan view
  if (activePlan) {
    return (
      <div className="min-h-screen bg-[#1b233d] p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleClearPlan}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">{activePlan.name}</h1>
                <p className="text-white/60 text-sm">Target: {activePlan.targetCalories} kcal/day</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearPlan}>
              New Plan
            </Button>
          </div>

          {/* Day Navigation */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: activePlan.durationDays }, (_, i) => i + 1).map(day => (
                <Button
                  key={day}
                  variant={activeDay === day ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDay(day)}
                  className={`min-w-[60px] ${activeDay === day ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                  Day {day}
                </Button>
              ))}
            </div>
          </div>

          {/* Daily Summary */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <h3 className="text-white font-semibold mb-3">Day {activeDay} Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-orange-400">{Math.round(getDailyTotals(activeDay).calories)}</p>
                <p className="text-white/60 text-xs">Calories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{Math.round(getDailyTotals(activeDay).protein)}g</p>
                <p className="text-white/60 text-xs">Protein</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{Math.round(getDailyTotals(activeDay).carbs)}g</p>
                <p className="text-white/60 text-xs">Carbs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{Math.round(getDailyTotals(activeDay).fat)}g</p>
                <p className="text-white/60 text-xs">Fat</p>
              </div>
            </div>
          </div>

          {/* Meals for the day */}
          <div className="space-y-4">
            {['breakfast', 'lunch', 'snack', 'dinner'].map(mealType => {
              const meal = getDayMeals(activeDay).find(m => m.mealType === mealType);
              if (!meal) return null;
              
              return (
                <div 
                  key={mealType}
                  className={`rounded-xl p-4 border transition-all ${
                    meal.isExcluded 
                      ? 'bg-red-500/5 border-red-500/30 opacity-60' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getMealTypeIcon(mealType)}</span>
                        <span className="text-white/60 text-sm capitalize">{mealType}</span>
                        <span className={`w-2 h-2 rounded-full ${getCategoryColor(meal.category)}`}></span>
                      </div>
                      <h4 className="text-white font-medium mb-1">{meal.mealName}</h4>
                      <div className="flex gap-3 text-xs text-white/50">
                        <span>{Math.round(meal.calories)} kcal</span>
                        <span>P: {Math.round(meal.protein)}g</span>
                        <span>C: {Math.round(meal.carbs)}g</span>
                        <span>F: {Math.round(meal.fat)}g</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        title="Favorite"
                        onClick={() => meal.id && toggleFavoriteMutation.mutate({ 
                          planId: activePlan.id, 
                          itemId: meal.id 
                        })}
                      >
                        <Heart className={`w-4 h-4 ${meal.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        title="Swap meal"
                        onClick={() => meal.id && swapMealMutation.mutate({ 
                          planId: activePlan.id, 
                          itemId: meal.id 
                        })}
                      >
                        <Repeat className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className={`h-8 w-8 ${meal.isExcluded ? 'text-red-500' : ''}`}
                        title={meal.isExcluded ? 'Restore meal' : 'Exclude meal'}
                        onClick={() => meal.id && toggleExcludeMutation.mutate({ 
                          planId: activePlan.id, 
                          itemId: meal.id 
                        })}
                      >
                        <Ban className={`w-4 h-4 ${meal.isExcluded ? 'fill-red-500/20' : ''}`} />
                      </Button>
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

  // Configuration view
  return (
    <div className="min-h-screen bg-[#1b233d] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/member/diet-planner">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-400" />
              Diet Plan
            </h1>
            <p className="text-white/60 text-sm">Configure your personalised meal plan</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-6">
          
          {/* Meal Type Selector - Tab row */}
          <div>
            <div className="flex rounded-xl bg-white/5 p-1">
              {(['breakfast', 'lunch', 'dinner'] as MealTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveMealTab(tab)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
                    activeMealTab === tab 
                      ? 'bg-orange-500 text-white' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2 text-center">
              {activeMealTab.charAt(0).toUpperCase() + activeMealTab.slice(1)} plan settings selected
            </p>
          </div>

          {/* TDEE Information Card */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-5 border border-cyan-500/30">
            <p className="text-white/70 text-sm mb-1">Your TDEE</p>
            <p className="text-3xl font-bold text-white mb-1">{tdee} <span className="text-lg font-normal text-white/70">kcal</span></p>
            <p className="text-white/50 text-xs">Calculated from your body composition</p>
          </div>

          {/* Goal Selection */}
          <div>
            <h3 className="text-white font-semibold mb-3">Select your goal</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Fat Loss Card */}
              <button
                onClick={() => setSelectedGoal('fat_loss')}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  selectedGoal === 'fat_loss'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {selectedGoal === 'fat_loss' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Flame className={`w-8 h-8 mb-2 ${selectedGoal === 'fat_loss' ? 'text-red-400' : 'text-white/60'}`} />
                <h4 className="text-white font-semibold">Fat Loss</h4>
                <p className="text-white/50 text-xs">TDEE - 200 kcal</p>
              </button>

              {/* Muscle Gain Card */}
              <button
                onClick={() => setSelectedGoal('muscle_gain')}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  selectedGoal === 'muscle_gain'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {selectedGoal === 'muscle_gain' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Dumbbell className={`w-8 h-8 mb-2 ${selectedGoal === 'muscle_gain' ? 'text-blue-400' : 'text-white/60'}`} />
                <h4 className="text-white font-semibold">Muscle Gain</h4>
                <p className="text-white/50 text-xs">TDEE + 200 kcal</p>
              </button>

              {/* Trim and Tone Card */}
              <button
                onClick={() => setSelectedGoal('trim_tone')}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  selectedGoal === 'trim_tone'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {selectedGoal === 'trim_tone' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Target className={`w-8 h-8 mb-2 ${selectedGoal === 'trim_tone' ? 'text-green-400' : 'text-white/60'}`} />
                <h4 className="text-white font-semibold">Trim and Tone</h4>
                <p className="text-white/50 text-xs">TDEE (Maintenance)</p>
              </button>
            </div>
          </div>

          {/* Plan Duration */}
          <div>
            <h3 className="text-white font-semibold mb-3">Plan duration</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDuration(7)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  selectedDuration === 7
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                7 days
              </button>
              <button
                onClick={() => setSelectedDuration(30)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  selectedDuration === 30
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                30 days
              </button>
            </div>
          </div>

          {/* Dietary Preference */}
          <div>
            <h3 className="text-white font-semibold mb-3">Dietary preference</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDietary('veg')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedDietary === 'veg'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                🥗 Veg
              </button>
              <button
                onClick={() => setSelectedDietary('eggetarian')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedDietary === 'eggetarian'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                🍳 Egg
              </button>
              <button
                onClick={() => setSelectedDietary('non-veg')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedDietary === 'non-veg'
                    ? 'bg-red-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                🍗 Non-Veg
              </button>
            </div>
          </div>

          {/* Plan Summary */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/60 text-sm text-center">
              <span className="text-white font-medium">Target:</span> {targetCalories} kcal/day · 
              <span className="text-white font-medium"> Duration:</span> {selectedDuration} days · 
              <span className="text-white font-medium"> Preference:</span> {getDietaryLabel()}
            </p>
          </div>

          {/* Generate Plan Button */}
          <Button
            onClick={handleGenerate}
            disabled={generatePlanMutation.isPending}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            {generatePlanMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Plan'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
