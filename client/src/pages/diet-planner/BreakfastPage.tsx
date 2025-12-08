import { useState } from "react";
import { ArrowLeft, Coffee, X, Leaf, Egg, Drumstick, Flame, Dumbbell, Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";

interface BreakfastMeal {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  protein: string;
  carbs: string;
  fats: string;
  calories: string;
  category: 'veg' | 'eggetarian' | 'non-veg';
  image_url: string | null;
}

interface MealPlanItem {
  day: number;
  meal: BreakfastMeal;
}

const categoryConfig = {
  veg: { label: 'Veg', color: 'bg-green-500', textColor: 'text-green-400', bgColor: 'bg-green-500/20', icon: Leaf, emoji: '🥗' },
  eggetarian: { label: 'Egg', color: 'bg-yellow-500', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: Egg, emoji: '🥚' },
  'non-veg': { label: 'Non-Veg', color: 'bg-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/20', icon: Drumstick, emoji: '🍗' },
};

export default function BreakfastPage() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activePlan, setActivePlan] = useState<{ duration: 7 | 30; category: string; meals: MealPlanItem[] } | null>(null);

  const generatePlanMutation = useMutation({
    mutationFn: async ({ duration, category }: { duration: 7 | 30; category: string }) => {
      const res = await fetch('/api/meals/breakfast/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duration, category }),
      });
      if (!res.ok) throw new Error('Failed to generate meal plan');
      return res.json();
    },
    onSuccess: (data, variables) => {
      setActivePlan({ duration: variables.duration, category: variables.category, meals: data.plan });
      toast({ title: `${variables.duration}-day meal plan generated!`, description: `Showing ${variables.duration} random breakfast meals` });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to generate meal plan', description: error.message, variant: 'destructive' });
    },
  });

  const handleGeneratePlan = (duration: 7 | 30) => {
    generatePlanMutation.mutate({ duration, category: categoryFilter });
  };

  const handleRegeneratePlan = () => {
    if (!activePlan) return;
    generatePlanMutation.mutate({ duration: activePlan.duration, category: activePlan.category });
  };

  const handleClearPlan = () => {
    setActivePlan(null);
    toast({ title: 'Plan cleared' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,26%,10%)] to-[hsl(220,26%,14%)]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/member/diet-planner">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center">
              <Coffee className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Breakfast</h1>
              <p className="text-white/60 text-sm mt-1">
                {activePlan 
                  ? `${activePlan.duration}-day plan (${activePlan.category === 'all' ? 'All Categories' : categoryConfig[activePlan.category as keyof typeof categoryConfig]?.label || activePlan.category})`
                  : 'Generate a meal plan to get started'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full md:w-auto">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="veg" className="data-[state=active]:bg-green-500/20 text-white/60 data-[state=active]:text-green-400">
                <Leaf className="h-3 w-3 mr-1" /> Veg
              </TabsTrigger>
              <TabsTrigger value="eggetarian" className="data-[state=active]:bg-yellow-500/20 text-white/60 data-[state=active]:text-yellow-400">
                <Egg className="h-3 w-3 mr-1" /> Egg
              </TabsTrigger>
              <TabsTrigger value="non-veg" className="data-[state=active]:bg-red-500/20 text-white/60 data-[state=active]:text-red-400">
                <Drumstick className="h-3 w-3 mr-1" /> Non-Veg
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleGeneratePlan(7)}
              disabled={generatePlanMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Generate 7 Days
            </Button>
            <Button
              onClick={() => handleGeneratePlan(30)}
              disabled={generatePlanMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Generate 30 Days
            </Button>
            
            {activePlan && (
              <>
                <Button
                  onClick={handleRegeneratePlan}
                  disabled={generatePlanMutation.isPending}
                  className="bg-white/10 hover:bg-white/20 text-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${generatePlanMutation.isPending ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  onClick={handleClearPlan}
                  variant="ghost"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Plan
                </Button>
              </>
            )}
          </div>
        </div>

        {!activePlan ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Coffee className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No meal plan active</h3>
              <p className="text-white/60 mb-4">Select a category and duration above to generate your breakfast meal plan</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePlan.meals.map((item, index) => {
            const meal = item.meal;
              const config = categoryConfig[meal.category];
              const CategoryIcon = config.icon;
              
              return (
                <Card key={`${meal.id}-${index}`} className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors group relative">
                  <div className="absolute top-2 left-2 z-10">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">D{item.day}</span>
                    </div>
                  </div>
                  <CardContent className="p-4 pt-14">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <CategoryIcon className={`h-4 w-4 ${config.textColor}`} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{meal.name}</h3>
                    <p className="text-white/50 text-sm mb-3 line-clamp-2">{meal.description || 'No description'}</p>
                    
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Flame className="h-3 w-3 text-orange-400" />
                        </div>
                        <span className="text-white font-semibold text-sm">{Number(meal.calories).toFixed(0)}</span>
                        <p className="text-white/40 text-[10px]">kcal</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Dumbbell className="h-3 w-3 text-blue-400" />
                        </div>
                        <span className="text-white font-semibold text-sm">{Number(meal.protein).toFixed(1)}g</span>
                        <p className="text-white/40 text-[10px]">Protein</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <span className="text-amber-400 text-xs">🍞</span>
                        <span className="text-white font-semibold text-sm block">{Number(meal.carbs).toFixed(1)}g</span>
                        <p className="text-white/40 text-[10px]">Carbs</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <span className="text-purple-400 text-xs">🧈</span>
                        <span className="text-white font-semibold text-sm block">{Number(meal.fats).toFixed(1)}g</span>
                        <p className="text-white/40 text-[10px]">Fats</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
