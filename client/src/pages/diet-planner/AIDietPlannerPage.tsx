import { useState } from "react";
import { ArrowLeft, Flame, Dumbbell, Target, Loader2, RefreshCw, Heart, X, Repeat, Calendar, Utensils, Ban } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type DietGoal = 'fat_loss' | 'muscle_gain' | 'trim_tone';
type DietaryPreference = 'veg' | 'eggetarian' | 'non-veg';
type FestivalMode = 'none' | 'navratri' | 'ekadashi' | 'fasting';
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
  festivalMode: FestivalMode;
  macroProtein: number;
  macroCarbs: number;
  macroFat: number;
  items: PlanItem[];
}

const goalConfig = {
  fat_loss: {
    title: 'Fat Loss',
    subtitle: 'TDEE - 200 kcal',
    icon: Flame,
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    textColor: 'text-red-400'
  },
  muscle_gain: {
    title: 'Muscle Gain',
    subtitle: 'TDEE + 200 kcal',
    icon: Dumbbell,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-400'
  },
  trim_tone: {
    title: 'Trim & Tone',
    subtitle: 'TDEE (Maintenance)',
    icon: Target,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    textColor: 'text-green-400'
  }
};

const dietaryConfig = {
  veg: { label: 'Veg', emoji: '🥗', color: 'bg-green-500', borderColor: 'border-green-500' },
  eggetarian: { label: 'Egg', emoji: '🍳', color: 'bg-amber-500', borderColor: 'border-amber-500' },
  'non-veg': { label: 'Non-Veg', emoji: '🍗', color: 'bg-red-500', borderColor: 'border-red-500' }
};

const festivalConfig = {
  none: { label: 'None', emoji: '✨' },
  navratri: { label: 'Navratri', emoji: '🙏' },
  ekadashi: { label: 'Ekadashi', emoji: '🌙' },
  fasting: { label: 'Fasting', emoji: '🍃' }
};

