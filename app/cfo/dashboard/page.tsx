import { LayoutDashboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getAiVsWithoutComparison, getDisengagementDistribution, getNudgeEngagementTrend } from "@/lib/subsystem-b";
import { AiVsWithoutChart } from "@/components/subsystem-b/ai-vs-without-chart";
import { DisengagementDistributionChart } from "@/components/subsystem-b/disengagement-distribution-chart";
import { NudgeEngagementTrendChart } from "@/components/subsystem-b/nudge-engagement-trend-chart";

export default async function CfoDashboardPage() {
  const user = await getCurrentUser();
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
    </div>
  );
}
