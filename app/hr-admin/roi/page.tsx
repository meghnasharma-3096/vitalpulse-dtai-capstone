import { getCurrentUser } from "@/lib/auth-server";
import { getDepartments } from "@/lib/data";
import { getAtRiskEmployees, getRoiContext } from "@/lib/subsystem-b";
import { RoiCalculator } from "@/components/subsystem-b/roi-calculator";
import { AtRiskEmployeeTable } from "@/components/subsystem-b/at-risk-employee-table";

export default async function RoiPage() {
  const user = await getCurrentUser();
  const context = getRoiContext(user);
  const atRisk = getAtRiskEmployees(user);
  const departments = getDepartments(user).map(d => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B4332] dark:text-[#B7EFC5]">ROI Calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust the assumptions below to see the projected business case for VitalPulse&apos;s disengagement program update live.
        </p>
      </div>

      <RoiCalculator context={context} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Company-wide at-risk employees</h2>
        <AtRiskEmployeeTable employees={atRisk} departments={departments} />
      </div>
    </div>
  );
}
