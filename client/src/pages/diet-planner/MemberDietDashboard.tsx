import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Flame, Target, Dumbbell } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { MemberLayout, CalorieRing, MacroProgressBar, DayPicker, MealCard } from '@/components/member-dashboard';

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
  goal: string;
  durationDays: number;
  targetCalories: number;
  tdee: number;
  dietaryPreference: string;
  macroProtein: number;
  macroCarbs: number;
  macroFat: number;
  items: PlanItem[];
}

const goalLabels: Record<string, string> = {
  'fat_loss': 'Lose Fat',
  'muscle_gain': 'Build Muscle',
  'trim_tone': 'Maintain'
};

const goalIcons: Record<string, typeof Flame> = {
  'fat_loss': Flame,
  'muscle_gain': Dumbbell,
  'trim_tone': Target
};

export default function MemberDietDashboard() {
  const [, setLocation] = useLocation();
  const [activeDay, setActiveDay] = useState(1);

  const { data: activePlan, isLoading } = useQuery<DietPlan | null>({
    queryKey: ['active-diet-plan'],
    queryFn: async () => {
      const res = await fetch('/api/diet-planner/active-plan', { credentials: 'include' });
      const data = await res.json();
      if (data.plan) {
        const items = Array.isArray(data.plan.items) ? data.plan.items : [];
        return {
          ...data.plan,
          items: items.map((item: any) => ({
            ...item,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fat: Number(item.fat) || 0,
          }))
        };
      }
      return null;
    },
    staleTime: 0,
  });

  const { data: userData } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      return data.user;
    }
  });

  const days = useMemo(() => {
    if (!activePlan) return [];
    const today = new Date();
    return Array.from({ length: Math.min(activePlan.durationDays, 7) }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return {
        dayNumber: i + 1,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
      };
    });
  }, [activePlan]);

  const getDayMeals = (day: number) => {
    if (!activePlan || !activePlan.items) return [];
    return activePlan.items.filter(item => item.dayNumber === day && !item.isExcluded);
  };

  const getDailyTotals = (day: number) => {
    const meals = getDayMeals(day);
    return {
      calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: meals.reduce((sum, m) => sum + (m.protein || 0), 0),
      carbs: meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
      fat: meals.reduce((sum, m) => sum + (m.fat || 0), 0)
    };
  };

  const getMealsByType = (meals: PlanItem[]) => {
    const mealOrder = ['breakfast', 'mid_morning_snack', 'lunch', 'afternoon_snack', 'snack', 'dinner', 'evening_snack'];
    const grouped = meals.reduce((acc, meal) => {
      const type = meal.mealType.toLowerCase();
      if (!acc[type]) acc[type] = [];
      acc[type].push(meal);
      return acc;
    }, {} as Record<string, PlanItem[]>);
    
    return Object.entries(grouped).sort(([a], [b]) => {
      const aIdx = mealOrder.indexOf(a);
      const bIdx = mealOrder.indexOf(b);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  };

  if (isLoading) {
    return (
      <div className="member-container min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!activePlan) {
    return (
      <MemberLayout userName={userData?.firstName || 'User'}>
        <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-8">
          <div className="member-card text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
              <Flame className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-gray-800 font-bold text-xl mb-2">No Active Plan</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Get a personalized AI-generated meal plan tailored to your goals
            </p>
            <Link href="/member/diet-planner/ai-planner">
              <button className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all">
                Create Your Plan
              </button>
            </Link>
          </div>
        </div>
      </MemberLayout>
    );
  }

  const GoalIcon = goalIcons[activePlan.goal] || Target;
  const dailyTotals = getDailyTotals(activeDay);
  const dayMeals = getDayMeals(activeDay);
  const mealsByType = getMealsByType(dayMeals);
  const targetCalories = activePlan.targetCalories || 0;

  return (
    <MemberLayout 
      userName={userData?.firstName || 'Alex'}
      rightAction={
        <Link href="/member/diet-planner/ai-planner">
          <button className="edit-btn">Edit</button>
        </Link>
      }
    >
      <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-4">
        <div className="member-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="member-card-title">Calorie Tracker</h3>
            <Link href="/member/diet-planner/ai-planner">
              <span className="edit-btn text-xs cursor-pointer">Edit Goal</span>
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                <GoalIcon className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {goalLabels[activePlan.goal] || 'Custom Plan'}
                </p>
                <p className="text-xs text-gray-500">
                  {activePlan.durationDays} day plan
                </p>
              </div>
            </div>
            
            <div className="flex-1 flex justify-center">
              <CalorieRing 
                current={Math.round(dailyTotals.calories)} 
                target={targetCalories}
                size={110}
              />
            </div>
            
            <div className="text-center sm:text-right">
              <p className="text-2xl font-bold text-orange-600">
                {targetCalories.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">kcal target</p>
            </div>
          </div>
        </div>

        <div className="member-card">
          <div className="grid grid-cols-3 gap-4">
            <MacroProgressBar 
              label="Carbs" 
              current={Math.round(dailyTotals.carbs)} 
              target={activePlan.macroCarbs || 300} 
            />
            <MacroProgressBar 
              label="Protein" 
              current={Math.round(dailyTotals.protein)} 
              target={activePlan.macroProtein || 150} 
            />
            <MacroProgressBar 
              label="Fat" 
              current={Math.round(dailyTotals.fat)} 
              target={activePlan.macroFat || 65} 
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Today's Plan</h3>
            <Link href="/member/diet-planner/history">
              <span className="details-link cursor-pointer">
                History <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          
          <DayPicker 
            days={days}
            activeDay={activeDay}
            onDaySelect={setActiveDay}
          />
        </div>

        <div className="space-y-3 pb-24 md:pb-8">
          {mealsByType.length > 0 ? (
            mealsByType.map(([mealType, meals]) => 
              meals.map((meal, idx) => (
                <MealCard
                  key={`${mealType}-${idx}`}
                  mealType={mealType.replace(/_/g, ' ')}
                  mealName={meal.mealName}
                  onEdit={() => setLocation('/member/diet-planner/ai-planner')}
                  onShare={() => {}}
                />
              ))
            )
          ) : (
            <div className="member-card text-center py-8">
              <p className="text-gray-500">No meals for Day {activeDay}</p>
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
