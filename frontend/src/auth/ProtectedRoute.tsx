import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, Role } from "./AuthContext";
import { FullScreenSpinner } from "../components/FullScreenSpinner";
import { Button } from "../components/ui/Button";

const BLOCKED_COPY: Record<"pending_approval" | "rejected" | "revoked", { title: string; body: string }> = {
  pending_approval: {
    title: "Awaiting approval",
    body: "Your account has been created but is waiting for the warehouse owner to approve it. Check back soon.",
  },
  rejected: {
    title: "Request declined",
    body: "The warehouse owner declined this account request. Contact them if you think this is a mistake.",
  },
  revoked: {
    title: "Access revoked",
    body: "The warehouse owner has revoked your access to GodownIQ. Contact them if you think this is a mistake.",
  },
};

function AwaitingApprovalScreen() {
  const { authBlockedReason, signOut } = useAuth();
  const copy = BLOCKED_COPY[authBlockedReason ?? "pending_approval"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-bold text-brand-700">{copy.title}</h1>
        <p className="text-sm text-gray-600">{copy.body}</p>
        <Button variant="secondary" className="mt-4" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { session, profile, loading, authBlockedReason } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (authBlockedReason) return <AwaitingApprovalScreen />;
  if (roles && (!profile || !roles.includes(profile.role))) return <Navigate to="/" replace />;

  return <>{children}</>;
}
