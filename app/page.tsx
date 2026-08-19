import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";

const ROLE_HOME: Record<string, string> = {
  cfo: "/cfo/dashboard",
  hr_admin: "/hr-admin/dashboard",
  dept_manager: "/dept-manager/dashboard",
  employee: "/employee/dashboard",
};

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? ROLE_HOME[user.role] : "/login");
}
