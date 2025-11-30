import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, CreditCard, IndianRupee, Users, TrendingUp, 
  Calendar, FileText, Download, Search, Filter, Edit, Check,
  AlertCircle, RefreshCw, Play
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

interface DashboardStats {
  totalRevenue: number;
  revenueTrend: number;
  activeGyms: number;
  totalMembers: number;
  mrr: number;
  paidAmount: number;
  pendingAmount: number;
  standardPlanRevenue: number;
  customPlanRevenue: number;
  currentMonth: number;
  currentYear: number;
}

interface RevenueAnalytics {
  revenueTrend: { month: string; year: number; revenue: number; members: number }[];
  memberGrowth: { month: string; year: number; members: number }[];
  planBreakdown: {
    standard: { count: number; revenue: number };
    custom: { count: number; revenue: number };
  };
}

interface GymBilling {
  id: string;
  name: string;
  owner: string;
  email: string;
  status: string;
  planType: string;
  activeMembers: number;
  rate: number;
  monthlyBilling: number;
  billingCycleStart: number;
  nextInvoiceDate: string;
  lastInvoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    amount: number;
  } | null;
}

interface GymInvoice {
  id: string;
  invoiceNumber: string;
  gymId: string;
  gymName: string;
  gymOwner: string;
  month: number;
  year: number;
  activeMembers: number;
  ratePerMember: string;
  totalAmount: string;
  paidAmount: string;
  status: string;
  dueDate: string;
  paidDate: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  notes: string | null;
}

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6'];

