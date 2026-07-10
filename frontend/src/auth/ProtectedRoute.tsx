import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, Role } from "./AuthContext";
import { FullScreenSpinner } from "../components/FullScreenSpinner";

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && (!profile || !roles.includes(profile.role))) return <Navigate to="/" replace />;

  return <>{children}</>;
}
