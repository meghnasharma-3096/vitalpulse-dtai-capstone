import "server-only";
import employeesSeed from "@/data/employees.json";
import departmentsSeed from "@/data/departments.json";
import wellnessProgramsSeed from "@/data/wellness-programs.json";
import nudgesSeed from "@/data/nudges.json";
import burnoutSnapshotsSeed from "@/data/burnout-snapshots.json";
import interventionsSeed from "@/data/interventions.json";
import type { CurrentUser } from "@/lib/auth-server";

export interface Employee {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  roleTitle: string;
  hireDate: string;
  managerId: string;
  personaTag: "new_parent" | "high_performer" | "at_risk" | "standard";
  optedOut: boolean;
  disengagementRiskScore: number;
  lastCheckIn: string;
}

export interface Department {
  id: string;
  name: string;
  managerId: string;
  headcount: number;
  budgetAllocatedINR: number;
  budgetUsedINR: number;
}

export interface WellnessProgram {
  id: string;
  name: string;
  category: "fitness" | "mental_health" | "nutrition" | "financial_wellness";
  provider: string;
  capacity: number;
  enrolledCount: number;
  costPerEmployeeINR: number;
}

export interface Nudge {
  id: string;
  employeeId: string;
  type: "reengagement" | "new_program" | "check_in";
  content: string;
  sentDate: string;
  status: "sent" | "dismissed" | "acted_on";
  feedback: "helpful" | "not_helpful" | null;
}

export interface BurnoutSnapshot {
  departmentId: string;
  weekOf: string;
  riskScore: number;
  trend: "worsening" | "stable" | "improving";
  headcount: number;
}

export interface Intervention {
  id: string;
  departmentId: string;
  aiDraftedBrief: string;
  status: "pending" | "approved" | "rejected" | "escalated";
  actedBy: string | null;
  timestamp: string;
  escalationReason: string | null;
}

/** Hard rule: no burnout data is ever generated or displayed for a department under this headcount. */
export const PRIVACY_FLOOR_HEADCOUNT = 5;

/** Threshold Subsystem B's conflict rule treats as "currently flagged high-risk" by the burnout radar. */
export const BURNOUT_HIGH_RISK_THRESHOLD = 0.7;

// In-memory store, seeded from /data on module load. This is a deliberate JSON-file
// prototype data layer (see docs/system-design.md Section 2) — mutations here live only
// for the lifetime of the server process, which is expected for a demo/grading session.
const store = {
  employees: structuredClone(employeesSeed) as Employee[],
  departments: structuredClone(departmentsSeed) as Department[],
  wellnessPrograms: structuredClone(wellnessProgramsSeed) as WellnessProgram[],
  nudges: structuredClone(nudgesSeed) as Nudge[],
  burnoutSnapshots: structuredClone(burnoutSnapshotsSeed) as BurnoutSnapshot[],
  interventions: structuredClone(interventionsSeed) as Intervention[],
  simulatedWeekOffset: 0,
};

const SIMULATION_ANCHOR = new Date("2026-08-19T00:00:00Z");

export function getSimulatedDate(): Date {
  const d = new Date(SIMULATION_ANCHOR);
  d.setUTCDate(d.getUTCDate() + store.simulatedWeekOffset * 7);
  return d;
}

export function getSimulatedDateISO(): string {
  return getSimulatedDate().toISOString().slice(0, 10);
}

/** Cross-cutting feature 6: visible only to HR Admin/CFO. */
export function advanceSimulatedWeek(user: CurrentUser | null): { ok: boolean; date?: string; error?: string } {
  if (!user || (user.role !== "hr_admin" && user.role !== "cfo")) {
    return { ok: false, error: "Only HR Admin or CFO can advance the simulated clock." };
  }
  store.simulatedWeekOffset += 1;
  return { ok: true, date: getSimulatedDateISO() };
}

function requireUser(user: CurrentUser | null): asserts user is CurrentUser {
  if (!user) throw new Error("Not authenticated.");
}

// ---------- Employees ----------

export function getEmployees(user: CurrentUser | null): Employee[] {
  requireUser(user);
  switch (user.role) {
    case "hr_admin":
      return [...store.employees];
    case "dept_manager":
      return store.employees.filter(e => e.departmentId === user.departmentId);
    case "employee":
      return store.employees.filter(e => e.id === user.employeeId);
    case "cfo":
      // CFO gets company-wide rollups, not per-employee operational detail.
      return [];
  }
}

/**
 * Company-wide aggregate figures (counts, distributions, ROI totals) that CFO's
 * rollup dashboard legitimately needs — unlike getEmployees(), this does not hand
 * back a named, browsable employee list, so it's safe to include CFO here without
 * breaking "no operational detail."
 */
export function getEmployeesForAggregation(user: CurrentUser | null): Employee[] {
  requireUser(user);
  if (user.role === "hr_admin" || user.role === "cfo") return [...store.employees];
  if (user.role === "dept_manager") return store.employees.filter(e => e.departmentId === user.departmentId);
  return store.employees.filter(e => e.id === user.employeeId);
}

export function getEmployeeById(id: string, user: CurrentUser | null): Employee | null {
  requireUser(user);
  const emp = store.employees.find(e => e.id === id);
  if (!emp) return null;
  if (user.role === "hr_admin") return emp;
  if (user.role === "dept_manager") return emp.departmentId === user.departmentId ? emp : null;
  if (user.role === "employee") return emp.id === user.employeeId ? emp : null;
  return null; // cfo: no per-employee detail
}

export function searchEmployees(user: CurrentUser | null, query: string, departmentId?: string): Employee[] {
  const scoped = getEmployees(user);
  const q = query.trim().toLowerCase();
  return scoped.filter(e => {
    const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.roleTitle.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
    const matchesDept = !departmentId || departmentId === "all" || e.departmentId === departmentId;
    return matchesQuery && matchesDept;
  });
}

