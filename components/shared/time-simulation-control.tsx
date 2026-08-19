"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Cross-cutting feature 6 — visible only to HR Admin/CFO. Advances a shared mock
 * clock (see lib/data.ts) so trend data across the app is a real interaction
 * during a live click-through, not just a static screenshot.
 */
export function TimeSimulationControl() {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/time-simulation")
      .then(r => r.json())
      .then(d => setDate(d.date));
  }, []);

  async function advance() {
    setLoading(true);
    try {
      const res = await fetch("/api/time-simulation", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setDate(data.date);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-[#F4A261]/60 bg-[#F4A261]/10 px-3 py-1.5">
      <Badge variant="outline" className="text-[10px] border-[#F4A261] text-[#B5651D]">
        Demo control
      </Badge>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Simulated week of <span className="font-medium text-foreground">{date ?? "…"}</span>
      </span>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={advance} disabled={loading}>
        {loading ? "Advancing…" : "Advance to next week →"}
      </Button>
    </div>
  );
}
