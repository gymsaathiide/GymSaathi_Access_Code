import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, TrendingUp, UserCheck } from "lucide-react";
import ClassAttendanceTable from "../components/ClassAttendanceTable";
import GymCheckIn from "../components/GymCheckIn";
import QrAttendanceManager from "../components/QrAttendanceManager";
import { PageHeader } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";

type AttendanceStats = {
  currentlyInGym: number;
  totalCheckIns: number;
  uniqueMembers: number;
};

export default function Attendance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("gym");

  const { data: stats } = useQuery<AttendanceStats>({
    queryKey: ["/api/attendance/stats", { period: "today" }],
    enabled: user?.role === "admin" || user?.role === "trainer",
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  if (!user) return null;

  return (
    <div className="space-y-6 p-5 pb-20">
      <PageHeader
        title="Attendance"
        description="Track member attendance for classes and gym access"
      />

      {(user.role === "admin" || user.role === "trainer") && stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card-dark border-white/5">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">
                Currently In Gym
              </CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold text-white"
                data-testid="text-currently-in-gym"
              >
                {stats.currentlyInGym}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card-dark border-white/5">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">
                Check-ins Today
              </CardTitle>
              <UserCheck className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold text-white"
                data-testid="text-total-checkins"
              >
                {stats.totalCheckIns}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card-dark border-white/5">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">
                Unique Members
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold text-white"
                data-testid="text-unique-members"
              >
                {stats.uniqueMembers}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user.role === "admin" && <QrAttendanceManager />}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList
          className="bg-white/5 border-white/10"
          data-testid="tabs-attendance"
        >
          <TabsTrigger
            value="gym"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70"
            data-testid="tab-gym-access"
          >
            <Users className="mr-2 h-4 w-4" />
            Gym Access
          </TabsTrigger>
          {(user.role === "admin" || user.role === "trainer") && (
            <TabsTrigger
              value="class"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70"
              data-testid="tab-class-attendance"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Class Attendance
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="gym" className="space-y-4">
          <GymCheckIn />
        </TabsContent>

        {(user.role === "admin" || user.role === "trainer") && (
          <TabsContent value="class" className="space-y-4">
            <ClassAttendanceTable />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
