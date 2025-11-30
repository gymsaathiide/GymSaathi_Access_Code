import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Clock, QrCode, UserCheck, Users } from 'lucide-react';
import { format } from 'date-fns';

type Member = {
  id: string;
  name: string;
  email: string;
};

type AttendanceRecord = {
  id: string;
  memberId: string;
  memberName: string;
  checkInTime: string;
  checkOutTime: string | null;
  status?: string;
  exitType?: string;
  source?: string;
};

export default function GymCheckIn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const isStaff = user?.role === 'admin' || user?.role === 'trainer';

  const { data: members, isLoading: loadingMembers } = useQuery<Member[]>({
    queryKey: ['/api/members'],
    enabled: isStaff,
  });

  const { data: todayAttendance, isLoading: loadingAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/today'],
    enabled: isStaff,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: { action: 'checkIn'; memberId?: string }) => {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record attendance');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'], exact: false });
      toast({
        title: 'Success',
        description: 'Member checked in successfully',
      });
      setSelectedMemberId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record attendance',
        variant: 'destructive',
      });
    },
  });

  const handleCheckIn = () => {
    if (!selectedMemberId) {
      toast({
        title: 'Error',
        description: 'Please select a member',
        variant: 'destructive',
      });
      return;
    }
    checkInMutation.mutate({ action: 'checkIn', memberId: selectedMemberId });
  };

  const currentlyInGym = todayAttendance?.filter(r => r.status === 'in').length || 0;
  const totalCheckIns = todayAttendance?.length || 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently In Gym</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentlyInGym}</div>
            <p className="text-xs text-muted-foreground">Active members right now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-Ins Today</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCheckIns}</div>
            <p className="text-xs text-muted-foreground">Total visits today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual Check-In</CardTitle>
          <CardDescription>Check in members manually (for edge cases)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="flex-1" data-testid="select-member">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {loadingMembers ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  members?.map((member: any) => (
                    <SelectItem key={member.id} value={member.id} data-testid={`select-member-${member.id}`}>
                      {member.name} - {member.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleCheckIn}
              disabled={!selectedMemberId || checkInMutation.isPending}
              data-testid="button-checkin-member"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Check In
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
          <CardDescription>
            Live view of members checked in today (auto-refreshes every 5 seconds)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAttendance ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : todayAttendance && todayAttendance.length > 0 ? (
            <div className="rounded-md border">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Check-In Time</TableHead>
                      <TableHead>Check-Out Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayAttendance.map((record: any) => (
                      <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                        <TableCell className="font-medium">{record.memberName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(record.checkInTime), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.checkOutTime ? (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(record.checkOutTime), 'h:mm a')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.status === 'in' ? (
                            <Badge variant="default" data-testid={`badge-status-${record.id}`}>In Gym</Badge>
                          ) : record.exitType === 'auto' ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700" data-testid={`badge-status-${record.id}`}>
                              Auto checked-out
                            </Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-status-${record.id}`}>Checked Out</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center">
                                {record.source === 'qr_scan' ? (
                                  <QrCode className="h-4 w-4 text-primary" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {record.source === 'qr_scan' ? 'QR Scan' : 'Manual Check-in'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No check-ins today
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
