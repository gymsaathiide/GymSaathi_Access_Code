import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  IndianRupee, 
  Calendar, 
  UserPlus,
  Clock,
  Loader2,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/lib/utils';

interface AdminAnalyticsData {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
  };
  members: {
    total: number;
    active: number;
    newThisMonth: number;
    expiringSoon: number;
  };
  attendance: {
    trend: Array<{ date: string; day: string; checkIns: number }>;
    todayCheckIns: number;
  };
  planDistribution: Array<{ name: string; value: number }>;
}

const formatCurrency = (amount: number) => {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
};

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308'];

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  iconColor?: string;
  valueColor?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, iconColor = 'text-orange-500', valueColor = 'text-white' }: StatCardProps) {
  return (
    <Card className="bg-card-dark border-white/5 overflow-hidden relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>
        {(subtitle || trend !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {trend !== undefined && (
              <span className={cn(
                "flex items-center text-xs font-medium",
                trend >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="text-white/50 text-xs">{subtitle}</span>}
          </div>
        )}
      </CardContent>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full" />
    </Card>
  );
}

function CollectionRateGauge({ rate }: { rate: number }) {
  const strokeDasharray = 251.2; // 2 * π * 40
  const strokeDashoffset = strokeDasharray - (strokeDasharray * rate) / 100;
  
  return (
    <Card className="bg-card-dark border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-500" />
          Collection Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-4">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="40"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="12"
            />
            <circle
              cx="64"
              cy="64"
              r="40"
              fill="none"
              stroke={rate >= 80 ? '#22c55e' : rate >= 50 ? '#f97316' : '#ef4444'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{rate.toFixed(0)}%</span>
            <span className="text-xs text-white/50">collected</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceChart({ data }: { data: Array<{ date: string; day: string; checkIns: number }> }) {
  return (
    <Card className="bg-card-dark border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          7-Day Check-ins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              />
              <YAxis 
                hide 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar 
                dataKey="checkIns" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                name="Check-ins"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyRevenueChart() {
  const { data: revenueTrend, isLoading } = useQuery<{ month: string; year: number; collected: number; pending: number }[]>({
    queryKey: ['/api/billing/revenue-trend'],
    queryFn: async () => {
      const res = await fetch('/api/billing/revenue-trend', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch revenue trend');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-card-dark border-white/5 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-500" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  if (!revenueTrend || revenueTrend.length === 0) {
    return (
      <Card className="bg-card-dark border-white/5 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-500" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-white/50 text-sm">No revenue data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalCollected = revenueTrend.reduce((sum, item) => sum + item.collected, 0);
  const totalPending = revenueTrend.reduce((sum, item) => sum + item.pending, 0);
  const avgRevenue = totalCollected / revenueTrend.length;

  return (
    <Card className="bg-card-dark border-white/5 md:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-500" />
            <span className="truncate">Monthly Revenue (Last 6 Months)</span>
          </CardTitle>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-white/50">Collected</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(totalCollected)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Pending</p>
              <p className="text-lg font-bold text-orange-400">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString('en-IN')}`, 
                  name === 'collected' ? 'Collected' : 'Pending'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="collected" 
                stroke="#22c55e" 
                strokeWidth={2}
                fill="url(#colorCollected)" 
                name="collected"
              />
              <Area 
                type="monotone" 
                dataKey="pending" 
                stroke="#f97316" 
                strokeWidth={2}
                fill="url(#colorPending)" 
                name="pending"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-3">
          <span>Avg. Monthly: {formatCurrency(avgRevenue)}</span>
          <span>{revenueTrend.length} months shown</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanDistributionChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <Card className="bg-card-dark border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-white/50 text-sm">No active memberships</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-dark border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white/60">Plan Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {data.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-white/70 truncate max-w-[100px]">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsDashboard() {
  const { data, isLoading, error } = useQuery<AdminAnalyticsData>({
    queryKey: ['/api/admin/analytics'],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card-dark border-white/5 h-32 animate-pulse">
            <CardContent className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-card-dark border-white/5">
        <CardContent className="py-8 text-center">
          <p className="text-red-400">Failed to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Analytics Overview</h3>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="This Month"
          value={formatCurrency(data.revenue.thisMonth)}
          trend={data.revenue.growth}
          subtitle="vs last month"
          icon={IndianRupee}
          iconColor="text-green-500"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(data.revenue.totalCollected)}
          icon={IndianRupee}
          iconColor="text-green-500"
        />
        <StatCard
          title="Pending Dues"
          value={formatCurrency(data.revenue.totalPending)}
          icon={IndianRupee}
          iconColor="text-red-500"
          valueColor="text-red-400"
        />
        <StatCard
          title="Active Members"
          value={data.members.active}
          subtitle={`of ${data.members.total} total`}
          icon={Users}
          iconColor="text-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New This Month"
          value={data.members.newThisMonth}
          icon={UserPlus}
          iconColor="text-purple-500"
        />
        <StatCard
          title="Expiring Soon"
          value={data.members.expiringSoon}
          subtitle="within 7 days"
          icon={Clock}
          iconColor="text-yellow-500"
          valueColor={data.members.expiringSoon > 0 ? "text-yellow-400" : "text-white"}
        />
        <StatCard
          title="Today's Check-ins"
          value={data.attendance.todayCheckIns}
          icon={Calendar}
          iconColor="text-blue-500"
        />
        <CollectionRateGauge rate={data.revenue.collectionRate} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MonthlyRevenueChart />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AttendanceChart data={data.attendance.trend} />
        <PlanDistributionChart data={data.planDistribution} />
      </div>
    </div>
  );
}
