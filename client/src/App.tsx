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
import SecurityAuditDashboard from './pages/SecurityAuditDashboard';
import SuperadminSettings from './pages/SuperadminSettings';
import SuperadminUsers from './pages/SuperadminUsers';
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
import ShopRevenueDashboard from './pages/ShopRevenueDashboard';
import { BodyCompositionPage, DietPlannerPage, WorkoutPlannerPage, DailyNutritionPage, HistoryPage, DietMealsLandingPage, BreakfastPage, LunchPage, DinnerPage } from './pages/diet-planner';

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
        <Route path="/audit" component={() => <ProtectedRoute allowedRoles={['superadmin']}><SecurityAuditDashboard /></ProtectedRoute>} />
        <Route path="/integrations" component={() => <ProtectedRoute allowedRoles={['superadmin']}><Integrations /></ProtectedRoute>} />
        <Route path="/users" component={() => <ProtectedRoute allowedRoles={['superadmin']}><SuperadminUsers /></ProtectedRoute>} />
        <Route path="/settings" component={() => <ProtectedRoute allowedRoles={['superadmin']}><SuperadminSettings /></ProtectedRoute>} />

        <Route path="/admin" component={() => <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/members" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Members /></ProtectedRoute>} />
        <Route path="/admin/trainers" component={() => <ProtectedRoute allowedRoles={['admin']}><Trainers /></ProtectedRoute>} />
        <Route path="/admin/leads" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Leads /></ProtectedRoute>} />
        <Route path="/admin/plans" component={() => <ProtectedRoute allowedRoles={['admin']}><Plans /></ProtectedRoute>} />
        <Route path="/admin/classes" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Classes /></ProtectedRoute>} />
        <Route path="/admin/attendance" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Attendance /></ProtectedRoute>} />
        <Route path="/admin/billing" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Billing /></ProtectedRoute>} />
        <Route path="/admin/shop" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Shop /></ProtectedRoute>} />
        <Route path="/admin/shop-revenue" component={() => <ProtectedRoute allowedRoles={['admin']}><ShopRevenueDashboard /></ProtectedRoute>} />
        <Route path="/admin/more" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><AdminMore /></ProtectedRoute>} />

        <Route path="/trainer" component={() => <ProtectedRoute allowedRoles={['trainer']}><TrainerDashboard /></ProtectedRoute>} />
        <Route path="/trainer/members" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Members /></ProtectedRoute>} />
        <Route path="/trainer/leads" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer']}><Leads /></ProtectedRoute>} />
        <Route path="/trainer/classes" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Classes /></ProtectedRoute>} />
        <Route path="/trainer/attendance" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Attendance /></ProtectedRoute>} />
        <Route path="/trainer/shop" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><Shop /></ProtectedRoute>} />
        <Route path="/trainer/more" component={() => <ProtectedRoute allowedRoles={['admin', 'trainer', 'member']}><AdminMore /></ProtectedRoute>} />

        <Route path="/member" component={() => <ProtectedRoute allowedRoles={['member']}><MemberDashboard /></ProtectedRoute>} />
        <Route path="/member/diet-planner/body-report" component={() => <ProtectedRoute allowedRoles={['member']}><BodyCompositionPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/body-composition" component={() => <ProtectedRoute allowedRoles={['member']}><BodyCompositionPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/history" component={() => <ProtectedRoute allowedRoles={['member']}><HistoryPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/daily-nutrition" component={() => <ProtectedRoute allowedRoles={['member']}><DailyNutritionPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/workout" component={() => <ProtectedRoute allowedRoles={['member']}><WorkoutPlannerPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/meals/breakfast" component={() => <ProtectedRoute allowedRoles={['member']}><BreakfastPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/meals/lunch" component={() => <ProtectedRoute allowedRoles={['member']}><LunchPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/meals/dinner" component={() => <ProtectedRoute allowedRoles={['member']}><DinnerPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner/meals" component={() => <ProtectedRoute allowedRoles={['member']}><DietMealsLandingPage /></ProtectedRoute>} />
        <Route path="/member/diet-planner" component={() => <ProtectedRoute allowedRoles={['member']}><DietPlannerPage /></ProtectedRoute>} />
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]" data-testid="status-loading">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img 
              src="/gymsaathi-logo-dark.png" 
              alt="GYMSAATHI" 
              className="w-10 h-10 object-contain animate-pulse"
            />
            <span className="text-2xl font-bold text-white tracking-wide">GYMSAATHI</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          </div>
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
      <ThemeProvider>
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