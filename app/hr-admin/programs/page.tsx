import { HeartPulse, BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { getProgramCatalogWithUtilization } from "@/lib/subsystem-a";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgramCatalog } from "@/components/subsystem-a/program-catalog";
import { ProgramUtilizationChart } from "@/components/subsystem-a/program-utilization-chart";

export default async function ProgramsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "hr_admin" && user.role !== "cfo" && user.role !== "dept_manager")) {
    redirect("/login");
  }

  const programs = getProgramCatalogWithUtilization(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
          <HeartPulse className="size-6 text-primary" />
          Wellness Programs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Program catalog, capacity tracking, and utilization insights.
        </p>
      </div>

      <ProgramCatalog programs={programs} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-primary" />
            Enrollment vs. Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgramUtilizationChart programs={programs} />
        </CardContent>
      </Card>
    </div>
  );
}
