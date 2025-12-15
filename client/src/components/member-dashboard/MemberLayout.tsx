import { ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { MemberBottomNav } from "./MemberBottomNav";

interface MemberLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  userName?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function MemberLayout({
  children,
  title,
  subtitle,
  userName,
  showBackButton = false,
  onBack,
  rightAction,
}: MemberLayoutProps) {
  const [location, setLocation] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="member-container min-h-screen">
      <header className="member-header sticky top-0 z-40 backdrop-blur-sm bg-orange-500/80">
        <div className="flex items-center gap-3 ">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div>
            {userName ? (
              <>
                <h1 className="text-white font-bold text-lg">
                  Hello, {userName}
                </h1>
                <p className="text-white/80 text-sm">
                  {subtitle || "Ready To Plan Your Meals?"}
                </p>
              </>
            ) : title ? (
              <>
                <h1 className="text-white font-bold text-lg">{title}</h1>
                {subtitle && (
                  <p className="text-white/80 text-sm">{subtitle}</p>
                )}
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightAction}
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hidden sm:flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {userName?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
        </div>
      </header>

      <main className="pb-24 lg:pb-8 lg:pl-48">{children}</main>

      <MemberBottomNav currentPath={location} onNavigate={setLocation} />
    </div>
  );
}
