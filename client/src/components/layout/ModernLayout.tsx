import { useState, useEffect } from "react";
import { ModernSidebar } from "./ModernSidebar";
import { ModernHeader } from "./ModernHeader";
import { MobileBottomNav } from "@/components/admin-dashboard/MobileBottomNav";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface ModernLayoutProps {
  children: React.ReactNode;
}

export function ModernLayout({ children }: ModernLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const showMobileNav = user?.role === 'admin' || user?.role === 'trainer' || user?.role === 'member';

  return (
    <div className="flex h-screen w-full overflow-hidden admin-theme bg-[hsl(220,26%,10%)]">
      <ModernSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ModernHeader 
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenuButton={true}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 bg-[hsl(220,26%,10%)]">
          {children}
        </main>

        {showMobileNav && (
          <MobileBottomNav 
            currentPath={location}
            onNavigate={(path) => navigate(path)}
            userRole={user?.role}
          />
        )}
      </div>
    </div>
  );
}
