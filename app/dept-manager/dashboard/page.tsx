import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";
import { getDepartments, getBurnoutSnapshots } from "@/lib/data";
import { getAtRiskEmployees, getDisengagementDistribution } from "@/lib/subsystem-b";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DisengagementDistributionChart } from "@/components/subsystem-b/disengagement-distribution-chart";
import { AtRiskEmployeeTable } from "@/components/subsystem-b/at-risk-employee-table";
import { RiskBadge, riskLevelFromScore } from "@/components/shared/risk-badge";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function DeptManagerDashboardPage() {
  const user = await getCurrentUser();
  const departments = getDepartments(user); // already scoped to the manager's own department
  const dept = departments[0];
  const atRisk = getAtRiskEmployees(user);
  const distribution = getDisengagementDistribution(user);
  const snapshots = getBurnoutSnapshots(user).sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));
  const latestSnapshot = snapshots[0];

  if (!dept) {
    return <p className="text-sm text-muted-foreground">No department scope found for this account.</p>;
  }

  const budgetRemaining = dept.budgetAllocatedINR - dept.budgetUsedINR;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B4332] dark:text-[#B7EFC5]">{dept.name} — Department Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Scoped to your department only, enforced server-side.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-semibold tabular-nums">{dept.headcount}</div>
            <div className="text-xs text-muted-foreground mt-1">Headcount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-semibold tabular-nums">{inr.format(budgetRemaining)}</div>
            <div className="text-xs text-muted-foreground mt-1">Wellness budget remaining of {inr.format(dept.budgetAllocatedINR)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Burnout radar (Subsystem C)</div>
              {latestSnapshot ? (
                <RiskBadge level={riskLevelFromScore(latestSnapshot.riskScore)} score={latestSnapshot.riskScore} label={`${latestSnapshot.trend}`} />
              ) : (
                <span className="text-xs text-muted-foreground">Below privacy floor — no snapshot shown</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <DisengagementDistributionChart distribution={distribution} />

      <div>
        <h2 className="text-lg font-semibold mb-3">At-risk employees in your department</h2>
        <AtRiskEmployeeTable employees={atRisk} departments={[{ id: dept.id, name: dept.name }]} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">More detail</CardTitle>
          <CardDescription>The same underlying data, scoped views HR Admin also uses</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 text-sm">
          <Link href="/hr-admin/employees" className="rounded-md border px-3 py-2 hover:bg-muted transition-colors">Full employee directory</Link>
          <Link href="/hr-admin/roi" className="rounded-md border px-3 py-2 hover:bg-muted transition-colors">ROI calculator</Link>
        </CardContent>
      </Card>
    </div>
  );
}
