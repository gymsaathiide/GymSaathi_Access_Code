import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Sunrise, Sun, Cookie, Moon, ArrowLeft, Pencil, Trash2, Search, X } from "lucide-react";

type MealType = "breakfast" | "lunch" | "snacks" | "dinner";

interface Meal {
  id: number;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  description?: string;
}

const mealTypeConfig = {
  breakfast: {
    title: "Breakfast",
    icon: Sunrise,
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  lunch: {
    title: "Lunch",
    icon: Sun,
    color: "from-yellow-500 to-amber-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  snacks: {
    title: "Snacks",
    icon: Cookie,
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  dinner: {
    title: "Dinner",
    icon: Moon,
    color: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
  },
};

export default function ManageMealsPage() {
  const [selectedType, setSelectedType] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meals = [], isLoading } = useQuery<Meal[]>({
    queryKey: ["meals", selectedType],
    queryFn: async () => {
      if (!selectedType) return [];
      const res = await fetch(`/api/meals/${selectedType}`);
      if (!res.ok) throw new Error("Failed to fetch meals");
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data.meals) return data.meals;
      return [];
    },
    enabled: !!selectedType,
  });

  const updateMutation = useMutation({
    mutationFn: async (meal: Meal) => {
      const res = await fetch(`/api/meals/${selectedType}/${meal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meal),
      });
      if (!res.ok) throw new Error("Failed to update meal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", selectedType] });
      toast({ title: "Meal updated successfully" });
      setIsEditDialogOpen(false);
      setEditingMeal(null);
    },
    onError: () => {
      toast({ title: "Failed to update meal", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mealId: number) => {
      const res = await fetch(`/api/meals/${selectedType}/${mealId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete meal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", selectedType] });
      toast({ title: "Meal deleted successfully" });
      setIsDeleteDialogOpen(false);
      setMealToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete meal", variant: "destructive" });
    },
  });

  const filteredMeals = meals.filter((meal) =>
    meal.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "veg":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "eggetarian":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "non-veg":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal({ ...meal });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (meal: Meal) => {
    setMealToDelete(meal);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateSubmit = () => {
    if (editingMeal) {
      updateMutation.mutate(editingMeal);
    }
  };

  const handleConfirmDelete = () => {
    if (mealToDelete) {
      deleteMutation.mutate(mealToDelete.id);
    }
  };

  if (!selectedType) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Meals</h1>
          <p className="text-white/60 mt-1">Select a meal category to view and manage meals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(mealTypeConfig) as MealType[]).map((type) => {
            const config = mealTypeConfig[type];
            const Icon = config.icon;
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 bg-white/5 border-white/10 hover:border-orange-500/50`}
                onClick={() => setSelectedType(type)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{config.title}</h3>
                  <p className="text-white/50 text-sm mt-1">Click to manage</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const config = mealTypeConfig[selectedType];
  const Icon = config.icon;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedType(null);
            setSearchQuery("");
          }}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{config.title} Meals</h1>
          <p className="text-white/60">{filteredMeals.length} meals available</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Search meals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {filteredMeals.map((meal) => (
              <Card key={meal.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{meal.name}</h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full border ${getCategoryBadgeColor(meal.category)}`}>
                        {meal.category}
                      </span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10"
                        onClick={() => handleEdit(meal)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/60 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(meal)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-orange-400 font-semibold">{meal.calories}</div>
                      <div className="text-white/40">kcal</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-cyan-400 font-semibold">{meal.protein}g</div>
                      <div className="text-white/40">protein</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-yellow-400 font-semibold">{meal.carbs}g</div>
                      <div className="text-white/40">carbs</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-pink-400 font-semibold">{meal.fats}g</div>
                      <div className="text-white/40">fats</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[hsl(220,26%,14%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Meal</DialogTitle>
          </DialogHeader>
          {editingMeal && (
            <div className="space-y-4">
              <div>
                <Label className="text-white/70">Name</Label>
                <Input
                  value={editingMeal.name}
                  onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Category</Label>
                <Select
                  value={editingMeal.category}
                  onValueChange={(value) => setEditingMeal({ ...editingMeal, category: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,26%,14%)] border-white/10">
                    <SelectItem value="veg" className="text-white hover:bg-white/10">Veg</SelectItem>
                    <SelectItem value="eggetarian" className="text-white hover:bg-white/10">Eggetarian</SelectItem>
                    <SelectItem value="non-veg" className="text-white hover:bg-white/10">Non-Veg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Calories</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingMeal.calories}
                    onChange={(e) => setEditingMeal({ ...editingMeal, calories: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Protein (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingMeal.protein}
                    onChange={(e) => setEditingMeal({ ...editingMeal, protein: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Carbs (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingMeal.carbs}
                    onChange={(e) => setEditingMeal({ ...editingMeal, carbs: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Fats (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingMeal.fats}
                    onChange={(e) => setEditingMeal({ ...editingMeal, fats: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSubmit}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[hsl(220,26%,14%)] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Meal</DialogTitle>
          </DialogHeader>
          <p className="text-white/70">
            Are you sure you want to delete "{mealToDelete?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
