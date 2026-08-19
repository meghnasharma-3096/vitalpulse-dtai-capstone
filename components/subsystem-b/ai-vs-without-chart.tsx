"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExplainabilityTooltip } from "@/components/shared/explainability-tooltip";
import type { AiVsWithoutComparison } from "@/lib/subsystem-b";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, notation: "compact" });
const inrFull = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function AiVsWithoutChart({ comparison }: { comparison: AiVsWithoutComparison }) {
  const data = [
    { scenario: "Without VitalPulse", projectedCostINR: Math.round(comparison.withoutPlatformINR), fill: "var(--risk-high)" },
    { scenario: "With VitalPulse", projectedCostINR: Math.round(comparison.withPlatformINR), fill: "var(--risk-low)" },
  ];

  return (
    <Card className="border-[#2D6A4F]/30">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Projected annual cost: with VitalPulse vs. without</CardTitle>
          <ExplainabilityTooltip reason={`Based on ${comparison.atRiskCount} currently at-risk employees, standard claims/absenteeism/attrition cost factors, and a 35% baseline engagement rate once nudges and programs are active.`} />
        </div>
        <CardDescription>The single clearest business-impact number for Finance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="text-4xl font-semibold text-[#2D6A4F] dark:text-[#52B788] tabular-nums">
            {inrFull.format(Math.round(comparison.projectedSavingsINR))}
          </span>
          <span className="text-sm text-muted-foreground ml-2">projected annual savings</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24, right: 32 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tickFormatter={v => inr.format(v)} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="scenario" width={140} tick={{ fontSize: 13 }} />
              <Bar dataKey="projectedCostINR" radius={[0, 6, 6, 0]}>
                {data.map(d => (
                  <Cell key={d.scenario} fill={d.fill} />
                ))}
                <LabelList
                  dataKey="projectedCostINR"
                  position="right"
                  formatter={(v: React.ReactNode) => (typeof v === "number" ? inr.format(v) : "")}
                  className="text-xs fill-foreground"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
