import { cn } from '@/lib/utils';

interface PageCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function PageCard({ title, description, children, className, headerAction }: PageCardProps) {
  return (
    <div className={cn(
      "bg-card-dark rounded-2xl border border-white/5 overflow-hidden",
      className
    )}>
      {(title || description) && (
        <div className="px-4 md:px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {description && <p className="text-white/50 text-sm mt-0.5">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  );
}
