import { cn } from '@/lib/utils';
import { getBottomNavItems } from '@/lib/navigation-config';

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userRole?: string;
}

export function MobileBottomNav({ currentPath, onNavigate, userRole = 'admin' }: MobileBottomNavProps) {
  const navItems = getBottomNavItems(userRole);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const isActive = currentPath === item.url || 
          currentPath.startsWith(item.url + '/');
        
        return (
          <button
            key={item.url}
            onClick={() => onNavigate(item.url)}
            className={cn('mobile-nav-item', isActive && 'active')}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />
            <span className="text-[10px] xs:text-xs font-medium leading-tight truncate max-w-[3.5rem]">{item.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
