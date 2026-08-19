import "server-only";

/**
 * The only place any subsystem touches Gemini. Subsystem owners import and call
 * these three functions only — never the SDK, never a raw prompt, never the API key.
 *
 * Local/no-key behavior: GEMINI_API_KEY is unset until it's added as a Vercel env
 * var, so every call below resolves through the mocked fallback path. The real
 * fetch() call is fully wired up and starts firing the moment the key is present —
 * no code change needed to switch over.
 */

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_TIMEOUT_MS = 5000;

const cache = new Map<string, string>();

function stableStringify(value: object): string {
  const seen = new WeakSet();
  const sortKeys = (input: unknown): unknown => {
    if (input && typeof input === "object") {
      if (seen.has(input as object)) return undefined;
      seen.add(input as object);
      if (Array.isArray(input)) return input.map(sortKeys);
      return Object.keys(input as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortKeys((input as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(sortKeys(value));
}

function cacheKey(fn: string, input: object): string {
  return `${fn}::${stableStringify(input)}`;
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch {
    // Network failure, timeout (AbortError), or malformed response — caller falls back.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function withCacheAndFallback(
  fnName: string,
  input: object,
  buildPrompt: (input: object) => string,
  fallback: (input: object) => string
): Promise<string> {
  const key = cacheKey(fnName, input);
  const cached = cache.get(key);
  if (cached) return cached;

  const result = (await callGemini(buildPrompt(input))) ?? fallback(input);
  cache.set(key, result);
  return result;
}

// ---------- generateNudge (Subsystem B) ----------

interface EmployeeNudgeContext {
  name: string;
  personaTag: "new_parent" | "high_performer" | "at_risk" | "standard";
  disengagementRiskScore: number;
  nudgeType: "reengagement" | "new_program" | "check_in";
  recentDismissalCount?: number;
  previousFeedbackWasUnhelpful?: boolean;
  suggestedProgramName?: string;
  departmentFlaggedHighRisk?: boolean;
}

function nudgePrompt(ctx: EmployeeNudgeContext): string {
  return [
    "You are VitalPulse, a corporate wellness assistant. Write ONE short, warm, specific nudge message",
    `(2-3 sentences, no greeting boilerplate) for an employee named ${ctx.name}.`,
    `Persona: ${ctx.personaTag}. Nudge type: ${ctx.nudgeType}. Disengagement risk score: ${ctx.disengagementRiskScore}.`,
    ctx.suggestedProgramName ? `Reference this specific program if relevant: ${ctx.suggestedProgramName}.` : "",
    ctx.previousFeedbackWasUnhelpful ? "They previously marked a similar nudge as not helpful — take a different angle." : "",
    ctx.departmentFlaggedHighRisk ? "Their department is currently flagged high-risk — keep this light, a check-in tone, not a push toward new commitments." : "",
    "New-parent nudges should be flexibility-framed. High-performer nudges should be performance-framed, not generic.",
  ]
    .filter(Boolean)
    .join(" ");
}

function nudgeFallback(input: object): string {
  const ctx = input as EmployeeNudgeContext;
  const firstName = ctx.name?.split(" ")[0] || "there";
  if (ctx.departmentFlaggedHighRisk) {
    return `Hi ${firstName}, just checking in — no pressure to respond, we're here if you need anything this week.`;
  }
  switch (ctx.personaTag) {
    case "new_parent":
      return `Welcome back, ${firstName}! Whenever you're ready, there's a flexible-schedule option waiting for you — no rush.`;
    case "high_performer":
      return `${firstName}, your track record speaks for itself — a quick reset this week could help you keep that pace sustainably.`;
    case "at_risk":
      return `Hi ${firstName}, we've noticed things may have been heavy lately. Want to grab 15 minutes with HR, no agenda?`;
    default:
      return `Hi ${firstName}, a quick nudge to check in on how your wellness goals are going this week.`;
  }
}

export async function generateNudge(employeeContext: EmployeeNudgeContext): Promise<string> {
  return withCacheAndFallback("generateNudge", employeeContext, ctx => nudgePrompt(ctx as EmployeeNudgeContext), ctx => nudgeFallback(ctx));
}

// ---------- generateInterventionBrief (Subsystem C) ----------

interface DepartmentInterventionContext {
  departmentName: string;
  riskScore: number;
  trend: "worsening" | "stable" | "improving";
  headcount: number;
}

function interventionPrompt(ctx: DepartmentInterventionContext): string {
  return [
    "You are VitalPulse, drafting a short intervention brief (2-3 sentences) for HR leadership about a department's burnout risk.",
    `Department: ${ctx.departmentName}. Current risk score: ${ctx.riskScore} (0-1 scale). Trend: ${ctx.trend}. Headcount: ${ctx.headcount}.`,
    "State the concern plainly and recommend one concrete, proportionate next step. This brief requires human sign-off before any action — do not imply it has already been actioned.",
  ].join(" ");
}

function interventionFallback(input: object): string {
  const ctx = input as DepartmentInterventionContext;
  return `${ctx.departmentName}'s burnout risk is currently ${ctx.trend} (score ${ctx.riskScore.toFixed(2)}). Recommend a manager check-in this cycle and continued monitoring before any further action.`;
}

export async function generateInterventionBrief(departmentContext: DepartmentInterventionContext): Promise<string> {
  return withCacheAndFallback(
    "generateInterventionBrief",
    departmentContext,
    ctx => interventionPrompt(ctx as DepartmentInterventionContext),
    ctx => interventionFallback(ctx)
  );
}

// ---------- generateProgramRecommendation (Subsystem A) ----------

interface EmployeeProgramContext {
  name: string;
  personaTag: "new_parent" | "high_performer" | "at_risk" | "standard";
  candidateProgramNames: string[];
}

function programPrompt(ctx: EmployeeProgramContext): string {
  return [
    `You are VitalPulse, recommending ONE wellness program (1-2 sentences) for an employee named ${ctx.name}, persona: ${ctx.personaTag}.`,
    `Choose from: ${ctx.candidateProgramNames.join(", ")}.`,
    "Explain briefly why it fits their persona.",
  ].join(" ");
}

function programFallback(input: object): string {
  const ctx = input as EmployeeProgramContext;
  const first = ctx.candidateProgramNames?.[0] ?? "one of our wellness programs";
  const firstName = ctx.name?.split(" ")[0] || "there";
  return `${firstName}, based on your profile we think ${first} could be a good fit — take a look when you have a moment.`;
}

export async function generateProgramRecommendation(employeeContext: EmployeeProgramContext): Promise<string> {
  return withCacheAndFallback(
    "generateProgramRecommendation",
    employeeContext,
    ctx => programPrompt(ctx as EmployeeProgramContext),
    ctx => programFallback(ctx)
  );
}
