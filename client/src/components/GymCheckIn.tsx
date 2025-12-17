import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { LogIn, LogOut, Clock, QrCode, UserCheck, Users, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

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

type TrainerAttendanceRecord = {
  id: string;
  trainerId: string;
  trainerName: string;
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
  const [activeTab, setActiveTab] = useState<string>('members');

  const isStaff = user?.role === 'admin' || user?.role === 'trainer';
  const isAdmin = user?.role === 'admin';

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

  const { data: trainerAttendance, isLoading: loadingTrainerAttendance } = useQuery<TrainerAttendanceRecord[]>({
    queryKey: ['/api/admin/trainer-attendance/today'],
    enabled: isAdmin,
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

  const checkoutMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest('POST', `/api/admin/attendance/checkout/member/${memberId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'], exact: false });
      toast({
        title: 'Success',
        description: 'Member checked out successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out member',
        variant: 'destructive',
      });
    },
  });

  const checkoutTrainerMutation = useMutation({
    mutationFn: async (trainerId: string) => {
      const response = await apiRequest('POST', `/api/admin/attendance/checkout/trainer/${trainerId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-attendance'], exact: false });
      toast({
        title: 'Success',
        description: 'Trainer checked out successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out trainer',
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
  const trainersInGym = trainerAttendance?.filter(r => r.status === 'in').length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-900/40 to-green-950/20 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Members In Gym</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-full">
              <Users className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{currentlyInGym}</div>
            <p className="text-xs text-green-200/60">Active members right now</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900/40 to-orange-950/20 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">Trainers On Duty</CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-full">
              <Dumbbell className="h-4 w-4 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">{trainersInGym}</div>
            <p className="text-xs text-orange-200/60">Active trainers right now</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/20 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Check-Ins Today</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-full">
              <LogIn className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{totalCheckIns}</div>
            <p className="text-xs text-blue-200/60">Total member visits today</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card-dark border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Manual Check-In</CardTitle>
          <CardDescription className="text-white/60">Check in members manually (for edge cases)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="flex-1 bg-white/5 border-white/10" data-testid="select-member">
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
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-checkin-member"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Check In
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card-dark border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Today's Attendance</CardTitle>
          <CardDescription className="text-white/60">
            Live view of people checked in today (auto-refreshes every 5 seconds)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 bg-white/5 border border-white/10 p-1">
                <TabsTrigger 
                  value="members" 
                  className="gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white text-white/70"
                >
                  <Users className="h-4 w-4" />
                  Members ({currentlyInGym} in gym)
                </TabsTrigger>
                <TabsTrigger 
                  value="trainers" 
                  className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70"
                >
                  <Dumbbell className="h-4 w-4" />
                  Trainers ({trainersInGym} on duty)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members">
                {loadingAttendance ? (
                  <div className="text-center py-8 text-white/60">Loading...</div>
                ) : todayAttendance && todayAttendance.length > 0 ? (
                  <div className="rounded-lg border border-green-500/20 bg-green-950/10 overflow-hidden">
                    <div className="px-4 py-3 bg-green-500/10 border-b border-green-500/20">
                      <h3 className="text-sm font-medium text-green-300 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Member Attendance Log
                      </h3>
                    </div>
                    <TooltipProvider>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-green-500/20 hover:bg-green-500/5">
                            <TableHead className="text-green-200">Member</TableHead>
                            <TableHead className="text-green-200">Check-In</TableHead>
                            <TableHead className="text-green-200">Check-Out</TableHead>
                            <TableHead className="text-green-200">Status</TableHead>
                            <TableHead className="text-green-200">Source</TableHead>
                            <TableHead className="text-green-200">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {todayAttendance.map((record: any) => (
                            <TableRow key={record.id} className="border-green-500/10 hover:bg-green-500/5" data-testid={`row-attendance-${record.id}`}>
                              <TableCell className="font-medium text-white">{record.memberName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-white/80">
                                  <Clock className="h-4 w-4 text-green-400" />
                                  {format(new Date(record.checkInTime), 'h:mm a')}
                                </div>
                              </TableCell>
                              <TableCell>
                                {record.checkOutTime ? (
                                  <div className="flex items-center gap-2 text-white/80">
                                    <Clock className="h-4 w-4 text-green-400" />
                                    {format(new Date(record.checkOutTime), 'h:mm a')}
                                  </div>
                                ) : (
                                  <span className="text-white/40">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {record.status === 'in' ? (
                                  <Badge className="bg-green-500 text-white hover:bg-green-600" data-testid={`badge-status-${record.id}`}>In Gym</Badge>
                                ) : record.exitType === 'auto' ? (
                                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30" data-testid={`badge-status-${record.id}`}>
                                    Auto checked-out
                                  </Badge>
                                ) : (
                                  <Badge className="bg-white/10 text-white/70" data-testid={`badge-status-${record.id}`}>Checked Out</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center">
                                      {record.source === 'qr_scan' ? (
                                        <QrCode className="h-4 w-4 text-green-400" />
                                      ) : (
                                        <UserCheck className="h-4 w-4 text-white/50" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {record.source === 'qr_scan' ? 'QR Scan' : 'Manual Check-in'}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                {record.status === 'in' && (
                                  <Button
                                    size="sm"
                                    onClick={() => checkoutMemberMutation.mutate(record.memberId)}
                                    disabled={checkoutMemberMutation.isPending}
                                    className="gap-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                                  >
                                    <LogOut className="h-3 w-3" />
                                    Check Out
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/60 bg-green-950/10 rounded-lg border border-green-500/20">
                    <Users className="h-12 w-12 mx-auto mb-3 text-green-400/40" />
                    <p className="text-sm">No member check-ins today</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trainers">
                {loadingTrainerAttendance ? (
                  <div className="text-center py-8 text-white/60">Loading...</div>
                ) : trainerAttendance && trainerAttendance.length > 0 ? (
                  <div className="rounded-lg border border-orange-500/20 bg-orange-950/10 overflow-hidden">
                    <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20">
                      <h3 className="text-sm font-medium text-orange-300 flex items-center gap-2">
                        <Dumbbell className="h-4 w-4" />
                        Trainer Attendance Log
                      </h3>
                    </div>
                    <TooltipProvider>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-orange-500/20 hover:bg-orange-500/5">
                            <TableHead className="text-orange-200">Trainer</TableHead>
                            <TableHead className="text-orange-200">Check-In</TableHead>
                            <TableHead className="text-orange-200">Check-Out</TableHead>
                            <TableHead className="text-orange-200">Status</TableHead>
                            <TableHead className="text-orange-200">Source</TableHead>
                            <TableHead className="text-orange-200">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trainerAttendance.map((record: any) => (
                            <TableRow key={record.id} className="border-orange-500/10 hover:bg-orange-500/5" data-testid={`row-trainer-attendance-${record.id}`}>
                              <TableCell className="font-medium text-white">{record.trainerName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-white/80">
                                  <Clock className="h-4 w-4 text-orange-400" />
                                  {format(new Date(record.checkInTime), 'h:mm a')}
                                </div>
                              </TableCell>
                              <TableCell>
                                {record.checkOutTime ? (
                                  <div className="flex items-center gap-2 text-white/80">
                                    <Clock className="h-4 w-4 text-orange-400" />
                                    {format(new Date(record.checkOutTime), 'h:mm a')}
                                  </div>
                                ) : (
                                  <span className="text-white/40">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {record.status === 'in' ? (
                                  <Badge className="bg-orange-500 text-white hover:bg-orange-600">On Duty</Badge>
                                ) : record.exitType === 'auto' ? (
                                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Auto checked-out
                                  </Badge>
                                ) : (
                                  <Badge className="bg-white/10 text-white/70">Off Duty</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center">
                                      {record.source === 'qr_scan' ? (
                                        <QrCode className="h-4 w-4 text-orange-400" />
                                      ) : (
                                        <UserCheck className="h-4 w-4 text-white/50" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {record.source === 'qr_scan' ? 'QR Scan' : 'Manual Check-in'}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                {record.status === 'in' && (
                                  <Button
                                    size="sm"
                                    onClick={() => checkoutTrainerMutation.mutate(record.trainerId)}
                                    disabled={checkoutTrainerMutation.isPending}
                                    className="gap-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                                  >
                                    <LogOut className="h-3 w-3" />
                                    Check Out
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/60 bg-orange-950/10 rounded-lg border border-orange-500/20">
                    <Dumbbell className="h-12 w-12 mx-auto mb-3 text-orange-400/40" />
                    <p className="text-sm">No trainer check-ins today</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            /* Non-admin view - just show member attendance */
            loadingAttendance ? (
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
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
