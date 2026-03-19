"use client";

import { MapPin, CheckCircle2, XCircle, Building2, Fuel, ReceiptText, Calendar, TrendingUp, Globe, ChevronDown } from "lucide-react";
import type { AtiSite } from "@/lib/ationet/types";
import type { SiteStats } from "@/hooks/useSiteStats";
import { formatVolume, formatCurrency } from "@/lib/utils";

interface Props {
  site:     AtiSite;
  stats?:   SiteStats;
  expanded: boolean;
  onToggle: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

export function SiteStatusCard({ site, stats, expanded, onToggle }: Props) {
  const active  = site.Active;
  const address = [site.Street1, site.City, site.StateDescription].filter(Boolean).join(", ");

  return (
    <button
      onClick={onToggle}
      className={`
        w-full text-left bg-white rounded-xl border transition-all duration-200
        ${expanded
          ? "border-[#116dff]/40 shadow-md ring-2 ring-[#116dff]/10"
          : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
        }
      `}
    >
      {/* ── Compact header (always visible) ─── */}
      <div className="flex items-center gap-3 p-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
          active ? "kpi-icon-blue" : "kpi-icon-red"
        }`}>
          <Building2 className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">
            {site.FullName}
          </p>
          {site.ShortName !== site.FullName && (
            <p className="text-[11px] text-muted-foreground truncate">{site.ShortName}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            active ? "badge-ok" : "badge-crit"
          }`}>
            {active ? "Activo" : "Inactivo"}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`} />
        </div>
      </div>

      {/* ── Expanded detail ─────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">

          {/* Address + location */}
          <div className="space-y-1.5">
            {address && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span className="leading-relaxed">{address}</span>
              </div>
            )}
            {site.CountryDescription && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{site.CountryDescription}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              {active
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              <span className={active ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                {active ? "Operativo" : "Fuera de servicio"}
              </span>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2">

            <MiniKpi
              icon={ReceiptText}
              label="Transacciones · 30d"
              value={stats ? stats.txCount.toLocaleString("es-AR") : "—"}
              color="blue"
            />

            <MiniKpi
              icon={TrendingUp}
              label="Volumen · 30d"
              value={stats ? formatVolume(stats.totalVolume) : "—"}
              color="green"
            />

            <MiniKpi
              icon={Calendar}
              label="Última transacción"
              value={stats?.lastTxDate ? formatDate(stats.lastTxDate) : "Sin datos"}
              color="slate"
            />

            <MiniKpi
              icon={Fuel}
              label="Combustible principal"
              value={stats?.topFuel ?? "—"}
              color="amber"
            />

          </div>

          {!stats && (
            <p className="text-[11px] text-muted-foreground text-center py-1">
              Sin transacciones registradas en los últimos 30 días
            </p>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Mini KPI dentro del card expandido ──────────────────
function MiniKpi({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "blue" | "green" | "amber" | "slate";
}) {
  const iconCls = {
    blue:  "kpi-icon-blue",
    green: "kpi-icon-green",
    amber: "kpi-icon-amber",
    slate: "kpi-icon-slate",
  }[color];

  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-md mb-2 ${iconCls}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-xs font-semibold text-foreground leading-tight truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
