import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Search, FileText, Download, Edit, Info, TrendingUp, IndianRupee, Clock, BarChart3, Bell, AlertTriangle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentForm } from '@/components/PaymentForm';
import { InvoiceForm } from '@/components/InvoiceForm';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';

interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  totalAmount?: number;
  amount: number;
  amountDue?: number;
  paymentType: string;
  paymentSource?: string;
  status: string;
  paymentDate: string;
  transactionRef?: string;
  notes?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  memberId: string;
  memberName: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
  createdAt: string;
}

interface BillingSummary {
  totalRevenue: number;
  paidPaymentsCount: number;
  pendingPaymentsCount: number;
  partiallyPaidCount: number;
  failedPaymentsCount: number;
  refundedPaymentsCount: number;
  partialPaymentsCollected: number;
  totalDues: number;
  avgTicketSize: number;
  membershipRevenue: number;
  shopRevenue: number;
  otherRevenue: number;
  cashRevenue: number;
  upiRevenue: number;
  cardRevenue: number;
  bankTransferRevenue: number;
  razorpayRevenue: number;
  newPaymentsToday: number;
  paymentMethodBreakdown: { method: string; amount: number; count: number }[];
  paymentTypeBreakdown: { type: string; amount: number }[];
  dateRange: { from: string; to: string };
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Billing() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('month');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Calculate date range for API
  const getDateRangeParams = () => {
    const now = new Date();
    let from: Date, to: Date;
    
    switch (dateRange) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'month':
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
    }
    
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const dateParams = getDateRangeParams();

  const { data: summary, isLoading: summaryLoading } = useQuery<BillingSummary>({
    queryKey: ['/api/billing/summary', dateParams.from, dateParams.to],
    queryFn: async () => {
      const res = await fetch(`/api/billing/summary?from=${encodeURIComponent(dateParams.from)}&to=${encodeURIComponent(dateParams.to)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: revenueTrend } = useQuery<{ month: string; revenue: number; count: number }[]>({
    queryKey: ['/api/billing/revenue-trend'],
    queryFn: async () => {
      const res = await fetch('/api/billing/revenue-trend', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch revenue trend');
      return res.json();
    },
  });

  const filteredPayments = payments?.filter((p) => {
    const matchesSearch = p.memberName?.toLowerCase().includes(search.toLowerCase()) ||
                         p.transactionRef?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = paymentTypeFilter === 'all' || p.paymentType === paymentTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredInvoices = invoices?.filter((inv) => {
    const matchesSearch = inv.memberName?.toLowerCase().includes(search.toLowerCase()) ||
                         inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const remindMutation = useMutation({
    mutationFn: async ({ paymentId, channel }: { paymentId: string; channel: 'email' | 'whatsapp' | 'both' }) => {
      const res = await fetch(`/api/payments/${paymentId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send reminder');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Reminder Sent', description: data.message });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: 'default',
      pending: 'secondary',
      partially_paid: 'warning',
      failed: 'destructive',
      refunded: 'outline',
    };
    const labels: Record<string, string> = {
      paid: 'Paid',
      pending: 'Pending',
      partially_paid: 'Partial',
      failed: 'Failed',
      refunded: 'Refunded',
    };
    return <Badge variant={variants[status] || 'default'} data-testid={`badge-status-${status}`}>{labels[status] || status}</Badge>;
  };

  const getPaymentTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      razorpay: 'Razorpay',
    };
    return <Badge variant="outline" data-testid={`badge-payment-type-${type}`}>{typeLabels[type] || type}</Badge>;
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setEditingPayment(null);
  };

  // Chart data for payment methods
  const methodChartData = summary?.paymentMethodBreakdown?.map(m => ({
    name: m.method === 'bank_transfer' ? 'Bank' : m.method.charAt(0).toUpperCase() + m.method.slice(1),
    amount: m.amount,
    count: m.count,
  })) || [];

  // Chart data for payment types (membership vs shop)
  const typeChartData = summary?.paymentTypeBreakdown?.map(t => ({
    name: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    value: t.amount,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-billing-title">Billing Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track member payments and invoices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          {canEdit && (
            <div className="flex gap-2">
              <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-generate-invoice">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Generate Invoice</DialogTitle>
                  </DialogHeader>
                  <InvoiceForm onSuccess={() => setIsInvoiceDialogOpen(false)} />
                </DialogContent>
              </Dialog>

              <Dialog open={isPaymentDialogOpen} onOpenChange={handleClosePaymentDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-record-payment">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingPayment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
                  </DialogHeader>
                  <PaymentForm 
                    payment={editingPayment} 
                    onSuccess={handleClosePaymentDialog} 
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <Alert data-testid="alert-read-only">
          <Info className="h-4 w-4" />
          <AlertDescription>
            You are viewing this page in read-only mode. Only administrators can create or edit payments and invoices.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This week' : 'This month'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-partial-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial Collected</CardTitle>
            <Wallet className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.partialPaymentsCollected || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary?.partiallyPaidCount || 0} partial payments</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-dues">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dues</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.totalDues || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{(summary?.pendingPaymentsCount || 0) + (summary?.partiallyPaidCount || 0)} pending</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-ticket">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Ticket Size</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.avgTicketSize || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-paid-payments">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary?.paidPaymentsCount || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-payments">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary?.pendingPaymentsCount || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-membership-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summary?.membershipRevenue || 0)}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-shop-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shop</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summary?.shopRevenue || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      {revenueTrend && revenueTrend.length > 0 && (
        <Card data-testid="card-revenue-trend">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`} />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Charts */}
      {(methodChartData.length > 0 || typeChartData.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {methodChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodChartData}>
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`} />
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {typeChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {typeChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle>Payment History</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search payments..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-payments"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger className="w-32" data-testid="select-payment-type-filter">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="razorpay">Razorpay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Paid (₹)</TableHead>
                    <TableHead>Due (₹)</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Loading payments...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments && filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="font-medium">{payment.memberName || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          {payment.amountDue && parseFloat(String(payment.amountDue)) > 0 ? (
                            <span className="text-red-600 font-medium">{formatCurrency(parseFloat(String(payment.amountDue)))}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getPaymentTypeBadge(payment.paymentType)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.transactionRef || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canEdit && (payment.status === 'pending' || payment.status === 'partially_paid') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => remindMutation.mutate({ paymentId: payment.id, channel: 'both' })}
                                disabled={remindMutation.isPending}
                                title="Send Reminder"
                                data-testid={`button-remind-${payment.id}`}
                              >
                                <Bell className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditPayment(payment)}
                                data-testid={`button-edit-payment-${payment.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle>Invoices</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-invoices"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32" data-testid="select-invoice-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Loading invoices...
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices && filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="font-medium">{invoice.memberName || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{invoice.paidDate ? formatDate(invoice.paidDate) : '-'}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-download-invoice-${invoice.id}`}
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `/api/invoices/${invoice.id}/download`;
                              link.download = `invoice-${invoice.invoiceNumber}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
