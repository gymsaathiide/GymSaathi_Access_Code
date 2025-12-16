import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  ShoppingBag,
  User,
  QrCode,
  Clock,
  LogIn,
  LogOut,
  Timer,
  Loader2,
  Utensils,
  ChevronRight,
  Flame,
  Sparkles,
  Dumbbell,
} from "lucide-react";
import QrScanner from "@/components/QrScanner";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { Link } from "wouter";

type TodayStatus = {
  status: "not_checked_in" | "in_gym" | "checked_out";
  message: string;
  record?: {
    id: string;
    checkInTime: string;
    checkOutTime?: string;
    status: string;
    exitType?: string;
    source: string;
  };
};

type AttendanceRecord = {
  id: string;
  gymId: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  exitType?: string;
  source: string;
  createdAt: string;
};

type DietPlanItem = {
  id: string;
  dayNumber: number;
  mealType: "breakfast" | "lunch" | "snack" | "dinner";
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  isFavorite: boolean;
  isExcluded: boolean;
};

type DietPlan = {
  id: string;
  name: string;
  goal: string;
  durationDays: number;
  targetCalories: number;
  dietaryPreference: string;
  items: DietPlanItem[];
};

export default function MemberDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);

  const { data: todayStatus, refetch: refetchStatus } = useQuery<TodayStatus>({
    queryKey: ["/api/member/attendance/today"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: attendanceHistory } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/member/attendance/history"],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: dietPlanData, isLoading: dietPlanLoading } = useQuery<{
    plan: DietPlan | null;
  }>({
    queryKey: ["active-diet-plan"],
    queryFn: async () => {
      const res = await fetch("/api/diet-planner/active-plan", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch diet plan");
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const activeDietPlan = dietPlanData?.plan;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const classesThisMonth = classes.filter((cls: any) => {
    const classDate = new Date(cls.startTime);
    return isWithinInterval(classDate, { start: monthStart, end: monthEnd });
  });

  // Define ongoing classes: classes whose start time is in the past
  // AND are NOT within the current month's `classesThisMonth` filter.
  // This avoids double counting and addresses the user's issue with a past class not showing.
  const ongoingClasses = classes.filter((cls: any) => {
    const classDate = new Date(cls.startTime);
    return (
      classDate < now &&
      !isWithinInterval(classDate, { start: monthStart, end: monthEnd })
    );
  });

  const scheduledClassesThisMonth = classesThisMonth.filter(
    (cls: any) => cls.status === "scheduled",
  );
  const upcomingClassesCount = scheduledClassesThisMonth.length;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/member/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Checked Out!",
        description: data.message || "You're checked out. See you again!",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/member/attendance/today"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/member/attendance/history"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any) => {
      if (error.code === "NOT_IN_GYM") {
        toast({
          title: "Not Checked In",
          description: "You are not currently checked in.",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to check out",
          variant: "destructive",
        });
      }
      refetchStatus();
    },
  });

  const isInGym = todayStatus?.status === "in_gym";

  const handleScannerClose = () => {
    setScannerOpen(false);
    refetchStatus();
  };

  const handleCheckout = () => {
    checkoutMutation.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-6 sm:p-5 sm:pb-20 p-5 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 ">
        <div className="min-w-0 ">
          <h1
            className="text-xl xs:text-2xl sm:text-3xl font-bold truncate"
            data-testid="text-member-title"
          >
            Member Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            Welcome, {user?.name}! Track your fitness journey.
          </p>
        </div>
        {isInGym ? (
          <Button
            size="default"
            variant="destructive"
            onClick={handleCheckout}
            disabled={checkoutMutation.isPending}
            className="gap-2 w-full sm:w-auto text-sm sm:text-base"
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            Check Out
          </Button>
        ) : (
          <Button
            size="default"
            onClick={() => setScannerOpen(true)}
            className="gap-2 w-full sm:w-auto text-sm sm:text-base"
          >
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline">Scan QR to Check In</span>
            <span className="xs:hidden">Check In</span>
          </Button>
        )}
      </div>

      {todayStatus && (
        <Card
          className={
            todayStatus.status === "in_gym"
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : todayStatus.status === "checked_out"
                ? todayStatus.record?.exitType === "auto"
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                  : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : ""
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {todayStatus.status === "in_gym" ? (
                <>
                  <LogIn className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 dark:text-green-400">
                    Currently In Gym
                  </span>
                </>
              ) : todayStatus.status === "checked_out" ? (
                todayStatus.record?.exitType === "auto" ? (
                  <>
                    <Timer className="h-5 w-5 text-orange-600" />
                    <span className="text-orange-700 dark:text-orange-400">
                      Auto Checked Out
                    </span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-400">
                      Checked Out
                    </span>
                  </>
                )
              ) : (
                <>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span>Not Checked In Today</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayStatus.record ? (
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Check-in: </span>
                  <span className="font-medium">
                    {new Date(
                      todayStatus.record.checkInTime,
                    ).toLocaleTimeString()}
                  </span>
                </div>
                {todayStatus.record.checkOutTime && (
                  <div>
                    <span className="text-muted-foreground">Check-out: </span>
                    <span className="font-medium">
                      {new Date(
                        todayStatus.record.checkOutTime,
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {todayStatus.record.source === "qr_scan"
                      ? "QR Scan"
                      : "Manual"}
                  </Badge>
                  {todayStatus.record.exitType === "auto" && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-orange-100 text-orange-700"
                    >
                      Auto (3h limit)
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {todayStatus.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Membership
            </CardTitle>
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">Active</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Expires in 23 days
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-classes-this-month" className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Classes This Month
            </CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div
              className="text-lg sm:text-2xl font-bold"
              data-testid="text-classes-count"
            >
              {classesLoading
                ? "..."
                : classesThisMonth.length + ongoingClasses.length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
              {classesLoading
                ? "Loading..."
                : ongoingClasses.length > 0
                  ? `${ongoingClasses.length} ongoing, ${scheduledClassesThisMonth.length} scheduled`
                  : upcomingClassesCount > 0
                    ? `${upcomingClassesCount} scheduled`
                    : format(monthStart, "MMM d") +
                      " - " +
                      format(monthEnd, "MMM d")}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Progress
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">+2.5kg</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Muscle gain this month
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Shop Orders
            </CardTitle>
            <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">2</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              In transit
            </p>
          </CardContent>
        </Card>
      </div>

      {attendanceHistory && attendanceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>
              Your gym visits from the past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceHistory.slice(0, 7).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(record.checkInTime).toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        },
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.checkInTime).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                      {record.checkOutTime && (
                        <>
                          {" "}
                          -{" "}
                          {new Date(record.checkOutTime).toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {record.source === "qr_scan" ? "QR" : "Manual"}
                    </Badge>
                    {record.exitType === "auto" && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-orange-100 text-orange-700"
                      >
                        Auto
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
              <CardTitle className="text-sm sm:text-base truncate">
                My Diet Plan
              </CardTitle>
            </div>
            {activeDietPlan && (
              <Link href="/member/diet-planner/ai-planner">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-orange-500 hover:text-orange-600 text-xs sm:text-sm px-2 sm:px-3 h-8"
                >
                  <span className="hidden xs:inline">View Full Plan</span>
                  <span className="xs:hidden">View</span>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            )}
          </div>
          {activeDietPlan && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
              <Badge
                variant="outline"
                className="text-[10px] sm:text-xs px-1.5 sm:px-2"
              >
                {activeDietPlan.goal
                  .replace("_", " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
              <span className="text-[10px] sm:text-xs">
                {activeDietPlan.durationDays} days
              </span>
              <span className="text-orange-500 font-medium text-[10px] sm:text-xs">
                {activeDietPlan.targetCalories} kcal/day
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          {dietPlanLoading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeDietPlan ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                Today's Meals (Day 1)
              </div>
              <div className="grid gap-2 sm:gap-3">
                {activeDietPlan.items
                  .filter((item) => item.dayNumber === 1)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border ${
                        item.isExcluded
                          ? "bg-red-500/10 border-red-500/30 opacity-60"
                          : "bg-muted/50 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                            item.category === "veg"
                              ? "bg-green-500"
                              : item.category === "eggetarian"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground capitalize">
                              {item.mealType}
                            </span>
                            {item.isFavorite && (
                              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <p
                            className={`font-medium text-xs sm:text-sm truncate ${item.isExcluded ? "line-through" : ""}`}
                          >
                            {item.mealName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm flex-shrink-0 ml-2">
                        <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-500" />
                        <span className="font-medium">{item.calories}</span>
                        <span className="text-muted-foreground text-[10px] sm:text-xs hidden xs:inline">
                          kcal
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Day 1 Total
                </span>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                  <span className="font-bold text-sm sm:text-base">
                    {activeDietPlan.items
                      .filter(
                        (item) => item.dayNumber === 1 && !item.isExcluded,
                      )
                      .reduce(
                        (sum, item) => sum + (Number(item.calories) || 0),
                        0,
                      )}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    kcal
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 sm:py-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Utensils className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">
                No Diet Plan Yet
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
                Get a personalized meal plan based on your fitness goals
              </p>
              <Link href="/member/diet-planner/ai-planner">
                <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-sm sm:text-base h-9 sm:h-10 px-4 sm:px-6">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Create My Plan
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Section */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-orange-500/20">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
              <CardTitle className="text-sm sm:text-base truncate">
                Training Sessions
              </CardTitle>
            </div>
            <Link href="/member/training">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-orange-500 hover:text-orange-600 text-xs sm:text-sm px-2 sm:px-3 h-8"
              >
                <span className="hidden xs:inline">Start Training</span>
                <span className="xs:hidden">Start</span>
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="text-center py-4 sm:py-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Dumbbell className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            </div>
            <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">
              Muscle-Based Training
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
              Get personalized workout sessions targeting specific muscle groups
            </p>
            <Link href="/member/training">
              <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-sm sm:text-base h-9 sm:h-10 px-4 sm:px-6">
                <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Start Workout
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <QrScanner isOpen={scannerOpen} onClose={handleScannerClose} />
    </div>
  );
}
