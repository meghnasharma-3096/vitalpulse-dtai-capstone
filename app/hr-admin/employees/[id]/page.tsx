import { notFound } from "next/navigation";
import { UserX, Radar, HeartPulse, UserCog, Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getEmployeeById, getDepartmentById, getNudgesForEmployee, getLatestBurnoutSnapshotForDepartment, isDepartmentFlaggedHighRisk } from "@/lib/data";
import { explainNudge } from "@/lib/subsystem-b";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, riskLevelFromScore } from "@/components/shared/risk-badge";
import { NudgeCard } from "@/components/subsystem-b/nudge-card";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const employee = getEmployeeById(id, user);
  if (!employee) notFound();

  const department = getDepartmentById(employee.departmentId, user);
  const departmentFlagged = isDepartmentFlaggedHighRisk(employee.departmentId);
  const latestSnapshot = getLatestBurnoutSnapshotForDepartment(employee.departmentId, user);
  const nudges = employee.optedOut ? [] : getNudgesForEmployee(employee.id, user);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{employee.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {employee.roleTitle} · {department?.name ?? employee.departmentId} · Hired {employee.hireDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {employee.optedOut ? (
            <Badge variant="secondary">Opted out of tracking</Badge>
          ) : (
            <RiskBadge level={riskLevelFromScore(employee.disengagementRiskScore)} score={employee.disengagementRiskScore} />
          )}
          <Badge variant="outline" className="capitalize">{employee.personaTag.replace("_", " ")}</Badge>
        </div>
      </div>

      {employee.optedOut && (
        <Card className="bg-muted/40">
          <CardContent className="pt-4 text-sm text-muted-foreground flex items-start gap-2.5">
            <UserX className="size-4 mt-0.5 shrink-0" />
            <p>
              This employee has opted out of wellness tracking and matching. No risk score, nudges, or program
              recommendations are shown for them anywhere in VitalPulse.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radar className="size-4 text-primary" />
              Department burnout flag
            </CardTitle>
            <CardDescription>Subsystem C — Burnout Radar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {latestSnapshot ? (
              <>
                <RiskBadge level={departmentFlagged ? "high" : riskLevelFromScore(latestSnapshot.riskScore)} score={latestSnapshot.riskScore} />
                <p className="text-muted-foreground text-xs">Trend: {latestSnapshot.trend} · Week of {latestSnapshot.weekOf}</p>
                {departmentFlagged && (
                  <p className="text-xs text-[#B5651D]">
                    New-program nudges are suppressed for this employee while their department is flagged.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No snapshot available (department may be below the privacy floor).</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="size-4 text-primary" />
              Program matches
            </CardTitle>
            <CardDescription>Subsystem A — Wellness Matching</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Owned by a separate subsystem build — not wired up yet in this workspace.
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-4 text-primary" />
              Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {employee.managerId === "EMP-0000" ? "Reports to company leadership" : employee.managerId}
          </CardContent>
        </Card>
      </div>

      {!employee.optedOut && (
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Bell className="size-4 text-primary" />
            Disengagement & nudge history — Subsystem B
          </h2>
          {nudges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No nudges sent yet.</p>
          ) : (
            <div className="space-y-3">
              {nudges.map(n => (
                <NudgeCard key={n.id} nudge={n} explanation={explainNudge(n, employee, undefined, departmentFlagged)} interactive={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
