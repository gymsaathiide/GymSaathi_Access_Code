import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Lead, MembershipPlan } from '@shared/schema';
import { z } from 'zod';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const formatDuration = (days: number) => {
  if (days % 365 === 0) {
    const years = days / 365;
    return `${years} ${years === 1 ? 'Year' : 'Years'}`;
  }
  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} ${months === 1 ? 'Month' : 'Months'}`;
  }
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
};

const convertLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  dateOfJoining: z.string().optional(),
  paymentFinalAmount: z.string().optional(),
  paymentPaidAmount: z.string().optional(),
  paymentMethod: z.string().optional(),
  transactionDate: z.string().optional(),
  planId: z.string().optional(),
});

type ConvertLeadFormValues = z.infer<typeof convertLeadSchema>;

interface ConvertLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConvertLeadDialog({ lead, open, onOpenChange, onSuccess }: ConvertLeadDialogProps) {
  const { toast } = useToast();

  const { data: plans = [] } = useQuery<MembershipPlan[]>({
    queryKey: ['/api/membership-plans'],
    enabled: open,
  });

  const activePlans = plans.filter(p => p.isActive === 1);

  const form = useForm<ConvertLeadFormValues>({
    resolver: zodResolver(convertLeadSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      gender: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
      paymentFinalAmount: '',
      paymentPaidAmount: '',
      paymentMethod: '',
      transactionDate: new Date().toISOString().split('T')[0],
      planId: '',
    },
  });

  useEffect(() => {
    if (open && lead) {
      form.reset({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address: '',
        dateOfBirth: '',
        gender: '',
        dateOfJoining: new Date().toISOString().split('T')[0],
        paymentFinalAmount: '',
        paymentPaidAmount: '',
        paymentMethod: '',
        transactionDate: new Date().toISOString().split('T')[0],
        planId: '',
      });
    }
  }, [lead, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: ConvertLeadFormValues) => {
      if (!lead) throw new Error('No lead selected');
      
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining).toISOString() : null,
        transactionDate: data.transactionDate ? new Date(data.transactionDate).toISOString() : null,
        paymentFinalAmount: data.paymentFinalAmount ? parseFloat(data.paymentFinalAmount) : null,
        paymentPaidAmount: data.paymentPaidAmount ? parseFloat(data.paymentPaidAmount) : null,
      };

      const response = await apiRequest('POST', `/api/leads/${lead.id}/convert`, payload);
      return response.json();
    },
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/members'], exact: false });
      toast({
        title: 'Success',
        description: `Lead converted to member successfully`,
      });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to convert lead',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ConvertLeadFormValues) => {
    if (!lead) {
      toast({
        title: 'Error',
        description: 'No lead selected',
        variant: 'destructive',
      });
      return;
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <DialogTitle>Convert Lead to Member</DialogTitle>
          </div>
          <DialogDescription>
            Complete the member details below to convert this lead into an active gym member.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">Lead Information:</p>
              <p className="text-muted-foreground">
                {lead?.name} • {lead?.email} • {lead?.phone}
              </p>
              {lead?.interestedPlan && (
                <p className="text-muted-foreground mt-1">
                  Interested in: {lead.interestedPlan}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-name" />
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
                      <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
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
                      <Input placeholder="+1234567890" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Plan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-plan">No Plan (Add Later)</SelectItem>
                        {activePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatDuration(plan.duration)} - ₹{parseFloat(plan.price).toLocaleString('en-IN')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a membership plan for this member
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date-of-birth" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full address" {...field} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfJoining"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Joining</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date-of-joining" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-transaction-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentFinalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-payment-final" />
                    </FormControl>
                    <FormDescription>Full membership/package amount</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentPaidAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paying Now (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-payment-paid" />
                    </FormControl>
                    <FormDescription>
                      {(() => {
                        const finalAmount = parseFloat(form.watch('paymentFinalAmount') || '0');
                        const paidAmount = parseFloat(form.watch('paymentPaidAmount') || '0');
                        const dueAmount = finalAmount - paidAmount;
                        if (finalAmount > 0 && dueAmount > 0) {
                          return (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Due: {formatCurrency(dueAmount)}
                            </span>
                          );
                        }
                        return finalAmount > 0 && dueAmount <= 0 ? 'Full payment' : 'Partial payments supported';
                      })()}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Debit/Credit">Debit/Credit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={mutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!lead || mutation.isPending} data-testid="button-convert">
                {mutation.isPending ? 'Converting...' : 'Convert to Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
