import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Target, Loader2, ChefHat, Clock, ChevronDown, ChevronUp, Sparkles, RotateCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

interface Meal {
  id: string;
  day_number: number;
  meal_type: string;
  meal_name: string;
  name_hindi?: string;
  ingredients: string[];
  recipe_instructions?: string[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion_size?: string;
  meal_timing?: string;
}

interface DietPlan {
  id: string;
  plan_type: string;
  goal: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  goal_reasons?: string[];
  created_at: string;
}

interface BodyComposition {
  weight?: number;
  bmi?: number;
  bmr?: number;
  lifestyle?: string;
}

type LifestyleType = 'sedentary' | 'moderately_active' | 'super_active';

const LIFESTYLE_LABELS: Record<LifestyleType, { label: string; factor: number }> = {
  sedentary: { label: 'Sedentary', factor: 1.2 },
  moderately_active: { label: 'Moderately Active', factor: 1.55 },
  super_active: { label: 'Super Active', factor: 1.75 }
};

const calculateTDEE = (bmr: number, lifestyle: string): number => {
  const factor = LIFESTYLE_LABELS[lifestyle as LifestyleType]?.factor || 1.55;
  return Math.round(bmr * factor);
};

export default function DietPlannerPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [planType, setPlanType] = useState<"7-day" | "30-day">("7-day");
  const [goal, setGoal] = useState<string>("Fat Loss");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [bodyComp, setBodyComp] = useState<BodyComposition | null>(null);
  const [eatenMeals, setEatenMeals] = useState<string[]>([]);
  const [determinedGoal, setDeterminedGoal] = useState<string | null>(null);
  const [goalReasons, setGoalReasons] = useState<string[]>([]);

  const goals = [
    { 
      id: "Fat Loss", 
      icon: "🔥", 
      desc: "TDEE - 200 kcal", 
      gradient: "from-orange-500 to-red-500",
      selectedColor: "border-orange-500 bg-orange-500/10"
    },
    { 
      id: "Muscle Gain", 
      icon: "💪", 
      desc: "TDEE + 200 kcal", 
      gradient: "from-yellow-400 to-orange-400",
      selectedColor: "border-yellow-500 bg-yellow-500/10"
    },
    { 
      id: "Trim & Tone", 
      icon: "⭐", 
      desc: "TDEE (Maintenance)", 
      gradient: "from-amber-400 to-yellow-300",
      selectedColor: "border-amber-500 bg-amber-500/10"
    }
  ];

  useEffect(() => {
    loadInitialData();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadInitialData();
      }
    };
    
