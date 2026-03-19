"use client";

import { useQuery } from "@tanstack/react-query";
import type { AtiLitersWidget } from "@/lib/ationet/types";
import { addDays } from "date-fns";

const FIVE_MINUTES = 5 * 60 * 1000;

async function fetchLiters(): Promise<AtiLitersWidget> {
  const res = await fetch("/api/widgets/liters");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/** Converts LitersWidget to chart-friendly day series */
export function buildDaySeries(data: AtiLitersWidget) {
  const { StartYear, StartMonth, StartDay, DaysCount, Categories, Liters } = data;
  const start = new Date(StartYear, StartMonth - 1, StartDay);
  // Exclude "Total" category from individual fuel lines
  const fuelCats = Categories.slice(0, -1);

  return Array.from({ length: DaysCount }, (_, i) => {
    const date = addDays(start, i);
    const label = `${date.getDate()}/${date.getMonth() + 1}`;
    const point: Record<string, number | string> = { date: label };
    fuelCats.forEach((cat, ci) => {
      point[cat] = Liters[ci]?.[i] ?? 0;
    });
    point["Total"] = Liters[Categories.length - 1]?.[i] ?? 0;
    return point;
  });
}

export function useLitersWidget() {
  return useQuery({
    queryKey: ["widgets", "liters"],
    queryFn: fetchLiters,
    staleTime: FIVE_MINUTES,
    retry: 2,
  });
}
