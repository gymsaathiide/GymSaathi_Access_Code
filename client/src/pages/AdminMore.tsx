import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CalendarDays, 
  ShoppingBag, 
  Users, 
  Dumbbell, 
  ClipboardList,
  Settings,
  BarChart3,
  QrCode,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  path: string;
  roles?: string[];
}

export default function AdminMore() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const userRole = user?.role || 'admin';

  const menuItems: MenuItem[] = [
    { 
      icon: <CalendarDays className="h-5 w-5" />, 
      label: 'Classes', 
      description: 'Manage class schedules',
      path: `/${userRole}/classes`,
      roles: ['admin', 'trainer', 'member']
    },
    { 
      icon: <ShoppingBag className="h-5 w-5" />, 
      label: 'Shop', 
      description: 'Products and orders',
      path: `/${userRole}/shop`,
      roles: ['admin', 'trainer', 'member']
    },
    { 
      icon: <QrCode className="h-5 w-5" />, 
      label: 'Attendance', 
      description: 'Check-in/out records',
      path: `/${userRole}/attendance`,
      roles: ['admin', 'trainer', 'member']
    },
    { 
      icon: <Dumbbell className="h-5 w-5" />, 
      label: 'Trainers', 
      description: 'Manage trainers',
      path: '/admin/trainers',
      roles: ['admin']
    },
    { 
      icon: <ClipboardList className="h-5 w-5" />, 
      label: 'Plans', 
      description: 'Membership plans',
      path: '/admin/plans',
      roles: ['admin']
    },
    { 
      icon: <BarChart3 className="h-5 w-5" />, 
      label: 'Analytics', 
      description: 'View insights',
      path: '/admin/analytics',
      roles: ['admin']
    },
  ];

  const filteredItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const handleNavigate = (path: string) => {
    setLocation(path);
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">More</h1>
        <p className="text-muted-foreground text-sm">Additional features and settings</p>
      </div>

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <Card 
            key={item.path}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleNavigate(item.path)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-4 border-t mt-6">
        <Card 
          className="cursor-pointer hover:bg-destructive/10 transition-colors border-destructive/20"
          onClick={handleLogout}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive">Sign Out</p>
                <p className="text-sm text-muted-foreground">Log out of your account</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-6 text-xs text-muted-foreground">
        <p>Logged in as {user?.email}</p>
        <p className="capitalize">{userRole} Account</p>
      </div>
    </div>
  );
}
