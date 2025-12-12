import { Home, Users, Target, CreditCard, Menu, CalendarDays, QrCode, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  roles?: string[];
}

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userRole?: string;
}

export function MobileBottomNav({ currentPath, onNavigate, userRole = 'admin' }: MobileBottomNavProps) {
  const rolePrefix = userRole === 'superadmin' ? '' : `/${userRole}`;
  
  const adminNavItems: NavItem[] = [
    { icon: <Home className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Home', path: `${rolePrefix || '/admin'}` },
    { icon: <Users className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Members', path: `${rolePrefix}/members` },
    { icon: <Target className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Leads', path: `${rolePrefix}/leads` },
    { icon: <CreditCard className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Billing', path: `${rolePrefix}/billing` },
    { icon: <Menu className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'More', path: `${rolePrefix}/more` },
  ];

  const trainerNavItems: NavItem[] = [
    { icon: <Home className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Home', path: '/trainer' },
    { icon: <Users className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Members', path: '/trainer/members' },
    { icon: <CalendarDays className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Classes', path: '/trainer/classes' },
    { icon: <QrCode className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Attendance', path: '/trainer/attendance' },
    { icon: <Menu className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'More', path: '/trainer/more' },
  ];

  const memberNavItems: NavItem[] = [
    { icon: <Home className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Home', path: '/member' },
    { icon: <CalendarDays className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Classes', path: '/member/classes' },
    { icon: <QrCode className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Attendance', path: '/member/attendance' },
    { icon: <ShoppingBag className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'Shop', path: '/member/shop' },
    { icon: <Menu className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />, label: 'More', path: '/member/more' },
  ];

  const navItems = userRole === 'member' ? memberNavItems : 
                   userRole === 'trainer' ? trainerNavItems : 
                   adminNavItems;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const isActive = currentPath === item.path || 
          currentPath.startsWith(item.path + '/');
        
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={cn('mobile-nav-item', isActive && 'active')}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon}
            <span className="text-[10px] xs:text-xs font-medium leading-tight truncate max-w-[3.5rem]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