export default function SuperadminBilling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [billingStatusFilter, setBillingStatusFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [selectedGym, setSelectedGym] = useState<GymBilling | null>(null);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<GymInvoice | null>(null);
  const [pricingForm, setPricingForm] = useState({
    pricingPlanType: 'standard',
    ratePerMember: '75',
    billingCycleStart: 1
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'upi',
    paymentRef: '',
    notes: ''
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/superadmin/dashboard-stats'],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<RevenueAnalytics>({
    queryKey: ['/api/superadmin/revenue-analytics'],
  });

  const { data: gymBilling, isLoading: billingLoading } = useQuery<GymBilling[]>({
    queryKey: ['/api/superadmin/gym-billing'],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<GymInvoice[]>({
    queryKey: ['/api/superadmin/gym-invoices'],
  });

  const updatePricingMutation = useMutation({
    mutationFn: async ({ gymId, data }: { gymId: string; data: any }) => {
      return fetchApi(`/api/superadmin/gyms/${gymId}/pricing`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/gym-billing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/dashboard-stats'] });
      setIsPricingDialogOpen(false);
      toast({ title: 'Success', description: 'Gym pricing updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const generateInvoicesMutation = useMutation({
    mutationFn: async () => {
      return fetchApi<{ message: string }>('/api/superadmin/generate-invoices', {
        method: 'POST',
        body: JSON.stringify({})
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/gym-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/gym-billing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/revenue-analytics'] });
      toast({ title: 'Success', description: data.message });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const markInvoicePaidMutation = useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: string; data: any }) => {
      return fetchApi(`/api/superadmin/gym-invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...data, status: 'paid' })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/gym-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/gym-billing'] });
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
      toast({ title: 'Success', description: 'Invoice marked as paid' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const checkOverdueMutation = useMutation({
    mutationFn: async () => {
      return fetchApi<{ message: string }>('/api/superadmin/check-overdue-invoices', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/gym-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/gym-billing'] });
      toast({ title: 'Overdue Check Complete', description: data.message });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMonthName = (month: number) => {
    return new Date(2024, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
      cancelled: 'outline'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleEditPricing = (gym: GymBilling) => {
    setSelectedGym(gym);
    setPricingForm({
      pricingPlanType: gym.planType.includes('Custom') ? 'custom' : 'standard',
      ratePerMember: String(gym.rate),
      billingCycleStart: gym.billingCycleStart
    });
    setIsPricingDialogOpen(true);
  };

  const handleMarkPaid = (invoice: GymInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({ paymentMethod: 'upi', paymentRef: '', notes: '' });
    setIsPaymentDialogOpen(true);
  };

  const filteredBilling = gymBilling?.filter((gym) => {
    const matchesSearch = gym.name.toLowerCase().includes(search.toLowerCase()) ||
                         gym.owner.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = billingStatusFilter === 'all' || gym.status === billingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices?.filter((inv) => {
    const matchesSearch = inv.gymName?.toLowerCase().includes(search.toLowerCase()) ||
                         inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const pieData = analytics ? [
    { name: 'Standard Plans', value: analytics.planBreakdown.standard.revenue },
    { name: 'Custom Plans', value: analytics.planBreakdown.custom.revenue }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Gym Billing & Revenue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage gym subscriptions, invoices, and revenue analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => checkOverdueMutation.mutate()}
            disabled={checkOverdueMutation.isPending}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Check Overdue
          </Button>
          <Button 
            onClick={() => generateInvoicesMutation.mutate()}
            disabled={generateInvoicesMutation.isPending}
          >
            <Play className="mr-2 h-4 w-4" />
            Generate Monthly Invoices
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.mrr || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats?.revenueTrend !== undefined && (
                <>
                  <TrendingUp className={`h-3 w-3 mr-1 ${stats.revenueTrend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={stats.revenueTrend >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {stats.revenueTrend >= 0 ? '+' : ''}{stats.revenueTrend.toFixed(1)}%
                  </span>
                  <span className="ml-1">vs last month</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Gyms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeGyms || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Subscribed gyms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all gyms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Status</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.paidAmount || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending: <span className="text-orange-500">{formatCurrency(stats?.pendingAmount || 0)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {analytics && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `₹${value/1000}K`} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#f97316" 
                      fill="#fed7aa" 
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Standard vs Custom pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {analytics && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Standard (₹75/member)</span>
                <span className="font-medium">{analytics?.planBreakdown.standard.count || 0} gyms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Custom Pricing</span>
                <span className="font-medium">{analytics?.planBreakdown.custom.count || 0} gyms</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Gyms and Invoices */}
      <Tabs defaultValue="gyms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gyms">Gym Billing</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="gyms" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle>Gym Subscription Management</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search gyms..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={billingStatusFilter} onValueChange={setBillingStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gym</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Active Members</TableHead>
                    <TableHead className="text-right">Monthly Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Invoice</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Loading gym billing data...
                      </TableCell>
                    </TableRow>
                  ) : filteredBilling && filteredBilling.length > 0 ? (
                    filteredBilling.map((gym) => (
                      <TableRow key={gym.id}>
                        <TableCell className="font-medium">{gym.name}</TableCell>
                        <TableCell>{gym.owner}</TableCell>
                        <TableCell>
                          <Badge variant={gym.planType.includes('Custom') ? 'outline' : 'default'}>
                            {gym.planType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{gym.activeMembers}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(gym.monthlyBilling)}</TableCell>
                        <TableCell>
                          <Badge variant={gym.status === 'active' ? 'default' : 'destructive'}>
                            {gym.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(gym.nextInvoiceDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditPricing(gym)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No gyms found
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
                <CardTitle>Gym Invoices</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
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
                    <TableHead>Gym</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        Loading invoices...
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices && filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="font-medium">{invoice.gymName}</TableCell>
                        <TableCell>{getMonthName(invoice.month)} {invoice.year}</TableCell>
                        <TableCell className="text-right">{invoice.activeMembers}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(invoice.ratePerMember))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(parseFloat(invoice.totalAmount))}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {invoice.status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkPaid(invoice)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No invoices found. Click "Generate Monthly Invoices" to create invoices for all active gyms.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Pricing Dialog */}
      <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gym Pricing</DialogTitle>
            <DialogDescription>
              Update pricing settings for {selectedGym?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pricing Plan</Label>
              <Select 
                value={pricingForm.pricingPlanType} 
                onValueChange={(value) => {
                  setPricingForm(prev => ({
                    ...prev,
                    pricingPlanType: value,
                    ratePerMember: value === 'standard' ? '75' : prev.ratePerMember
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (₹75/member)</SelectItem>
                  <SelectItem value="custom">Custom Pricing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pricingForm.pricingPlanType === 'custom' && (
              <div className="space-y-2">
                <Label>Rate per Member (₹)</Label>
                <Input
                  type="number"
                  value={pricingForm.ratePerMember}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, ratePerMember: e.target.value }))}
                  min="1"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Billing Cycle Start Day</Label>
              <Select 
                value={String(pricingForm.billingCycleStart)}
                onValueChange={(value) => setPricingForm(prev => ({ ...prev, billingCycleStart: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 5, 10, 15].map(day => (
                    <SelectItem key={day} value={String(day)}>Day {day} of month</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedGym) {
                  updatePricingMutation.mutate({
                    gymId: selectedGym.id,
                    data: pricingForm
                  });
                }
              }}
              disabled={updatePricingMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Record payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between mb-2">
                <span>Gym:</span>
                <span className="font-medium">{selectedInvoice?.gymName}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Amount:</span>
                <span className="font-medium">{selectedInvoice && formatCurrency(parseFloat(selectedInvoice.totalAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span>Period:</span>
                <span className="font-medium">
                  {selectedInvoice && `${getMonthName(selectedInvoice.month)} ${selectedInvoice.year}`}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                value={paymentForm.paymentMethod}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Reference (Optional)</Label>
              <Input
                value={paymentForm.paymentRef}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentRef: e.target.value }))}
                placeholder="Transaction ID or Reference Number"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedInvoice) {
                  markInvoicePaidMutation.mutate({
                    invoiceId: selectedInvoice.id,
                    data: {
                      paidAmount: selectedInvoice.totalAmount,
                      ...paymentForm
                    }
                  });
                }
              }}
              disabled={markInvoicePaidMutation.isPending}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
