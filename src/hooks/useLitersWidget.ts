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

const isTotalCat = (c: string) => c.trim().toLowerCase() === "total";

/** Categorías de combustible (excluye "Total"), con su índice original en Liters. */
export function fuelCategoriesOf(data: AtiLitersWidget): { name: string; index: number }[] {
  return data.Categories
    .map((name, index) => ({ name, index }))
    .filter((c) => !isTotalCat(c.name));
}

/** Suma total de litros despachados en el período (fila "Total" por nombre). */
export function litersTotal(data: AtiLitersWidget): number {
  const totalIdx = data.Categories.findIndex(isTotalCat);
  if (totalIdx >= 0) return (data.Liters[totalIdx] ?? []).reduce((a, b) => a + b, 0);
  // Fallback: sumar todas las categorías de combustible
  return fuelCategoriesOf(data).reduce(
    (s, f) => s + (data.Liters[f.index] ?? []).reduce((a, b) => a + b, 0),
    0
  );
}

/** Converts LitersWidget to chart-friendly day series */
export function buildDaySeries(data: AtiLitersWidget) {
  const { StartYear, StartMonth, StartDay, DaysCount, Categories, Liters } = data;
  const start = new Date(StartYear, StartMonth - 1, StartDay);
  // "Total" puede venir en cualquier posición (no necesariamente la última).
  const fuels = fuelCategoriesOf(data);
  const totalIdx = Categories.findIndex(isTotalCat);

  return Array.from({ length: DaysCount }, (_, i) => {
    const date = addDays(start, i);
    const label = `${date.getDate()}/${date.getMonth() + 1}`;
    const point: Record<string, number | string> = { date: label };
    fuels.forEach((f) => {
      point[f.name] = Liters[f.index]?.[i] ?? 0;
    });
    point["Total"] =
      totalIdx >= 0
        ? Liters[totalIdx]?.[i] ?? 0
        : fuels.reduce((s, f) => s + (Liters[f.index]?.[i] ?? 0), 0);
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
