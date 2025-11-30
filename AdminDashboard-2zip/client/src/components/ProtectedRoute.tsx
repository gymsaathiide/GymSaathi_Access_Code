import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only check roles, auth is handled by AppContent
    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      const defaultRoute = user.role === 'superadmin' ? '/' 
        : user.role === 'admin' ? '/admin'
        : user.role === 'trainer' ? '/trainer'
        : '/member';
      setLocation(defaultRoute);
    }
  }, [user, allowedRoles, setLocation]);

  // If role check fails, don't render
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
