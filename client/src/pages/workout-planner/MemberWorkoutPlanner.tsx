import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Calendar, 
  Clock, 
  Dumbbell, 
  Play, 
  CheckCircle2, 
  Target,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Flame,
  Loader2,
  Timer,
  SkipForward,
  Home,
  Building2,
  Check,
  X,
  Trophy
} from "lucide-react";
import { format, startOfWeek, addDays, isToday, isSameDay } from "date-fns";

type WorkoutPlan = {
  id: string;
  name: string;
  description: string;
  goal: string;
  difficulty: string;
  split: string;
  daysPerWeek: number;
  currentWeek: number;
  durationWeeks: number;
  status: string;
  startDate: string;
};

type WorkoutDay = {
  id: string;
  dayNumber: number;
  name: string;
  description: string;
  isRestDay: boolean;
  targetMuscles: string;
  estimatedDuration: number;
  exercises: WorkoutExercise[];
};

type WorkoutExercise = {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  videoUrl?: string;
  instructions?: string;
};

type WorkoutPreferences = {
  id: string;
  fitnessGoal: string;
  experienceLevel: string;
  preferredDaysPerWeek: number;
  sessionDurationMinutes: number;
  preferHomeWorkout: boolean;
  injuries: string | null;
  profileStatus: string;
};

type ExerciseLog = {
  log: {
    id: string;
    exerciseId: string;
    status: string;
    startTime: string | null;
    endTime: string | null;
    duration: number | null;
  };
  exercise: {
    id: string;
    name: string;
    muscleGroup: string;
    instructions: string | null;
  } | null;
};

type WorkoutSession = {
  session: {
    id: string;
    startTime: string;
    isCompleted: boolean;
  };
  exerciseLogs: ExerciseLog[];
};