// ---------- Departments ----------

export function getDepartments(user: CurrentUser | null): Department[] {
  requireUser(user);
  if (user.role === "hr_admin" || user.role === "cfo") return [...store.departments];
  if (user.role === "dept_manager") return store.departments.filter(d => d.id === user.departmentId);
  return [];
}

export function getDepartmentById(id: string, user: CurrentUser | null): Department | null {
  const scoped = getDepartments(user);
  return scoped.find(d => d.id === id) ?? null;
}

export function getAllDepartmentsUnscoped(): Department[] {
  return [...store.departments];
}

// ---------- Wellness programs (catalog is read-only, non-sensitive) ----------

export function getWellnessPrograms(user: CurrentUser | null): WellnessProgram[] {
  requireUser(user);
  return [...store.wellnessPrograms];
}

export function getWellnessProgramById(id: string): WellnessProgram | null {
  return store.wellnessPrograms.find(p => p.id === id) ?? null;
}

// ---------- Burnout snapshots (privacy floor enforced here, not just in the schema) ----------

export function getBurnoutSnapshots(user: CurrentUser | null): BurnoutSnapshot[] {
  requireUser(user);
  const withFloor = store.burnoutSnapshots.filter(s => s.headcount >= PRIVACY_FLOOR_HEADCOUNT);
  if (user.role === "hr_admin" || user.role === "cfo") return withFloor;
  if (user.role === "dept_manager") return withFloor.filter(s => s.departmentId === user.departmentId);
  return [];
}

export function getLatestBurnoutSnapshotForDepartment(departmentId: string, user: CurrentUser | null): BurnoutSnapshot | null {
  const scoped = getBurnoutSnapshots(user);
  const rows = scoped.filter(s => s.departmentId === departmentId).sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));
  return rows[0] ?? null;
}

/** Unscoped internal read used by Subsystem B's conflict-rule check — department-level only, no employee identity involved. */
export function isDepartmentFlaggedHighRisk(departmentId: string): boolean {
  const rows = store.burnoutSnapshots.filter(s => s.departmentId === departmentId && s.headcount >= PRIVACY_FLOOR_HEADCOUNT);
  if (rows.length === 0) return false;
  const latest = [...rows].sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1))[0];
  return latest.riskScore >= BURNOUT_HIGH_RISK_THRESHOLD;
}

// ---------- Interventions (Subsystem C's audit trail) ----------

export function getInterventions(user: CurrentUser | null): Intervention[] {
  requireUser(user);
  if (user.role === "hr_admin" || user.role === "cfo") return [...store.interventions];
  if (user.role === "dept_manager") return store.interventions.filter(i => i.departmentId === user.departmentId);
  return [];
}

// ---------- Nudges (Subsystem B) ----------

export function getNudgesForEmployee(employeeId: string, user: CurrentUser | null): Nudge[] {
  requireUser(user);
  const emp = store.employees.find(e => e.id === employeeId);
  if (!emp || emp.optedOut) return [];

  const authorized =
    user.role === "hr_admin" ||
    (user.role === "dept_manager" && emp.departmentId === user.departmentId) ||
    (user.role === "employee" && user.employeeId === employeeId);
  if (!authorized) return [];

  return store.nudges.filter(n => n.employeeId === employeeId).sort((a, b) => (a.sentDate < b.sentDate ? 1 : -1));
}

export function getAllNudges(user: CurrentUser | null): Nudge[] {
  requireUser(user);
  const optedOutIds = new Set(store.employees.filter(e => e.optedOut).map(e => e.id));
  if (user.role === "hr_admin") {
    return store.nudges.filter(n => !optedOutIds.has(n.employeeId));
  }
  if (user.role === "dept_manager") {
    const deptEmployeeIds = new Set(store.employees.filter(e => e.departmentId === user.departmentId).map(e => e.id));
    return store.nudges.filter(n => deptEmployeeIds.has(n.employeeId) && !optedOutIds.has(n.employeeId));
  }
  return [];
}

export function getNudgeById(id: string): Nudge | null {
  return store.nudges.find(n => n.id === id) ?? null;
}

export function updateNudgeStatus(
  nudgeId: string,
  status: Nudge["status"],
  user: CurrentUser | null
): { ok: boolean; error?: string } {
  requireUser(user);
  const nudge = store.nudges.find(n => n.id === nudgeId);
  if (!nudge) return { ok: false, error: "Nudge not found." };
  if (user.role !== "employee" || user.employeeId !== nudge.employeeId) {
    return { ok: false, error: "Only the recipient can act on this nudge." };
  }
  nudge.status = status;
  return { ok: true };
}

export function submitNudgeFeedback(
  nudgeId: string,
  feedback: Nudge["feedback"],
  user: CurrentUser | null
): { ok: boolean; error?: string } {
  requireUser(user);
  const nudge = store.nudges.find(n => n.id === nudgeId);
  if (!nudge) return { ok: false, error: "Nudge not found." };
  if (user.role !== "employee" || user.employeeId !== nudge.employeeId) {
    return { ok: false, error: "Only the recipient can give feedback on this nudge." };
  }
  nudge.feedback = feedback;
  return { ok: true };
}

export function addNudge(nudge: Nudge): void {
  store.nudges.unshift(nudge);
}

export function nextNudgeId(): string {
  const max = store.nudges.reduce((m, n) => {
    const num = Number(n.id.replace("NUDGE-", ""));
    return Number.isFinite(num) ? Math.max(m, num) : m;
  }, 0);
  return `NUDGE-${String(max + 1).padStart(4, "0")}`;
}
