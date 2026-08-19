import "server-only";
import type { CurrentUser } from "@/lib/auth-server";
import {
  type Employee,
  type Nudge,
  getEmployees,
  getEmployeesForAggregation,
  getAllNudges,
  getNudgesForEmployee,
  getWellnessPrograms,
  getDepartments,
  isDepartmentFlaggedHighRisk,
  addNudge,
  nextNudgeId,
  getSimulatedDate,
} from "@/lib/data";
import { generateNudge } from "@/lib/llm";
import { riskLevelFromScore, type RiskLevel } from "@/components/shared/risk-badge";
import { calculateRoi, DEFAULT_ROI_ASSUMPTIONS, type RoiContext } from "@/lib/roi-math";

export type { RoiAssumptions, RoiContext, RoiResult } from "@/lib/roi-math";
export { calculateRoi, DEFAULT_ROI_ASSUMPTIONS } from "@/lib/roi-math";

// ---------- Risk & at-risk employees ----------

export interface AtRiskEmployee extends Employee {
  riskLevel: RiskLevel;
  departmentFlaggedHighRisk: boolean;
  latestNudge: Nudge | null;
}

export function getAtRiskEmployees(user: CurrentUser | null): AtRiskEmployee[] {
  return getEmployees(user)
    .filter(e => !e.optedOut)
    .map(e => enrichEmployee(e, user))
    .filter(e => e.riskLevel !== "low")
    .sort((a, b) => b.disengagementRiskScore - a.disengagementRiskScore);
}

/** Count-only aggregate (no names) — safe for CFO's rollup, unlike getAtRiskEmployees(). */
export function getAtRiskCount(user: CurrentUser | null): number {
  return getEmployeesForAggregation(user).filter(e => !e.optedOut && riskLevelFromScore(e.disengagementRiskScore) !== "low").length;
}

export function enrichEmployee(emp: Employee, user: CurrentUser | null): AtRiskEmployee {
  const history = emp.optedOut ? [] : getNudgesForEmployee(emp.id, user);
  return {
    ...emp,
    riskLevel: riskLevelFromScore(emp.disengagementRiskScore),
    departmentFlaggedHighRisk: isDepartmentFlaggedHighRisk(emp.departmentId),
    latestNudge: history[0] ?? null,
  };
}

/** Visible risk score respects the opt-out rule: zero risk scoring shown, anywhere. */
export function visibleRiskScore(emp: Employee): number | null {
  return emp.optedOut ? null : emp.disengagementRiskScore;
}

// ---------- Nudge fatigue rule ----------

export interface NudgeEligibility {
  eligible: boolean;
  reason: string;
  consecutiveDismissals: number;
  recommendedType: Nudge["type"];
  suppressNewProgram: boolean;
}

const FATIGUE_DISMISSAL_THRESHOLD = 2;
const FATIGUE_COOLDOWN_DAYS = 21;

export function getNudgeEligibility(emp: Employee, history: Nudge[], departmentFlaggedHighRisk: boolean): NudgeEligibility {
  const sorted = [...history].sort((a, b) => (a.sentDate < b.sentDate ? 1 : -1));

  let consecutiveDismissals = 0;
  for (const n of sorted) {
    if (n.status === "dismissed") consecutiveDismissals++;
    else break;
  }

  const suppressNewProgram = departmentFlaggedHighRisk;
  let recommendedType: Nudge["type"] = suppressNewProgram ? "check_in" : "new_program";

  if (consecutiveDismissals >= FATIGUE_DISMISSAL_THRESHOLD) {
    const lastSent = sorted[0]?.sentDate;
    const daysSinceLast = lastSent ? daysBetween(lastSent, getSimulatedDate()) : Infinity;
    if (daysSinceLast < FATIGUE_COOLDOWN_DAYS) {
      return {
        eligible: false,
        reason: `${emp.name.split(" ")[0]} has dismissed ${consecutiveDismissals} nudges in a row — cooling off for ${FATIGUE_COOLDOWN_DAYS - daysSinceLast} more day(s) before trying a different approach.`,
        consecutiveDismissals,
        recommendedType,
        suppressNewProgram,
      };
    }
    // Past the cooldown: try a lighter touch, not the same template.
    recommendedType = "check_in";
  }

  return {
    eligible: true,
    reason: suppressNewProgram
      ? "Department is currently flagged high-risk by the burnout radar — sending a lighter check-in instead of a new-program push."
      : "Standard nudge cycle.",
    consecutiveDismissals,
    recommendedType,
    suppressNewProgram,
  };
}

