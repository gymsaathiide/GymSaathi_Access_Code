import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Dumbbell,
  Activity,
  Target,
  Flame,
  Clock,
  ChevronRight,
  Zap,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MuscleGroup {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  color: string;
  exercise_count: number;
}

const muscleIcons: Record<string, any> = {
  abs: Target,
  chest: Heart,
  back: Dumbbell,
  shoulders: Dumbbell,
  arms: Dumbbell,
  quads: Activity,
  hamstrings: Activity,
  glutes: Activity,
  calves: Activity,
  hip_flexor: Activity,
  neck: Activity,
};

const muscleColors: Record<string, string> = {
  abs: "from-red-400 to-rose-500",
  chest: "from-teal-400 to-cyan-500",
  back: "from-blue-400 to-indigo-500",
  shoulders: "from-green-400 to-emerald-500",
  arms: "from-yellow-400 to-amber-500",
  quads: "from-purple-400 to-violet-500",
  hamstrings: "from-cyan-400 to-teal-500",
  glutes: "from-orange-400 to-red-500",
  calves: "from-pink-400 to-rose-500",
  hip_flexor: "from-indigo-400 to-blue-500",
  neck: "from-amber-400 to-yellow-500",
};

export default function TrainingHomePage() {
  const [, setLocation] = useLocation();

  const { data: profileData } = useQuery({
    queryKey: ["training-profile"],
    queryFn: async () => {
      const res = await fetch("/api/training/profile", { credentials: "include" });
      return res.json();
    },
  });

  const { data: muscleData, isLoading } = useQuery({
    queryKey: ["muscle-groups"],
    queryFn: async () => {
      const res = await fetch("/api/training/muscle-groups", { credentials: "include" });
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["training-stats"],
    queryFn: async () => {
      const res = await fetch("/api/training/stats", { credentials: "include" });
      return res.json();
    },
  });

  const { data: currentSession } = useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const res = await fetch("/api/training/current-session", { credentials: "include" });
      return res.json();
    },
  });

  const needsOnboarding = !profileData?.profile;
  const muscleGroups: MuscleGroup[] = muscleData?.muscleGroups || [];

  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] p-4">
        <div className="max-w-md mx-auto pt-20 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Training</h1>
          <p className="text-white/60">
            Let's set up your fitness profile to personalize your workouts.
          </p>
          <Link href="/member/training/onboarding">
            <Button className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/50 border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/member">
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-xl font-bold">Discover</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-sm font-bold">
            {statsData?.currentStreak || 0}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Continue Workout Card */}
        {currentSession?.session && (
          <Link href={`/member/training/workout/${currentSession.session.id}`}>
            <Card className="bg-gradient-to-br from-orange-500/20 to-rose-500/20 border-orange-500/30 overflow-hidden cursor-pointer hover:border-orange-500/50 transition">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-orange-500 text-white mb-2">In Progress</Badge>
                    <h3 className="text-lg font-bold text-white capitalize">
                      {currentSession.session.target_muscle} Workout
                    </h3>
                    <p className="text-sm text-white/60">
                      {currentSession.exercises?.length || 0} exercises
                    </p>
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{statsData?.weeklyCalories || 0}</div>
              <div className="text-xs text-white/50">Calories This Week</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{statsData?.weeklyDurationMinutes || 0}m</div>
              <div className="text-xs text-white/50">Time This Week</div>
            </CardContent>
          </Card>
        </div>

        {/* Popular Exercises Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Popular Exercises</h2>
            <Link href="/member/training/stats">
              <span className="text-sm text-white/50 flex items-center gap-1 cursor-pointer hover:text-white/70">
                See more <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            <Link href="/member/training/generate?muscle=chest">
              <Card className="flex-shrink-0 w-40 bg-gradient-to-br from-rose-300/90 to-rose-400/90 border-0 overflow-hidden cursor-pointer hover:scale-105 transition">
                <CardContent className="p-4 h-32 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-rose-900">Gym</h3>
                    <h3 className="text-lg font-bold text-rose-900">Workout</h3>
                  </div>
                  <div className="flex items-center gap-2 text-rose-800 text-sm">
                    <div className="w-4 h-4 rounded bg-rose-200" />
                    <span>All muscles</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/member/training/generate?muscle=abs">
              <Card className="flex-shrink-0 w-40 bg-gradient-to-br from-slate-700 to-slate-800 border-0 overflow-hidden cursor-pointer hover:scale-105 transition">
                <CardContent className="p-4 h-32 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Home</h3>
                    <h3 className="text-lg font-bold text-white">Workout</h3>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <div className="w-4 h-4 rounded bg-white/20" />
                    <span>Bodyweight</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Training Session - Muscle Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Training Session</h2>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-white/50">Loading muscles...</div>
            ) : (
              muscleGroups.map((muscle) => {
                const Icon = muscleIcons[muscle.name] || Dumbbell;
                const colorClass = muscleColors[muscle.name] || "from-gray-400 to-gray-500";
                
                return (
                  <Link key={muscle.id} href={`/member/training/generate?muscle=${muscle.name}`}>
                    <Card 
                      className="border-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition"
                      style={{ 
                        background: `linear-gradient(135deg, ${muscle.color}15, ${muscle.color}05)`,
                        borderLeft: `3px solid ${muscle.color}`
                      }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white capitalize">
                              {muscle.display_name}
                            </h3>
                            <p className="text-sm text-white/50">
                              {muscle.exercise_count} Exercises
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/30" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
