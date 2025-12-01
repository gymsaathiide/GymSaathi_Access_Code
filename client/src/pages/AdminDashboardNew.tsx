import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MemberForm } from '@/components/MemberForm';
import { LeadForm } from '@/components/LeadForm';
import { PaymentForm } from '@/components/PaymentForm';
import {
  KpiCard,
  QuickActionGrid,
  RenewalsPanel,
  LeadsPanel,
  ShopOrdersPanel,
  StatCard,
  AlertCard,
  AnalyticsPanel,
  FilterBar,
  WelcomeBanner,
  PendingPaymentsTable,
  AdminAnalyticsDashboard,
} from '@/components/admin-dashboard';
import {
  UserPlus,
  CreditCard,
  Dumbbell,
  Package,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import type { AdminDashboardResponse } from '@shared/schema';

const formatCurrency = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatFullCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function AdminDashboardNew() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  const { data: dashboard, isLoading, error } = useQuery<AdminDashboardResponse>({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: user } = useQuery<{ name: string; role: string; gymId?: string }>({
    queryKey: ['/api/auth/me'],
  });

  const { data: gym } = useQuery<{ name: string }>({
    queryKey: ['/api/gym'],
    enabled: !!user?.gymId,
  });

  const quickActions = [
    {
      label: 'Add Member',
      icon: <UserPlus className="h-5 w-5" />,
      variant: 'green' as const,
      onClick: () => setIsMemberDialogOpen(true),
    },
    {
      label: 'Record Payment',
      icon: <CreditCard className="h-5 w-5" />,
      variant: 'orange' as const,
      onClick: () => setIsPaymentDialogOpen(true),
    },
    {
      label: 'Create Class',
      icon: <Dumbbell className="h-5 w-5" />,
      variant: 'blue' as const,
      onClick: () => navigate('/admin/classes'),
    },
    {
      label: 'Add Product',
      icon: <Package className="h-5 w-5" />,
      variant: 'green' as const,
      onClick: () => navigate('/admin/shop'),
    },
  ];

  const analyticsData = dashboard?.classes.attendanceLast7Days?.map((day) => ({
    month: new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' }),
    value: day.checkins,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500/20 border-t-orange-500"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-white">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-60" />
          <h3 className="text-xl font-semibold">Failed to load dashboard</h3>
          <p className="text-white/60 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      <FilterBar
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Members"
            value={dashboard.kpis.activeMembers}
            subtitle={`+${dashboard.kpis.newMembersThisMonth} this month`}
            variant="blue"
            onClick={() => navigate('/admin/members')}
          />
          <KpiCard
            title="Revenue"
            value={formatCurrency(dashboard.kpis.revenueThisMonth)}
            trend={`${dashboard.kpis.revenueChangePercent >= 0 ? '+' : ''}${dashboard.kpis.revenueChangePercent.toFixed(0)}%`}
            variant="orange"
            onClick={() => navigate('/admin/billing')}
          />
          <KpiCard
            title="Leads"
            value={dashboard.kpis.leadsInPipeline}
            subtitle={`${dashboard.kpis.followupsToday} follow-ups due`}
            variant="purple"
            onClick={() => navigate('/admin/leads')}
          />
          <KpiCard
            title="Shop Orders"
            value={dashboard.shop?.pendingOrders || 0}
            subtitle={`${dashboard.shop?.lowStockProducts?.length || 0} low stock items`}
            variant="green"
            icon={<ShoppingBag className="h-4 w-4 opacity-80" />}
            onClick={() => navigate('/admin/shop')}
          />
        </div>

        <QuickActionGrid actions={quickActions} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RenewalsPanel
            expiringDays={dashboard.renewals.expiringSoon.length}
            duesAmount={formatFullCurrency(dashboard.kpis.pendingDuesAmount)}
            onMoreClick={() => navigate('/admin/members')}
            onSendReminder={() => {}}
          />
          <LeadsPanel
            leads={dashboard.leads.followupsToday.map((l) => ({
              id: l.id,
              name: l.name,
              status: l.status,
            }))}
            onViewAll={() => navigate('/admin/leads')}
          />
          <ShopOrdersPanel
            pendingOrders={dashboard.shop?.pendingOrders || 0}
            completedOrders={(dashboard.shop?.ordersToday || 0) - (dashboard.shop?.pendingOrders || 0)}
            onViewOrders={() => navigate('/admin/shop')}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Attendance"
            value={dashboard.kpis.todaysCheckins}
            subtitle={`${dashboard.kpis.yesterdaysCheckins} yesterday`}
            variant="blue"
            onClick={() => navigate('/admin/attendance')}
          />
          <StatCard
            title="Today's Classes"
            value={dashboard.today.classesSummary.total}
            subtitle={`${dashboard.today.classesSummary.ongoing} ongoing`}
            badge={dashboard.today.classesSummary.upcoming}
            variant="orange"
            onClick={() => navigate('/admin/classes')}
          />
          <StatCard
            title="Today's Sales"
            value={formatCurrency(dashboard.today.collectionsToday.total)}
            subtitle="All channels"
            variant="green"
            onClick={() => navigate('/admin/billing')}
          />
          <AnalyticsPanel
            data={analyticsData}
            title="Analytics"
            label="Check-ins"
          />
        </div>

        {dashboard.renewals.expiringSoon.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AlertCard
              title="Expires today"
              subtitle={`${dashboard.renewals.expiringSoon.filter((m) => m.daysLeft <= 0).length} memberships`}
              variant="warning"
              icon={<AlertCircle className="h-5 w-5" />}
              onClick={() => navigate('/admin/members')}
            />
          </div>
        )}
      </div>

      <PendingPaymentsTable />

      <AdminAnalyticsDashboard />

      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <MemberForm
            onSuccess={() => {
              setIsMemberDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
            }}
            onCancel={() => setIsMemberDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            onSuccess={() => {
              setIsLeadDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
            }}
            onCancel={() => setIsLeadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <PaymentForm
            onSuccess={() => {
              setIsPaymentDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
