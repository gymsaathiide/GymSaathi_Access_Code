import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Clock,
  Dumbbell,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Exercise {
  id: string;
  name: string;
  type: string;
  primary_muscle: string;
  secondary_muscles: string[];
  instructions: string;
  tips: string[];
  sets: number;
  reps: string;
  duration_seconds: number;
  rest_seconds: number;
  exercise_type: string;
  sort_order: number;
}

interface Session {
  id: string;
  target_muscle: string;
  include_cardio: boolean;
}

export default function GenerateWorkoutPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(search);
  const targetMuscle = urlParams.get("muscle") || "chest";

  const [includeCardio, setIncludeCardio] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [mobilityOpen, setMobilityOpen] = useState(true);
  const [strengthOpen, setStrengthOpen] = useState(true);
  const [cardioOpen, setCardioOpen] = useState(true);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/training/generate-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetMuscle,
          includeCardio,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate workout");
      return res.json();
    },
    onSuccess: (data) => {
      setSession(data.session);
      setExercises(data.exercises);
      toast({
        title: "Workout Generated!",
        description: `${data.exercises.length} exercises ready for you.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate workout",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    generateMutation.mutate();
  }, []);

  const handleRegenerate = () => {
    generateMutation.mutate();
  };

  const handleStartWorkout = () => {
    if (session) {
      setLocation(`/member/training/workout/${session.id}`);
    }
  };

  const mobilityExercises = exercises.filter((e) => e.exercise_type === "mobility");
  const strengthExercises = exercises.filter((e) => e.exercise_type === "strength");
  const cardioExercises = exercises.filter((e) => e.exercise_type === "cardio");

  const estimatedTime = exercises.reduce((sum, ex) => {
    if (ex.duration_seconds) return sum + Math.ceil(ex.duration_seconds / 60);
    if (ex.sets && ex.reps) return sum + ex.sets * 2;
    return sum + 3;
  }, 0);

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "mobility": return Activity;
      case "strength": return Dumbbell;
      case "cardio": return Zap;
      default: return Dumbbell;
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case "mobility": return "from-teal-400 to-cyan-500";
      case "strength": return "from-blue-400 to-indigo-500";
      case "cardio": return "from-orange-400 to-red-500";
      default: return "from-gray-400 to-gray-500";
    }
  };

  if (generateMutation.isPending && exercises.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto" />
          <p className="text-white/60">Generating your workout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] text-white pb-32">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-rose-300/90 to-rose-400/90 rounded-b-3xl overflow-hidden">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/member/training")}
            className="p-2 rounded-lg bg-black/10 hover:bg-black/20 transition"
          >
            <ArrowLeft className="w-5 h-5 text-rose-900" />
          </button>
          <h1 className="text-lg font-semibold text-rose-900">Details</h1>
          <div className="w-9" />
        </div>

        <div className="px-6 pb-8 pt-4">
          <h2 className="text-3xl font-bold text-rose-900 capitalize mb-2">
            {targetMuscle}
          </h2>
          <h2 className="text-3xl font-bold text-rose-900">Workout</h2>
          <div className="flex items-center gap-2 mt-4 text-rose-800">
            <div className="w-5 h-5 rounded bg-rose-200/50" />
            <span>{exercises.length} Exercises</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-sm text-white/50 mb-2">Description</h3>
          <p className="text-white/80">
            A targeted workout focusing on your {targetMuscle} muscles. This session includes
            mobility exercises to warm up, strength training for muscle development
            {includeCardio ? ", and cardio for fat burning" : ""}.
          </p>
        </div>

        {/* Cardio Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-orange-400" />
            <span>Include Cardio Finisher</span>
          </div>
          <Switch
            checked={includeCardio}
            onCheckedChange={(checked) => {
              setIncludeCardio(checked);
              generateMutation.mutate();
            }}
          />
        </div>

        {/* Workout Summary */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Estimated Time</span>
              </div>
              <span className="text-xl font-bold">{estimatedTime} min</span>
            </div>
          </CardContent>
        </Card>

        {/* All workout list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">All workout list</h3>
            <div className="flex items-center gap-1 text-white/50 text-sm">
              <Clock className="w-4 h-4" />
              <span>{estimatedTime} min</span>
            </div>
          </div>

          {/* Mobility Section */}
          {mobilityExercises.length > 0 && (
            <Collapsible open={mobilityOpen} onOpenChange={setMobilityOpen} className="mb-4">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-400" />
                    <span className="font-semibold text-teal-400">Mobility</span>
                    <Badge variant="outline" className="text-teal-400 border-teal-400/30">
                      {mobilityExercises.length}
                    </Badge>
                  </div>
                  {mobilityOpen ? <ChevronUp className="w-5 h-5 text-teal-400" /> : <ChevronDown className="w-5 h-5 text-teal-400" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {mobilityExercises.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Strength Section */}
          {strengthExercises.length > 0 && (
            <Collapsible open={strengthOpen} onOpenChange={setStrengthOpen} className="mb-4">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-blue-400">Strength</span>
                    <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                      {strengthExercises.length}
                    </Badge>
                  </div>
                  {strengthOpen ? <ChevronUp className="w-5 h-5 text-blue-400" /> : <ChevronDown className="w-5 h-5 text-blue-400" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {strengthExercises.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Cardio Section */}
          {cardioExercises.length > 0 && (
            <Collapsible open={cardioOpen} onOpenChange={setCardioOpen} className="mb-4">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <span className="font-semibold text-orange-400">Cardio</span>
                    <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                      {cardioExercises.length}
                    </Badge>
                  </div>
                  {cardioOpen ? <ChevronUp className="w-5 h-5 text-orange-400" /> : <ChevronDown className="w-5 h-5 text-orange-400" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {cardioExercises.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent">
        <div className="max-w-lg mx-auto space-y-3">
          <Button
            onClick={handleStartWorkout}
            className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-2xl"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Workout
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={generateMutation.isPending}
            variant="outline"
            className="w-full py-4 border-white/20 bg-white/5 hover:bg-white/10 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Card className="bg-slate-800/50 border-white/10 overflow-hidden">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <div>
            <h4 className="font-semibold text-white">{exercise.name}</h4>
            <p className="text-sm text-white/50">
              {exercise.sets && exercise.reps
                ? `${exercise.sets} × ${exercise.reps}`
                : exercise.duration_seconds
                ? formatDuration(exercise.duration_seconds)
                : ""}
            </p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
          <Play className="w-5 h-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
