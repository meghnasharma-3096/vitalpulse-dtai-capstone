import type { Role } from "@/lib/auth-server";

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  cfo: [{ label: "Executive Dashboard", href: "/cfo/dashboard" }],
  hr_admin: [
    { label: "Dashboard", href: "/hr-admin/dashboard" },
    { label: "Employees", href: "/hr-admin/employees" },
    { label: "Wellness Programs", href: "/hr-admin/programs" },
    { label: "ROI Calculator", href: "/hr-admin/roi" },
    { label: "Burnout Radar", href: "/hr-admin/burnout-radar" },
  ],
  dept_manager: [{ label: "Department Dashboard", href: "/dept-manager/dashboard" }],
  employee: [{ label: "My Dashboard", href: "/employee/dashboard" }],
};

export const ROLE_LABEL: Record<Role, string> = {
  cfo: "CFO / Exec",
  hr_admin: "HR Admin",
  dept_manager: "Department Manager",
  employee: "Employee",
};
