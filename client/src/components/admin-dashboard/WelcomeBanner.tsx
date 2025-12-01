import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CreditCard, Headphones, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentDetailsDialog } from './PaymentDetailsDialog';
import { HelpdeskDialog } from './HelpdeskDialog';

interface WelcomeBannerProps {
  className?: string;
}

export function WelcomeBanner({ className }: WelcomeBannerProps) {
  const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
  const [isHelpdeskOpen, setIsHelpdeskOpen] = useState(false);

  const { data: user } = useQuery<{ name: string; role: string }>({
    queryKey: ['/api/auth/me'],
  });

  const { data: gym } = useQuery<{ name: string }>({
    queryKey: ['/api/gym'],
  });

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <>
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a1f2e] to-[#2d3748]",
        "p-4 sm:p-6 md:p-8",
        className
      )}>
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10"></div>
        
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block">
          <div className="relative h-full">
            <img 
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80"
              alt="Gym"
              className="absolute right-0 top-0 h-full w-auto object-cover opacity-40 rounded-r-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f2e] via-[#1a1f2e]/80 to-transparent"></div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-xs sm:text-sm mb-1">{formattedDate}</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
            {getGreeting()}, <span className="text-orange-400">{firstName}</span>
          </h1>
          <p className="text-white/70 text-xs sm:text-sm md:text-base max-w-md">
            Welcome to {gym?.name || 'your gym'}. Ready to manage your fitness business and help members achieve their goals?
          </p>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button className="px-3 sm:px-5 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors text-xs sm:text-sm">
              View Analytics
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 sm:px-5 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-xs sm:text-sm border border-white/10 flex items-center gap-1.5 sm:gap-2">
                  Quick Actions
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-[hsl(220,26%,16%)] border-white/10">
                <DropdownMenuItem
                  onClick={() => setIsPaymentDetailsOpen(true)}
                  className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10 gap-3"
                >
                  <CreditCard className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="font-medium">My Payment Details</div>
                    <div className="text-xs text-white/50">Manage UPI & Bank info</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsHelpdeskOpen(true)}
                  className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10 gap-3"
                >
                  <Headphones className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium">GymSaathi Helpdesk</div>
                    <div className="text-xs text-white/50">24x7 Support</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="absolute top-4 right-4 hidden lg:flex gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white/80 text-sm">Live</span>
          </div>
        </div>
      </div>

      <PaymentDetailsDialog
        open={isPaymentDetailsOpen}
        onOpenChange={setIsPaymentDetailsOpen}
      />

      <HelpdeskDialog
        open={isHelpdeskOpen}
        onOpenChange={setIsHelpdeskOpen}
      />
    </>
  );
}
