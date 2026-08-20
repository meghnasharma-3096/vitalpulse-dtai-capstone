import Link from "next/link";
import { redirect } from "next/navigation";
import { Users2, Wallet, ShieldAlert, TriangleAlert, Info, HeartPulse, LayoutDashboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getDepartments, getBurnoutSnapshots } from "@/lib/data";
import { getAtRiskEmployees, getDisengagementDistribution } from "@/lib/subsystem-b";
import { getProgramCatalogForDepartment } from "@/lib/subsystem-a";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DisengagementDistributionChart } from "@/components/subsystem-b/disengagement-distribution-chart";
import { AtRiskEmployeeTable } from "@/components/subsystem-b/at-risk-employee-table";
import { RiskBadge, riskLevelFromScore } from "@/components/shared/risk-badge";
import { ProgramCatalog } from "@/components/subsystem-a/program-catalog";
import { ProgramUtilizationChart } from "@/components/subsystem-a/program-utilization-chart";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function DeptManagerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "dept_manager") {
    redirect("/login");
  }

  const departments = getDepartments(user); // already scoped to the manager's own department
  const dept = departments[0];
  const atRisk = getAtRiskEmployees(user);
  const distribution = getDisengagementDistribution(user);
  const snapshots = getBurnoutSnapshots(user).sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));
  const latestSnapshot = snapshots[0];
  const programs = getProgramCatalogForDepartment(user);

  if (!dept) {
    return <p className="text-sm text-muted-foreground">No department scope found for this account.</p>;
  }

  const budgetRemaining = dept.budgetAllocatedINR - dept.budgetUsedINR;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
          <Users2 className="size-6 text-primary" />
          {dept.name} — Department Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Scoped to your department only, enforced server-side.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="wellness">
            <HeartPulse className="size-3.5" />
            Wellness Programs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <Users2 className="size-4 text-muted-foreground mb-2" />
                <div className="text-2xl font-semibold tabular-nums">{dept.headcount}</div>
                <div className="text-xs text-muted-foreground mt-1">Headcount</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <Wallet className="size-4 text-muted-foreground mb-2" />
                <div className="text-2xl font-semibold tabular-nums">{inr.format(budgetRemaining)}</div>
                <div className="text-xs text-muted-foreground mt-1">Wellness budget remaining of {inr.format(dept.budgetAllocatedINR)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <ShieldAlert className="size-3.5" />
                    Burnout radar
                  </div>
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
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <TriangleAlert className="size-4 text-primary" />
              At-risk employees in your department
            </h2>
            <AtRiskEmployeeTable employees={atRisk} departments={[{ id: dept.id, name: dept.name }]} />
          </div>
        </TabsContent>

        <TabsContent value="wellness" className="space-y-6 pt-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-1">
              <HeartPulse className="size-4 text-primary" />
              Wellness programs
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Same catalog HR Admin sees. Capacity and enrollment are company-wide (there&apos;s no per-department
              enrollment data to filter), but &quot;recommended to&quot; and the underutilization signal below are scoped
              to {dept.name}&apos;s own employees only.
            </p>
            <div className="space-y-4">
              <ProgramCatalog programs={programs} />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Enrollment vs. Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgramUtilizationChart programs={programs} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-primary" />
            More detail
          </CardTitle>
          <CardDescription>The same underlying data, scoped views HR Admin also uses</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 text-sm">
          <Link href="/hr-admin/employees" className="rounded-full bg-muted px-3.5 py-2 hover:bg-primary-tint hover:text-primary hover:shadow-[var(--shadow-glow)] transition-all duration-200">Full employee directory</Link>
          <Link href="/hr-admin/roi" className="rounded-full bg-muted px-3.5 py-2 hover:bg-primary-tint hover:text-primary hover:shadow-[var(--shadow-glow)] transition-all duration-200">ROI calculator</Link>
        </CardContent>
      </Card>
    </div>
  );
}
