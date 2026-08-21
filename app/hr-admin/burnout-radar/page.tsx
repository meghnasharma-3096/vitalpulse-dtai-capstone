import { Radar, ShieldAlert, ScrollText, AlertTriangle, TrendingDown, Clock, LineChart as LineChartIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getDepartmentBurnoutSummaries,
  getDepartmentTrendSeries,
  getSubsystemInterventions,
  PRIVACY_FLOOR_HEADCOUNT,
} from "@/lib/subsystem-c";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BurnoutDepartmentCards } from "@/components/subsystem-c/burnout-department-cards";
import { DepartmentTrendChart } from "@/components/subsystem-c/department-trend-chart";
import { InterventionAuditTable } from "@/components/subsystem-c/intervention-audit-table";

export default async function BurnoutRadarPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "hr_admin" && user.role !== "cfo")) {
    redirect("/login");
  }
  const readOnly = user.role === "cfo";

  const departments = getDepartmentBurnoutSummaries(user);
  const trendSeries = getDepartmentTrendSeries(user);
  const interventions = getSubsystemInterventions(user);

  const suppressedDepartments = departments.filter((d) => d.isSuppressed);
  const eligibleDepartments = departments.filter((d) => !d.isSuppressed);

  const highRiskCount = eligibleDepartments.filter((d) => d.riskLevel === "high" || d.trend === "worsening").length;
  const improvingCount = eligibleDepartments.filter((d) => d.trend === "improving").length;
  const pendingInterventionsCount = interventions.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
          <Radar className="size-6 text-primary" />
          Burnout Radar & Governance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Department-level risk with a hard privacy floor and a mandatory human sign-off on every intervention.</p>
      </div>

      {/* KPI summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monitored Teams
            </p>
            <p className="text-3xl font-semibold text-foreground mt-1">{eligibleDepartments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{suppressedDepartments.length} protected by privacy floor</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="size-3 text-risk-high" />
              Elevated / Worsening
            </p>
            <p className="text-3xl font-semibold text-risk-high mt-1">{highRiskCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Customer Success & Sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingDown className="size-3 text-risk-low" />
              Improving Trend
            </p>
            <p className="text-3xl font-semibold text-risk-low mt-1">{improvingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Marketing (score down to 0.35)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="size-3 text-accent" />
              Pending Sign-Off
            </p>
            <p className="text-3xl font-semibold text-accent mt-1">{pendingInterventionsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting human sign-off</p>
          </CardContent>
        </Card>
      </div>

      {/* Privacy Floor Banner */}
      {suppressedDepartments.length > 0 && (
        <Card className="bg-primary-tint/50 border-primary/20">
          <CardContent className="pt-4 text-sm text-muted-foreground flex items-start gap-3">
            <ShieldAlert className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">
                Strict Sub-{PRIVACY_FLOOR_HEADCOUNT}-Headcount Privacy Protection Active
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The following departments are below the privacy floor ({PRIVACY_FLOOR_HEADCOUNT} people):{" "}
                <strong className="text-foreground">
                  {suppressedDepartments.map((d) => `${d.name} (${d.headcount})`).join(", ")}
                </strong>
                . To prevent de-anonymization, no burnout snapshots are generated, stored, or reported.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Cards Grid */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Radar className="size-4 text-primary" />
          Department Burnout Overview
        </h2>
        <BurnoutDepartmentCards departments={departments} readOnly={readOnly} />
      </div>

      {/* Recharts Historical Trend Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="size-4 text-primary" />
            Burnout Trajectory Over Time (Weekly Historical Snapshots)
          </CardTitle>
          <CardDescription>
            Multi-week tracking demonstrating trend trajectories: CS & Sales (worsening), Marketing (improving), and Engineering/Ops (stable).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentTrendChart series={trendSeries} />
        </CardContent>
      </Card>

      {/* Intervention Audit Trail */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ScrollText className="size-4 text-primary" />
            Intervention Governance & Audit Trail
          </h2>
          <Badge variant="outline" className="text-xs">
            Mandatory Human Sign-Off Logged
          </Badge>
        </div>
        <InterventionAuditTable interventions={interventions} departments={departments} readOnly={readOnly} />
      </div>
    </div>
  );
}
