import "server-only";
import interventionsSeed from "@/data/interventions.json";
import burnoutSnapshotsSeed from "@/data/burnout-snapshots.json";
import departmentsSeed from "@/data/departments.json";
import type { CurrentUser } from "@/lib/auth-server";
import {
  PRIVACY_FLOOR_HEADCOUNT,
  BURNOUT_HIGH_RISK_THRESHOLD,
  type BurnoutSnapshot,
  type Department,
  type Intervention,
  getDepartments,
  getAllDepartmentsUnscoped,
} from "@/lib/data";
import { generateInterventionBrief } from "@/lib/llm";
import { riskLevelFromScore, type RiskLevel } from "@/components/shared/risk-badge";

export type { BurnoutSnapshot, Department, Intervention };
export { PRIVACY_FLOOR_HEADCOUNT, BURNOUT_HIGH_RISK_THRESHOLD };

export interface DepartmentBurnoutSummary {
  id: string;
  name: string;
  headcount: number;
  isSuppressed: boolean;
  latestSnapshot: BurnoutSnapshot | null;
  riskLevel: RiskLevel;
  trend: "worsening" | "stable" | "improving" | "suppressed";
  activeIntervention: Intervention | null;
  estimatedBudgetINR: number;
  recommendedTimeline: string;
}

export interface WeeklyTrendPoint {
  weekOf: string;
  [deptId: string]: string | number | undefined;
}

// In-memory interventions store for Subsystem C (supports prototype mutations)
const interventionsStore: Intervention[] = structuredClone(interventionsSeed) as Intervention[];

function requireUser(user: CurrentUser | null): asserts user is CurrentUser {
  if (!user) throw new Error("Not authenticated.");
}

function nextInterventionId(): string {
  const max = interventionsStore.reduce((m, i) => {
    const num = Number(i.id.replace("INT-", ""));
    return Number.isFinite(num) ? Math.max(m, num) : m;
  }, 0);
  return `INT-${String(max + 1).padStart(3, "0")}`;
}

// Estimated intervention budget based on headcount & risk
export function calculateEstimatedBudget(headcount: number, riskScore: number): number {
  const basePerPerson = 4500;
  const intensityMultiplier = riskScore >= 0.7 ? 1.8 : riskScore >= 0.4 ? 1.3 : 1.0;
  return Math.round(headcount * basePerPerson * intensityMultiplier);
}

// Recommended timeline based on trend & risk
export function getRecommendedTimeline(trend: string, riskScore: number): string {
  if (riskScore >= 0.7 || trend === "worsening") return "Immediate (1–2 weeks)";
  if (riskScore >= 0.4) return "Next cycle (2–4 weeks)";
  return "Ongoing monitoring (quarterly)";
}

// ---------- Subsystem C Read Operations ----------

/**
 * Get all interventions scoped by role:
 * - hr_admin, cfo: company-wide audit trail
 * - dept_manager: scoped strictly to their own department
 * - employee: empty array (no access to Subsystem C)
 */
export function getSubsystemInterventions(user: CurrentUser | null): Intervention[] {
  requireUser(user);
  if (user.role === "hr_admin" || user.role === "cfo") {
    return [...interventionsStore].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }
  if (user.role === "dept_manager") {
    return interventionsStore
      .filter((i) => i.departmentId === user.departmentId)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }
  return [];
}

export function getInterventionById(id: string, user: CurrentUser | null): Intervention | null {
  const scoped = getSubsystemInterventions(user);
  return scoped.find((i) => i.id === id) ?? null;
}

/**
 * Get department summaries with privacy floor enforcement:
 * Departments under PRIVACY_FLOOR_HEADCOUNT (5) are flagged as suppressed,
 * and no burnout snapshots are exposed.
 */
