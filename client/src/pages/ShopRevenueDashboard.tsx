import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  IndianRupee, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Calendar,
  Loader2,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface ShopRevenueData {
  totalRevenue: number;
  ordersCount: number;
  todayRevenue: number;
  monthlyRevenue: number;
  avgOrderValue: number;
  graphData: Array<{ date: string; revenue: number; displayDate: string }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    memberName: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    orderDate: string;
  }>;
  period: string;
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

const formatFullCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  valueColor?: string;
  trend?: number;
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor = 'text-orange-500', valueColor = 'text-white', trend }: StatCardProps) {
  return (
    <Card className="bg-card-dark border-white/5 overflow-hidden relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-white/60 flex items-center gap-2">
          <Icon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-xl sm:text-2xl font-bold truncate", valueColor)}>{value}</div>
        {(subtitle || trend !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {trend !== undefined && (
              <span className={cn(
                "flex items-center text-xs font-medium",
                trend >= 0 ? "text-green-400" : "text-red-400"
              )}>
                <TrendingUp className={cn("h-3 w-3 mr-0.5", trend < 0 && "rotate-180")} />
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="text-white/50 text-xs truncate">{subtitle}</span>}
          </div>
        )}
      </CardContent>
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full" />
    </Card>
  );
}

const periodOptions = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: '7 Days' },
  { value: '30days', label: '30 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

function RevenueGraph({ data, isLoading }: { data: ShopRevenueData['graphData']; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="bg-card-dark border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Shop Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] sm:h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-card-dark border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Shop Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[260px] sm:h-[300px] text-center">
          <ShoppingCart className="h-12 w-12 text-white/20 mb-3" />
          <p className="text-white/50 text-sm">No order data available</p>
          <p className="text-white/30 text-xs mt-1">Revenue will appear here when orders are placed</p>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const maxRevenue = Math.max(...data.map(d => d.revenue));

  return (
    <Card className="bg-card-dark border-white/5">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="truncate">Shop Revenue Trend</span>
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-white/50">Period Total</p>
            <p className="text-lg sm:text-xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="w-full h-[260px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={data} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.05)" 
                vertical={false}
              />
              <XAxis 
                dataKey="displayDate" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                tickFormatter={(value) => value >= 1000 ? `₹${(value/1000).toFixed(0)}k` : `₹${value}`}
                width={50}
                domain={[0, maxRevenue > 0 ? 'auto' : 1000]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                formatter={(value: number) => [formatFullCurrency(value), 'Revenue']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#22c55e" 
                strokeWidth={2}
                fill="url(#colorRevenue)" 
                name="Revenue"
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'Pending' },
    confirmed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle2, label: 'Confirmed' },
    packed: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Package, label: 'Packed' },
    shipped: { color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: TrendingUp, label: 'Shipped' },
    delivered: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2, label: 'Delivered' },
    cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Cancelled' },
  };
  const config = statusConfig[status] || { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: AlertCircle, label: status };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("text-xs border", config.color)}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function getPaymentBadge(status: string) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    paid: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Paid' },
    unpaid: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Unpaid' },
    refunded: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Refunded' },
  };
  const config = statusConfig[status] || { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: status };
  return (
    <Badge variant="outline" className={cn("text-xs border", config.color)}>
      {config.label}
    </Badge>
  );
}

function RecentOrdersTable({ orders, isLoading }: { orders: ShopRevenueData['recentOrders']; isLoading: boolean }) {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card className="bg-card-dark border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="bg-card-dark border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Package className="h-12 w-12 text-white/20 mb-3" />
          <p className="text-white/50 text-sm">No recent orders</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-dark border-white/5">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-orange-500" />
          Recent Orders
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs"
          onClick={() => navigate('/admin/shop')}
        >
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-xs font-medium text-white/50">Order</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-white/50">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-white/50">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-white/50">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-white/50">Payment</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-white/50">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/shop?order=${order.id}`)}
                >
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-white">{order.orderNumber}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-white/80">{order.memberName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-green-400">{formatFullCurrency(order.totalAmount)}</span>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="py-3 px-4">
                    {getPaymentBadge(order.paymentStatus)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-white/60">
                      {new Date(order.orderDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ShopRevenueDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery<ShopRevenueData>({
    queryKey: ['/api/admin/shop-revenue', selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/shop-revenue?period=${selectedPeriod}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch shop revenue data');
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Shop Orders Revenue</h1>
          <p className="text-white/60 text-sm mt-1">Track your shop sales and revenue performance</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="border-white/10 text-white hover:bg-white/10 self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data?.todayRevenue || 0)}
          icon={IndianRupee}
          iconColor="text-green-500"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data?.monthlyRevenue || 0)}
          subtitle="This month"
          icon={Calendar}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Total Orders"
          value={data?.ordersCount || 0}
          subtitle={`₹${(data?.avgOrderValue || 0).toFixed(0)} avg`}
          icon={ShoppingCart}
          iconColor="text-orange-500"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(data?.avgOrderValue || 0)}
          icon={TrendingUp}
          iconColor="text-purple-500"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedPeriod === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(option.value)}
            className={cn(
              "text-xs sm:text-sm",
              selectedPeriod === option.value 
                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                : 'border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <RevenueGraph data={data?.graphData || []} isLoading={isLoading} />

      <RecentOrdersTable orders={data?.recentOrders || []} isLoading={isLoading} />
    </div>
  );
}
