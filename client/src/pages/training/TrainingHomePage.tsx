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
  Heart,
  Home,
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
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] p-4 sm:p-6 md:p-8">
        <div className="max-w-md mx-auto pt-12 sm:pt-20 text-center space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome to Training</h1>
          <p className="text-sm sm:text-base text-white/60">
            Let's set up your fitness profile to personalize your workouts.
          </p>
          <Link href="/member/training/onboarding">
            <Button className="w-full py-5 sm:py-6 text-base sm:text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pastelColors = [
    { bg: "from-amber-100 to-orange-100", text: "text-amber-900", icon: "bg-blue-200" },
    { bg: "from-purple-100 to-violet-100", text: "text-purple-900", icon: "bg-purple-200" },
    { bg: "from-rose-100 to-pink-100", text: "text-rose-900", icon: "bg-rose-200" },
    { bg: "from-cyan-100 to-teal-100", text: "text-cyan-900", icon: "bg-cyan-200" },
    { bg: "from-emerald-100 to-green-100", text: "text-emerald-900", icon: "bg-emerald-200" },
    { bg: "from-blue-100 to-indigo-100", text: "text-blue-900", icon: "bg-blue-200" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/50 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/member">
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold">Discover</h1>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-500 flex items-center justify-center text-xs sm:text-sm font-bold">
            {statsData?.currentStreak || 0}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
        {/* Continue Workout Card */}
        {currentSession?.session && (
          <Link href={`/member/training/workout/${currentSession.session.id}`}>
            <Card className="bg-gradient-to-br from-orange-500/20 to-rose-500/20 border-orange-500/30 overflow-hidden cursor-pointer hover:border-orange-500/50 transition">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-orange-500 text-white mb-2 text-xs">In Progress</Badge>
                    <h3 className="text-base sm:text-lg font-bold text-white capitalize">
                      {currentSession.session.target_muscle} Workout
                    </h3>
                    <p className="text-xs sm:text-sm text-white/60">
                      {currentSession.exercises?.length || 0} exercises
                    </p>
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-sm sm:text-base px-3 sm:px-4">
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-2.5 sm:p-4 text-center">
              <Flame className="w-4 h-4 sm:w-6 sm:h-6 text-orange-400 mx-auto mb-1" />
              <div className="text-base sm:text-2xl font-bold">{statsData?.weeklyCalories || 0}</div>
              <div className="text-[9px] sm:text-xs text-white/50 leading-tight">Calories</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-2.5 sm:p-4 text-center">
              <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400 mx-auto mb-1" />
              <div className="text-base sm:text-2xl font-bold">{statsData?.weeklyDurationMinutes || 0}m</div>
              <div className="text-[9px] sm:text-xs text-white/50 leading-tight">Time</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 hidden md:block">
            <CardContent className="p-3 sm:p-4 text-center">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1 sm:mb-2" />
              <div className="text-lg sm:text-2xl font-bold">{statsData?.weeklyWorkouts || 0}</div>
              <div className="text-[10px] sm:text-xs text-white/50">Workouts This Week</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 hidden md:block">
            <CardContent className="p-3 sm:p-4 text-center">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mx-auto mb-1 sm:mb-2" />
              <div className="text-lg sm:text-2xl font-bold">{muscleGroups.length}</div>
              <div className="text-[10px] sm:text-xs text-white/50">Muscle Groups</div>
            </CardContent>
          </Card>
        </div>

        {/* Popular Exercises Section */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Popular Exercises</h2>
            <Link href="/member/training/stats">
              <span className="text-xs sm:text-sm text-white/50 flex items-center gap-1 cursor-pointer hover:text-white/70">
                See more <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <Link href="/member/training/generate?muscle=chest">
              <Card className="bg-gradient-to-br from-rose-300/90 to-rose-400/90 border-0 overflow-hidden cursor-pointer hover:scale-105 transition">
                <CardContent className="p-3 sm:p-4 h-24 sm:h-32 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-lg font-bold text-rose-900">Gym</h3>
                    <h3 className="text-sm sm:text-lg font-bold text-rose-900">Workout</h3>
                  </div>
                  <div className="flex items-center gap-2 text-rose-800 text-xs sm:text-sm">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-rose-200" />
                    <span>All muscles</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/member/training/generate?muscle=abs">
              <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-0 overflow-hidden cursor-pointer hover:scale-105 transition">
                <CardContent className="p-3 sm:p-4 h-24 sm:h-32 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-lg font-bold text-white">Home</h3>
                    <h3 className="text-sm sm:text-lg font-bold text-white">Workout</h3>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-xs sm:text-sm">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-white/20" />
                    <span>Bodyweight</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/member/training/generate?muscle=back" className="hidden sm:block">
              <Card className="bg-gradient-to-br from-blue-400/90 to-blue-500/90 border-0 overflow-hidden cursor-pointer hover:scale-105 transition">
                <CardContent className="p-3 sm:p-4 h-24 sm:h-32 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-lg font-bold text-blue-900">Back</h3>
                    <h3 className="text-sm sm:text-lg font-bold text-blue-900">Training</h3>
                  </div>
                  <div className="flex items-center gap-2 text-blue-800 text-xs sm:text-sm">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-200" />
                    <span>Strength</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/member/training/generate?muscle=arms" className="hidden md:block">
              <Card className="bg-gradient-to-br from-amber-400/90 to-amber-500/90 border-0 overflow-hidden cursor-pointer hover:scale-105 transition">
                <CardContent className="p-3 sm:p-4 h-24 sm:h-32 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-lg font-bold text-amber-900">Arms</h3>
                    <h3 className="text-sm sm:text-lg font-bold text-amber-900">Workout</h3>
                  </div>
                  <div className="flex items-center gap-2 text-amber-800 text-xs sm:text-sm">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-amber-200" />
                    <span>Build muscle</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Training Session - Muscle Selection */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Training session</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-white/50">Loading muscles...</div>
            ) : (
              muscleGroups.map((muscle, index) => {
                const colorScheme = pastelColors[index % pastelColors.length];
                
                return (
                  <Link key={muscle.id} href={`/member/training/generate?muscle=${muscle.name}`}>
                    <Card 
                      className={`border-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition bg-gradient-to-r ${colorScheme.bg} relative`}
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-6 sm:h-8 opacity-30">
                        <svg viewBox="0 0 400 40" className="w-full h-full" preserveAspectRatio="none">
                          <path d="M0 40 Q100 10 200 25 T400 15 L400 40 Z" fill="currentColor" className="text-black/10" />
                        </svg>
                      </div>
                      <CardContent className="p-3 sm:p-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${colorScheme.icon}`} />
                          <div>
                            <h3 className={`text-sm sm:text-base font-bold ${colorScheme.text} capitalize`}>
                              {muscle.display_name}
                            </h3>
                            <p className={`text-xs sm:text-sm ${colorScheme.text} opacity-70`}>
                              {muscle.exercise_count} Exercise{muscle.exercise_count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-50 md:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2 sm:py-3">
          <Link href="/member">
            <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition p-2">
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </Link>
          <Link href="/member/training">
            <button className="flex flex-col items-center gap-1 text-orange-500 p-2">
              <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </Link>
          <Link href="/member/training/stats">
            <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition p-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </Link>
          <Link href="/member">
            <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition p-2">
              <Target className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
