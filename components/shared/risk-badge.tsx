import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high";

/**
 * The single shared risk color mapping — low #52B788, medium #F4A261, high #E63946
 * (design.md Section 6) — reused for burnout, disengagement, and budget risk alike,
 * so risk means the same thing visually everywhere in the app.
 */
export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-[color-mix(in_oklch,var(--risk-low)_16%,transparent)] text-[#1B4332] border-[var(--risk-low)]/40 dark:text-[#B7EFC5]",
  medium: "bg-[color-mix(in_oklch,var(--risk-medium)_18%,transparent)] text-[#7A4A12] border-[var(--risk-medium)]/40 dark:text-[#FBD9B4]",
  high: "bg-[color-mix(in_oklch,var(--risk-high)_16%,transparent)] text-[#7A1620] border-[var(--risk-high)]/40 dark:text-[#F8C1C6]",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export function RiskBadge({
  level,
  score,
  label,
  className,
}: {
  level: RiskLevel;
  score?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        RISK_STYLES[level],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `var(--risk-${level})` }} />
      {label ?? RISK_LABEL[level]}
      {typeof score === "number" && <span className="opacity-70">· {score.toFixed(2)}</span>}
    </span>
  );
}
