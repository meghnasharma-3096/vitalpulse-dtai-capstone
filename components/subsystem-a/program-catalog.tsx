"use client";

import { useState, useMemo } from "react";
import {
  Dumbbell,
  Brain,
  Apple,
  Wallet,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  Users,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ProgramWithUtilization } from "@/lib/subsystem-a";

const CATEGORY_LABEL: Record<string, string> = {
  fitness: "Fitness",
  mental_health: "Mental Health",
  nutrition: "Nutrition",
  financial_wellness: "Financial Wellness",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  fitness: Dumbbell,
  mental_health: Brain,
  nutrition: Apple,
  financial_wellness: Wallet,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  available: {
    bg: "bg-[color-mix(in_oklch,var(--risk-low)_16%,transparent)]",
    text: "text-[#1B4332]",
    label: "Available",
  },
  near_capacity: {
    bg: "bg-[color-mix(in_oklch,var(--risk-medium)_18%,transparent)]",
    text: "text-[#7A4A12]",
    label: "Near Capacity",
  },
  full: {
    bg: "bg-[color-mix(in_oklch,var(--risk-high)_16%,transparent)]",
    text: "text-[#7A1620]",
    label: "Full",
  },
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type SortOption = "name" | "utilization_asc" | "utilization_desc" | "cost_asc" | "cost_desc";

export function ProgramCatalog({
  programs,
}: {
  programs: ProgramWithUtilization[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [detailProgram, setDetailProgram] = useState<ProgramWithUtilization | null>(null);

  const filtered = useMemo(() => {
    let result = [...programs];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.provider.toLowerCase().includes(q) ||
          CATEGORY_LABEL[p.category]?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Sort
    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "utilization_asc":
        result.sort((a, b) => a.utilizationPct - b.utilizationPct);
        break;
      case "utilization_desc":
        result.sort((a, b) => b.utilizationPct - a.utilizationPct);
        break;
      case "cost_asc":
        result.sort((a, b) => a.costPerEmployeeINR - b.costPerEmployeeINR);
        break;
      case "cost_desc":
        result.sort((a, b) => b.costPerEmployeeINR - a.costPerEmployeeINR);
        break;
    }

    return result;
  }, [programs, search, categoryFilter, sortBy]);

  // Summary stats
  const totalPrograms = programs.length;
  const avgUtilization = Math.round(
    programs.reduce((sum, p) => sum + p.utilizationPct, 0) / programs.length
  );
  const underutilizedCount = programs.filter((p) => p.underutilized).length;
  const fullCount = programs.filter((p) => p.status === "full").length;

  return (
    <>
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Programs
            </p>
            <p className="text-3xl font-semibold text-foreground mt-1">{totalPrograms}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Avg Utilization
            </p>
            <p className="text-3xl font-semibold text-foreground mt-1">{avgUtilization}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="size-3 text-risk-medium" />
                Underutilized
              </span>
            </p>
            <p className="text-3xl font-semibold text-risk-medium mt-1">{underutilizedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              At Full Capacity
            </p>
            <p className="text-3xl font-semibold text-risk-high mt-1">{fullCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search programs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="fitness">Fitness</SelectItem>
            <SelectItem value="mental_health">Mental Health</SelectItem>
            <SelectItem value="nutrition">Nutrition</SelectItem>
            <SelectItem value="financial_wellness">Financial Wellness</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[200px]">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="size-3.5" />
              <SelectValue placeholder="Sort by" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="utilization_desc">Utilization ↓</SelectItem>
            <SelectItem value="utilization_asc">Utilization ↑</SelectItem>
            <SelectItem value="cost_desc">Cost ↓</SelectItem>
            <SelectItem value="cost_asc">Cost ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Program cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const statusStyle = STATUS_STYLES[p.status];
          const CategoryIcon = CATEGORY_ICONS[p.category] ?? Dumbbell;

          return (
            <Card
              key={p.id}
              className="transition-shadow hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
              onClick={() => setDetailProgram(p)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                  {p.underutilized && (
                    <span
                      className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[var(--risk-medium)]/40 bg-[color-mix(in_oklch,var(--risk-medium)_18%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[#7A4A12]"
                      title="Recommended often but rarely enrolled — may need review"
                    >
                      <AlertTriangle className="size-3" />
                      Underutilized
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Badge variant="secondary" className="gap-1">
                    <CategoryIcon className="size-3" />
                    {CATEGORY_LABEL[p.category]}
                  </Badge>
                  <span>{p.provider}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {p.enrolledCount} / {p.capacity} enrolled
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                  <Progress
                    value={p.utilizationPct}
                    className={
                      p.status === "full"
                        ? "[&>[data-slot=indicator]]:bg-risk-high"
                        : p.status === "near_capacity"
                          ? "[&>[data-slot=indicator]]:bg-risk-medium"
                          : "[&>[data-slot=indicator]]:bg-risk-low"
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {inr.format(p.costPerEmployeeINR)}
                    <span className="text-xs text-muted-foreground font-normal"> / employee</span>
                  </span>
                  {p.underutilized && (
                    <span className="text-[10px] text-muted-foreground">
                      <TrendingDown className="inline size-3 mr-0.5" />
                      {p.recommendedCount} recommended
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No programs match your filters.
        </p>
      )}

      {/* Underutilization detail dialog */}
      <Dialog open={!!detailProgram} onOpenChange={() => setDetailProgram(null)}>
        {detailProgram && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{detailProgram.name}</DialogTitle>
              <DialogDescription>
                {detailProgram.provider} · {CATEGORY_LABEL[detailProgram.category]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Capacity
                  </p>
                  <p className="text-lg font-semibold">{detailProgram.capacity}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Enrolled
                  </p>
                  <p className="text-lg font-semibold">{detailProgram.enrolledCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Recommended To
                  </p>
                  <p className="text-lg font-semibold">{detailProgram.recommendedCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cost / Employee
                  </p>
                  <p className="text-lg font-semibold">
                    {inr.format(detailProgram.costPerEmployeeINR)}
                  </p>
                </div>
              </div>

              <div>
                <Progress
                  value={detailProgram.utilizationPct}
                  className={
                    detailProgram.status === "full"
                      ? "[&>[data-slot=indicator]]:bg-risk-high"
                      : detailProgram.status === "near_capacity"
                        ? "[&>[data-slot=indicator]]:bg-risk-medium"
                        : "[&>[data-slot=indicator]]:bg-risk-low"
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {detailProgram.utilizationPct}% utilized
                </p>
              </div>

              {detailProgram.underutilized && (
                <div className="rounded-lg border border-[var(--risk-medium)]/40 bg-[color-mix(in_oklch,var(--risk-medium)_10%,transparent)] p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[#7A4A12] mb-1">
                    <AlertTriangle className="size-3.5" />
                    Underutilization Signal
                  </p>
                  <p className="text-xs text-[#7A4A12]/80">
                    This program was recommended to{" "}
                    <strong>{detailProgram.recommendedCount}</strong> employees but only{" "}
                    <strong>{detailProgram.enrolledCount}</strong> enrolled (
                    {Math.round(
                      (detailProgram.enrolledCount / detailProgram.recommendedCount) * 100
                    )}
                    % conversion). Consider reviewing the program format, timing, or messaging.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
