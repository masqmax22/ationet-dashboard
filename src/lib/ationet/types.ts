// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AtiTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  /** ISO string: ".expires" field from Ationet response */
  ".expires": string;
  ".issued": string;
}

// ─── Generic Ationet paginated response ──────────────────────────────────────
// Real API returns { Content: T[], TotalCount, TotalPages, PageSize, CurrentPage }

export interface AtiPage<T> {
  Content: T[];
  TotalCount: number;
  TotalPages: number;
  PageSize: number;
  CurrentPage: number;
}

// ─── Sites ────────────────────────────────────────────────────────────────────

export interface AtiSite {
  Id: string;
  ShortName: string;
  FullName: string;
  Active: boolean;
  Street1: string | null;
  Street2: string | null;
  CountryDescription: string | null;
  StateDescription: string | null;
  City: string | null;
  ZipCode: string | null;
  TimeZone: string | null;
  Latitude: number | null;
  Longitude: number | null;
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

export interface AtiLitersWidget {
  /** Fuel category names, last element is "Total" */
  Categories: string[];
  /** Parallel array: one sub-array of daily liter values per category */
  Liters: number[][];
  CategoriesCount: number;
  DaysCount: number;
  StartYear: number;
  StartMonth: number;
  StartDay: number;
  Series: string;
}

export interface AtiBalanceItem {
  IdCompany: string;
  IdCompanyContract: string;
  CompanyName: string;
  CompanyCode: string;
  CompanyContractCode: string;
  RemainingOperatingDays: number;
  AvailableBalance: number;
  CurrentAccountMode: "Money" | "Volume";
}

export interface AtiHealthItem {
  /** 0 = critical, 1 = warning, 2 = ok (undocumented — inferred) */
  Status: number;
  Mesagge: string;
  Entity: number;
  ActionMesagge: string;
  CanFix: boolean;
}

export interface AtiHealthWidget {
  HealthItems: AtiHealthItem[];
}

// ─── Transactions ─────────────────────────────────────────────────────────────

// Forma "limpia" que consume la UI. Los datos crudos de ATIONet se normalizan a
// esta forma en `mapTransaction` (ver transactions.ts), porque la API real usa
// nombres de campo distintos (ProductVolumeDispensed, TransactionAmountDispensed,
// SiteShortName, SiteDateTime, etc.).
export interface AtiTransaction {
  TransactionId: string;
  AuthorizationCode: string;
  DateTime: string;
  SiteId: string;
  SiteName: string;
  FuelMasterId: string;
  FuelMasterCode: string;
  FuelMasterDescription: string;
  /** Volume dispatched in liters */
  FuelVolume: number;
  /** Monetary amount */
  TransactionAmount: number;
  CurrencyCode: string;
  /** Identificación del medio/vehículo (PAN si existe, o patente/código) */
  PAN: string;
  VehiclePlate: string;
  ResponseCode: string;
  ResponseMessage: string;
  Approved: boolean;
}

/** Transacción cruda de ATIONet (campos reales de /Transactions). */
export type AtiRawTransaction = Record<string, unknown>;

// ─── Reconciliation (computed) ────────────────────────────────────────────────

export type ReconciliationStatus = "ok" | "warning" | "critical";

export interface ReconciliationRow {
  siteId: string;
  siteName: string;
  fuelCode: string;
  fuelDescription: string;
  /** Liters dispatched (from LitersWidget or Transactions) */
  dispatched: number;
  /** Days with any dispatch */
  activeDays: number;
  status: ReconciliationStatus;
}
