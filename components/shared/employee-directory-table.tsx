"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, riskLevelFromScore } from "@/components/shared/risk-badge";
import type { Employee } from "@/lib/data";

interface DeptOption {
  id: string;
  name: string;
}

export function EmployeeDirectoryTable({ employees, departments }: { employees: Employee[]; departments: DeptOption[] }) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter(e => {
      const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.roleTitle.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
      const matchesDept = dept === "all" || e.departmentId === dept;
      return matchesQuery && matchesDept;
    });
  }, [employees, query, dept]);

  const deptName = (id: string) => departments.find(d => d.id === id)?.name ?? id;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search by name, role, or email…" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
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
        <span className="text-xs text-muted-foreground self-center">{filtered.length} of {employees.length} employees</span>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead>Disengagement risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/hr-admin/employees/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
                  <div className="text-xs text-muted-foreground">{e.roleTitle}</div>
                </TableCell>
                <TableCell className="text-sm">{deptName(e.departmentId)}</TableCell>
                <TableCell className="capitalize text-sm">{e.personaTag.replace("_", " ")}</TableCell>
                <TableCell>
                  {e.optedOut ? (
                    <Badge variant="secondary">Opted out</Badge>
                  ) : (
                    <RiskBadge level={riskLevelFromScore(e.disengagementRiskScore)} score={e.disengagementRiskScore} />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No employees match this filter.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
