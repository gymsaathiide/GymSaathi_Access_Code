import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Meal {
  id: string;
  name: string;
  nameHindi?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time?: string;
  isCompleted?: boolean;
}

interface MealCardProps {
  type: "breakfast" | "lunch" | "dinner" | "snacks";
  icon: string;
  calories: number;
  meals: Meal[];
  color: "orange" | "yellow" | "green" | "blue";
  onMealComplete?: (mealId: string) => void;
}

const colorClasses = {
  orange: {
    bg: "bg-gradient-to-br from-orange-400 to-orange-500",
    text: "text-orange-500",
    border: "border-orange-200",
    light: "bg-orange-50"
  },
  yellow: {
    bg: "bg-gradient-to-br from-amber-400 to-yellow-500",
    text: "text-amber-500",
    border: "border-amber-200",
    light: "bg-amber-50"
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-400 to-green-500",
    text: "text-emerald-500",
    border: "border-emerald-200",
    light: "bg-emerald-50"
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-400 to-cyan-500",
    text: "text-blue-500",
    border: "border-blue-200",
    light: "bg-blue-50"
  }
};

export function MealTypeCard({ 
  type, 
  icon, 
  calories, 
  color 
}: { 
  type: string; 
  icon: string; 
  calories: number; 
  color: "orange" | "yellow" | "green" | "blue";
}) {
  const colors = colorClasses[color];
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 rounded-2xl min-w-[100px]",
      colors.bg,
      "text-white shadow-lg"
    )}>
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs font-medium capitalize opacity-90">{type}</span>
      <span className="text-lg font-bold mt-1">{calories}</span>
      <span className="text-xs opacity-75">kcal</span>
    </div>
  );
}

export function MealLogItem({
  meal,
  time,
  color,
  onComplete
}: {
  meal: Meal;
  time: string;
  color: "orange" | "yellow" | "green" | "blue";
  onComplete?: () => void;
}) {
  const colors = colorClasses[color];
  
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="text-xs text-muted-foreground w-16 pt-2 shrink-0">
        {time}
      </div>
      <div className={cn(
        "flex-1 rounded-xl p-4 border-l-4",
        colors.border,
        "bg-card/50 backdrop-blur"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-foreground">{meal.name}</h4>
            {meal.nameHindi && (
              <p className="text-xs text-muted-foreground">{meal.nameHindi}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium", colors.text)}>
              {meal.calories} kcal
            </span>
            <button
              onClick={onComplete}
              className={cn(
                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                meal.isCompleted 
                  ? `${colors.bg} border-transparent` 
                  : "border-muted-foreground/30 hover:border-muted-foreground/50"
              )}
            >
              {meal.isCompleted && <Check className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MealSection({
  title,
  icon,
  meals,
  time,
  color,
  totalCalories,
  expanded = false,
  onToggle,
  onMealComplete
}: {
  title: string;
  icon: string;
  meals: Meal[];
  time: string;
  color: "orange" | "yellow" | "green" | "blue";
  totalCalories: number;
  expanded?: boolean;
  onToggle?: () => void;
  onMealComplete?: (mealId: string) => void;
}) {
  const colors = colorClasses[color];
  
  return (
    <div className="mb-4">
      <div className="flex items-start gap-4">
        <div className="text-xs text-muted-foreground w-16 pt-4 shrink-0">
          {time}
        </div>
        <div 
          className={cn(
            "flex-1 rounded-2xl overflow-hidden transition-all",
            colors.light,
            "border",
            colors.border
          )}
        >
          <button 
            onClick={onToggle}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{icon}</span>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">
                  {meals.length} item{meals.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-sm font-bold", colors.text)}>
                {totalCalories} kcal
              </span>
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </button>
          
          {expanded && (
            <div className="px-4 pb-4 space-y-2">
              {meals.map((meal) => (
                <div 
                  key={meal.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/80"
                >
                  <div>
                    <p className="font-medium text-sm">{meal.name}</p>
                    {meal.nameHindi && (
                      <p className="text-xs text-muted-foreground">{meal.nameHindi}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold", colors.text)}>
                        {meal.calories} kcal
                      </p>
                      <p className="text-xs text-muted-foreground">
                        P:{meal.protein}g C:{meal.carbs}g F:{meal.fats}g
                      </p>
                    </div>
                    <button
                      onClick={() => onMealComplete?.(meal.id)}
                      className={cn(
                        "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                        meal.isCompleted 
                          ? `${colors.bg} border-transparent` 
                          : "border-muted-foreground/30 hover:border-muted-foreground/50"
                      )}
                    >
                      {meal.isCompleted && <Check className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CaloriesRemainingCard({
  goal,
  food,
  exercise,
  remaining
}: {
  goal: number;
  food: number;
  exercise: number;
  remaining: number;
}) {
  return (
    <div className="bg-card/50 backdrop-blur rounded-2xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        Calories Remaining
      </h3>
      <div className="flex items-center justify-center gap-2 text-sm">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{goal.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Goal</p>
        </div>
        <span className="text-muted-foreground text-xl">-</span>
        <div className="text-center">
          <p className="text-xl font-bold text-orange-500">{food}</p>
          <p className="text-xs text-muted-foreground">Food</p>
        </div>
        <span className="text-muted-foreground text-xl">+</span>
        <div className="text-center">
          <p className="text-xl font-bold text-emerald-500">{exercise}</p>
          <p className="text-xs text-muted-foreground">Exercise</p>
        </div>
        <span className="text-muted-foreground text-xl">=</span>
        <div className="text-center">
          <p className="text-xl font-bold text-blue-500">{remaining.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Remaining</p>
        </div>
      </div>
    </div>
  );
}

export function DaySelector({
  days,
  selectedDay,
  onSelectDay
}: {
  days: number[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1">
      {days.map((day, index) => {
        const isSelected = day === selectedDay;
        const dayName = dayNames[index % 7];
        
        return (
          <button
            key={day}
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex flex-col items-center min-w-[48px] p-2 rounded-xl transition-all",
              isSelected 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "bg-card/50 text-muted-foreground hover:bg-card"
            )}
          >
            <span className="text-xs">{dayName}</span>
            <span className={cn(
              "text-lg font-bold mt-1",
              isSelected && "text-primary-foreground"
            )}>
              {day}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MacroProgressRing({
  consumed,
  target,
  label,
  color
}: {
  consumed: number;
  target: number;
  label: string;
  color: string;
}) {
  const percentage = Math.min((consumed / target) * 100, 100);
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-muted/20"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold">{consumed}</span>
          <span className="text-xs text-muted-foreground">/{target}g</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );
}