    const handleFocus = () => {
      loadInitialData();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      loadMeals(selectedPlan.id);
      loadEatenMeals();
    }
  }, [selectedPlan, selectedDay]);

  const loadInitialData = async () => {
    try {
      const response = await fetch('/api/diet-planner/initial-data', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBodyComp(data.bodyComposition);
        setDietPlans(data.dietPlans || []);
        if (data.dietPlans?.length > 0) {
          const plan = data.dietPlans[0];
          setSelectedPlan(plan);
          // Load goal reasons from the persisted plan data
          if (plan.goal_reasons && Array.isArray(plan.goal_reasons)) {
            setGoalReasons(plan.goal_reasons);
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async (planId: string) => {
    try {
      const response = await fetch(`/api/diet-planner/meals/${planId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMeals(data || []);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
      toast({
        title: "Error",
        description: "Failed to load meals",
        variant: "destructive"
      });
    }
  };

  const loadEatenMeals = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/diet-planner/daily-tracking?date=${today}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data?.eaten_meals && Array.isArray(data.eaten_meals)) {
          setEatenMeals(data.eaten_meals);
        }
      }
    } catch (error) {
      console.error('Error loading eaten meals:', error);
    }
  };

  const toggleMealEaten = async (mealId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const isEaten = eatenMeals.includes(mealId);
      const updatedEatenMeals = isEaten
        ? eatenMeals.filter(id => id !== mealId)
        : [...eatenMeals, mealId];

      const response = await fetch('/api/diet-planner/daily-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tracking_date: today,
          eaten_meals: updatedEatenMeals,
        })
      });

      if (response.ok) {
        setEatenMeals(updatedEatenMeals);
        toast({
          title: isEaten ? 'Meal unmarked' : 'Meal marked as eaten!',
        });
      }
    } catch (error) {
      console.error('Error toggling meal:', error);
      toast({
        title: "Error",
        description: "Failed to update meal status",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePlan = async () => {
    if (!bodyComp || !bodyComp.bmr) {
      toast({
        title: "Body Composition Required",
        description: "Please upload a body composition report first to generate a diet plan",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/diet-planner/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planType,
          goal,
          bmr: bodyComp.bmr,
          bodyWeight: bodyComp.weight || 70,
          lifestyle: bodyComp.lifestyle || 'moderately_active',
          isVegetarian: true,
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate diet plan');
      }

      // Store the determined goal and reasons from body composition analysis
      if (result.determinedGoal) {
        setDeterminedGoal(result.determinedGoal);
      }
      if (result.reasons && result.reasons.length > 0) {
        setGoalReasons(result.reasons);
      }

      toast({
        title: "Diet Plan Generated!",
        description: result.determinedGoal 
          ? `Goal: ${result.plan?.goal || goal} based on your body composition` 
          : `Your ${planType} diet plan is ready`,
      });
      
      await loadInitialData();
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast({
        title: "Generation Failed",
        description: error.message || 'Failed to generate diet plan',
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const resetDietPlan = async () => {
    try {
      const response = await fetch('/api/diet-planner/reset-plan', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setDietPlans([]);
        setSelectedPlan(null);
        setMeals([]);
        setSelectedDay(1);
        setExpandedMeals(new Set());
        setEatenMeals([]);

        toast({
          title: "Plan Reset",
          description: "You can now create a new diet plan",
        });
      }
    } catch (error) {
      console.error('Error resetting diet plan:', error);
      toast({
        title: "Error",
        description: "Failed to reset diet plan",
        variant: "destructive"
      });
    }
  };

  const toggleMealExpanded = (mealId: string) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const getMealTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      breakfast: "🌅",
      lunch: "☀️",
      dinner: "🌙",
      snack: "🍎"
    };
    return icons[type] || "🍽️";
  };

  const dayMeals = meals.filter(m => m.day_number === selectedDay);
  const dailyCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
  const dailyProtein = dayMeals.reduce((sum, m) => sum + Number(m.protein), 0);
  const dailyCarbs = dayMeals.reduce((sum, m) => sum + Number(m.carbs), 0);
  const dailyFats = dayMeals.reduce((sum, m) => sum + Number(m.fats), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/member">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              AI Diet Planner
            </h1>
            <p className="text-muted-foreground text-sm">Personalized meal plans powered by AI</p>
          </div>
        </div>
      </div>

      {bodyComp && bodyComp.bmi && !selectedPlan && (
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-cyan-500 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Your Body Metrics
              </h3>
              <Link href="/member/diet-planner/body-report">
                <Button variant="ghost" size="sm" className="text-cyan-500 hover:text-cyan-400 gap-1">
                  <Target className="w-4 h-4" />
                  Update
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-cyan-500">{bodyComp.weight ? Number(bodyComp.weight).toFixed(1) : '--'}</p>
                <p className="text-xs text-muted-foreground">Weight (kg)</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-orange-500">{bodyComp.bmi ? Number(bodyComp.bmi).toFixed(1) : '--'}</p>
                <p className="text-xs text-muted-foreground">BMI</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-green-500">{bodyComp.bmr || '--'}</p>
                <p className="text-xs text-muted-foreground">BMR (kcal)</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-purple-500">
                  {bodyComp.lifestyle === 'sedentary' ? 'Low' : bodyComp.lifestyle === 'moderately_active' ? 'Moderate' : 'High'}
                </p>
                <p className="text-xs text-muted-foreground">Activity Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(!bodyComp || !bodyComp.bmr) && !selectedPlan && (
        <Card className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-orange-500">Body Composition Required</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  To generate a personalized diet plan based on your body metrics, please complete your body composition report first. This helps us recommend the right health goals for you.
                </p>
              </div>
              <Link href="/member/diet-planner/body-report">
                <Button className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:opacity-90 text-white gap-2 whitespace-nowrap">
                  <Target className="w-4 h-4" />
                  Complete Body Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedPlan ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.map((g) => {
              const isSelected = goal === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 ${
                    isSelected
                      ? g.selectedColor
                      : 'border-border bg-card hover:border-orange-500/50'
                  }`}
                >
                  <div className="text-center space-y-3">
                    <div className="text-5xl">{g.icon}</div>
                    <h3 className="text-lg font-bold">{g.id}</h3>
                    <p className="text-sm text-muted-foreground">{g.desc}</p>
                    {isSelected && (
                      <div className="flex items-center justify-center gap-1 text-orange-500 text-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>Selected</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <Card className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Plan Duration / प्लान अवधि</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPlanType('7-day')}
                  className={`p-6 rounded-xl font-medium transition-all text-center ${
                    planType === '7-day'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
                      : 'bg-card border border-border hover:border-cyan-500/50'
                  }`}
                >
                  <div className="text-3xl font-bold">7</div>
                  <div className="text-sm">दिन</div>
                </button>
                <button
                  onClick={() => setPlanType('30-day')}
                  className={`p-6 rounded-xl font-medium transition-all text-center ${
                    planType === '30-day'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
                      : 'bg-card border border-border hover:border-cyan-500/50'
                  }`}
                >
                  <div className="text-3xl font-bold">30</div>
                  <div className="text-sm">दिन</div>
                </button>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGeneratePlan}
            disabled={generating || !bodyComp?.bmr}
            size="lg"
            className="w-full py-6 text-lg rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition-opacity"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Your Plan...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate {planType === '7-day' ? '7' : '30'}-day Plan
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{selectedPlan.plan_type} Plan</h2>
              <p className="text-muted-foreground">Goal: {selectedPlan.goal}</p>
            </div>
            <Button variant="outline" onClick={resetDietPlan} className="gap-2">
              <RotateCw className="w-4 h-4" />
              Reset & Regenerate
            </Button>
          </div>

          {goalReasons.length > 0 && (
            <Card className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-500">Body Composition Analysis</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on your body composition report, we've created a personalized diet plan for you:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {goalReasons.map((reason, idx) => (
                        <li key={idx} className="text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: selectedPlan.plan_type === '7-day' ? 7 : 30 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                  selectedDay === day
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-card border border-border hover:border-orange-500/50'
                }`}
              >
                Day {day}
              </button>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-500 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Your Daily Target
              </CardTitle>
              <p className="text-sm text-muted-foreground">Based on your body composition and goals</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-green-500">{selectedPlan.total_calories}</p>
                  <p className="text-xs text-muted-foreground">Target Calories</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-blue-500">{selectedPlan.total_protein}g</p>
                  <p className="text-xs text-muted-foreground">Target Protein</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-amber-500">{selectedPlan.total_carbs}g</p>
                  <p className="text-xs text-muted-foreground">Target Carbs</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-purple-500">{selectedPlan.total_fats}g</p>
                  <p className="text-xs text-muted-foreground">Target Fats</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meal Type Cards - Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {[
              { type: 'breakfast', icon: '🍳', color: 'from-orange-400 to-orange-500' },
              { type: 'lunch', icon: '🍱', color: 'from-amber-400 to-yellow-500' },
              { type: 'dinner', icon: '🍽️', color: 'from-red-400 to-rose-500' },
              { type: 'snack', icon: '🥗', color: 'from-emerald-400 to-green-500' }
            ].map(({ type, icon, color }) => {
              const typeMeals = dayMeals.filter(m => m.meal_type === type);
              const typeCalories = typeMeals.reduce((sum, m) => sum + m.calories, 0);
              
              return (
                <div 
                  key={type}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl min-w-[100px] bg-gradient-to-br ${color} text-white shadow-lg cursor-pointer transition-transform hover:scale-105`}
                  onClick={() => {
                    const element = document.getElementById(`meal-section-${type}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <span className="text-2xl mb-1">{icon}</span>
                  <span className="text-xs font-medium capitalize opacity-90">{type}</span>
                  <span className="text-lg font-bold mt-1">{typeCalories}</span>
                  <span className="text-xs opacity-75">kcal</span>
                </div>
              );
            })}
          </div>

          {/* Calories Remaining Card */}
          <div className="bg-card/50 backdrop-blur rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Calories Remaining
            </h3>
            <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
              <div className="text-center px-2">
                <p className="text-xl font-bold text-foreground">{selectedPlan.total_calories}</p>
                <p className="text-xs text-muted-foreground">Goal</p>
              </div>
              <span className="text-muted-foreground text-xl">−</span>
              <div className="text-center px-2">
                <p className="text-xl font-bold text-orange-500">{dailyCalories}</p>
                <p className="text-xs text-muted-foreground">Food</p>
              </div>
              <span className="text-muted-foreground text-xl">+</span>
              <div className="text-center px-2">
                <p className="text-xl font-bold text-emerald-500">0</p>
                <p className="text-xs text-muted-foreground">Exercise</p>
              </div>
              <span className="text-muted-foreground text-xl">=</span>
              <div className="text-center px-2">
                <p className="text-xl font-bold text-blue-500">{selectedPlan.total_calories - dailyCalories}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </div>

          {/* Meal Sections with Time-based Layout */}
          <div className="space-y-3">
            {[
              { type: 'breakfast', icon: '🍳', time: '7:00 AM', color: 'orange' },
              { type: 'snack', icon: '🥗', time: '9:00 AM', color: 'green' },
              { type: 'lunch', icon: '🍱', time: '1:00 PM', color: 'yellow' },
              { type: 'dinner', icon: '🍽️', time: '7:00 PM', color: 'red' }
            ].map(({ type, icon, time, color }) => {
              const typeMeals = dayMeals.filter(m => m.meal_type === type);
              if (typeMeals.length === 0) return null;
              
              const typeCalories = typeMeals.reduce((sum, m) => sum + m.calories, 0);
              const isExpanded = expandedMeals.has(type);
              
              const colorClasses: Record<string, { border: string; bg: string; text: string }> = {
                orange: { border: 'border-l-orange-500', bg: 'bg-orange-500/5', text: 'text-orange-500' },
                yellow: { border: 'border-l-amber-500', bg: 'bg-amber-500/5', text: 'text-amber-500' },
                green: { border: 'border-l-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-500' },
                red: { border: 'border-l-red-500', bg: 'bg-red-500/5', text: 'text-red-500' }
              };
              
              const colors = colorClasses[color];

              return (
                <div key={type} id={`meal-section-${type}`} className="flex items-start gap-3">
                  <div className="text-xs text-muted-foreground w-14 pt-4 shrink-0 text-right">
                    {time}
                  </div>
                  <div className={`flex-1 rounded-2xl overflow-hidden border-l-4 ${colors.border} ${colors.bg} border border-border/50`}>
                    <button 
                      onClick={() => toggleMealExpanded(type)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{icon}</span>
                        <div className="text-left">
                          <h3 className="font-semibold capitalize">{type}</h3>
                          <p className="text-xs text-muted-foreground">
                            {typeMeals.length} item{typeMeals.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${colors.text}`}>
                          {typeCalories} kcal
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {typeMeals.map((meal) => {
                          const isEaten = eatenMeals.includes(meal.id);
                          const isMealExpanded = expandedMeals.has(meal.id);
                          
                          return (
                            <div key={meal.id} className="rounded-xl bg-background/80 overflow-hidden">
                              <div className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isEaten}
                                    onCheckedChange={() => toggleMealEaten(meal.id)}
                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                  />
                                  <div>
                                    <p className={`font-medium text-sm ${isEaten ? 'line-through text-muted-foreground' : ''}`}>
                                      {meal.meal_name}
                                    </p>
                                    {meal.name_hindi && (
                                      <p className="text-xs text-muted-foreground">{meal.name_hindi}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className={`text-sm font-semibold ${colors.text}`}>
                                      {meal.calories} kcal
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      P:{meal.protein}g C:{meal.carbs}g F:{meal.fats}g
                                    </p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => toggleMealExpanded(meal.id)}
                                  >
                                    {isMealExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </div>
                              
                              {isMealExpanded && (
                                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
                                  {meal.ingredients && meal.ingredients.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium mb-2 text-muted-foreground">Ingredients:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {meal.ingredients.map((ing, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">{ing}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {meal.recipe_instructions && meal.recipe_instructions.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium mb-2 text-muted-foreground">How to prepare:</p>
                                      <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                                        {meal.recipe_instructions.map((step, idx) => (
                                          <li key={idx}>{step}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                  {(meal.prep_time_minutes || meal.cook_time_minutes) && (
                                    <div className="flex gap-4 text-xs text-muted-foreground">
                                      {meal.prep_time_minutes && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          Prep: {meal.prep_time_minutes} min
                                        </span>
                                      )}
                                      {meal.cook_time_minutes && (
                                        <span className="flex items-center gap-1">
                                          <ChefHat className="w-3 h-3" />
                                          Cook: {meal.cook_time_minutes} min
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
