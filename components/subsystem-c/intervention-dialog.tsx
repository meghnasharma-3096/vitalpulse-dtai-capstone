"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Wallet,
  Clock,
  User,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/shared/risk-badge";
import type { DepartmentBurnoutSummary, Intervention } from "@/lib/subsystem-c";
import {
  approveInterventionAction,
  rejectInterventionAction,
  escalateInterventionAction,
  draftInterventionAction,
} from "@/app/actions/interventions";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function InterventionDialog({
  department,
  intervention,
  open,
  onOpenChange,
}: {
  department: DepartmentBurnoutSummary;
  intervention: Intervention | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showEscalateInput, setShowEscalateInput] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");

  const active = intervention;

  async function handleApprove() {
    if (!active) return;
    setLoading(true);
    try {
      await approveInterventionAction(active.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!active) return;
    setLoading(true);
    try {
      await rejectInterventionAction(active.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleEscalate() {
    if (!active) return;
    setLoading(true);
    try {
      await escalateInterventionAction(
        active.id,
        escalateReason.trim() || "Escalated for leadership and executive resourcing review."
      );
      setShowEscalateInput(false);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateDraft() {
    setLoading(true);
    try {
      await draftInterventionAction(department.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-4">
            <DialogTitle className="text-xl font-semibold">{department.name}</DialogTitle>
            {department.latestSnapshot && (
              <RiskBadge
                level={department.riskLevel}
                score={department.latestSnapshot.riskScore}
                label={department.trend}
              />
            )}
          </div>
          <DialogDescription>
            Burnout intervention brief & human sign-off workflow · Headcount {department.headcount}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm py-2">
          {/* Estimated metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="size-3.5 text-primary" />
                Estimated Budget
              </p>
              <p className="text-base font-semibold text-foreground">
                {inr.format(department.estimatedBudgetINR)}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                Recommended Timeline
              </p>
              <p className="text-base font-semibold text-foreground truncate">
                {department.recommendedTimeline}
              </p>
            </div>
          </div>

          {/* AI Drafted Brief Card */}
          {active ? (
            <div className="rounded-xl border p-4 space-y-3 bg-card shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-3.5" />
                  AI-Drafted Intervention Brief
                </span>
                <Badge
                  variant={
                    active.status === "approved"
                      ? "default"
                      : active.status === "escalated"
                      ? "destructive"
                      : active.status === "rejected"
                      ? "secondary"
                      : "outline"
                  }
                  className="capitalize text-[11px]"
                >
                  {active.status}
                </Badge>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed bg-muted/40 p-3 rounded-lg border">
                {active.aiDraftedBrief}
              </p>

              {active.actedBy && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <User className="size-3" />
                    Sign-off by: <span className="text-foreground font-medium">{active.actedBy}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(active.timestamp).toLocaleString()}
                  </span>
                </div>
              )}

              {active.escalationReason && (
                <div className="text-xs rounded-md bg-risk-high/10 text-risk-high p-2.5 border border-risk-high/30">
                  <span className="font-medium">Escalation Reason:</span> {active.escalationReason}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center space-y-2">
              <Sparkles className="size-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">No active intervention brief for this team</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Generate an AI-drafted intervention brief based on current burnout indicators and trend patterns.
              </p>
            </div>
          )}

          {/* Governance Notice */}
          <div className="rounded-lg bg-primary-tint/60 border border-primary/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">Human Sign-Off Requirement:</strong> AI drafts recommendations, but a human decision maker retains full authority to approve, reject, or escalate interventions.
            </p>
          </div>

          {/* Escalation input toggle */}
          {showEscalateInput && active && (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-foreground">
                Escalation Context / Reason for Executive Leadership:
              </label>
              <Input
                placeholder="e.g. Budget increase required or severe multi-week burnout trend..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                className="text-xs"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          {active ? (
            active.status === "pending" ? (
              <div className="flex items-center justify-between w-full gap-2 flex-wrap sm:flex-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={loading}
                  className="rounded-full text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="size-3.5 mr-1" />
                  Reject Brief
                </Button>

                <div className="flex items-center gap-2">
                  {!showEscalateInput ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEscalateInput(true)}
                      disabled={loading}
                      className="rounded-full text-accent-foreground border-accent"
                    >
                      <AlertTriangle className="size-3.5 mr-1 text-accent" />
                      Escalate…
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleEscalate}
                      disabled={loading}
                      className="rounded-full"
                    >
                      Confirm Escalate
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={loading}
                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <CheckCircle2 className="size-3.5 mr-1" />
                    Approve Intervention
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-xs text-muted-foreground">
                  Status: <strong className="capitalize text-foreground">{active.status}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDraft}
                  disabled={loading}
                  className="rounded-full"
                >
                  <Sparkles className="size-3.5 mr-1 text-primary" />
                  Draft New Cycle Brief
                </Button>
              </div>
            )
          ) : (
            <Button
              size="sm"
              onClick={handleGenerateDraft}
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="size-3.5 mr-1" />
              Generate AI Intervention Brief
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
