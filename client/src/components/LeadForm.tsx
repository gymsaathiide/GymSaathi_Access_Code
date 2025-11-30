import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Lead } from '@shared/schema';
import { z } from 'zod';

const leadFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  interestedPlan: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  lead?: Lead;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!lead;
  const canEdit = user?.role === 'admin' || user?.role === 'trainer';

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: lead?.name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      interestedPlan: lead?.interestedPlan || '',
      message: lead?.message || '',
      source: lead?.source || '',
      status: lead?.status || 'new',
      notes: lead?.notes || '',
      followUpDate: lead?.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LeadFormValues) => {
      const url = isEditing ? `/api/leads/${lead!.id}` : '/api/leads';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const payload = {
        ...data,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      };

      const response = await apiRequest(method, url, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Lead ${isEditing ? 'updated' : 'created'} successfully`,
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

  const onSubmit = (data: LeadFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!canEdit && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            You are viewing this lead in read-only mode. Contact an admin to make changes.
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} disabled={!canEdit} data-testid="input-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} disabled={!canEdit} data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} disabled={!canEdit} data-testid="input-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}>
                  <FormControl>
                    <SelectTrigger data-testid="select-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="followUpDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Follow-up Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={!canEdit} data-testid="input-follow-up-date" />
                </FormControl>
                <FormDescription>
                  Set a reminder date to follow up with this lead
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="interestedPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interested In</FormLabel>
              <FormControl>
                <Input placeholder="Membership plan or service they're interested in..." {...field} disabled={!canEdit} data-testid="input-interested-plan" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any initial inquiry or message from the lead..."
                  {...field}
                  disabled={!canEdit}
                  data-testid="input-message"
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
                <Textarea
                  placeholder="Internal notes about this lead..."
                  {...field}
                  disabled={!canEdit}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormDescription>
                Add any additional information or follow-up notes
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending}
            data-testid="button-cancel"
          >
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
              {mutation.isPending ? 'Saving...' : isEditing ? 'Update Lead' : 'Add Lead'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
