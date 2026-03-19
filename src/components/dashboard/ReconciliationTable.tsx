"use client";

import { useState, useMemo } from "react";
import { useReconciliation, type ReconStatus, type TankRow } from "@/hooks/useReconciliation";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle, Info, TrendingDown, Fuel,
  Filter, AlertTriangle, CheckCircle2, XCircle, ChevronDown,
} from "lucide-react";
import { formatVolume, formatPct } from "@/lib/utils";

interface Props { dateFrom: string; dateTo: string; }

// ─── Status badge ──────────────────────────────────────────
function StatusBadge({ estado }: { estado: ReconStatus }) {
  const cfg = {
    ok:          { cls: "badge-ok",   icon: <CheckCircle2 className="h-3 w-3" />, label: "OK" },
    alerta:      { cls: "badge-warn", icon: <AlertTriangle className="h-3 w-3" />, label: "Alerta" },
    critico:     { cls: "badge-crit", icon: <XCircle className="h-3 w-3" />,      label: "Crítico" },
    "sin-datos": { cls: "badge-none", icon: <Info className="h-3 w-3" />,          label: "Sin FMS" },
  }[estado];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── KPI top bar ───────────────────────────────────────────
function ReconKPI({
  totalDif, pctProm, enAlerta, enCritico, total,
}: {
  totalDif: number; pctProm: number; enAlerta: number; enCritico: number; total: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

      <div className="kpi-card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg kpi-icon-blue">
            <Fuel className="h-[18px] w-[18px]" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{total}</p>
        <p className="text-xs text-muted-foreground mt-1.5">Tanques monitoreados</p>
        <p className="text-[11px] text-[#116dff] mt-0.5">Red completa</p>
      </div>

      <div className="kpi-card">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
            enCritico > 0 ? "kpi-icon-red" : enAlerta > 0 ? "kpi-icon-amber" : "kpi-icon-green"
          }`}>
            <AlertTriangle className="h-[18px] w-[18px]" />
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            enCritico > 0 ? "badge-crit" : enAlerta > 0 ? "badge-warn" : "badge-ok"
          }`}>
            {enCritico > 0 ? "Crítico" : enAlerta > 0 ? "Alerta" : "OK"}
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight leading-none">
          {enCritico > 0 ? enCritico : enAlerta > 0 ? enAlerta : total - enCritico - enAlerta}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {enCritico > 0
            ? `${enCritico} crítico${enCritico > 1 ? "s" : ""}`
            : enAlerta > 0 ? `${enAlerta} en alerta`
            : "Todos en estado OK"}
        </p>
      </div>

      <div className="kpi-card">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
            Math.abs(pctProm) > 1 ? "kpi-icon-red" : Math.abs(pctProm) > 0.5 ? "kpi-icon-amber" : "kpi-icon-green"
          }`}>
            <TrendingDown className="h-[18px] w-[18px]" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{formatPct(pctProm)}</p>
        <p className="text-xs text-muted-foreground mt-1.5">% Diferencia promedio</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 opacity-70">Sobre vol. reconciliado</p>
      </div>

      <div className="kpi-card">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
            totalDif < 0 ? "kpi-icon-red" : totalDif > 0 ? "kpi-icon-amber" : "kpi-icon-green"
          }`}>
            <TrendingDown className="h-[18px] w-[18px]" />
          </div>
        </div>
        <p className={`text-2xl font-bold tracking-tight leading-none ${
          totalDif < 0 ? "text-red-600" : totalDif > 0 ? "text-amber-600" : "text-foreground"
        }`}>
          {totalDif >= 0 ? "+" : ""}{formatVolume(totalDif)}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">Diferencia total</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 opacity-70">Δ actual vs reconciliado</p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────
