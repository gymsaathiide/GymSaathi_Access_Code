import { useState, useEffect } from "react";
import { ArrowLeft, Dumbbell, Activity, Zap, Play, Clock, Target, Sparkles, RefreshCcw, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

type FitnessLevel = 'beginner' | 'moderate' | 'stronger';
type SessionType = 'warm-up' | 'strength' | 'hiit' | 'cardio' | 'core' | 'mobility' | 'stretching';

interface Exercise {
  id: string;
  day_number: number;
  session_type: SessionType;
  exercise_name: string;
  sets?: number;
  reps?: string;
  duration_minutes?: number;
  rest_seconds?: number;
  muscles_targeted: string[];
  form_instructions: string;
  mistakes_to_avoid: string[];
  tips: string[];
}

interface WorkoutPlan {
  id: string;
  level: FitnessLevel;
  equipment: string[];
  duration_days: number;
}

const equipmentOptions = [
  { id: 'dumbbells', label: 'Dumbbells', icon: Dumbbell, color: 'from-blue-400 to-cyan-500' },
  { id: 'barbell', label: 'Barbell', icon: Dumbbell, color: 'from-purple-400 to-pink-500' },
  { id: 'machines', label: 'Machines', icon: Activity, color: 'from-green-400 to-emerald-500' },
  { id: 'kettlebell', label: 'Kettlebell', icon: Dumbbell, color: 'from-orange-400 to-red-500' },
  { id: 'resistance-bands', label: 'Resistance Bands', icon: Activity, color: 'from-yellow-400 to-amber-500' },
  { id: 'bodyweight', label: 'Bodyweight', icon: Zap, color: 'from-pink-400 to-rose-500' },
];

const sessionTypeColors: Record<SessionType, string> = {
  'warm-up': 'from-green-400 to-emerald-500',
  'strength': 'from-blue-400 to-cyan-500',
  'hiit': 'from-orange-400 to-red-500',
  'cardio': 'from-purple-400 to-pink-500',
  'core': 'from-yellow-400 to-amber-500',
  'mobility': 'from-teal-400 to-cyan-500',
  'stretching': 'from-indigo-400 to-purple-500',
};

const sessionTypeIcons: Record<SessionType, any> = {
  'warm-up': Play,
  'strength': Dumbbell,
  'hiit': Zap,
  'cardio': Activity,
  'core': Target,
  'mobility': Activity,
  'stretching': Activity,
};

export default function WorkoutPlannerPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedLevel, setSelectedLevel] = useState<FitnessLevel | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [hasExistingPlan, setHasExistingPlan] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);

  useEffect(() => {
    fetchExistingWorkoutPlan();
  }, []);

  useEffect(() => {
    if (workoutPlan) {
      loadCompletedExercises();
    }
  }, [workoutPlan, selectedDay]);

  const fetchExistingWorkoutPlan = async () => {
    try {
      const response = await fetch('/api/diet-planner/workout-plan', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.plan) {
          setWorkoutPlan(data.plan);
          setSelectedLevel(data.plan.level);
          setSelectedEquipment(data.plan.equipment);
          setHasExistingPlan(true);
          setExercises(data.exercises || []);
        }
      }
    } catch (error) {
      console.error('Error fetching workout plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedExercises = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/diet-planner/daily-tracking?date=${today}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data?.completed_exercises && Array.isArray(data.completed_exercises)) {
          setCompletedExercises(data.completed_exercises);
        }
      }
    } catch (error) {
      console.error('Error loading completed exercises:', error);
    }
  };

  const toggleExerciseCompleted = async (exerciseId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const isCompleted = completedExercises.includes(exerciseId);
      const updatedCompletedExercises = isCompleted
        ? completedExercises.filter(id => id !== exerciseId)
        : [...completedExercises, exerciseId];

      const response = await fetch('/api/diet-planner/daily-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tracking_date: today,
          completed_exercises: updatedCompletedExercises,
        })
      });

      if (response.ok) {
        setCompletedExercises(updatedCompletedExercises);
        toast({
          title: isCompleted ? 'Exercise unmarked' : 'Exercise completed! 💪',
          description: isCompleted ? '' : 'Keep up the great work!',
        });
      }
    } catch (error) {
      console.error('Error toggling exercise:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exercise status',
        variant: 'destructive',
      });
    }
  };

  const toggleEquipment = (equipmentId: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const resetWorkoutPlan = async () => {
    try {
      const response = await fetch('/api/diet-planner/workout-plan', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setWorkoutPlan(null);
        setExercises([]);
        setHasExistingPlan(false);
        setSelectedLevel(null);
        setSelectedEquipment([]);
        setSelectedDay(1);
        setCompletedExercises([]);

        toast({
          title: "Plan Reset",
          description: "You can now create a new workout plan.",
        });
      }
    } catch (error) {
      console.error('Error resetting workout plan:', error);
      toast({
        title: "Error",
        description: "Failed to reset workout plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateWorkout = async () => {
    if (!selectedLevel || selectedEquipment.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select your fitness level and at least one equipment option.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/diet-planner/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          level: selectedLevel,
          equipment: selectedEquipment,
          durationDays: 7,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate workout plan');
      }

      toast({
        title: "Workout Plan Generated!",
        description: "Your personalized 7-day workout plan is ready.",
      });

      await fetchExistingWorkoutPlan();
    } catch (error) {
      console.error('Error generating workout:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate workout plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const dayExercises = exercises.filter(ex => ex.day_number === selectedDay);
  const groupedBySession = dayExercises.reduce((acc, ex) => {
    if (!acc[ex.session_type]) acc[ex.session_type] = [];
    acc[ex.session_type].push(ex);
    return acc;
  }, {} as Record<SessionType, Exercise[]>);

  if (loading) {
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
            <h1 className="text-2xl font-bold">Workout Planner</h1>
            <p className="text-muted-foreground text-sm">Build your personalized workout routine</p>
          </div>
        </div>
        {workoutPlan && (
          <Button onClick={resetWorkoutPlan} variant="outline" className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Reset & Regenerate
          </Button>
        )}
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">A. Choose Your Level</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'beginner', label: 'Beginner', emoji: '🌱', desc: 'New to fitness, learning basics' },
              { id: 'moderate', label: 'Moderate', emoji: '💪', desc: '6+ months training experience' },
              { id: 'stronger', label: 'Stronger', emoji: '🔥', desc: 'Advanced, ready for intensity' },
            ].map((level) => (
              <button
                key={level.id}
                onClick={() => !hasExistingPlan && setSelectedLevel(level.id as FitnessLevel)}
                disabled={hasExistingPlan}
                className={`rounded-xl p-6 transition-all duration-300 border-2 ${
                  selectedLevel === level.id
                    ? 'border-orange-500 shadow-lg shadow-orange-500/20 scale-105'
                    : 'border-border hover:border-orange-500/50'
                } ${hasExistingPlan ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="text-4xl mb-3">{level.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{level.label}</h3>
                <p className="text-sm text-muted-foreground">{level.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">B. Choose Available Gym Equipment</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {equipmentOptions.map((item) => {
              const isSelected = selectedEquipment.includes(item.id);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => !hasExistingPlan && toggleEquipment(item.id)}
                  disabled={hasExistingPlan}
                  className={`rounded-xl p-5 transition-all duration-300 border-2 ${
                    isSelected
                      ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                      : 'border-border hover:border-orange-500/50'
                  } ${hasExistingPlan ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 mx-auto`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-center block">{item.label}</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!hasExistingPlan && (
          <div className="flex justify-center">
            <Button
              onClick={handleGenerateWorkout}
              disabled={isGenerating || !selectedLevel || selectedEquipment.length === 0}
              size="lg"
              className="px-8 py-6 text-lg rounded-xl bg-gradient-to-r from-orange-500 to-orange-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate 7-Day Workout Plan
                </>
              )}
            </Button>
          </div>
        )}

        {workoutPlan && exercises.length > 0 && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold">Your Plan is Based On:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Level: <span className="font-medium capitalize">{workoutPlan.level}</span></div>
                      <div>Equipment: <span className="font-medium">{workoutPlan.equipment.length} items selected</span></div>
                      <div>Duration: <span className="font-medium">{workoutPlan.duration_days} days</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: workoutPlan.duration_days }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-6 py-3 rounded-full font-medium whitespace-nowrap transition-all duration-300 ${
                    selectedDay === day
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                      : 'bg-card border border-border hover:border-orange-500/50'
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {Object.entries(groupedBySession).map(([sessionType, sessionExercises]) => {
                const Icon = sessionTypeIcons[sessionType as SessionType];
                const colorGradient = sessionTypeColors[sessionType as SessionType];
                
                return (
                  <div key={sessionType} className="space-y-4">
                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${colorGradient} bg-opacity-10 border border-white/20`}>
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorGradient} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold capitalize">{sessionType.replace('-', ' ')}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {sessionExercises.length} {sessionExercises.length === 1 ? 'exercise' : 'exercises'}
                      </Badge>
                    </div>

                    {sessionExercises.map((exercise) => (
                      <Card key={exercise.id} className="hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={completedExercises.includes(exercise.id)}
                                onCheckedChange={() => toggleExerciseCompleted(exercise.id)}
                              />
                              <div className="flex-1">
                                <h4 className={`text-lg font-bold mb-2 ${completedExercises.includes(exercise.id) ? 'text-muted-foreground line-through' : ''}`}>
                                  {exercise.exercise_name}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {exercise.muscles_targeted.map((muscle, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {muscle}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              {completedExercises.includes(exercise.id) && (
                                <Badge className="bg-green-500 text-white gap-1 mb-2">
                                  <Check className="h-3 w-3" />
                                  Done
                                </Badge>
                              )}
                              {exercise.sets && exercise.reps && (
                                <div className="text-sm">
                                  <span className="font-bold text-orange-500">{exercise.sets} sets</span>
                                  <span className="text-muted-foreground"> × </span>
                                  <span className="font-bold text-orange-500">{exercise.reps} reps</span>
                                </div>
                              )}
                              {exercise.duration_minutes && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  {exercise.duration_minutes} min
                                </div>
                              )}
                            </div>
                          </div>

                          {exercise.form_instructions && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">Form Instructions:</p>
                              <p className="text-sm text-muted-foreground">{exercise.form_instructions}</p>
                            </div>
                          )}

                          {exercise.tips && exercise.tips.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Tips:</p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {exercise.tips.map((tip, idx) => (
                                  <li key={idx}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
