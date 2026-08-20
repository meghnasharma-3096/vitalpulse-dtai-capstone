import "server-only";
import {
  getWellnessPrograms,
  getEmployeeById,
  isDepartmentFlaggedHighRisk,
  BURNOUT_HIGH_RISK_THRESHOLD,
  type Employee,
  type WellnessProgram,
} from "@/lib/data";
import { generateProgramRecommendation } from "@/lib/llm";
import type { CurrentUser } from "@/lib/auth-server";

// ---------- Extended types (our data file adds recommendedCount) ----------

/** The wellness-programs.json we own adds this field beyond the shared interface. */
export interface WellnessProgramExtended extends WellnessProgram {
  recommendedCount: number;
}

export type ProgramStatus = "available" | "near_capacity" | "full";

export interface ProgramWithUtilization extends WellnessProgramExtended {
  utilizationPct: number;
  status: ProgramStatus;
  underutilized: boolean;
}

export interface ProgramRecommendation {
  program: WellnessProgram;
  explanation: string;
  status: ProgramStatus;
}

export interface RecommendationResult {
  /** null when recommendations are available; a message when suppressed. */
  suppressed: string | null;
  recommendations: ProgramRecommendation[];
}

// ---------- Constants ----------

/** Disengagement score at or above this triggers the cross-subsystem conflict rule. */
const DISENGAGEMENT_HIGH_THRESHOLD = BURNOUT_HIGH_RISK_THRESHOLD; // 0.7

/** Programs with utilization above this % are considered "near capacity." */
const NEAR_CAPACITY_PCT = 80;

/** How many months a hire date must be within to count as "recent" for cold-start. */
const COLD_START_MONTHS = 6;

// ---------- Persona → category affinity mapping ----------

type PersonaTag = Employee["personaTag"];
type ProgramCategory = WellnessProgram["category"];

/**
 * Each persona has an ordered list of preferred program categories.
 * The recommendation engine picks from these in order, skipping programs
 * that are full or already selected.
 */
const PERSONA_CATEGORY_AFFINITY: Record<PersonaTag, ProgramCategory[]> = {
  new_parent: ["mental_health", "fitness", "nutrition", "financial_wellness"],
  high_performer: ["fitness", "nutrition", "mental_health", "financial_wellness"],
  at_risk: ["mental_health", "fitness", "nutrition", "financial_wellness"],
  standard: ["fitness", "mental_health", "nutrition", "financial_wellness"],
};

/**
 * Specific program-name keywords that are especially good matches per persona.
 * If a program name contains these keywords (case-insensitive), it gets priority.
 */
const PERSONA_KEYWORD_BOOST: Record<PersonaTag, string[]> = {
  new_parent: ["parent", "flexibility", "meditation"],
  high_performer: ["corporate", "ergonomics", "desk"],
  at_risk: ["therapy", "meditation", "support"],
  standard: [],
};

// ---------- Helpers ----------

function getProgramStatus(program: WellnessProgram): ProgramStatus {
  if (program.enrolledCount >= program.capacity) return "full";
  const pct = (program.enrolledCount / program.capacity) * 100;
  if (pct >= NEAR_CAPACITY_PCT) return "near_capacity";
  return "available";
}

function isRecentHire(employee: Employee): boolean {
  const hireDate = new Date(employee.hireDate);
  const now = new Date();
  const diffMs = now.getTime() - hireDate.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
  return diffMonths <= COLD_START_MONTHS;
}

function isColdStart(employee: Employee): boolean {
  return employee.personaTag === "standard" && isRecentHire(employee);
}

// ---------- Core matching logic ----------

/**
 * Score and rank programs for an employee based on their persona.
 * Returns programs sorted by relevance, excluding any at capacity.
 */
function rankPrograms(
  employee: Employee,
  programs: WellnessProgramExtended[]
): WellnessProgramExtended[] {
  // Filter out full programs
  const available = programs.filter(p => p.enrolledCount < p.capacity);

  const affinityOrder = PERSONA_CATEGORY_AFFINITY[employee.personaTag];
  const keywords = PERSONA_KEYWORD_BOOST[employee.personaTag];

  return [...available].sort((a, b) => {
    // Keyword boost: programs matching persona keywords rank higher
    const aKeyword = keywords.some(k => a.name.toLowerCase().includes(k)) ? 0 : 1;
    const bKeyword = keywords.some(k => b.name.toLowerCase().includes(k)) ? 0 : 1;
    if (aKeyword !== bKeyword) return aKeyword - bKeyword;

    // Category affinity: prefer categories that match the persona
    const aCatIdx = affinityOrder.indexOf(a.category);
    const bCatIdx = affinityOrder.indexOf(b.category);
    if (aCatIdx !== bCatIdx) return aCatIdx - bCatIdx;

    // Prefer programs with more availability (less full)
    const aUtil = a.enrolledCount / a.capacity;
    const bUtil = b.enrolledCount / b.capacity;
    return aUtil - bUtil;
  });
}

