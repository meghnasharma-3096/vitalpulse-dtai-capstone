"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Users,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/shared/risk-badge";
import { InterventionDialog } from "@/components/subsystem-c/intervention-dialog";
import type { DepartmentBurnoutSummary } from "@/lib/subsystem-c";

export function BurnoutDepartmentCards({
  departments,
  readOnly = false,
}: {
  departments: DepartmentBurnoutSummary[];
  readOnly?: boolean;
}) {
  const [selectedDept, setSelectedDept] = useState<DepartmentBurnoutSummary | null>(null);

  const TREND_ICON = {
    worsening: <TrendingUp className="size-3.5 text-risk-high" />,
    improving: <TrendingDown className="size-3.5 text-risk-low" />,
    stable: <Minus className="size-3.5 text-muted-foreground" />,
    suppressed: <ShieldAlert className="size-3.5 text-primary" />,
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          if (dept.isSuppressed) {
            return (
              <Card
                key={dept.id}
                className="border-dashed border-primary/40 bg-primary-tint/30 flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold">{dept.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                      Privacy Floor
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    Headcount: {dept.headcount}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="rounded-lg bg-background/80 p-2.5 text-xs text-muted-foreground border border-primary/20 flex items-start gap-2">
                    <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
                    <p>
                      Team too small to report individually or in aggregate (privacy floor is 5 employees). No burnout data is generated.
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          }

          const hasPending = dept.activeIntervention?.status === "pending";
          const hasEscalated = dept.activeIntervention?.status === "escalated";

          return (
            <Card
              key={dept.id}
              className="transition-shadow hover:shadow-[var(--shadow-card-hover)] flex flex-col justify-between"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">{dept.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Users className="size-3" />
                      {dept.headcount} employees · Week of {dept.latestSnapshot?.weekOf}
                    </CardDescription>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium capitalize">
                    {TREND_ICON[dept.trend]}
                    <span className="text-muted-foreground">{dept.trend}</span>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  {dept.latestSnapshot && (
                    <RiskBadge
                      level={dept.riskLevel}
                      score={dept.latestSnapshot.riskScore}
                    />
                  )}
                  {dept.activeIntervention ? (
                    <Badge
                      variant={
                        hasEscalated
                          ? "destructive"
                          : hasPending
                          ? "outline"
                          : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {hasPending && <Clock className="size-2.5 mr-1" />}
                      {hasEscalated && <AlertCircle className="size-2.5 mr-1" />}
                      {dept.activeIntervention.status === "approved" && (
                        <CheckCircle className="size-2.5 mr-1 text-risk-low" />
                      )}
                      {dept.activeIntervention.status} Brief
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No active brief</span>
                  )}
                </div>

                <div className="pt-1">
                  <Button
                    variant={!readOnly && hasPending ? "default" : "outline"}
                    size="sm"
                    className="w-full rounded-full text-xs font-medium"
                    onClick={() => setSelectedDept(dept)}
                  >
                    {readOnly ? (
                      <>
                        <ArrowUpRight className="size-3.5 mr-1.5" />
                        View Details
                      </>
                    ) : hasPending ? (
                      <>
                        <Sparkles className="size-3.5 mr-1.5" />
                        Review Pending Brief
                      </>
                    ) : dept.activeIntervention ? (
                      <>
                        <ArrowUpRight className="size-3.5 mr-1.5" />
                        View Intervention Details
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5 mr-1.5" />
                        Draft Intervention
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedDept && (
        <InterventionDialog
          department={selectedDept}
          intervention={selectedDept.activeIntervention}
          open={!!selectedDept}
          onOpenChange={(open) => {
            if (!open) setSelectedDept(null);
          }}
          readOnly={readOnly}
        />
      )}
    </>
  );
}
