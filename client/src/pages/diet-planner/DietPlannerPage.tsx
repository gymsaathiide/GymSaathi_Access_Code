import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

function BreakfastButton() {
  return (
    <button className="group relative outline-0 h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] border border-solid border-transparent rounded-xl flex items-center justify-center aspect-square cursor-pointer transition-transform duration-200 active:scale-[0.95] bg-[linear-gradient(45deg,#ff9f1c,#ffbf69)] shadow-[0_4px_15px_rgba(255,159,28,0.4)]">
      <div className="absolute z-10 h-[70px] w-[70px] sm:h-[85px] sm:w-[85px] transition-all duration-300">
        <div className="absolute left-[10%] top-[35%] h-[38%] w-[38%] rounded-full bg-white border-2 border-amber-300 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-6">
          <div className="h-1/2 w-1/2 rounded-full bg-amber-300 shadow-sm"></div>
        </div>
        <div className="absolute right-[5%] top-[18%] h-[40%] w-[40%] rounded-full bg-white border-2 border-amber-400 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-3">
          <div className="flex flex-col items-center gap-[2px]">
            <span className="h-[6px] w-[75%] rounded-full bg-amber-500"></span>
            <span className="h-[6px] w-[80%] rounded-full bg-amber-400"></span>
            <span className="h-[5px] w-[70%] rounded-full bg-amber-300"></span>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[8%] h-[42%] w-[42%] rounded-full bg-white border-2 border-amber-300 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-1">
          <div className="h-[70%] w-[70%] rounded-[40%] bg-amber-200 border border-amber-400 flex items-center justify-center">
            <div className="h-1/2 w-1/2 rounded-md bg-amber-500"></div>
          </div>
        </div>
      </div>
      <span className="text-[24px] sm:text-[28px] font-extrabold leading-none text-white tracking-tight transition-all duration-200 group-hover:opacity-0">
        🌅
      </span>
    </button>
  );
}

function LunchButton() {
  return (
    <button className="group relative outline-0 h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] border border-solid border-transparent rounded-xl flex items-center justify-center aspect-square cursor-pointer transition-transform duration-200 active:scale-[0.95] bg-[linear-gradient(45deg,#06b6d4,#22d3ee)] shadow-[0_4px_15px_rgba(6,182,212,0.4)]">
      <div className="absolute z-10 h-[70px] w-[70px] sm:h-[85px] sm:w-[85px] transition-all duration-300">
        <div className="absolute left-[5%] top-[25%] h-[45%] w-[45%] rounded-full bg-white border-2 border-cyan-300 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-6">
          <div className="h-[60%] w-[60%] rounded-full bg-green-400 flex items-center justify-center">
            <div className="h-1/2 w-1/2 rounded-full bg-green-600"></div>
          </div>
        </div>
        <div className="absolute right-[8%] top-[15%] h-[38%] w-[38%] rounded-full bg-white border-2 border-cyan-400 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-3">
          <div className="h-[65%] w-[65%] rounded-md bg-orange-300 flex items-center justify-center">
            <div className="h-1/2 w-3/4 rounded-sm bg-orange-500"></div>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[5%] h-[40%] w-[50%] rounded-full bg-white border-2 border-cyan-300 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-1">
          <div className="flex gap-1">
            <div className="h-4 w-2 rounded-sm bg-yellow-400"></div>
            <div className="h-4 w-2 rounded-sm bg-red-400"></div>
            <div className="h-4 w-2 rounded-sm bg-green-500"></div>
          </div>
        </div>
      </div>
      <span className="text-[24px] sm:text-[28px] font-extrabold leading-none text-white tracking-tight transition-all duration-200 group-hover:opacity-0">
        ☀️
      </span>
    </button>
  );
}

function DinnerButton() {
  return (
    <button className="group relative outline-0 h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] border border-solid border-transparent rounded-xl flex items-center justify-center aspect-square cursor-pointer transition-transform duration-200 active:scale-[0.95] bg-[linear-gradient(45deg,#8b5cf6,#a78bfa)] shadow-[0_4px_15px_rgba(139,92,246,0.4)]">
      <div className="absolute z-10 h-[70px] w-[70px] sm:h-[85px] sm:w-[85px] transition-all duration-300">
        <div className="absolute left-[8%] top-[20%] h-[42%] w-[42%] rounded-full bg-white border-2 border-violet-300 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-6">
          <div className="h-[55%] w-[55%] rounded-full bg-red-400 flex items-center justify-center">
            <div className="h-1/2 w-1/2 rounded-full bg-red-600"></div>
          </div>
        </div>
        <div className="absolute right-[5%] top-[25%] h-[35%] w-[35%] rounded-full bg-white border-2 border-violet-400 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-3">
          <div className="h-[60%] w-[60%] rounded-md bg-amber-600"></div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[8%] h-[45%] w-[48%] rounded-full bg-white border-2 border-violet-300 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-1">
          <div className="flex flex-col items-center gap-[2px]">
            <div className="h-3 w-6 rounded-t-full bg-amber-200"></div>
            <div className="h-2 w-5 bg-amber-300"></div>
          </div>
        </div>
      </div>
      <span className="text-[24px] sm:text-[28px] font-extrabold leading-none text-white tracking-tight transition-all duration-200 group-hover:opacity-0">
        🌙
      </span>
    </button>
  );
}

const mealCards = [
  {
    title: "Breakfast",
    url: "/member/diet-planner/breakfast",
    description: "Start your day right",
    ButtonComponent: BreakfastButton,
    gradient: "from-orange-500 to-amber-400"
  },
  {
    title: "Lunch",
    url: "/member/diet-planner/lunch",
    description: "Fuel your afternoon",
    ButtonComponent: LunchButton,
    gradient: "from-cyan-500 to-teal-400"
  },
  {
    title: "Dinner",
    url: "/member/diet-planner/dinner",
    description: "End your day healthy",
    ButtonComponent: DinnerButton,
    gradient: "from-violet-500 to-purple-400"
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
              <Card className="group/card relative overflow-hidden bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                <div className={`absolute inset-0 bg-gradient-to-br ${meal.gradient} opacity-0 group-hover/card:opacity-10 transition-opacity duration-300`} />
                
                <CardContent className="p-6 sm:p-8 relative z-10">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <meal.ButtonComponent />
                    
                    <div className="space-y-2">
                      <h3 className={`text-2xl font-bold text-white group-hover/card:text-transparent group-hover/card:bg-clip-text group-hover/card:bg-gradient-to-r ${meal.gradient.replace('from-', 'group-hover/card:from-').replace('to-', 'group-hover/card:to-')} transition-all duration-300`}>
                        {meal.title}
                      </h3>
                      <p className="text-white/60 text-sm">{meal.description}</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-orange-400 font-medium text-sm group-hover/card:gap-3 transition-all duration-300">
                        <span>Explore Menu</span>
                        <svg className="w-4 h-4 group-hover/card:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
