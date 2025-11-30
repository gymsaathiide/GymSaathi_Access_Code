import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, User } from 'lucide-react';
import { format } from 'date-fns';

interface BookingDialogProps {
  classData: any;
  isBooked: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDialog({ classData, isBooked, open, onOpenChange }: BookingDialogProps) {
  const { toast } = useToast();

  const bookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/classes/${classData.id}/book`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Class booked successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/classes/${classData.id}/book`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Booking cancelled successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!classData) return null;

  const spotsAvailable = classData.capacity - classData.bookedCount;
  const isFull = spotsAvailable === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-booking">
        <DialogHeader>
          <DialogTitle>{classData.classTypeName}</DialogTitle>
          <DialogDescription>
            {classData.classTypeDescription || 'View class details and manage your booking'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {format(new Date(classData.startTime), 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {format(new Date(classData.startTime), 'h:mm a')} - {format(new Date(classData.endTime), 'h:mm a')}
            </span>
          </div>

          {classData.trainerName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Trainer: {classData.trainerName}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {classData.bookedCount} / {classData.capacity} booked
            </span>
            {isFull && <Badge variant="destructive">Full</Badge>}
            {!isFull && spotsAvailable <= 5 && (
              <Badge variant="secondary">{spotsAvailable} spots left</Badge>
            )}
          </div>

          {classData.notes && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Notes:</p>
              <p className="text-muted-foreground">{classData.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Close
          </Button>
          {isBooked ? (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-booking"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          ) : (
            <Button
              onClick={() => bookMutation.mutate()}
              disabled={isFull || bookMutation.isPending}
              data-testid="button-book-class"
            >
              {bookMutation.isPending ? 'Booking...' : 'Book Class'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
