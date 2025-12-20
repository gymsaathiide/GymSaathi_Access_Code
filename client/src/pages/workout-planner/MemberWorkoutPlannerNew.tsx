import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Calendar, 
  Clock, 
  Dumbbell, 
  Play, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft,
  Loader2,
  Timer,
  SkipForward,
  Trophy,
  RefreshCw,
  Target,
  Activity,
  Flame,
  Heart,
  User,
  ArrowRight,
  Check,
  X,
  FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";

type WorkoutProfile = {
  id: string;
  member_id: string;
  gym_id: string;
  fitness_goal: string;
  experience_level: string;
  training_priority: string;
  current_weight: string | null;
  height: string | null;
  onboarding_completed: boolean;
};

type MuscleGroup = {
  id: string;
  name: string;
  display_name: string;
  exercise_count: number;
  stretching_count: number;
  actual_exercise_count: string;
  actual_stretching_count: string;
};

type Exercise = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  exercise_type: 'main' | 'stretching';
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  is_completed: boolean;
  is_skipped: boolean;
};

type CardioExercise = {
  id: string;
  name: string;
  description: string;
  intensity: string;
};

type WorkoutSession = {
  id: string;
  muscle_group_id: string;
  status: string;
  start_time: string;
  muscle_group_name: string;
  cardio_name: string | null;
};

type KPIData = {
  member: { name: string; email: string };
  profile: WorkoutProfile | null;
  streak: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
};

type CalendarDay = {
  date: string;
  workout_count: string;
  muscle_groups: string[];
};

