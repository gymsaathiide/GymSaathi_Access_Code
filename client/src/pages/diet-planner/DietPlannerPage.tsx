import { ArrowLeft, Sparkles, ChevronRight, Brain, Utensils, Target } from "lucide-react";
import { Link } from "wouter";

export default function DietPlannerPage() {
  return (
    <div className="min-h-screen bg-[#1b233d]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1b233d]/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/member">
            <button className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Diet Planner</h1>
            <p className="text-white/50 text-xs">Your nutrition companion</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-yellow-500/10 border border-orange-500/30 p-5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/15 rounded-full blur-3xl -ml-10 -mb-10"></div>
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Diet Planner</h2>
                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">NEW</span>
              </div>
            </div>
            
            <p className="text-white/70 text-sm mb-5 leading-relaxed">
              Get a personalized meal plan tailored to your fitness goals. Choose your target, set your preferences, and let AI create the perfect nutrition plan for you.
            </p>
            
            <Link href="/member/diet-planner/ai-planner">
              <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2">
                <span>Start Planning</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-3">
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wide px-1">What you get</h3>
          
          <div className="grid gap-3">
            {/* Feature 1 */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm mb-1">Smart Meal Selection</h4>
                <p className="text-white/50 text-xs leading-relaxed">AI picks meals based on your calorie target, macros, and dietary preferences</p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Utensils className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm mb-1">Flexible Plans</h4>
                <p className="text-white/50 text-xs leading-relaxed">Choose 7-day or 30-day plans. Swap any meal you don't like instantly</p>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm mb-1">Goal-Based Calories</h4>
                <p className="text-white/50 text-xs leading-relaxed">Fat loss, muscle gain, or maintenance - we calculate your perfect intake</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diet Options */}
        <div className="space-y-3">
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wide px-1">Available for</h3>
          
          <div className="flex gap-3">
            <div className="flex-1 bg-green-500/10 rounded-xl p-3 border border-green-500/20 text-center">
              <span className="text-2xl mb-1 block">🥗</span>
              <span className="text-green-400 text-xs font-medium">Vegetarian</span>
            </div>
            <div className="flex-1 bg-amber-500/10 rounded-xl p-3 border border-amber-500/20 text-center">
              <span className="text-2xl mb-1 block">🍳</span>
              <span className="text-amber-400 text-xs font-medium">Eggetarian</span>
            </div>
            <div className="flex-1 bg-red-500/10 rounded-xl p-3 border border-red-500/20 text-center">
              <span className="text-2xl mb-1 block">🍗</span>
              <span className="text-red-400 text-xs font-medium">Non-Veg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
