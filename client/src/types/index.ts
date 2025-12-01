// Gym Management Types
export interface Gym {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'pending';
  members: number;
  revenue: number;
  address?: string;
  logoUrl?: string | null;
  createdAt: string;
}

export interface GymFormData {
  name: string;
  owner: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  address?: string;
  logoUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
}

// Billing & Subscription Types
export interface Subscription {
  id: string;
  gymId: string;
  gymName: string;
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  startDate: string;
}

export interface Transaction {
  id: string;
  gymId: string;
  gymName: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  date: string;
  invoiceNumber: string;
  description: string;
}

// White-Label Branding Types
export interface BrandingConfig {
  id: string;
  gymId: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customDomain?: string;
  companyName: string;
}

// Analytics Types
export interface AnalyticsData {
  totalRevenue: number;
  activeGyms: number;
  totalUsers: number;
  systemHealth: number;
  revenueGrowth: number;
  gymGrowth: number;
  userGrowth: number;
  revenueChart: { month: string; revenue: number }[];
  userChart: { month: string; users: number }[];
  planDistribution: { name: string; value: number }[];
}

// Security Audit Types
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  severity: 'info' | 'warning' | 'critical';
  ipAddress: string;
  details: string;
  status: 'success' | 'failed';
}

// Integration Types
export interface Integration {
  id: string;
  name: string;
  type: 'payment' | 'email' | 'analytics' | 'storage' | 'communication';
  status: 'active' | 'inactive' | 'error';
  apiKey?: string;
  lastSync?: string;
  description: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalRevenue: number;
  activeGyms: number;
  totalMembers: number;
  systemHealth: number;
  revenueChange: number;
  gymsChange: number;
  membersChange: number;
  healthChange: number;
}