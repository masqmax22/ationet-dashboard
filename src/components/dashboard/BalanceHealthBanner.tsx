"use client";

import { useBalanceWidget } from "@/hooks/useBalanceWidget";
import { useHealthWidget } from "@/hooks/useHealthWidget";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, AlertTriangle, CheckCircle2, XCircle,
  Activity, TrendingUp, Clock,
} from "lucide-react";
import { formatCurrency, formatVolume } from "@/lib/utils";

function statusIcon(s: number) {
  if (s === 0) return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  if (s === 1) return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
}

function KpiCard({
  icon: Icon, iconClass, label, value, sub, badge, badgeClass,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  badgeClass?: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconClass}`}>
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </div>
        {badge && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

export function BalanceHealthBanner() {
  const balQuery  = useBalanceWidget();
  const healthQuery = useHealthWidget();
  const isLoading = balQuery.isLoading || healthQuery.isLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  const balances = balQuery.data ?? [];
  const health   = healthQuery.data?.HealthItems ?? [];
  const criticalCount = health.filter(h => h.Status === 0).length;
  const warnCount     = health.filter(h => h.Status === 1).length;
  const issues        = health.filter(h => h.Status < 2);

  const totalBalance = balances.reduce((s, b) => s + b.AvailableBalance, 0);
  const moneyContracts  = balances.filter(b => b.CurrentAccountMode === "Money");
  const volumeContracts = balances.filter(b => b.CurrentAccountMode === "Volume");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

      {/* Total balance (money) */}
      <KpiCard
        icon={Wallet}
        iconClass="kpi-icon-blue"
        label="Balance disponible total"
        value={formatCurrency(totalBalance)}
        badge={`${moneyContracts.length} contrato${moneyContracts.length !== 1 ? "s" : ""}`}
        badgeClass="bg-blue-50 text-[#116dff]"
      />

      {/* Contract 1 */}
      {balances[0] ? (
        <KpiCard
          icon={TrendingUp}
          iconClass="kpi-icon-slate"
          label={balances[0].CompanyContractCode ? `Contrato #${balances[0].CompanyContractCode}` : "Contrato principal"}
          value={
            balances[0].CurrentAccountMode === "Volume"
              ? formatVolume(balances[0].AvailableBalance)
              : formatCurrency(balances[0].AvailableBalance)
          }
          sub={
            balances[0].RemainingOperatingDays > 9999
              ? "Sin límite de días"
              : `${balances[0].RemainingOperatingDays.toLocaleString()} días restantes`
          }
        />
      ) : (
        <KpiCard icon={TrendingUp} iconClass="kpi-icon-slate" label="Sin contratos" value="—" />
      )}

      {/* Volumen contracts */}
      {volumeContracts.length > 0 ? (
        <KpiCard
          icon={Clock}
          iconClass="kpi-icon-amber"
          label="Contratos en volumen"
          value={volumeContracts.length.toString()}
          sub={volumeContracts.map(c => `#${c.CompanyContractCode}`).join(", ")}
          badge="Volumen"
          badgeClass="bg-amber-50 text-amber-700"
        />
      ) : (
        <KpiCard
          icon={Clock}
          iconClass="kpi-icon-slate"
          label="Contratos en volumen"
          value="0"
          sub="Sin contratos de volumen"
        />
      )}

      {/* Health */}
      <div className="kpi-card">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
            criticalCount > 0 ? "kpi-icon-red" : warnCount > 0 ? "kpi-icon-amber" : "kpi-icon-green"
          }`}>
            <Activity className="h-[18px] w-[18px]" />
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            criticalCount > 0 ? "badge-crit" : warnCount > 0 ? "badge-warn" : "badge-ok"
          }`}>
            {criticalCount > 0
              ? `${criticalCount} crítico${criticalCount > 1 ? "s" : ""}`
              : warnCount > 0 ? `${warnCount} alerta${warnCount > 1 ? "s" : ""}` : "OK"}
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight leading-none">
          {issues.length === 0 ? "Saludable" : `${issues.length} issue${issues.length > 1 ? "s" : ""}`}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">Estado de la red</p>
        <div className="mt-2 space-y-1">
          {issues.slice(0, 2).map((item, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {statusIcon(item.Status)}
              <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{item.Mesagge}</p>
            </div>
          ))}
          {issues.length === 0 && (
            <p className="text-[11px] text-emerald-600">Todos los componentes operativos</p>
          )}
        </div>
      </div>
    </div>
  );
}
