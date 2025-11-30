import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';

const classTypeFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(180, 'Duration must be at most 180 minutes'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity must be at most 100'),
});

type ClassTypeFormValues = z.infer<typeof classTypeFormSchema>;

interface ClassTypeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClassTypeForm({ onSuccess, onCancel }: ClassTypeFormProps) {
  const { toast } = useToast();

  const form = useForm<ClassTypeFormValues>({
    resolver: zodResolver(classTypeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      duration: 60,
      capacity: 20,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ClassTypeFormValues) => {
      const response = await apiRequest('POST', '/api/class-types', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Class type created successfully',
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

  const onSubmit = (data: ClassTypeFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Type Name *</FormLabel>
              <FormControl>
                <Input placeholder="Yoga, Spin, HIIT, etc." {...field} data-testid="input-class-type-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this class type..." {...field} data-testid="input-class-type-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={(e) => field.onChange(parseInt(e.target.value))} 
                    data-testid="input-class-type-duration" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Capacity *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={(e) => field.onChange(parseInt(e.target.value))} 
                    data-testid="input-class-type-capacity" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
            {mutation.isPending ? 'Creating...' : 'Create Class Type'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
