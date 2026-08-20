import Link from "next/link";
import { Compass, Building2, TriangleAlert, UserX, ShieldAlert, HeartPulse, Radar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
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
        <h1 className="text-3xl font-semibold text-foreground">HR Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Full company-wide access across all three subsystems.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Building2} label="Departments" value={departments.length} href="/hr-admin/employees" />
        <KpiCard icon={TriangleAlert} label="At-risk employees" value={atRisk.length} href="/hr-admin/roi" accent />
        <KpiCard icon={UserX} label="Opted out" value={distribution.optedOut} href="/hr-admin/employees" />
        <KpiCard icon={ShieldAlert} label="Pending/escalated interventions" value={pendingInterventions} href="/hr-admin/burnout-radar" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DisengagementDistributionChart distribution={distribution} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="size-4 text-primary" />
              Jump to a subsystem
            </CardTitle>
            <CardDescription>Each area is scoped to what HR Admin can see company-wide</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <QuickLink icon={HeartPulse} href="/hr-admin/roi" label="Disengagement & ROI — Subsystem B" />
            <QuickLink icon={HeartPulse} href="/hr-admin/programs" label="Wellness Matching — Subsystem A" />
            <QuickLink icon={Radar} href="/hr-admin/burnout-radar" label="Burnout Radar & Governance — Subsystem C" />
            <QuickLink icon={Users} href="/hr-admin/employees" label="Unified employee directory" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={cn("hover:shadow-[var(--shadow-card-hover)]", accent && "bg-primary-tint")}>
        <CardContent className="pt-5">
          <Icon className={cn("size-4 mb-2", accent ? "text-primary" : "text-muted-foreground")} />
          <div className={cn("text-3xl font-semibold tabular-nums", accent && "text-primary")}>{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 hover:bg-primary-tint hover:text-primary hover:shadow-[var(--shadow-glow)] transition-all duration-200">
      <Icon className="size-3.5 shrink-0" />
      {label}
    </Link>
  );
}
