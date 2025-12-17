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
    <div
      className="
        min-h-screen w-full
        bg-[radial-gradient(circle_at_top_left,rgba(255,140,0,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_55%),#050814]
        text-slate-100 antialiased
      "
    >
      <div className="relative flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <aside
          aria-hidden={!sidebarOpen && !mobileMenuOpen}
          className={`
            hidden lg:flex flex-col z-30
            bg-[rgba(5,8,18,0.98)]
            shadow-[0_0_50px_rgba(0,0,0,0.9)]
            transition-[width] duration-300 ease-in-out
            ${sidebarOpen ? "w-72" : "w-20"}
          `}
        >
          <ModernSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isMobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />
        </aside>

        {/* Mobile / tablet overlay sidebar */}
        <div
          className={`
            fixed inset-0 z-40 md:hidden transition-opacity duration-200
            ${mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
          `}
          aria-hidden={!mobileMenuOpen}
        >
          <div
            role="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div
            className={`
              absolute left-0 top-0 bottom-0 w-72
              bg-[rgba(5,8,18,0.98)]
              shadow-[0_0_50px_rgba(0,0,0,0.9)]
              transform transition-transform duration-300
              ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <ModernSidebar
              isOpen={true}
              onToggle={() => setMobileMenuOpen(false)}
              isMobileOpen={mobileMenuOpen}
              onMobileClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header
            className="
              sticky top-0 z-20
              backdrop-blur-xl
              bg-[rgba(7,10,22,0.92)]
              border-b border-slate-800/70
              shadow-[0_18px_40px_rgba(15,23,42,0.85)]
            "
          >
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <ModernHeader
                onMenuClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileMenuOpen(true);
                  } else {
                    setSidebarOpen((s) => !s);
                  }
                }}
                showMenuButton={true}
              />
            </div>
          </header>

          {/* Content – no padding on main, no padding on board */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1440px] mx-auto min-h-[60vh]">
              <div
                className="
                
                  bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.96))]
                  shadow-[0_40px_120px_rgba(0,0,0,0.9)]
                "
              >
                {children}
              </div>
            </div>
          </main>

          {/* Mobile & Tablet bottom nav - shows below 1024px (lg breakpoint) */}
          {showMobileNav && (
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pointer-events-auto">
              <MobileBottomNav
                currentPath={location}
                onNavigate={(path) => navigate(path)}
                userRole={user?.role}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
