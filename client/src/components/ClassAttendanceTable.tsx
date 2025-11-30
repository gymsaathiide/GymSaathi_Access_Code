import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late';

type Class = {
  id: string;
  classTypeName: string;
  startTime: string;
};

type Booking = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
};

type AttendanceRecord = {
  memberId: string;
  status: AttendanceStatus;
};

export default function ClassAttendanceTable() {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
  });

  const { data: bookings, isLoading: loadingBookings } = useQuery<Booking[]>({
    queryKey: ['/api/classes', selectedClassId, 'bookings'],
    enabled: !!selectedClassId,
  });

  const { data: existingAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/classes', selectedClassId, 'attendance'],
    enabled: !!selectedClassId,
  });

  const selectedClass = classes?.find((c) => c.id === selectedClassId);

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: { memberId: string; status: AttendanceStatus }) => {
      const response = await fetch(`/api/classes/${selectedClassId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark attendance');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'attendance'] });
      toast({
        title: 'Success',
        description: 'Attendance marked successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
        variant: 'destructive',
      });
    },
  });

  const handleSaveAttendance = async () => {
    if (!selectedClassId || Object.keys(attendance).length === 0) {
      toast({
        title: 'Error',
        description: 'Please mark attendance for at least one member',
        variant: 'destructive',
      });
      return;
    }

    const promises = Object.entries(attendance).map(([memberId, status]) =>
      markAttendanceMutation.mutateAsync({ memberId, status })
    );

    try {
      await Promise.all(promises);
      setAttendance({});
    } catch (error) {
    }
  };

  const handleToggleAttendance = (memberId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: prev[memberId] === status ? 'absent' : status,
    }));
  };

  const getAttendanceStatus = (memberId: string): AttendanceStatus => {
    if (attendance[memberId]) {
      return attendance[memberId];
    }
    const existing = existingAttendance?.find((a: any) => a.memberId === memberId);
    return existing?.status || 'absent';
  };

  const stats = {
    total: bookings?.length || 0,
    present: bookings?.filter((b: any) => {
      const status = getAttendanceStatus(b.memberId);
      return status === 'present' || status === 'late';
    }).length || 0,
    absent: bookings?.filter((b: any) => getAttendanceStatus(b.memberId) === 'absent').length || 0,
  };

  const todayClasses = classes?.filter((c: any) => {
    const classDate = new Date(c.startTime);
    const today = new Date();
    return classDate.toDateString() === today.toDateString();
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Class Attendance</CardTitle>
          <CardDescription>Mark attendance for scheduled classes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger data-testid="select-class">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {loadingClasses ? (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              ) : todayClasses && todayClasses.length > 0 ? (
                todayClasses.map((classItem: any) => (
                  <SelectItem key={classItem.id} value={classItem.id} data-testid={`select-class-${classItem.id}`}>
                    {classItem.classTypeName} - {format(new Date(classItem.startTime), 'MMM dd, h:mm a')}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No classes scheduled for today
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedClass && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Total Booked</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-total-booked">
                  {stats.total}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Present</span>
                </div>
                <div className="text-2xl font-bold text-green-600" data-testid="text-present">
                  {stats.present}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Absent</span>
                </div>
                <div className="text-2xl font-bold text-red-600" data-testid="text-absent">
                  {stats.absent}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClassId && bookings && (
        <Card>
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>Check members as present, late, or leave as absent</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBookings ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : bookings.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking: any) => {
                        const status = getAttendanceStatus(booking.memberId);
                        return (
                          <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                            <TableCell className="font-medium">{booking.memberName}</TableCell>
                            <TableCell>{booking.memberEmail}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={status === 'present'}
                                onCheckedChange={() => handleToggleAttendance(booking.memberId, 'present')}
                                data-testid={`checkbox-present-${booking.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={status === 'late'}
                                onCheckedChange={() => handleToggleAttendance(booking.memberId, 'late')}
                                data-testid={`checkbox-late-${booking.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              {status === 'present' && (
                                <Badge variant="default" data-testid={`badge-status-${booking.id}`}>
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Present
                                </Badge>
                              )}
                              {status === 'late' && (
                                <Badge variant="secondary" data-testid={`badge-status-${booking.id}`}>
                                  <Clock className="mr-1 h-3 w-3" />
                                  Late
                                </Badge>
                              )}
                              {status === 'absent' && (
                                <Badge variant="outline" data-testid={`badge-status-${booking.id}`}>
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Absent
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAttendance}
                    disabled={markAttendanceMutation.isPending || Object.keys(attendance).length === 0}
                    data-testid="button-save-attendance"
                  >
                    Save Attendance
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No bookings for this class
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
