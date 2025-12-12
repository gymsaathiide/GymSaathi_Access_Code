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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    // Check immediately in case we're already at desktop size
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const showMobileNav =
    user?.role === "admin" ||
    user?.role === "trainer" ||
    user?.role === "member";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-b from-[hsl(220,26%,8%)] to-[hsl(220,26%,12%)] text-slate-100">
      {/* Sidebar */}
      <ModernSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* translucent overlay for mobile when menu is open */}
      {mobileMenuOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-sm bg-[rgba(10,14,23,0.4)]/60 border-b border-slate-800/60 shadow-sm">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8">
            <div className="flex items-center justify-between h-16">
              <ModernHeader
                onMenuClick={() => setMobileMenuOpen(true)}
                showMenuButton={true}
              />
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className={`flex-1 overflow-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8 ${showMobileNav ? 'pb-24 md:pb-6' : ''}`}>
          <div className="mx-auto w-full max-w-[1400px]">
            {/* Content container with subtle elevation for readability */}
            <div className="min-h-[60vh] rounded-xl sm:rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] border border-slate-800/50 shadow-[0_6px_30px_rgba(2,6,23,0.6)] p-3 xs:p-4 sm:p-5 md:p-7 lg:p-8 transition-all">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile bottom nav (sticky) */}
        {showMobileNav && (
          <div className="fixed bottom-4 left-0 right-0 z-40 mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 pointer-events-auto">
            <div className="rounded-3xl bg-transparent/40 backdrop-blur-md border border-slate-800/60 p-2 shadow-lg">
              <MobileBottomNav
                currentPath={location}
                onNavigate={(path) => navigate(path)}
                userRole={user?.role}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
