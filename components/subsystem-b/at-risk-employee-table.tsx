"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/shared/risk-badge";
import { generateNudgeAction } from "@/app/actions/nudges";
import type { AtRiskEmployee } from "@/lib/subsystem-b";

interface DeptOption {
  id: string;
  name: string;
}

export function AtRiskEmployeeTable({ employees, departments }: { employees: AtRiskEmployee[]; departments: DeptOption[] }) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter(e => {
      const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.roleTitle.toLowerCase().includes(q);
      const matchesDept = dept === "all" || e.departmentId === dept;
      return matchesQuery && matchesDept;
    });
  }, [employees, query, dept]);

  function sendNudge(employeeId: string) {
    setSendingId(employeeId);
    setMessage(null);
    startTransition(async () => {
      const result = await generateNudgeAction(employeeId);
      setMessage({ id: employeeId, text: result.ok ? "Nudge sent." : result.error || "Could not send nudge." });
      setSendingId(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search by name or role…" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead>Conflict rule</TableHead>
              <TableHead>Latest nudge</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/hr-admin/employees/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
                  <div className="text-xs text-muted-foreground">{e.roleTitle}</div>
                </TableCell>
                <TableCell><RiskBadge level={e.riskLevel} score={e.disengagementRiskScore} /></TableCell>
                <TableCell className="capitalize text-sm">{e.personaTag.replace("_", " ")}</TableCell>
                <TableCell>
                  {e.departmentFlaggedHighRisk ? (
                    <Badge variant="outline" className="border-[#F4A261] text-[#B5651D] text-xs">New-program nudges suppressed</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                  {e.latestNudge ? `${e.latestNudge.status} · ${e.latestNudge.sentDate}` : "None yet"}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" disabled={isPending && sendingId === e.id} onClick={() => sendNudge(e.id)}>
                    {isPending && sendingId === e.id ? "Sending…" : "Send nudge"}
                  </Button>
                  {message?.id === e.id && <div className="text-xs text-muted-foreground mt-1">{message.text}</div>}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No employees match this filter.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
