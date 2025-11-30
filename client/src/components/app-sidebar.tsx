import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Palette,
  BarChart3,
  Shield,
  Plug,
  Users,
  UserCheck,
  ShoppingBag,
  Calendar,
  Dumbbell,
  TrendingUp,
  LogOut,
  UserPlus,
  ClipboardCheck,
  Settings,
  ClipboardList,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const superadminItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Gyms", url: "/gyms", icon: Building2 },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Branding", url: "/branding", icon: Palette },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Security Audit", url: "/audit", icon: Shield },
  { title: "Integrations", url: "/integrations", icon: Plug },
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
  { title: "Classes", url: "/member/classes", icon: Calendar },
  { title: "Attendance", url: "/member/attendance", icon: ClipboardCheck },
  { title: "Shop", url: "/member-store", icon: ShoppingBag },
];

export function AppSidebar() {
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

  const getLabel = () => {
    if (!user) return "Navigation";
    switch (user.role) {
      case "superadmin":
        return "Platform Management";
      case "admin":
        return "Gym Management";
      case "trainer":
        return "Trainer Portal";
      case "member":
        return "Member Portal";
      default:
        return "Navigation";
    }
  };

  const navigation = getMenuItems();
  const label = getLabel();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-3 py-4">
            {label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2 space-y-2">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.name || ""} />
              <AvatarFallback>
                {getInitials(user?.name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            {user?.role !== "superadmin" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setIsProfileDialogOpen(true)}
                title="Edit Profile"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </SidebarFooter>

      <ProfileEditDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </Sidebar>
  );
}