export default function AIDietPlannerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedGoal, setSelectedGoal] = useState<DietGoal>('trim_tone');
  const [selectedDuration, setSelectedDuration] = useState<Duration>(7);
  const [selectedDietary, setSelectedDietary] = useState<DietaryPreference>('non-veg');
  const [selectedFestival, setSelectedFestival] = useState<FestivalMode>('none');
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
    : 2000;

  const generatePlanMutation = useMutation({
    mutationFn: async (params: { goal: DietGoal; duration: Duration; dietaryPreference: DietaryPreference; festivalMode: FestivalMode }) => {
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
    if (selectedFestival !== 'none') {
      toast({ 
        title: `${festivalConfig[selectedFestival].label} mode active`, 
        description: 'Non-compliant meals will be removed from your plan.' 
      });
    }
    generatePlanMutation.mutate({
      goal: selectedGoal,
      duration: selectedDuration,
      dietaryPreference: selectedDietary,
      festivalMode: selectedFestival
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
    const meals = getDayMeals(day);
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

  return (
    <div className="min-h-screen bg-[#0f1629] text-white">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/member/diet-planner">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">AI Diet Planner</h1>
            <p className="text-gray-400 text-sm">Generate a personalized meal plan based on your goals</p>
          </div>
        </div>

        {!activePlan ? (
          <div className="space-y-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-gray-400">Your TDEE</span>
              </div>
              <div className="text-3xl font-bold text-cyan-400">{tdee} kcal</div>
              <p className="text-xs text-gray-500 mt-1">
                {bodyComposition?.bmr ? 'Calculated from your body composition' : 'Using default value (update your body composition for accurate results)'}
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Select Your Goal</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(goalConfig) as DietGoal[]).map((goal) => {
                  const config = goalConfig[goal];
                  const Icon = config.icon;
                  const isSelected = selectedGoal === goal;
                  
                  return (
                    <button
                      key={goal}
                      onClick={() => setSelectedGoal(goal)}
                      className={`relative p-6 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? `${config.borderColor} ${config.bgColor}` 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                          Selected
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold">{config.title}</h3>
                      <p className={`text-sm ${config.textColor}`}>{config.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Plan Duration</h2>
              <div className="flex gap-4">
                {([7, 30] as Duration[]).map((days) => (
                  <button
                    key={days}
                    onClick={() => setSelectedDuration(days)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                      selectedDuration === days
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">{days} Days</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Dietary Preference</h2>
              <div className="grid grid-cols-3 gap-4">
                {(Object.keys(dietaryConfig) as DietaryPreference[]).map((pref) => {
                  const config = dietaryConfig[pref];
                  const isSelected = selectedDietary === pref;
                  
                  return (
                    <button
                      key={pref}
                      onClick={() => setSelectedDietary(pref)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? `${config.borderColor} bg-white/10`
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">{config.emoji}</div>
                      <div className="font-medium">{config.label}</div>
                      {pref === 'veg' && <div className="text-xs text-gray-400">Only veg</div>}
                      {pref === 'eggetarian' && <div className="text-xs text-gray-400">Veg + Eggs</div>}
                      {pref === 'non-veg' && <div className="text-xs text-gray-400">All meals</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Festival Mode</h2>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(festivalConfig) as FestivalMode[]).map((mode) => {
                  const config = festivalConfig[mode];
                  const isSelected = selectedFestival === mode;
                  
                  return (
                    <button
                      key={mode}
                      onClick={() => setSelectedFestival(mode)}
                      className={`px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generatePlanMutation.isPending}
              className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              {generatePlanMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Utensils className="w-5 h-5 mr-2" />
                  Generate {selectedDuration}-Day Plan
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl p-4 border border-orange-500/30">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold">{activePlan.name}</h2>
                  <p className="text-sm text-gray-400">
                    Target: {activePlan.targetCalories} kcal/day | 
                    Protein {activePlan.macroProtein}% | 
                    Carbs {activePlan.macroCarbs}% | 
                    Fat {activePlan.macroFat}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleGenerate}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Regenerate
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearPlan}>
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: activePlan.durationDays }, (_, i) => i + 1).map((day) => {
                const totals = getDailyTotals(day);
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all ${
                      activeDay === day
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-medium">Day {day}</div>
                    <div className="text-xs text-gray-400">{totals.calories} kcal</div>
                  </button>
                );
              })}
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Day {activeDay} - Daily Summary</h3>
                <div className="text-sm text-gray-400">
                  Target: {activePlan.targetCalories} kcal
                </div>
              </div>
              
              {(() => {
                const totals = getDailyTotals(activeDay);
                const calorieProgress = Math.min(100, (totals.calories / activePlan.targetCalories) * 100);
                
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Calories</span>
                        <span>{totals.calories} / {activePlan.targetCalories} kcal</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            calorieProgress > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, calorieProgress)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-lg font-bold text-blue-400">{Math.round(totals.protein)}g</div>
                        <div className="text-xs text-gray-400">Protein</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-lg font-bold text-amber-400">{Math.round(totals.carbs)}g</div>
                        <div className="text-xs text-gray-400">Carbs</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-lg font-bold text-pink-400">{Math.round(totals.fat)}g</div>
                        <div className="text-xs text-gray-400">Fat</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-4">
              {['breakfast', 'lunch', 'snack', 'dinner'].map((mealType) => {
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
                          <span className="text-sm font-medium capitalize text-gray-400">{mealType}</span>
                          <div className={`w-2 h-2 rounded-full ${getCategoryColor(meal.category)}`} />
                        </div>
                        <h4 className="font-semibold text-lg">{meal.mealName}</h4>
                        <div className="flex gap-4 mt-2 text-sm text-gray-400">
                          <span>{meal.calories} kcal</span>
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
        )}
      </div>
    </div>
  );
}
