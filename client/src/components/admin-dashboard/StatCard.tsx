import { cn } from '@/lib/utils';

export type StatCardVariant = 'blue' | 'orange' | 'green' | 'purple' | 'teal';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string | number;
  variant: StatCardVariant;
  onClick?: () => void;
}

const variantClasses: Record<StatCardVariant, string> = {
  blue: 'stat-card-blue',
  orange: 'stat-card-orange',
  green: 'stat-card-green',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-700',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-700',
};

export function StatCard({ title, value, subtitle, badge, variant, onClick }: StatCardProps) {
  return (
    <div
      className={cn('stat-card cursor-pointer', variantClasses[variant])}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium opacity-90">{title}</span>
        {badge !== undefined && (
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="text-4xl md:text-5xl font-bold mt-2 text-shadow-sm">{value}</div>
      {subtitle && (
        <div className="text-sm opacity-80 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

interface AlertCardProps {
  title: string;
  subtitle?: string;
  variant: 'warning' | 'danger';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function AlertCard({ title, subtitle, variant, icon, onClick }: AlertCardProps) {
  return (
    <div
      className={cn(
        'alert-card cursor-pointer',
        variant === 'warning' ? 'alert-card-warning' : 'alert-card-danger'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      {subtitle && (
        <div className="text-sm opacity-90 mt-1">{subtitle}</div>
      )}
    </div>
  );
}
