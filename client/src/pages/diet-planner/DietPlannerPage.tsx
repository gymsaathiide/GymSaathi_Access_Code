import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, ChevronRight, Brain, Utensils, Target, TrendingUp, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function DietPlannerPage() {
  const [, setLocation] = useLocation();

  const { data: activePlan, isLoading } = useQuery({
    queryKey: ['active-diet-plan'],
    queryFn: async () => {
      const res = await fetch('/api/diet-planner/active-plan', { credentials: 'include' });
      const data = await res.json();
      return data.plan;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!isLoading && activePlan) {
      setLocation('/member/diet-planner/ai-planner');
    }
  }, [activePlan, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f1628] via-[#141c32] to-[#1a2340] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-white/50 text-sm">Loading your plan...</p>
        </div>
      </div>
    );
  }

  if (activePlan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f1628] via-[#141c32] to-[#1a2340] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-white/50 text-sm">Redirecting to your plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1628] via-[#141c32] to-[#1a2340]">
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0f1628]/80 border-b border-white/5 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link href="/member">
            <button className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-95">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Diet Planner</h1>
            <p className="text-white/40 text-xs hidden sm:block">Your nutrition companion</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-4xl mx-auto">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-yellow-500/5 rounded-2xl sm:rounded-3xl" />
          <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-orange-500/20 rounded-full blur-3xl -mr-12 sm:-mr-16 -mt-12 sm:-mt-16" />
          <div className="absolute bottom-0 left-0 w-28 sm:w-40 h-28 sm:h-40 bg-amber-500/15 rounded-full blur-3xl -ml-10 sm:-ml-12 -mb-10 sm:-mb-12" />
          
          <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-4 sm:mb-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/30 flex-shrink-0">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">AI Diet Planner</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 sm:px-2.5 py-0.5 rounded-full">NEW</span>
                  <span className="text-white/40 text-xs">Powered by AI</span>
                </div>
              </div>
            </div>
            
            <p className="text-white/60 text-sm sm:text-base mb-5 sm:mb-6 leading-relaxed max-w-xl">
              Get a personalized meal plan tailored to your fitness goals. Choose your target, set your preferences, and let AI create the perfect nutrition plan for you.
            </p>
            
            <Link href="/member/diet-planner/ai-planner">
              <button className="w-full sm:w-auto sm:min-w-[220px] py-3.5 sm:py-4 px-6 sm:px-8 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-600 hover:to-orange-500 text-white font-bold rounded-xl sm:rounded-2xl transition-all duration-300 shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-[0.98]">
                <span>Start Planning</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider px-1">What you get</h3>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Smart Meal Selection</h4>
                <p className="text-white/40 text-xs sm:text-sm leading-relaxed">AI picks meals based on your calorie target and preferences</p>
              </div>
            </div>
            
            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Flexible Plans</h4>
                <p className="text-white/40 text-xs sm:text-sm leading-relaxed">7 or 30-day plans. Swap any meal you don't like</p>
              </div>
            </div>
            
            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Goal-Based Calories</h4>
                <p className="text-white/40 text-xs sm:text-sm leading-relaxed">Fat loss, muscle gain, or maintenance calculated</p>
              </div>
            </div>

            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Track Progress</h4>
                <p className="text-white/40 text-xs sm:text-sm leading-relaxed">Monitor daily macros and save favourite meals</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider px-1">Available for</h3>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-emerald-500/10 hover:bg-emerald-500/15 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-emerald-500/20 hover:border-emerald-500/30 text-center transition-all duration-300 cursor-default">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🥗</span>
              </div>
              <span className="text-emerald-400 text-xs sm:text-sm font-semibold">Vegetarian</span>
            </div>
            <div className="bg-amber-500/10 hover:bg-amber-500/15 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-amber-500/20 hover:border-amber-500/30 text-center transition-all duration-300 cursor-default">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🍳</span>
              </div>
              <span className="text-amber-400 text-xs sm:text-sm font-semibold">Eggetarian</span>
            </div>
            <div className="bg-rose-500/10 hover:bg-rose-500/15 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-rose-500/20 hover:border-rose-500/30 text-center transition-all duration-300 cursor-default">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 rounded-lg sm:rounded-xl bg-rose-500/10 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🍗</span>
              </div>
              <span className="text-rose-400 text-xs sm:text-sm font-semibold">Non-Veg</span>
            </div>
          </div>
        </div>

        <div className="pb-20 md:pb-4" />
      </div>
    </div>
  );
}
