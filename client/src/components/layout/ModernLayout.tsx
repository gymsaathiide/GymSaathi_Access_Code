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

  /**
   * Layout behaviour:
   * - Desktop (>=1024): Sidebar is visible (expand/collapse) and content sits in a max-width centered column.
   * - Tablet (768-1023): Sidebar collapses to a slim rail; clicking opens overlay.
   * - Mobile (<768): Sidebar is full-screen overlay when opened; header shows menu button.
   *
   * CSS is expressed with Tailwind utility classes and a few helper classes for smoother transitions.
   */

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[hsl(220,26%,8%)] to-[hsl(220,26%,12%)] text-slate-100 antialiased">
      {/* Root grid: left rail (sidebar) + content */}
      <div className="relative flex h-full w-full">
        {/* Desktop Sidebar column (kept in DOM for accessibility) */}
        <aside
          aria-hidden={!sidebarOpen && !mobileMenuOpen}
          className={`
            hidden lg:flex flex-col z-20
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-64" : "w-16"}
          `}
        >
          <ModernSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isMobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />
        </aside>

        {/* Tablet / Mobile overlay sidebar */}
        {/* Visible on md and below as overlay; when mobileMenuOpen=true it covers content */}
        {/*
          - The overlay uses a full-screen fixed container on small screens.
          - We keep it positioned above content (z-40) and animate opacity/transform.
        */}
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div
            className={`absolute left-0 top-0 bottom-0 w-80 bg-[rgba(6,8,12,0.96)] shadow-xl transform transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <ModernSidebar
              isOpen={true}
              onToggle={() => setMobileMenuOpen(false)}
              isMobileOpen={mobileMenuOpen}
              onMobileClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>

        {/* Main content column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header — compact and consistent */}
          <header className="sticky top-0 z-30 backdrop-blur-sm bg-[rgba(10,14,23,0.85)] border-b border-slate-800/60 shadow-sm p-5">
            <div className="max-w-[1400px] mx-auto px-3  lg:px-6">
              <ModernHeader
                onMenuClick={() => {
                  // On small screens open mobile overlay, on large screens toggle collapse
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

          {/* Top-level content area:
              - mobile-first: full width with inner safe padding
              - larger screens: content constrained and centered with subtle horizontal gap when sidebar is expanded
          */}
          <main className={`flex-1 overflow-auto bg-transparent p-5`}>
            <div
              className={`
                max-w-[1400px] mx-auto min-h-[60vh]
                transition-all duration-300 ease-in-out
                ${sidebarOpen ? "lg:pl-6 lg:pr-6" : "lg:pl-4 lg:pr-4"}
              `}
            >
              {/* Content panel: edge-to-edge on mobile, centered and padded on larger screens */}
              <div
                className={`
                  bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]
                  border border-slate-800/50 rounded-none sm:rounded-md
                  shadow-[0_4px_20px_rgba(2,6,23,0.45)]
                  overflow-hidden
                `}
              >
                {/* Add a small inner padding wrapper so children don't touch edges on phones */}
                <div className="w-full sm:px-4 sm:py-4">{children}</div>
              </div>
            </div>
          </main>

          {/* Mobile bottom nav (sticky) */}
          {showMobileNav && (
            <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-auto">
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
