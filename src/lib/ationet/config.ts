import { cookies } from "next/headers";

/** Credenciales/parámetros para apuntar a una red ATIONet (un "cliente"). */
export interface AtiConfig {
  baseUrl: string;
  username: string;
  password: string;
  networkId: string;
  networkName: string;
  entityType: string;
}

/** Vista pública (sin contraseña) de una configuración, para la UI. */
export interface AtiConfigPublic {
  source: "cookie" | "env";
  username: string;
  networkId: string;
  networkName: string;
  baseUrl: string;
  entityType: string;
}

export const SESSION_COOKIE = "ationet_session";

const DEFAULT_BASE_URL = "https://api.ationet.com";
// ATIONet espera el tipo de entidad como palabra completa ("Network", "Company", …).
const DEFAULT_ENTITY_TYPE = "Network";

/** Config desde variables de entorno (el default del despliegue). */
export function getEnvConfig(): AtiConfig | null {
  const {
    ATIONET_USERNAME, ATIONET_PASSWORD, ATIONET_NETWORK_ID,
    ATIONET_NETWORK_NAME, ATIONET_ENTITY_TYPE, ATIONET_BASE_URL,
  } = process.env;

  if (!ATIONET_USERNAME || !ATIONET_PASSWORD || !ATIONET_NETWORK_ID || !ATIONET_NETWORK_NAME) {
    return null;
  }
  return {
    baseUrl: ATIONET_BASE_URL || DEFAULT_BASE_URL,
    username: ATIONET_USERNAME,
    password: ATIONET_PASSWORD,
    networkId: ATIONET_NETWORK_ID,
    networkName: ATIONET_NETWORK_NAME,
    entityType: ATIONET_ENTITY_TYPE || DEFAULT_ENTITY_TYPE,
  };
}

/** Normaliza un objeto arbitrario a AtiConfig (con defaults). Devuelve null si faltan campos. */
export function normalizeConfig(obj: Partial<AtiConfig> | null | undefined): AtiConfig | null {
  if (!obj) return null;
  const username = (obj.username ?? "").trim();
  const password = obj.password ?? "";
  const networkId = (obj.networkId ?? "").trim();
  const networkName = (obj.networkName ?? "").trim();
  if (!username || !password || !networkId || !networkName) return null;
  return {
    baseUrl: (obj.baseUrl ?? "").trim() || DEFAULT_BASE_URL,
    username,
    password,
    networkId,
    networkName,
    entityType: (obj.entityType ?? "").trim() || DEFAULT_ENTITY_TYPE,
  };
}

export function encodeConfig(cfg: AtiConfig): string {
  return Buffer.from(JSON.stringify(cfg), "utf8").toString("base64");
}

export function decodeConfig(raw: string): AtiConfig | null {
  try {
    const obj = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    return normalizeConfig(obj);
  } catch {
    return null;
  }
}

/**
 * Config activa para esta request: primero la cookie de sesión (cliente
 * seleccionado en la UI), si no, las variables de entorno. Lanza si no hay
 * ninguna.
 */
export async function getActiveConfig(): Promise<AtiConfig> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const cfg = decodeConfig(raw);
    if (cfg) return cfg;
  }
  const env = getEnvConfig();
  if (env) return env;
  throw new Error(
    "No hay configuración activa: ni perfil de cliente seleccionado ni credenciales de entorno."
  );
}

export function publicConfig(cfg: AtiConfig, source: "cookie" | "env"): AtiConfigPublic {
  return {
    source,
    username: cfg.username,
    networkId: cfg.networkId,
    networkName: cfg.networkName,
    baseUrl: cfg.baseUrl,
    entityType: cfg.entityType,
  };
}
