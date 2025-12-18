import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  AlertCircle,
  Flame
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

export default function MemberWorkoutPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

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

  const startWorkoutMutation = useMutation({
    mutationFn: async (dayId: string) => {
      const response = await apiRequest('POST', `/api/workout/member/start-workout/${dayId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout/member/weekly-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout/member/active-plan'] });
      toast({
        title: "Workout Started",
        description: "Good luck with your training!",
      });
    },
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getGoalColor = (goal: string) => {
    const colors: Record<string, string> = {
      weight_loss: "bg-green-500",
      muscle_gain: "bg-blue-500",
      strength: "bg-purple-500",
      endurance: "bg-orange-500",
      flexibility: "bg-pink-500",
      general_fitness: "bg-cyan-500",
    };
    return colors[goal] || "bg-gray-500";
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: "bg-green-500/20 text-green-300 border-green-500/30",
      intermediate: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      advanced: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return colors[difficulty] || "bg-gray-500/20 text-gray-300";
  };

  if (loadingPlan) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Workout Planner" description="Loading your workout plan..." />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="p-6 space-y-6 pb-24">
        <PageHeader title="Workout Planner" description="Your personalized workout journey" />
        
        <Card className="bg-gradient-to-br from-orange-900/40 to-orange-950/20 border-orange-500/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Active Workout Plan</h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              You don't have an active workout plan yet. Complete your profile or ask your trainer to assign one.
            </p>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              Generate My Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <PageHeader 
        title="Workout Planner" 
        description={`Week ${activePlan.currentWeek} of ${activePlan.durationWeeks}`} 
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-orange-900/40 to-orange-950/20 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-100 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-white">{activePlan.name}</p>
            <Badge className={getDifficultyBadge(activePlan.difficulty)}>
              {activePlan.difficulty}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/20 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-white">
              {(weeklyProgress as any)?.completed || 0} / {activePlan.daysPerWeek} workouts
            </p>
            <Progress 
              value={((weeklyProgress as any)?.completed || 0) / activePlan.daysPerWeek * 100} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/40 to-green-950/20 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-white">
              {(weeklyProgress as any)?.streak || 0} days
            </p>
            <p className="text-xs text-green-200/60">Keep it up!</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Weekly Overview
          </TabsTrigger>
          <TabsTrigger 
            value="today"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70"
          >
            <Dumbbell className="h-4 w-4 mr-2" />
            Today's Workout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="bg-card-dark border-white/10">
            <CardHeader>
              <CardTitle className="text-white">This Week's Schedule</CardTitle>
              <CardDescription className="text-white/60">
                Tap on a day to see workout details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date, index) => {
                  const dayNumber = index + 1;
                  const workoutDay = workoutDays?.find(d => d.dayNumber === dayNumber);
                  const isActive = isToday(date);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => workoutDay && setSelectedDay(workoutDay)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        isActive 
                          ? 'bg-orange-500 text-white' 
                          : workoutDay?.isRestDay
                            ? 'bg-white/5 text-white/40'
                            : workoutDay
                              ? 'bg-white/10 text-white hover:bg-white/20'
                              : 'bg-white/5 text-white/30'
                      }`}
                    >
                      <p className="text-xs font-medium">{format(date, 'EEE')}</p>
                      <p className="text-lg font-bold">{format(date, 'd')}</p>
                      {workoutDay && !workoutDay.isRestDay && (
                        <Dumbbell className="h-3 w-3 mx-auto mt-1 opacity-60" />
                      )}
                      {workoutDay?.isRestDay && (
                        <p className="text-[10px] mt-1">Rest</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDay && (
            <Card className="bg-card-dark border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{selectedDay.name}</CardTitle>
                    <CardDescription className="text-white/60">
                      {selectedDay.description || `Day ${selectedDay.dayNumber}`}
                    </CardDescription>
                  </div>
                  {!selectedDay.isRestDay && (
                    <Button 
                      onClick={() => startWorkoutMutation.mutate(selectedDay.id)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Workout
                    </Button>
                  )}
                </div>
              </CardHeader>
              {!selectedDay.isRestDay && (
                <CardContent>
                  <div className="space-y-3">
                    {selectedDay.exercises?.map((exercise, idx) => (
                      <div 
                        key={exercise.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{exercise.name}</p>
                          <p className="text-sm text-white/60">
                            {exercise.sets} sets × {exercise.reps} reps
                          </p>
                        </div>
                        <Badge className="bg-white/10 text-white/70">
                          {exercise.muscleGroup}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-white/40" />
                      </div>
                    ))}
                    {(!selectedDay.exercises || selectedDay.exercises.length === 0) && (
                      <p className="text-center text-white/40 py-8">
                        No exercises added to this day yet
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="today" className="space-y-4 mt-4">
          {(() => {
            const todayNumber = new Date().getDay() || 7;
            const todayWorkout = workoutDays?.find(d => d.dayNumber === todayNumber);
            
            if (!todayWorkout) {
              return (
                <Card className="bg-card-dark border-white/10">
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-white/40" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Workout Scheduled</h3>
                    <p className="text-white/60">Today is a rest day or no workout is assigned.</p>
                  </CardContent>
                </Card>
              );
            }

            if (todayWorkout.isRestDay) {
              return (
                <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/20 border-blue-500/20">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Rest Day</h3>
                    <p className="text-white/60">Take it easy today. Your muscles are recovering and growing!</p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card className="bg-card-dark border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{todayWorkout.name}</CardTitle>
                      <CardDescription className="text-white/60 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {todayWorkout.estimatedDuration || 45} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-4 w-4" />
                          {todayWorkout.exercises?.length || 0} exercises
                        </span>
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => startWorkoutMutation.mutate(todayWorkout.id)}
                      className="bg-orange-500 hover:bg-orange-600"
                      size="lg"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Workout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayWorkout.exercises?.map((exercise, idx) => (
                      <div 
                        key={exercise.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-white/5"
                      >
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{exercise.name}</p>
                          <p className="text-sm text-white/60">
                            {exercise.sets} sets × {exercise.reps} • {exercise.restSeconds}s rest
                          </p>
                        </div>
                        <Badge className="bg-white/10 text-white/70 capitalize">
                          {exercise.muscleGroup.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
