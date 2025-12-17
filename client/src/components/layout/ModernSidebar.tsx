import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { getNavItemsByRole } from "@/lib/navigation-config";

interface ModernSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ModernSidebar({
  isOpen,
  onToggle,
}: ModernSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const navigation = getNavItemsByRole(user?.role);

  const handleNavClick = () => {
    // Navigation click handler - no mobile menu to close
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[hsl(220,26%,10%)]">
      {/* Brand (fixed) */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-white/5 bg-[rgba(15,23,42,0.9)] px-5 py-6 backdrop-blur-sm",
          !isOpen && "justify-center px-3",
        )}
      >
        <img
          src="/gymsaathi-logo-dark.png"
          alt="GYMSAATHI"
          className="h-10 w-10 flex-shrink-0 object-contain"
        />
        {isOpen && (
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-white">
              GYMSAATHI
            </span>
            <span className="text-[11px] text-white/45">Gym Management</span>
          </div>
        )}
      </div>

      {/* Scrollable menu items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <nav className="px-3 py-5">
          <div className="space-y-1.5">
            {navigation.map((item) => {
              const hasExactMatch = navigation.some(
                (navItem) => navItem.url === location,
              );
              const isExactMatch = location === item.url;
              const isParentRoute =
                !isExactMatch &&
                item.url !== "/" &&
                item.url !== "/admin" &&
                item.url !== "/trainer" &&
                item.url !== "/member" &&
                location.startsWith(item.url + "/");

              const isActive =
                isExactMatch || (!hasExactMatch && isParentRoute);

              return (
                <Link
                  key={item.title}
                  href={item.url}
                  onClick={handleNavClick}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25"
                      : "text-white/60 hover:bg-white/5 hover:text-white",
                    !isOpen && "justify-center px-2",
                  )}
                  data-testid={`link-${item.title
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform",
                      !isActive && "group-hover:scale-110",
                    )}
                  />
                  {isOpen && (
                    <span className="truncate font-medium">{item.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* User + logout (fixed) */}
      <div
        className={cn(
          "border-t border-white/5 bg-[rgba(15,23,42,0.9)] px-4 py-4",
          !isOpen && "px-2",
        )}
      >
        <div
          className={cn(
            "mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3",
            !isOpen && "justify-center px-2 py-2",
          )}
        >
          <Avatar className="h-10 w-10 flex-shrink-0 border border-orange-500/40">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              alt={user?.name || ""}
            />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-xs font-semibold text-white">
              {getInitials(user?.name || "U")}
            </AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.name}
              </p>
              <p className="text-xs capitalize text-white/45">{user?.role}</p>
            </div>
          )}
          {isOpen && user?.role !== "superadmin" && (
            <button
              onClick={() => setIsProfileDialogOpen(true)}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Edit Profile"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-red-500/10 hover:text-white",
            !isOpen && "justify-center px-2",
          )}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {isOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>

      {/* Desktop collapse toggle */}
      {isOpen ? (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-24 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[hsl(220,26%,10%)] text-white/60 shadow-lg shadow-black/40 transition-all hover:bg-orange-500 hover:text-white md:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-24 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[hsl(220,26%,10%)] text-white/60 shadow-lg shadow-black/40 transition-all hover:bg-orange-500 hover:text-white md:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <ProfileEditDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </div>
  );

  return (
    <aside
      className={cn(
        "relative h-screen flex-col transition-[width] duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20",
      )}
    >
      {sidebarContent}
    </aside>
  );
}