function daysBetween(isoDate: string, ref: Date): number {
  const a = new Date(isoDate + "T00:00:00Z").getTime();
  const b = ref.getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

// ---------- Nudge generation (the only place Subsystem B calls the shared LLM utility) ----------

export interface GeneratedNudgeResult {
  ok: boolean;
  nudge?: Nudge;
  explanation?: string;
  error?: string;
}

export async function generateNudgeForEmployee(employeeId: string, user: CurrentUser | null): Promise<GeneratedNudgeResult> {
  // getEmployees is role-scoped, so hr_admin/dept_manager can only trigger this for employees in their scope.
  const employees = getEmployees(user);
  const target = employees.find(e => e.id === employeeId) ?? null;
  if (!target) {
    return { ok: false, error: "Employee not found or not in scope." };
  }
  if (target.optedOut) {
    return { ok: false, error: "This employee has opted out — no nudges are generated for them." };
  }

  const history = getNudgesForEmployee(target.id, user);
  const departmentFlagged = isDepartmentFlaggedHighRisk(target.departmentId);
  const eligibility = getNudgeEligibility(target, history, departmentFlagged);
  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.reason };
  }

  const previousFeedbackWasUnhelpful = history.some(n => n.feedback === "not_helpful");
  const programs = getWellnessPrograms(user);
  const suggestedProgram = !eligibility.suppressNewProgram && eligibility.recommendedType === "new_program" ? pickProgramForPersona(target, programs) : undefined;

  const content = await generateNudge({
    name: target.name,
    personaTag: target.personaTag,
    disengagementRiskScore: target.disengagementRiskScore,
    nudgeType: eligibility.recommendedType,
    recentDismissalCount: eligibility.consecutiveDismissals,
    previousFeedbackWasUnhelpful,
    suggestedProgramName: suggestedProgram?.name,
    departmentFlaggedHighRisk: departmentFlagged,
  });

  const nudge: Nudge = {
    id: nextNudgeId(),
    employeeId: target.id,
    type: eligibility.recommendedType,
    content,
    sentDate: getSimulatedDate().toISOString().slice(0, 10),
    status: "sent",
    feedback: null,
  };
  addNudge(nudge);

  return { ok: true, nudge, explanation: explainNudge(nudge, target, eligibility, departmentFlagged) };
}

function pickProgramForPersona(emp: Employee, programs: ReturnType<typeof getWellnessPrograms>) {
  const byCategory: Record<Employee["personaTag"], string> = {
    new_parent: "mental_health",
    high_performer: "fitness",
    at_risk: "mental_health",
    standard: "fitness",
  };
  const preferred = programs.filter(p => p.category === byCategory[emp.personaTag]);
  return preferred[0] ?? programs[0];
}

export function explainNudge(nudge: Nudge, emp: Employee, eligibility?: NudgeEligibility, departmentFlagged?: boolean): string {
  const parts: string[] = [];
  parts.push(`You're seeing this because your disengagement signals put you in the "${emp.personaTag.replace("_", " ")}" persona with a current risk score of ${emp.disengagementRiskScore.toFixed(2)}.`);
  if (departmentFlagged) {
    parts.push("Your department is currently flagged high-risk by the burnout radar, so this is a lighter check-in rather than a push toward a new program.");
  } else if (nudge.type === "new_program") {
    parts.push("Based on your engagement history, we matched you to a program rather than a generic reminder.");
  }
  if (eligibility && eligibility.consecutiveDismissals > 0) {
    parts.push(`We noticed you've dismissed similar nudges before, so we changed the approach this time.`);
  }
  return parts.join(" ");
}

// ---------- Company-wide aggregates (CFO / HR Admin) ----------

export interface DisengagementDistribution {
  low: number;
  medium: number;
  high: number;
  optedOut: number;
  total: number;
}

