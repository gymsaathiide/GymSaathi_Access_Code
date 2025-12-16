import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  X,
  Loader2,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Exercise {
  id: string;
  name: string;
  type: "strength" | "mobility" | "cardio";
  difficulty: "beginner" | "intermediate" | "expert";
  primary_muscle: string;
  secondary_muscles: string[];
  required_equipment: string[];
  instructions: string;
  tips: string[];
  sets: number | null;
  reps: string | null;
  duration_seconds: number | null;
  rest_seconds: number;
  calories_per_minute: number;
  video_url: string | null;
}

const muscleOptions = [
  "abs", "chest", "back", "shoulders", "arms",
  "quads", "hamstrings", "glutes", "calves", "hip_flexor", "neck"
];

const equipmentOptions = [
  "Bodyweight", "Dumbbells", "Barbell", "Kettlebell", "Cable Machine",
  "Resistance Bands", "Pull-up Bar", "Bench", "Smith Machine",
  "Leg Press", "Lat Pulldown", "Treadmill", "Elliptical", "Stationary Bike",
  "Rowing Machine", "Medicine Ball", "Stability Ball", "Foam Roller"
];

const typeColors = {
  strength: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  mobility: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  cardio: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const difficultyColors = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  expert: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ManageExercisesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMuscle, setFilterMuscle] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "strength" as "strength" | "mobility" | "cardio",
    difficulty: "beginner" as "beginner" | "intermediate" | "expert",
    primaryMuscle: "",
    secondaryMuscles: [] as string[],
    requiredEquipment: ["Bodyweight"] as string[],
    instructions: "",
    tips: "",
    sets: "",
    reps: "",
    durationSeconds: "",
    restSeconds: "60",
    caloriesPerMinute: "5",
    videoUrl: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["exercises", filterType, filterMuscle, filterDifficulty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("type", filterType);
      if (filterMuscle !== "all") params.append("muscle", filterMuscle);
      if (filterDifficulty !== "all") params.append("difficulty", filterDifficulty);
      const res = await fetch(`/api/training/exercises?${params}`, { credentials: "include" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch exercises");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/training/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create exercise");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "Exercise created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/training/exercises/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update exercise");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setIsEditOpen(false);
      setSelectedExercise(null);
      resetForm();
      toast({ title: "Exercise updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/training/exercises/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete exercise");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setIsDeleteOpen(false);
      setSelectedExercise(null);
      toast({ title: "Exercise deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "strength",
      difficulty: "beginner",
      primaryMuscle: "",
      secondaryMuscles: [],
      requiredEquipment: ["Bodyweight"],
      instructions: "",
      tips: "",
      sets: "",
      reps: "",
      durationSeconds: "",
      restSeconds: "60",
      caloriesPerMinute: "5",
      videoUrl: "",
    });
  };

  const openEditDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setFormData({
      name: exercise.name,
      type: exercise.type,
      difficulty: exercise.difficulty,
      primaryMuscle: exercise.primary_muscle,
      secondaryMuscles: exercise.secondary_muscles || [],
      requiredEquipment: exercise.required_equipment || ["Bodyweight"],
      instructions: exercise.instructions || "",
      tips: exercise.tips?.join("\n") || "",
      sets: exercise.sets?.toString() || "",
      reps: exercise.reps || "",
      durationSeconds: exercise.duration_seconds?.toString() || "",
      restSeconds: exercise.rest_seconds?.toString() || "60",
      caloriesPerMinute: exercise.calories_per_minute?.toString() || "5",
      videoUrl: exercise.video_url || "",
    });
    setIsEditOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Exercise name is required", variant: "destructive" });
      return;
    }
    if (!formData.primaryMuscle) {
      toast({ title: "Error", description: "Primary muscle is required", variant: "destructive" });
      return;
    }

    const parseNum = (val: string): number | null => {
      if (!val || val.trim() === "") return null;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    };

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      difficulty: formData.difficulty,
      primaryMuscle: formData.primaryMuscle,
      secondaryMuscles: formData.secondaryMuscles,
      requiredEquipment: formData.requiredEquipment,
      instructions: formData.instructions,
      tips: formData.tips.split("\n").filter(Boolean),
      sets: parseNum(formData.sets),
      reps: formData.reps.trim() || null,
      durationSeconds: parseNum(formData.durationSeconds),
      restSeconds: parseNum(formData.restSeconds) ?? 60,
      caloriesPerMinute: parseNum(formData.caloriesPerMinute) ?? 5,
      videoUrl: formData.videoUrl.trim() || null,
    };

    if (isEditOpen && selectedExercise) {
      updateMutation.mutate({ id: selectedExercise.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const exercises: Exercise[] = data?.exercises || [];
  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "strength": return Dumbbell;
      case "mobility": return Activity;
      case "cardio": return Zap;
      default: return Dumbbell;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Exercises</h1>
          <p className="text-muted-foreground">Add, edit, and delete exercises for the training system</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="mobility">Mobility</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMuscle} onValueChange={setFilterMuscle}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Muscle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscles</SelectItem>
                {muscleOptions.map((muscle) => (
                  <SelectItem key={muscle} value={muscle} className="capitalize">
                    {muscle.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Showing {filteredExercises.length} exercises</span>
      </div>

      {/* Exercise List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <X className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="font-semibold mb-2 text-red-400">Error Loading Exercises</h3>
            <p className="text-muted-foreground mb-4">{(error as Error).message || "Failed to load exercises"}</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["exercises"] })} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredExercises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No exercises found</h3>
            <p className="text-muted-foreground mb-4">Add exercises to get started</p>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Exercise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => {
            const Icon = getTypeIcon(exercise.type);
            return (
              <Card key={exercise.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg ${typeColors[exercise.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base truncate">{exercise.name}</CardTitle>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(exercise)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => { setSelectedExercise(exercise); setIsDeleteOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={typeColors[exercise.type]}>
                      {exercise.type}
                    </Badge>
                    <Badge variant="outline" className={difficultyColors[exercise.difficulty]}>
                      {exercise.difficulty}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {exercise.primary_muscle.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {exercise.sets && exercise.reps && (
                      <p>{exercise.sets} sets × {exercise.reps}</p>
                    )}
                    {exercise.duration_seconds && (
                      <p>{Math.round(exercise.duration_seconds / 60)} min</p>
                    )}
                    <p className="text-xs">
                      Equipment: {exercise.required_equipment?.join(", ") || "Bodyweight"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditOpen(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Exercise" : "Add New Exercise"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Update the exercise details below" : "Fill in the details to add a new exercise"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Push-ups"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="mobility">Mobility</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(v: any) => setFormData({ ...formData, difficulty: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Primary Muscle *</Label>
              <Select value={formData.primaryMuscle} onValueChange={(v) => setFormData({ ...formData, primaryMuscle: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary muscle" />
                </SelectTrigger>
                <SelectContent>
                  {muscleOptions.map((muscle) => (
                    <SelectItem key={muscle} value={muscle} className="capitalize">
                      {muscle.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Equipment Required</Label>
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((equip) => (
                  <Badge
                    key={equip}
                    variant={formData.requiredEquipment.includes(equip) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const updated = formData.requiredEquipment.includes(equip)
                        ? formData.requiredEquipment.filter((e) => e !== equip)
                        : [...formData.requiredEquipment, equip];
                      setFormData({ ...formData, requiredEquipment: updated.length ? updated : ["Bodyweight"] });
                    }}
                  >
                    {equip}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Sets</Label>
                <Input
                  type="number"
                  value={formData.sets}
                  onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div className="grid gap-2">
                <Label>Reps</Label>
                <Input
                  value={formData.reps}
                  onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                  placeholder="10-12"
                />
              </div>
              <div className="grid gap-2">
                <Label>Duration (sec)</Label>
                <Input
                  type="number"
                  value={formData.durationSeconds}
                  onChange={(e) => setFormData({ ...formData, durationSeconds: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Instructions</Label>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Step-by-step instructions..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Tips (one per line)</Label>
              <Textarea
                value={formData.tips}
                onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
                placeholder="Keep your core engaged&#10;Breathe steadily"
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label>Video URL (optional)</Label>
              <Input
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.primaryMuscle}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditOpen ? "Update Exercise" : "Create Exercise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedExercise?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedExercise && deleteMutation.mutate(selectedExercise.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
