import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface FacultyRouteProps {
  children: ReactNode;
}

export function FacultyRoute({ children }: FacultyRouteProps) {
  const { user, role, loading } = useAuth();
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

  // Strict role protection: students attempting to access faculty routes are redirected to student dashboard
  if (role === "student") {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
}
