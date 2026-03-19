"use client";

import { useState } from "react";
import { useSites } from "@/hooks/useSites";
import { useSiteStats } from "@/hooks/useSiteStats";
import { SiteStatusCard } from "./SiteStatusCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

const INITIAL_SHOW = 6;

function SiteSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  );
}

export function SiteStatusGrid({ limit }: { limit?: number }) {
  const { data, isLoading, error } = useSites();
  const { data: statsMap } = useSiteStats();
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => <SiteSkeleton key={i} />)}
    </div>
  );

  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error al cargar sitios</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );

  if (!data || data.length === 0) return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Sin sitios configurados</AlertTitle>
      <AlertDescription>No se encontraron sitios para esta suscripción.</AlertDescription>
    </Alert>
  );

  const cap     = limit ?? INITIAL_SHOW;
  const visible = expanded ? data : data.slice(0, cap);
  const hasMore = data.length > cap;

  function toggle(id: string) {
    setSelectedId(prev => (prev === id ? null : id));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(site => {
          // Match by SiteId first, then fall back to name matching
          const stats = statsMap?.get(site.Id)
            ?? statsMap?.get(site.FullName)
            ?? statsMap?.get(site.ShortName);
          return (
            <SiteStatusCard
              key={site.Id}
              site={site}
              stats={stats}
              expanded={selectedId === site.Id}
              onToggle={() => toggle(site.Id)}
            />
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-[#116dff] border border-[#116dff]/20 rounded-xl bg-blue-50/50 hover:bg-blue-50 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</>
            : <><ChevronDown className="h-3.5 w-3.5" /> Ver {data.length - cap} sitios más</>}
        </button>
      )}

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-800">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold">Telemetría de tanques:</span> Los niveles en tiempo real requieren
          integración FMS (sondas ATG). Una vez configuradas, el volumen y temperatura por tanque aparecerán aquí.
        </p>
      </div>
    </div>
  );
}
