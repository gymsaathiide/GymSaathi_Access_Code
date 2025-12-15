import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
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
  const canFetchTrainers = isAdmin || user?.role === "trainer";

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes"],
    refetchInterval: 5000,
  });

  const { data: classTypes = [] } = useQuery({
    queryKey: ["/api/class-types"],
    refetchInterval: 10000,
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ["/api/trainers"],
    enabled: canFetchTrainers,
  });

  const { data: myBookings = [] } = useQuery<any[]>({
    queryKey: ["/api/members", user?.id || "", "bookings"],
    enabled: isMember && !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (classId: string) =>
      await apiRequest("DELETE", `/api/classes/${classId}`, {}),
    onSuccess: () => {
      toast({ title: "Success", description: "Class deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
  });

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

  return (
    <div className="space-y-6 p-5 pb-20 bg-[#0b0f14] min-h-screen text-white">
      {/* PAGE TITLE */}
      <div>
        <h1 className="text-3xl font-bold">Classes</h1>
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
              <Button
                className="
                  bg-transparent 
                  border border-white/20 
                  text-white 
                  hover:bg-white/10 
                  backdrop-blur-md
                "
              >
                <Plus color="#eb5a0d" className="mr-2 h-4 w-4" />
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
                  queryClient.invalidateQueries({ queryKey: ["/api/class-types"] });
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
              <Button
                className="
                  bg-transparent 
                  border border-white/20 
                  text-white 
                  hover:bg-white/10 
                  backdrop-blur-md
                "
              >
                <Plus color="#eb5a0d" className="mr-2 h-4 w-4" />
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
                  queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
                }}
                onCancel={() => setClassFormDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Template */}
        <Card className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md shadow-xl">
          <CardContent className="p-4">
            <CardTitle className="text-gray-200">Classes This Month</CardTitle>
            <div className="text-3xl font-bold mt-2">
              {classesThisMonth.length}
            </div>
            <p className="text-xs text-gray-400">
              {format(monthStart, "MMM d")} - {format(monthEnd, "MMM d")}
            </p>
          </CardContent>
        </Card>

        {isMember && (
          <Card className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md shadow-xl">
            <CardContent className="p-4">
              <CardTitle className="text-gray-200">My Bookings</CardTitle>
              <div className="text-3xl font-bold mt-2">
                {myBookedClassesThisMonth.length}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md shadow-xl">
          <CardContent className="p-4">
            <CardTitle className="text-gray-200">Available Spots</CardTitle>
            <div className="text-3xl font-bold mt-2">{availableSpots}</div>
            <p className="text-xs text-gray-400">
              {bookedSpots} / {totalSpots} booked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CLASS SCHEDULE */}
      <Card className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md shadow-xl">
        <CardContent className="p-6 space-y-6">
          {/* FILTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                value: filterClassType,
                set: setFilterClassType,
                label: "All Types",
                items: classTypes,
              },
              {
                value: filterTrainer,
                set: setFilterTrainer,
                label: "All Trainers",
                items: trainers,
              },
              {
                value: filterStatus,
                set: setFilterStatus,
                label: "All Statuses",
                items: [
                  { id: "scheduled", name: "Scheduled" },
                  { id: "ongoing", name: "Ongoing" },
                  { id: "completed", name: "Completed" },
                  { id: "cancelled", name: "Cancelled" },
                ],
              },
            ].map((filter, i) => (
              <Select key={i} value={filter.value} onValueChange={filter.set}>
                <SelectTrigger
                  className="
                  bg-white/10 
                  backdrop-blur-md 
                  border border-white/20 
                  text-white 
                  rounded-md
                "
                >
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{filter.label}</SelectItem>
                  {filter.items.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>

          {/* CLASS CARDS */}
          {classesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="bg-white/5 backdrop-blur-md border border-white/10 p-4"
                >
                  <Skeleton className="h-20 w-full" />
                </Card>
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CalendarIcon
                color="#eb5a0d"
                className="mx-auto h-12 w-12 opacity-60"
              />
              <p className="mt-4 text-lg">No classes scheduled</p>
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
                    className="
                      rounded-xl 
                      border border-white/15 
                      bg-white/5 
                      backdrop-blur-md 
                      shadow-xl 
                      hover:border-white/30 
                      transition
                    "
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">
                          {cls.classTypeName}
                        </h3>
                        {getStatusBadge(cls)}
                      </div>

                      {cls.trainerName && (
                        <p className="text-gray-400 text-sm">
                          with {cls.trainerName}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        <CalendarIcon color="#eb5a0d" className="h-4 w-4" />
                        {format(new Date(cls.startTime), "EEE, MMM d, yyyy")}
                      </div>

                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        <Clock color="#eb5a0d" className="h-4 w-4" />
                        {format(new Date(cls.startTime), "h:mm a")} -{" "}
                        {format(new Date(cls.endTime), "h:mm a")}
                      </div>

                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        <Users color="#eb5a0d" className="h-4 w-4" />
                        {cls.bookedCount} / {cls.capacity} booked
                        {!isFull && spotsLeft <= 5 && (
                          <Badge className="bg-white/20 text-white">
                            {spotsLeft} left
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        {isAdmin ? (
                          <>
                            <Button
                              size="sm"
                              className="
                                bg-transparent 
                                border border-white/20 
                                text-white 
                                hover:bg-white/10 
                                flex items-center gap-1
                              "
                              onClick={() => {
                                setSelectedClass(cls);
                                setClassFormDialogOpen(true);
                              }}
                            >
                              <Edit color="#eb5a0d" className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              className="
                                bg-transparent 
                                border border-red-500/30 
                                text-red-400 
                                hover:bg-red-600/20 
                                flex items-center gap-1
                              "
                              onClick={() => deleteMutation.mutate(cls.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="
                              flex-1 bg-transparent 
                              border border-white/25 
                              text-white 
                              hover:bg-white/10 
                            "
                            onClick={() => {
                              setSelectedClass(cls);
                              setBookingDialogOpen(true);
                            }}
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
                setSelectedClass(null);
                queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
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
