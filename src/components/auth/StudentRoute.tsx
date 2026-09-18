import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface StudentRouteProps {
  children: ReactNode;
}

export function StudentRoute({ children }: StudentRouteProps) {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict role protection: redirect other roles to their respective workspaces
  if (role === "administrator") {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === "faculty") {
    return <Navigate to="/faculty/dashboard" replace />;
  }

  // Force student to change password upon initial login
  const isChangePasswordPath = location.pathname === "/student/change-password";
  if (profile?.must_change_password && !isChangePasswordPath) {
    return <Navigate to="/student/change-password" replace />;
  }
  if (!profile?.must_change_password && isChangePasswordPath) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
}
