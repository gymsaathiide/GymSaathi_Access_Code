import { LucideIcon } from "lucide-react";
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
  UserPlus,
  ClipboardCheck,
  Settings,
  ClipboardList,
  TrendingUp,
  UserCog,
  Apple,
  Target,
  Activity,
  Utensils,
  Menu,
  QrCode,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const superadminNavItems: NavItem[] = [
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

export const adminNavItems: NavItem[] = [
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

export const trainerNavItems: NavItem[] = [
  { title: "Dashboard", url: "/trainer", icon: LayoutDashboard },
  { title: "Members", url: "/trainer/members", icon: Users },
  { title: "Leads", url: "/trainer/leads", icon: UserPlus },
  { title: "Classes", url: "/trainer/classes", icon: Calendar },
  { title: "Attendance", url: "/trainer/attendance", icon: ClipboardCheck },
  { title: "Shop", url: "/trainer/shop", icon: ShoppingBag },
];

export const memberNavItems: NavItem[] = [
  { title: "Dashboard", url: "/member", icon: LayoutDashboard },
  { title: "Training", url: "/member/training", icon: Target },
  { title: "Body Report", url: "/member/diet-planner/body-composition", icon: Activity },
  { title: "Diet Planner", url: "/member/diet-planner", icon: Apple },
  { title: "Workout Planner", url: "/member/diet-planner/workout", icon: Dumbbell },
  { title: "Classes", url: "/member/classes", icon: Calendar },
  { title: "Attendance", url: "/member/attendance", icon: ClipboardCheck },
  { title: "Shop", url: "/member-store", icon: ShoppingBag },
];

export function getNavItemsByRole(role?: string): NavItem[] {
  switch (role) {
    case "superadmin":
      return superadminNavItems;
    case "admin":
      return adminNavItems;
    case "trainer":
      return trainerNavItems;
    case "member":
      return memberNavItems;
    default:
      return [];
  }
}

export interface BottomNavConfig {
  primaryItems: NavItem[];
  overflowItems: NavItem[];
  hasOverflow: boolean;
}

export function getBottomNavConfig(role?: string): BottomNavConfig {
  const allItems = getNavItemsByRole(role);
  
  if (allItems.length <= 5) {
    return {
      primaryItems: allItems,
      overflowItems: [],
      hasOverflow: false,
    };
  }
  
  return {
    primaryItems: allItems.slice(0, 4),
    overflowItems: allItems.slice(4),
    hasOverflow: true,
  };
}
