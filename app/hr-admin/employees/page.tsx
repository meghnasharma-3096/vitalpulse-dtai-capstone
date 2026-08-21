import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getEmployees, getDepartments } from "@/lib/data";
import { EmployeeDirectoryTable } from "@/components/shared/employee-directory-table";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "hr_admin" && user.role !== "dept_manager")) {
    redirect("/login");
  }

  const employees = getEmployees(user);
  const departments = getDepartments(user).map(d => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-3xl font-semibold text-foreground">
          <Users className="size-6 text-primary" />
          Employees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Unified directory — combines wellness matching and disengagement signals.</p>
      </div>
      <EmployeeDirectoryTable employees={employees} departments={departments} />
    </div>
  );
}
