import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { hasRouteAccess } from '../constants/permissions';
import { toast } from 'sonner';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading, logout } = useAuth();
  const location = useLocation();

  // Enterprise Session Timeout Logic
  React.useEffect(() => {
    if (!user) return;
    
    let timeout: any;
    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      // Default 30 mins if not specified
      timeout = setTimeout(() => {
        logout();
        toast.error("Session expired due to inactivity");
      }, 30 * 60 * 1000); 
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (timeout) clearTimeout(timeout);
    };
  }, [user, logout]);

  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict RBAC Check
  if (profile && !hasRouteAccess(profile.role, location.pathname)) {
    // If trying to access a root-level path or something they shouldn't, 
    // redirect to their dashboard instead of a 403 page.
    const dashboardPath = `/dashboard/${(profile.role || "student").replace('_', '-')}-dashboard`;
    
    // Avoid infinite redirect loop if dashboard is also restricted (which shouldn't happen)
    if (location.pathname !== dashboardPath) {
      return <Navigate to={dashboardPath} replace />;
    }
  }

  // Legacy allowedRoles support (if still used in App.tsx)
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    const dashboardPath = `/dashboard/${(profile.role || "student").replace('_', '-')}-dashboard`;
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
