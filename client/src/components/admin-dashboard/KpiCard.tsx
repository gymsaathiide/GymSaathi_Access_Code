import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KpiCardVariant = 'blue' | 'orange' | 'purple' | 'green' | 'teal';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  variant: KpiCardVariant;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const variantClasses: Record<KpiCardVariant, string> = {
  blue: 'kpi-card-blue',
  orange: 'kpi-card-orange',
  purple: 'kpi-card-purple',
  green: 'kpi-card-green',
  teal: 'kpi-card-teal',
};

export function KpiCard({ title, value, subtitle, trend, variant, icon, onClick }: KpiCardProps) {
  return (
    <div
      className={cn('kpi-card cursor-pointer', variantClasses[variant])}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium opacity-90">{title}</span>
        {icon ? icon : <ArrowUpRight className="h-4 w-4 opacity-80" />}
      </div>
      <div className="text-3xl md:text-4xl font-bold text-shadow-sm">{value}</div>
      {(subtitle || trend) && (
        <div className="mt-1 text-sm opacity-80">
          {trend && <span className="font-medium">{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
