import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassForm } from '@/components/ClassForm';
import { ClassTypeForm } from '@/components/ClassTypeForm';
import { BookingDialog } from '@/components/BookingDialog';
import { Plus, Calendar as CalendarIcon, Clock, Users, Trash2, Edit, CheckCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export default function Classes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classTypeDialogOpen, setClassTypeDialogOpen] = useState(false);
  const [classFormDialogOpen, setClassFormDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [filterClassType, setFilterClassType] = useState<string>('all');
  const [filterTrainer, setFilterTrainer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const canFetchTrainers = user?.role === 'admin' || user?.role === 'trainer';

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ['/api/classes'],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: classTypes = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/class-types'],
    refetchInterval: 10000,
  });

  const { data: trainers = [] } = useQuery<Array<{ id: string; userId: string; name: string }>>({
    queryKey: ['/api/trainers'],
    enabled: canFetchTrainers,
    refetchInterval: 10000,
  });

  const { data: myBookings = [] } = useQuery<any[]>({
    queryKey: ['/api/members', user?.id || '', 'bookings'],
    enabled: isMember && !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (classId: string) => {
      await apiRequest('DELETE', `/api/classes/${classId}`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Class deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'], exact: false });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredClasses = classes.filter((cls: any) => {
    if (filterClassType !== 'all' && cls.classTypeId !== filterClassType) return false;
    if (filterTrainer !== 'all' && cls.trainerId !== filterTrainer) return false;
    if (filterStatus !== 'all' && cls.status !== filterStatus) return false;
    return true;
  });

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const classesThisWeek = filteredClasses.filter((cls: any) => {
    const classDate = new Date(cls.startTime);
    return isWithinInterval(classDate, { start: weekStart, end: weekEnd });
  });

  const bookedClassIds = new Set(myBookings.map((b: any) => b.classId));
  const myBookedClassesThisWeek = classesThisWeek.filter((cls: any) => bookedClassIds.has(cls.id));

  const totalSpots = classesThisWeek.reduce((sum: number, cls: any) => sum + cls.capacity, 0);
  const bookedSpots = classesThisWeek.reduce((sum: number, cls: any) => sum + cls.bookedCount, 0);
  const availableSpots = totalSpots - bookedSpots;

  const getStatusColor = (cls: any) => {
    const classStart = new Date(cls.startTime);
    const classEnd = new Date(cls.endTime);
    
    if (cls.status === 'cancelled') return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (cls.bookedCount >= cls.capacity) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    if (now >= classStart && now <= classEnd) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (now > classEnd) return 'bg-muted text-muted-foreground border-muted';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  const getStatusBadge = (cls: any) => {
    const classStart = new Date(cls.startTime);
    const classEnd = new Date(cls.endTime);
    
    if (cls.status === 'cancelled') return <Badge variant="destructive">Cancelled</Badge>;
    if (cls.bookedCount >= cls.capacity) return <Badge className="bg-orange-500">Full</Badge>;
    if (now >= classStart && now <= classEnd) return <Badge className="bg-green-500">Ongoing</Badge>;
    if (now > classEnd) return <Badge variant="secondary">Completed</Badge>;
    return <Badge>Scheduled</Badge>;
  };

  const handleBookClass = (cls: any) => {
    setSelectedClass(cls);
    setBookingDialogOpen(true);
  };

  const handleEditClass = (cls: any) => {
    setSelectedClass(cls);
    setClassFormDialogOpen(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      deleteMutation.mutate(classId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Classes</h1>
          <p className="text-muted-foreground">Manage class schedules and bookings</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={classTypeDialogOpen} onOpenChange={setClassTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-class-type">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Class Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Class Type</DialogTitle>
                </DialogHeader>
                <ClassTypeForm 
                  onSuccess={() => {
                    setClassTypeDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/class-types'], exact: false });
                  }}
                  onCancel={() => setClassTypeDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={classFormDialogOpen && !selectedClass} onOpenChange={(open) => {
              setClassFormDialogOpen(open);
              if (!open) setSelectedClass(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-schedule-class">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Class</DialogTitle>
                </DialogHeader>
                <ClassForm 
                  onSuccess={() => {
                    setClassFormDialogOpen(false);
                    setSelectedClass(null);
                    queryClient.invalidateQueries({ queryKey: ['/api/classes'], exact: false });
                  }}
                  onCancel={() => {
                    setClassFormDialogOpen(false);
                    setSelectedClass(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-classes-this-week">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes This Week</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-classes-count">{classesThisWeek.length}</div>
            <p className="text-xs text-muted-foreground">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
            </p>
          </CardContent>
        </Card>

        {isMember && (
          <Card data-testid="card-my-bookings">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Bookings</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-bookings-count">{myBookedClassesThisWeek.length}</div>
              <p className="text-xs text-muted-foreground">Classes booked this week</p>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-available-spots">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Spots</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available-spots">{availableSpots}</div>
            <p className="text-xs text-muted-foreground">
              {bookedSpots} / {totalSpots} booked
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Class Schedule</CardTitle>
              <CardDescription>Browse and manage upcoming classes</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterClassType} onValueChange={setFilterClassType}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-class-type">
                  <SelectValue placeholder="All Class Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Class Types</SelectItem>
                  {classTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-trainer">
                  <SelectValue placeholder="All Trainers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainers.map((trainer: any) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {classesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No classes scheduled</h3>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Click "Schedule Class" to add a new class' : 'Check back later for new classes'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls: any) => {
                const isBooked = bookedClassIds.has(cls.id);
                const isFull = cls.bookedCount >= cls.capacity;
                const spotsLeft = cls.capacity - cls.bookedCount;

                return (
                  <Card 
                    key={cls.id} 
                    className={`border ${getStatusColor(cls)}`}
                    data-testid={`card-class-${cls.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg" data-testid="text-class-name">
                            {cls.classTypeName}
                          </h3>
                          {cls.trainerName && (
                            <p className="text-sm text-muted-foreground">
                              with {cls.trainerName}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(cls)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(cls.startTime), 'EEE, MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(cls.startTime), 'h:mm a')} - {format(new Date(cls.endTime), 'h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{cls.bookedCount} / {cls.capacity} booked</span>
                          {!isFull && spotsLeft <= 5 && (
                            <Badge variant="secondary" className="text-xs">
                              {spotsLeft} left
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isBooked && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Booked
                          </Badge>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditClass(cls)}
                              data-testid={`button-edit-${cls.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteClass(cls.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${cls.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {!isAdmin && (
                          <Button
                            size="sm"
                            className="flex-1"
                            variant={isBooked ? 'outline' : 'default'}
                            onClick={() => handleBookClass(cls)}
                            data-testid={`button-book-${cls.id}`}
                          >
                            {isBooked ? 'Manage Booking' : 'Book Class'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && classFormDialogOpen && (
        <Dialog open={classFormDialogOpen} onOpenChange={(open) => {
          setClassFormDialogOpen(open);
          if (!open) setSelectedClass(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
            </DialogHeader>
            <ClassForm 
              classData={selectedClass}
              onSuccess={() => {
                setClassFormDialogOpen(false);
                setSelectedClass(null);
                queryClient.invalidateQueries({ queryKey: ['/api/classes'], exact: false });
              }}
              onCancel={() => {
                setClassFormDialogOpen(false);
                setSelectedClass(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedClass && bookingDialogOpen && (
        <BookingDialog
          classData={selectedClass}
          isBooked={bookedClassIds.has(selectedClass.id)}
          open={bookingDialogOpen}
          onOpenChange={(open) => {
            setBookingDialogOpen(open);
            if (!open) setSelectedClass(null);
          }}
        />
      )}
    </div>
  );
}
