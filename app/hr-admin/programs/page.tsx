import { HeartPulse } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getWellnessPrograms } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const CATEGORY_LABEL: Record<string, string> = {
  fitness: "Fitness",
  mental_health: "Mental health",
  nutrition: "Nutrition",
  financial_wellness: "Financial wellness",
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function ProgramsPage() {
  const user = await getCurrentUser();
  const programs = getWellnessPrograms(user);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
            <HeartPulse className="size-6 text-primary" />
            Wellness Programs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Program catalog and capacity — matching logic is owned by Subsystem A, built separately.</p>
        </div>
        <Badge variant="outline">Subsystem A — not yet built in this workspace</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {programs.map(p => {
          const pct = Math.round((p.enrolledCount / p.capacity) * 100);
          return (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{CATEGORY_LABEL[p.category]}</Badge>
                  <span>{p.provider}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.enrolledCount} / {p.capacity} enrolled</span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} />
                <div className="text-sm font-medium pt-1">{inr.format(p.costPerEmployeeINR)} / employee</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
