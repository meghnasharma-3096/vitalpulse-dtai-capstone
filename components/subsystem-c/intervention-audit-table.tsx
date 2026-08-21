"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import type { Intervention, DepartmentBurnoutSummary } from "@/lib/subsystem-c";
import { InterventionDialog } from "@/components/subsystem-c/intervention-dialog";
import { checkAutoEscalationsAction } from "@/app/actions/interventions";

export function InterventionAuditTable({
  interventions,
  departments,
}: {
  interventions: Intervention[];
  departments: DepartmentBurnoutSummary[];
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [activeIntervention, setActiveIntervention] = useState<{
    intervention: Intervention;
    department: DepartmentBurnoutSummary;
  } | null>(null);
  const [checkingSLA, setCheckingSLA] = useState(false);

  const deptMap = useMemo(() => {
    const map = new Map<string, DepartmentBurnoutSummary>();
    for (const d of departments) {
      map.set(d.id, d);
    }
    return map;
  }, [departments]);

  const filtered = useMemo(() => {
    return interventions.filter((i) => {
      const matchStatus = statusFilter === "all" || i.status === statusFilter;
      const matchDept = deptFilter === "all" || i.departmentId === deptFilter;
      return matchStatus && matchDept;
    });
  }, [interventions, statusFilter, deptFilter]);

  async function handleCheckSLA() {
    setCheckingSLA(true);
    try {
      await checkAutoEscalationsAction();
    } finally {
      setCheckingSLA(false);
    }
  }

  const pendingCount = interventions.filter((i) => i.status === "pending").length;

  return (
    <>
      <div className="space-y-3">
        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments
                  .filter((d) => !d.isSuppressed)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckSLA}
              disabled={checkingSLA}
              className="text-xs h-8 rounded-full"
            >
              <RefreshCw className={`size-3 mr-1 ${checkingSLA ? "animate-spin" : ""}`} />
              Check Inaction SLA
            </Button>
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-xs border-accent text-[#B5651D]">
                <Clock className="size-3 mr-1 text-accent" />
                {pendingCount} Pending Sign-Off
              </Badge>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-x-auto bg-card shadow-[var(--shadow-card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Department</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[130px]">Acted By</TableHead>
                <TableHead className="w-[140px]">Timestamp</TableHead>
                <TableHead>AI Drafted Brief & Escalation Reason</TableHead>
                <TableHead className="text-right w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">
                    No interventions found matching filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const dept = deptMap.get(item.departmentId);
                  const isPending = item.status === "pending";

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm font-medium">
                        {dept?.name ?? item.departmentId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "approved"
                              ? "default"
                              : item.status === "escalated"
                              ? "destructive"
                              : item.status === "rejected"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize text-[11px]"
                        >
                          {item.status === "approved" && <CheckCircle2 className="size-3 mr-1" />}
                          {item.status === "rejected" && <XCircle className="size-3 mr-1" />}
                          {item.status === "escalated" && <AlertTriangle className="size-3 mr-1" />}
                          {item.status === "pending" && <Clock className="size-3 mr-1" />}
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.actedBy ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString("en-GB")}{" "}
                        <span className="opacity-70">
                          {new Date(item.timestamp).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-md">
                        <p className="line-clamp-2">{item.aiDraftedBrief}</p>
                        {item.escalationReason && (
                          <p className="text-xs text-risk-high mt-1 font-medium">
                            Escalation: {item.escalationReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={isPending ? "default" : "outline"}
                          size="sm"
                          className="text-xs h-7 rounded-full"
                          onClick={() => {
                            if (dept) {
                              setActiveIntervention({ intervention: item, department: dept });
                            }
                          }}
                        >
                          {isPending ? "Review" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {activeIntervention && (
        <InterventionDialog
          department={activeIntervention.department}
          intervention={activeIntervention.intervention}
          open={!!activeIntervention}
          onOpenChange={(open) => {
            if (!open) setActiveIntervention(null);
          }}
        />
      )}
    </>
  );
}
