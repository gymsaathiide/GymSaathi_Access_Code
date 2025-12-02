import { useEffect } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import { ModernLayout } from './components/layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PublicEnquiryForm from './pages/PublicEnquiryForm';
import Dashboard from './pages/Dashboard';
import Gyms from './pages/Gyms';
import Billing from './pages/Billing';
import SuperadminBilling from './pages/SuperadminBilling';
import Branding from './pages/Branding';
import Analytics from './pages/Analytics';
import Audit from './pages/Audit';
import Integrations from './pages/Integrations';
import AdminDashboard from './pages/AdminDashboardNew';
import TrainerDashboard from './pages/TrainerDashboard';
import MemberDashboard from './pages/MemberDashboard';
import Members from './pages/Members';
import Leads from './pages/Leads';
import Plans from './pages/Plans';
import Shop from './pages/Shop';
import MemberStore from "./pages/MemberStore";
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Trainers from './pages/Trainers';
import AdminMore from './pages/AdminMore';

function TestDashboard() {
  const { user } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard Test</h1>
      <p>User: {user?.name}</p>
      <p>Role: {user?.role}</p>
      <p>Email: {user?.email}</p>
    </div>
  );
}

function SuperadminRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/gyms" component={Gyms} />
      <Route path="/billing" component={Billing} />
      <Route path="/branding" component={Branding} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/audit" component={Audit} />
      <Route path="/integrations" component={Integrations} />
    </Switch>
  );
}

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/admin" component={AdminDashboard} />
    </Switch>
  );
}

function TrainerRoutes() {
  return (
    <Switch>
      <Route path="/trainer" component={TrainerDashboard} />
    </Switch>
  );
}

function MemberRoutes() {
  return (
    <Switch>
      <Route path="/member" component={MemberDashboard} />
    </Switch>
  );
}

function ProtectedApp() {
  return (
    <ModernLayout>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute allowedRoles={['superadmin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/gyms" component={() => <ProtectedRoute allowedRoles={['superadmin']}><Gyms /></ProtectedRoute>} />
        <Route path="/billing" component={() => <ProtectedRoute allowedRoles={['superadmin']}><SuperadminBilling /></ProtectedRoute>} />
        <Route path="/branding" component={() => <ProtectedRoute allowedRoles={['superadmin']}><Branding /></ProtectedRoute>} />
        <Route path="/analytics" component={() => <ProtectedRoute allowedRoles={['superadmin']}><Analytics /></ProtectedRoute>} />
        <Route path="/audit" component={() => <ProtectedRoute allowedRoles={['superadmin']}><Audit /></ProtectedRoute>} />
        <Route path="/integrations" component={() => <ProtectedRoute allowedRoles={['superadmin']}><Integrations /></ProtectedRoute>} />

        <Route path="/admin" component={() => <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/members" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Members /></ProtectedRoute>} />
        <Route path="/admin/trainers" component={() => <ProtectedRoute allowedRoles={['admin']}><Trainers /></ProtectedRoute>} />
        <Route path="/admin/leads" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Leads /></ProtectedRoute>} />
        <Route path="/admin/plans" component={() => <ProtectedRoute allowedRoles={['admin']}><Plans /></ProtectedRoute>} />
        <Route path="/admin/classes" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Classes /></ProtectedRoute>} />
        <Route path="/admin/attendance" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Attendance /></ProtectedRoute>} />
        <Route path="/admin/billing" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Billing /></ProtectedRoute>} />
        <Route path="/admin/shop" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Shop /></ProtectedRoute>} />
        <Route path="/admin/more" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><AdminMore /></ProtectedRoute>} />

        <Route path="/trainer" component={() => <ProtectedRoute allowedRoles={['trainer']}><TrainerDashboard /></ProtectedRoute>} />
        <Route path="/trainer/members" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Members /></ProtectedRoute>} />
        <Route path="/trainer/leads" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Leads /></ProtectedRoute>} />
        <Route path="/trainer/classes" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Classes /></ProtectedRoute>} />
        <Route path="/trainer/attendance" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Attendance /></ProtectedRoute>} />
        <Route path="/trainer/shop" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Shop /></ProtectedRoute>} />
        <Route path="/trainer/more" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><AdminMore /></ProtectedRoute>} />

        <Route path="/member" component={() => <ProtectedRoute allowedRoles={['member']}><MemberDashboard /></ProtectedRoute>} />
        <Route path="/member/classes" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Classes /></ProtectedRoute>} />
        <Route path="/member/attendance" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Attendance /></ProtectedRoute>} />
        <Route path="/member/shop" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Shop /></ProtectedRoute>} />
        <Route path="/member/more" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><AdminMore /></ProtectedRoute>} />
        <Route path="/member-store" component={() => <ProtectedRoute allowedRoles={['member']}><MemberStore /></ProtectedRoute>} />
      </Switch>
    </ModernLayout>
  );
}

function RedirectToLogin() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/login');
  }, [setLocation]);

  return null;
}

function RedirectToDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      const defaultRoute = user.role === 'superadmin' ? '/'
        : user.role === 'admin' ? '/admin'
        : user.role === 'trainer' ? '/trainer'
        : '/member';
      setLocation(defaultRoute);
    }
  }, [user, setLocation]);

  return null;
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Public routes that don't require authentication
  if (location.startsWith('/enquiry/')) {
    return <PublicEnquiryForm />;
  }

  // Public auth routes (forgot password & reset password)
  if (location === '/forgot-password') {
    return <ForgotPassword />;
  }

  if (location.startsWith('/reset-password')) {
    return <ResetPassword />;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" data-testid="status-loading">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Loading...</h2>
        </div>
      </div>
    );
  }

  // User is authenticated, show protected app
  if (user) {
    return <ProtectedApp />;
  }

  // Not authenticated, show login
  return <Login />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <CartProvider>
            <AppContent />
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;