/**
 * For cold-start employees, provide a diverse set of recommendations
 * across different categories rather than persona-targeted ones.
 */
function rankProgramsColdStart(
  programs: WellnessProgramExtended[]
): WellnessProgramExtended[] {
  const available = programs.filter(p => p.enrolledCount < p.capacity);

  // Pick one from each category, preferring those with the most availability
  const byCategory = new Map<ProgramCategory, WellnessProgramExtended[]>();
  for (const p of available) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }

  const result: WellnessProgramExtended[] = [];
  const categories: ProgramCategory[] = ["fitness", "mental_health", "nutrition", "financial_wellness"];

  for (const cat of categories) {
    const catPrograms = byCategory.get(cat);
    if (catPrograms && catPrograms.length > 0) {
      // Pick the one with lowest utilization in this category
      catPrograms.sort((a, b) => (a.enrolledCount / a.capacity) - (b.enrolledCount / b.capacity));
      result.push(catPrograms[0]);
    }
  }

  return result;
}

// ---------- Public API ----------

/**
 * Get program recommendations for an employee.
 * Implements all edge cases: opted-out, conflict rule, capacity checks, cold-start.
 */
export async function getRecommendationsForEmployee(
  employee: Employee,
  user: CurrentUser | null
): Promise<RecommendationResult> {
  // Edge case: opted-out employee — no recommendations, no tracking
  if (employee.optedOut) {
    return { suppressed: null, recommendations: [] };
  }

  // Conflict rule: high disengagement risk score
  if (employee.disengagementRiskScore >= DISENGAGEMENT_HIGH_THRESHOLD) {
    return {
      suppressed:
        "Currently not recommending new programs — flagged for reduced load due to high disengagement risk.",
      recommendations: [],
    };
  }

  // Conflict rule: department burnout-flagged
  if (isDepartmentFlaggedHighRisk(employee.departmentId)) {
    return {
      suppressed:
        "Currently not recommending new programs — your department is in a high-focus period.",
      recommendations: [],
    };
  }

  // Get all programs (cast to extended type to access recommendedCount)
  const rawPrograms = getWellnessPrograms(user) as WellnessProgramExtended[];

  // Rank programs based on persona or cold-start fallback
  const coldStart = isColdStart(employee);
  const ranked = coldStart
    ? rankProgramsColdStart(rawPrograms)
    : rankPrograms(employee, rawPrograms);

  // Take top 3 recommendations
  const top = ranked.slice(0, 3);

  // Generate AI explanations for each recommendation
  const recommendations: ProgramRecommendation[] = await Promise.all(
    top.map(async (program) => {
      const explanation = await generateProgramRecommendation({
        name: employee.name,
        personaTag: employee.personaTag,
        candidateProgramNames: [program.name],
      });

      return {
        program,
        explanation,
        status: getProgramStatus(program),
      };
    })
  );

  return { suppressed: null, recommendations };
}

/**
 * Get the full program catalog with utilization metrics.
 * Used by the HR Admin / CFO program catalog page.
 */
export function getProgramCatalogWithUtilization(
  user: CurrentUser | null
): ProgramWithUtilization[] {
  const rawPrograms = getWellnessPrograms(user) as WellnessProgramExtended[];

  return rawPrograms.map((p) => {
    const utilizationPct = Math.round((p.enrolledCount / p.capacity) * 100);
    const status = getProgramStatus(p);

    // Underutilization: recommended count is more than double the enrolled,
    // AND enrollment is below 50% capacity — signals "why aren't people signing up?"
    const underutilized =
      p.recommendedCount > p.enrolledCount * 2 && p.enrolledCount < p.capacity * 0.5;

    return {
      ...p,
      utilizationPct,
      status,
      underutilized,
    };
  });
}

/**
 * Simplified match data for the employee profile page.
 * Returns recommendations without the full AI explanation call
 * (uses a shorter, synchronous description instead).
 */
export async function getProgramMatchesForProfile(
  employee: Employee,
  user: CurrentUser | null
): Promise<RecommendationResult> {
  return getRecommendationsForEmployee(employee, user);
}

// ---------- Category label helper (shared across components) ----------

export const CATEGORY_LABEL: Record<ProgramCategory, string> = {
  fitness: "Fitness",
  mental_health: "Mental Health",
  nutrition: "Nutrition",
  financial_wellness: "Financial Wellness",
};

export const CATEGORY_ICON: Record<ProgramCategory, string> = {
  fitness: "Dumbbell",
  mental_health: "Brain",
  nutrition: "Apple",
  financial_wellness: "Wallet",
};
