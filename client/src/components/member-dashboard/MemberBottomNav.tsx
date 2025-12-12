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
    { icon: <Clock className="w-5 h-5" />, label: 'History', path: '/member/diet-planner/history' },
    { icon: <Crown className="w-5 h-5" />, label: 'Premium', path: '/member/premium' },
  ];

  return (
    <>
      <nav className="member-bottom-nav lg:hidden" aria-label="Member navigation">
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
      
      <nav className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-r-2xl shadow-lg p-3 z-50" aria-label="Desktop member navigation">
        {navItems.map((item) => {
          const isActive = currentPath === item.path || 
            (item.path !== '/member' && currentPath.startsWith(item.path));
          
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-orange-50'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
