import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Check,
  Flame,
  Dumbbell,
  Heart,
  User,
  Users,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4;
type Gender = "male" | "female" | "other" | "prefer_not_to_say";
type Goal = "lose_weight" | "gain_muscle" | "get_fitter";
type FitnessLevel = "beginner" | "intermediate" | "expert";

const muscleGroups = [
  { id: "abs", label: "Abs", color: "#FF6B6B" },
  { id: "chest", label: "Chest", color: "#4ECDC4" },
  { id: "back", label: "Back", color: "#45B7D1" },
  { id: "shoulders", label: "Shoulders", color: "#96CEB4" },
  { id: "arms", label: "Arms", color: "#FFEAA7" },
  { id: "quads", label: "Quads", color: "#DDA0DD" },
  { id: "hamstrings", label: "Hamstrings", color: "#98D8C8" },
  { id: "glutes", label: "Glutes", color: "#F7DC6F" },
  { id: "calves", label: "Calves", color: "#BB8FCE" },
  { id: "hip_flexor", label: "Hip Flexor", color: "#85C1E9" },
  { id: "neck", label: "Neck", color: "#F8B500" },
];

export default function TrainingOnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/training/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gender,
          goal,
          focusMuscles,
          fitnessLevel,
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-profile"] });
      toast({
        title: "Profile saved!",
        description: "Your workout profile has been set up.",
      });
      setLocation("/member/training");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleMuscle = (muscleId: string) => {
    setFocusMuscles((prev) =>
      prev.includes(muscleId)
        ? prev.filter((m) => m !== muscleId)
        : [...prev, muscleId]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return gender !== null;
      case 2: return goal !== null;
      case 3: return focusMuscles.length > 0;
      case 4: return fitnessLevel !== null;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as Step);
    } else {
      saveProfileMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      setLocation("/member/training");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f1419] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/50 border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={handleBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Set your goal</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                s <= step ? "bg-white" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step 1: Gender */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What's your gender?</h2>
              <p className="text-white/60">This helps us personalize your experience</p>
            </div>

            <div className="space-y-3 mt-8">
              {[
                { id: "male", label: "Male", icon: User },
                { id: "female", label: "Female", icon: User },
                { id: "other", label: "Other", icon: Users },
                { id: "prefer_not_to_say", label: "Prefer not to say", icon: User },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = gender === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setGender(option.id as Gender)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-white/60" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What you goals Exercise?</h2>
              <p className="text-white/60">Let's define you goals and will help you to achieve it</p>
            </div>

            <div className="space-y-3 mt-8">
              {[
                { id: "lose_weight", label: "Loss weight", desc: "Burn Calories & Get Ideal boody", icon: Flame },
                { id: "gain_muscle", label: "Gain Muscle", desc: "Build mass & Strenght", icon: Dumbbell },
                { id: "get_fitter", label: "Get Fitter", desc: "Feel more healty", icon: Heart },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = goal === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setGoal(option.id as Goal)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-sm text-white/50">{option.desc}</div>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-orange-500' : 'bg-white/10'}`}>
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Focus Areas */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Focus Areas</h2>
              <p className="text-white/60">Select the muscles you want to focus on</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              {muscleGroups.map((muscle) => {
                const isSelected = focusMuscles.includes(muscle.id);
                return (
                  <button
                    key={muscle.id}
                    onClick={() => toggleMuscle(muscle.id)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: muscle.color + "30" }}
                    >
                      <Target className="w-5 h-5" style={{ color: muscle.color }} />
                    </div>
                    <span className="text-sm font-medium">{muscle.label}</span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Fitness Level */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What's Your fitness goal</h2>
              <p className="text-white/60">The following is the training we choose based on your current condition</p>
            </div>

            <div className="space-y-3 mt-8">
              {[
                { id: "beginner", label: "Beginner", desc: "New to fitness", color: "#4ECDC4" },
                { id: "intermediate", label: "Intermediate", desc: "6+ months experience", color: "#FFA500" },
                { id: "expert", label: "Expert", desc: "Advanced athlete", color: "#2ECDA7" },
              ].map((level) => {
                const isSelected = fitnessLevel === level.id;
                return (
                  <button
                    key={level.id}
                    onClick={() => setFitnessLevel(level.id as FitnessLevel)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: level.color + "30" }}
                      >
                        <Dumbbell className="w-5 h-5" style={{ color: level.color }} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{level.label}</div>
                        <div className="text-sm text-white/50">{level.desc}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 py-6 border-white/20 bg-white/5 hover:bg-white/10"
            >
              Previous
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saveProfileMutation.isPending}
            className="flex-1 py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
          >
            {saveProfileMutation.isPending
              ? "Saving..."
              : step === 4
              ? "Complete"
              : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
