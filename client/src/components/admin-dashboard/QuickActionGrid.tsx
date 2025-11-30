import { UserPlus, CreditCard, Dumbbell, Package, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  variant: 'green' | 'orange' | 'blue' | 'purple';
  onClick: () => void;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  showMore?: boolean;
  onMoreClick?: () => void;
}

const variantClasses = {
  green: 'quick-action-green',
  orange: 'quick-action-orange',
  blue: 'quick-action-blue',
  purple: 'quick-action-purple',
};

export function QuickActionGrid({ actions, showMore, onMoreClick }: QuickActionGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={cn('quick-action-btn flex items-center justify-center gap-2', variantClasses[action.variant])}
        >
          {action.icon}
          <span className="hidden sm:inline">{action.label}</span>
          <span className="sm:hidden">{action.label.split(' ')[0]}</span>
        </button>
      ))}
      {showMore && (
        <button
          onClick={onMoreClick}
          className="quick-action-btn bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export const defaultQuickActions = (navigate: (path: string) => void, openMemberDialog: () => void, openPaymentDialog: () => void): QuickAction[] => [
  {
    label: 'Add Member',
    icon: <UserPlus className="h-5 w-5" />,
    variant: 'green',
    onClick: openMemberDialog,
  },
  {
    label: 'Record Payment',
    icon: <CreditCard className="h-5 w-5" />,
    variant: 'orange',
    onClick: openPaymentDialog,
  },
  {
    label: 'Create Class',
    icon: <Dumbbell className="h-5 w-5" />,
    variant: 'blue',
    onClick: () => navigate('/admin/classes'),
  },
  {
    label: 'Add Product',
    icon: <Package className="h-5 w-5" />,
    variant: 'green',
    onClick: () => navigate('/admin/shop'),
  },
];
