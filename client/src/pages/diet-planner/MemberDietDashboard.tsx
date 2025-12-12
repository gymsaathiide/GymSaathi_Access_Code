import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
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

export default function MemberDietDashboard() {
  const [, setLocation] = useLocation();
  const [activeDay, setActiveDay] = useState(1);

  const { data: activePlan, isLoading } = useQuery<DietPlan | null>({
    queryKey: ['active-diet-plan'],
    queryFn: async () => {
      const res = await fetch('/api/diet-planner/active-plan', { credentials: 'include' });
      const data = await res.json();
      if (data.plan && data.plan.items) {
        return {
          ...data.plan,
          items: data.plan.items.map((item: any) => ({
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

  const dailyTotals = getDailyTotals(activeDay);
  const dayMeals = getDayMeals(activeDay);

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
        <div className="px-4 py-8">
          <div className="member-card text-center py-8">
            <h3 className="text-gray-800 font-bold text-lg mb-2">No Active Plan</h3>
            <p className="text-gray-500 text-sm mb-4">Generate a personalized meal plan to get started</p>
            <Link href="/member/diet-planner/ai-planner">
              <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold">
                Create Plan
              </button>
            </Link>
          </div>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout 
      userName={userData?.firstName || 'Alex'}
      rightAction={
        <button className="edit-btn">Edit</button>
      }
    >
      <div className="px-4 space-y-4">
        <div className="member-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="member-card-title">Calorie Tracker</h3>
            <button className="edit-btn text-xs">Edit</button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-gray-100 rounded-xl flex-shrink-0" />
            <div className="flex-1 flex justify-center">
              <CalorieRing 
                current={Math.round(dailyTotals.calories)} 
                target={activePlan.targetCalories}
                size={100}
              />
            </div>
            <button className="p-2 text-gray-400">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="member-card">
          <div className="flex gap-4">
            <MacroProgressBar 
              label="Carbs" 
              current={Math.round(dailyTotals.carbs)} 
              target={activePlan.macroCarbs || 300} 
            />
            <MacroProgressBar 
              label="Protein" 
              current={Math.round(dailyTotals.protein)} 
              target={activePlan.macroProtein || 30} 
            />
            <MacroProgressBar 
              label="Fat" 
              current={Math.round(dailyTotals.fat)} 
              target={activePlan.macroFat || 200} 
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Today's Plan</h3>
            <Link href="/member/diet-planner/ai-planner">
              <span className="details-link">
                Details <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          
          <DayPicker 
            days={days}
            activeDay={activeDay}
            onDaySelect={setActiveDay}
          />
        </div>

        <div className="space-y-3 pb-4">
          {['breakfast', 'lunch', 'snack', 'dinner'].map((mealType, index) => {
            const meal = dayMeals.find(m => m.mealType === mealType);
            if (!meal) return null;
            
            return (
              <MealCard
                key={mealType}
                mealType={mealType}
                mealName={meal.mealName}
                isCompleted={index < 2}
                onEdit={() => setLocation('/member/diet-planner/ai-planner')}
                onShare={() => {}}
              />
            );
          })}
        </div>
      </div>
    </MemberLayout>
  );
}
