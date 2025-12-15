/*  
===========================================================
FINAL F3 THEME + FB2 FILTER BAR IMPLEMENTATION
Neon Dark + Orange Gradient Headers + White Inputs
===========================================================
*/

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  Dialog,
  DialogContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import { ClassForm } from "@/components/ClassForm";
import { ClassTypeForm } from "@/components/ClassTypeForm";
import { BookingDialog } from "@/components/BookingDialog";

import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Trash2,
  Edit,
  CheckCircle,
} from "lucide-react";

import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export default function Classes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classTypeDialogOpen, setClassTypeDialogOpen] = useState(false);
  const [classFormDialogOpen, setClassFormDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  const [filterClassType, setFilterClassType] = useState("all");
  const [filterTrainer, setFilterTrainer] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const isAdmin = user?.role === "admin";
  const isMember = user?.role === "member";
  const canFetchTrainers = user?.role === "admin" || user?.role === "trainer";

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: classTypes = [] } = useQuery({
    queryKey: ["/api/class-types"],
    refetchInterval: 10000,
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ["/api/trainers"],
    enabled: canFetchTrainers,
    refetchInterval: 10000,
  });

  const { data: myBookings = [] } = useQuery<any[]>({
    queryKey: ["/api/members", user?.id || "", "bookings"],
    enabled: isMember && !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (classId: string) => {
      await apiRequest("DELETE", `/api/classes/${classId}`, {});
    },

    onSuccess: () => {
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/classes"],
        exact: false,
      });
    },
  });

  // FILTERING
  const filteredClasses = classes.filter((cls: any) => {
    if (filterClassType !== "all" && cls.classTypeId !== filterClassType)
      return false;
    if (filterTrainer !== "all" && cls.trainerId !== filterTrainer)
      return false;
    if (filterStatus !== "all" && cls.status !== filterStatus) return false;
    return true;
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const classesThisMonth = filteredClasses.filter((cls: any) =>
    isWithinInterval(new Date(cls.startTime), {
      start: monthStart,
      end: monthEnd,
    }),
  );

  const bookedClassIds = new Set(myBookings.map((b: any) => b.classId));
  const myBookedClassesThisMonth = classesThisMonth.filter((cls: any) =>
    bookedClassIds.has(cls.id),
  );

  const totalSpots = classesThisMonth.reduce(
    (sum: number, cls: any) => sum + cls.capacity,
    0,
  );

  const bookedSpots = classesThisMonth.reduce(
    (sum: number, cls: any) => sum + cls.bookedCount,
    0,
  );

  const availableSpots = totalSpots - bookedSpots;

  // STATUS COLORS (Neon Theme)
  const getStatusBadge = (cls: any) => {
    const start = new Date(cls.startTime);
    const end = new Date(cls.endTime);

    if (cls.status === "cancelled")
      return <Badge className="bg-red-600 text-white">Cancelled</Badge>;
    if (cls.bookedCount >= cls.capacity)
      return <Badge className="bg-orange-500 text-white">Full</Badge>;
    if (now >= start && now <= end)
      return <Badge className="bg-green-600 text-white">Ongoing</Badge>;
    if (now > end)
      return <Badge className="bg-gray-500 text-white">Completed</Badge>;

    return <Badge className="bg-blue-600 text-white">Scheduled</Badge>;
  };

  const handleBookClass = (cls: any) => {
    setSelectedClass(cls);
    setBookingDialogOpen(true);
  };

  const handleEditClass = (cls: any) => {
    setSelectedClass(cls);
    setClassFormDialogOpen(true);
  };

  const handleDeleteClass = (id: string) => {
    if (confirm("Are you sure?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6 p-4 pb-24 bg-[#05070a] min-h-screen text-white">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#ffff]">Classes</h1>
        <p className="text-gray-400">Manage class schedules and bookings</p>
      </div>

      {/* ADMIN BUTTONS */}
      {isAdmin && (
        <div className="flex gap-2">
          <Dialog
            open={classTypeDialogOpen}
            onOpenChange={setClassTypeDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#eb5a0d] hover:bg-[#c3490b] text-white shadow-md">
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
                  queryClient.invalidateQueries(["/api/class-types"]);
                }}
                onCancel={() => setClassTypeDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={classFormDialogOpen && !selectedClass}
            onOpenChange={setClassFormDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#eb5a0d] hover:bg-[#c3490b] text-white shadow-md">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Class
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Class</DialogTitle>
              </DialogHeader>

              <ClassForm
                onSuccess={() => {
                  setClassFormDialogOpen(false);
                  queryClient.invalidateQueries(["/api/classes"]);
                }}
                onCancel={() => setClassFormDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DASHBOARD CARD TEMPLATE */}
        <div className="rounded-xl overflow-hidden border border-[#eb5a0d]/40 shadow-xl">
          <div className="bg-gradient-to-r from-[#eb5a0d] to-[#ff7b42] p-3">
            <h3 className="text-sm font-semibold text-white">
              Classes This Month
            </h3>
          </div>

          <CardContent className="bg-[#0b0f14] p-4">
            <div className="text-3xl font-bold">{classesThisMonth.length}</div>
            <p className="text-xs text-gray-400">
              {format(monthStart, "MMM d")} - {format(monthEnd, "MMM d")}
            </p>
          </CardContent>
        </div>

        {isMember && (
          <div className="rounded-xl overflow-hidden border border-[#eb5a0d]/40 shadow-xl">
            <div className="bg-gradient-to-r from-[#eb5a0d] to-[#ff7b42] p-3">
              <h3 className="text-sm font-semibold text-white">My Bookings</h3>
            </div>

            <CardContent className="bg-[#0b0f14] p-4">
              <div className="text-3xl font-bold">
                {myBookedClassesThisMonth.length}
              </div>
              <p className="text-xs text-gray-400">Classes booked this month</p>
            </CardContent>
          </div>
        )}

        <div className="rounded-xl overflow-hidden border border-[#eb5a0d]/40 shadow-xl">
          <div className="bg-gradient-to-r from-[#eb5a0d] to-[#ff7b42] p-3">
            <h3 className="text-sm font-semibold text-white">
              Available Spots
            </h3>
          </div>

          <CardContent className="bg-[#0b0f14] p-4">
            <div className="text-3xl font-bold">{availableSpots}</div>
            <p className="text-xs text-gray-400">
              {bookedSpots} / {totalSpots} booked
            </p>
          </CardContent>
        </div>
      </div>

      {/* CLASS SCHEDULE SECTION */}
      <Card className="border border-[#eb5a0d]/40 shadow-2xl rounded-2xl bg-[#0b0f14]">
        {/* ORANGE HEADER */}
        <CardHeader className="bg-gradient-to-r from-[#eb5a0d] to-[#ff7b42] text-white rounded-t-2xl">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Class Schedule</CardTitle>
              <CardDescription className="text-white/80">
                Browse and manage upcoming classes
              </CardDescription>
            </div>

            {/* FILTERS (FB2) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* WHITE INPUTS */}
              <Select
                value={filterClassType}
                onValueChange={setFilterClassType}
              >
                <SelectTrigger className="bg-white text-black font-semibold rounded-md">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {classTypes.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                <SelectTrigger className="bg-white text-black font-semibold rounded-md">
                  <SelectValue placeholder="All Trainers" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainers.map((tr: any) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white text-black font-semibold rounded-md">
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

        <CardContent className="p-6">
          {/* LOADING */}
          {classesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="bg-[#0b0f14] p-4 border border-[#eb5a0d]/20"
                >
                  <Skeleton className="h-20 w-full" />
                </Card>
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-4 text-lg font-semibold">
                No classes scheduled
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* CLASS CARDS */}
              {filteredClasses.map((cls: any) => {
                const isBooked = bookedClassIds.has(cls.id);
                const isFull = cls.bookedCount >= cls.capacity;
                const spotsLeft = cls.capacity - cls.bookedCount;

                return (
                  <Card
                    key={cls.id}
                    className="rounded-xl border border-[#eb5a0d]/30 bg-[#0b0f14] shadow-lg hover:shadow-orange-500/30 hover:translate-y-[-2px] transition-all"
                  >
                    {/* ORANGE HEADER BAR */}
                    <div className="bg-gradient-to-r from-[#eb5a0d] to-[#ff7b42] p-3 flex justify-between">
                      <h3 className="text-white font-semibold">
                        {cls.classTypeName}
                      </h3>
                      {getStatusBadge(cls)}
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {cls.trainerName && (
                        <p className="text-gray-400 text-sm">
                          with {cls.trainerName}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <CalendarIcon className="h-4 w-4" />
                        {format(new Date(cls.startTime), "EEE, MMM d, yyyy")}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Clock className="h-4 w-4" />
                        {format(new Date(cls.startTime), "h:mm a")} -{" "}
                        {format(new Date(cls.endTime), "h:mm a")}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Users className="h-4 w-4" />
                        {cls.bookedCount} / {cls.capacity} booked
                        {!isFull && spotsLeft <= 5 && (
                          <Badge className="bg-white text-black">
                            {spotsLeft} left
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        {/* ADMIN BUTTONS */}
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#eb5a0d] text-[#eb5a0d] hover:bg-[#eb5a0d]/20"
                              onClick={() => handleEditClass(cls)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-600 hover:bg-red-600/20"
                              onClick={() => handleDeleteClass(cls.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* MEMBER BOOK BUTTON */}
                        {!isAdmin && (
                          <Button
                            size="sm"
                            className={`flex-1 ${
                              isBooked
                                ? "bg-white text-[#eb5a0d] border border-[#eb5a0d]"
                                : "bg-[#eb5a0d] text-white hover:bg-[#c3490b]"
                            }`}
                            onClick={() => handleBookClass(cls)}
                          >
                            {isBooked ? "Manage Booking" : "Book Class"}
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

      {/* EDIT MODAL */}
      {selectedClass && classFormDialogOpen && (
        <Dialog
          open={classFormDialogOpen}
          onOpenChange={setClassFormDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
            </DialogHeader>

            <ClassForm
              classData={selectedClass}
              onSuccess={() => {
                setClassFormDialogOpen(false);
                queryClient.invalidateQueries(["/api/classes"]);
                setSelectedClass(null);
              }}
              onCancel={() => {
                setClassFormDialogOpen(false);
                setSelectedClass(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* BOOKING MODAL */}
      {selectedClass && bookingDialogOpen && (
        <BookingDialog
          classData={selectedClass}
          isBooked={bookedClassIds.has(selectedClass.id)}
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
        />
      )}
    </div>
  );
}
