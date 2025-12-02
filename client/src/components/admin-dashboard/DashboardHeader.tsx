import { ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  gymName: string;
  userName: string;
  userAvatar?: string;
  periods?: string[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export function DashboardHeader({
  gymName,
  userName,
  userAvatar,
  periods = ['This Month', 'Last Month', 'This Week', 'Today'],
  selectedPeriod = 'This Month',
  onPeriodChange,
  onSearch,
  showSearch = false,
}: DashboardHeaderProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="dashboard-header">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <span className="text-white font-bold text-xl hidden md:block">{gymName}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-white font-medium hidden sm:block">{userName}</span>
        <Avatar className="h-10 w-10 border-2 border-white/20">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

interface FilterBarProps {
  periods?: string[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

export function FilterBar({
  periods = ['This Month', 'Last Month', 'This Week', 'Today'],
  selectedPeriod = 'This Month',
  onPeriodChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 px-4 md:px-6 pb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="period-selector flex items-center gap-2">
            {selectedPeriod}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-slate-900 border-white/10">
          {periods.map((period) => (
            <DropdownMenuItem
              key={period}
              onClick={() => onPeriodChange?.(period)}
              className={`text-white hover:bg-white/10 ${period === selectedPeriod ? 'bg-white/10' : ''}`}
            >
              {period}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
