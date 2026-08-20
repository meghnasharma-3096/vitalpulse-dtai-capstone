import { Users, Building2, HeartPulse, TriangleAlert } from "lucide-react";
import employees from "@/data/employees.json";
import wellnessPrograms from "@/data/wellness-programs.json";
import { listDemoAccounts } from "@/lib/auth-server";
import { getAllDepartmentsUnscoped } from "@/lib/data";
import { riskLevelFromScore } from "@/components/shared/risk-badge";
import { LoginForm } from "@/components/shared/login-form";

export default function LoginPage() {
  const accounts = listDemoAccounts();
  const departments = getAllDepartmentsUnscoped();
  const deptName = (id: string | null) => departments.find(d => d.id === id)?.name ?? null;
  const enriched = accounts.map(a => ({ ...a, departmentName: deptName(a.departmentId) }));

  const atRiskCount = employees.filter(e => !e.optedOut && riskLevelFromScore(e.disengagementRiskScore) !== "low").length;

  const stats = [
    { icon: Users, value: employees.length, label: "Employees covered" },
    { icon: Building2, value: departments.length, label: "Departments monitored" },
    { icon: HeartPulse, value: wellnessPrograms.length, label: "Wellness programs tracked" },
    { icon: TriangleAlert, value: atRiskCount, label: "At-risk employees flagged" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(360px,1fr)_minmax(0,1.4fr)]">
      {/* Left — hero */}
      <div className="hidden lg:flex flex-col justify-center gap-10 bg-primary px-14 py-16 text-white">
        <div>
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary font-semibold">VP</div>
            <span className="text-2xl font-semibold">VitalPulse</span>
          </div>
          <p className="text-xl leading-snug text-white/90 max-w-sm">
            Corporate wellness intelligence for Meridian Analytics.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl bg-white p-4 text-foreground shadow-[var(--shadow-card)]">
              <s.icon className="size-4 text-primary mb-2" />
              <div className="text-3xl font-bold tabular-nums leading-none">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/70 max-w-sm">
          Matches employees to wellness programs, predicts individual disengagement and team-level burnout risk, and
          quantifies ROI in real dollars — so HR and leadership can act early and prove the value of wellness spend.
        </p>
      </div>

      {/* Right — role selector + demo credentials */}
      <div className="flex flex-col justify-center bg-background px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-2xl mx-auto">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-semibold">VP</div>
              <span className="text-xl font-semibold text-primary">VitalPulse</span>
            </div>
            <p className="text-sm text-muted-foreground">Corporate wellness intelligence for Meridian Analytics.</p>
          </div>

          <div className="hidden lg:block mb-6">
            <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose a role to explore the platform — no password required.</p>
          </div>

          <LoginForm accounts={enriched} />
        </div>
      </div>
    </div>
  );
}
