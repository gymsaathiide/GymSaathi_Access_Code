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
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            Welcome back, {user?.name || 'Admin'}!
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

      {/* KPI Cards - Mobile-first responsive grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Members</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboard.kpis.activeMembers}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              +{dashboard.kpis.newMembersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Revenue</CardTitle>
            <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatShortCurrency(dashboard.kpis.revenueThisMonth)}</div>
            <div className="flex items-center text-[10px] sm:text-xs flex-wrap">
              {dashboard.kpis.revenueChangePercent >= 0 ? (
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500 mr-0.5 sm:mr-1 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500 mr-0.5 sm:mr-1 flex-shrink-0" />
              )}
              <span className={dashboard.kpis.revenueChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {dashboard.kpis.revenueChangePercent >= 0 ? '+' : ''}{dashboard.kpis.revenueChangePercent.toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-0.5 sm:ml-1 hidden sm:inline">vs last</span>
            </div>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Pending Dues</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{formatShortCurrency(dashboard.kpis.pendingDuesAmount)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {dashboard.kpis.pendingDuesMembers} member{dashboard.kpis.pendingDuesMembers !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Leads</CardTitle>
            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboard.kpis.leadsInPipeline}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {dashboard.kpis.followupsToday} follow-ups
            </p>
          </CardContent>
        </Card>

        <Card className="p-0 col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Check-ins Today</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboard.kpis.todaysCheckins}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Yesterday: {dashboard.kpis.yesterdaysCheckins}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Horizontal scroll on mobile with touch-friendly targets */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap snap-x snap-mandatory">
        <Button onClick={() => setIsMemberDialogOpen(true)} size="sm" className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white min-h-[44px] snap-start">
          <UserPlus className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap text-sm">Add Member</span>
        </Button>
        <Button onClick={() => setIsLeadDialogOpen(true)} size="sm" variant="outline" className="flex-shrink-0 min-h-[44px] snap-start">
          <Target className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap text-sm">Add Lead</span>
        </Button>
        <Button onClick={() => setIsPaymentDialogOpen(true)} size="sm" variant="outline" className="flex-shrink-0 min-h-[44px] snap-start">
          <CreditCard className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap text-sm">Payment</span>
        </Button>
        <Button onClick={() => navigate('/admin/classes')} size="sm" variant="outline" className="flex-shrink-0 min-h-[44px] snap-start">
          <Dumbbell className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap text-sm">Class</span>
        </Button>
        <Button onClick={() => navigate('/admin/shop')} size="sm" variant="outline" className="flex-shrink-0 min-h-[44px] snap-start">
          <Store className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap text-sm">Shop</span>
        </Button>
      </div>

      {/* Today at a Glance + Attendance Chart - Stack on mobile */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg">Today at a Glance</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center min-w-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboard.today.classesSummary.total}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Classes</div>
                <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                  <span className="text-blue-500">{dashboard.today.classesSummary.upcoming}</span> <span className="hidden sm:inline">upcoming</span>
                </div>
              </div>
              <div className="text-center min-w-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboard.today.attendanceToday.checkins}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Check-ins</div>
                <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                  {dashboard.today.attendanceToday.diffFromYesterday >= 0 ? (
                    <span className="text-green-500">+{dashboard.today.attendanceToday.diffFromYesterday}</span>
                  ) : (
                    <span className="text-red-500">{dashboard.today.attendanceToday.diffFromYesterday}</span>
                  )} <span className="hidden sm:inline">vs yesterday</span>
                </div>
              </div>
              <div className="text-center min-w-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatShortCurrency(dashboard.today.collectionsToday.total)}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Collections</div>
                <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 space-x-0.5 sm:space-x-1 truncate">
                  {dashboard.today.collectionsToday.byMethod.cash > 0 && <span>Cash</span>}
                  {dashboard.today.collectionsToday.byMethod.upi > 0 && <span>UPI</span>}
                  {dashboard.today.collectionsToday.byMethod.card > 0 && <span>Card</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg">Attendance (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="h-[120px] sm:h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.classes.attendanceLast7Days} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2)}
                    className="text-[10px] sm:text-xs"
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis className="text-[10px] sm:text-xs" tick={{ fontSize: 10 }} width={30} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Check-ins']}
                    labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="checkins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renewals & Leads Section - Mobile optimized */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg">Renewals & Members</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <Tabs defaultValue="expiring">
              <TabsList className="mb-3 sm:mb-4 w-full grid grid-cols-2 h-auto">
                <TabsTrigger value="expiring" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                  Expiring ({dashboard.renewals.expiringSoon.length})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                  Overdue ({dashboard.renewals.overdue.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="expiring">
                {dashboard.renewals.expiringSoon.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">No memberships expiring soon</div>
                ) : (
                  <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                    {dashboard.renewals.expiringSoon.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base truncate">{member.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">{member.planName}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge variant={member.daysLeft <= 3 ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs">
                            {member.daysLeft}d left
                          </Badge>
                          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{formatDate(member.expiryDate)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="overdue">
                {dashboard.renewals.overdue.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">No overdue memberships</div>
                ) : (
                  <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                    {dashboard.renewals.overdue.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base truncate">{member.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">{member.planName}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge variant="destructive" className="text-[10px] sm:text-xs">
                            -{Math.abs(member.daysLeft)}d
                          </Badge>
                          <div className="flex gap-1 mt-1">
                            <Button size="sm" variant="ghost" className="h-11 w-11 sm:h-8 sm:w-auto sm:px-2 p-0">
                              <Phone className="h-4 w-4 sm:h-3 sm:w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-11 w-11 sm:h-8 sm:w-auto sm:px-2 p-0">
                              <MessageSquare className="h-4 w-4 sm:h-3 sm:w-3" />
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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 md:p-6 pb-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Leads & Follow-ups</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">
                {dashboard.leads.newThisMonth} new · {dashboard.leads.conversionRate.toFixed(0)}% conversion
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/leads')} className="self-start sm:self-auto min-h-[36px] sm:min-h-0">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            {dashboard.leads.followupsToday.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">No follow-ups today</div>
            ) : (
              <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                {dashboard.leads.followupsToday.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base truncate">{lead.name}</div>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{lead.source}</Badge>
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Badge 
                        variant={lead.status === 'new' ? 'default' : lead.status === 'interested' ? 'secondary' : 'outline'}
                        className="text-[10px] sm:text-xs hidden sm:inline-flex"
                      >
                        {lead.status}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-11 w-11 sm:h-8 sm:w-auto sm:px-2 p-0">
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

      {/* Billing & Classes Section - Mobile optimized */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 md:p-6 pb-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Billing & Dues</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                <span className="hidden sm:inline">{formatCurrency(dashboard.billing.revenueThisMonth)} · </span>
                {dashboard.billing.paidInvoices} paid · {dashboard.billing.pendingInvoices} pending
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/billing')} className="self-start sm:self-auto min-h-[36px] sm:min-h-0">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Members with Dues</div>
            {dashboard.billing.dues.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">No pending dues</div>
            ) : (
              <div className="space-y-2 max-h-[180px] sm:max-h-[200px] overflow-y-auto">
                {dashboard.billing.dues.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base truncate">{member.name}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Last: {member.lastPaymentDate ? formatDate(member.lastPaymentDate) : 'Never'}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-red-600 text-sm sm:text-base">{formatShortCurrency(member.dueAmount)}</div>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 sm:px-2 text-[10px] sm:text-xs">
                        Remind
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 md:p-6 pb-2">
            <div>
              <CardTitle className="text-base sm:text-lg">Today's Classes</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/classes')} className="self-start sm:self-auto min-h-[36px] sm:min-h-0">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            {dashboard.classes.todaysClasses.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">No classes scheduled today</div>
            ) : (
              <div className="space-y-2 max-h-[180px] sm:max-h-[200px] overflow-y-auto">
                {dashboard.classes.todaysClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base truncate">{cls.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {formatTime(cls.startTime)} · {cls.trainerName}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge 
                        variant={cls.status === 'completed' ? 'secondary' : cls.status === 'ongoing' ? 'default' : 'outline'}
                        className="text-[10px] sm:text-xs"
                      >
                        {cls.status}
                      </Badge>
                      <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {cls.booked}/{cls.capacity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shop & Alerts Section - Mobile optimized */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 md:p-6 pb-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Shop & Inventory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {formatShortCurrency(dashboard.shop.revenueThisMonth)} · {dashboard.shop.ordersToday} orders
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/shop')} className="self-start sm:self-auto min-h-[36px] sm:min-h-0">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-xs sm:text-sm font-medium mb-2">Recent Orders</div>
                {dashboard.shop.recentOrders.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">No recent orders</div>
                ) : (
                  <div className="space-y-2">
                    {dashboard.shop.recentOrders.slice(0, 3).map((order) => (
                      <div key={order.id} className="text-xs sm:text-sm p-2 border rounded">
                        <div className="font-medium truncate">{order.memberName}</div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{order.itemsCount} items</span>
                          <span>{formatShortCurrency(order.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-medium mb-2">Low Stock</div>
                {dashboard.shop.lowStockProducts.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">All stocked</div>
                ) : (
                  <div className="space-y-2">
                    {dashboard.shop.lowStockProducts.slice(0, 3).map((product) => (
                      <div key={product.id} className="text-xs sm:text-sm p-2 border rounded">
                        <div className="font-medium truncate">{product.name}</div>
                        <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs">
                          {product.stock === 0 ? 'Out' : `${product.stock} left`}
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
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            {dashboard.alerts.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 sm:py-8">
                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-green-500" />
                <div className="text-sm">All clear! No urgent alerts.</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {dashboard.alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    onClick={() => navigate(alert.link)}
                    className="flex items-center justify-between p-2 sm:p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors gap-2 min-h-[48px]"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                        alert.type === 'out_of_stock' || alert.type === 'high_dues' ? 'bg-red-100 text-red-600' :
                        alert.type === 'expiring_membership' || alert.type === 'missed_followup' ? 'bg-orange-100 text-orange-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">{alert.title}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">{alert.description}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs - Mobile optimized with full-screen on small devices */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">Add New Member</DialogTitle>
            <DialogDescription className="text-sm">Enter the member details below</DialogDescription>
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">Add New Lead</DialogTitle>
            <DialogDescription className="text-sm">Enter the lead details below</DialogDescription>
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">Record Payment</DialogTitle>
            <DialogDescription className="text-sm">Record a new payment from a member</DialogDescription>
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
