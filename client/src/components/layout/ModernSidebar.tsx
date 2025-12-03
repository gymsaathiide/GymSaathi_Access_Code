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
  Plug,
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
  { title: "Integrations", url: "/integrations", icon: Plug },
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
];

const trainerItems = [
  { title: "Dashboard", url: "/trainer", icon: LayoutDashboard },
  { title: "Members", url: "/trainer/members", icon: Users },
  { title: "Leads", url: "/trainer/leads", icon: UserPlus },
  { title: "Classes", url: "/trainer/classes", icon: Calendar },
  { title: "Attendance", url: "/trainer/attendance", icon: ClipboardCheck },
  { title: "Shop", url: "/trainer/shop", icon: ShoppingBag },
  { title: "Shop Revenue", url: "/trainer/shop-revenue", icon: TrendingUp },
];

const memberItems = [
  { title: "Dashboard", url: "/member", icon: LayoutDashboard },
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

export function ModernSidebar({ isOpen, onToggle, isMobileOpen, onMobileClose }: ModernSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
    if (isMobileOpen) {
      onMobileClose();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={cn(
        "flex items-center gap-3 px-4 py-6 border-b border-white/5",
        !isOpen && "justify-center px-2"
      )}>
        <img 
          src="/gymsaathi-logo-dark.png"
          alt="GYMSAATHI" 
          className="w-10 h-10 object-contain flex-shrink-0"
        />
        {isOpen && (
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white">GYMSAATHI</span>
            <span className="text-xs text-white/40">Gym Management</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.url || 
              (item.url !== "/" && item.url !== "/admin" && item.url !== "/trainer" && item.url !== "/member" && location.startsWith(item.url));
            
            return (
              <Link
                key={item.title}
                href={item.url}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                  !isOpen && "justify-center px-2"
                )}
                data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-transform",
                  !isActive && "group-hover:scale-110"
                )} />
                {isOpen && (
                  <span className="font-medium text-sm">{item.title}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={cn(
        "p-4 border-t border-white/5",
        !isOpen && "px-2"
      )}>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl mb-3 bg-white/5",
          !isOpen && "justify-center p-2"
        )}>
          <Avatar className="h-10 w-10 border-2 border-orange-500/30 flex-shrink-0">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.name || ""} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-semibold">
              {getInitials(user?.name || "U")}
            </AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{user?.name}</p>
              <p className="text-xs capitalize text-white/40">{user?.role}</p>
            </div>
          )}
          {isOpen && user?.role !== "superadmin" && (
            <button
              onClick={() => setIsProfileDialogOpen(true)}
              className="p-2 rounded-lg transition-colors hover:bg-white/10 text-white/60 hover:text-white"
              title="Edit Profile"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200 text-white/60 hover:text-white hover:bg-red-500/10",
            !isOpen && "justify-center px-2"
          )}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {isOpen && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>

      {isOpen && (
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 border rounded-full items-center justify-center hover:bg-orange-500 hover:text-white transition-all z-50 bg-[hsl(220,26%,14%)] border-white/10 text-white/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      {!isOpen && (
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 border rounded-full items-center justify-center hover:bg-orange-500 hover:text-white transition-all z-50 bg-[hsl(220,26%,14%)] border-white/10 text-white/60"
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
      {/* Desktop Sidebar - Always visible on md and up */}
      <aside
        className={cn(
          "hidden md:flex flex-col relative transition-all duration-300 ease-in-out bg-[hsl(220,26%,14%)]",
          isOpen ? "w-64" : "w-20"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar - Only render when open and on mobile */}
      {isMobileOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] md:hidden"
            onClick={onMobileClose}
          />
          <aside
            className="fixed inset-y-0 left-0 z-[70] w-72 md:hidden bg-[hsl(220,26%,14%)] shadow-2xl"
          >
            <button
              onClick={onMobileClose}
              className="absolute top-4 right-4 p-2 rounded-lg transition-colors hover:bg-white/10 text-white/60 hover:text-white z-10"
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
      className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
