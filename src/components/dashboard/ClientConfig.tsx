"use client";

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2, Plus, Pencil, Trash2, CheckCircle2, XCircle, Eye, EyeOff,
  Zap, Server, ShieldAlert, Loader2, RotateCcw, Save, PlugZap, Search, Network,
} from "lucide-react";
import {
  loadProfiles, saveProfiles, emptyProfile, type ClientProfile,
} from "@/lib/clientProfiles";

/** Vista pública (sin contraseña) de la config activa, devuelta por /api/session. */
interface AtiConfigPublic {
  source: "cookie" | "env";
  username: string;
  networkId: string;
  networkName: string;
  baseUrl: string;
  entityType: string;
}

/** Entidad (red/compañía) devuelta por /api/entities. */
interface Entity {
  Id: string;
  Name: string;
  Type: string;
  RoleName?: string;
}

const inputCls =
  "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground " +
  "outline-none focus:ring-2 focus:ring-[#116dff]/20 focus:border-[#116dff]/40 placeholder:text-muted-foreground";
const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5";

type Msg = { type: "ok" | "err" | "info"; text: string } | null;

function sameTarget(p: ClientProfile, a: AtiConfigPublic | null): boolean {
  if (!a || a.source !== "cookie") return false;
  return (
    p.username.trim() === a.username &&
    p.networkId.trim() === a.networkId &&
    (p.baseUrl.trim() || "https://api.ationet.com") === a.baseUrl
  );
}

