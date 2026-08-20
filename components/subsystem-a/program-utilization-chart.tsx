"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ProgramWithUtilization } from "@/lib/subsystem-a";

const STATUS_COLORS: Record<string, string> = {
  available: "var(--risk-low)",
  near_capacity: "var(--risk-medium)",
  full: "var(--risk-high)",
};

export function ProgramUtilizationChart({
  programs,
}: {
  programs: ProgramWithUtilization[];
}) {
  // Sort by utilization for visual clarity
  const data = [...programs]
    .sort((a, b) => b.utilizationPct - a.utilizationPct)
    .map((p) => ({
      name: p.name.length > 22 ? p.name.slice(0, 20) + "…" : p.name,
      fullName: p.name,
      utilization: p.utilizationPct,
      enrolled: p.enrolledCount,
      capacity: p.capacity,
      status: p.status,
    }));

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="0"
            stroke="#E5E9E6"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "#5B655F" }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 12, fill: "#1B1F1D" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(45,106,79,0.04)" }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E3E8E4",
              boxShadow: "var(--shadow-card)",
              fontSize: "13px",
            }}
            formatter={(value: unknown, _name: unknown, props: unknown) => {
              const p = props as { payload?: { enrolled?: number; capacity?: number; fullName?: string } };
              const enrolled = p?.payload?.enrolled ?? 0;
              const capacity = p?.payload?.capacity ?? 0;
              const fullName = p?.payload?.fullName ?? "";
              return [`${value}% (${enrolled}/${capacity})`, fullName];
            }}
          />
          <Bar dataKey="utilization" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STATUS_COLORS[entry.status] ?? STATUS_COLORS.available}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend as pill chips per design.md Section 7 */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {[
          { label: "Available", color: "var(--risk-low)" },
          { label: "Near Capacity", color: "var(--risk-medium)" },
          { label: "Full", color: "var(--risk-high)" },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-card border px-2.5 py-1 text-xs text-muted-foreground"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
