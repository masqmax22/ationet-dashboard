"use client";

import { useQuery } from "@tanstack/react-query";
import type { AtiHealthWidget } from "@/lib/ationet/types";

const FIVE_MINUTES = 5 * 60 * 1000;

async function fetchHealth(): Promise<AtiHealthWidget> {
  const res = await fetch("/api/widgets/health");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useHealthWidget() {
  return useQuery({
    queryKey: ["widgets", "health"],
    queryFn: fetchHealth,
    staleTime: FIVE_MINUTES,
    retry: 2,
  });
}
