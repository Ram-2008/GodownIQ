import { Role } from "../auth/AuthContext";

export interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["owner", "staff"] },
  { to: "/entry", label: "Add Purchase", roles: ["owner", "staff"] },
  { to: "/calendar", label: "Calendar", roles: ["owner", "staff"] },
  { to: "/stock", label: "Stock", roles: ["owner", "staff"] },
  { to: "/payments", label: "Payments", roles: ["owner"] },
  { to: "/reports", label: "Reports", roles: ["owner"] },
  { to: "/comparison", label: "Monthly Comparison", roles: ["owner"] },
  { to: "/suppliers", label: "Supplier Comparison", roles: ["owner"] },
  { to: "/forecast", label: "Forecast", roles: ["owner"] },
  { to: "/activity", label: "Activity Log", roles: ["owner"] },
  { to: "/users", label: "Staff", roles: ["owner"] },
];

export const MOBILE_PRIMARY_ITEMS = ["/", "/entry", "/calendar", "/stock"];
