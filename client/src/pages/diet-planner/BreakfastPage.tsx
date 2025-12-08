import { useState } from "react";
import { ArrowLeft, Coffee, Search, Pencil, Trash2, X, Leaf, Egg, Drumstick, Flame, Dumbbell, Calendar, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editMeal, setEditMeal] = useState<BreakfastMeal | null>(null);
  const [deleteMeal, setDeleteMeal] = useState<BreakfastMeal | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    ingredients: '',
    protein: '',
    carbs: '',
    fats: '',
    calories: '',
    category: 'veg' as 'veg' | 'eggetarian' | 'non-veg',
    imageUrl: '',
  });

  const [viewMode, setViewMode] = useState<'browse' | 'plan'>('browse');
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
  const [planDuration, setPlanDuration] = useState<7 | 30>(7);
  const [planCategoryFilter, setPlanCategoryFilter] = useState('all');

  const { data: mealsData, isLoading } = useQuery({
    queryKey: ['breakfast-meals', categoryFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);
      const res = await fetch(`/api/meals/breakfast?${params}`);
      if (!res.ok) throw new Error('Failed to fetch meals');
      return res.json();
    },
  });

  const updateMealMutation = useMutation({
    mutationFn: async (meal: { id: string; data: typeof editFormData }) => {
      const res = await fetch(`/api/meals/breakfast/${meal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(meal.data),
      });
      if (!res.ok) throw new Error('Failed to update meal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakfast-meals'] });
      setEditMeal(null);
      toast({ title: 'Meal updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update meal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/meals/breakfast/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete meal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakfast-meals'] });
      setDeleteMeal(null);
      toast({ title: 'Meal deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete meal', description: error.message, variant: 'destructive' });
    },
  });

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
    onSuccess: (data) => {
      setMealPlan(data.plan);
      setViewMode('plan');
      toast({ title: `${planDuration}-day meal plan generated!`, description: 'Your breakfast plan is ready' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to generate meal plan', description: error.message, variant: 'destructive' });
    },
  });

  const handleEditClick = (meal: BreakfastMeal) => {
    setEditFormData({
      name: meal.name,
      description: meal.description || '',
      ingredients: meal.ingredients || '',
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      calories: meal.calories,
      category: meal.category,
      imageUrl: meal.image_url || '',
    });
    setEditMeal(meal);
  };

  const handleEditSubmit = () => {
    if (!editMeal) return;
    updateMealMutation.mutate({ id: editMeal.id, data: editFormData });
  };

  const handleDeleteConfirm = () => {
    if (!deleteMeal) return;
    deleteMealMutation.mutate(deleteMeal.id);
  };

  const handleGeneratePlan = (duration: 7 | 30) => {
    setPlanDuration(duration);
    generatePlanMutation.mutate({ duration, category: planCategoryFilter });
  };

  const handleRegeneratePlan = () => {
    generatePlanMutation.mutate({ duration: planDuration, category: planCategoryFilter });
  };

  const meals: BreakfastMeal[] = mealsData?.meals || [];

  const categoryStats = {
    all: meals.length || 0,
    veg: meals.filter((m: BreakfastMeal) => m.category === 'veg').length || 0,
    eggetarian: meals.filter((m: BreakfastMeal) => m.category === 'eggetarian').length || 0,
    'non-veg': meals.filter((m: BreakfastMeal) => m.category === 'non-veg').length || 0,
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
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center">
              <Coffee className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Breakfast</h1>
              <p className="text-white/60 text-sm mt-1">{meals.length} meals available</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'browse' ? 'default' : 'ghost'}
              onClick={() => setViewMode('browse')}
              className={viewMode === 'browse' ? 'bg-orange-500 hover:bg-orange-600' : 'text-white/60 hover:text-white hover:bg-white/10'}
            >
              <Search className="h-4 w-4 mr-2" />
              Browse Meals
            </Button>
            <Button
              variant={viewMode === 'plan' ? 'default' : 'ghost'}
              onClick={() => setViewMode('plan')}
              className={viewMode === 'plan' ? 'bg-orange-500 hover:bg-orange-600' : 'text-white/60 hover:text-white hover:bg-white/10'}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Meal Plans
            </Button>
          </div>
        </div>

{viewMode === 'browse' ? (
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search meals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full md:w-auto">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="all" className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white">
                  All ({categoryStats.all})
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
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Generate Meal Plan</h2>
                    <p className="text-white/60 text-sm">Create personalized breakfast plans</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-white/80 mb-2 block">Category Filter</Label>
                    <Tabs value={planCategoryFilter} onValueChange={setPlanCategoryFilter}>
                      <TabsList className="bg-white/5 border border-white/10 w-full">
                        <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white">
                          All
                        </TabsTrigger>
                        <TabsTrigger value="veg" className="flex-1 data-[state=active]:bg-green-500/20 text-white/60 data-[state=active]:text-green-400">
                          Veg
                        </TabsTrigger>
                        <TabsTrigger value="eggetarian" className="flex-1 data-[state=active]:bg-yellow-500/20 text-white/60 data-[state=active]:text-yellow-400">
                          Egg
                        </TabsTrigger>
                        <TabsTrigger value="non-veg" className="flex-1 data-[state=active]:bg-red-500/20 text-white/60 data-[state=active]:text-red-400">
                          Non-Veg
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div>
                    <Label className="text-white/80 mb-2 block">Plan Duration</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleGeneratePlan(7)}
                        disabled={generatePlanMutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600 h-10"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        7 Days
                      </Button>
                      <Button
                        onClick={() => handleGeneratePlan(30)}
                        disabled={generatePlanMutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600 h-10"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        30 Days
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

{viewMode === 'browse' ? (
          isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : meals.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Search className="h-8 w-8 text-white/40" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No meals found</h3>
                <p className="text-white/60">Try adjusting your search or filter</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meals.map((meal: BreakfastMeal) => {
                const config = categoryConfig[meal.category];
                const CategoryIcon = config.icon;
                
                return (
                  <Card key={meal.id} className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                            <CategoryIcon className={`h-4 w-4 ${config.textColor}`} />
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                            onClick={() => handleEditClick(meal)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => setDeleteMeal(meal)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
          )
        ) : (
          mealPlan.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {planDuration}-Day Meal Plan
                  </h2>
                  <p className="text-white/60 text-sm mt-1">
                    {planCategoryFilter === 'all' ? 'All categories' : categoryConfig[planCategoryFilter as keyof typeof categoryConfig]?.label || planCategoryFilter}
                  </p>
                </div>
                <Button
                  onClick={handleRegeneratePlan}
                  disabled={generatePlanMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${generatePlanMutation.isPending ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>

              <div className="grid gap-3">
                {mealPlan.map((item) => {
                  const config = categoryConfig[item.meal.category];
                  const CategoryIcon = config.icon;
                  
                  return (
                    <Card key={item.day} className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">D{item.day}</span>
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-6 h-6 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                                <CategoryIcon className={`h-3 w-3 ${config.textColor}`} />
                              </div>
                              <h3 className="text-white font-semibold">{item.meal.name}</h3>
                            </div>
                            <p className="text-white/50 text-sm line-clamp-1">{item.meal.description || 'No description'}</p>
                          </div>

                          <div className="flex gap-4 text-center">
                            <div>
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Flame className="h-3 w-3 text-orange-400" />
                              </div>
                              <span className="text-white font-semibold text-sm">{Number(item.meal.calories).toFixed(0)}</span>
                              <p className="text-white/40 text-[10px]">kcal</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Dumbbell className="h-3 w-3 text-blue-400" />
                              </div>
                              <span className="text-white font-semibold text-sm">{Number(item.meal.protein).toFixed(1)}g</span>
                              <p className="text-white/40 text-[10px]">Protein</p>
                            </div>
                            <div>
                              <span className="text-amber-400 text-xs">🍞</span>
                              <span className="text-white font-semibold text-sm block">{Number(item.meal.carbs).toFixed(1)}g</span>
                              <p className="text-white/40 text-[10px]">Carbs</p>
                            </div>
                            <div>
                              <span className="text-purple-400 text-xs">🧈</span>
                              <span className="text-white font-semibold text-sm block">{Number(item.meal.fats).toFixed(1)}g</span>
                              <p className="text-white/40 text-[10px]">Fats</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )
        )}

        <Dialog open={!!editMeal} onOpenChange={() => setEditMeal(null)}>
          <DialogContent className="bg-[hsl(220,26%,14%)] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Meal</DialogTitle>
              <DialogDescription className="text-white/60">
                Update the meal details below
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="bg-white/5 border-white/10 min-h-[80px]"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="ingredients">Ingredients</Label>
                <Textarea
                  id="ingredients"
                  value={editFormData.ingredients}
                  onChange={(e) => setEditFormData({ ...editFormData, ingredients: e.target.value })}
                  className="bg-white/5 border-white/10 min-h-[80px]"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={editFormData.category} onValueChange={(v: 'veg' | 'eggetarian' | 'non-veg') => setEditFormData({ ...editFormData, category: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">
                      <span className="flex items-center gap-2"><Leaf className="h-4 w-4 text-green-500" /> Vegetarian</span>
                    </SelectItem>
                    <SelectItem value="eggetarian">
                      <span className="flex items-center gap-2"><Egg className="h-4 w-4 text-yellow-500" /> Eggetarian</span>
                    </SelectItem>
                    <SelectItem value="non-veg">
                      <span className="flex items-center gap-2"><Drumstick className="h-4 w-4 text-red-500" /> Non-Vegetarian</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="calories">Calories (kcal)</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={editFormData.calories}
                    onChange={(e) => setEditFormData({ ...editFormData, calories: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={editFormData.protein}
                    onChange={(e) => setEditFormData({ ...editFormData, protein: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={editFormData.carbs}
                    onChange={(e) => setEditFormData({ ...editFormData, carbs: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fats">Fats (g)</Label>
                  <Input
                    id="fats"
                    type="number"
                    value={editFormData.fats}
                    onChange={(e) => setEditFormData({ ...editFormData, fats: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  value={editFormData.imageUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditMeal(null)} className="text-white/60 hover:text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button 
                onClick={handleEditSubmit} 
                disabled={updateMealMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {updateMealMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteMeal} onOpenChange={() => setDeleteMeal(null)}>
          <AlertDialogContent className="bg-[hsl(220,26%,14%)] border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Meal</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Are you sure you want to delete <span className="text-white font-medium">"{deleteMeal?.name}"</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteMealMutation.isPending}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteMealMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
