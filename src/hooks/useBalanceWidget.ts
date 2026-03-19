"use client";

import { useQuery } from "@tanstack/react-query";
import type { AtiBalanceItem } from "@/lib/ationet/types";

const FIVE_MINUTES = 5 * 60 * 1000;

async function fetchBalance(): Promise<AtiBalanceItem[]> {
  const res = await fetch("/api/widgets/balance");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useBalanceWidget() {
  return useQuery({
    queryKey: ["widgets", "balance"],
    queryFn: fetchBalance,
    staleTime: FIVE_MINUTES,
    retry: 2,
  });
}
