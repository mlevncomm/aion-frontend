import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isFrontendAuthenticated } from "@/lib/frontendAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isFrontendAuthenticated()) {
    return <Navigate to="/giris" replace state={{ from: location.pathname }} />;
  }

  return children;
}