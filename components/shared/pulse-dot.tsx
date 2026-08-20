import { cn } from "@/lib/utils";

/**
 * design.md Section 6 — the "pulse" signature element. Marks a number as
 * live/predictive, not merely important. Used in exactly two places:
 * RiskBadge (every disengagement/burnout risk score) and the CFO dashboard's
 * "with VitalPulse vs. without" headline figure. Don't add it elsewhere —
 * inherits color from its container via `currentColor`.
 */
export function PulseDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("relative inline-flex h-2 w-2 shrink-0", className)} aria-hidden="true" {...props}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
      <span className="relative inline-flex h-full w-full rounded-full bg-current" />
    </span>
  );
}
