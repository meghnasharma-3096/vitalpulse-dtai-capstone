import { Activity, Bell, HeartPulse } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser, getEmployeeRecordForUser } from "@/lib/auth-server";
import { getNudgesForEmployee, isDepartmentFlaggedHighRisk } from "@/lib/data";
import { explainNudge } from "@/lib/subsystem-b";
import { getRecommendationsForEmployee } from "@/lib/subsystem-a";
import { NudgeCard } from "@/components/subsystem-b/nudge-card";
import { RecommendedPrograms } from "@/components/subsystem-a/recommended-programs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RiskBadge, riskLevelFromScore } from "@/components/shared/risk-badge";

export default async function EmployeeDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "employee") {
    redirect("/login");
  }

  const employee = getEmployeeRecordForUser(user);

  if (!employee) {
    return <p className="text-sm text-muted-foreground">No employee profile found for this account.</p>;
  }

  if (employee.optedOut) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re opted out</CardTitle>
            <CardDescription>
              You&apos;ve opted out of wellness tracking and matching. VitalPulse shows no nudges, no risk score, and no
              program recommendations for your account, anywhere in the platform.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const nudges = getNudgesForEmployee(employee.id, user);
  const departmentFlagged = isDepartmentFlaggedHighRisk(employee.departmentId);
  const riskLevel = riskLevelFromScore(employee.disengagementRiskScore);
  const recommendationResult = await getRecommendationsForEmployee(employee, user);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Welcome back, {employee.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">{employee.roleTitle}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" />
            Your engagement snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 flex-wrap">
          <RiskBadge level={riskLevel} score={employee.disengagementRiskScore} label={`Disengagement: ${riskLevel}`} />
          <span className="text-xs text-muted-foreground">Last check-in: {employee.lastCheckIn}</span>
          {departmentFlagged && (
            <span className="text-xs text-[#B5651D] bg-[#F4A261]/15 border border-[#F4A261]/40 rounded-full px-2.5 py-0.5">
              Your department is in a high-focus period — check-ins are lighter right now
            </span>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
          <HeartPulse className="size-4 text-primary" />
          Recommended programs
        </h2>
        <RecommendedPrograms result={recommendationResult} />
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
          <Bell className="size-4 text-primary" />
          Your nudges
        </h2>
        {nudges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nudges yet — check back soon.</p>
        ) : (
          <div className="space-y-3">
            {nudges.map(n => (
              <NudgeCard key={n.id} nudge={n} explanation={explainNudge(n, employee, undefined, departmentFlagged)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