export function getDepartmentBurnoutSummaries(user: CurrentUser | null): DepartmentBurnoutSummary[] {
  requireUser(user);
  const allDepts = (user.role === "dept_manager"
    ? departmentsSeed.filter((d) => d.id === user.departmentId)
    : departmentsSeed) as Department[];

  const allSnapshots = burnoutSnapshotsSeed as BurnoutSnapshot[];
  const userInterventions = getSubsystemInterventions(user);

  return allDepts.map((dept) => {
    // Strict Privacy Floor Check
    const isSuppressed = dept.headcount < PRIVACY_FLOOR_HEADCOUNT;

    if (isSuppressed) {
      return {
        id: dept.id,
        name: dept.name,
        headcount: dept.headcount,
        isSuppressed: true,
        latestSnapshot: null,
        riskLevel: "low" as RiskLevel,
        trend: "suppressed" as const,
        activeIntervention: null,
        estimatedBudgetINR: 0,
        recommendedTimeline: "Not applicable — below privacy floor",
      };
    }

    const deptSnapshots = allSnapshots
      .filter((s) => s.departmentId === dept.id && s.headcount >= PRIVACY_FLOOR_HEADCOUNT)
      .sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));

    const latest = deptSnapshots[0] ?? null;
    const riskScore = latest ? latest.riskScore : 0.2;
    const trend = latest ? latest.trend : "stable";

    // Active intervention (pending or recently acted on)
    const deptInterventions = userInterventions.filter((i) => i.departmentId === dept.id);
    const active =
      deptInterventions.find((i) => i.status === "pending") ??
      deptInterventions.find((i) => i.status === "escalated") ??
      deptInterventions[0] ??
      null;

    return {
      id: dept.id,
      name: dept.name,
      headcount: dept.headcount,
      isSuppressed: false,
      latestSnapshot: latest,
      riskLevel: riskLevelFromScore(riskScore),
      trend,
      activeIntervention: active,
      estimatedBudgetINR: calculateEstimatedBudget(dept.headcount, riskScore),
      recommendedTimeline: getRecommendedTimeline(trend, riskScore),
    };
  });
}

/**
 * Historical weekly trend points for Recharts.
 * Recharts multi-line chart expects format:
 * [{ weekOf: '2026-07-13', Engineering: 0.4, Sales: 0.41, ... }, ...]
 */
export function getDepartmentTrendSeries(user: CurrentUser | null): {
  weeks: WeeklyTrendPoint[];
  departments: { id: string; name: string; color: string }[];
} {
  requireUser(user);
  const scopedDepts = getDepartmentBurnoutSummaries(user).filter((d) => !d.isSuppressed);

  const COLOR_PALETTE = [
    "#2D6A4F", // Primary Teal
    "#E63946", // High Risk Red (CS / Sales)
    "#F4A261", // Accent Amber
    "#52B788", // Risk Low Mint
    "#1D3557", // Deep Navy
    "#457B9D", // Steel Blue
    "#8338EC", // Purple
    "#FB5607", // Orange
  ];

  const deptsMeta = scopedDepts.map((d, idx) => ({
    id: d.id,
    name: d.name,
    color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
  }));

  const allSnapshots = burnoutSnapshotsSeed as BurnoutSnapshot[];
  const validSnapshots = allSnapshots.filter(
    (s) => s.headcount >= PRIVACY_FLOOR_HEADCOUNT && scopedDepts.some((d) => d.id === s.departmentId)
  );

  // Group by weekOf
  const weeksMap = new Map<string, WeeklyTrendPoint>();
  for (const s of validSnapshots) {
    const pt = weeksMap.get(s.weekOf) ?? { weekOf: s.weekOf };
    const dept = scopedDepts.find((d) => d.id === s.departmentId);
    if (dept) {
      pt[dept.name] = s.riskScore;
    }
    weeksMap.set(s.weekOf, pt);
  }

  const weeks = Array.from(weeksMap.values()).sort((a, b) => (a.weekOf > b.weekOf ? 1 : -1));

  return { weeks, departments: deptsMeta };
}

// ---------- Subsystem C Mutations (Human Sign-Off & Governance) ----------

/**
 * Human Sign-Off: Approve an intervention brief.
 * Required human decision maker action.
 */
export function approveIntervention(
  id: string,
  user: CurrentUser | null
): { ok: boolean; error?: string; intervention?: Intervention } {
  requireUser(user);
  if (user.role !== "hr_admin" && user.role !== "cfo" && user.role !== "dept_manager") {
    return { ok: false, error: "Unauthorized: only HR Admin, CFO, or Department Managers can approve interventions." };
  }

  const intervention = interventionsStore.find((i) => i.id === id);
  if (!intervention) return { ok: false, error: "Intervention not found." };

  if (user.role === "dept_manager" && intervention.departmentId !== user.departmentId) {
    return { ok: false, error: "Department Managers can only sign off on their own department." };
  }

  intervention.status = "approved";
  intervention.actedBy = user.employeeId ?? user.name;
  intervention.timestamp = new Date().toISOString();

  return { ok: true, intervention };
}

/**
 * Human Sign-Off: Reject an intervention brief.
 * Required human decision maker action.
 */
