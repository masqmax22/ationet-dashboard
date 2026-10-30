"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AtiPage, AtiTransaction } from "@/lib/ationet/types";
import { formatVolume, formatCurrency, toISODate, daysAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Filter, ChevronLeft, ChevronRight,
  ReceiptText, Fuel, DollarSign, Calendar,
  ChevronDown, RefreshCw, Download,
} from "lucide-react";

const PAGE_SIZE = 50;

// ─── Fetcher ──────────────────────────────────────────────
async function fetchTransactions(params: Record<string, string>): Promise<AtiPage<AtiTransaction>> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/transactions?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch { return { date: iso, time: "" }; }
}

function ResponseBadge({ approved, msg }: { approved: boolean; msg: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
      approved ? "badge-ok" : "badge-crit"
    }`}>
      {approved ? "✓ Aprobada" : `✗ ${msg?.slice(0, 18) || "Rechazada"}`}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────
export function TransactionList() {
  const [page, setPage]           = useState(1);
  const [dateFrom, setDateFrom]   = useState(toISODate(daysAgo(30)));
  const [dateTo, setDateTo]       = useState(toISODate());
  const [searchAuth, setSearchAuth] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterFuel, setFilterFuel] = useState("");
  const [draftAuth, setDraftAuth]   = useState("");

  // Build query params
  const params: Record<string, string> = {
    pageSize: String(PAGE_SIZE),
    page:     String(page),
    dateFrom,
    dateTo,
  };
  if (searchAuth) params.authCode = searchAuth;
  if (filterSite) params.siteName = filterSite;
  if (filterFuel) params.fuelCode = filterFuel;

  const queryKey = ["transactions-list", params];
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchTransactions(params),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const txs        = data?.Content ?? [];
  const totalCount = data?.TotalCount ?? 0;
  const totalPages = data?.TotalPages ?? 1;

  function applySearch() {
    setSearchAuth(draftAuth.trim());
    setPage(1);
  }

  function clearFilters() {
    setSearchAuth(""); setDraftAuth("");
    setFilterSite(""); setFilterFuel("");
    setDateFrom(toISODate(daysAgo(30)));
    setDateTo(toISODate());
    setPage(1);
  }

  const hasFilters = searchAuth || filterSite || filterFuel;

  // Collect unique sites & fuels from current results for filter options
  const siteOptions = [...new Set(txs.map(t => t.SiteName).filter(Boolean))].sort();
  const fuelOptions = [...new Set(txs.map(t => t.FuelMasterDescription).filter(Boolean))].sort();

  // Aggregates from current page
  const pageVolume = txs.reduce((s, t) => s + (t.FuelVolume ?? 0), 0);
  const pageAmount = txs.reduce((s, t) => s + (t.TransactionAmount ?? 0), 0);

  return (
    <div className="space-y-5">

      {/* ── Top filter bar ─────────────────────── */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Date range */}
          <div className="flex items-center gap-2 bg-slate-50 border border-border rounded-lg px-3 py-2 text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">De</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="bg-transparent text-xs outline-none text-foreground w-28" />
            <span className="text-muted-foreground">a</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="bg-transparent text-xs outline-none text-foreground w-28" />
          </div>

          {/* Auth code search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-border rounded-lg px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar por código auth..."
              value={draftAuth}
              onChange={e => setDraftAuth(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applySearch()}
              className="bg-transparent text-xs outline-none text-foreground w-44 placeholder:text-muted-foreground"
            />
            {draftAuth && (
              <button onClick={applySearch}
                className="text-[11px] text-[#116dff] font-medium hover:underline shrink-0">
                Buscar
              </button>
            )}
          </div>

          {/* Site filter */}
          <div className="relative">
            <select value={filterSite} onChange={e => { setFilterSite(e.target.value); setPage(1); }}
              className="text-xs border border-border rounded-lg px-3 py-2 pr-7 bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-[#116dff]/20 min-w-[130px]">
              <option value="">Todos · Sitio</option>
              {siteOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Fuel filter */}
          <div className="relative">
            <select value={filterFuel} onChange={e => { setFilterFuel(e.target.value); setPage(1); }}
              className="text-xs border border-border rounded-lg px-3 py-2 pr-7 bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-[#116dff]/20 min-w-[130px]">
              <option value="">Todos · Combustible</option>
              {fuelOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-[#116dff] font-medium hover:underline">
              Limpiar filtros
            </button>
          )}

          {/* Spacer + actions */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {totalCount.toLocaleString("es-AR")} transacciones
            </span>
            <button onClick={() => refetch()}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary KPIs (current page) ─────────── */}
      {txs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card !py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg kpi-icon-blue shrink-0">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{totalCount.toLocaleString("es-AR")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total transacciones</p>
              </div>
            </div>
          </div>
          <div className="kpi-card !py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg kpi-icon-blue shrink-0">
                <Fuel className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{formatVolume(pageVolume)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Volumen · pág. actual</p>
              </div>
            </div>
          </div>
          <div className="kpi-card !py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg kpi-icon-amber shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{formatCurrency(pageAmount)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Monto · pág. actual</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────── */}
      <div className="panel overflow-hidden">

        {/* Loading overlay */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-red-600">Error al cargar transacciones</p>
            <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
          </div>
        ) : txs.length === 0 ? (
          <EmptyState dateFrom={dateFrom} dateTo={dateTo} hasFilters={!!hasFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full recon-table">
              <thead>
                <tr>
                  <th className="text-left">Fecha / Hora</th>
                  <th className="text-left">Sitio</th>
                  <th className="text-left">Cod. Auth</th>
                  <th className="text-left">Combustible</th>
                  <th className="text-right">Volumen</th>
                  <th className="text-right">Monto</th>
                  <th className="text-left">PAN / Vehículo</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => {
                  const { date, time } = formatDateTime(tx.DateTime);
                  return (
                    <tr key={tx.TransactionId}>
                      <td>
                        <p className="text-sm font-medium text-foreground">{date}</p>
                        <p className="text-[11px] text-muted-foreground">{time}</p>
                      </td>
                      <td>
                        <p className="text-sm text-foreground truncate max-w-[160px]">{tx.SiteName ?? "—"}</p>
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                          {tx.AuthorizationCode ?? "—"}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-[#116dff] border border-blue-100 px-2 py-0.5 rounded-full">
                          <Fuel className="h-3 w-3" />
                          {tx.FuelMasterDescription ?? tx.FuelMasterCode ?? "—"}
                        </span>
                      </td>
                      <td className="text-right font-mono text-sm font-medium">
                        {formatVolume(tx.FuelVolume ?? 0)}
                      </td>
                      <td className="text-right font-mono text-sm">
                        {formatCurrency(tx.TransactionAmount ?? 0)}
                        {tx.CurrencyCode && (
                          <span className="text-[10px] text-muted-foreground ml-1">{tx.CurrencyCode}</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs text-muted-foreground">
                          {tx.PAN ? `****${tx.PAN.slice(-4)}` : (tx.VehiclePlate || "—")}
                        </span>
                      </td>
                      <td className="text-center">
                        <ResponseBadge approved={tx.Approved} msg={tx.ResponseMessage} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {txs.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-slate-50/60 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages} · {totalCount.toLocaleString("es-AR")} resultados
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-[#116dff] text-white"
                        : "border border-border bg-white text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────
function EmptyState({
  dateFrom, dateTo, hasFilters,
}: {
  dateFrom: string; dateTo: string; hasFilters: boolean;
}) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mx-auto mb-4">
        <ReceiptText className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {hasFilters ? "Sin resultados para los filtros aplicados" : "Sin transacciones en el período"}
      </p>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
        {hasFilters
          ? "Probá ajustando los filtros o limpiándolos para ver todos los registros."
          : `No se registraron transacciones entre ${dateFrom} y ${dateTo} para esta suscripción.`
        }
      </p>
      <div className="mt-5 inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700">
        <Filter className="h-3.5 w-3.5 shrink-0" />
        Probá ampliando el rango de fechas para encontrar transacciones históricas
      </div>
    </div>
  );
}
