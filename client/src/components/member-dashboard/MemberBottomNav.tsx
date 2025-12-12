import { Home, ChefHat, Clock, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface MemberBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function MemberBottomNav({ currentPath, onNavigate }: MemberBottomNavProps) {
  const navItems: NavItem[] = [
    { icon: <Home className="w-5 h-5" />, label: 'Diary', path: '/member' },
    { icon: <ChefHat className="w-5 h-5" />, label: 'Recipes', path: '/member/diet-planner' },
    { icon: <Clock className="w-5 h-5" />, label: 'History', path: '/member/history' },
    { icon: <Crown className="w-5 h-5" />, label: 'Premium', path: '/member/premium' },
  ];

  return (
    <nav className="member-bottom-nav md:hidden" aria-label="Member navigation">
      {navItems.map((item) => {
        const isActive = currentPath === item.path || 
          (item.path !== '/member' && currentPath.startsWith(item.path));
        
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={cn('member-nav-item', isActive && 'active')}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon}
            {isActive && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
