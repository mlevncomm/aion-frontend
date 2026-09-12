import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { backendSessionActive } from "@/lib/aionApi";
import { beginFrontendSession } from "@/lib/frontendAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let active = true;
    void backendSessionActive()
      .then((ok) => {
        if (!active) return;
        if (ok) beginFrontendSession();
        setState(ok ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setState("denied");
      });
    return () => { active = false; };
  }, []);

  if (state === "checking") {
    return (
      <main className="login-stage" aria-live="polite">
        <div className="login-card">AION oturumu doğrulanıyor…</div>
      </main>
    );
  }

  if (state === "denied") {
    return <Navigate to="/giris" replace state={{ from: location.pathname }} />;
  }

  return children;
}
