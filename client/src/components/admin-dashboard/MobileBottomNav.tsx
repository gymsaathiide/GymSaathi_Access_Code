import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getBottomNavConfig } from '@/lib/navigation-config';
import { Menu, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userRole?: string;
}

export function MobileBottomNav({ currentPath, onNavigate, userRole = 'admin' }: MobileBottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { primaryItems, overflowItems, hasOverflow } = getBottomNavConfig(userRole);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    onNavigate(path);
  };

  const isItemActive = (url: string) => {
    return currentPath === url || currentPath.startsWith(url + '/');
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {primaryItems.map((item) => {
        const isActive = isItemActive(item.url);
        
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
      
      {hasOverflow && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'mobile-nav-item',
                overflowItems.some(item => isItemActive(item.url)) && 'active'
              )}
            >
              <Menu className="h-5 w-5 xs:h-[1.125rem] xs:w-[1.125rem]" />
              <span className="text-[10px] xs:text-xs font-medium leading-tight truncate max-w-[3.5rem]">More</span>
            </button>
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="bg-[hsl(220,26%,14%)] border-t border-white/10 rounded-t-2xl max-h-[70vh]"
          >
            <SheetHeader className="pb-4 border-b border-white/10">
              <SheetTitle className="text-white text-lg">More Options</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-1 overflow-y-auto">
              {overflowItems.map((item) => {
                const isActive = isItemActive(item.url);
                
                return (
                  <button
                    key={item.url}
                    onClick={() => handleNavigate(item.url)}
                    className={cn(
                      'w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-colors',
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  );
}
