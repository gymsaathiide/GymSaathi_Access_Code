import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Play,
  Pause,
  Check,
  ChevronUp,
  Dumbbell,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  exercise_id: string;
  name: string;
  type: string;
  exercise_type: string;
  primary_muscle: string;
  instructions: string;
  tips: string[];
  sets: number;
  reps: string;
  duration_seconds: number;
  rest_seconds: number;
  is_completed: boolean;
  sets_completed: number;
  reps_completed: string;
  weight_used: number;
  sort_order: number;
}

export default function ActiveWorkoutPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workout-session", sessionId],
    queryFn: async () => {
      const res = await fetch("/api/training/current-session", {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!sessionId,
  });

  const exercises: Exercise[] = data?.exercises || [];
  const session = data?.session;
  const currentExercise = exercises[currentExerciseIndex];

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  const updateExerciseMutation = useMutation({
    mutationFn: async ({
      exerciseId,
      isCompleted,
      durationSeconds,
    }: {
      exerciseId: string;
      isCompleted: boolean;
      durationSeconds?: number;
    }) => {
      const res = await fetch(`/api/training/session-exercise/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isCompleted, durationSeconds }),
      });
      if (!res.ok) throw new Error("Failed to update exercise");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session", sessionId] });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/training/complete-session/${sessionId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete session");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
      toast({
        title: "Workout Complete! 🎉",
        description: `You burned ${data.caloriesBurned} calories in ${Math.round(data.totalDuration / 60)} minutes.`,
      });
      setLocation("/member/training/stats");
    },
  });

  const handleCompleteExercise = () => {
    if (!currentExercise) return;

    updateExerciseMutation.mutate({
      exerciseId: currentExercise.id,
      isCompleted: true,
      durationSeconds: elapsedSeconds,
    });

    setElapsedSeconds(0);
    setIsTimerRunning(false);

    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      completeSessionMutation.mutate();
    }
  };

  const handleSkipExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setElapsedSeconds(0);
      setIsTimerRunning(false);
    } else {
      completeSessionMutation.mutate();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white/60">Loading workout...</div>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-white/60">No exercises found</p>
          <Button onClick={() => setLocation("/member/training")}>
            Back to Training
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLocation("/member/training")}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold truncate max-w-[60%] text-center">{currentExercise.name}</h1>
        <button
          onClick={handleSkipExercise}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center">
        {/* Video/Image Placeholder */}
        <div className="w-full max-w-md aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex items-center justify-center">
          <Dumbbell className="w-14 h-14 sm:w-20 sm:h-20 text-white/20" />
        </div>

        {/* Timer Display */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="text-4xl sm:text-6xl font-bold font-mono mb-3 sm:mb-4">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="flex items-center justify-center gap-6 sm:gap-8">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-white/50">Time</div>
              <div className="text-base sm:text-xl font-semibold">
                {currentExercise.duration_seconds
                  ? `${Math.ceil(currentExercise.duration_seconds / 60)}m`
                  : "N/A"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-white/50">Exercise</div>
              <div className="text-base sm:text-xl font-semibold">
                {currentExercise.sets && currentExercise.reps
                  ? `${currentExercise.sets}x${currentExercise.reps}`
                  : "Timed"}
              </div>
            </div>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsTimerRunning(!isTimerRunning)}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition mb-4 sm:mb-6"
        >
          {isTimerRunning ? (
            <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          ) : (
            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1" />
          )}
        </button>

        {/* Instructions */}
        {currentExercise.instructions && (
          <div className="w-full max-w-md mb-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <p className="text-white/70 text-sm">{currentExercise.instructions}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
        {/* View all exercises */}
        <button
          onClick={() => setShowExerciseList(!showExerciseList)}
          className="w-full flex items-center justify-center gap-2 py-2 sm:py-3 text-white/50 text-sm sm:text-base"
        >
          <ChevronUp className={`w-4 h-4 sm:w-5 sm:h-5 transition ${showExerciseList ? "rotate-180" : ""}`} />
          <span>View all exercises</span>
        </button>

        {showExerciseList && (
          <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
            {exercises.map((exercise, index) => (
              <button
                key={exercise.id}
                onClick={() => {
                  setCurrentExerciseIndex(index);
                  setElapsedSeconds(0);
                  setIsTimerRunning(false);
                }}
                className={`w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl flex items-center justify-between transition ${
                  index === currentExerciseIndex
                    ? "bg-orange-500/20 border border-orange-500/50"
                    : exercise.is_completed
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                      exercise.is_completed
                        ? "bg-green-500 text-white"
                        : index === currentExerciseIndex
                        ? "bg-orange-500 text-white"
                        : "bg-white/20 text-white/60"
                    }`}
                  >
                    {exercise.is_completed ? <Check className="w-3 h-3" /> : index + 1}
                  </div>
                  <span className={`text-sm sm:text-base truncate ${exercise.is_completed ? "text-green-400" : "text-white"}`}>
                    {exercise.name}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-white/50 flex-shrink-0 ml-2">
                  {exercise.sets && exercise.reps
                    ? `${exercise.sets}x${exercise.reps}`
                    : exercise.duration_seconds
                    ? `${Math.ceil(exercise.duration_seconds / 60)}m`
                    : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Complete Exercise Button */}
        <Button
          onClick={handleCompleteExercise}
          disabled={updateExerciseMutation.isPending}
          className="w-full py-4 sm:py-6 text-sm sm:text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl sm:rounded-2xl"
        >
          <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          {currentExerciseIndex === exercises.length - 1
            ? "Complete Workout"
            : "Complete & Next"}
        </Button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-white/50">
          <span>
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </span>
        </div>
      </div>
    </div>
  );
}
