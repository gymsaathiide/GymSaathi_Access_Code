import { useState, useMemo } from "react";
import { ArrowLeft, Plus, ChevronRight, Loader2, Search, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyNutrition, useLogFood, useDeleteMealLog, MealLogItem } from "@/hooks/useDailyNutrition";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodSearchResult {
  food_id: string;
  food_name: string;
  food_description: string;
  brand_name?: string;
}

interface FoodServing {
  serving_id: string;
  serving_description: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber?: number;
}

function getMealEmoji(mealType: MealType): string {
  const emojis: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  };
  return emojis[mealType] || '🍽️';
}

export default function DailyNutritionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [servings, setServings] = useState<FoodServing[]>([]);
  const [selectedServing, setSelectedServing] = useState<FoodServing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loadingServings, setLoadingServings] = useState(false);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [manualFood, setManualFood] = useState({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingDescription: ''
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: nutritionData, isLoading } = useDailyNutrition(selectedDate);
  const logFoodMutation = useLogFood();
  const deleteMealMutation = useDeleteMealLog();

  const { data: targetData } = useQuery({
    queryKey: ['nutrition-targets'],
    queryFn: async () => {
      const response = await fetch('/api/diet-planner/nutrition-targets', {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    }
  });

  const targets = targetData || {
    calories: 2000,
    protein: 120,
    carbs: 200,
    fats: 65
  };

  const dailyTotals = nutritionData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const byMeal = nutritionData?.byMeal || {
    breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
    lunch: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
    dinner: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
    snack: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
  };

  const searchFoods = async () => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search both custom meals and FatSecret
      const [customResponse, fatsecretResponse] = await Promise.all([
        fetch(`/api/diet-planner/search-custom-meals?query=${encodeURIComponent(debouncedSearch)}`, {
          credentials: 'include'
        }),
        fetch(`/api/diet-planner/food-search?query=${encodeURIComponent(debouncedSearch)}`, {
          credentials: 'include'
        })
      ]);
      
      const customMeals = customResponse.ok ? await customResponse.json() : { meals: [] };
      const fatsecretData = fatsecretResponse.ok ? await fatsecretResponse.json() : { foods: [] };
      
      // Combine results, prioritizing custom meals
      const combined = [
        ...(customMeals.meals || []).map((meal: any) => ({
          ...meal,
          source: 'custom',
          food_id: `custom-${meal.id}`,
          food_name: meal.name,
          food_description: `${meal.calories} kcal - P:${meal.protein}g C:${meal.carbs}g F:${meal.fats}g`
        })),
        ...(fatsecretData.foods || []).map((food: any) => ({
          ...food,
          source: 'fatsecret'
        }))
      ];
      
      setSearchResults(combined);
    } catch (error) {
      console.error('Error searching foods:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useMemo(() => {
    searchFoods();
  }, [debouncedSearch]);

  const selectFood = async (food: any) => {
    setSelectedFood(food);
    setLoadingServings(true);
    
    try {
      // Handle custom meals differently
      if (food.source === 'custom') {
        const serving = {
          serving_id: 'custom-serving',
          serving_description: '1 serving',
          calories: parseFloat(food.calories),
          protein: parseFloat(food.protein),
          carbohydrate: parseFloat(food.carbs),
          fat: parseFloat(food.fats),
          fiber: parseFloat(food.fiber || 0)
        };
        setServings([serving]);
        setSelectedServing(serving);
      } else {
        // FatSecret food
        const response = await fetch(`/api/diet-planner/food-details/${food.food_id}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setServings(data.servings || []);
          if (data.servings?.length > 0) {
            setSelectedServing(data.servings[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching food details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load food details',
        variant: 'destructive'
      });
    } finally {
      setLoadingServings(false);
    }
  };

  const handleAddFood = async () => {
    if (manualEntryMode) {
      if (!manualFood.name || !manualFood.calories) {
        toast({
          title: 'Missing Info',
          description: 'Please enter food name and calories',
          variant: 'destructive'
        });
        return;
      }

      try {
        await logFoodMutation.mutateAsync({
          mealType: selectedMealType,
          logDate: selectedDate,
          source: 'manual',
          foodName: manualFood.name,
          servingDescription: manualFood.servingDescription || '1 serving',
          macros: {
            calories: manualFood.calories,
            protein: manualFood.protein,
            carbs: manualFood.carbs,
            fat: manualFood.fat
          },
          quantity: 1
        });

        toast({
          title: 'Food Logged!',
          description: `${manualFood.name} added to ${selectedMealType}`
        });

        resetAddMealDialog();
      } catch (error) {
        console.error('Error logging food:', error);
        toast({
          title: 'Error',
          description: 'Failed to log food',
          variant: 'destructive'
        });
      }
    } else {
      if (!selectedFood || !selectedServing) {
        toast({
          title: 'Missing Info',
          description: 'Please select a food and serving size',
          variant: 'destructive'
        });
        return;
      }

      try {
        await logFoodMutation.mutateAsync({
          mealType: selectedMealType,
          logDate: selectedDate,
          source: selectedFood.source === 'custom' ? 'custom' : 'fatsecret',
          fatsecretFoodId: selectedFood.source === 'custom' ? null : selectedFood.food_id,
          servingId: selectedServing.serving_id,
          foodName: selectedFood.food_name,
          brand: selectedFood.brand_name,
          servingDescription: selectedServing.serving_description,
          macros: {
            calories: selectedServing.calories,
            protein: selectedServing.protein,
            carbs: selectedServing.carbohydrate,
            fat: selectedServing.fat,
            fiber: selectedServing.fiber
          },
          quantity,
          customMealId: selectedFood.source === 'custom' ? selectedFood.id : null
        });

        toast({
          title: 'Food Logged!',
          description: `${selectedFood.food_name} added to ${selectedMealType}`
        });

        resetAddMealDialog();
      } catch (error) {
        console.error('Error logging food:', error);
        toast({
          title: 'Error',
          description: 'Failed to log food',
          variant: 'destructive'
        });
      }
    }
  };

  const handleDeleteMealLog = async (logId: string) => {
    try {
      await deleteMealMutation.mutateAsync({ logId, date: selectedDate });
      toast({
        title: 'Deleted',
        description: 'Food removed from log'
      });
    } catch (error) {
      console.error('Error deleting meal log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete food',
        variant: 'destructive'
      });
    }
  };

  const resetAddMealDialog = () => {
    setAddMealOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setServings([]);
    setSelectedServing(null);
    setQuantity(1);
    setManualEntryMode(false);
    setManualFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0, servingDescription: '' });
  };

  const openAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setAddMealOpen(true);
  };

  const calorieProgress = Math.min((dailyTotals.calories / targets.calories) * 100, 100);
  const proteinProgress = Math.min((dailyTotals.protein / targets.protein) * 100, 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/member">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Daily Nutrition</h1>
            <p className="text-muted-foreground text-sm">Track your meals and macros</p>
          </div>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Today's Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{Math.round(dailyTotals.calories)}</p>
              <p className="text-xs text-muted-foreground">/ {targets.calories} kcal</p>
              <Progress value={calorieProgress} className="h-2 mt-2" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{Math.round(dailyTotals.protein)}g</p>
              <p className="text-xs text-muted-foreground">/ {targets.protein}g protein</p>
              <Progress value={proteinProgress} className="h-2 mt-2" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{Math.round(dailyTotals.carbs)}g</p>
              <p className="text-xs text-muted-foreground">/ {targets.carbs}g carbs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{Math.round(dailyTotals.fat)}g</p>
              <p className="text-xs text-muted-foreground">/ {targets.fats}g fats</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => {
          const mealData = byMeal[mealType];
          return (
            <Card key={mealType}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{getMealEmoji(mealType)}</span>
                    <span className="capitalize">{mealType}</span>
                    {mealData.calories > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {Math.round(mealData.calories)} kcal
                      </Badge>
                    )}
                  </CardTitle>
                  <Button size="sm" onClick={() => openAddMeal(mealType)} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Add Food
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {mealData.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No foods logged yet. Click "Add Food" to start tracking.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mealData.items.map((item: MealLogItem) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{item.user_food?.name || 'Unknown Food'}</p>
                          <div className="flex gap-3 text-sm text-muted-foreground">
                            <span>{item.calories} kcal</span>
                            <span>P: {item.protein}g</span>
                            <span>C: {item.carbs}g</span>
                            <span>F: {item.fat}g</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMealLog(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={addMealOpen} onOpenChange={setAddMealOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getMealEmoji(selectedMealType)}</span>
              Add to {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" onClick={() => setManualEntryMode(false)}>Search Food</TabsTrigger>
              <TabsTrigger value="manual" onClick={() => setManualEntryMode(true)}>Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4 mt-4">
              {!selectedFood ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for food..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {searchResults.map((food: any) => (
                        <button
                          key={food.food_id}
                          onClick={() => selectFood(food)}
                          className="w-full text-left p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-medium flex-1">{food.food_name}</p>
                            {food.source === 'custom' && (
                              <Badge variant="secondary" className="text-xs">Custom</Badge>
                            )}
                          </div>
                          {food.brand_name && (
                            <p className="text-xs text-muted-foreground">{food.brand_name}</p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-1">{food.food_description}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No results found. Try a different search term or use manual entry.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{selectedFood.food_name}</p>
                      {selectedFood.brand_name && (
                        <p className="text-sm text-muted-foreground">{selectedFood.brand_name}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFood(null);
                        setServings([]);
                        setSelectedServing(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {loadingServings ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Serving Size</Label>
                        <Select
                          value={selectedServing?.serving_id}
                          onValueChange={(id) => {
                            const serving = servings.find(s => s.serving_id === id);
                            setSelectedServing(serving || null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select serving size" />
                          </SelectTrigger>
                          <SelectContent>
                            {servings.map((serving) => (
                              <SelectItem key={serving.serving_id} value={serving.serving_id}>
                                {serving.serving_description} ({serving.calories} kcal)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={quantity}
                          onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                        />
                      </div>

                      {selectedServing && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Nutrition (x{quantity}):</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Calories: {Math.round(selectedServing.calories * quantity)} kcal</div>
                            <div>Protein: {Math.round(selectedServing.protein * quantity)}g</div>
                            <div>Carbs: {Math.round(selectedServing.carbohydrate * quantity)}g</div>
                            <div>Fat: {Math.round(selectedServing.fat * quantity)}g</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Food Name</Label>
                <Input
                  placeholder="e.g., Homemade Dal"
                  value={manualFood.name}
                  onChange={(e) => setManualFood({ ...manualFood, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Serving Description</Label>
                <Input
                  placeholder="e.g., 1 bowl, 100g"
                  value={manualFood.servingDescription}
                  onChange={(e) => setManualFood({ ...manualFood, servingDescription: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Calories (kcal)</Label>
                  <Input
                    type="number"
                    value={manualFood.calories || ''}
                    onChange={(e) => setManualFood({ ...manualFood, calories: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    value={manualFood.protein || ''}
                    onChange={(e) => setManualFood({ ...manualFood, protein: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carbs (g)</Label>
                  <Input
                    type="number"
                    value={manualFood.carbs || ''}
                    onChange={(e) => setManualFood({ ...manualFood, carbs: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fat (g)</Label>
                  <Input
                    type="number"
                    value={manualFood.fat || ''}
                    onChange={(e) => setManualFood({ ...manualFood, fat: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={resetAddMealDialog}>Cancel</Button>
            <Button 
              onClick={handleAddFood}
              disabled={logFoodMutation.isPending}
            >
              {logFoodMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Add Food'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
