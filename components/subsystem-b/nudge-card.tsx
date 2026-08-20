"use client";

import { useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExplainabilityTooltip } from "@/components/shared/explainability-tooltip";
import { dismissNudgeAction, actOnNudgeAction, submitNudgeFeedbackAction } from "@/app/actions/nudges";
import type { Nudge } from "@/lib/data";

const TYPE_LABEL: Record<Nudge["type"], string> = {
  reengagement: "Re-engagement",
  new_program: "New program",
  check_in: "Check-in",
};

export function NudgeCard({
  nudge,
  explanation,
  interactive = true,
}: {
  nudge: Nudge;
  explanation: string;
  /** Only the employee themself can dismiss/act on/give feedback — set false for HR Admin/manager read-only views. */
  interactive?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isActive = nudge.status === "sent";

  return (
    <Card className={isActive ? "shadow-[var(--shadow-card-hover)]" : "opacity-80"}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{TYPE_LABEL[nudge.type]}</Badge>
            <span className="text-xs text-muted-foreground">{nudge.sentDate}</span>
            {nudge.status !== "sent" && (
              <Badge variant="secondary" className="capitalize">{nudge.status.replace("_", " ")}</Badge>
            )}
          </div>
          <ExplainabilityTooltip reason={explanation} />
        </div>

        <p className="text-sm leading-relaxed">{nudge.content}</p>

        {interactive && isActive && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => startTransition(async () => { await actOnNudgeAction(nudge.id); })}
            >
              Act on this
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => startTransition(async () => { await dismissNudgeAction(nudge.id); })}
            >
              Dismiss
            </Button>
          </div>
        )}

        {interactive && nudge.status !== "sent" && !nudge.feedback && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={isPending} onClick={() => startTransition(async () => { await submitNudgeFeedbackAction(nudge.id, "helpful"); })}>
              👍 Helpful
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={isPending} onClick={() => startTransition(async () => { await submitNudgeFeedbackAction(nudge.id, "not_helpful"); })}>
              👎 Not helpful
            </Button>
          </div>
        )}

        {nudge.feedback && (
          <p className="text-xs text-muted-foreground">
            Feedback logged: <span className="font-medium">{nudge.feedback === "helpful" ? "Helpful" : "Not helpful"}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
