import "server-only";
import { readState, writeState } from "@/lib/kv-store";
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
  burnoutSnapshots: structuredClone(burnoutSnapshotsSeed) as BurnoutSnapshot[],
  interventions: structuredClone(interventionsSeed) as Intervention[],
};

// Persisted via lib/kv-store rather than kept in `store` above: Route Handlers, Server
// Actions, and Server Components can end up on separate module instances of this file
// within the same server process (confirmed for the sim clock and Subsystem C's
// interventions store), and — on the actual Vercel deployment — the filesystem is
// read-only outside /tmp, so a plain in-memory array or a raw fs write would either
// silently desync between module instances or throw outright in production. An
// in-memory array here would let a sent nudge, a dismiss, or feedback silently vanish
// depending on which module instance served the next read.
const NUDGES_KEY = "nudges";
const NUDGES_FILE = "nudges-state.json";

async function readNudges(): Promise<Nudge[]> {
  return readState<Nudge[]>(NUDGES_KEY, NUDGES_FILE, structuredClone(nudgesSeed) as Nudge[]);
}

async function writeNudges(list: Nudge[]): Promise<void> {
  await writeState(NUDGES_KEY, NUDGES_FILE, list);
}

const SIMULATION_ANCHOR = new Date("2026-08-19T00:00:00Z");

// Same persistence rationale as NUDGES_KEY above — this field must survive both the
// module-instance split and, in production, Vercel's read-only filesystem.
const SIM_STATE_KEY = "sim-week-offset";
const SIM_STATE_FILE = "sim-state.json";

async function readSimWeekOffset(): Promise<number> {
  const parsed = await readState<{ weekOffset?: number }>(SIM_STATE_KEY, SIM_STATE_FILE, { weekOffset: 0 });
  return typeof parsed.weekOffset === "number" ? parsed.weekOffset : 0;
}

async function writeSimWeekOffset(offset: number): Promise<void> {
  await writeState(SIM_STATE_KEY, SIM_STATE_FILE, { weekOffset: offset });
}

export async function getSimulatedDate(): Promise<Date> {
  const d = new Date(SIMULATION_ANCHOR);
  d.setUTCDate(d.getUTCDate() + (await readSimWeekOffset()) * 7);
  return d;
}

export async function getSimulatedDateISO(): Promise<string> {
  return (await getSimulatedDate()).toISOString().slice(0, 10);
}

/** Cross-cutting feature 6: visible only to HR Admin/CFO. */
export async function advanceSimulatedWeek(
  user: CurrentUser | null
): Promise<{ ok: boolean; date?: string; error?: string; status?: number }> {
  if (!user || (user.role !== "hr_admin" && user.role !== "cfo")) {
    return { ok: false, error: "Only HR Admin or CFO can advance the simulated clock.", status: 403 };
  }
  try {
    await writeSimWeekOffset((await readSimWeekOffset()) + 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to advance the simulated clock.";
    return { ok: false, error: message, status: 500 };
  }
  return { ok: true, date: await getSimulatedDateISO() };
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

export async function getNudgesForEmployee(employeeId: string, user: CurrentUser | null): Promise<Nudge[]> {
  requireUser(user);
  const emp = store.employees.find(e => e.id === employeeId);
  if (!emp || emp.optedOut) return [];

  const authorized =
    user.role === "hr_admin" ||
    (user.role === "dept_manager" && emp.departmentId === user.departmentId) ||
    (user.role === "employee" && user.employeeId === employeeId);
  if (!authorized) return [];

  const nudges = await readNudges();
  return nudges.filter(n => n.employeeId === employeeId).sort((a, b) => (a.sentDate < b.sentDate ? 1 : -1));
}

export async function getAllNudges(user: CurrentUser | null): Promise<Nudge[]> {
  requireUser(user);
  const nudges = await readNudges();
  const optedOutIds = new Set(store.employees.filter(e => e.optedOut).map(e => e.id));
  if (user.role === "hr_admin") {
    return nudges.filter(n => !optedOutIds.has(n.employeeId));
  }
  if (user.role === "dept_manager") {
    const deptEmployeeIds = new Set(store.employees.filter(e => e.departmentId === user.departmentId).map(e => e.id));
    return nudges.filter(n => deptEmployeeIds.has(n.employeeId) && !optedOutIds.has(n.employeeId));
  }
  return [];
}

export async function getNudgeById(id: string): Promise<Nudge | null> {
  const nudges = await readNudges();
  return nudges.find(n => n.id === id) ?? null;
}

export async function updateNudgeStatus(
  nudgeId: string,
  status: Nudge["status"],
  user: CurrentUser | null
): Promise<{ ok: boolean; error?: string }> {
  requireUser(user);
  const list = await readNudges();
  const nudge = list.find(n => n.id === nudgeId);
  if (!nudge) return { ok: false, error: "Nudge not found." };
  if (user.role !== "employee" || user.employeeId !== nudge.employeeId) {
    return { ok: false, error: "Only the recipient can act on this nudge." };
  }
  nudge.status = status;
  try {
    await writeNudges(list);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save the nudge update." };
  }
  return { ok: true };
}

export async function submitNudgeFeedback(
  nudgeId: string,
  feedback: Nudge["feedback"],
  user: CurrentUser | null
): Promise<{ ok: boolean; error?: string }> {
  requireUser(user);
  const list = await readNudges();
  const nudge = list.find(n => n.id === nudgeId);
  if (!nudge) return { ok: false, error: "Nudge not found." };
  if (user.role !== "employee" || user.employeeId !== nudge.employeeId) {
    return { ok: false, error: "Only the recipient can give feedback on this nudge." };
  }
  nudge.feedback = feedback;
  try {
    await writeNudges(list);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save the nudge feedback." };
  }
  return { ok: true };
}

export async function addNudge(nudge: Nudge): Promise<void> {
  const list = await readNudges();
  list.unshift(nudge);
  await writeNudges(list); // throws on failure — callers must catch and surface this, not swallow it
}

export async function nextNudgeId(): Promise<string> {
  const list = await readNudges();
  const max = list.reduce((m, n) => {
    const num = Number(n.id.replace("NUDGE-", ""));
    return Number.isFinite(num) ? Math.max(m, num) : m;
  }, 0);
  return `NUDGE-${String(max + 1).padStart(4, "0")}`;
}
