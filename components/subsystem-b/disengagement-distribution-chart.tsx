"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { DisengagementDistribution } from "@/lib/subsystem-b";

export function DisengagementDistributionChart({
  distribution,
  scopeLabel = "Company-wide",
}: {
  distribution: DisengagementDistribution;
  scopeLabel?: string;
}) {
  const data = [
    { level: "Low", count: distribution.low, fill: "var(--risk-low)" },
    { level: "Medium", count: distribution.medium, fill: "var(--risk-medium)" },
    { level: "High", count: distribution.high, fill: "var(--risk-high)" },
    { level: "Opted out", count: distribution.optedOut, fill: "var(--muted-foreground)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="size-4 text-primary" />
          {scopeLabel} disengagement risk
        </CardTitle>
        <CardDescription>{distribution.total} employees total</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="level" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map(d => (
                  <Cell key={d.level} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
