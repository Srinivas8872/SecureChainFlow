import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-rose-900/40 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied (403)</h2>
        <p className="text-sm text-slate-400">
          Your assigned role <strong className="text-sky-400">{user.role}</strong> does not have permission to access this area.
        </p>
        <div className="text-xs text-slate-500">
          Required roles: [{allowedRoles.join(', ')}]
        </div>
        <div className="pt-2">
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
