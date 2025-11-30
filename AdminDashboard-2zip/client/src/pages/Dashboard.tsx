import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, IndianRupee, Users, TrendingUp, TrendingDown, 
  Calendar, Wallet, ArrowUpRight, CircleDot, Clock, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

interface RevenueKPIs {
  revenueThisMonth: {
    value: number;
    growth: number;
    sparkline: Array<{ month: string; value: number }>;
  };
  revenueAllTime: {
    value: number;
  };
  mrr: {
    value: number;
    formula: string;
  };
  arr: {
    value: number;
    formula: string;
  };
  upcomingRevenue: {
    value: number;
    period: string;
  };
}

interface PlatformKPIs {
  totalGyms: {
    value: number;
    breakdown: {
      active: number;
      suspended: number;
      trial: number;
      inactive: number;
    };
  };
  activeGyms: {
    value: number;
    label: string;
  };
  totalMembers: {
    value: number;
    activeMembers: number;
  };
  newGymsThisMonth: {
    value: number;
    growth: number;
    sparkline: Array<{ month: string; value: number }>;
  };
}

interface TrendData {
  revenueTrend: Array<{ month: string; year: number; billed: number; collected: number }>;
  memberTrend: Array<{ month: string; value: number }>;
  gymTrend: Array<{ month: string; newGyms: number; totalGyms: number }>;
}

const formatCurrency = (amount: number) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
};

const formatFullCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const MiniSparkline = ({ data, color = "#f97316" }: { data: Array<{ month: string; value: number }>; color?: string }) => (
  <div className="h-10 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          fill={color}
          fillOpacity={0.2}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const TrendIndicator = ({ value, suffix = "vs last month" }: { value: number; suffix?: string }) => {
  const isPositive = value >= 0;
  return (
    <div className="flex items-center gap-1 text-xs">
      {isPositive ? (
        <TrendingUp className="h-3 w-3 text-green-500" />
      ) : (
        <TrendingDown className="h-3 w-3 text-red-500" />
      )}
      <span className={isPositive ? "text-green-500" : "text-red-500"}>
        {isPositive ? "+" : ""}{value.toFixed(1)}%
      </span>
      <span className="text-muted-foreground">{suffix}</span>
    </div>
  );
};

const StatusBadge = ({ status, count }: { status: string; count: number }) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    suspended: 'destructive',
    trial: 'secondary',
    inactive: 'outline'
  };
  
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    suspended: 'bg-red-500',
    trial: 'bg-blue-500',
    inactive: 'bg-gray-400'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${colors[status]}`} />
      <span className="text-sm capitalize">{status}</span>
      <Badge variant={variants[status]} className="ml-auto">{count}</Badge>
    </div>
  );
};

export default function Dashboard() {
  const { data: revenueKPIs, isLoading: revenueLoading } = useQuery<RevenueKPIs>({
    queryKey: ['/api/superadmin/kpis/revenue'],
  });

  const { data: platformKPIs, isLoading: platformLoading } = useQuery<PlatformKPIs>({
    queryKey: ['/api/superadmin/kpis/platform'],
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendData>({
    queryKey: ['/api/superadmin/kpis/trends'],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of your gym management platform
        </p>
      </div>

      {/* Revenue & Economics Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Revenue & Economics</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Total Revenue This Month */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Revenue (This Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {revenueLoading ? '...' : formatCurrency(revenueKPIs?.revenueThisMonth.value || 0)}
                  </div>
                  {revenueKPIs && (
                    <TrendIndicator value={revenueKPIs.revenueThisMonth.growth} />
                  )}
                </div>
                {revenueKPIs?.revenueThisMonth.sparkline && (
                  <MiniSparkline data={revenueKPIs.revenueThisMonth.sparkline} />
                )}
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-orange-500 to-orange-300" />
          </Card>

          {/* Total Revenue All Time */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Revenue (All Time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueLoading ? '...' : formatCurrency(revenueKPIs?.revenueAllTime.value || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime platform earnings
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-green-500 to-green-300" />
          </Card>

          {/* MRR */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                MRR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {revenueLoading ? '...' : formatCurrency(revenueKPIs?.mrr.value || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly Recurring Revenue
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-blue-500 to-blue-300" />
          </Card>

          {/* ARR */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                ARR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {revenueLoading ? '...' : formatCurrency(revenueKPIs?.arr.value || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Annual Recurring Revenue
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-purple-500 to-purple-300" />
          </Card>

          {/* Upcoming Revenue */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {revenueLoading ? '...' : formatCurrency(revenueKPIs?.upcomingRevenue.value || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {revenueKPIs?.upcomingRevenue.period || 'Next 30 days'}
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-emerald-300" />
          </Card>
        </div>
      </div>

      {/* Platform Users & Gyms Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Platform Users & Gyms</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Gyms with Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gyms on Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3">
                {platformLoading ? '...' : platformKPIs?.totalGyms.value || 0}
              </div>
              <Separator className="my-3" />
              <div className="space-y-2">
                {platformKPIs?.totalGyms.breakdown && (
                  <>
                    <StatusBadge status="active" count={platformKPIs.totalGyms.breakdown.active} />
                    <StatusBadge status="suspended" count={platformKPIs.totalGyms.breakdown.suspended} />
                    <StatusBadge status="trial" count={platformKPIs.totalGyms.breakdown.trial} />
                    <StatusBadge status="inactive" count={platformKPIs.totalGyms.breakdown.inactive} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Paying Gyms */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                Active Gyms
              </CardTitle>
              <CardDescription className="text-green-600/80 dark:text-green-500/80">
                {platformKPIs?.activeGyms.label || 'Paying gyms'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700 dark:text-green-400">
                {platformLoading ? '...' : platformKPIs?.activeGyms.value || 0}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
                <CircleDot className="h-3 w-3 animate-pulse" />
                Active and generating revenue
              </div>
            </CardContent>
          </Card>

          {/* Total Members */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Members
              </CardTitle>
              <CardDescription>
                Across all gyms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {platformLoading ? '...' : (platformKPIs?.totalMembers.value || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-sm">
                <span className="text-green-600 font-medium">
                  {platformKPIs?.totalMembers.activeMembers || 0}
                </span>
                <span className="text-muted-foreground"> active memberships</span>
              </div>
            </CardContent>
          </Card>

          {/* New Gyms This Month */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                New Gyms This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {platformLoading ? '...' : platformKPIs?.newGymsThisMonth.value || 0}
                  </div>
                  {platformKPIs && (
                    <TrendIndicator value={platformKPIs.newGymsThisMonth.growth} />
                  )}
                </div>
                {platformKPIs?.newGymsThisMonth.sparkline && (
                  <MiniSparkline data={platformKPIs.newGymsThisMonth.sparkline} color="#3b82f6" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Billed vs Collected revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trends?.revenueTrend && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis 
                      className="text-xs" 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatFullCurrency(value), 
                        name === 'billed' ? 'Billed' : 'Collected'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="billed" 
                      stroke="#f97316" 
                      fill="#fed7aa" 
                      name="billed"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="collected" 
                      stroke="#22c55e" 
                      fill="#bbf7d0" 
                      name="collected"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gym Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Gym Acquisition</CardTitle>
            <CardDescription>New gym onboarding trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trends?.gymTrend && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends.gymTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar 
                      dataKey="newGyms" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                      name="New Gyms"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Member Growth</CardTitle>
          <CardDescription>Active membership trend across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {trends?.memberTrend && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.memberTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                    name="Active Members"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
