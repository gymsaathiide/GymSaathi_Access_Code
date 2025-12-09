import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function BreakfastCard() {
  return (
    <Link href="/member/diet-planner/breakfast">
      <div className="relative group/main flex flex-wrap w-56 items-center justify-center cursor-pointer">
        <div className="main_back absolute w-44 h-44 rounded-[10px] rotate-90 bg-[linear-gradient(270deg,#f97316,#fbbf24,#fb923c)] shadow-[inset_0_0_180px_5px_#ffffff] -z-20 transition-opacity duration-300 group-hover/main:opacity-0"></div>
        
        <p className="text absolute text-[0.7rem] font-bold tracking-[0.33em] text-black text-center transition-opacity duration-400 z-30 group-hover/main:opacity-0">
          HOVER<br /><br />FOR<br /><br />BREAKFAST
        </p>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-tl-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-green-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-green-700 group-hover/main:text-white">VEG</span>
            <span className="text-xl">🥗</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-amber-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-amber-700 group-hover/main:text-white">EGGETARIAN</span>
            <span className="text-xl">🍳</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-tr-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-red-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-red-700 group-hover/main:text-white">NON-VEG</span>
            <span className="text-xl">🍗</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-orange-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-orange-700 group-hover/main:text-white">PANCAKES</span>
            <span className="text-xl">🥞</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:border-transparent group-hover/main:bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-slate-700 group-hover/main:text-white">ALL</span>
            <span className="text-xl">🌅</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-yellow-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-yellow-700 group-hover/main:text-white">TOAST</span>
            <span className="text-xl">🍞</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-bl-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-emerald-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-emerald-700 group-hover/main:text-white">SMOOTHIE</span>
            <span className="text-xl">🥤</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-sky-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-sky-800 group-hover/main:text-white">OATS</span>
            <span className="text-xl">🥣</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-br-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-pink-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-pink-800 group-hover/main:text-white">FRUITS</span>
            <span className="text-xl">🍎</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function LunchCard() {
  return (
    <Link href="/member/diet-planner/lunch">
      <div className="relative group/main flex flex-wrap w-56 items-center justify-center cursor-pointer">
        <div className="main_back absolute w-44 h-44 rounded-[10px] rotate-90 bg-[linear-gradient(270deg,#06b6d4,#22d3ee,#67e8f9)] shadow-[inset_0_0_180px_5px_#ffffff] -z-20 transition-opacity duration-300 group-hover/main:opacity-0"></div>
        
        <p className="text absolute text-[0.7rem] font-bold tracking-[0.33em] text-black text-center transition-opacity duration-400 z-30 group-hover/main:opacity-0">
          HOVER<br /><br />FOR<br /><br />LUNCH
        </p>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-tl-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-green-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-green-700 group-hover/main:text-white">VEG</span>
            <span className="text-xl">🥗</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-amber-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-amber-700 group-hover/main:text-white">EGGETARIAN</span>
            <span className="text-xl">🍳</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-tr-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-red-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-red-700 group-hover/main:text-white">NON-VEG</span>
            <span className="text-xl">🍗</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-orange-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-orange-700 group-hover/main:text-white">RICE</span>
            <span className="text-xl">🍚</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:border-transparent group-hover/main:bg-gradient-to-br from-cyan-500 via-teal-400 to-emerald-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-slate-700 group-hover/main:text-white">ALL</span>
            <span className="text-xl">☀️</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-yellow-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-yellow-700 group-hover/main:text-white">ROTI</span>
            <span className="text-xl">🫓</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-bl-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-emerald-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-emerald-700 group-hover/main:text-white">DAL</span>
            <span className="text-xl">🍲</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-sky-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-sky-800 group-hover/main:text-white">PROTEIN</span>
            <span className="text-xl">🥙</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-br-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-pink-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-pink-800 group-hover/main:text-white">THALI</span>
            <span className="text-xl">🍽️</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DinnerCard() {
  return (
    <Link href="/member/diet-planner/dinner">
      <div className="relative group/main flex flex-wrap w-56 items-center justify-center cursor-pointer">
        <div className="main_back absolute w-44 h-44 rounded-[10px] rotate-90 bg-[linear-gradient(270deg,#8b5cf6,#a855f7,#c084fc)] shadow-[inset_0_0_180px_5px_#ffffff] -z-20 transition-opacity duration-300 group-hover/main:opacity-0"></div>
        
        <p className="text absolute text-[0.7rem] font-bold tracking-[0.33em] text-black text-center transition-opacity duration-400 z-30 group-hover/main:opacity-0">
          HOVER<br /><br />FOR<br /><br />DINNER
        </p>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-tl-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-green-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-green-700 group-hover/main:text-white">VEG</span>
            <span className="text-xl">🥗</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-amber-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-amber-700 group-hover/main:text-white">EGGETARIAN</span>
            <span className="text-xl">🍳</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-tr-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-red-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-red-700 group-hover/main:text-white">NON-VEG</span>
            <span className="text-xl">🍗</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-orange-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-orange-700 group-hover/main:text-white">SOUP</span>
            <span className="text-xl">🍜</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:border-transparent group-hover/main:bg-gradient-to-br from-violet-500 via-purple-400 to-fuchsia-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-slate-700 group-hover/main:text-white">ALL</span>
            <span className="text-xl">🌙</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-yellow-400">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-yellow-700 group-hover/main:text-white">LIGHT</span>
            <span className="text-xl">🥒</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-bl-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-emerald-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-emerald-700 group-hover/main:text-white">CURRY</span>
            <span className="text-xl">🍛</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-sky-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-sky-800 group-hover/main:text-white">PROTEIN</span>
            <span className="text-xl">🥩</span>
          </div>
        </div>

        <div className="flex items-center justify-center w-[60px] h-[60px] rounded-br-[10px] bg-white/60 border border-transparent backdrop-blur-sm transition-all duration-300 group-hover/main:m-0.5 group-hover/main:rounded-[10px] group-hover/main:shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover/main:border-white/30 group-hover/main:bg-white/20 hover:bg-pink-500">
          <div className="flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover/main:opacity-100">
            <span className="text-[0.55rem] font-semibold text-pink-800 group-hover/main:text-white">DESSERT</span>
            <span className="text-xl">🍰</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

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

        <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16">
          <div className="flex flex-col items-center gap-4">
            <BreakfastCard />
            <h3 className="text-xl font-bold text-white">Breakfast</h3>
            <p className="text-white/60 text-sm">Start your day right</p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <LunchCard />
            <h3 className="text-xl font-bold text-white">Lunch</h3>
            <p className="text-white/60 text-sm">Fuel your afternoon</p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <DinnerCard />
            <h3 className="text-xl font-bold text-white">Dinner</h3>
            <p className="text-white/60 text-sm">End your day healthy</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🥗</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Vegetarian</h4>
                <p className="text-white/60 text-sm">Plant-based options for every meal</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🥚</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Eggetarian</h4>
                <p className="text-white/60 text-sm">Includes eggs for extra protein</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🍗</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Non-Vegetarian</h4>
                <p className="text-white/60 text-sm">Meat and poultry selections</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
