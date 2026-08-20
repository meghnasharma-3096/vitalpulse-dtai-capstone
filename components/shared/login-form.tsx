"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, ShieldCheck, Users2, UserCircle, ChevronDown, KeyRound, TriangleAlert, Mail, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface DemoAccount {
  id: string;
  email: string;
  name: string;
  role: "cfo" | "hr_admin" | "dept_manager" | "employee";
  departmentId: string | null;
  departmentName: string | null;
}

const PERSONA_LABEL: Record<string, string> = {
  "CRED-EMP-NEWPARENT": "New parent",
  "CRED-EMP-HIGHPERF": "High performer, disengaging",
  "CRED-EMP-ATRISK": "At-risk / flagged",
  "CRED-EMP-STANDARD": "Standard / baseline",
  "CRED-EMP-OPTEDOUT": "Opted out",
};

const DEMO_PASSWORD = "Demo@2026";

export function LoginForm({ accounts }: { accounts: DemoAccount[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function loginWith(payload: { credentialId: string } | { email: string; password: string }) {
    setError(null);
    setLoadingId("credentialId" in payload ? payload.credentialId : "manual");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Login failed.");
        setLoadingId(null);
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoadingId(null);
    }
  }

  const cfo = accounts.find(a => a.role === "cfo");
  const hrAdmin = accounts.find(a => a.role === "hr_admin");
  const deptManagers = accounts.filter(a => a.role === "dept_manager");
  const employees = accounts.filter(a => a.role === "employee");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-primary" />
            Sign in with email
          </CardTitle>
          <CardDescription>Use any demo account&apos;s email and password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end"
            onSubmit={e => {
              e.preventDefault();
              loginWith({ email, password });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hradmin@meridiananalytics.com" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={DEMO_PASSWORD} required />
            </div>
            <Button type="submit" disabled={loadingId === "manual"}>
              {loadingId === "manual" ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCredentialsOpen(o => !o)}
          aria-expanded={credentialsOpen}
        >
          <KeyRound className="size-3.5" />
          {credentialsOpen ? "Hide demo credentials" : "Need demo credentials?"}
          <ChevronDown className={`size-3.5 transition-transform duration-200 ${credentialsOpen ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {credentialsOpen && (
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Demo credentials <Badge variant="outline">For demo/grading purposes</Badge>
            </CardTitle>
            <CardDescription>Every seeded account shares the password below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono bg-background rounded-xl p-3 overflow-x-auto shadow-[var(--shadow-card)]">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="pr-4 py-1">Email</th>
                    <th className="pr-4 py-1">Role</th>
                    <th className="py-1">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id} className="border-t">
                      <td className="pr-4 py-1">{a.email}</td>
                      <td className="pr-4 py-1">{a.role}{a.departmentName ? ` (${a.departmentName})` : ""}</td>
                      <td className="py-1">{DEMO_PASSWORD}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl bg-accent px-5 py-4 flex items-start gap-3">
        <TriangleAlert className="size-5 text-accent-foreground mt-0.5 shrink-0" />
        <p className="text-sm font-semibold text-accent-foreground">
          Recommended: sign in using a role below. Manual credentials are for reference only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <RoleCard icon={LineChart} title="CFO / Exec" description="Company-wide rollup, no operational detail">
          {cfo && (
            <QuickLoginButton account={cfo} label={`Log in as CFO — ${cfo.name}`} loading={loadingId === cfo.id} onClick={() => loginWith({ credentialId: cfo.id })} />
          )}
        </RoleCard>

        <RoleCard icon={ShieldCheck} title="HR Admin" description="Full company-wide access across all three subsystems">
          {hrAdmin && (
            <QuickLoginButton account={hrAdmin} label={`Log in as HR Admin — ${hrAdmin.name}`} loading={loadingId === hrAdmin.id} onClick={() => loginWith({ credentialId: hrAdmin.id })} />
          )}
        </RoleCard>

        <CollapsibleRoleGroup
          icon={Users2}
          title="Department Manager"
          summary={`${deptManagers.length} managers`}
          open={deptManagerOpen}
          onToggle={() => setDeptManagerOpen(o => !o)}
        >
          <p className="text-sm text-muted-foreground mb-3">Same views as HR Admin, scoped to one department</p>
          <div className="flex flex-col gap-2">
            {deptManagers.map(a => (
              <QuickLoginButton
                key={a.id}
                account={a}
                label={`${a.name} — ${a.departmentName}`}
                loading={loadingId === a.id}
                onClick={() => loginWith({ credentialId: a.id })}
              />
            ))}
          </div>
        </CollapsibleRoleGroup>

        <CollapsibleRoleGroup
          icon={UserCircle}
          title="Employee"
          summary={`${employees.length} personas`}
          open={employeeOpen}
          onToggle={() => setEmployeeOpen(o => !o)}
        >
          <p className="text-sm text-muted-foreground mb-3">Sees only their own matches, nudges, and profile</p>
          <div className="flex flex-col gap-2">
            {employees.map(a => (
              <QuickLoginButton
                key={a.id}
                account={a}
                label={`${a.name}`}
                sublabel={PERSONA_LABEL[a.id]}
                loading={loadingId === a.id}
                onClick={() => loginWith({ credentialId: a.id })}
              />
            ))}
          </div>
        </CollapsibleRoleGroup>
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="hover:shadow-[var(--shadow-card-hover)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint text-primary">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CollapsibleRoleGroup({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="hover:shadow-[var(--shadow-card-hover)]">
      <button type="button" className="w-full text-left" onClick={onToggle} aria-expanded={open}>
        <CardHeader className={open ? "pb-3" : ""}>
          <CardTitle className="flex items-center justify-between gap-2.5 text-base">
            <span className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint text-primary">
                <Icon className="size-4" />
              </span>
              {title} — {summary}
            </span>
            <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </CardTitle>
        </CardHeader>
      </button>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function QuickLoginButton({
  label,
  sublabel,
  loading,
  onClick,
}: {
  account: DemoAccount;
  label: string;
  sublabel?: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" className="w-full justify-between h-auto py-2" onClick={onClick} disabled={loading}>
      <span className="text-left">
        <span className="block text-sm font-medium">{label}</span>
        {sublabel && <span className="block text-xs text-muted-foreground">{sublabel}</span>}
      </span>
      {loading && <span className="text-xs text-muted-foreground">Signing in…</span>}
    </Button>
  );
}
