export const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: "Administrator",
  SUPERVISOR: "Supervisor",
  ENGINEER: "Field Engineer",
  DEPARTMENT: "Department",
  CITIZEN: "Citizen",
};

/** Staff roles see the operator console; citizens see the self-service portal.
 *  Mirrors how the mobile app routes ADMIN/SUPER_ADMIN vs everyone else. */
export const STAFF_ROLES = ["ADMINISTRATOR", "SUPERVISOR", "ENGINEER", "DEPARTMENT"];
export const isStaff = (role?: string | null) => STAFF_ROLES.includes(role ?? "");
export const isCitizen = (role?: string | null) => role === "CITIZEN";

export const ALL_ROLES = Object.keys(ROLE_LABELS);

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: string;
  roles: string[];
};

export const NAV_ITEMS: NavItem[] = [
  // --- citizen portal -------------------------------------------------------
  { key: "c-dashboard", label: "Overview", href: "/app/me", icon: "LayoutDashboard", roles: ["CITIZEN"] },
  { key: "c-report", label: "Report an Issue", href: "/app/me/report", icon: "PlusCircle", roles: ["CITIZEN"] },
  { key: "c-reports", label: "My Reports", href: "/app/me/reports", icon: "ClipboardList", roles: ["CITIZEN"] },
  { key: "c-analytics", label: "My Impact", href: "/app/me/analytics", icon: "BarChart3", roles: ["CITIZEN"] },
  { key: "c-payments", label: "Municipal Bills", href: "/app/me/payments", icon: "Receipt", roles: ["CITIZEN"] },
  { key: "c-identity", label: "Identity", href: "/app/me/identity", icon: "BadgeCheck", roles: ["CITIZEN"] },
  { key: "c-profile", label: "Profile", href: "/app/me/profile", icon: "UserCircle", roles: ["CITIZEN"] },

  // --- operator console -----------------------------------------------------
  { key: "dashboard", label: "Dashboard", href: "/app/dashboard", icon: "LayoutDashboard", roles: STAFF_ROLES },
  { key: "complaints", label: "Complaints", href: "/app/complaints", icon: "ClipboardList", roles: STAFF_ROLES },
  { key: "assignment", label: "Assignment Optimiser", href: "/app/assignment", icon: "Route", roles: ["ADMINISTRATOR", "SUPERVISOR"] },
  { key: "gis", label: "GIS Map", href: "/app/gis", icon: "Map", roles: STAFF_ROLES },
  { key: "engineers", label: "Engineers", href: "/app/engineers", icon: "HardHat", roles: ["ADMINISTRATOR", "SUPERVISOR"] },
  { key: "analytics", label: "Analytics", href: "/app/analytics", icon: "BarChart3", roles: ["ADMINISTRATOR", "SUPERVISOR"] },
  { key: "users", label: "Users", href: "/app/users", icon: "Users", roles: ["ADMINISTRATOR"] },
  { key: "audit-logs", label: "Audit Log", href: "/app/audit-logs", icon: "ScrollText", roles: ["ADMINISTRATOR", "SUPERVISOR"] },
];

export function navForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

export function canAccess(role: string, moduleKey: string): boolean {
  const item = NAV_ITEMS.find((i) => i.key === moduleKey);
  return item ? item.roles.includes(role) : false;
}

/** Complaint lifecycle. Closure is gated on AI verification (Feature 4). */
export type Transition = { to: string; label: string; roles: string[] };

const MANAGERIAL = ["SUPERVISOR", "ADMINISTRATOR"];

export const TRANSITIONS: Record<string, Transition[]> = {
  SUBMITTED: [
    { to: "ASSIGNED", label: "Assign Engineer", roles: MANAGERIAL },
    { to: "REJECTED", label: "Reject (invalid / duplicate)", roles: MANAGERIAL },
  ],
  ASSIGNED: [{ to: "IN_PROGRESS", label: "Start Work", roles: ["ENGINEER", ...MANAGERIAL] }],
  IN_PROGRESS: [{ to: "PENDING_REVIEW", label: "Mark Complete", roles: ["ENGINEER", ...MANAGERIAL] }],
  PENDING_REVIEW: [
    { to: "CLOSED", label: "Approve Closure", roles: MANAGERIAL },
    { to: "IN_PROGRESS", label: "Reject — Rework Required", roles: MANAGERIAL },
  ],
  CLOSED: [],
  REJECTED: [],
};

export const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

export const DAMAGE_CLASSES = [
  "Pothole",
  "Alligator Crack",
  "Transverse Crack",
  "Longitudinal Crack",
];
