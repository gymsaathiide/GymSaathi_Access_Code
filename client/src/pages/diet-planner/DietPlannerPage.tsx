import { ArrowLeft, Sparkles, ChevronRight, Brain, Utensils, Target, Zap, Calendar, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function DietPlannerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1628] via-[#141c32] to-[#1a2340]">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0f1628]/80 border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link href="/member">
            <button className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-95">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Diet Planner</h1>
            <p className="text-white/40 text-xs">Your nutrition companion</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
        {/* Hero Section - Premium Glass Card */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-yellow-500/5 rounded-3xl" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl -ml-12 -mb-12" />
          
          <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-3xl p-6 border border-white/10">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">AI Diet Planner</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-0.5 rounded-full">NEW</span>
                  <span className="text-white/40 text-xs">Powered by AI</span>
                </div>
              </div>
            </div>
            
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              Get a personalized meal plan tailored to your fitness goals. Choose your target, set your preferences, and let AI create the perfect nutrition plan for you.
            </p>
            
            <Link href="/member/diet-planner/ai-planner">
              <button className="w-full py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-600 hover:to-orange-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-[0.98]">
                <span>Start Planning</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-4">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider px-1">What you get</h3>
          
          <div className="grid gap-3">
            {/* Feature 1 */}
            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Brain className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Smart Meal Selection</h4>
                <p className="text-white/40 text-sm leading-relaxed">AI picks meals based on your calorie target, macros, and dietary preferences</p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Utensils className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Flexible Plans</h4>
                <p className="text-white/40 text-sm leading-relaxed">Choose 7-day or 30-day plans. Swap any meal you don't like instantly</p>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Goal-Based Calories</h4>
                <p className="text-white/40 text-sm leading-relaxed">Fat loss, muscle gain, or maintenance - we calculate your perfect intake</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Track Progress</h4>
                <p className="text-white/40 text-sm leading-relaxed">Monitor your daily macros and save your favourite meals for quick access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diet Options */}
        <div className="space-y-4">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider px-1">Available for</h3>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 hover:bg-emerald-500/15 rounded-2xl p-4 border border-emerald-500/20 hover:border-emerald-500/30 text-center transition-all duration-300 cursor-default">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="text-2xl">🥗</span>
              </div>
              <span className="text-emerald-400 text-sm font-semibold">Vegetarian</span>
            </div>
            <div className="bg-amber-500/10 hover:bg-amber-500/15 rounded-2xl p-4 border border-amber-500/20 hover:border-amber-500/30 text-center transition-all duration-300 cursor-default">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <span className="text-2xl">🍳</span>
              </div>
              <span className="text-amber-400 text-sm font-semibold">Eggetarian</span>
            </div>
            <div className="bg-rose-500/10 hover:bg-rose-500/15 rounded-2xl p-4 border border-rose-500/20 hover:border-rose-500/30 text-center transition-all duration-300 cursor-default">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <span className="text-2xl">🍗</span>
              </div>
              <span className="text-rose-400 text-sm font-semibold">Non-Veg</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-white">7-30</p>
              <p className="text-white/40 text-xs mt-0.5">Day plans</p>
            </div>
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">4</p>
              <p className="text-white/40 text-xs mt-0.5">Meals/day</p>
            </div>
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">3</p>
              <p className="text-white/40 text-xs mt-0.5">Goal types</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
