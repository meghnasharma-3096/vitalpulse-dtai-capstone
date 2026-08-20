"use client";

import { useMemo, useState } from "react";
import { Calculator, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExplainabilityTooltip } from "@/components/shared/explainability-tooltip";
import { calculateRoi, DEFAULT_ROI_ASSUMPTIONS, type RoiAssumptions, type RoiContext } from "@/lib/roi-math";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function RoiCalculator({ context }: { context: RoiContext }) {
  const [assumptions, setAssumptions] = useState<RoiAssumptions>(DEFAULT_ROI_ASSUMPTIONS);

  const result = useMemo(() => calculateRoi(assumptions, context), [assumptions, context]);

  function set<K extends keyof RoiAssumptions>(key: K, value: number) {
    setAssumptions(a => ({ ...a, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="shadow-[var(--shadow-card-hover)]">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              Projected annual savings
            </CardTitle>
            <ExplainabilityTooltip reason="Calculated from your currently at-risk employee count, the engagement rate you set below, and standard claims/absenteeism/attrition cost-avoidance factors. Adjust any assumption to see it update live." />
          </div>
          <CardDescription>{context.atRiskEmployeeCount} employees currently at medium/high disengagement risk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="text-[52px] font-bold leading-none tracking-tight text-primary tabular-nums">
              {inr.format(Math.round(result.totalSavingsINR))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Net of program cost: <span className="font-medium text-foreground">{inr.format(Math.round(result.netSavingsINR))}</span>
              {" · "}
              ROI multiple: <span className="font-medium text-foreground">{result.roiMultiple.toFixed(1)}×</span>
            </p>
          </div>

          {result.exceedsBudget && (
            <div className="rounded-xl bg-[color-mix(in_oklch,var(--risk-high)_10%,transparent)] px-3 py-2 text-sm text-[#7A1620]">
              This engagement level costs {inr.format(Math.round(result.programCostINR))}, exceeding the remaining wellness
              budget for affected departments by <span className="font-semibold">{inr.format(Math.round(result.budgetOverrunINR))}</span>.
              Recommend a phased rollout rather than enrolling everyone at once.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Claims" value={inr.format(Math.round(result.claimsSavingsINR))} />
            <Stat label="Attrition" value={inr.format(Math.round(result.attritionSavingsINR))} />
            <Stat label="Absenteeism" value={inr.format(Math.round(result.absenteeismSavingsINR))} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <span>~{result.attritionsAvoided.toFixed(1)} attritions avoided</span>
            <span>~{result.absenteeismDaysAvoided.toFixed(0)} absenteeism days avoided</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-4 text-primary" />
            Adjustable assumptions
          </CardTitle>
          <CardDescription>Change any input and watch the number update live.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Engagement rate</Label>
              <Badge variant="secondary">{assumptions.engagementRatePercent}%</Badge>
            </div>
            <Slider
              value={[assumptions.engagementRatePercent]}
              onValueChange={([v]) => set("engagementRatePercent", v)}
              min={0}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">% of at-risk employees the platform successfully re-engages</p>
          </div>

          <NumberField
            label="Avg. annual claims cost / employee"
            value={assumptions.avgAnnualClaimsCostINR}
            onChange={v => set("avgAnnualClaimsCostINR", v)}
          />
          <NumberField
            label="Avg. attrition replacement cost"
            value={assumptions.avgAttritionCostINR}
            onChange={v => set("avgAttritionCostINR", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Absenteeism days avoided / employee"
              value={assumptions.avgAbsenteeismDaysPerAtRiskEmployee}
              onChange={v => set("avgAbsenteeismDaysPerAtRiskEmployee", v)}
            />
            <NumberField
              label="Absenteeism cost / day"
              value={assumptions.absenteeismDailyCostINR}
              onChange={v => set("absenteeismDailyCostINR", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}
