import Link from "next/link";
import { LayoutDashboard, Compass, Radar } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getAiVsWithoutComparison, getDisengagementDistribution, getNudgeEngagementTrend } from "@/lib/subsystem-b";
import { AiVsWithoutChart } from "@/components/subsystem-b/ai-vs-without-chart";
import { DisengagementDistributionChart } from "@/components/subsystem-b/disengagement-distribution-chart";
import { NudgeEngagementTrendChart } from "@/components/subsystem-b/nudge-engagement-trend-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function CfoDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "cfo") {
    redirect("/login");
  }

  const comparison = getAiVsWithoutComparison(user);
  const distribution = getDisengagementDistribution(user);
  const trend = getNudgeEngagementTrend(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
          <LayoutDashboard className="size-6 text-primary" />
          Executive Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Company-wide rollup — Meridian Analytics Pvt. Ltd.</p>
      </div>

      <AiVsWithoutChart comparison={comparison} />

      <div className="grid gap-6 md:grid-cols-2">
        <DisengagementDistributionChart distribution={distribution} />
        <NudgeEngagementTrendChart trend={trend} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="size-4 text-primary" />
            Jump to a section
          </CardTitle>
          <CardDescription>Read-only, company-wide views scoped to what CFO can see</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link
            href="/hr-admin/burnout-radar"
            className="flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 hover:bg-primary-tint hover:text-primary hover:shadow-[var(--shadow-glow)] transition-all duration-200"
          >
            <Radar className="size-3.5 shrink-0" />
            Burnout Radar & Governance
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
