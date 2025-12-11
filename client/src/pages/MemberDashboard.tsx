import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, ShoppingBag, User, QrCode, Clock, LogIn, LogOut, Timer, Loader2 } from 'lucide-react';
import QrScanner from '@/components/QrScanner';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

type TodayStatus = {
  status: 'not_checked_in' | 'in_gym' | 'checked_out';
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

export default function MemberDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);

  const { data: todayStatus, refetch: refetchStatus } = useQuery<TodayStatus>({
    queryKey: ['/api/member/attendance/today'],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: attendanceHistory } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/member/attendance/history'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ['/api/classes'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

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
    return classDate < now && !isWithinInterval(classDate, { start: monthStart, end: monthEnd });
  });

  const scheduledClassesThisMonth = classesThisMonth.filter((cls: any) => cls.status === 'scheduled');
  const upcomingClassesCount = scheduledClassesThisMonth.length;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/member/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Checked Out!',
        description: data.message || "You're checked out. See you again!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/member/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/attendance/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      if (error.code === 'NOT_IN_GYM') {
        toast({
          title: 'Not Checked In',
          description: "You are not currently checked in.",
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to check out',
          variant: 'destructive',
        });
      }
      refetchStatus();
    },
  });

  const isInGym = todayStatus?.status === 'in_gym';

  const handleScannerClose = () => {
    setScannerOpen(false);
    refetchStatus();
  };

  const handleCheckout = () => {
    checkoutMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-member-title">Member Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {user?.name}! Track your fitness journey.
          </p>
        </div>
        {isInGym ? (
          <Button
            size="lg"
            variant="destructive"
            onClick={handleCheckout}
            disabled={checkoutMutation.isPending}
            className="gap-2"
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
            Check Out
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => setScannerOpen(true)}
            className="gap-2"
          >
            <QrCode className="h-5 w-5" />
            Scan QR to Check In
          </Button>
        )}
      </div>

      {todayStatus && (
        <Card className={
          todayStatus.status === 'in_gym'
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : todayStatus.status === 'checked_out'
            ? todayStatus.record?.exitType === 'auto'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : ''
        }>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {todayStatus.status === 'in_gym' ? (
                <>
                  <LogIn className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 dark:text-green-400">Currently In Gym</span>
                </>
              ) : todayStatus.status === 'checked_out' ? (
                todayStatus.record?.exitType === 'auto' ? (
                  <>
                    <Timer className="h-5 w-5 text-orange-600" />
                    <span className="text-orange-700 dark:text-orange-400">Auto Checked Out</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-400">Checked Out</span>
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
                    {new Date(todayStatus.record.checkInTime).toLocaleTimeString()}
                  </span>
                </div>
                {todayStatus.record.checkOutTime && (
                  <div>
                    <span className="text-muted-foreground">Check-out: </span>
                    <span className="font-medium">
                      {new Date(todayStatus.record.checkOutTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {todayStatus.record.source === 'qr_scan' ? 'QR Scan' : 'Manual'}
                  </Badge>
                  {todayStatus.record.exitType === 'auto' && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                      Auto (3h limit)
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{todayStatus.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Expires in 23 days
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-classes-this-month">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-classes-count">
              {classesLoading
                ? '...'
                : classesThisMonth.length + ongoingClasses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {classesLoading
                ? 'Loading...'
                : ongoingClasses.length > 0
                  ? `${ongoingClasses.length} ongoing, ${scheduledClassesThisMonth.length} scheduled`
                  : upcomingClassesCount > 0
                    ? `${upcomingClassesCount} scheduled`
                    : format(monthStart, 'MMM d') + ' - ' + format(monthEnd, 'MMM d')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2.5kg</div>
            <p className="text-xs text-muted-foreground">
              Muscle gain this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shop Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              In transit
            </p>
          </CardContent>
        </Card>
      </div>

      {attendanceHistory && attendanceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Your gym visits from the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceHistory.slice(0, 7).map((record) => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">
                      {new Date(record.checkInTime).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.checkInTime).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {record.checkOutTime && (
                        <> - {new Date(record.checkOutTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {record.source === 'qr_scan' ? 'QR' : 'Manual'}
                    </Badge>
                    {record.exitType === 'auto' && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
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

      <Card>
        <CardHeader>
          <CardTitle>Workout Plan</CardTitle>
          <CardDescription>Your personalized training program</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Features coming soon: Class booking, shop, workout tracking, progress analytics, and more...
          </p>
        </CardContent>
      </Card>

      <QrScanner isOpen={scannerOpen} onClose={handleScannerClose} />
    </div>
  );
}