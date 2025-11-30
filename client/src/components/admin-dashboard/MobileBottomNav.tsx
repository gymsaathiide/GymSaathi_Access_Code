import { Home, Users, Target, CreditCard, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
}

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function MobileBottomNav({ currentPath, onNavigate }: MobileBottomNavProps) {
  const navItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: 'Home', path: '/admin' },
    { icon: <Users className="h-5 w-5" />, label: 'Members', path: '/admin/members' },
    { icon: <Target className="h-5 w-5" />, label: 'Leads', path: '/admin/leads' },
    { icon: <CreditCard className="h-5 w-5" />, label: 'Billing', path: '/admin/billing' },
    { icon: <Menu className="h-5 w-5" />, label: 'More', path: '/admin/more' },
  ];

  return (
    <nav className="mobile-bottom-nav safe-area-bottom">
      {navItems.map((item) => {
        const isActive = currentPath === item.path || 
          (item.path === '/admin' && currentPath === '/admin/dashboard');
        
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={cn('mobile-nav-item', isActive && 'active')}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