export function ReconciliationTable({ dateFrom, dateTo }: Props) {
  const { data, isLoading, error } = useReconciliation(dateFrom, dateTo);
  const [filterFuel,   setFilterFuel]   = useState("");
  const [filterSite,   setFilterSite]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r => {
      if (filterFuel   && r.fuelCode !== filterFuel)   return false;
      if (filterSite   && r.siteName !== filterSite)   return false;
      if (filterStatus && r.estado !== filterStatus)   return false;
      return true;
    });
  }, [data, filterFuel, filterSite, filterStatus]);

  const fuelOptions = useMemo(() => [...new Set(data?.rows.map(r => r.fuelCode) ?? [])], [data]);
  const siteOptions = useMemo(() => [...new Set(data?.rows.map(r => r.siteName) ?? [])], [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error al calcular reconciliación</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">

      {/* KPI bar */}
      <ReconKPI
        totalDif={data.totalDiferencia}
        pctProm={data.pctPromedio}
        enAlerta={data.enAlerta}
        enCritico={data.enCritico}
        total={data.rows.length}
      />

      {/* FMS notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm">
        <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800 text-xs">Reconciliación parcial — FMS no integrado</p>
          <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
            Stock inicial, ingresos y volumen actual requieren sondas ATG conectadas al FMS.
            La tabla muestra la estructura completa lista para integrar.
          </p>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="panel overflow-hidden">

        {/* Filter bar */}
        <div className="px-5 py-3.5 border-b border-border flex flex-wrap items-center gap-3 bg-white">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </div>

          {[
            { value: filterFuel,   onChange: setFilterFuel,   placeholder: "Combustible",   opts: fuelOptions },
            { value: filterSite,   onChange: setFilterSite,   placeholder: "Sitio",          opts: siteOptions },
          ].map(({ value, onChange, placeholder, opts }) => (
            <div key={placeholder} className="relative">
              <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="text-xs border border-border rounded-lg px-3 py-1.5 pr-7 bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-[#116dff]/20 min-w-[120px]"
              >
                <option value="">Todos · {placeholder}</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          ))}

          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs border border-border rounded-lg px-3 py-1.5 pr-7 bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-[#116dff]/20 min-w-[120px]"
            >
              <option value="">Todos · Estado</option>
              <option value="ok">OK</option>
              <option value="alerta">Alerta</option>
              <option value="critico">Crítico</option>
              <option value="sin-datos">Sin FMS</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {(filterFuel || filterSite || filterStatus) && (
            <button
              onClick={() => { setFilterFuel(""); setFilterSite(""); setFilterStatus(""); }}
              className="text-xs text-[#116dff] font-medium hover:underline"
            >
              Limpiar
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} de {data.rows.length} registros
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full recon-table">
            <thead>
              <tr>
                <th className="text-left">Tanque / Sitio</th>
                <th className="text-left">Combustible</th>
                <th className="text-right">Stock Inicial</th>
                <th className="text-right">Deliverys</th>
                <th className="text-right">Descargas</th>
                <th className="text-right">Vol. Reconciliado</th>
                <th className="text-right">Vol. Actual</th>
                <th className="text-right">Diferencia</th>
                <th className="text-right">% Dif.</th>
                <th className="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                    No hay registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map(row => <TankTableRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Legend footer */}
        <div className="px-5 py-3 border-t border-border bg-slate-50/60 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground text-[11px]">Semáforo:</span>
          <span className="badge-ok px-2 py-0.5 rounded-full text-[11px]">OK &lt; 0.5%</span>
          <span className="badge-warn px-2 py-0.5 rounded-full text-[11px]">Alerta 0.5–1%</span>
          <span className="badge-crit px-2 py-0.5 rounded-full text-[11px]">Crítico &gt; 1%</span>
          <span className="ml-auto text-[11px]">Ordenado por mayor desvío</span>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ─────────────────────────────────────────────
function TankTableRow({ row }: { row: TankRow }) {
  const noFMS    = !row.hasFMSData;
  const difColor = row.diferencia < 0 ? "text-red-600" : row.diferencia > 0 ? "text-amber-600" : "text-foreground";

  return (
    <tr>
      <td>
        <p className="font-semibold text-foreground text-sm">{row.tankName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{row.siteName}</p>
      </td>
      <td>
        <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-[#116dff] border border-blue-100 px-2 py-0.5 rounded-full font-medium">
          <Fuel className="h-3 w-3" />
          {row.fuelDescription}
        </span>
      </td>
      <td className="text-right font-mono text-sm">{noFMS ? <FmsCell /> : formatVolume(row.stockInicial)}</td>
      <td className="text-right font-mono text-sm">{noFMS ? <FmsCell /> : formatVolume(row.deliverys)}</td>
      <td className="text-right font-mono text-sm font-medium">{formatVolume(row.descargas)}</td>
      <td className="text-right font-mono text-sm">{noFMS ? <FmsCell /> : formatVolume(row.volReconciliado)}</td>
      <td className="text-right font-mono text-sm">{noFMS ? <FmsCell /> : formatVolume(row.volActual)}</td>
      <td className={`text-right font-mono text-sm font-semibold ${difColor}`}>
        {noFMS ? <FmsCell /> : (row.diferencia >= 0 ? "+" : "") + formatVolume(row.diferencia)}
      </td>
      <td className={`text-right font-mono text-sm font-semibold ${difColor}`}>
        {noFMS ? <FmsCell /> : formatPct(row.diferenciaPct)}
      </td>
      <td className="text-center">
        <StatusBadge estado={row.estado} />
      </td>
    </tr>
  );
}

function FmsCell() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
      <TrendingDown className="h-3 w-3" />
      FMS
    </span>
  );
}
