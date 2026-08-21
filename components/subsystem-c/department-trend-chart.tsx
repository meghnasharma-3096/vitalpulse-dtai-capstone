"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyTrendPoint } from "@/lib/subsystem-c";

export function DepartmentTrendChart({
  series,
}: {
  series: {
    weeks: WeeklyTrendPoint[];
    departments: { id: string; name: string; color: string }[];
  };
}) {
  const { weeks, departments } = series;

  if (weeks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No trend data available for this department scope.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeks} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="0" stroke="#E5E9E6" vertical={false} />
            <XAxis
              dataKey="weekOf"
              tick={{ fontSize: 12, fill: "#5B655F" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => {
                const parts = v.split("-");
                return parts.length === 3 ? `${parts[1]}/${parts[2]}` : v;
              }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
              tick={{ fontSize: 12, fill: "#5B655F" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #E3E8E4",
                boxShadow: "var(--shadow-card)",
                fontSize: "13px",
                padding: "8px 12px",
              }}
              formatter={(value: unknown, name: unknown) => {
                const num = typeof value === "number" ? value.toFixed(2) : String(value ?? "—");
                return [num, String(name)];
              }}
            />
            {departments.map((dept) => (
              <Line
                key={dept.id}
                type="monotone"
                dataKey={dept.name}
                stroke={dept.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: dept.color, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pill chip legend per design.md Section 7 */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {departments.map((dept) => (
          <span
            key={dept.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-card border px-2.5 py-1 text-xs text-muted-foreground shadow-xs"
          >
            <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
            <span className="font-medium text-foreground">{dept.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
