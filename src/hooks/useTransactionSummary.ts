"use client";

import { useQuery } from "@tanstack/react-query";
import type { AtiTransaction } from "@/lib/ationet/types";

const FIVE_MINUTES = 5 * 60 * 1000;

export interface TransactionSummary {
  totalCount: number;
  totalVolume: number;
  totalAmount: number;
  byFuel: {
    fuelCode: string;
    fuelDescription: string;
    count: number;
    volume: number;
    amount: number;
  }[];
}

async function fetchTransactions(dateFrom: string, dateTo: string): Promise<AtiTransaction[]> {
  const params = new URLSearchParams({ dateFrom, dateTo });
  const res = await fetch(`/api/transactions?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function summarize(transactions: AtiTransaction[]): TransactionSummary {
  const byFuelMap = new Map<
    string,
    { fuelCode: string; fuelDescription: string; count: number; volume: number; amount: number }
  >();

  for (const tx of transactions) {
    const key = tx.FuelMasterCode ?? "UNKNOWN";
    const existing = byFuelMap.get(key) ?? {
      fuelCode: key,
      fuelDescription: tx.FuelMasterDescription ?? key,
      count: 0,
      volume: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.volume += tx.FuelVolume ?? 0;
    existing.amount += tx.TransactionAmount ?? 0;
    byFuelMap.set(key, existing);
  }

  const byFuel = Array.from(byFuelMap.values()).sort((a, b) => b.volume - a.volume);

  return {
    totalCount: transactions.length,
    totalVolume: byFuel.reduce((s, f) => s + f.volume, 0),
    totalAmount: byFuel.reduce((s, f) => s + f.amount, 0),
    byFuel,
  };
}

export function useTransactionSummary(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["transactions", dateFrom, dateTo],
    queryFn: () => fetchTransactions(dateFrom, dateTo),
    select: summarize,
    staleTime: FIVE_MINUTES,
    retry: 2,
  });
}
