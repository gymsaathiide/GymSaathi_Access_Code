import { ChevronRight, Phone, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoPanelProps {
  title: string;
  moreLabel?: string;
  onMoreClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function InfoPanel({ title, moreLabel = 'More', onMoreClick, children, className }: InfoPanelProps) {
  return (
    <div className={cn('info-panel', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700"
          >
            {moreLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

interface RenewalsPanelProps {
  expiringDays?: number;
  duesAmount: string;
  onSendReminder?: () => void;
  onMoreClick?: () => void;
}

export function RenewalsPanel({ expiringDays = 14, duesAmount, onSendReminder, onMoreClick }: RenewalsPanelProps) {
  return (
    <InfoPanel title="Renewals & Payments" onMoreClick={onMoreClick}>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Expiring Members</span>
          <span className="font-medium text-gray-900">{expiringDays} days</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Dues</span>
          <span className="font-bold text-orange-500">{duesAmount}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600">Send Reminder</span>
          <button
            onClick={onSendReminder}
            className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </InfoPanel>
  );
}

interface Lead {
  id: string;
  name: string;
  status: string;
}

interface LeadsPanelProps {
  leads: Lead[];
  onViewAll?: () => void;
}

export function LeadsPanel({ leads, onViewAll }: LeadsPanelProps) {
  return (
    <InfoPanel title="Leads & Follow-ups" moreLabel="View All Leads" onMoreClick={onViewAll}>
      <div className="space-y-3">
        {leads.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No follow-ups today</p>
        ) : (
          leads.slice(0, 3).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-900 font-medium">{lead.name}</span>
              <span className="text-sm text-gray-500 capitalize">{lead.status}</span>
            </div>
          ))
        )}
      </div>
    </InfoPanel>
  );
}

interface ShopOrder {
  id: string;
  amount: string;
}

interface ShopOrdersPanelProps {
  pendingOrders: number;
  completedOrders: number;
  onViewOrders?: () => void;
}

export function ShopOrdersPanel({ pendingOrders, completedOrders, onViewOrders }: ShopOrdersPanelProps) {
  return (
    <InfoPanel title="Shop Orders" moreLabel="View Orders" onMoreClick={onViewOrders}>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Pending</span>
          <span className="font-medium text-orange-500">{pendingOrders}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600">Completed</span>
          <span className="font-medium text-green-600">{completedOrders}</span>
        </div>
      </div>
    </InfoPanel>
  );
}
