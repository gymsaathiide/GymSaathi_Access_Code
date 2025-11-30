import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const paymentSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  amount: z.string().min(1, 'Amount is required').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number'),
  paymentType: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'razorpay']),
  status: z.enum(['paid', 'pending', 'failed', 'refunded']).default('paid'),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  payment?: {
    id: string;
    memberId: string;
    amount: number;
    paymentType: string;
    status: string;
    transactionRef?: string;
    notes?: string;
  } | null;
  onSuccess?: () => void;
}

export function PaymentForm({ payment, onSuccess }: PaymentFormProps) {
  const { toast } = useToast();

  const { data: members } = useQuery<any[]>({
    queryKey: ['/api/members'],
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      memberId: payment?.memberId || '',
      amount: payment?.amount?.toString() || '',
      paymentType: (payment?.paymentType as any) || 'cash',
      status: (payment?.status as any) || 'paid',
      transactionRef: payment?.transactionRef || '',
      notes: payment?.notes || '',
    },
  });

  const createPayment = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/payments', {
        ...data,
        amount: parseFloat(data.amount),
      });
    },
    onSuccess: () => {
      // Invalidate specific billing-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/payments'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/members'], exact: false });
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to record payment';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', `/api/payments/${payment?.id}`, {
        ...data,
        amount: parseFloat(data.amount),
      });
    },
    onSuccess: () => {
      // Invalidate specific billing-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/payments'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/members'], exact: false });
      toast({
        title: 'Success',
        description: 'Payment updated successfully',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update payment';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    if (payment) {
      updatePayment.mutate(data);
    } else {
      createPayment.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-member">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.email}
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  data-testid="input-amount"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-payment-type">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transactionRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Reference (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="TXN123456"
                  {...field}
                  data-testid="input-transaction-ref"
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
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any additional notes..."
                  {...field}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={createPayment.isPending || updatePayment.isPending}
            data-testid="button-submit-payment"
          >
            {createPayment.isPending || updatePayment.isPending
              ? 'Saving...'
              : payment
              ? 'Update Payment'
              : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
