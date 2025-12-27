import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Sunrise, Sun, Cookie, Moon, ArrowLeft, Pencil, Trash2, Search, X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

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
  ingredients?: string;
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

interface ImportResult {
  successCount: number;
  errorCount: number;
  totalProcessed: number;
  errors: string[];
}

export default function ManageMealsPage() {
  const [selectedType, setSelectedType] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedMeals, setParsedMeals] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const convertCategory = (category: string): string | null => {
    const normalized = category?.toLowerCase().trim() || '';
    
    if (normalized === 'non-veg' || normalized === 'non-vegetarian' || normalized === 'nonveg' || normalized === 'non vegetarian') {
      return 'non-veg';
    }
    if (normalized === 'eggetarian' || normalized === 'egg' || normalized === 'eggitarian') {
      return 'eggetarian';
    }
    if (normalized === 'veg' || normalized === 'vegetarian' || normalized === 'v') {
      return 'veg';
    }
    return null;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast({ title: "Excel file is empty or has no data rows", variant: "destructive" });
          return;
        }

        const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim().replace(/\s+/g, ' '));
        
        const findColumnIndex = (patterns: string[]): number => {
          return headers.findIndex(h => patterns.some(p => h.includes(p)));
        };

        const nameIdx = findColumnIndex(['meals name', 'meal name', 'name']);
        const descIdx = findColumnIndex(['description', 'desc']);
        const ingredientsIdx = findColumnIndex(['ingredients', 'ingredient']);
        const proteinIdx = findColumnIndex(['protein']);
        const carbsIdx = findColumnIndex(['carbs', 'carbohydrates']);
        const fatsIdx = findColumnIndex(['fats', 'fat']);
        const caloriesIdx = findColumnIndex(['calories', 'calorie', 'kcal']);
        const categoryIdx = findColumnIndex(['category', 'type']);

        if (nameIdx === -1) {
          toast({ title: "Missing required column", description: "Could not find 'Meals Name' or 'Name' column in Excel", variant: "destructive" });
          return;
        }

        if (categoryIdx === -1) {
          toast({ title: "Missing required column", description: "Could not find 'Category' column in Excel", variant: "destructive" });
          return;
        }

        const mealsToImport: any[] = [];
        const parseErrors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const name = String(row[nameIdx] || '').trim();
          if (!name) continue;

          const rawCategory = String(row[categoryIdx] || '').trim();
          const category = convertCategory(rawCategory);
          
          if (!category) {
            parseErrors.push(`Row ${i + 1}: Invalid category "${rawCategory}" for "${name}". Must be Vegetarian, Eggetarian, or Non-Vegetarian.`);
            continue;
          }

          const meal = {
            name,
            description: descIdx >= 0 ? String(row[descIdx] || '').trim() : '',
            ingredients: ingredientsIdx >= 0 ? String(row[ingredientsIdx] || '').trim() : '',
            protein: proteinIdx >= 0 ? (parseFloat(row[proteinIdx]) || 0) : 0,
            carbs: carbsIdx >= 0 ? (parseFloat(row[carbsIdx]) || 0) : 0,
            fats: fatsIdx >= 0 ? (parseFloat(row[fatsIdx]) || 0) : 0,
            calories: caloriesIdx >= 0 ? (parseFloat(row[caloriesIdx]) || 0) : 0,
            category,
          };

          mealsToImport.push(meal);
        }

        if (parseErrors.length > 0 && mealsToImport.length === 0) {
          toast({ 
            title: "No valid meals found", 
            description: `${parseErrors.length} rows had errors. Check category values.`, 
            variant: "destructive" 
          });
          return;
        }

        if (parseErrors.length > 0) {
          toast({ 
            title: `${parseErrors.length} rows skipped`, 
            description: "Some rows had invalid categories and will not be imported.",
            variant: "destructive"
          });
        }

        setParsedMeals(mealsToImport);
        setImportResult(null);
        setIsImportDialogOpen(true);
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        toast({ title: "Failed to parse Excel file", description: error.message, variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportMeals = async () => {
    if (parsedMeals.length === 0 || !selectedType) return;

    setIsImporting(true);
    try {
      const res = await fetch(`/api/meals/${selectedType}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals: parsedMeals }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await res.json();
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["meals", selectedType] });
      toast({ 
        title: `Import complete: ${result.successCount} meals added`,
        description: result.errorCount > 0 ? `${result.errorCount} failed` : undefined,
      });
    } catch (error: any) {
      console.error('Error importing meals:', error);
      toast({ title: "Failed to import meals", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
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
      <div className="flex items-center justify-between">
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
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx,.xls"
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-2"
        >
          <Upload className="w-4 h-4" />
          Import Excel
        </Button>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pr-4">
            {/* Veg Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-green-500/30">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <h3 className="font-semibold text-green-400">Vegetarian</h3>
                <span className="text-white/40 text-sm">({filteredMeals.filter(m => m.category === 'veg').length})</span>
              </div>
              {filteredMeals.filter(m => m.category === 'veg').map((meal) => (
                <Card key={meal.id} className="bg-white/5 border-green-500/20 hover:border-green-500/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white text-sm leading-tight flex-1 min-w-0 pr-2">{meal.name}</h4>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleEdit(meal)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(meal)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-white/60">
                      <span className="text-orange-400">{meal.calories}kcal</span>
                      <span>P:{meal.protein}g</span>
                      <span>C:{meal.carbs}g</span>
                      <span>F:{meal.fats}g</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Eggetarian Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-yellow-500/30">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <h3 className="font-semibold text-yellow-400">Eggetarian</h3>
                <span className="text-white/40 text-sm">({filteredMeals.filter(m => m.category === 'eggetarian').length})</span>
              </div>
              {filteredMeals.filter(m => m.category === 'eggetarian').map((meal) => (
                <Card key={meal.id} className="bg-white/5 border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white text-sm leading-tight flex-1 min-w-0 pr-2">{meal.name}</h4>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleEdit(meal)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(meal)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-white/60">
                      <span className="text-orange-400">{meal.calories}kcal</span>
                      <span>P:{meal.protein}g</span>
                      <span>C:{meal.carbs}g</span>
                      <span>F:{meal.fats}g</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Non-Veg Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-red-500/30">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <h3 className="font-semibold text-red-400">Non-Vegetarian</h3>
                <span className="text-white/40 text-sm">({filteredMeals.filter(m => m.category === 'non-veg').length})</span>
              </div>
              {filteredMeals.filter(m => m.category === 'non-veg').map((meal) => (
                <Card key={meal.id} className="bg-white/5 border-red-500/20 hover:border-red-500/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white text-sm leading-tight flex-1 min-w-0 pr-2">{meal.name}</h4>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleEdit(meal)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(meal)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-white/60">
                      <span className="text-orange-400">{meal.calories}kcal</span>
                      <span>P:{meal.protein}g</span>
                      <span>C:{meal.carbs}g</span>
                      <span>F:{meal.fats}g</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[hsl(220,26%,14%)] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
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
                <Label className="text-white/70">Description</Label>
                <Input
                  value={editingMeal.description || ''}
                  onChange={(e) => setEditingMeal({ ...editingMeal, description: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Brief description of the meal"
                />
              </div>
              <div>
                <Label className="text-white/70">Ingredients</Label>
                <textarea
                  value={editingMeal.ingredients || ''}
                  onChange={(e) => setEditingMeal({ ...editingMeal, ingredients: e.target.value })}
                  className="w-full min-h-[80px] px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="List of ingredients with quantities"
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

      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setParsedMeals([]);
          setImportResult(null);
        }
      }}>
        <DialogContent className="bg-[hsl(220,26%,14%)] border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Import {selectedType === 'breakfast' ? 'Breakfast' : selectedType === 'lunch' ? 'Lunch' : selectedType === 'dinner' ? 'Dinner' : 'Snacks'} Meals from Excel
            </DialogTitle>
          </DialogHeader>
          
          {!importResult ? (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="font-medium text-white mb-2">Ready to Import</h4>
                <p className="text-white/60 text-sm">
                  Found <span className="text-emerald-400 font-semibold">{parsedMeals.length}</span> meals in the Excel file.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-white text-sm">Preview (first 5 meals):</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {parsedMeals.slice(0, 5).map((meal, idx) => (
                    <div key={idx} className="bg-white/5 rounded p-2 text-sm border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium truncate flex-1">{meal.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          meal.category === 'veg' ? 'bg-green-500/20 text-green-400' :
                          meal.category === 'eggetarian' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {meal.category}
                        </span>
                      </div>
                      <div className="text-white/50 text-xs mt-1">
                        {meal.calories} kcal | P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g
                      </div>
                    </div>
                  ))}
                  {parsedMeals.length > 5 && (
                    <p className="text-white/40 text-xs text-center py-1">
                      ... and {parsedMeals.length - 5} more meals
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 border ${
                importResult.errorCount === 0 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.errorCount === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  )}
                  <h4 className="font-medium text-white">Import Complete</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total processed:</span>
                    <span className="text-white">{importResult.totalProcessed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Successfully added:</span>
                    <span className="text-emerald-400">{importResult.successCount}</span>
                  </div>
                  {importResult.errorCount > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-white/60">Failed:</span>
                      <span className="text-red-400">{importResult.errorCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-white text-sm">
                    Errors ({importResult.errorCount > 10 ? `showing 10 of ${importResult.errorCount}` : importResult.errors.length}):
                  </h4>
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20 max-h-32 overflow-y-auto">
                    {importResult.errors.map((error, idx) => (
                      <p key={idx} className="text-red-400 text-xs">{error}</p>
                    ))}
                    {importResult.errorCount > 10 && (
                      <p className="text-red-300 text-xs mt-2 italic">
                        ... and {importResult.errorCount - 10} more errors not shown
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!importResult ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setIsImportDialogOpen(false)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportMeals}
                  disabled={isImporting || parsedMeals.length === 0}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  {isImporting ? "Importing..." : `Import ${parsedMeals.length} Meals`}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setParsedMeals([]);
                  setImportResult(null);
                }}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
