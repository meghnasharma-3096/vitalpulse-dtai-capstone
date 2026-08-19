import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";
import { getDepartments, getInterventions } from "@/lib/data";
import { getAtRiskEmployees, getDisengagementDistribution } from "@/lib/subsystem-b";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DisengagementDistributionChart } from "@/components/subsystem-b/disengagement-distribution-chart";

export default async function HrAdminDashboardPage() {
  const user = await getCurrentUser();
  const departments = getDepartments(user);
  const atRisk = getAtRiskEmployees(user);
  const distribution = getDisengagementDistribution(user);
  const interventions = getInterventions(user);
  const pendingInterventions = interventions.filter(i => i.status === "pending" || i.status === "escalated").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B4332] dark:text-[#B7EFC5]">HR Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Full company-wide access across all three subsystems.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Departments" value={departments.length} href="/hr-admin/employees" />
        <KpiCard label="At-risk employees" value={atRisk.length} href="/hr-admin/roi" accent />
        <KpiCard label="Opted out" value={distribution.optedOut} href="/hr-admin/employees" />
        <KpiCard label="Pending/escalated interventions" value={pendingInterventions} href="/hr-admin/burnout-radar" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DisengagementDistributionChart distribution={distribution} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jump to a subsystem</CardTitle>
            <CardDescription>Each area is scoped to what HR Admin can see company-wide</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <QuickLink href="/hr-admin/roi" label="Disengagement & ROI — Subsystem B" />
            <QuickLink href="/hr-admin/programs" label="Wellness Matching — Subsystem A" />
            <QuickLink href="/hr-admin/burnout-radar" label="Burnout Radar & Governance — Subsystem C" />
            <QuickLink href="/hr-admin/employees" label="Unified employee directory" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, href, accent }: { label: string; value: number; href: string; accent?: boolean }) {
  return (
    <Link href={href}>
      <Card className={accent ? "border-[#2D6A4F]/40" : ""}>
        <CardContent className="pt-5">
          <div className={`text-3xl font-semibold tabular-nums ${accent ? "text-[#2D6A4F] dark:text-[#52B788]" : ""}`}>{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block rounded-md border px-3 py-2 hover:bg-muted transition-colors">
      {label}
    </Link>
  );
}