export function getDisengagementDistribution(user: CurrentUser | null): DisengagementDistribution {
  const employees = getEmployeesForAggregation(user);
  const dist: DisengagementDistribution = { low: 0, medium: 0, high: 0, optedOut: 0, total: employees.length };
  for (const e of employees) {
    if (e.optedOut) {
      dist.optedOut++;
      continue;
    }
    dist[riskLevelFromScore(e.disengagementRiskScore)]++;
  }
  return dist;
}

export interface WeeklyNudgeEngagement {
  weekOf: string;
  sent: number;
  dismissed: number;
  actedOn: number;
}

export function getNudgeEngagementTrend(user: CurrentUser | null, weeks = 8): WeeklyNudgeEngagement[] {
  const nudges = getAllNudges(user);
  const buckets = new Map<string, WeeklyNudgeEngagement>();
  const today = getSimulatedDate();

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = mondayOf(new Date(today.getTime() - w * 7 * 86400000));
    buckets.set(weekStart, { weekOf: weekStart, sent: 0, dismissed: 0, actedOn: 0 });
  }

  for (const n of nudges) {
    const weekStart = mondayOf(new Date(n.sentDate + "T00:00:00Z"));
    const bucket = buckets.get(weekStart);
    if (!bucket) continue;
    if (n.status === "dismissed") bucket.dismissed++;
    else if (n.status === "acted_on") bucket.actedOn++;
    else bucket.sent++;
  }

  return Array.from(buckets.values());
}

function mondayOf(d: Date): string {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy.toISOString().slice(0, 10);
}

// ---------- Budget-aware ROI calculator context (data-layer dependent; pure math lives in lib/roi-math.ts) ----------

export function getRoiContext(user: CurrentUser | null): RoiContext {
  const atRisk = getEmployeesForAggregation(user).filter(e => !e.optedOut && riskLevelFromScore(e.disengagementRiskScore) !== "low");
  const programs = getWellnessPrograms(user);
  const avgProgramCostPerEmployeeINR = programs.length ? programs.reduce((s, p) => s + p.costPerEmployeeINR, 0) / programs.length : 0;

  const departments = getDepartments(user);
  const flaggedDeptIds = new Set(atRisk.map(e => e.departmentId));
  const totalRemainingBudgetINR = departments
    .filter(d => flaggedDeptIds.has(d.id))
    .reduce((sum, d) => sum + Math.max(0, d.budgetAllocatedINR - d.budgetUsedINR), 0);

  return { atRiskEmployeeCount: getAtRiskCount(user), avgProgramCostPerEmployeeINR, totalRemainingBudgetINR };
}

// ---------- CFO headline: "with AI platform vs. without" ----------

export interface AiVsWithoutComparison {
  atRiskCount: number;
  withoutPlatformINR: number;
  withPlatformINR: number;
  projectedSavingsINR: number;
}

const BASELINE_ATTRITION_PROBABILITY = 0.25; // matches lib/roi-math.ts's avoidance factor: the risk being avoided

export function getAiVsWithoutComparison(user: CurrentUser | null): AiVsWithoutComparison {
  const ctx = getRoiContext(user);
  const assumptions = { ...DEFAULT_ROI_ASSUMPTIONS };

  const fullClaimsCost = ctx.atRiskEmployeeCount * assumptions.avgAnnualClaimsCostINR;
  const fullAttritionRiskCost = ctx.atRiskEmployeeCount * BASELINE_ATTRITION_PROBABILITY * assumptions.avgAttritionCostINR;
  const fullAbsenteeismCost = ctx.atRiskEmployeeCount * assumptions.avgAbsenteeismDaysPerAtRiskEmployee * assumptions.absenteeismDailyCostINR;
  const withoutPlatformINR = fullClaimsCost + fullAttritionRiskCost + fullAbsenteeismCost;

  const roi = calculateRoi(assumptions, ctx);
  const withPlatformINR = Math.max(0, withoutPlatformINR - roi.netSavingsINR);

  return {
    atRiskCount: ctx.atRiskEmployeeCount,
    withoutPlatformINR,
    withPlatformINR,
    projectedSavingsINR: withoutPlatformINR - withPlatformINR,
  };
}
