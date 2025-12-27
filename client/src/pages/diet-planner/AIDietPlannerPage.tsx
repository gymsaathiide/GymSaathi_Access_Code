import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Flame,
  Dumbbell,
  Target,
  Loader2,
  Check,
  Heart,
  Repeat,
  Ban,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  RefreshCw,
  Calendar,
  Apple,
  Beef,
  Egg,
  Salad,
  Moon,
  Sun,
  Coffee,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/* === types unchanged === */
type DietGoal = "fat_loss" | "muscle_gain" | "trim_tone";
type DietaryPreference = "veg" | "eggetarian" | "non-veg";
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

/* === UI-only redesign that preserves logic === */
export default function AIDietPlannerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedGoal, setSelectedGoal] = useState<DietGoal>("trim_tone");
  const [selectedDuration, setSelectedDuration] = useState<Duration>(7);
  const [selectedDietary, setSelectedDietary] =
    useState<DietaryPreference>("non-veg");

  const [activePlan, setActivePlan] = useState<DietPlan | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: bodyComposition } = useQuery({
    queryKey: ["body-composition"],
    queryFn: async () => {
      const res = await fetch("/api/diet-planner/body-composition", {
        credentials: "include",
      });
      const data = await res.json();
      return data.bodyComposition;
    },
  });

  const {
    data: savedPlanData,
    isLoading: isLoadingPlan,
    isFetching: isFetchingPlan,
  } = useQuery({
    queryKey: ["active-diet-plan"],
    queryFn: async () => {
      const res = await fetch("/api/diet-planner/active-plan", {
        credentials: "include",
      });
      const data = await res.json();
      return data.plan;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (
      savedPlanData &&
      savedPlanData.items &&
      Array.isArray(savedPlanData.items)
    ) {
      const normalizedPlan = {
        ...savedPlanData,
        items: savedPlanData.items.map((item: any) => ({
          ...item,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
        })),
      };
      setActivePlan(normalizedPlan);
    } else if (
      savedPlanData === null ||
      (savedPlanData && !savedPlanData.items)
    ) {
      setActivePlan(null);
    }
  }, [savedPlanData]);

  const getActivityMultiplier = (lifestyle: string): number => {
    switch (lifestyle) {
      case "sedentary":
        return 1.2;
      case "moderately_active":
        return 1.55;
      case "super_active":
        return 1.9;
      default:
        return 1.55;
    }
  };

  const getLifestyleLabel = (lifestyle: string): string => {
    switch (lifestyle) {
      case "sedentary":
        return "Sedentary";
      case "moderately_active":
        return "Moderate";
      case "super_active":
        return "Super Active";
      default:
        return "Moderate";
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
      await queryClient.invalidateQueries({ queryKey: ["body-composition"] });
      toast({
        title: "Updated!",
        description: "Body composition data refreshed.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTargetCalories = () => {
    switch (selectedGoal) {
      case "fat_loss":
        return tdee - 200;
      case "muscle_gain":
        return tdee + 200;
      case "trim_tone":
        return tdee;
      default:
        return tdee;
    }
  };

  const targetCalories = getTargetCalories();

  const generatePlanMutation = useMutation({
    mutationFn: async (params: {
      goal: DietGoal;
      duration: Duration;
      dietaryPreference: DietaryPreference;
    }) => {
      const res = await fetch("/api/diet-planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate plan");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActivePlan(data.plan);
      setActiveDay(1);
      queryClient.invalidateQueries({ queryKey: ["active-diet-plan"] });
      toast({
        title: "Plan generated!",
        description: `Your ${data.plan.durationDays}-day meal plan is ready.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const swapMealMutation = useMutation({
    mutationFn: async ({
      planId,
      itemId,
    }: {
      planId: string;
      itemId: string;
    }) => {
      const res = await fetch(
        `/api/diet-planner/plans/${planId}/items/${itemId}/swap`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to swap meal");
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (activePlan) {
        const updatedItems = activePlan.items.map((item) =>
          item.id === variables.itemId ? { ...item, ...data.newMeal } : item,
        );
        setActivePlan({ ...activePlan, items: updatedItems });
      }
      queryClient.invalidateQueries({ queryKey: ["active-diet-plan"] });
      toast({ title: "Meal swapped!" });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({
      planId,
      itemId,
    }: {
      planId: string;
      itemId: string;
    }) => {
      const res = await fetch(
        `/api/diet-planner/plans/${planId}/items/${itemId}/favorite`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (activePlan) {
        const updatedItems = activePlan.items.map((item) =>
          item.id === variables.itemId
            ? { ...item, isFavorite: data.isFavorite }
            : item,
        );
        setActivePlan({ ...activePlan, items: updatedItems });
      }
      queryClient.invalidateQueries({ queryKey: ["active-diet-plan"] });
    },
  });

  const toggleExcludeMutation = useMutation({
    mutationFn: async ({
      planId,
      itemId,
    }: {
      planId: string;
      itemId: string;
    }) => {
      const res = await fetch(
        `/api/diet-planner/plans/${planId}/items/${itemId}/exclude`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to toggle exclusion");
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (activePlan) {
        const updatedItems = activePlan.items.map((item) =>
          item.id === variables.itemId
            ? { ...item, isExcluded: data.isExcluded }
            : item,
        );
        setActivePlan({ ...activePlan, items: updatedItems });
      }
      queryClient.invalidateQueries({ queryKey: ["active-diet-plan"] });
      toast({
        title: data.isExcluded ? "Meal excluded" : "Meal restored",
        description: data.isExcluded
          ? "This meal will be skipped"
          : "This meal is back in your plan",
      });
    },
  });

  const handleGenerate = () => {
    generatePlanMutation.mutate({
      goal: selectedGoal,
      duration: selectedDuration,
      dietaryPreference: selectedDietary,
    });
  };

  const handleClearPlan = async () => {
    if (activePlan?.id) {
      try {
        const res = await fetch(
          `/api/diet-planner/plans/${activePlan.id}/deactivate`,
          {
            method: "PATCH",
            credentials: "include",
          },
        );
        if (!res.ok) {
          toast({
            title: "Error",
            description: "Failed to clear plan from server. Try again.",
            variant: "destructive",
          });
          return;
        }
      } catch (e) {
        toast({
          title: "Error",
          description: "Network error. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    setActivePlan(null);
    setActiveDay(1);
    queryClient.invalidateQueries({ queryKey: ["active-diet-plan"] });
    toast({ title: "Plan cleared" });
  };

  const getDayMeals = (day: number) => {
    if (!activePlan) return [];
    return activePlan.items.filter((item) => item.dayNumber === day);
  };

  const getDailyTotals = (day: number) => {
    const meals = getDayMeals(day).filter((m) => !m.isExcluded);
    return {
      calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: meals.reduce((sum, m) => sum + (m.protein || 0), 0),
      carbs: meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
      fat: meals.reduce((sum, m) => sum + (m.fat || 0), 0),
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "veg":
        return "bg-emerald-500";
      case "eggetarian":
        return "bg-amber-400";
      case "non-veg":
        return "bg-rose-500";
      default:
        return "bg-slate-400";
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case "veg":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "eggetarian":
        return "bg-amber-500/10 border-amber-500/20";
      case "non-veg":
        return "bg-rose-500/10 border-rose-500/20";
      default:
        return "bg-slate-500/10 border-slate-500/20";
    }
  };

  const getMealTypeConfig = (mealType: string) => {
    switch (mealType) {
      case "breakfast":
        return {
          icon: Coffee,
          label: "Breakfast",
          color: "text-amber-400",
          bg: "bg-amber-500/10",
        };
      case "lunch":
        return {
          icon: Sun,
          label: "Lunch",
          color: "text-orange-400",
          bg: "bg-orange-500/10",
        };
      case "snack":
        return {
          icon: Apple,
          label: "Snack",
          color: "text-green-400",
          bg: "bg-green-500/10",
        };
      case "dinner":
        return {
          icon: Moon,
          label: "Dinner",
          color: "text-indigo-400",
          bg: "bg-indigo-500/10",
        };
      default:
        return {
          icon: UtensilsCrossed,
          label: mealType,
          color: "text-slate-400",
          bg: "bg-slate-500/10",
        };
    }
  };

  const getDietaryLabel = (pref: DietaryPreference) => {
    switch (pref) {
      case "veg":
        return "Veg";
      case "eggetarian":
        return "Egg";
      case "non-veg":
        return "Non-Veg";
    }
  };

  const navigateDay = (direction: "prev" | "next") => {
    if (!activePlan) return;
    if (direction === "prev" && activeDay > 1) {
      setActiveDay(activeDay - 1);
    } else if (direction === "next" && activeDay < activePlan.durationDays) {
      setActiveDay(activeDay + 1);
    }
  };

  /* ----------------------------
     PRESENTATIONAL HELPERS FOR CHARTS (pure UI)
     - weeklyCalories: number[] per day (1..duration)
     - sparklinePath: SVG path for weekly chart
     - donut arcs: macro proportions
     - calorieRing stroke-dashoffset computed
     ----------------------------*/
  const weeklyCalories = useMemo(() => {
    if (!activePlan) return [];
    const arr = new Array(activePlan.durationDays).fill(0).map((_, i) => {
      const day = i + 1;
      const meals = activePlan.items.filter(
        (it) => it.dayNumber === day && !it.isExcluded,
      );
      return meals.reduce((s, m) => s + (m.calories || 0), 0);
    });
    return arr;
  }, [activePlan]);

  const sparklinePath = useMemo(() => {
    if (!weeklyCalories || weeklyCalories.length === 0) return "";
    // normalize to 0..1
    const max = Math.max(...weeklyCalories, 1);
    const w = 220;
    const h = 48;
    const len = weeklyCalories.length;
    return weeklyCalories
      .map((v, i) => {
        const x = (i / (len - 1 || 1)) * w;
        const y = h - (v / max) * h;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [weeklyCalories]);

  const donutData = useMemo(() => {
    if (!activePlan) return { p: 0, c: 0, f: 0 };
    // sum macros for activeDay
    const meals = getDayMeals(activeDay).filter((m) => !m.isExcluded);
    const p = meals.reduce((s, m) => s + (m.protein || 0), 0);
    const c = meals.reduce((s, m) => s + (m.carbs || 0), 0);
    const f = meals.reduce((s, m) => s + (m.fat || 0), 0);
    const total = Math.max(p + c + f, 1);
    return { p, c, f, pPct: p / total, cPct: c / total, fPct: f / total };
  }, [activePlan, activeDay]);

  const ringPercent = useMemo(() => {
    if (!activePlan) return 0;
    const totals = getDailyTotals(activeDay);
    const percent = Math.min(
      100,
      Math.round((totals.calories / (activePlan.targetCalories || 1)) * 100),
    );
    return percent;
  }, [activePlan, activeDay]);

  /* Small inline styles + keyframes for animations */
  const extraStyles = `
    @keyframes neonGlow {
      0% { box-shadow: 0 0 6px rgba(255,160,60,0.06), inset 0 0 18px rgba(255,160,60,0.02); transform: translateY(0); }
      50% { box-shadow: 0 8px 30px rgba(255,160,60,0.12), inset 0 0 28px rgba(255,160,60,0.03); transform: translateY(-3px); }
      100% { box-shadow: 0 0 6px rgba(255,160,60,0.06), inset 0 0 18px rgba(255,160,60,0.02); transform: translateY(0); }
    }
    .sparkline-path { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: dash 1.1s linear forwards; stroke-linecap: round; }
    @keyframes dash { to { stroke-dashoffset: 0; } }
    .ring-anim { transition: stroke-dashoffset 900ms cubic-bezier(.22,.9,.3,1); transform-origin: center; }
    .float-glow { animation: neonGlow 3.2s ease-in-out infinite; }
  `;

  /* ----------------------------
     RENDER: charts + redesigned UI (logic unchanged)
     ----------------------------*/
  if (activePlan) {
    const dailyTotals = getDailyTotals(activeDay);
    const calorieProgress = Math.min(
      (dailyTotals.calories / activePlan.targetCalories) * 100,
      100,
    );

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#020617] to-[#07102a] text-white antialiased">
        <style>{extraStyles}</style>

        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-white/3 border-b border-white/6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={handleClearPlan}
                className="p-2 rounded-lg bg-gradient-to-br from-[#0b1220]/40 to-transparent hover:from-[#0b1220]/20 transition"
              >
                <ArrowLeft className="w-4 h-4 text-white/90" />
              </button>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  AI Meal Plan — Live
                </h2>
                <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span className="font-semibold">
                      {activePlan.targetCalories} kcal
                    </span>
                  </div>
                  <span>•</span>
                  <span>{activePlan.durationDays} days</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshBodyComposition}
                disabled={isRefreshing}
                className="p-2 rounded-md bg-white/5 hover:bg-white/8 transition flex items-center gap-2"
              >
                <RefreshCw
                  className={`w-4 h-4 text-cyan-300 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden xs:inline text-xs">Refresh</span>
              </button>
              <div className="hidden sm:block">
                <Button
                  onClick={handleGenerate}
                  disabled={generatePlanMutation.isPending}
                  className="py-2 px-4 bg-gradient-to-r from-amber-400 to-orange-400 text-black font-bold rounded-xl shadow-lg"
                >
                  {generatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                      Generating
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* day ribbon */}
          <div className="border-t border-white/6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigateDay("prev")}
                disabled={activeDay === 1}
                className="p-2 rounded-md bg-white/5 disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5 text-white/80" />
              </button>

              <div className="flex gap-2" style={{ minWidth: "0" }}>
                {Array.from(
                  { length: activePlan.durationDays },
                  (_, i) => i + 1,
                ).map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-2 rounded-full font-semibold text-sm transition ${activeDay === day ? "bg-gradient-to-br from-amber-400 to-orange-400 text-black shadow-lg float-glow" : "bg-white/5 text-white/80 hover:bg-white/8"}`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigateDay("next")}
                disabled={activeDay === activePlan.durationDays}
                className="p-2 rounded-md bg-white/5 ml-auto disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5 text-white/80" />
              </button>
            </div>
          </div>
        </header>

        {/* Main grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: rings, donut, sparkline */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Calorie ring + micro summary */}
            <div className="rounded-2xl p-4 bg-[rgba(255,255,255,0.03)] border border-white/6 relative overflow-hidden">
              <div className="flex items-center gap-4">
                {/* ring */}
                <div className="w-28 h-28 flex items-center justify-center relative">
                  <svg viewBox="0 0 120 120" className="w-28 h-28">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="1">
                        <stop offset="0%" stopColor="#ffd18a" />
                        <stop offset="100%" stopColor="#ff6a3a" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="10"
                      fill="none"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      stroke="url(#g1)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 46}
                      strokeDashoffset={
                        ((100 - ringPercent) / 100) * (2 * Math.PI * 46)
                      }
                      className="ring-anim"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-sm text-white/70">Today</div>
                    <div className="text-xl font-bold">
                      {Math.round(dailyTotals.calories)}
                    </div>
                    <div className="text-xs text-white/40">
                      of {activePlan.targetCalories}
                    </div>
                  </div>
                </div>

                {/* mini stats */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-white/50">Goal</div>
                      <div className="font-semibold">
                        {selectedGoal === "fat_loss"
                          ? "Fat Loss"
                          : selectedGoal === "muscle_gain"
                            ? "Muscle Gain"
                            : "Trim & Tone"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/50">TDEE</div>
                      <div className="font-semibold">
                        {tdee.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* animated mini progress */}
                  <div className="mt-4">
                    <div className="h-2 rounded-full bg-white/6 overflow-hidden">
                      <div
                        style={{ width: `${calorieProgress}%` }}
                        className="h-2 bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
                      />
                    </div>
                    <div className="mt-2 text-xs text-white/50 flex items-center justify-between">
                      <span>Progress</span>
                      <span>{Math.round(calorieProgress)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Macro donut + labels */}
            <div className="rounded-2xl p-4 bg-[rgba(255,255,255,0.03)] border border-white/6">
              <div className="flex items-center gap-4">
                {/* donut built with strokes */}
                <div className="w-36 h-36 relative">
                  <svg viewBox="0 0 100 100" className="w-36 h-36">
                    <defs>
                      <linearGradient id="gp" x1="0" x2="1">
                        <stop offset="0" stopColor="#ffd18a" />
                        <stop offset="1" stopColor="#ff6a3a" />
                      </linearGradient>
                      <linearGradient id="gc" x1="0" x2="1">
                        <stop offset="0" stopColor="#9be7c4" />
                        <stop offset="1" stopColor="#00b894" />
                      </linearGradient>
                      <linearGradient id="gf" x1="0" x2="1">
                        <stop offset="0" stopColor="#fbd38d" />
                        <stop offset="1" stopColor="#f6ad55" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="50"
                      cy="50"
                      r="30"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth="14"
                      fill="none"
                    />
                    {/* draw segments by stroke-dasharray */}
                    {(() => {
                      const circumference = 2 * Math.PI * 30;
                      const p = Math.max(0, Math.min(1, donutData.pPct || 0));
                      const c = Math.max(0, Math.min(1, donutData.cPct || 0));
                      const f = Math.max(0, Math.min(1, donutData.fPct || 0));
                      const pLen = p * circumference;
                      const cLen = c * circumference;
                      const fLen = f * circumference;
                      // order: protein, carbs, fat
                      return (
                        <>
                          <circle
                            cx="50"
                            cy="50"
                            r="30"
                            stroke="url(#gp)"
                            strokeWidth="14"
                            fill="none"
                            strokeDasharray={`${pLen} ${circumference - pLen}`}
                            strokeDashoffset={0}
                            strokeLinecap="round"
                            className="ring-anim"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="30"
                            stroke="url(#gc)"
                            strokeWidth="14"
                            fill="none"
                            strokeDasharray={`${cLen} ${circumference - cLen}`}
                            strokeDashoffset={-pLen}
                            strokeLinecap="round"
                            className="ring-anim"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="30"
                            stroke="url(#gf)"
                            strokeWidth="14"
                            fill="none"
                            strokeDasharray={`${fLen} ${circumference - fLen}`}
                            strokeDashoffset={-(pLen + cLen)}
                            strokeLinecap="round"
                            className="ring-anim"
                          />
                        </>
                      );
                    })()}
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-sm text-white/60">Macros</div>
                      <div className="text-lg font-bold">
                        {Math.round(donutData.p + donutData.c + donutData.f)}g
                      </div>
                      <div className="text-xs text-white/50">per day</div>
                    </div>
                  </div>
                </div>

                {/* legend */}
                <div className="flex-1">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-amber-300 to-orange-400" />
                        <div>
                          <div className="text-sm font-semibold">Protein</div>
                          <div className="text-xs text-white/50">
                            {Math.round(donutData.p)} g
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-white/50">
                        {Math.round((donutData.pPct || 0) * 100)}%
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-green-300 to-green-500" />
                        <div>
                          <div className="text-sm font-semibold">Carbs</div>
                          <div className="text-xs text-white/50">
                            {Math.round(donutData.c)} g
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-white/50">
                        {Math.round((donutData.cPct || 0) * 100)}%
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-yellow-300 to-orange-300" />
                        <div>
                          <div className="text-sm font-semibold">Fat</div>
                          <div className="text-xs text-white/50">
                            {Math.round(donutData.f)} g
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-white/50">
                        {Math.round((donutData.fPct || 0) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sparkline weekly calories */}
            <div className="rounded-2xl p-4 bg-[rgba(255,255,255,0.02)] border border-white/6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">Weekly calories</div>
                  <div className="text-xs text-white/50">
                    Daily total across plan
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {weeklyCalories.length
                      ? Math.round(
                          weeklyCalories.reduce((s, n) => s + n, 0) /
                            weeklyCalories.length,
                        )
                      : 0}{" "}
                    kcal avg
                  </div>
                  <div className="text-xs text-white/50">avg/day</div>
                </div>
              </div>

              <div className="w-full">
                <svg viewBox="0 0 220 48" className="w-full h-12">
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="url(#sparkGrad)"
                    strokeWidth="2.5"
                    className="sparkline-path"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" x2="1">
                      <stop offset="0%" stopColor="#ffd18a" />
                      <stop offset="100%" stopColor="#ff6a3a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                  {weeklyCalories.map((c, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      {/* day labels small */}Day {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right column: meals with neon cards and animated actions */}
          <section className="lg:col-span-8 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {["breakfast", "lunch", "snack", "dinner"].map((mealType) => {
                const meal = getDayMeals(activeDay).find(
                  (m) => m.mealType === mealType,
                );
                if (!meal) return null;
                const mealConfig = getMealTypeConfig(mealType);
                const MealIcon = mealConfig.icon;

                return (
                  <article
                    key={mealType}
                    className={`rounded-2xl p-4 bg-gradient-to-br from-[#081026]/40 to-[#071022]/20 border border-white/6 relative overflow-hidden group transition hover:scale-[1.01] ${meal.isExcluded ? "opacity-60" : ""}`}
                  >
                    {/* subtle neon glow */}
                    <div className="absolute -inset-1 bg-gradient-to-br from-orange-400/6 to-transparent blur-md opacity-25 pointer-events-none" />

                    <div className="flex items-start gap-4">
                      <div
                        className={`w-16 h-16 rounded-lg flex items-center justify-center ${mealConfig.bg} ring-1 ring-white/6`}
                      >
                        <MealIcon className={`${mealConfig.color} w-6 h-6`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block w-2.5 h-2.5 rounded-full ${getCategoryColor(meal.category)} `}
                              />
                              <h3
                                className={`text-base font-semibold truncate ${meal.isExcluded ? "line-through" : ""}`}
                              >
                                {meal.mealName}
                              </h3>
                            </div>
                            <p className="text-xs text-white/50 mt-1">
                              {" "}
                              {Number(meal.calories).toFixed(1)} kcal • P{" "}
                              {Number(meal.protein).toFixed(1)}g • C{" "}
                              {Number(meal.carbs).toFixed(1)}g • F{" "}
                              {Number(meal.fat).toFixed(1)}g
                            </p>
                          </div>

                          {meal.isFavorite && (
                            <div className="ml-2">
                              <Heart className="w-5 h-5 text-rose-400" />
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() =>
                              meal.id &&
                              toggleFavoriteMutation.mutate({
                                planId: activePlan.id,
                                itemId: meal.id,
                              })
                            }
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${meal.isFavorite ? "bg-rose-500/20 text-rose-300" : "bg-white/5 text-white/80 hover:bg-white/8"}`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Heart className="w-4 h-4" />
                              <span>{meal.isFavorite ? "Saved" : "Save"}</span>
                            </div>
                          </button>

                          <button
                            onClick={() =>
                              meal.id &&
                              swapMealMutation.mutate({
                                planId: activePlan.id,
                                itemId: meal.id,
                              })
                            }
                            disabled={swapMealMutation.isPending}
                            className="flex-1 py-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/8"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Repeat className="w-4 h-4" />
                              <span>Swap</span>
                            </div>
                          </button>

                          <button
                            onClick={() =>
                              meal.id &&
                              toggleExcludeMutation.mutate({
                                planId: activePlan.id,
                                itemId: meal.id,
                              })
                            }
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${meal.isExcluded ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/80 hover:bg-rose-500/10"}`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Ban className="w-4 h-4" />
                              <span>
                                {meal.isExcluded ? "Restore" : "Skip"}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* bottom sticky CTA for mobile */}
            <div className="lg:hidden fixed left-4 right-4 bottom-4 z-50">
              <Button
                onClick={handleGenerate}
                disabled={generatePlanMutation.isPending}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-black font-semibold shadow-lg"
              >
                {generatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate Plan
                  </>
                )}
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* --- loading / config view (unchanged functionality; polished visuals) --- */
  const isHydrating = savedPlanData && !activePlan;
  if (isLoadingPlan || isFetchingPlan || isHydrating) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#020617] to-[#07102a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-amber-400 animate-spin" />
          </div>
          <p className="text-white/70">Loading your plan…</p>
        </div>
      </div>
    );
  }

  /* config view */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/member/diet-planner">
            <button className="p-2 rounded-lg bg-white/5">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">AI Diet Planner</h1>
            <p className="text-sm text-white/60">
              Pick goal, duration and diet — then generate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-white/60">
            TDEE:{" "}
            <span className="font-semibold">{tdee.toLocaleString()} kcal</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "fat_loss" as DietGoal,
                icon: Flame,
                label: "Fat Loss",
                sub: "-200",
              },
              {
                id: "muscle_gain" as DietGoal,
                icon: Dumbbell,
                label: "Build",
                sub: "+200",
              },
              {
                id: "trim_tone" as DietGoal,
                icon: Target,
                label: "Maintain",
                sub: "TDEE",
              },
            ].map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`relative p-3 rounded-xl text-left border ${selectedGoal === goal.id ? "bg-gradient-to-br from-amber-400 to-orange-400 text-black shadow-lg" : "bg-white/[0.02] border-white/6 hover:bg-white/5"}`}
              >
                <goal.icon className="w-5 h-5 mx-auto mb-2 text-white/90" />
                <div className="text-center">
                  <div className="font-semibold">{goal.label}</div>
                  <div className="text-xs text-white/50">{goal.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {[7, 30].map((dur) => (
              <button
                key={dur}
                onClick={() => setSelectedDuration(dur as Duration)}
                className={`py-3 rounded-xl ${selectedDuration === dur ? "bg-gradient-to-br from-amber-400 to-orange-400 text-black" : "bg-white/[0.02] border border-white/6"}`}
              >
                <div className="text-xl font-bold">{dur}</div>
                <div className="text-xs text-white/50">days</div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-white/[0.02] p-3 border border-white/6 mt-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "veg" as DietaryPreference, icon: Salad, label: "Veg" },
                {
                  id: "eggetarian" as DietaryPreference,
                  icon: Egg,
                  label: "Egg",
                },
                {
                  id: "non-veg" as DietaryPreference,
                  icon: Beef,
                  label: "Non-Veg",
                },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDietary(d.id)}
                  className={`py-3 rounded-lg ${selectedDietary === d.id ? "bg-white/5" : "bg-transparent"}`}
                >
                  <d.icon className="w-5 h-5 mb-1" />
                  <div className="text-xs font-semibold">{d.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl p-4 bg-[rgba(255,255,255,0.03)] border border-white/6 text-center">
            <div className="text-sm text-white/50">Target calories</div>
            <div className="text-2xl font-bold mt-2">
              {targetCalories.toLocaleString()} kcal
            </div>
            <div className="mt-4">
              <Button
                onClick={handleGenerate}
                disabled={generatePlanMutation.isPending}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-black font-bold rounded-2xl shadow-lg"
              >
                {generatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate Plan
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-[rgba(255,255,255,0.03)] border border-white/6 text-center">
            <div className="text-sm text-white/50">Your TDEE</div>
            <div className="text-xl font-bold mt-2">
              {tdee.toLocaleString()} kcal
            </div>
            <div className="mt-3">
              <button
                onClick={handleRefreshBodyComposition}
                className="px-3 py-2 rounded-md bg-white/5"
              >
                Refresh
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
