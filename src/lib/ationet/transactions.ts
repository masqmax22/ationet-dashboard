import { ationetFetch } from "./client";
import type { AtiTransaction, AtiRawTransaction, AtiPage, AtiLitersWidget, AtiBalanceItem, AtiHealthWidget } from "./types";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/**
 * Normaliza una transacción cruda de ATIONet a la forma `AtiTransaction` que usa
 * la UI. La API real usa nombres de campo distintos a los esperados:
 *  - volumen → ProductVolumeDispensed   (no "FuelVolume")
 *  - monto   → TransactionAmountDispensed (no "TransactionAmount")
 *  - sitio   → SiteShortName            ("SiteName" viene null)
 *  - fecha   → SiteDateTime             ("DateTime" trae un valor centinela)
 *  - estado  → ResponseCode "00000" / StatusDescription "Ok"
 */
export function mapTransaction(r: AtiRawTransaction): AtiTransaction {
  const approved =
    r.StatusDescription === "Ok" || r.ResponseCode === "00000" || r.ResponseCode === "00";
  return {
    TransactionId: str(r.Id),
    AuthorizationCode: str(r.AuthorizationCode),
    DateTime: str(r.SiteDateTime ?? r.HostDateTime ?? r.DateTime),
    SiteId: str(r.SiteId),
    SiteName: str(r.SiteShortName ?? r.SiteName ?? r.FuelSiteName),
    FuelMasterId: str(r.FuelMasterId),
    FuelMasterCode: str(r.FuelMasterCode ?? r.FuelCode),
    FuelMasterDescription: str(r.FuelMasterDescription ?? r.FuelNetworkName),
    FuelVolume: num(r.ProductVolumeDispensed),
    TransactionAmount: num(r.TransactionAmountDispensed ?? r.CompanyTransactionAmount),
    CurrencyCode: str(r.CurrencyCode ?? r.CompanyCurrencyCode),
    PAN: str(r.PrimaryIdentificationPAN),
    VehiclePlate: str(r.VehiclePlate ?? r.VehicleCode),
    ResponseCode: str(r.ResponseCode),
    ResponseMessage: str(r.ResponseMessage),
    Approved: approved,
  };
}

export async function getTransactions(
  dateFrom: string,
  dateTo: string,
  pageSize = 1000
): Promise<AtiTransaction[]> {
  const data = await ationetFetch<AtiPage<AtiRawTransaction>>("/Transactions", {
    DateFrom: dateFrom,
    DateTo: dateTo,
    pageSize: String(pageSize),
  });
  return (data.Content ?? []).map(mapTransaction);
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
