import { ArrowLeft, Sparkles, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function DietPlannerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,26%,10%)] to-[hsl(220,26%,14%)]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/member">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Diet Planner</h1>
            <p className="text-white/60 text-sm mt-1">Create your personalized meal plan</p>
          </div>
        </div>

        <Link href="/member/diet-planner/ai-planner">
          <div className="bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-6 cursor-pointer hover:border-orange-500/50 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    AI Diet Planner
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">NEW</span>
                  </h3>
                  <p className="text-white/60 text-sm">Generate a complete personalized meal plan based on your fitness goals</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white/60 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
