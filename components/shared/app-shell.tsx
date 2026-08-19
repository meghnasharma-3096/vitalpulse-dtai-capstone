"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/components/shared/nav-config";
import { TimeSimulationControl } from "@/components/shared/time-simulation-control";
import type { CurrentUser } from "@/lib/auth-server";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = NAV_BY_ROLE[user.role];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-[var(--sidebar-border)]">
          <div className="h-8 w-8 rounded-lg bg-[#2D6A4F] flex items-center justify-center text-white text-sm font-semibold">VP</div>
          <span className="font-semibold text-[#1B4332] dark:text-[#B7EFC5]">VitalPulse</span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--sidebar-primary)] text-white"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-[var(--sidebar-border)] text-xs text-muted-foreground">
          Meridian Analytics Pvt. Ltd.
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="md:hidden h-7 w-7 rounded-md bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-semibold">VP</span>
            {(user.role === "hr_admin" || user.role === "cfo") && <TimeSimulationControl />}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user.name}</div>
              <Badge variant="secondary" className="text-[10px]">{ROLE_LABEL[user.role]}</Badge>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#2D6A4F] text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={logout}>
              Log out
            </Button>
          </div>
        </header>

        <nav className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                pathname.startsWith(item.href) ? "bg-[#2D6A4F] text-white" : "bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
