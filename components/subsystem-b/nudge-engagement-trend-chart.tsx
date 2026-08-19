"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WeeklyNudgeEngagement } from "@/lib/subsystem-b";

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
        <CardTitle className="text-base">Nudge engagement trend</CardTitle>
        <CardDescription>Weekly, last {trend.length} weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Sent" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Dismissed" stroke="var(--risk-high)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Acted on" stroke="var(--risk-low)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
