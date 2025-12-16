import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Flame,
  Clock,
  TrendingUp,
  Target,
  ChevronRight,
  Scale,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface MuscleProgress {
  target_muscle: string;
  workout_count: number;
}

export default function TrainingStatsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newWeight, setNewWeight] = useState("");
  const [showWeightInput, setShowWeightInput] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["training-stats"],
    queryFn: async () => {
      const res = await fetch("/api/training/stats", { credentials: "include" });
      return res.json();
    },
  });

  const logWeightMutation = useMutation({
    mutationFn: async (weightKg: number) => {
      const res = await fetch("/api/training/log-weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weightKg }),
      });
      if (!res.ok) throw new Error("Failed to log weight");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
      setNewWeight("");
      setShowWeightInput(false);
      toast({
        title: "Weight logged!",
        description: "Your weight has been recorded.",
      });
    },
  });

  const handleLogWeight = () => {
    const weight = parseFloat(newWeight);
    if (!isNaN(weight) && weight > 0) {
      logWeightMutation.mutate(weight);
    }
  };

  const muscleProgress: MuscleProgress[] = stats?.muscleProgress || [];
  const totalMuscleWorkouts = muscleProgress.reduce((sum, m) => sum + parseInt(m.workout_count), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] text-white pb-24 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/50 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/member/training">
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold">Statistics</h1>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Weight Card */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-white/50">Current Weight</div>
                <div className="text-4xl font-bold">
                  {stats?.currentWeight ? `${stats.currentWeight} kg` : "-- kg"}
                </div>
              </div>
              <Badge variant="outline" className="text-white/50 border-white/20">
                Weekly
              </Badge>
            </div>

            {/* Weight chart placeholder */}
            <div className="h-24 flex items-end justify-between gap-2 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => {
                const weight = stats?.weightHistory?.[i]?.weight_kg;
                const maxWeight = Math.max(...(stats?.weightHistory?.map((w: any) => w.weight_kg) || [100]));
                const height = weight ? (weight / maxWeight) * 100 : 30;
                const isToday = i === new Date().getDay();
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className={`w-full rounded-full transition-all ${
                        isToday ? "bg-cyan-400" : "bg-white/20"
                      }`}
                      style={{ height: `${height}%`, minHeight: "8px" }}
                    />
                    <span className="text-xs text-white/50">{day}</span>
                  </div>
                );
              })}
            </div>

            {showWeightInput ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter weight (kg)"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="bg-white/10 border-white/20"
                />
                <Button onClick={handleLogWeight} disabled={logWeightMutation.isPending}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowWeightInput(true)}
                variant="outline"
                className="w-full border-white/20 bg-white/5"
              >
                <Scale className="w-4 h-4 mr-2" />
                Log Today's Weight
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-cyan-400 mb-1 sm:mb-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm">Time Spending</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">
                {stats?.weeklyDurationMinutes
                  ? `${Math.floor(stats.weeklyDurationMinutes / 60)}h ${stats.weeklyDurationMinutes % 60}m`
                  : "0h 0m"}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-orange-400 mb-1 sm:mb-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm">Wellness</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">
                {stats?.weeklyWorkouts
                  ? `${Math.round((stats.weeklyWorkouts / 7) * 100)}%`
                  : "0%"}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 hidden md:block">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1 sm:mb-2">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm">Calories</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">
                {stats?.weeklyCalories || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 hidden md:block">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-1 sm:mb-2">
                <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm">Workouts</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">
                {stats?.weeklyWorkouts || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workout Goals / Muscle Progress */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Workout Goals</h2>
            <span className="text-sm text-white/50 flex items-center gap-1 cursor-pointer hover:text-white/70">
              See more <ChevronRight className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-3">
            {muscleProgress.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center text-white/50">
                  Start working out to see your muscle progress!
                </CardContent>
              </Card>
            ) : (
              muscleProgress.map((muscle) => {
                const percentage = Math.min(100, Math.round((parseInt(muscle.workout_count) / 10) * 100));
                return (
                  <Card key={muscle.target_muscle} className="bg-white/5 border-white/10">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{muscle.target_muscle}</h3>
                          <p className="text-sm text-white/50">
                            {muscle.workout_count} Workouts
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative w-12 h-12">
                          <svg className="w-12 h-12 transform -rotate-90">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              className="text-white/10"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={`${(percentage / 100) * 126} 126`}
                              className="text-cyan-400"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {percentage}%
                          </span>
                        </div>
                        <Check className="w-5 h-5 text-orange-400" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Latest Activity</h2>
            <span className="text-sm text-white/50 flex items-center gap-1 cursor-pointer hover:text-white/70">
              See more <ChevronRight className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-3">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-rose-500" />
                <div className="flex-1">
                  <h3 className="font-semibold">Weekly Workouts</h3>
                  <p className="text-sm text-white/50">{stats?.weeklyWorkouts || 0} sessions</p>
                </div>
                <span className="text-sm text-white/40">This week</span>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Calories Burned</h3>
                  <p className="text-sm text-white/50">{stats?.weeklyCalories || 0} kcal</p>
                </div>
                <span className="text-sm text-white/40">This week</span>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Current Streak</h3>
                  <p className="text-sm text-white/50">{stats?.currentStreak || 0} days</p>
                </div>
                <span className="text-sm text-white/40">Keep it up!</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
