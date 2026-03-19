"use client";

import { useQuery } from "@tanstack/react-query";
import type { AtiTransaction } from "@/lib/ationet/types";
import { toISODate, daysAgo } from "@/lib/utils";

export interface SiteStats {
  siteId: string;
  siteName: string;
  txCount: number;
  totalVolume: number;
  totalAmount: number;
  lastTxDate: string | null;
  topFuel: string | null;
}

async function fetchTransactions30d(): Promise<AtiTransaction[]> {
  const params = new URLSearchParams({
    dateFrom: toISODate(daysAgo(30)),
    dateTo:   toISODate(),
  });
  const res = await fetch(`/api/transactions?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function computeSiteStats(txs: AtiTransaction[]): Map<string, SiteStats> {
  // Key by SiteId (primary) — also track fuel volumes per site
  const map     = new Map<string, SiteStats>();
  const fuelMap = new Map<string, Map<string, number>>();

  for (const tx of txs) {
    // Try SiteId first, fall back to SiteName
    const key  = tx.SiteId ?? tx.SiteName ?? "unknown";
    const name = tx.SiteName ?? key;

    const cur = map.get(key) ?? {
      siteId:      key,
      siteName:    name,
      txCount:     0,
      totalVolume: 0,
      totalAmount: 0,
      lastTxDate:  null,
      topFuel:     null,
    };

    cur.txCount++;
    cur.totalVolume += tx.FuelVolume ?? 0;
    cur.totalAmount += tx.TransactionAmount ?? 0;

    if (tx.DateTime && (!cur.lastTxDate || tx.DateTime > cur.lastTxDate)) {
      cur.lastTxDate = tx.DateTime;
    }

    map.set(key, cur);

    // Track fuel volumes
    const fuel = tx.FuelMasterDescription ?? "Desconocido";
    if (!fuelMap.has(key)) fuelMap.set(key, new Map());
    const fm = fuelMap.get(key)!;
    fm.set(fuel, (fm.get(fuel) ?? 0) + (tx.FuelVolume ?? 0));
  }

  // Compute top fuel per site
  for (const [siteKey, fm] of fuelMap) {
    const stats = map.get(siteKey);
    if (!stats) continue;
    let best = ""; let bestVol = 0;
    for (const [fuel, vol] of fm) {
      if (vol > bestVol) { best = fuel; bestVol = vol; }
    }
    stats.topFuel = best || null;
  }

  return map;
}

export function useSiteStats() {
  return useQuery({
    queryKey: ["site-stats-30d"],
    queryFn:  fetchTransactions30d,
    select:   computeSiteStats,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
