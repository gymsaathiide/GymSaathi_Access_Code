import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

const classFormSchema = z.object({
  classTypeId: z.string().min(1, 'Please select a class type'),
  trainerId: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity must be at most 100'),
  notes: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface ClassFormProps {
  classData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClassForm({ classData, onSuccess, onCancel }: ClassFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!classData;
  const canFetchTrainers = user?.role === 'admin' || user?.role === 'trainer';

  const { data: classTypes = [] } = useQuery({
    queryKey: ['/api/class-types'],
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/trainers'],
    enabled: canFetchTrainers,
  });

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      classTypeId: classData?.classTypeId || '',
      trainerId: classData?.trainerId || '',
      startTime: classData?.startTime ? new Date(classData.startTime).toISOString().slice(0, 16) : '',
      endTime: classData?.endTime ? new Date(classData.endTime).toISOString().slice(0, 16) : '',
      capacity: classData?.capacity || 20,
      notes: classData?.notes || '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ClassFormValues) => {
      const url = isEditing ? `/api/classes/${classData!.id}` : '/api/classes';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const payload = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        trainerId: data.trainerId || null,
      };

      const response = await apiRequest(method, url, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Class ${isEditing ? 'updated' : 'scheduled'} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ClassFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="classTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-class-type">
                    <SelectValue placeholder="Select class type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {classTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="trainerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trainer (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-trainer">
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">No trainer assigned</SelectItem>
                  {trainers.map((trainer: any) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} data-testid="input-start-time" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} data-testid="input-end-time" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacity *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(parseInt(e.target.value))} 
                  data-testid="input-capacity" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes..." {...field} data-testid="input-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
            {mutation.isPending ? 'Saving...' : isEditing ? 'Update Class' : 'Schedule Class'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
