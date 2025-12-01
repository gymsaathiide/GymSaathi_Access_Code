import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertCircle, Send, Phone, Mail, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PendingPayment {
  id: string;
  type: 'invoice' | 'payment';
  invoiceNumber: string | null;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  memberPhone: string | null;
  joinedAt: string | null;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  dueDate: string | null;
  status: string;
  createdAt: string | null;
}

interface PendingPaymentsResponse {
  pendingPayments: PendingPayment[];
  summary: {
    totalPendingAmount: number;
    totalInvoices: number;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export function PendingPaymentsTable() {
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PendingPaymentsResponse>({
    queryKey: ['/api/admin/pending-payments'],
    refetchInterval: 30000,
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (payment: PendingPayment) => {
      const response = await fetch('/api/admin/send-payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberId: payment.memberId,
          memberName: payment.memberName,
          memberPhone: payment.memberPhone,
          memberEmail: payment.memberEmail,
          amountDue: payment.amountDue,
          dueDate: payment.dueDate,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send reminder');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Reminder Sent',
        description: data.message,
      });
      setSendingReminderId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send Reminder',
        description: error.message,
        variant: 'destructive',
      });
      setSendingReminderId(null);
    },
  });

  const handleSendReminder = (payment: PendingPayment) => {
    setSendingReminderId(payment.id);
    sendReminderMutation.mutate(payment);
  };

  if (isLoading) {
    return (
      <div className="bg-card-dark border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-dark border border-white/5 rounded-2xl p-6">
        <div className="text-red-400 text-center py-4">Failed to load pending payments</div>
      </div>
    );
  }

  const pendingPayments = data?.pendingPayments || [];
  const summary = data?.summary || { totalPendingAmount: 0, totalInvoices: 0 };

  return (
    <div className="bg-card-dark border border-white/5 rounded-2xl overflow-hidden">
      <div 
        className="p-4 sm:p-6 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              summary.totalInvoices > 0 ? "bg-red-500/20" : "bg-green-500/20"
            )}>
              <AlertCircle className={cn(
                "h-5 w-5",
                summary.totalInvoices > 0 ? "text-red-400" : "text-green-400"
              )} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Pending Payments</h3>
              <p className="text-white/50 text-sm">
                {summary.totalInvoices} pending invoice{summary.totalInvoices !== 1 ? 's' : ''} • 
                Total: {formatCurrency(summary.totalPendingAmount)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {summary.totalInvoices > 0 && (
              <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                {formatCurrency(summary.totalPendingAmount)} Overdue
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-white/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white/50" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && pendingPayments.length > 0 && (
        <div className="border-t border-white/5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-white/60 font-medium">Member</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Total Amount</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Paid</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Pending</TableHead>
                  <TableHead className="text-white/60 font-medium">Joined Date</TableHead>
                  <TableHead className="text-white/60 font-medium">Status</TableHead>
                  <TableHead className="text-white/60 font-medium text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.map((payment) => (
                  <TableRow key={payment.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{payment.memberName}</span>
                        <div className="flex items-center gap-2 text-white/50 text-xs mt-0.5">
                          {payment.memberPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {payment.memberPhone}
                            </span>
                          )}
                          {payment.memberEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {payment.memberEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-white/80">{formatCurrency(payment.totalAmount)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-400">{formatCurrency(payment.amountPaid)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-red-400 font-semibold">{formatCurrency(payment.amountDue)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-white/60">
                        {payment.joinedAt ? format(new Date(payment.joinedAt), 'dd MMM yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "capitalize",
                          payment.status === 'pending' && "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
                          payment.status === 'partially_paid' && "border-orange-500/30 text-orange-400 bg-orange-500/10"
                        )}
                      >
                        {payment.status === 'partially_paid' ? 'Partial' : payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReminder(payment);
                        }}
                        disabled={sendingReminderId === payment.id}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                      >
                        {sendingReminderId === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1.5" />
                            Remind
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {isExpanded && pendingPayments.length === 0 && (
        <div className="border-t border-white/5 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-3">
            <AlertCircle className="h-6 w-6 text-green-400" />
          </div>
          <h4 className="text-white font-medium mb-1">All Caught Up!</h4>
          <p className="text-white/50 text-sm">No pending payments at the moment.</p>
        </div>
      )}
    </div>
  );
}