export function ClientConfig() {
  const queryClient = useQueryClient();
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [active, setActive] = useState<AtiConfigPublic | null>(null);
  const [editing, setEditing] = useState<ClientProfile | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null); // "activate:<id>" | "test" | "save" | "reset" | "discover"
  const [entities, setEntities] = useState<Entity[] | null>(null);
  const [entityFilter, setEntityFilter] = useState("");

  const refreshActive = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      setActive(data.active ?? null);
    } catch {
      setActive(null);
    }
  }, []);

  useEffect(() => {
    setProfiles(loadProfiles());
    refreshActive();
  }, [refreshActive]);

  function persist(list: ClientProfile[]) {
    setProfiles(list);
    saveProfiles(list);
  }

  // ─── Acciones ────────────────────────────────────────────
  async function activate(profile: ClientProfile) {
    setBusy(`activate:${profile.id}`);
    setMsg(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.detail || data.error || "No se pudo activar el perfil." });
        return;
      }
      setActive(data.active ?? null);
      // Forzar recarga de todos los datos con el nuevo cliente.
      await queryClient.invalidateQueries();
      setMsg({ type: "ok", text: `Cliente activado: ${profile.name || profile.networkName}. Los datos se recargaron.` });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function test(profile: ClientProfile) {
    setBusy("test");
    setMsg(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, test: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.detail || data.error || "La conexión falló." });
        return;
      }
      setMsg({ type: "ok", text: "✓ Conexión válida — ATIONet autenticó correctamente." });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function discover() {
    if (!editing) return;
    if (!editing.username.trim() || !editing.password) {
      setMsg({ type: "err", text: "Cargá usuario y contraseña para buscar las redes." });
      return;
    }
    setBusy("discover");
    setMsg(null);
    setEntities(null);
    setEntityFilter("");
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editing.username,
          password: editing.password,
          baseUrl: editing.baseUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.detail || data.error || "No se pudieron obtener las redes." });
        return;
      }
      const list: Entity[] = data.entities ?? [];
      setEntities(list);
      if (list.length === 0) {
        setMsg({ type: "info", text: "El usuario autenticó pero no tiene redes asociadas." });
      } else {
        setMsg({ type: "ok", text: `Se encontraron ${list.length} red(es). Elegí una para autocompletar.` });
      }
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  function pickEntity(e: Entity) {
    if (!editing) return;
    setEditing({
      ...editing,
      networkId: e.Id,
      networkName: e.Name,
      entityType: e.Type || "Network",
      name: editing.name.trim() || e.Name,
    });
    setMsg({ type: "info", text: `Red seleccionada: ${e.Name}. Probá la conexión o guardá.` });
  }

  async function resetToEnv() {
    setBusy("reset");
    setMsg(null);
    try {
      const res = await fetch("/api/session", { method: "DELETE" });
      const data = await res.json();
      setActive(data.active ?? null);
      await queryClient.invalidateQueries();
      setMsg({ type: "info", text: "Se volvió a la configuración por defecto (entorno)." });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  function saveProfile(profile: ClientProfile, thenActivate: boolean) {
    if (!profile.name.trim()) {
      setMsg({ type: "err", text: "Poné un nombre al perfil (ej. el nombre del cliente)." });
      return;
    }
    if (!profile.username.trim() || !profile.password || !profile.networkId.trim() || !profile.networkName.trim()) {
      setMsg({ type: "err", text: "Completá usuario, contraseña, network id y network name." });
      return;
    }
    const exists = profiles.some(p => p.id === profile.id);
    const list = exists
      ? profiles.map(p => (p.id === profile.id ? profile : p))
      : [...profiles, profile];
    persist(list);
    setEditing(null);
    setShowPass(false);
    setEntities(null);
    if (thenActivate) {
      activate(profile);
    } else {
      setMsg({ type: "ok", text: "Perfil guardado." });
    }
  }

  function remove(id: string) {
    persist(profiles.filter(p => p.id !== id));
    if (editing?.id === id) setEditing(null);
    setMsg({ type: "info", text: "Perfil eliminado." });
  }

  const envActive = active?.source === "env";
  const cookieActive = active?.source === "cookie";

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">

      {/* Aviso de seguridad */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs">
        <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-amber-800 leading-relaxed">
          <p className="font-semibold">Sobre las credenciales</p>
          <p className="mt-0.5">
            Los perfiles se guardan <b>solo en este navegador</b>. Al activar uno, las credenciales se validan
            contra ATIONet y quedan en una cookie de sesión <b>httpOnly</b> (no accesible por scripts). El
            dashboard <b>no tiene login</b>: cualquiera con la URL usa el cliente activo. No uses este equipo si
            es compartido con personas que no deban ver estos datos.
          </p>
        </div>
      </div>

      {/* Estado activo */}
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${cookieActive ? "kpi-icon-blue" : "kpi-icon-slate"}`}>
              {cookieActive ? <Zap className="h-5 w-5" /> : <Server className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cliente activo</p>
              {active ? (
                <>
                  <p className="text-sm font-bold text-foreground leading-tight">{active.networkName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {active.username} · {active.baseUrl}
                    {" · "}
                    <span className={cookieActive ? "text-[#116dff] font-medium" : ""}>
                      {cookieActive ? "Perfil seleccionado" : "Configuración por defecto (entorno)"}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-red-600">Sin configuración activa</p>
              )}
            </div>
          </div>
          {cookieActive && (
            <button
              onClick={resetToEnv}
              disabled={busy === "reset"}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors disabled:opacity-60"
            >
              {busy === "reset" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Volver al default
            </button>
          )}
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div className={`flex items-start gap-2 rounded-xl p-3.5 text-xs border ${
          msg.type === "ok" ? "bg-emerald-50 border-emerald-100 text-emerald-800"
          : msg.type === "err" ? "bg-red-50 border-red-100 text-red-700"
          : "bg-blue-50 border-blue-100 text-blue-800"
        }`}>
          {msg.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            : msg.type === "err" ? <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            : <PlugZap className="h-4 w-4 shrink-0 mt-0.5" />}
          <span className="leading-relaxed break-words">{msg.text}</span>
        </div>
      )}

      {/* Lista de perfiles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="section-title">Perfiles de cliente</h2>
            <p className="section-subtitle">Redes ATIONet guardadas en este navegador</p>
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(emptyProfile()); setShowPass(false); setMsg(null); setEntities(null); }}
              className="flex items-center gap-2 bg-[#116dff] hover:bg-[#0f5ee8] text-white text-xs font-medium rounded-lg px-3 py-2 shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo perfil
            </button>
          )}
        </div>

        {profiles.length === 0 && !editing && (
          <div className="panel p-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 mx-auto mb-3">
              <Building2 className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">Sin perfiles guardados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Creá un perfil para apuntar el dashboard a un cliente. Mientras tanto se usa la configuración por defecto.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {profiles.map(p => {
            const isActive = sameTarget(p, active);
            return (
              <div key={p.id} className={`panel p-4 flex items-center gap-4 ${isActive ? "ring-2 ring-[#116dff]/20 border-[#116dff]/30" : ""}`}>
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${isActive ? "kpi-icon-blue" : "kpi-icon-slate"}`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name || p.networkName}</p>
                    {isActive && <span className="badge-ok text-[10px] px-2 py-0.5 rounded-full shrink-0">Activo</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.networkName} · {p.username}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => activate(p)}
                    disabled={busy === `activate:${p.id}` || isActive}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#116dff] hover:bg-[#0f5ee8] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {busy === `activate:${p.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    {isActive ? "Activo" : "Activar"}
                  </button>
                  <button
                    onClick={() => { setEditing({ ...p }); setShowPass(false); setMsg(null); setEntities(null); }}
                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulario */}
      {editing && (
        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {profiles.some(p => p.id === editing.id) ? "Editar perfil" : "Nuevo perfil"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nombre del perfil</label>
              <input className={inputCls} placeholder="Ej. Cerro Vanguardia"
                value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Usuario</label>
              <input className={inputCls} placeholder="usuario@ationet.com" autoComplete="off"
                value={editing.username} onChange={e => setEditing({ ...editing, username: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Contraseña</label>
              <div className="relative">
                <input className={inputCls + " pr-10"} type={showPass ? "text" : "password"} autoComplete="new-password"
                  value={editing.password} onChange={e => setEditing({ ...editing, password: e.target.value })} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Descubrir redes del usuario */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-blue-800">
                  <Network className="h-3.5 w-3.5 shrink-0" />
                  <span>¿No sabés el Network ID? Buscá las redes de este usuario y elegí una.</span>
                </div>
                <button
                  type="button"
                  onClick={discover}
                  disabled={busy === "discover"}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#116dff] hover:bg-[#0f5ee8] rounded-lg px-3 py-1.5 shrink-0 transition-colors disabled:opacity-60"
                >
                  {busy === "discover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Buscar mis redes
                </button>
              </div>

              {entities && entities.length > 0 && (() => {
                const q = entityFilter.trim().toLowerCase();
                const matches = q
                  ? entities.filter(e => e.Name.toLowerCase().includes(q) || e.Id.toLowerCase().includes(q))
                  : entities;
                const shown = matches.slice(0, 50);
                return (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        className={inputCls + " pl-8"}
                        placeholder={`Filtrar ${entities.length} redes...`}
                        value={entityFilter}
                        onChange={e => setEntityFilter(e.target.value)}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {matches.length} resultado{matches.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="max-h-52 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {shown.map(ent => {
                    const selected = ent.Id === editing.networkId;
                    return (
                      <button
                        key={ent.Id}
                        type="button"
                        onClick={() => pickEntity(ent)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors ${selected ? "bg-blue-50/60" : ""}`}
                      >
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-foreground truncate">{ent.Name}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono truncate">
                            {ent.Type}{ent.RoleName ? ` · ${ent.RoleName}` : ""} · {ent.Id}
                          </span>
                        </span>
                        {selected && <CheckCircle2 className="h-4 w-4 text-[#116dff] shrink-0" />}
                      </button>
                    );
                  })}
                  </div>
                  {matches.length > shown.length && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Mostrando {shown.length} de {matches.length}. Afiná el filtro para ver más.
                    </p>
                  )}
                </div>
                );
              })()}
            </div>

            <div>
              <label className={labelCls}>Network ID</label>
              <input className={inputCls} placeholder="GUID de la red" autoComplete="off"
                value={editing.networkId} onChange={e => setEditing({ ...editing, networkId: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Network Name</label>
              <input className={inputCls} placeholder="Nombre de la red" autoComplete="off"
                value={editing.networkName} onChange={e => setEditing({ ...editing, networkName: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Base URL</label>
              <input className={inputCls} placeholder="https://api.ationet.com"
                value={editing.baseUrl} onChange={e => setEditing({ ...editing, baseUrl: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Tipo de entidad</label>
              <input className={inputCls} placeholder="N"
                value={editing.entityType} onChange={e => setEditing({ ...editing, entityType: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <button
              onClick={() => test(editing)}
              disabled={busy === "test"}
              className="flex items-center gap-2 text-xs font-medium text-[#116dff] border border-[#116dff]/30 bg-blue-50/50 hover:bg-blue-50 rounded-lg px-3 py-2 transition-colors disabled:opacity-60"
            >
              {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
              Probar conexión
            </button>
            <button
              onClick={() => saveProfile(editing, false)}
              className="flex items-center gap-2 text-xs font-medium text-foreground border border-border hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </button>
            <button
              onClick={() => saveProfile(editing, true)}
              className="flex items-center gap-2 bg-[#116dff] hover:bg-[#0f5ee8] text-white text-xs font-medium rounded-lg px-3 py-2 shadow-sm transition-colors"
            >
              <Zap className="h-3.5 w-3.5" /> Guardar y activar
            </button>
            <button
              onClick={() => { setEditing(null); setShowPass(false); setEntities(null); }}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
