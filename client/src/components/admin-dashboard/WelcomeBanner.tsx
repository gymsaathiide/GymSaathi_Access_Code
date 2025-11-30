import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface WelcomeBannerProps {
  className?: string;
}

export function WelcomeBanner({ className }: WelcomeBannerProps) {
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
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a1f2e] to-[#2d3748]",
      "p-6 md:p-8",
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
        <p className="text-white/50 text-sm mb-1">{formattedDate}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {getGreeting()}, <span className="text-orange-400">{firstName}</span>
        </h1>
        <p className="text-white/70 text-sm md:text-base max-w-md">
          Welcome to {gym?.name || 'your gym'}. Ready to manage your fitness business and help members achieve their goals?
        </p>
        
        <div className="flex flex-wrap gap-3 mt-6">
          <button className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors text-sm">
            View Analytics
          </button>
          <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm border border-white/10">
            Quick Actions
          </button>
        </div>
      </div>

      <div className="absolute top-4 right-4 hidden lg:flex gap-3">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white/80 text-sm">Live</span>
        </div>
      </div>
    </div>
  );
}
