import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Dumbbell,
  Activity,
  StretchHorizontal,
  Search
} from "lucide-react";

type MuscleGroup = {
  id: string;
  name: string;
  display_name: string;
};

type Exercise = {
  id: string;
  muscle_group_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  exercise_type: 'main' | 'stretching';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string | null;
  target_reps: string | null;
  target_sets: number | null;
  rest_seconds: number | null;
  is_active: boolean;
};

type CardioExercise = {
  id: string;
  name: string;
  description: string | null;
  intensity: string;
  duration_minutes: number | null;
  calories_per_minute: number | null;
  is_active: boolean;
};

export default function SuperadminExerciseLibrary() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('main');
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [showCardioDialog, setShowCardioDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingCardio, setEditingCardio] = useState<CardioExercise | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [exerciseForm, setExerciseForm] = useState({
    muscleGroupId: '',
    name: '',
    description: '',
    instructions: '',
    exerciseType: 'main' as 'main' | 'stretching',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    equipment: '',
    targetReps: '',
    targetSets: 3,
    restSeconds: 60,
    isActive: true
  });

  const [cardioForm, setCardioForm] = useState({
    name: '',
    description: '',
    intensity: 'moderate',
    durationMinutes: 20,
    caloriesPerMinute: 10,
    isActive: true
  });

  const { data: muscleGroups, isLoading: muscleGroupsLoading } = useQuery<MuscleGroup[]>({
    queryKey: ['/api/workout-planner/muscle-groups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workout-planner/muscle-groups');
      return response.json();
    }
  });

  const { data: exercises, isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ['/api/superadmin/exercises', selectedMuscleGroup, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedMuscleGroup !== 'all') params.append('muscleGroupId', selectedMuscleGroup);
      if (activeTab !== 'cardio') params.append('type', activeTab);
      const response = await apiRequest('GET', `/api/superadmin/exercises?${params}`);
      return response.json();
    },
    enabled: activeTab !== 'cardio'
  });

  const { data: cardioExercises, isLoading: cardioLoading } = useQuery<CardioExercise[]>({
    queryKey: ['/api/superadmin/cardio'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/cardio');
      return response.json();
    },
    enabled: activeTab === 'cardio'
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/superadmin/exercises', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create exercise');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/exercises'] });
      setShowExerciseDialog(false);
      resetExerciseForm();
      toast({ title: "Success", description: "Exercise created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/superadmin/exercises/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update exercise');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/exercises'] });
      setShowExerciseDialog(false);
      setEditingExercise(null);
      resetExerciseForm();
      toast({ title: "Success", description: "Exercise updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const toggleExerciseMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/exercises/${id}/toggle`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle exercise');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/exercises'] });
      toast({ title: "Success", description: "Exercise status updated" });
    }
  });

  const createCardioMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/superadmin/cardio', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create cardio exercise');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/cardio'] });
      setShowCardioDialog(false);
      resetCardioForm();
      toast({ title: "Success", description: "Cardio exercise created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateCardioMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/superadmin/cardio/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update cardio exercise');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/cardio'] });
      setShowCardioDialog(false);
      setEditingCardio(null);
      resetCardioForm();
      toast({ title: "Success", description: "Cardio exercise updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const toggleCardioMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/cardio/${id}/toggle`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle cardio exercise');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/cardio'] });
      toast({ title: "Success", description: "Cardio status updated" });
    }
  });

  const resetExerciseForm = () => {
    setExerciseForm({
      muscleGroupId: '',
      name: '',
      description: '',
      instructions: '',
      exerciseType: activeTab === 'stretching' ? 'stretching' : 'main',
      difficulty: 'beginner',
      equipment: '',
      targetReps: '',
      targetSets: 3,
      restSeconds: 60,
      isActive: true
    });
  };

  const resetCardioForm = () => {
    setCardioForm({
      name: '',
      description: '',
      intensity: 'moderate',
      durationMinutes: 20,
      caloriesPerMinute: 10,
      isActive: true
    });
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setExerciseForm({
      muscleGroupId: exercise.muscle_group_id,
      name: exercise.name,
      description: exercise.description || '',
      instructions: exercise.instructions || '',
      exerciseType: exercise.exercise_type,
      difficulty: exercise.difficulty,
      equipment: exercise.equipment || '',
      targetReps: exercise.target_reps || '',
      targetSets: exercise.target_sets || 3,
      restSeconds: exercise.rest_seconds || 60,
      isActive: exercise.is_active
    });
    setShowExerciseDialog(true);
  };

  const handleEditCardio = (cardio: CardioExercise) => {
    setEditingCardio(cardio);
    setCardioForm({
      name: cardio.name,
      description: cardio.description || '',
      intensity: cardio.intensity,
      durationMinutes: cardio.duration_minutes || 20,
      caloriesPerMinute: cardio.calories_per_minute || 10,
      isActive: cardio.is_active
    });
    setShowCardioDialog(true);
  };

  const handleSaveExercise = () => {
    const data = {
      muscleGroupId: exerciseForm.muscleGroupId,
      name: exerciseForm.name,
      description: exerciseForm.description || null,
      instructions: exerciseForm.instructions || null,
      exerciseType: exerciseForm.exerciseType,
      difficulty: exerciseForm.difficulty,
      equipment: exerciseForm.equipment || null,
      targetReps: exerciseForm.targetReps || null,
      targetSets: exerciseForm.targetSets,
      restSeconds: exerciseForm.restSeconds,
      isActive: exerciseForm.isActive
    };

    if (editingExercise) {
      updateExerciseMutation.mutate({ id: editingExercise.id, data });
    } else {
      createExerciseMutation.mutate(data);
    }
  };

  const handleSaveCardio = () => {
    const data = {
      name: cardioForm.name,
      description: cardioForm.description || null,
      intensity: cardioForm.intensity,
      durationMinutes: cardioForm.durationMinutes,
      caloriesPerMinute: cardioForm.caloriesPerMinute,
      isActive: cardioForm.isActive
    };

    if (editingCardio) {
      updateCardioMutation.mutate({ id: editingCardio.id, data });
    } else {
      createCardioMutation.mutate(data);
    }
  };

  const filteredExercises = exercises?.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCardio = cardioExercises?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <PageHeader 
        title="Exercise Library Management" 
        description="Manage exercises, stretching, and cardio for workout planner"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="main" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Main Exercises
          </TabsTrigger>
          <TabsTrigger value="stretching" className="flex items-center gap-2">
            <StretchHorizontal className="h-4 w-4" />
            Stretching
          </TabsTrigger>
          <TabsTrigger value="cardio" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Cardio
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700"
            />
          </div>
          {activeTab !== 'cardio' && (
            <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
              <SelectTrigger className="w-full md:w-48 bg-slate-900 border-slate-700">
                <SelectValue placeholder="All Muscle Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscle Groups</SelectItem>
                {muscleGroups?.map(mg => (
                  <SelectItem key={mg.id} value={mg.id}>{mg.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button 
            onClick={() => {
              if (activeTab === 'cardio') {
                resetCardioForm();
                setEditingCardio(null);
                setShowCardioDialog(true);
              } else {
                resetExerciseForm();
                setEditingExercise(null);
                setShowExerciseDialog(true);
              }
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === 'cardio' ? 'Cardio' : 'Exercise'}
          </Button>
        </div>

        <TabsContent value="main">
          <ExerciseTable 
            exercises={filteredExercises || []}
            loading={exercisesLoading}
            muscleGroups={muscleGroups || []}
            onEdit={handleEditExercise}
            onToggle={(id, isActive) => toggleExerciseMutation.mutate({ id, isActive })}
          />
        </TabsContent>

        <TabsContent value="stretching">
          <ExerciseTable 
            exercises={filteredExercises || []}
            loading={exercisesLoading}
            muscleGroups={muscleGroups || []}
            onEdit={handleEditExercise}
            onToggle={(id, isActive) => toggleExerciseMutation.mutate({ id, isActive })}
          />
        </TabsContent>

        <TabsContent value="cardio">
          <CardioTable 
            exercises={filteredCardio || []}
            loading={cardioLoading}
            onEdit={handleEditCardio}
            onToggle={(id, isActive) => toggleCardioMutation.mutate({ id, isActive })}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
            </DialogTitle>
            <DialogDescription>
              {editingExercise ? 'Update exercise details' : 'Create a new exercise for the library'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Muscle Group</Label>
              <Select value={exerciseForm.muscleGroupId} onValueChange={(v) => setExerciseForm({...exerciseForm, muscleGroupId: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups?.map(mg => (
                    <SelectItem key={mg.id} value={mg.id}>{mg.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Exercise Name</Label>
              <Input
                value={exerciseForm.name}
                onChange={(e) => setExerciseForm({...exerciseForm, name: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={exerciseForm.exerciseType} onValueChange={(v: any) => setExerciseForm({...exerciseForm, exerciseType: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Exercise</SelectItem>
                  <SelectItem value="stretching">Stretching</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select value={exerciseForm.difficulty} onValueChange={(v: any) => setExerciseForm({...exerciseForm, difficulty: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={exerciseForm.description}
                onChange={(e) => setExerciseForm({...exerciseForm, description: e.target.value})}
                className="bg-slate-800 border-slate-700"
                rows={2}
              />
            </div>

            <div>
              <Label>Instructions</Label>
              <Textarea
                value={exerciseForm.instructions}
                onChange={(e) => setExerciseForm({...exerciseForm, instructions: e.target.value})}
                className="bg-slate-800 border-slate-700"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Sets</Label>
                <Input
                  type="number"
                  value={exerciseForm.targetSets}
                  onChange={(e) => setExerciseForm({...exerciseForm, targetSets: parseInt(e.target.value) || 3})}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <Label>Reps</Label>
                <Input
                  value={exerciseForm.targetReps}
                  onChange={(e) => setExerciseForm({...exerciseForm, targetReps: e.target.value})}
                  placeholder="10-12"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <Label>Rest (sec)</Label>
                <Input
                  type="number"
                  value={exerciseForm.restSeconds}
                  onChange={(e) => setExerciseForm({...exerciseForm, restSeconds: parseInt(e.target.value) || 60})}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            <div>
              <Label>Equipment</Label>
              <Input
                value={exerciseForm.equipment}
                onChange={(e) => setExerciseForm({...exerciseForm, equipment: e.target.value})}
                placeholder="Barbell, Dumbbells, etc."
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={exerciseForm.isActive}
                onCheckedChange={(v) => setExerciseForm({...exerciseForm, isActive: v})}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowExerciseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveExercise}
              disabled={createExerciseMutation.isPending || updateExerciseMutation.isPending || !exerciseForm.name || !exerciseForm.muscleGroupId}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {(createExerciseMutation.isPending || updateExerciseMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingExercise ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCardioDialog} onOpenChange={setShowCardioDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCardio ? 'Edit Cardio Exercise' : 'Add New Cardio Exercise'}
            </DialogTitle>
            <DialogDescription>
              {editingCardio ? 'Update cardio details' : 'Create a new cardio exercise'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name</Label>
              <Input
                value={cardioForm.name}
                onChange={(e) => setCardioForm({...cardioForm, name: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={cardioForm.description}
                onChange={(e) => setCardioForm({...cardioForm, description: e.target.value})}
                className="bg-slate-800 border-slate-700"
                rows={2}
              />
            </div>

            <div>
              <Label>Intensity</Label>
              <Select value={cardioForm.intensity} onValueChange={(v) => setCardioForm({...cardioForm, intensity: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={cardioForm.durationMinutes}
                  onChange={(e) => setCardioForm({...cardioForm, durationMinutes: parseInt(e.target.value) || 20})}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <Label>Cal/min</Label>
                <Input
                  type="number"
                  value={cardioForm.caloriesPerMinute}
                  onChange={(e) => setCardioForm({...cardioForm, caloriesPerMinute: parseInt(e.target.value) || 10})}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={cardioForm.isActive}
                onCheckedChange={(v) => setCardioForm({...cardioForm, isActive: v})}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCardioDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCardio}
              disabled={createCardioMutation.isPending || updateCardioMutation.isPending || !cardioForm.name}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {(createCardioMutation.isPending || updateCardioMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingCardio ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseTable({ 
  exercises, 
  loading, 
  muscleGroups,
  onEdit, 
  onToggle 
}: { 
  exercises: Exercise[];
  loading: boolean;
  muscleGroups: MuscleGroup[];
  onEdit: (e: Exercise) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  const getMuscleGroupName = (id: string) => {
    return muscleGroups.find(mg => mg.id === id)?.display_name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700">
            <TableHead className="text-slate-400">Name</TableHead>
            <TableHead className="text-slate-400">Muscle Group</TableHead>
            <TableHead className="text-slate-400">Difficulty</TableHead>
            <TableHead className="text-slate-400">Sets/Reps</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                No exercises found
              </TableCell>
            </TableRow>
          ) : (
            exercises.map(exercise => (
              <TableRow key={exercise.id} className="border-slate-700">
                <TableCell className="font-medium text-white">{exercise.name}</TableCell>
                <TableCell className="text-slate-300">{getMuscleGroupName(exercise.muscle_group_id)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    exercise.difficulty === 'beginner' ? 'border-green-500 text-green-500' :
                    exercise.difficulty === 'intermediate' ? 'border-yellow-500 text-yellow-500' :
                    'border-red-500 text-red-500'
                  }>
                    {exercise.difficulty}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">
                  {exercise.target_sets}x{exercise.target_reps || '-'}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={exercise.is_active}
                    onCheckedChange={(v) => onToggle(exercise.id, v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(exercise)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function CardioTable({ 
  exercises, 
  loading, 
  onEdit, 
  onToggle 
}: { 
  exercises: CardioExercise[];
  loading: boolean;
  onEdit: (e: CardioExercise) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700">
            <TableHead className="text-slate-400">Name</TableHead>
            <TableHead className="text-slate-400">Intensity</TableHead>
            <TableHead className="text-slate-400">Duration</TableHead>
            <TableHead className="text-slate-400">Cal/min</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                No cardio exercises found
              </TableCell>
            </TableRow>
          ) : (
            exercises.map(exercise => (
              <TableRow key={exercise.id} className="border-slate-700">
                <TableCell className="font-medium text-white">{exercise.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    exercise.intensity === 'low' ? 'border-green-500 text-green-500' :
                    exercise.intensity === 'moderate' ? 'border-yellow-500 text-yellow-500' :
                    'border-red-500 text-red-500'
                  }>
                    {exercise.intensity}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">{exercise.duration_minutes} min</TableCell>
                <TableCell className="text-slate-300">{exercise.calories_per_minute}</TableCell>
                <TableCell>
                  <Switch
                    checked={exercise.is_active}
                    onCheckedChange={(v) => onToggle(exercise.id, v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(exercise)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
