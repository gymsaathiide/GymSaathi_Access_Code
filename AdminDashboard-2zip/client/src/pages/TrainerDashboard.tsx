import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Clipboard, UserCheck, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface TrainerStats {
  totalMembers: number;
  activeMembers: number;
  todayClasses: number;
  upcomingClasses: number;
  completedClasses: number;
  todayCheckIns: number;
  weeklyCheckIns: number;
  attendanceRate: number;
}

interface UpcomingClass {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  enrolledCount: number;
  capacity: number;
}

interface RecentCheckIn {
  id: string;
  memberName: string;
  checkInTime: string;
  status: 'in' | 'out';
}

export default function TrainerDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<TrainerStats>({
    queryKey: ['/api/trainer/stats'],
  });

  const { data: upcomingClasses = [] } = useQuery<UpcomingClass[]>({
    queryKey: ['/api/trainer/upcoming-classes'],
  });

  const { data: recentCheckIns = [] } = useQuery<RecentCheckIn[]>({
    queryKey: ['/api/trainer/recent-checkins'],
  });

  const todayClasses = stats?.todayClasses ?? 0;
  const upcomingCount = stats?.upcomingClasses ?? 0;
  const completedCount = stats?.completedClasses ?? 0;
  const totalMembers = stats?.totalMembers ?? 0;
  const activeMembers = stats?.activeMembers ?? 0;
  const todayCheckIns = stats?.todayCheckIns ?? 0;
  const attendanceRate = stats?.attendanceRate ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-trainer-title">Trainer Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {user?.name}! Manage your classes and members.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayClasses}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingCount} upcoming, {completedCount} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {activeMembers} active plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCheckIns}</div>
            <p className="text-xs text-muted-foreground">
              Member arrivals today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              This week's average
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Your classes for {format(new Date(), 'EEEE, MMMM d')}</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingClasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(cls.startTime), 'h:mm a')} - {format(new Date(cls.endTime), 'h:mm a')}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {cls.enrolledCount}/{cls.capacity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
            <CardDescription>Latest member activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clipboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent check-ins</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCheckIns.map((checkIn) => (
                  <div key={checkIn.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{checkIn.memberName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(checkIn.checkInTime), 'h:mm a')}
                      </p>
                    </div>
                    <Badge variant={checkIn.status === 'in' ? 'default' : 'secondary'}>
                      {checkIn.status === 'in' ? 'Checked In' : 'Checked Out'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
