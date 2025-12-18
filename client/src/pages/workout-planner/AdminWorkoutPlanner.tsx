import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus, 
  Users, 
  Dumbbell, 
  Search,
  Edit,
  Trash2,
  Eye,
  ClipboardList,
  Target,
  TrendingUp,
  Library
} from "lucide-react";
import { format } from "date-fns";

type WorkoutPlan = {
  id: string;
  name: string;
  memberId: string;
  memberName: string;
  goal: string;
  difficulty: string;
  split: string;
  daysPerWeek: number;
  status: string;
  createdAt: string;
};

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipmentType: string;
  difficulty: string;
  defaultSets: number;
  defaultReps: string;
};

type Member = {
  id: string;
  name: string;
  email: string;
};

export default function AdminWorkoutPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("plans");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';

  const { data: workoutPlans, isLoading: loadingPlans } = useQuery<WorkoutPlan[]>({
    queryKey: ['/api/workout/admin/plans'],
    enabled: !!user,
  });

  const { data: exercises, isLoading: loadingExercises } = useQuery<Exercise[]>({
    queryKey: ['/api/workout/exercises'],
    enabled: !!user,
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ['/api/members'],
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/workout/admin/stats'],
    enabled: !!user,
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('DELETE', `/api/workout/admin/plans/${planId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout'] });
      toast({
        title: "Plan Deleted",
        description: "The workout plan has been removed.",
      });
    },
  });

  const filteredPlans = workoutPlans?.filter(plan => 
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.memberName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExercises = exercises?.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGoalLabel = (goal: string) => {
    const labels: Record<string, string> = {
      weight_loss: "Weight Loss",
      muscle_gain: "Muscle Gain",
      strength: "Strength",
      endurance: "Endurance",
      flexibility: "Flexibility",
      general_fitness: "General Fitness",
      sports_performance: "Sports Performance",
    };
    return labels[goal] || goal;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: "bg-green-500/20 text-green-300",
      intermediate: "bg-yellow-500/20 text-yellow-300",
      advanced: "bg-red-500/20 text-red-300",
    };
    return colors[difficulty] || "bg-gray-500/20 text-gray-300";
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500/20 text-green-300",
      paused: "bg-yellow-500/20 text-yellow-300",
      completed: "bg-blue-500/20 text-blue-300",
      archived: "bg-gray-500/20 text-gray-300",
    };
    return colors[status] || "bg-gray-500/20 text-gray-300";
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Workout Planner" 
          description={isAdmin ? "Manage workout plans and exercise library" : "Assign and track member workouts"} 
        />
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-orange-900/40 to-orange-950/20 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-100 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Active Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-400">
              {(stats as any)?.activePlans || workoutPlans?.filter(p => p.status === 'active').length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/20 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members with Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {(stats as any)?.membersWithPlans || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/40 to-green-950/20 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Workouts This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">
              {(stats as any)?.workoutsThisWeek || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/40 to-purple-950/20 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100 flex items-center gap-2">
              <Library className="h-4 w-4" />
              Total Exercises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-400">
              {exercises?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search plans or exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger 
            value="plans"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70"
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Workout Plans
          </TabsTrigger>
          <TabsTrigger 
            value="exercises"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70"
          >
            <Dumbbell className="h-4 w-4 mr-2" />
            Exercise Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <Card className="bg-card-dark border-white/10">
            <CardContent className="p-0">
              {loadingPlans ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : filteredPlans && filteredPlans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Plan Name</TableHead>
                      <TableHead className="text-white/60">Member</TableHead>
                      <TableHead className="text-white/60">Goal</TableHead>
                      <TableHead className="text-white/60">Difficulty</TableHead>
                      <TableHead className="text-white/60">Days/Week</TableHead>
                      <TableHead className="text-white/60">Status</TableHead>
                      <TableHead className="text-white/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{plan.name}</TableCell>
                        <TableCell className="text-white/80">{plan.memberName}</TableCell>
                        <TableCell>
                          <Badge className="bg-white/10 text-white/70">
                            {getGoalLabel(plan.goal)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDifficultyBadge(plan.difficulty)}>
                            {plan.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80">{plan.daysPerWeek}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(plan.status)}>
                            {plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4 text-white/60" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4 text-white/60" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => deletePlanMutation.mutate(plan.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-white/20" />
                  <h3 className="text-lg font-medium text-white mb-2">No Workout Plans</h3>
                  <p className="text-white/60 mb-4">Create your first workout plan to get started.</p>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="mt-4">
          <Card className="bg-card-dark border-white/10">
            <CardContent className="p-0">
              {loadingExercises ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : filteredExercises && filteredExercises.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Exercise Name</TableHead>
                      <TableHead className="text-white/60">Muscle Group</TableHead>
                      <TableHead className="text-white/60">Equipment</TableHead>
                      <TableHead className="text-white/60">Difficulty</TableHead>
                      <TableHead className="text-white/60">Default Sets</TableHead>
                      <TableHead className="text-white/60">Default Reps</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExercises.map((exercise) => (
                      <TableRow key={exercise.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{exercise.name}</TableCell>
                        <TableCell>
                          <Badge className="bg-orange-500/20 text-orange-300 capitalize">
                            {exercise.muscleGroup.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80 capitalize">
                          {exercise.equipmentType.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getDifficultyBadge(exercise.difficulty)}>
                            {exercise.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80">{exercise.defaultSets}</TableCell>
                        <TableCell className="text-white/80">{exercise.defaultReps}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 text-white/20" />
                  <h3 className="text-lg font-medium text-white mb-2">No Exercises Found</h3>
                  <p className="text-white/60">The exercise library is empty.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card-dark border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Create Workout Plan</DialogTitle>
            <DialogDescription className="text-white/60">
              Create a new workout plan for a member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Select Member</label>
              <Select>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Plan Name</label>
              <Input 
                placeholder="e.g., 4-Week Muscle Building" 
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Goal</label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="endurance">Endurance</SelectItem>
                    <SelectItem value="general_fitness">General Fitness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Difficulty</label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Days per Week</label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="4">4 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="6">6 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Duration (weeks)</label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 weeks</SelectItem>
                    <SelectItem value="8">8 weeks</SelectItem>
                    <SelectItem value="12">12 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600">
              Create Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
