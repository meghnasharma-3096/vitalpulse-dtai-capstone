import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getEmployees, getDepartments } from "@/lib/data";
import { EmployeeDirectoryTable } from "@/components/shared/employee-directory-table";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  const employees = getEmployees(user);
  const departments = getDepartments(user).map(d => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
          <Users className="size-6 text-primary" />
          Employees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Unified directory — Subsystem A (matching) and B (disengagement) both contribute here.</p>
      </div>
      <EmployeeDirectoryTable employees={employees} departments={departments} />
    </div>
  );
}