const TIMER_STORAGE_KEY = 'workout_timer_state';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function MemberWorkoutPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Multi-step form state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [preferencesForm, setPreferencesForm] = useState({
    fitnessGoal: '',
    experienceLevel: '',
    preferredDaysPerWeek: '',
    sessionDurationMinutes: '',
    preferHomeWorkout: '',
    injuries: '',
  });

  // Workout execution state
  const [isExecutingWorkout, setIsExecutingWorkout] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [totalTimer, setTotalTimer] = useState(0);
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Fetch preferences
  const { data: preferences } = useQuery<WorkoutPreferences>({
    queryKey: ['/api/workout/member/preferences'],
    enabled: !!user,
  });

  const { data: activePlan, isLoading: loadingPlan } = useQuery<WorkoutPlan>({
    queryKey: ['/api/workout/member/active-plan'],
    enabled: !!user,
  });

  const { data: workoutDays, isLoading: loadingDays } = useQuery<WorkoutDay[]>({
    queryKey: ['/api/workout/member/plan-days/' + activePlan?.id],
    enabled: !!activePlan?.id,
  });

  const { data: weeklyProgress } = useQuery({
    queryKey: ['/api/workout/member/weekly-progress'],
    enabled: !!user,
  });

  const { data: activeSession, refetch: refetchSession } = useQuery<WorkoutSession | null>({
    queryKey: ['/api/workout/session/active'],
    enabled: !!user && isExecutingWorkout,
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExecutingWorkout && !showSummary) {
      interval = setInterval(() => {
        setTotalTimer(prev => prev + 1);
        if (isExerciseActive) {
          setExerciseTimer(prev => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isExecutingWorkout, isExerciseActive, showSummary]);

  // Save timer state to localStorage
  useEffect(() => {
    if (isExecutingWorkout && activeSession) {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        sessionId: activeSession.session.id,
        totalTimer,
        exerciseTimer,
        currentExerciseIndex,
        isExerciseActive,
        timestamp: Date.now(),
      }));
    }
  }, [isExecutingWorkout, activeSession, totalTimer, exerciseTimer, currentExerciseIndex, isExerciseActive]);

  // Restore timer state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedState && activeSession) {
      try {
        const state = JSON.parse(savedState);
        if (state.sessionId === activeSession.session.id) {
          const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
          setTotalTimer(state.totalTimer + elapsed);
          setExerciseTimer(state.isExerciseActive ? state.exerciseTimer + elapsed : state.exerciseTimer);
          setCurrentExerciseIndex(state.currentExerciseIndex);
          setIsExerciseActive(state.isExerciseActive);
          setIsExecutingWorkout(true);
        }
      } catch (e) {
        console.error('Failed to restore timer state:', e);
      }
    }
  }, [activeSession]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: typeof preferencesForm) => {
      const response = await apiRequest('POST', '/api/workout/member/preferences', {
        fitnessGoal: data.fitnessGoal,
        experienceLevel: data.experienceLevel,
        preferredDaysPerWeek: parseInt(data.preferredDaysPerWeek, 10),
        sessionDurationMinutes: parseInt(data.sessionDurationMinutes, 10),
        preferHomeWorkout: data.preferHomeWorkout === 'home',
        injuries: data.injuries || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout/member/preferences'] });
      setFormStep(7); // Move to confirmation step
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/workout/member/generate-plan', {
        goal: preferencesForm.fitnessGoal,
        fitnessLevel: preferencesForm.experienceLevel,
        daysPerWeek: parseInt(preferencesForm.preferredDaysPerWeek, 10),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout/member/active-plan'] });
      setShowGenerateDialog(false);
      setFormStep(1);
      setPreferencesForm({
        fitnessGoal: '',
        experienceLevel: '',
        preferredDaysPerWeek: '',
        sessionDurationMinutes: '',
        preferHomeWorkout: '',
        injuries: '',
      });
      toast({
        title: "Workout Plan Generated!",
        description: "Your personalized workout plan is ready.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate workout plan",
        variant: "destructive",
      });
    },
  });

  // Start workout session
  const startSessionMutation = useMutation({
    mutationFn: async (data: { planId: string; dayId: string }) => {
      const response = await apiRequest('POST', '/api/workout/session/start', data);
      return response.json();
    },
    onSuccess: () => {
      refetchSession();
      setIsExecutingWorkout(true);
      setCurrentExerciseIndex(0);
      setExerciseTimer(0);
      setTotalTimer(0);
      setIsExerciseActive(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start workout",
        variant: "destructive",
      });
    },
  });

  // Start exercise
  const startExerciseMutation = useMutation({
    mutationFn: async (exerciseLogId: string) => {
      const response = await apiRequest('POST', `/api/workout/exercise/${exerciseLogId}/start`, {});
      return response.json();
    },
    onSuccess: () => {
      setIsExerciseActive(true);
      setExerciseTimer(0);
      refetchSession();
    },
  });

  // Complete exercise
  const completeExerciseMutation = useMutation({
    mutationFn: async (data: { exerciseLogId: string; status: 'completed' | 'skipped' }) => {
      const response = await apiRequest('POST', `/api/workout/exercise/${data.exerciseLogId}/complete`, { status: data.status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      setIsExerciseActive(false);
      refetchSession();
      
      // Check if this was the last exercise
      if (activeSession && currentExerciseIndex >= activeSession.exerciseLogs.length - 1) {
        // Complete the session
        completeSessionMutation.mutate({
          sessionId: activeSession.session.id,
          totalDuration: Math.floor(totalTimer / 60),
        });
      } else {
        // Move to next exercise
        setCurrentExerciseIndex(prev => prev + 1);
        setExerciseTimer(0);
      }
      
      toast({
        title: variables.status === 'completed' ? "Exercise Completed!" : "Exercise Skipped",
        description: variables.status === 'completed' ? "Great job! Keep going!" : "Moving to the next exercise",
      });
    },
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: async (data: { sessionId: string; totalDuration: number }) => {
      const response = await apiRequest('POST', `/api/workout/session/${data.sessionId}/complete`, { totalDuration: data.totalDuration });
      return response.json();
    },
    onSuccess: () => {
      setShowSummary(true);
      localStorage.removeItem(TIMER_STORAGE_KEY);
    },
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isFormStepValid = useCallback(() => {
    switch (formStep) {
      case 1: return !!preferencesForm.fitnessGoal;
      case 2: return !!preferencesForm.experienceLevel;
      case 3: return !!preferencesForm.preferredDaysPerWeek;
      case 4: return !!preferencesForm.sessionDurationMinutes;
      case 5: return !!preferencesForm.preferHomeWorkout;
      case 6: return true; // Injuries is optional
      default: return true;
    }
  }, [formStep, preferencesForm]);

  const handleNextStep = () => {
    if (formStep === 6) {
      savePreferencesMutation.mutate(preferencesForm);
    } else {
      setFormStep(prev => prev + 1);
    }
  };

  const handleGeneratePlan = () => {
    generatePlanMutation.mutate();
  };

  // Workout Execution View
  if (isExecutingWorkout && activeSession) {
    const currentExercise = activeSession.exerciseLogs[currentExerciseIndex];
    const completedCount = activeSession.exerciseLogs.filter(e => e.log.status === 'completed').length;
    const totalExercises = activeSession.exerciseLogs.length;
    const progress = (completedCount / totalExercises) * 100;

    // Summary screen
    if (showSummary) {
      const totalDuration = Math.floor(totalTimer / 60);
      const skippedCount = activeSession.exerciseLogs.filter(e => e.log.status === 'skipped').length;

      return (
        <div className="p-6 space-y-6 pb-24">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
            <CardContent className="pt-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Workout Complete!</h2>
              <p className="text-white/60 mb-6">Great job on finishing your workout!</p>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{completedCount}</div>
                  <div className="text-xs text-white/60">Completed</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-400">{skippedCount}</div>
                  <div className="text-xs text-white/60">Skipped</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{totalDuration}m</div>
                  <div className="text-xs text-white/60">Duration</div>
                </div>
              </div>

              <Button 
                onClick={() => {
                  setIsExecutingWorkout(false);
                  setShowSummary(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/workout/member/weekly-progress'] });
                }}
                className="bg-green-500 hover:bg-green-600"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-4 pb-24">
        {/* Timer Header */}
        <Card className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-xs text-white/60">Total Time</div>
                  <div className="text-xl font-mono font-bold text-white">{formatTime(totalTimer)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60">Progress</div>
                <div className="text-lg font-bold text-white">{completedCount}/{totalExercises}</div>
              </div>
            </div>
            <Progress value={progress} className="mt-3 h-2" />
          </CardContent>
        </Card>

        {/* Current Exercise */}
        {currentExercise && (
          <Card className="border-orange-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                  Exercise {currentExerciseIndex + 1} of {totalExercises}
                </Badge>
                {isExerciseActive && (
                  <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span className="text-sm font-mono text-orange-400">{formatTime(exerciseTimer)}</span>
                  </div>
                )}
              </div>
              <CardTitle className="text-xl mt-2">{currentExercise.exercise?.name || 'Exercise'}</CardTitle>
              <CardDescription className="capitalize">
                {currentExercise.exercise?.muscleGroup?.replace('_', ' ')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentExercise.exercise?.instructions && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white/80 mb-2">Instructions</h4>
                  <p className="text-sm text-white/60">{currentExercise.exercise.instructions}</p>
                </div>
              )}

              <div className="flex gap-3">
                {!isExerciseActive ? (
                  <Button 
                    onClick={() => startExerciseMutation.mutate(currentExercise.log.id)}
                    disabled={startExerciseMutation.isPending}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    {startExerciseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Exercise
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => completeExerciseMutation.mutate({ exerciseLogId: currentExercise.log.id, status: 'completed' })}
                      disabled={completeExerciseMutation.isPending}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                    <Button 
                      onClick={() => completeExerciseMutation.mutate({ exerciseLogId: currentExercise.log.id, status: 'skipped' })}
                      disabled={completeExerciseMutation.isPending}
                      variant="outline"
                      className="border-white/20"
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exercise List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">All Exercises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSession.exerciseLogs.map((exercise, index) => (
              <div 
                key={exercise.log.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === currentExerciseIndex ? 'bg-orange-500/20 border border-orange-500/30' :
                  exercise.log.status === 'completed' ? 'bg-green-500/10' :
                  exercise.log.status === 'skipped' ? 'bg-white/5 opacity-50' :
                  'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    exercise.log.status === 'completed' ? 'bg-green-500 text-white' :
                    exercise.log.status === 'skipped' ? 'bg-white/20 text-white/50' :
                    index === currentExerciseIndex ? 'bg-orange-500 text-white' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {exercise.log.status === 'completed' ? <Check className="h-3 w-3" /> :
                     exercise.log.status === 'skipped' ? <X className="h-3 w-3" /> :
                     index + 1}
                  </div>
                  <span className={exercise.log.status === 'skipped' ? 'line-through text-white/50' : ''}>
                    {exercise.exercise?.name}
                  </span>
                </div>
                {exercise.log.duration && (
                  <span className="text-xs text-white/60">{formatTime(exercise.log.duration)}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* End Workout Button */}
        <Button 
          variant="outline" 
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={() => {
            if (activeSession) {
              completeSessionMutation.mutate({
                sessionId: activeSession.session.id,
                totalDuration: Math.floor(totalTimer / 60),
              });
            }
          }}
        >
          End Workout Early
        </Button>
      </div>
    );
  }

  if (loadingPlan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // No active plan - show generate dialog
  if (!activePlan) {
    return (
      <div className="p-6 space-y-6 pb-24">
        <PageHeader 
          title="Workout Planner" 
          description="Get your personalized workout plan"
        />
        
        <Card className="border-dashed border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Active Workout Plan</h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Create your personalized workout plan by telling us about your fitness goals and preferences.
            </p>
            <Button 
              onClick={() => setShowGenerateDialog(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Create My Plan
            </Button>
          </CardContent>
        </Card>

        {/* Multi-step Generation Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={(open) => {
          setShowGenerateDialog(open);
          if (!open) {
            setFormStep(1);
          }
        }}>
          <DialogContent className="bg-card-dark border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {formStep === 7 ? 'Ready to Generate!' : `Step ${formStep} of 6`}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {formStep === 7 ? 'Your preferences are saved. Generate your plan now!' : 'Tell us about your fitness goals'}
              </DialogDescription>
            </DialogHeader>

            {/* Progress indicator */}
            {formStep < 7 && (
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <div 
                    key={step}
                    className={`h-1 flex-1 rounded-full ${step <= formStep ? 'bg-orange-500' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            )}

            <div className="py-4">
              {/* Step 1: Fitness Goal */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <label className="text-sm text-white/70">What is your primary fitness goal?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'weight_loss', label: 'Weight Loss', icon: '🔥' },
                      { value: 'muscle_gain', label: 'Build Muscle', icon: '💪' },
                      { value: 'strength', label: 'Increase Strength', icon: '🏋️' },
                      { value: 'endurance', label: 'Improve Endurance', icon: '🏃' },
                      { value: 'general_fitness', label: 'General Fitness', icon: '⚡' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPreferencesForm(f => ({ ...f, fitnessGoal: option.value }))}
                        className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                          preferencesForm.fitnessGoal === option.value 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-2xl">{option.icon}</span>
                        <span className="text-white">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Experience Level */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <label className="text-sm text-white/70">What's your fitness experience level?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'beginner', label: 'Beginner', desc: 'New to fitness (0-1 year)' },
                      { value: 'intermediate', label: 'Intermediate', desc: 'Regular training (1-3 years)' },
                      { value: 'advanced', label: 'Advanced', desc: 'Experienced (3+ years)' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPreferencesForm(f => ({ ...f, experienceLevel: option.value }))}
                        className={`text-left p-4 rounded-lg border transition-all ${
                          preferencesForm.experienceLevel === option.value 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="text-white font-medium">{option.label}</div>
                        <div className="text-sm text-white/60">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Days per Week */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <label className="text-sm text-white/70">How many days per week can you train?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['3', '4', '5', '6'].map((days) => (
                      <button
                        key={days}
                        onClick={() => setPreferencesForm(f => ({ ...f, preferredDaysPerWeek: days }))}
                        className={`p-4 rounded-lg border text-center transition-all ${
                          preferencesForm.preferredDaysPerWeek === days 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="text-2xl font-bold text-white">{days}</div>
                        <div className="text-xs text-white/60">days</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Session Duration */}
              {formStep === 4 && (
                <div className="space-y-4">
                  <label className="text-sm text-white/70">How long can you work out per session?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '30', label: '30 min' },
                      { value: '45', label: '45 min' },
                      { value: '60', label: '60 min' },
                      { value: '90', label: '90 min' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPreferencesForm(f => ({ ...f, sessionDurationMinutes: option.value }))}
                        className={`p-4 rounded-lg border text-center transition-all ${
                          preferencesForm.sessionDurationMinutes === option.value 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <Clock className="h-5 w-5 mx-auto mb-1 text-white/60" />
                        <div className="text-white font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Workout Preference */}
              {formStep === 5 && (
                <div className="space-y-4">
                  <label className="text-sm text-white/70">Where do you prefer to work out?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPreferencesForm(f => ({ ...f, preferHomeWorkout: 'home' }))}
                      className={`p-6 rounded-lg border text-center transition-all ${
                        preferencesForm.preferHomeWorkout === 'home' 
                          ? 'border-orange-500 bg-orange-500/10' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Home className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                      <div className="text-white font-medium">At Home</div>
                      <div className="text-xs text-white/60 mt-1">Minimal equipment</div>
                    </button>
                    <button
                      onClick={() => setPreferencesForm(f => ({ ...f, preferHomeWorkout: 'gym' }))}
                      className={`p-6 rounded-lg border text-center transition-all ${
                        preferencesForm.preferHomeWorkout === 'gym' 
                          ? 'border-orange-500 bg-orange-500/10' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                      <div className="text-white font-medium">At Gym</div>
                      <div className="text-xs text-white/60 mt-1">Full equipment</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Injuries */}
              {formStep === 6 && (
                <div className="space-y-4">
                  <label className="text-sm text-white/70">Do you have any injuries or medical conditions we should know about? (Optional)</label>
                  <Textarea
                    placeholder="E.g., Lower back pain, knee injury, shoulder issues..."
                    value={preferencesForm.injuries}
                    onChange={(e) => setPreferencesForm(f => ({ ...f, injuries: e.target.value }))}
                    className="bg-white/5 border-white/10 min-h-[100px]"
                  />
                  <p className="text-xs text-white/50">
                    This helps us create a safer workout plan for you. Leave blank if none.
                  </p>
                </div>
              )}

              {/* Step 7: Confirmation */}
              {formStep === 7 && (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-white font-medium">Preferences Saved!</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Goal:</span>
                      <span className="text-white capitalize">{preferencesForm.fitnessGoal.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Level:</span>
                      <span className="text-white capitalize">{preferencesForm.experienceLevel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Days/Week:</span>
                      <span className="text-white">{preferencesForm.preferredDaysPerWeek}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Duration:</span>
                      <span className="text-white">{preferencesForm.sessionDurationMinutes} min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Location:</span>
                      <span className="text-white capitalize">{preferencesForm.preferHomeWorkout}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {formStep > 1 && formStep < 7 && (
                <Button 
                  variant="outline" 
                  onClick={() => setFormStep(prev => prev - 1)}
                  className="border-white/10"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              
              {formStep < 7 ? (
                <Button 
                  onClick={handleNextStep}
                  disabled={!isFormStepValid() || savePreferencesMutation.isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {savePreferencesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {formStep === 6 ? 'Save & Continue' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  onClick={handleGeneratePlan}
                  disabled={generatePlanMutation.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  {generatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate My Plan
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main workout planner view with active plan
  return (
    <div className="p-6 space-y-6 pb-24">
      <PageHeader 
        title="My Workout Plan" 
        description={activePlan.name}
      />

      {/* Plan Overview */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              {activePlan.split.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="border-white/20">
              Week {activePlan.currentWeek} of {activePlan.durationWeeks}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{activePlan.daysPerWeek}</div>
              <div className="text-xs text-white/60">Days/Week</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400 capitalize">{activePlan.goal.replace('_', ' ')}</div>
              <div className="text-xs text-white/60">Goal</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white capitalize">{activePlan.difficulty}</div>
              <div className="text-xs text-white/60">Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            This Week's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDays ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {workoutDays?.map((day) => {
                const dayDate = weekDays[day.dayNumber - 1];
                const isCurrentDay = dayDate && isToday(dayDate);
                
                return (
                  <div 
                    key={day.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      isCurrentDay ? 'bg-orange-500/20 border border-orange-500/30' :
                      day.isRestDay ? 'bg-white/5 opacity-60' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${
                        isCurrentDay ? 'bg-orange-500' : 'bg-white/10'
                      }`}>
                        <span className="text-xs text-white/60">{dayDate ? format(dayDate, 'EEE') : ''}</span>
                        <span className="text-sm font-bold">{dayDate ? format(dayDate, 'd') : day.dayNumber}</span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{day.name}</div>
                        {!day.isRestDay && (
                          <div className="text-xs text-white/60">{day.estimatedDuration} min</div>
                        )}
                      </div>
                    </div>
                    {!day.isRestDay && (
                      <Button
                        size="sm"
                        onClick={() => {
                          startSessionMutation.mutate({ planId: activePlan.id, dayId: day.id });
                        }}
                        disabled={startSessionMutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {startSessionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
