import { ationetFetch } from "./client";
import type { AtiTransaction, AtiPage, AtiLitersWidget, AtiBalanceItem, AtiHealthWidget } from "./types";

export async function getTransactions(
  dateFrom: string,
  dateTo: string,
  pageSize = 1000
): Promise<AtiTransaction[]> {
  const data = await ationetFetch<AtiPage<AtiTransaction>>("/Transactions", {
    DateFrom: dateFrom,
    DateTo: dateTo,
    pageSize: String(pageSize),
  });
  return data.Content ?? [];
}

export async function getLitersWidget(): Promise<AtiLitersWidget> {
  return ationetFetch<AtiLitersWidget>("/LitersWidget");
}

export async function getBalanceWidget(): Promise<AtiBalanceItem[]> {
  const data = await ationetFetch<AtiPage<AtiBalanceItem>>("/BalanceWidget", {
    pageSize: "100",
  });
  return data.Content ?? [];
}

export async function getHealthWidget(): Promise<AtiHealthWidget> {
  return ationetFetch<AtiHealthWidget>("/HealthWidget");
}
