"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Cross-cutting feature 4 — a "why am I seeing this" note next to every
 * AI-generated output, everywhere in the app.
 */
export function ExplainabilityTooltip({ reason }: { reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          aria-label="Why am I seeing this?"
        >
          <Info className="h-3.5 w-3.5" />
          Why am I seeing this?
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">{reason}</TooltipContent>
    </Tooltip>
  );
}
