import { listDemoAccounts } from "@/lib/auth-server";
import { getAllDepartmentsUnscoped } from "@/lib/data";
import { LoginForm } from "@/components/shared/login-form";

export default function LoginPage() {
  const accounts = listDemoAccounts();
  const departments = getAllDepartmentsUnscoped();
  const deptName = (id: string | null) => departments.find(d => d.id === id)?.name ?? null;

  const enriched = accounts.map(a => ({ ...a, departmentName: deptName(a.departmentId) }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0] p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-[#2D6A4F] flex items-center justify-center text-white font-semibold">VP</div>
            <span className="text-xl font-semibold text-[#1B4332]">VitalPulse</span>
          </div>
          <p className="text-sm text-muted-foreground">Corporate Wellness Intelligence Platform — Meridian Analytics Pvt. Ltd.</p>
        </div>
        <LoginForm accounts={enriched} />
      </div>
    </div>
  );
}
