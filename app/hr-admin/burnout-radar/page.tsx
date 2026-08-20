import { Radar, ShieldAlert, ScrollText } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getBurnoutSnapshots, getInterventions, getAllDepartmentsUnscoped, PRIVACY_FLOOR_HEADCOUNT } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, riskLevelFromScore } from "@/components/shared/risk-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function BurnoutRadarPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "hr_admin") {
    redirect("/login");
  }

  const snapshots = getBurnoutSnapshots(user);
  const interventions = getInterventions(user);
  const departments = getAllDepartmentsUnscoped();

  const latestByDept = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    const existing = latestByDept.get(s.departmentId);
    if (!existing || existing.weekOf < s.weekOf) latestByDept.set(s.departmentId, s);
  }

  const suppressedDepartments = departments.filter(d => d.headcount < PRIVACY_FLOOR_HEADCOUNT);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
            <Radar className="size-6 text-primary" />
            Burnout Radar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Department-level risk with a hard privacy floor — the full intervention workflow is built separately.</p>
        </div>
        <Badge variant="outline">Not yet built in this workspace</Badge>
      </div>

      {suppressedDepartments.length > 0 && (
        <Card className="bg-primary-tint">
          <CardContent className="pt-4 text-sm text-muted-foreground flex items-start gap-2.5">
            <ShieldAlert className="size-4 text-primary mt-0.5 shrink-0" />
            <p>
              <span className="font-medium text-foreground">Privacy floor enforced:</span>{" "}
              {suppressedDepartments.map(d => `${d.name} (${d.headcount})`).join(", ")} — no snapshot is generated or
              displayed for any department under {PRIVACY_FLOOR_HEADCOUNT} people.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from(latestByDept.values()).map(s => {
          const dept = departments.find(d => d.id === s.departmentId);
          return (
            <Card key={s.departmentId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{dept?.name ?? s.departmentId}</CardTitle>
                <CardDescription>Week of {s.weekOf} · headcount {s.headcount}</CardDescription>
              </CardHeader>
              <CardContent>
                <RiskBadge level={riskLevelFromScore(s.riskScore)} score={s.riskScore} label={s.trend} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
          <ScrollText className="size-4 text-primary" />
          Intervention audit trail
        </h2>
        <div className="rounded-xl overflow-x-auto bg-card shadow-[var(--shadow-card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acted by</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Brief</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interventions.map(i => {
                const dept = departments.find(d => d.id === i.departmentId);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">{dept?.name ?? i.departmentId}</TableCell>
                    <TableCell>
                      <Badge variant={i.status === "escalated" ? "destructive" : "secondary"} className="capitalize">{i.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.actedBy ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(i.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="text-sm max-w-md">{i.aiDraftedBrief}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
