import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateBranchDialog } from './CreateBranchDialog';

interface Branch {
  id: string;
  name: string;
  isMain: boolean;
  address?: string;
  phone?: string;
}

interface DashboardHeaderProps {
  gymName: string;
  userName: string;
  userAvatar?: string;
  branches?: string[];
  selectedBranch?: string;
  onBranchChange?: (branch: string) => void;
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
  branches = ['Main Branch'],
  selectedBranch = 'Main Branch',
  onBranchChange,
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
  const [showCreateBranchDialog, setShowCreateBranchDialog] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const { data: branches = [], refetch: refetchBranches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
    refetchInterval: 30000,
  });

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches.find(b => b.isMain) || branches[0];
  const displayBranchName = selectedBranch?.isMain ? 'Main Branch' : selectedBranch?.name || 'Main Branch';

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranchId(branch.id);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 px-4 md:px-6 pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="branch-selector flex items-center gap-2">
              {displayBranchName}
              <ChevronDown className="h-4 w-4 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-white/10">
            {branches.length > 0 ? (
              branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch)}
                  className={`text-white hover:bg-white/10 ${branch.id === selectedBranch?.id ? 'bg-white/10' : ''}`}
                >
                  <div className="flex flex-col">
                    <span>{branch.isMain ? 'Main Branch' : branch.name}</span>
                    {branch.address && (
                      <span className="text-xs text-white/50 truncate max-w-[200px]">{branch.address}</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="text-white/50">
                No branches found
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => setShowCreateBranchDialog(true)}
              className="text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Branch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

      <CreateBranchDialog
        open={showCreateBranchDialog}
        onOpenChange={setShowCreateBranchDialog}
        onSuccess={() => refetchBranches()}
      />
    </>
  );
}
