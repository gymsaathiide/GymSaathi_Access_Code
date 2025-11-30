import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MemberForm } from '@/components/MemberForm';
import { LeadForm } from '@/components/LeadForm';
import { PaymentForm } from '@/components/PaymentForm';
import { 
  Users, IndianRupee, TrendingUp, TrendingDown, 
  UserPlus, CreditCard, Dumbbell, Package, Store, Bell,
  Search, AlertTriangle, ArrowRight, Phone,
  MessageSquare, CheckCircle, Activity, Target
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { AdminDashboardResponse } from '@shared/schema';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatShortCurrency = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit' 
  });
};

interface SearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'member' | 'lead';
  status?: string;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ members: SearchResult[]; leads: SearchResult[] } | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: dashboard, isLoading, error, refetch: refetchDashboard } = useQuery<AdminDashboardResponse>({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: user } = useQuery<{ name: string; role: string }>({
    queryKey: ['/api/auth/me'],
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const navigateToResult = (result: SearchResult) => {
    if (result.type === 'member') {
      navigate('/admin/members');
    } else {
      navigate('/admin/leads');
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'Admin'}! Manage your gym operations.
          </p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members, leads, payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />
          {showSearchResults && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.members.length === 0 && searchResults.leads.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No results found</div>
              ) : (
                <>
                  {searchResults.members.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Members</div>
                      {searchResults.members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => navigateToResult(m)}
                          className="w-full px-2 py-2 hover:bg-muted rounded flex items-center gap-3 text-left"
                        >
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.leads.length > 0 && (
                    <div className="p-2 border-t">
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Leads</div>
                      {searchResults.leads.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => navigateToResult(l)}
                          className="w-full px-2 py-2 hover:bg-muted rounded flex items-center gap-3 text-left"
                        >
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{l.name}</div>
                            <div className="text-xs text-muted-foreground">{l.status}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.kpis.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboard.kpis.newMembersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatShortCurrency(dashboard.kpis.revenueThisMonth)}</div>
            <div className="flex items-center text-xs">
              {dashboard.kpis.revenueChangePercent >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={dashboard.kpis.revenueChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {dashboard.kpis.revenueChangePercent >= 0 ? '+' : ''}{dashboard.kpis.revenueChangePercent.toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatShortCurrency(dashboard.kpis.pendingDuesAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.kpis.pendingDuesMembers} member{dashboard.kpis.pendingDuesMembers !== 1 ? 's' : ''} with dues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads in Pipeline</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.kpis.leadsInPipeline}</div>
            <p className="text-xs text-muted-foreground">
              Follow-ups today: {dashboard.kpis.followupsToday}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.kpis.todaysCheckins}</div>
            <p className="text-xs text-muted-foreground">
              Yesterday: {dashboard.kpis.yesterdaysCheckins}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        <Button onClick={() => setIsMemberDialogOpen(true)} size="sm" className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white">
          <UserPlus className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap">Add Member</span>
        </Button>
        <Button onClick={() => setIsLeadDialogOpen(true)} size="sm" variant="outline" className="flex-shrink-0">
          <Target className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap">Add Lead</span>
        </Button>
        <Button onClick={() => setIsPaymentDialogOpen(true)} size="sm" variant="outline" className="flex-shrink-0">
          <CreditCard className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap">Payment</span>
        </Button>
        <Button onClick={() => navigate('/admin/classes')} size="sm" variant="outline" className="flex-shrink-0">
          <Dumbbell className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap">Class</span>
        </Button>
        <Button onClick={() => navigate('/admin/shop')} size="sm" variant="outline" className="flex-shrink-0">
          <Store className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap">Shop</span>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today at a Glance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboard.today.classesSummary.total}</div>
                <div className="text-xs text-muted-foreground">Classes</div>
                <div className="text-xs mt-1">
                  <span className="text-blue-500">{dashboard.today.classesSummary.upcoming}</span> upcoming
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboard.today.attendanceToday.checkins}</div>
                <div className="text-xs text-muted-foreground">Check-ins</div>
                <div className="text-xs mt-1">
                  {dashboard.today.attendanceToday.diffFromYesterday >= 0 ? (
                    <span className="text-green-500">+{dashboard.today.attendanceToday.diffFromYesterday}</span>
                  ) : (
                    <span className="text-red-500">{dashboard.today.attendanceToday.diffFromYesterday}</span>
                  )} vs yesterday
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatShortCurrency(dashboard.today.collectionsToday.total)}</div>
                <div className="text-xs text-muted-foreground">Collections</div>
                <div className="text-xs mt-1 space-x-1">
                  {dashboard.today.collectionsToday.byMethod.cash > 0 && <span>Cash</span>}
                  {dashboard.today.collectionsToday.byMethod.upi > 0 && <span>UPI</span>}
                  {dashboard.today.collectionsToday.byMethod.card > 0 && <span>Card</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Attendance (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.classes.attendanceLast7Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Check-ins']}
                    labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                  />
                  <Bar dataKey="checkins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Renewals & Members</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="expiring">
              <TabsList className="mb-4">
                <TabsTrigger value="expiring">Expiring Soon ({dashboard.renewals.expiringSoon.length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({dashboard.renewals.overdue.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="expiring">
                {dashboard.renewals.expiringSoon.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No memberships expiring soon</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {dashboard.renewals.expiringSoon.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.planName}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant={member.daysLeft <= 3 ? 'destructive' : 'secondary'}>
                            {member.daysLeft} day{member.daysLeft !== 1 ? 's' : ''} left
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">{formatDate(member.expiryDate)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="overdue">
                {dashboard.renewals.overdue.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No overdue memberships</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {dashboard.renewals.overdue.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.planName}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">
                            Expired {Math.abs(member.daysLeft)} days ago
                          </Badge>
                          <div className="flex gap-1 mt-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2">
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2">
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Leads & Follow-ups</CardTitle>
              <CardDescription>
                {dashboard.leads.newThisMonth} new this month · {dashboard.leads.conversionRate.toFixed(0)}% conversion
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/leads')}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.leads.followupsToday.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No follow-ups today</div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {dashboard.leads.followupsToday.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                        <span>{lead.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={lead.status === 'new' ? 'default' : lead.status === 'interested' ? 'secondary' : 'outline'}
                      >
                        {lead.status}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-8 px-2">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Billing & Dues</CardTitle>
              <CardDescription>
                {formatCurrency(dashboard.billing.revenueThisMonth)} revenue · {dashboard.billing.paidInvoices} paid · {dashboard.billing.pendingInvoices} pending
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/billing')}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium mb-3">Members with Dues</div>
            {dashboard.billing.dues.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No pending dues</div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {dashboard.billing.dues.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Last payment: {member.lastPaymentDate ? formatDate(member.lastPaymentDate) : 'Never'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">{formatCurrency(member.dueAmount)}</div>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Today's Classes</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/classes')}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.classes.todaysClasses.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No classes scheduled today</div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {dashboard.classes.todaysClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{cls.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(cls.startTime)} · {cls.trainerName}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={cls.status === 'completed' ? 'secondary' : cls.status === 'ongoing' ? 'default' : 'outline'}
                      >
                        {cls.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {cls.booked}/{cls.capacity} booked
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Shop & Inventory</CardTitle>
              <CardDescription>
                {formatCurrency(dashboard.shop.revenueThisMonth)} revenue · {dashboard.shop.ordersToday} orders today
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/shop')}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">Recent Orders</div>
                {dashboard.shop.recentOrders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recent orders</div>
                ) : (
                  <div className="space-y-2">
                    {dashboard.shop.recentOrders.slice(0, 3).map((order) => (
                      <div key={order.id} className="text-sm p-2 border rounded">
                        <div className="font-medium">{order.memberName}</div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{order.itemsCount} items</span>
                          <span>{formatCurrency(order.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Low Stock</div>
                {dashboard.shop.lowStockProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">All products well stocked</div>
                ) : (
                  <div className="space-y-2">
                    {dashboard.shop.lowStockProducts.map((product) => (
                      <div key={product.id} className="text-sm p-2 border rounded">
                        <div className="font-medium">{product.name}</div>
                        <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'}>
                          {product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" /> Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.alerts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <div>All clear! No urgent alerts.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {dashboard.alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    onClick={() => navigate(alert.link)}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        alert.type === 'out_of_stock' || alert.type === 'high_dues' ? 'bg-red-100 text-red-600' :
                        alert.type === 'expiring_membership' || alert.type === 'missed_followup' ? 'bg-orange-100 text-orange-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground">{alert.description}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>Enter the member details below</DialogDescription>
          </DialogHeader>
          <MemberForm
            onSuccess={() => {
              setIsMemberDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/members'] });
              refetchDashboard();
            }}
            onCancel={() => setIsMemberDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the lead details below</DialogDescription>
          </DialogHeader>
          <LeadForm
            onSuccess={() => {
              setIsLeadDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
              refetchDashboard();
            }}
            onCancel={() => setIsLeadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a new payment from a member</DialogDescription>
          </DialogHeader>
          <PaymentForm
            onSuccess={() => {
              setIsPaymentDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
              refetchDashboard();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
