import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Palette,
  BarChart3,
  Shield,
  Users,
  ShoppingBag,
  Calendar,
  Dumbbell,
  LogOut,
  UserPlus,
  ClipboardCheck,
  Settings,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  TrendingUp,
  UserCog,
  Apple,
  Target,
  Activity,
  Utensils,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";

const superadminItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Gyms", url: "/gyms", icon: Building2 },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Branding", url: "/branding", icon: Palette },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Security Audit", url: "/audit", icon: Shield },
  { title: "Manage Meals", url: "/manage-meals", icon: Utensils },
  { title: "Manage Exercises", url: "/manage-exercises", icon: Dumbbell },
  { title: "User Management", url: "/users", icon: UserCog },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Members", url: "/admin/members", icon: Users },
  { title: "Trainers", url: "/admin/trainers", icon: Dumbbell },
  { title: "Leads", url: "/admin/leads", icon: UserPlus },
  { title: "Plans", url: "/admin/plans", icon: ClipboardList },
  { title: "Classes", url: "/admin/classes", icon: Calendar },
  { title: "Attendance", url: "/admin/attendance", icon: ClipboardCheck },
  { title: "Billing", url: "/admin/billing", icon: CreditCard },
  { title: "Shop", url: "/admin/shop", icon: ShoppingBag },
  { title: "Shop Revenue", url: "/admin/shop-revenue", icon: TrendingUp },
  { title: "Equipment", url: "/admin/equipment", icon: Settings },
];

const trainerItems = [
  { title: "Dashboard", url: "/trainer", icon: LayoutDashboard },
  { title: "Members", url: "/trainer/members", icon: Users },
  { title: "Leads", url: "/trainer/leads", icon: UserPlus },
  { title: "Classes", url: "/trainer/classes", icon: Calendar },
  { title: "Attendance", url: "/trainer/attendance", icon: ClipboardCheck },
  { title: "Shop", url: "/trainer/shop", icon: ShoppingBag },
];

const memberItems = [
  { title: "Dashboard", url: "/member", icon: LayoutDashboard },
  { title: "Training", url: "/member/training", icon: Target },
  {
    title: "Body Report",
    url: "/member/diet-planner/body-composition",
    icon: Activity,
  },
  { title: "Diet Planner", url: "/member/diet-planner", icon: Apple },
  {
    title: "Workout Planner",
    url: "/member/diet-planner/workout",
    icon: Dumbbell,
  },
  { title: "Classes", url: "/member/classes", icon: Calendar },
  { title: "Attendance", url: "/member/attendance", icon: ClipboardCheck },
  { title: "Shop", url: "/member-store", icon: ShoppingBag },
];

interface ModernSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function ModernSidebar({
  isOpen,
  onToggle,
  isMobileOpen,
  onMobileClose,
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

  const getMenuItems = () => {
    if (!user) return [];
    switch (user.role) {
      case "superadmin":
        return superadminItems;
      case "admin":
        return adminItems;
      case "trainer":
        return trainerItems;
      case "member":
        return memberItems;
      default:
        return [];
    }
  };

  const navigation = getMenuItems();

  const handleNavClick = () => {
    if (isMobileOpen) onMobileClose();
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
    <>
      {/* Desktop sidebar: full height 100vh */}
      <aside
        className={cn(
          "relative hidden h-screen flex-col transition-[width] duration-300 ease-in-out md:flex",
          isOpen ? "w-64" : "w-20",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-[70] w-72 bg-[hsl(220,26%,10%)] shadow-2xl md:hidden">
            <button
              onClick={onMobileClose}
              className="absolute right-4 top-4 z-10 rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white md:hidden"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
