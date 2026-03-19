"use client";

import { useQuery } from "@tanstack/react-query";
import type { AtiSite } from "@/lib/ationet/types";

const FIVE_MINUTES = 5 * 60 * 1000;

async function fetchSites(): Promise<AtiSite[]> {
  const res = await fetch("/api/sites");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
    staleTime: FIVE_MINUTES,
    retry: 2,
  });
}
