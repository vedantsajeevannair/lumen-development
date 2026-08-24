import { Navigate, Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../auth";
import { isStaff } from "../lib/rbac";
import { EmptyState, ButtonLink } from "./ui";

/** Sends each role to its own home. Staff get the operator console, everyone
 *  else the citizen portal — the same split the mobile app makes. */
export function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={isStaff(user?.role) ? "/app/dashboard" : "/app/me"} replace />;
}

/** Route guard. The server enforces these roles too — this only stops the UI
 *  from rendering a page whose every request would 403. */
export function RequireRole({ roles }: { roles: string[] }) {
  const { user } = useAuth();
  if (!user) return null;                        // AppShell already redirects to login
  if (roles.includes(user.role)) return <Outlet />;

  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to this page"
      hint={`This area is limited to ${roles.map((r) => r.toLowerCase()).join(", ")}.`}
      action={<ButtonLink to="/app" variant="secondary">Back to my home</ButtonLink>}
    />
  );
}
