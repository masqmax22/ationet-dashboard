"use client";

import { useQuery } from "@tanstack/react-query";
import type { AtiLitersWidget, AtiTransaction } from "@/lib/ationet/types";
import { buildDaySeries } from "./useLitersWidget";

const FIVE_MINUTES = 5 * 60 * 1000;

export type ReconStatus = "ok" | "alerta" | "critico" | "sin-datos";

export interface TankRow {
  id: string;
  tankName: string;
  siteName: string;
  fuelCode: string;
  fuelDescription: string;
  stockInicial: number;
  deliverys: number;
  descargas: number;
  volReconciliado: number;   // stockInicial + deliverys - descargas
  volActual: number;
  diferencia: number;        // volActual - volReconciliado
  diferenciaPct: number;
  estado: ReconStatus;
  hasFMSData: boolean;
}

export interface ReconciliationData {
  rows: TankRow[];
  totalDiferencia: number;
  pctPromedio: number;
  enAlerta: number;
  enCritico: number;
  daySeries: ReturnType<typeof buildDaySeries>;
  fuelCategories: string[];
  totalByFuel: Record<string, number>;
  transactions: AtiTransaction[];
}

function calcEstado(pct: number, hasFMS: boolean): ReconStatus {
  if (!hasFMS) return "sin-datos";
  const abs = Math.abs(pct);
  if (abs < 0.5) return "ok";
  if (abs < 1.0) return "alerta";
  return "critico";
}

async function fetchReconciliation(dateFrom: string, dateTo: string): Promise<ReconciliationData> {
  const params = new URLSearchParams({ dateFrom, dateTo });
  const res = await fetch(`/api/reconciliation?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  const { liters, transactions }: { liters: AtiLitersWidget; transactions: AtiTransaction[] } =
    await res.json();

  const daySeries = buildDaySeries(liters);
  const fuelCategories = liters.Categories.slice(0, -1);

  // Total dispatched per fuel
  const totalByFuel: Record<string, number> = {};
  fuelCategories.forEach((cat, ci) => {
    totalByFuel[cat] = (liters.Liters[ci] ?? []).reduce((a, b) => a + b, 0);
  });

  // Build one row per fuel category (network-level, no FMS tank data)
  const rows: TankRow[] = fuelCategories.map((cat, i) => {
    const descargas = totalByFuel[cat] ?? 0;
    const stockInicial = 0;   // FMS required
    const deliverys = 0;      // FMS required
    const volReconciliado = stockInicial + deliverys - descargas;
    const volActual = 0;      // FMS required
    const diferencia = volActual - volReconciliado;
    const diferenciaPct = volReconciliado !== 0 ? (diferencia / Math.abs(volReconciliado)) * 100 : 0;

    return {
      id: `net-${i}`,
      tankName: `Tanque ${cat}`,
      siteName: "Red general",
      fuelCode: cat,
      fuelDescription: cat,
      stockInicial,
      deliverys,
      descargas,
      volReconciliado,
      volActual,
      diferencia,
      diferenciaPct,
      estado: calcEstado(diferenciaPct, false),
      hasFMSData: false,
    };
  });

  // Sort worst first
  rows.sort((a, b) => Math.abs(b.diferenciaPct) - Math.abs(a.diferenciaPct));

  const totalDiferencia = rows.reduce((s, r) => s + r.diferencia, 0);
  const pctPromedio = rows.length > 0 ? rows.reduce((s, r) => s + r.diferenciaPct, 0) / rows.length : 0;
  const enAlerta = rows.filter(r => r.estado === "alerta").length;
  const enCritico = rows.filter(r => r.estado === "critico").length;

  return { rows, totalDiferencia, pctPromedio, enAlerta, enCritico, daySeries, fuelCategories, totalByFuel, transactions };
}

export function useReconciliation(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["reconciliation", dateFrom, dateTo],
    queryFn: () => fetchReconciliation(dateFrom, dateTo),
    staleTime: FIVE_MINUTES,
    retry: 2,
  });
}