export function rejectIntervention(
  id: string,
  user: CurrentUser | null
): { ok: boolean; error?: string; intervention?: Intervention } {
  requireUser(user);
  if (user.role !== "hr_admin" && user.role !== "cfo" && user.role !== "dept_manager") {
    return { ok: false, error: "Unauthorized: only HR Admin, CFO, or Department Managers can reject interventions." };
  }

  const intervention = interventionsStore.find((i) => i.id === id);
  if (!intervention) return { ok: false, error: "Intervention not found." };

  if (user.role === "dept_manager" && intervention.departmentId !== user.departmentId) {
    return { ok: false, error: "Department Managers can only reject briefs for their own department." };
  }

  intervention.status = "rejected";
  intervention.actedBy = user.employeeId ?? user.name;
  intervention.timestamp = new Date().toISOString();

  return { ok: true, intervention };
}

/**
 * Human Sign-Off: Escalate an intervention brief to executive leadership.
 */
export function escalateIntervention(
  id: string,
  reason: string,
  user: CurrentUser | null
): { ok: boolean; error?: string; intervention?: Intervention } {
  requireUser(user);
  if (user.role !== "hr_admin" && user.role !== "cfo" && user.role !== "dept_manager") {
    return { ok: false, error: "Unauthorized to escalate." };
  }

  const intervention = interventionsStore.find((i) => i.id === id);
  if (!intervention) return { ok: false, error: "Intervention not found." };

  if (user.role === "dept_manager" && intervention.departmentId !== user.departmentId) {
    return { ok: false, error: "Department Managers can only escalate their own department's briefs." };
  }

  intervention.status = "escalated";
  intervention.actedBy = user.employeeId ?? user.name;
  intervention.escalationReason = reason || "Escalated for immediate leadership & budget review.";
  intervention.timestamp = new Date().toISOString();

  return { ok: true, intervention };
}

/**
 * Draft a new AI intervention brief for a department.
 * Calls generateInterventionBrief(ctx) from lib/llm.ts.
 * The brief is ALWAYS saved in 'pending' status — human approval is strictly required.
 */
export async function createDraftIntervention(
  departmentId: string,
  user: CurrentUser | null
): Promise<{ ok: boolean; error?: string; intervention?: Intervention }> {
  requireUser(user);
  if (user.role !== "hr_admin" && user.role !== "cfo" && user.role !== "dept_manager") {
    return { ok: false, error: "Unauthorized." };
  }

  const dept = departmentsSeed.find((d) => d.id === departmentId) as Department | undefined;
  if (!dept) return { ok: false, error: "Department not found." };

  // Strict Privacy Floor Check
  if (dept.headcount < PRIVACY_FLOOR_HEADCOUNT) {
    return { ok: false, error: "Cannot generate an intervention for a department below the privacy floor." };
  }

  if (user.role === "dept_manager" && user.departmentId !== departmentId) {
    return { ok: false, error: "Department Managers can only draft interventions for their own team." };
  }

  const allSnapshots = burnoutSnapshotsSeed as BurnoutSnapshot[];
  const deptSnapshots = allSnapshots
    .filter((s) => s.departmentId === departmentId)
    .sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));

  const latest = deptSnapshots[0];
  const riskScore = latest ? latest.riskScore : 0.5;
  const trend = latest ? latest.trend : "stable";

  // Generate brief via shared LLM helper
  const aiDraftedBrief = await generateInterventionBrief({
    departmentName: dept.name,
    riskScore,
    trend,
    headcount: dept.headcount,
  });

  const newIntervention: Intervention = {
    id: nextInterventionId(),
    departmentId,
    aiDraftedBrief,
    status: "pending", // Mandatory governance: human sign-off required
    actedBy: null,
    timestamp: new Date().toISOString(),
    escalationReason: null,
  };

  interventionsStore.unshift(newIntervention);
  return { ok: true, intervention: newIntervention };
}

/**
 * Escalation on Inaction SLA Check:
 * Any pending intervention exceeding SLA threshold is marked as escalated
 * so leadership/CFO can intervene.
 */
export function checkAutoEscalations(user: CurrentUser | null): number {
  if (!user || (user.role !== "hr_admin" && user.role !== "cfo")) return 0;

  let count = 0;
  const now = new Date().getTime();
  const SLA_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in simulated/wall clock

  for (const item of interventionsStore) {
    if (item.status === "pending") {
      const itemTime = new Date(item.timestamp).getTime();
      if (now - itemTime > SLA_MS) {
        item.status = "escalated";
        item.escalationReason = "Auto-escalated: pending longer than SLA threshold without HR action.";
        item.timestamp = new Date().toISOString();
        count++;
      }
    }
  }
  return count;
}
