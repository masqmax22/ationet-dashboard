"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw, Fuel, LayoutDashboard, ReceiptText,
  FlaskConical, MapPin, ChevronRight, Bell, Settings,
} from "lucide-react";
import { toISODate, daysAgo } from "@/lib/utils";
import { SiteStatusGrid } from "./SiteStatusGrid";
import { TransactionSummary } from "./TransactionSummary";
import { TransactionList } from "./TransactionList";
import { ReconciliationTable } from "./ReconciliationTable";
import { BalanceHealthBanner } from "./BalanceHealthBanner";
import { ClientConfig } from "./ClientConfig";

type Section = "overview" | "transactions" | "reconciliation" | "sites" | "config";

const NAV = [
  { id: "overview" as Section,       icon: LayoutDashboard, label: "Resumen" },
  { id: "transactions" as Section,   icon: ReceiptText,     label: "Transacciones" },
  { id: "reconciliation" as Section, icon: FlaskConical,    label: "Reconciliación" },
  { id: "sites" as Section,          icon: MapPin,          label: "Sitios" },
  { id: "config" as Section,         icon: Settings,        label: "Configuración" },
];

export function DashboardShell() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const [dateFrom, setDateFrom] = useState(toISODate(daysAgo(30)));
  const [dateTo, setDateTo]     = useState(toISODate());
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    await queryClient.refetchQueries();
    setRefreshing(false);
  }

  const pageTitles: Record<Section, { title: string; sub: string }> = {
    overview:        { title: "Resumen", sub: "Vista general de la red" },
    transactions:    { title: "Transacciones", sub: "Despachos del período seleccionado" },
    reconciliation:  { title: "Reconciliación de Combustible", sub: "Diferencias entre volumen esperado y actual" },
    sites:           { title: "Sitios Operativos", sub: "Estado de estaciones en la red" },
    config:          { title: "Configuración", sub: "Clientes / redes ATIONet y credenciales" },
  };
  const { title, sub } = pageTitles[section];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <nav className="sidebar-nav">
        <div className="sidebar-logo">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#116dff]">
              <Fuel className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight tracking-tight">ATIONet</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Lab Services</p>
            </div>
          </div>
        </div>

        <div className="sidebar-nav-items">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Menú
          </p>
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`nav-item w-full text-left ${section === id ? "active" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {section === id && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">msampayo@atioinc.com</span>
          </div>
        </div>
      </nav>

      {/* ── Main area ───────────────────────────────────── */}
      <div className="main-content">

        {/* Top bar */}
        <div className="top-bar">
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range */}
            <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 text-xs text-foreground shadow-sm">
              <span className="text-muted-foreground">De</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent text-xs outline-none text-foreground w-28"
              />
              <span className="text-muted-foreground">a</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent text-xs outline-none text-foreground w-28"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-[#116dff] hover:bg-[#0f5ee8] text-white text-xs font-medium rounded-lg px-3 py-2 shadow-sm transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </button>

            {/* Notification icon */}
            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors">
              <Bell className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="px-8 py-6 space-y-8 max-w-[1400px]">

          {/* ── Overview ── */}
          {section === "overview" && (
            <>
              <PageSection title="Estado de la Red" subtitle="Balance, salud y contratos activos">
                <BalanceHealthBanner />
              </PageSection>

              <PageSection title="Sitios" subtitle="Estaciones operativas">
                <SiteStatusGrid limit={6} />
              </PageSection>

              <PageSection
                title="Transacciones"
                subtitle={`${dateFrom} → ${dateTo}`}
                action={
                  <button onClick={() => setSection("transactions")} className="text-xs text-[#116dff] font-medium hover:underline">
                    Ver todo →
                  </button>
                }
              >
                <TransactionSummary dateFrom={dateFrom} dateTo={dateTo} />
              </PageSection>

              <PageSection
                title="Reconciliación"
                subtitle="Diferencias de volumen"
                action={
                  <button onClick={() => setSection("reconciliation")} className="text-xs text-[#116dff] font-medium hover:underline">
                    Ver detalle →
                  </button>
                }
              >
                <ReconciliationTable dateFrom={dateFrom} dateTo={dateTo} />
              </PageSection>
            </>
          )}

          {section === "transactions" && (
            <PageSection title="Transacciones" subtitle="Listado completo de despachos">
              <TransactionList />
            </PageSection>
          )}

          {section === "reconciliation" && (
            <PageSection title="Reconciliación" subtitle={`Período ${dateFrom} → ${dateTo}`}>
              <ReconciliationTable dateFrom={dateFrom} dateTo={dateTo} />
            </PageSection>
          )}

          {section === "sites" && (
            <PageSection title="Sitios Operativos" subtitle="Todas las estaciones en la red">
              <SiteStatusGrid />
            </PageSection>
          )}

          {section === "config" && (
            <PageSection title="Clientes" subtitle="Dirigí el dashboard a una red ATIONet u otra">
              <ClientConfig />
            </PageSection>
          )}

        </main>
      </div>
    </div>
  );
}

// ── Reusable section wrapper ───────────────────────────────
function PageSection({
  title, subtitle, children, action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}
