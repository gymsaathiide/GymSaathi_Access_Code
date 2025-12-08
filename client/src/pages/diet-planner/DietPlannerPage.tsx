import { ArrowLeft, Coffee, Sun, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

const mealCards = [
  {
    title: "Breakfast",
    emoji: "🌅",
    icon: Coffee,
    url: "/member/diet-planner/breakfast",
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    description: "Start your day right"
  },
  {
    title: "Lunch",
    emoji: "☀️",
    icon: Sun,
    url: "/member/diet-planner/lunch",
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
    description: "Fuel your afternoon"
  },
  {
    title: "Dinner",
    emoji: "🌙",
    icon: Moon,
    url: "/member/diet-planner/dinner",
    gradient: "from-purple-500 via-indigo-500 to-blue-600",
    description: "End your day healthy"
  }
];

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
            <p className="text-white/60 text-sm mt-1">Choose your meal to explore options</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mealCards.map((meal) => (
            <Link key={meal.title} href={meal.url}>
              <Card className="group relative overflow-hidden bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                <div className={`absolute inset-0 bg-gradient-to-br ${meal.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <CardContent className="p-8 relative z-10">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${meal.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-4xl">{meal.emoji}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:to-orange-600 transition-all duration-300">
                        {meal.title}
                      </h3>
                      <p className="text-white/60 text-sm">{meal.description}</p>
                    </div>

                    <div className="pt-4">
                      <div className="flex items-center gap-2 text-orange-400 font-medium text-sm group-hover:gap-3 transition-all duration-300">
                        <span>Explore Menu</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🥗</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Vegetarian</h4>
                  <p className="text-white/60 text-sm">Plant-based options for every meal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🥚</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Eggetarian</h4>
                  <p className="text-white/60 text-sm">Includes eggs for extra protein</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🍗</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Non-Vegetarian</h4>
                  <p className="text-white/60 text-sm">Meat and poultry selections</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
