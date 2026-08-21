import { LayoutDashboard, Users, HeartPulse, Calculator, Radar, Users2, UserCircle, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/auth-server";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  cfo: [
    { label: "Executive Dashboard", href: "/cfo/dashboard", icon: LayoutDashboard },
    { label: "Burnout Radar", href: "/hr-admin/burnout-radar", icon: Radar },
  ],
  hr_admin: [
    { label: "Dashboard", href: "/hr-admin/dashboard", icon: LayoutDashboard },
    { label: "Employees", href: "/hr-admin/employees", icon: Users },
    { label: "Wellness Programs", href: "/hr-admin/programs", icon: HeartPulse },
    { label: "ROI Calculator", href: "/hr-admin/roi", icon: Calculator },
    { label: "Burnout Radar", href: "/hr-admin/burnout-radar", icon: Radar },
  ],
  dept_manager: [{ label: "Department Dashboard", href: "/dept-manager/dashboard", icon: Users2 }],
  employee: [{ label: "My Dashboard", href: "/employee/dashboard", icon: UserCircle }],
};

export const ROLE_LABEL: Record<Role, string> = {
  cfo: "CFO / Exec",
  hr_admin: "HR Admin",
  dept_manager: "Department Manager",
  employee: "Employee",
};