type WorkoutReport = {
  id: string;
  workout_date: string;
  muscle_group_name: string;
  total_duration: number;
  stretching_exercises: string;
  main_exercises: string;
  cardio_exercise: string;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function MemberWorkoutPlannerNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentView, setCurrentView] = useState<'home' | 'onboarding' | 'muscle-select' | 'workout' | 'reports' | 'summary'>('home');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(null);
  const [includeCardio, setIncludeCardio] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [totalTimer, setTotalTimer] = useState(0);
  const [isExerciseTimerRunning, setIsExerciseTimerRunning] = useState(false);
  const [isSessionTimerRunning, setIsSessionTimerRunning] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState<any>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const exerciseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [onboardingData, setOnboardingData] = useState({
    fitnessGoal: '',
    experienceLevel: '',
    trainingPriority: '',
    currentWeight: '',
    height: ''
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/workout-planner/profile'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workout-planner/profile');
      return response.json();
    }
  });

  const { data: kpiData, isLoading: kpiLoading } = useQuery<KPIData>({
    queryKey: ['/api/workout-planner/kpis'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workout-planner/kpis');
      return response.json();
    },
    enabled: profileData?.onboardingCompleted
  });

  const { data: muscleGroups } = useQuery<MuscleGroup[]>({
    queryKey: ['/api/workout-planner/muscle-groups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workout-planner/muscle-groups');
      return response.json();
    },
    enabled: profileData?.onboardingCompleted
  });

  const { data: activeSessionData, refetch: refetchActiveSession } = useQuery({
    queryKey: ['/api/workout-planner/active-session'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workout-planner/active-session');
      return response.json();
    },
    enabled: profileData?.onboardingCompleted
  });

  const { data: calendarData } = useQuery<CalendarDay[]>({
    queryKey: ['/api/workout-planner/calendar', calendarMonth.getMonth() + 1, calendarMonth.getFullYear()],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/workout-planner/calendar?month=${calendarMonth.getMonth() + 1}&year=${calendarMonth.getFullYear()}`);
      return response.json();
    },
    enabled: currentView === 'reports' && profileData?.onboardingCompleted
  });

  const { data: reportsData } = useQuery<WorkoutReport[]>({
    queryKey: ['/api/workout-planner/reports'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workout-planner/reports');
      return response.json();
    },
    enabled: currentView === 'reports' && profileData?.onboardingCompleted
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: typeof onboardingData) => {
      const response = await apiRequest('POST', '/api/workout-planner/profile', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-planner/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-planner/kpis'] });
      setCurrentView('home');
      toast({
        title: "Profile Saved!",
        description: "Your workout preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const generateSessionMutation = useMutation({
    mutationFn: async (data: { muscleGroupId: string; includeCardio: boolean }) => {
      const response = await apiRequest('POST', '/api/workout-planner/generate-session', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate session');
      }
      return response.json();
    },
    onSuccess: (data) => {
      refetchActiveSession();
      setCurrentView('workout');
      setCurrentExerciseIndex(0);
      setExerciseTimer(0);
      setTotalTimer(0);
      setIsExerciseTimerRunning(false);
      setIsSessionTimerRunning(false);
      toast({
        title: "Workout Generated!",
        description: `${data.muscleGroupName} workout ready with ${data.stretchingExercises.length} stretches and ${data.mainExercises.length} exercises.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ exerciseId, data }: { exerciseId: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/workout-planner/session-exercise/${exerciseId}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update exercise');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchActiveSession();
    }
  });

  const completeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, cardioCompleted }: { sessionId: string; cardioCompleted: boolean }) => {
      const response = await apiRequest('POST', `/api/workout-planner/complete-session/${sessionId}`, { cardioCompleted });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete session');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setWorkoutSummary(data);
      setCurrentView('summary');
      stopTimers();
      queryClient.invalidateQueries({ queryKey: ['/api/workout-planner/active-session'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-planner/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-planner/calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-planner/reports'] });
      toast({
        title: "Workout Complete!",
        description: `Great job! You completed your ${data.report?.muscleGroup} workout.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/workout-planner/cancel-session/${sessionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel session');
      }
      return response.json();
    },
    onSuccess: () => {
      setCurrentView('home');
      stopTimers();
      queryClient.invalidateQueries({ queryKey: ['/api/workout-planner/active-session'] });
      toast({
        title: "Workout Cancelled",
        description: "Your workout session has been cancelled.",
      });
    }
  });

  useEffect(() => {
    if (profileData && !profileData.onboardingCompleted) {
      setCurrentView('onboarding');
    } else if (activeSessionData?.session) {
      setCurrentView('workout');
      if (!isSessionTimerRunning) {
        const sessionStartTime = new Date(activeSessionData.session.start_time).getTime();
        const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        setTotalTimer(elapsedSeconds > 0 ? elapsedSeconds : 0);
        setIsSessionTimerRunning(true);
      }
    }
  }, [profileData, activeSessionData]);

  useEffect(() => {
    if (isExerciseTimerRunning) {
      exerciseTimerRef.current = setInterval(() => {
        setExerciseTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    }
    return () => {
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    };
  }, [isExerciseTimerRunning]);

  useEffect(() => {
    if (isSessionTimerRunning) {
      totalTimerRef.current = setInterval(() => {
        setTotalTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }
    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [isSessionTimerRunning]);

  const stopTimers = () => {
    setIsExerciseTimerRunning(false);
    setIsSessionTimerRunning(false);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
  };

  const startExercise = () => {
    setIsExerciseTimerRunning(true);
    if (!isSessionTimerRunning) {
      setIsSessionTimerRunning(true);
    }
  };

  const handleCompleteExercise = async (exerciseId: string) => {
    await updateExerciseMutation.mutateAsync({
      exerciseId,
      data: { isCompleted: true, duration: exerciseTimer }
    });
    setIsExerciseTimerRunning(false);
    setExerciseTimer(0);
    const exercises = activeSessionData?.exercises || [];
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const handleSkipExercise = async (exerciseId: string) => {
    await updateExerciseMutation.mutateAsync({
      exerciseId,
      data: { isSkipped: true }
    });
    setIsExerciseTimerRunning(false);
    setExerciseTimer(0);
    const exercises = activeSessionData?.exercises || [];
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (currentView === 'onboarding') {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Dumbbell className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">Welcome to Workout Planner</h1>
            <p className="text-slate-400 mt-2">Let's set up your profile in 3 easy steps</p>
          </div>

          <div className="flex justify-center mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step <= onboardingStep ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {step < onboardingStep ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 ${step < onboardingStep ? 'bg-orange-500' : 'bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              {onboardingStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">What's your fitness goal?</h2>
                  <RadioGroup
                    value={onboardingData.fitnessGoal}
                    onValueChange={(value) => setOnboardingData({ ...onboardingData, fitnessGoal: value })}
                    className="space-y-3"
                  >
                    {[
                      { value: 'fat_loss', label: 'Fat Loss', icon: Flame },
                      { value: 'muscle_gain', label: 'Muscle Gain', icon: Dumbbell },
                      { value: 'strength', label: 'Build Strength', icon: Zap },
                      { value: 'general_fitness', label: 'General Fitness', icon: Heart }
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700 hover:border-orange-500 cursor-pointer">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <option.icon className="h-5 w-5 text-orange-500" />
                        <Label htmlFor={option.value} className="text-white cursor-pointer flex-1">{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">What's your experience level?</h2>
                  <RadioGroup
                    value={onboardingData.experienceLevel}
                    onValueChange={(value) => setOnboardingData({ ...onboardingData, experienceLevel: value })}
                    className="space-y-3"
                  >
                    {[
                      { value: 'beginner', label: 'Beginner', desc: 'New to working out (4-5 exercises)' },
                      { value: 'intermediate', label: 'Intermediate', desc: '1-3 years experience (5-6 exercises)' },
                      { value: 'advanced', label: 'Expert', desc: '3+ years experience (6-7 exercises)' }
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700 hover:border-orange-500 cursor-pointer">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <Label htmlFor={option.value} className="text-white cursor-pointer">{option.label}</Label>
                          <p className="text-sm text-slate-400">{option.desc}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">What's your training priority?</h2>
                  <RadioGroup
                    value={onboardingData.trainingPriority}
                    onValueChange={(value) => setOnboardingData({ ...onboardingData, trainingPriority: value })}
                    className="space-y-3"
                  >
                    {[
                      { value: 'strength', label: 'Strength', desc: 'Heavy weights, low reps', icon: Dumbbell },
                      { value: 'stamina', label: 'Stamina', desc: 'Endurance & cardio focus', icon: Activity },
                      { value: 'flexibility', label: 'Flexibility', desc: 'Mobility & stretching', icon: Target }
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700 hover:border-orange-500 cursor-pointer">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <option.icon className="h-5 w-5 text-orange-500" />
                        <div className="flex-1">
                          <Label htmlFor={option.value} className="text-white cursor-pointer">{option.label}</Label>
                          <p className="text-sm text-slate-400">{option.desc}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setOnboardingStep(prev => prev - 1)}
                  disabled={onboardingStep === 1}
                  className="border-slate-700"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                {onboardingStep < 3 ? (
                  <Button
                    onClick={() => setOnboardingStep(prev => prev + 1)}
                    disabled={
                      (onboardingStep === 1 && !onboardingData.fitnessGoal) ||
                      (onboardingStep === 2 && !onboardingData.experienceLevel)
                    }
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => saveProfileMutation.mutate(onboardingData)}
                    disabled={!onboardingData.trainingPriority || saveProfileMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {saveProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Complete Setup
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'muscle-select') {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-slate-400">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-white">Select Muscle Group</h1>
            <div />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {muscleGroups?.map((group) => (
              <Card 
                key={group.id}
                className={`bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-orange-500 ${
                  selectedMuscleGroup?.id === group.id ? 'border-orange-500 ring-2 ring-orange-500/20' : ''
                }`}
                onClick={() => setSelectedMuscleGroup(group)}
              >
                <CardContent className="p-4 text-center">
                  <Dumbbell className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-white">{group.display_name}</h3>
                  <p className="text-sm text-slate-400">{group.actual_exercise_count} exercises</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedMuscleGroup && (
            <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{selectedMuscleGroup.display_name} Workout</h3>
                  <p className="text-sm text-slate-400">
                    {selectedMuscleGroup.actual_stretching_count} stretches + exercises based on your level
                  </p>
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeCardio}
                    onChange={(e) => setIncludeCardio(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  <span className="text-sm text-slate-300">Include Cardio</span>
                </label>
              </div>
              <Button
                onClick={() => generateSessionMutation.mutate({ 
                  muscleGroupId: selectedMuscleGroup.id, 
                  includeCardio 
                })}
                disabled={generateSessionMutation.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {generateSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Workout
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'workout' && activeSessionData?.session) {
    const session = activeSessionData.session;
    const exercises = activeSessionData.exercises || [];
    const currentExercise = exercises[currentExerciseIndex];
    const stretchingExercises = exercises.filter((e: Exercise) => e.exercise_type === 'stretching');
    const mainExercises = exercises.filter((e: Exercise) => e.exercise_type === 'main');
    const completedCount = exercises.filter((e: Exercise) => e.is_completed).length;
    const progress = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;

    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">{session.muscle_group_name} Workout</h1>
              <p className="text-sm text-slate-400">
                Exercise {currentExerciseIndex + 1} of {exercises.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <p className="text-xs text-slate-400">Total Time</p>
                <p className="text-lg font-bold text-orange-500">{formatTime(totalTimer)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelSessionMutation.mutate(session.id)}
                className="text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Progress value={progress} className="mb-6 h-2" />

          {currentExercise && (
            <Card className="bg-slate-900 border-slate-800 mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className={currentExercise.exercise_type === 'stretching' ? 'bg-blue-500' : 'bg-orange-500'}>
                    {currentExercise.exercise_type === 'stretching' ? 'Stretching' : 'Main Exercise'}
                  </Badge>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{formatTime(exerciseTimer)}</p>
                    <p className="text-xs text-slate-400">Exercise Timer</p>
                  </div>
                </div>
                <CardTitle className="text-white mt-4">{currentExercise.name}</CardTitle>
                {currentExercise.description && (
                  <CardDescription>{currentExercise.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {currentExercise.instructions && (
                  <p className="text-slate-400 mb-4">{currentExercise.instructions}</p>
                )}
                
                {currentExercise.target_sets && currentExercise.target_reps && (
                  <div className="flex items-center justify-center space-x-6 mb-6 p-4 bg-slate-800 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-500">{currentExercise.target_sets}</p>
                      <p className="text-sm text-slate-400">Sets</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-500">{currentExercise.target_reps}</p>
                      <p className="text-sm text-slate-400">Reps</p>
                    </div>
                    {currentExercise.rest_seconds && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-500">{currentExercise.rest_seconds}s</p>
                        <p className="text-sm text-slate-400">Rest</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex space-x-3">
                  {!isExerciseTimerRunning ? (
                    <Button
                      onClick={() => startExercise()}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Exercise
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleCompleteExercise(currentExercise.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={updateExerciseMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                      <Button
                        onClick={() => handleSkipExercise(currentExercise.id)}
                        variant="outline"
                        className="border-slate-600"
                        disabled={updateExerciseMutation.isPending}
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

          {currentExerciseIndex >= exercises.length - 1 && exercises.every((e: Exercise) => e.is_completed || e.is_skipped) && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6 text-center">
                <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">All Exercises Done!</h3>
                {activeSessionData.cardioExercise && (
                  <div className="mb-4 p-4 bg-slate-800 rounded-lg">
                    <p className="text-slate-400 mb-2">Optional Cardio:</p>
                    <p className="text-white font-semibold">{activeSessionData.cardioExercise.name}</p>
                  </div>
                )}
                <Button
                  onClick={() => completeSessionMutation.mutate({ 
                    sessionId: session.id, 
                    cardioCompleted: false 
                  })}
                  disabled={completeSessionMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {completeSessionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Complete Workout
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentExerciseIndex(prev => Math.max(0, prev - 1))}
              disabled={currentExerciseIndex === 0}
              className="text-slate-400"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentExerciseIndex(prev => Math.min(exercises.length - 1, prev + 1))}
              disabled={currentExerciseIndex >= exercises.length - 1}
              className="text-slate-400"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'summary' && workoutSummary) {
    const report = workoutSummary.report;
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-md mx-auto text-center">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Workout Complete!</h1>
          <p className="text-slate-400 mb-6">Great job on your {report?.muscleGroup} workout!</p>
          
          <Card className="bg-slate-900 border-slate-800 mb-6 text-left">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Duration</span>
                <span className="text-white font-semibold">{formatTime(workoutSummary.totalDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stretching Exercises</span>
                <span className="text-white">{report?.stretchingExercises?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Main Exercises</span>
                <span className="text-white">{report?.mainExercises?.length || 0}</span>
              </div>
              {report?.cardioExercise && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Cardio</span>
                  <span className="text-white">{report.cardioExercise.name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              setCurrentView('home');
              setWorkoutSummary(null);
            }}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (currentView === 'reports') {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(calendarMonth),
      end: endOfMonth(calendarMonth)
    });

    const getWorkoutForDate = (date: Date) => {
      return calendarData?.find(d => isSameDay(new Date(d.date), date));
    };

    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-slate-400">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-white">Workout Reports</h1>
            <div />
          </div>

          <Card className="bg-slate-900 border-slate-800 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-white">
                  {format(calendarMonth, 'MMMM yyyy')}
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs text-slate-500 p-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(startOfMonth(calendarMonth).getDay()).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}
                {daysInMonth.map(date => {
                  const workout = getWorkoutForDate(date);
                  return (
                    <div
                      key={date.toISOString()}
                      className={`p-2 text-center rounded-lg ${
                        isToday(date) ? 'ring-2 ring-orange-500' : ''
                      } ${
                        workout ? 'bg-green-900/50 text-green-400' : 'text-slate-400'
                      }`}
                    >
                      <span className="text-sm">{format(date, 'd')}</span>
                      {workout && (
                        <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold text-white mb-4">Recent Workouts</h2>
          <div className="space-y-3">
            {reportsData?.slice(0, 10).map((report) => (
              <Card key={report.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{report.muscle_group_name}</h3>
                    <p className="text-sm text-slate-400">
                      {format(new Date(report.workout_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-semibold">{formatTime(report.total_duration || 0)}</p>
                    <p className="text-xs text-slate-400">duration</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <PageHeader 
        title="Workout Planner" 
        description="Your personalized fitness journey"
      />

      {kpiLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <User className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{kpiData?.member?.name || 'Member'}</p>
                <p className="text-xs text-slate-400">Welcome back!</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{kpiData?.streak || 0}</p>
                <p className="text-xs text-slate-400">Day Streak</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{kpiData?.workoutsThisWeek || 0}</p>
                <p className="text-xs text-slate-400">This Week</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <Trophy className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{kpiData?.workoutsThisMonth || 0}</p>
                <p className="text-xs text-slate-400">This Month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 cursor-pointer hover:from-orange-500 hover:to-orange-600 transition-all"
              onClick={() => setCurrentView('muscle-select')}
            >
              <CardContent className="p-8 text-center">
                <Dumbbell className="h-12 w-12 text-white mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Training Session</h2>
                <p className="text-orange-100">Start your workout now</p>
                <ArrowRight className="h-6 w-6 text-white mx-auto mt-4" />
              </CardContent>
            </Card>

            <Card 
              className="bg-slate-900 border-slate-800 cursor-pointer hover:border-orange-500 transition-all"
              onClick={() => setCurrentView('reports')}
            >
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Get Report</h2>
                <p className="text-slate-400">View your workout history</p>
                <ArrowRight className="h-6 w-6 text-slate-400 mx-auto mt-4" />
              </CardContent>
            </Card>
          </div>

          {kpiData?.profile && (
            <Card className="bg-slate-900 border-slate-800 mt-6">
              <CardHeader>
                <CardTitle className="text-white text-sm">Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-orange-500 text-orange-500">
                  {kpiData.profile.fitness_goal?.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="border-blue-500 text-blue-500">
                  {kpiData.profile.experience_level}
                </Badge>
                <Badge variant="outline" className="border-green-500 text-green-500">
                  {kpiData.profile.training_priority}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
