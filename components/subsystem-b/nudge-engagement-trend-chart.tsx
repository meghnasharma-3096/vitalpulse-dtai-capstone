"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WeeklyNudgeEngagement } from "@/lib/subsystem-b";

const SERIES = [
  { key: "Sent", color: "var(--chart-1)" },
  { key: "Dismissed", color: "var(--risk-high)" },
  { key: "Acted on", color: "var(--risk-low)" },
] as const;

function PillLegend({ payload }: { payload?: Array<{ value?: string; color?: string }> }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-2">
      {payload?.map(entry => (
        <span
          key={entry.value}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export function NudgeEngagementTrendChart({ trend }: { trend: WeeklyNudgeEngagement[] }) {
  const data = trend.map(t => ({
    week: t.weekOf.slice(5),
    Sent: t.sent,
    Dismissed: t.dismissed,
    "Acted on": t.actedOn,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" />
          Nudge engagement trend
        </CardTitle>
        <CardDescription>Weekly, last {trend.length} weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -12 }}>
              <defs>
                {SERIES.map(s => (
                  <linearGradient key={s.key} id={`fill-${s.key.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend content={<PillLegend />} />
              {SERIES.map(s => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#fill-${s.key.replace(/\s+/g, "-")})`}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
