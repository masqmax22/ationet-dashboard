"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useTransactionSummary } from "@/hooks/useTransactionSummary";
import { useLitersWidget, buildDaySeries, fuelCategoriesOf, litersTotal } from "@/hooks/useLitersWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle, ReceiptText, Fuel, TrendingUp,
} from "lucide-react";
import { formatVolume } from "@/lib/utils";

const ATIO_COLORS = ["#116dff", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];

interface Props { dateFrom: string; dateTo: string; }

function KpiCard({
  icon: Icon, iconClass, label, value,
}: {
  icon: React.ElementType; iconClass: string; label: string; value: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconClass}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground ml-auto pl-4">{formatVolume(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function TransactionSummary({ dateFrom, dateTo }: Props) {
  const txQuery     = useTransactionSummary(dateFrom, dateTo);
  const litersQuery = useLitersWidget();
  const isLoading   = txQuery.isLoading || litersQuery.isLoading;
  const error       = txQuery.error || litersQuery.error;

  const liters     = litersQuery.data;
  const chartData  = liters ? buildDaySeries(liters) : [];
  const fuelCats   = liters ? fuelCategoriesOf(liters).map(f => f.name) : [];
  const totalLiters = liters ? litersTotal(liters) : 0;
  const fuelTotals = liters
    ? fuelCategoriesOf(liters)
        .map(f => ({ name: f.name, total: (liters.Liters[f.index] ?? []).reduce((a, b) => a + b, 0) }))
        .sort((a, b) => b.total - a.total)
    : [];
  const topFuel = fuelTotals[0];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error al cargar transacciones</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const txData = txQuery.data;

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={Fuel}
          iconClass="kpi-icon-blue"
          label="Volumen despachado · últimos 30 días"
          value={formatVolume(totalLiters)}
        />
        <KpiCard
          icon={TrendingUp}
          iconClass="kpi-icon-green"
          label={topFuel ? `${topFuel.name} · 30 días` : "Combustible principal"}
          value={formatVolume(topFuel?.total ?? 0)}
        />
        <KpiCard
          icon={ReceiptText}
          iconClass="kpi-icon-blue"
          label="Transacciones (muestra · últimas 50)"
          value={(txData?.totalCount ?? 0).toLocaleString("es-AR")}
        />
      </div>

      {/* Area Chart */}
      {chartData.length > 0 && (
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Despacho diario</p>
              <p className="text-xs text-muted-foreground mt-0.5">Litros por combustible · últimos 29 días</p>
            </div>
            <div className="flex items-center gap-1.5">
              {fuelCats.slice(0, 3).map((cat, i) => (
                <span key={cat} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ATIO_COLORS[i % ATIO_COLORS.length] }} />
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                {fuelCats.map((cat, i) => (
                  <linearGradient key={cat} id={`ag-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ATIO_COLORS[i % ATIO_COLORS.length]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ATIO_COLORS[i % ATIO_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={v => `${v}L`}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
              {fuelCats.map((cat, i) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={cat}
                  stroke={ATIO_COLORS[i % ATIO_COLORS.length]}
                  fill={`url(#ag-${i})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
