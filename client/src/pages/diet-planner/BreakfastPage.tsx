import { useState } from "react";
import { ArrowLeft, Coffee, X, Leaf, Egg, Drumstick, Flame, Dumbbell, Calendar, RefreshCw, Edit, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [editingMeal, setEditingMeal] = useState<BreakfastMeal | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    ingredients: '',
    protein: '',
    carbs: '',
    fats: '',
    calories: '',
    category: '' as 'veg' | 'eggetarian' | 'non-veg',
    imageUrl: ''
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState({
    name: '',
    description: '',
    ingredients: '',
    protein: '',
    carbs: '',
    fats: '',
    calories: '',
    category: 'veg' as 'veg' | 'eggetarian' | 'non-veg',
    imageUrl: ''
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
    onSuccess: (data, variables) => {
      setActivePlan({ duration: variables.duration, category: variables.category, meals: data.plan });
      toast({ title: `${variables.duration}-day meal plan generated!`, description: `Showing ${variables.duration} random breakfast meals` });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to generate meal plan', description: error.message, variant: 'destructive' });
    },
  });

  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      // Helper to safely parse and clamp numeric values (non-negative)
      const safeNum = (val: string): number => {
        const num = parseFloat(val);
        return isNaN(num) || num < 0 ? 0 : num;
      };

      // Convert string values to numbers and match backend schema (snake_case)
      const payload = {
        name: data.name,
        description: data.description,
        ingredients: data.ingredients,
        protein: safeNum(data.protein),
        carbs: safeNum(data.carbs),
        fats: safeNum(data.fats),
        calories: safeNum(data.calories),
        category: data.category,
        image_url: data.imageUrl || null,
      };
      
      const res = await fetch(`/api/meals/breakfast/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update meal');
      return res.json();
    },
    onSuccess: (response) => {
      if (activePlan) {
        const updatedMeals = activePlan.meals.map(item => 
          item.meal.id === response.meal.id ? { ...item, meal: response.meal } : item
        );
        setActivePlan({ ...activePlan, meals: updatedMeals });
      }
      setEditingMeal(null);
      toast({ title: 'Meal updated', description: 'Changes saved successfully' });
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
    onSuccess: (_, deletedId) => {
      if (activePlan) {
        const updatedMeals = activePlan.meals.filter(item => item.meal.id !== deletedId);
        if (updatedMeals.length === 0) {
          setActivePlan(null);
          toast({ title: 'Plan cleared', description: 'Last meal deleted - plan is now empty' });
        } else {
          setActivePlan({ ...activePlan, meals: updatedMeals });
          toast({ title: 'Meal deleted', description: 'Removed from plan' });
        }
      }
      setDeletingMealId(null);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete meal', description: error.message, variant: 'destructive' });
      setDeletingMealId(null);
    },
  });

  const createMealMutation = useMutation({
    mutationFn: async (data: typeof addForm) => {
      // Helper to safely parse and clamp numeric values (non-negative)
      const safeNum = (val: string): number => {
        const num = parseFloat(val);
        return isNaN(num) || num < 0 ? 0 : num;
      };

      const payload = {
        name: data.name,
        description: data.description || null,
        ingredients: data.ingredients || null,
        protein: safeNum(data.protein),
        carbs: safeNum(data.carbs),
        fats: safeNum(data.fats),
        calories: safeNum(data.calories),
        category: data.category,
        image_url: data.imageUrl || null,
      };
      
      const res = await fetch('/api/meals/breakfast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create meal');
      return res.json();
    },
    onSuccess: () => {
      setShowAddDialog(false);
      setAddForm({
        name: '',
        description: '',
        ingredients: '',
        protein: '',
        carbs: '',
        fats: '',
        calories: '',
        category: 'veg',
        imageUrl: ''
      });
      toast({ title: 'Breakfast added!', description: 'New meal saved to database' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add meal', description: error.message, variant: 'destructive' });
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

  const handleEditClick = (meal: BreakfastMeal) => {
    setEditingMeal(meal);
    setEditForm({
      name: meal.name,
      description: meal.description || '',
      ingredients: meal.ingredients || '',
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      calories: meal.calories,
      category: meal.category,
      imageUrl: meal.image_url || ''
    });
  };

  const handleUpdateMeal = () => {
    if (!editingMeal) return;
    updateMealMutation.mutate({ id: editingMeal.id, data: editForm });
  };

  const handleDeleteClick = (mealId: string) => {
    setDeletingMealId(mealId);
  };

  const handleConfirmDelete = () => {
    if (deletingMealId) {
      deleteMealMutation.mutate(deletingMealId);
    }
  };

  const handleAddMeal = () => {
    if (!addForm.name || !addForm.category) {
      toast({ title: 'Missing fields', description: 'Name and category are required', variant: 'destructive' });
      return;
    }
    createMealMutation.mutate(addForm);
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
          {/* Category Toggle Switches - Horizontal row on all screens */}
          <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-4">
            {/* Veg Toggle */}
            <label className="relative flex flex-col sm:flex-row items-center cursor-pointer gap-1 sm:gap-0">
              <input 
                className="sr-only peer" 
                type="checkbox" 
                checked={categoryFilter === 'veg'}
                onChange={() => setCategoryFilter(categoryFilter === 'veg' ? 'all' : 'veg')}
              />
              <div className={`w-12 h-6 sm:w-16 sm:h-8 rounded-full transition-all duration-500 flex items-center px-0.5 sm:px-1 ${
                categoryFilter === 'veg' 
                  ? 'bg-gradient-to-r from-green-400 to-green-600' 
                  : 'bg-[hsl(0,0%,15%)] border border-white/10'
              }`}>
                <div className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white flex items-center justify-center transition-all duration-500 shadow-md ${
                  categoryFilter === 'veg' ? 'translate-x-5 sm:translate-x-8' : 'translate-x-0'
                }`}>
                  <Leaf className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${categoryFilter === 'veg' ? 'text-green-500' : 'text-gray-400'}`} />
                </div>
              </div>
              <span className={`sm:ml-2 text-[10px] sm:text-sm font-medium transition-colors ${categoryFilter === 'veg' ? 'text-green-400' : 'text-white/50'}`}>
                Veg
              </span>
            </label>

            {/* Eggetarian Toggle */}
            <label className="relative flex flex-col sm:flex-row items-center cursor-pointer gap-1 sm:gap-0">
              <input 
                className="sr-only peer" 
                type="checkbox" 
                checked={categoryFilter === 'eggetarian'}
                onChange={() => setCategoryFilter(categoryFilter === 'eggetarian' ? 'all' : 'eggetarian')}
              />
              <div className={`w-12 h-6 sm:w-16 sm:h-8 rounded-full transition-all duration-500 flex items-center px-0.5 sm:px-1 ${
                categoryFilter === 'eggetarian' 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                  : 'bg-[hsl(0,0%,15%)] border border-white/10'
              }`}>
                <div className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white flex items-center justify-center transition-all duration-500 shadow-md text-xs sm:text-base ${
                  categoryFilter === 'eggetarian' ? 'translate-x-5 sm:translate-x-8' : 'translate-x-0'
                }`}>
                  {categoryFilter === 'eggetarian' ? '🍳' : '🥚'}
                </div>
              </div>
              <span className={`sm:ml-2 text-[10px] sm:text-sm font-medium transition-colors ${categoryFilter === 'eggetarian' ? 'text-yellow-400' : 'text-white/50'}`}>
                Egg
              </span>
            </label>

            {/* Non-Veg Toggle */}
            <label className="relative flex flex-col sm:flex-row items-center cursor-pointer gap-1 sm:gap-0">
              <input 
                className="sr-only peer" 
                type="checkbox" 
                checked={categoryFilter === 'non-veg'}
                onChange={() => setCategoryFilter(categoryFilter === 'non-veg' ? 'all' : 'non-veg')}
              />
              <div className={`w-12 h-6 sm:w-16 sm:h-8 rounded-full transition-all duration-500 flex items-center px-0.5 sm:px-1 ${
                categoryFilter === 'non-veg' 
                  ? 'bg-gradient-to-r from-red-400 to-red-600' 
                  : 'bg-[hsl(0,0%,15%)] border border-white/10'
              }`}>
                <div className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white flex items-center justify-center transition-all duration-500 shadow-md ${
                  categoryFilter === 'non-veg' ? 'translate-x-5 sm:translate-x-8' : 'translate-x-0'
                }`}>
                  <Drumstick className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${categoryFilter === 'non-veg' ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
              </div>
              <span className={`sm:ml-2 text-[10px] sm:text-sm font-medium transition-colors ${categoryFilter === 'non-veg' ? 'text-red-400' : 'text-white/50'}`}>
                Non-Veg
              </span>
            </label>

            {/* All Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCategoryFilter('all')}
              className={`h-auto py-1 px-2 sm:py-2 sm:px-3 text-[10px] sm:text-sm ${categoryFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              All
            </Button>
          </div>

          {/* Action Buttons - Grid on mobile, flex on larger screens */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
            <Button
              onClick={() => handleGeneratePlan(7)}
              disabled={generatePlanMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              7 Days
            </Button>
            <Button
              onClick={() => handleGeneratePlan(30)}
              disabled={generatePlanMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              30 Days
            </Button>
            
            {activePlan && (
              <>
                <Button
                  onClick={handleRegeneratePlan}
                  disabled={generatePlanMutation.isPending}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm h-9 sm:h-10"
                >
                  <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${generatePlanMutation.isPending ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  onClick={handleClearPlan}
                  variant="ghost"
                  className="text-white/60 hover:text-white hover:bg-white/10 text-xs sm:text-sm h-9 sm:h-10"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Clear
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-green-500 hover:bg-green-600 col-span-2 sm:col-span-1 sm:ml-auto text-xs sm:text-sm h-9 sm:h-10"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Add Breakfast
            </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {activePlan.meals.map((item, index) => {
            const meal = item.meal;
              const config = categoryConfig[meal.category];
              const CategoryIcon = config.icon;
              
              // Category gradient colors matching app theme
              const categoryGradients = {
                veg: 'from-green-600 to-green-400',
                eggetarian: 'from-yellow-600 to-amber-400',
                'non-veg': 'from-red-600 to-red-400'
              };
              const gradient = categoryGradients[meal.category] || categoryGradients.eggetarian;
              
              return (
                <div 
                  key={`${meal.id}-${index}`} 
                  className="w-full rounded-[20px] bg-[#1b233d] p-[5px] overflow-hidden shadow-[0_7px_20px_rgba(100,100,111,0.2)] transform transition-transform duration-500 hover:scale-105 group"
                >
                  {/* Top section with gradient */}
                  <div className={`h-[120px] rounded-[15px] flex flex-col bg-gradient-to-tr ${gradient} relative overflow-hidden`}>
                    {/* Skewed bar */}
                    <div className="h-[30px] w-[100px] bg-[#1b233d] rounded-br-[10px] -skew-x-[40deg] origin-left" />
                    
                    {/* Day badge and category */}
                    <div className="absolute top-0 left-0 w-full h-[30px] flex items-center justify-between px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg pl-2">D{item.day}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-[#1b233d]" />
                        <span className="text-[#1b233d] text-xs font-semibold">{config.label}</span>
                      </div>
                    </div>
                    
                    {/* Meal name centered */}
                    <div className="flex-1 flex items-center justify-center px-4">
                      <h3 className="text-white font-bold text-center line-clamp-2 text-base leading-tight">{meal.name}</h3>
                    </div>
                    
                    {/* Edit/Delete buttons - appear on hover */}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => handleEditClick(meal)}
                        className="p-1.5 bg-[#1b233d]/80 hover:bg-[#1b233d] text-white rounded-lg transition-colors"
                        title="Edit meal"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(meal.id)}
                        className="p-1.5 bg-[#1b233d]/80 hover:bg-[#1b233d] text-white rounded-lg transition-colors"
                        title="Delete meal"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom section */}
                  <div className="mt-3 px-3 pb-3">
                    {/* Description */}
                    <p className="text-[rgba(170,222,243,0.72)] text-xs text-center line-clamp-2 mb-3">
                      {meal.description || 'Delicious breakfast meal'}
                    </p>
                    
                    {/* Ingredients */}
                    {meal.ingredients && (() => {
                      const ingredientsList = meal.ingredients.split(',').map(i => i.trim()).filter(i => i);
                      const isExpanded = expandedIngredients.has(meal.id);
                      const displayedIngredients = isExpanded ? ingredientsList : ingredientsList.slice(0, 3);
                      const hasMore = ingredientsList.length > 3;
                      
                      return (
                        <div className="mb-3">
                          <p className="text-[rgba(170,222,243,0.5)] text-[10px] mb-1.5">Ingredients</p>
                          <div className="flex flex-wrap gap-1">
                            {displayedIngredients.map((ingredient, idx) => (
                              <span 
                                key={idx} 
                                className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[rgba(170,222,243,0.9)]"
                              >
                                {ingredient}
                              </span>
                            ))}
                            {hasMore && (
                              <span 
                                className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-colors font-medium bg-gradient-to-r ${gradient} text-white`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedIngredients(prev => {
                                    const newSet = new Set(prev);
                                    if (isExpanded) {
                                      newSet.delete(meal.id);
                                    } else {
                                      newSet.add(meal.id);
                                    }
                                    return newSet;
                                  });
                                }}
                              >
                                {isExpanded ? '− less' : `+${ingredientsList.length - 3}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Nutrition Stats */}
                    <div className="flex justify-between border-t border-white/10 pt-3">
                      <div className="flex-1 text-center px-1 text-[rgba(170,222,243,0.72)]">
                        <span className="block text-sm font-semibold text-white">{Number(meal.calories).toFixed(0)}</span>
                        <span className="block text-[9px]">kcal</span>
                      </div>
                      <div className="flex-1 text-center px-1 text-[rgba(170,222,243,0.72)] border-x border-white/10">
                        <span className="block text-sm font-semibold text-white">{Number(meal.protein).toFixed(1)}g</span>
                        <span className="block text-[9px]">Protein</span>
                      </div>
                      <div className="flex-1 text-center px-1 text-[rgba(170,222,243,0.72)] border-r border-white/10">
                        <span className="block text-sm font-semibold text-white">{Number(meal.carbs).toFixed(1)}g</span>
                        <span className="block text-[9px]">Carbs</span>
                      </div>
                      <div className="flex-1 text-center px-1 text-[rgba(170,222,243,0.72)]">
                        <span className="block text-sm font-semibold text-white">{Number(meal.fats).toFixed(1)}g</span>
                        <span className="block text-[9px]">Fats</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Meal Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={(open) => !open && setEditingMeal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Breakfast Meal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Meal Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter meal name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value as 'veg' | 'eggetarian' | 'non-veg' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Veg</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="non-veg">Non-Veg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ingredients">Ingredients</Label>
              <Textarea
                id="ingredients"
                value={editForm.ingredients}
                onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })}
                placeholder="Enter ingredients"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="calories">Calories (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  step="0.01"
                  value={editForm.calories}
                  onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.01"
                  value={editForm.protein}
                  onChange={(e) => setEditForm({ ...editForm, protein: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.01"
                  value={editForm.carbs}
                  onChange={(e) => setEditForm({ ...editForm, carbs: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fats">Fats (g)</Label>
                <Input
                  id="fats"
                  type="number"
                  step="0.01"
                  value={editForm.fats}
                  onChange={(e) => setEditForm({ ...editForm, fats: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input
                id="imageUrl"
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingMeal(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMeal} disabled={updateMealMutation.isPending}>
              {updateMealMutation.isPending ? 'Updating...' : 'Update Meal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMealId} onOpenChange={(open) => !open && setDeletingMealId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this meal from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMealId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMealMutation.isPending}
            >
              {deleteMealMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Breakfast Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Breakfast Meal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Meal Name *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Enter meal name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-category">Category *</Label>
              <Select value={addForm.category} onValueChange={(value) => setAddForm({ ...addForm, category: value as 'veg' | 'eggetarian' | 'non-veg' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Veg</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="non-veg">Non-Veg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-ingredients">Ingredients</Label>
              <Textarea
                id="add-ingredients"
                value={addForm.ingredients}
                onChange={(e) => setAddForm({ ...addForm, ingredients: e.target.value })}
                placeholder="Enter ingredients"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-calories">Calories (kcal)</Label>
                <Input
                  id="add-calories"
                  type="number"
                  step="0.01"
                  value={addForm.calories}
                  onChange={(e) => setAddForm({ ...addForm, calories: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-protein">Protein (g)</Label>
                <Input
                  id="add-protein"
                  type="number"
                  step="0.01"
                  value={addForm.protein}
                  onChange={(e) => setAddForm({ ...addForm, protein: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-carbs">Carbs (g)</Label>
                <Input
                  id="add-carbs"
                  type="number"
                  step="0.01"
                  value={addForm.carbs}
                  onChange={(e) => setAddForm({ ...addForm, carbs: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-fats">Fats (g)</Label>
                <Input
                  id="add-fats"
                  type="number"
                  step="0.01"
                  value={addForm.fats}
                  onChange={(e) => setAddForm({ ...addForm, fats: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-imageUrl">Image URL (optional)</Label>
              <Input
                id="add-imageUrl"
                value={addForm.imageUrl}
                onChange={(e) => setAddForm({ ...addForm, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMeal} disabled={createMealMutation.isPending} className="bg-green-500 hover:bg-green-600">
              {createMealMutation.isPending ? 'Adding...' : 'Add Breakfast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
