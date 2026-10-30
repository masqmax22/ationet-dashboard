import { cookies } from "next/headers";
import {
  SESSION_COOKIE, encodeConfig, decodeConfig, getEnvConfig,
  publicConfig, normalizeConfig, type AtiConfig,
} from "@/lib/ationet/config";
import { getToken } from "@/lib/ationet/auth";

const MAX_AGE = 60 * 60 * 12; // 12 h

/** Config activa (sin contraseña): perfil de cookie o default de entorno. */
export async function GET() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const cfg = decodeConfig(raw);
    if (cfg) return Response.json({ active: publicConfig(cfg, "cookie") });
  }
  const env = getEnvConfig();
  return Response.json({ active: env ? publicConfig(env, "env") : null });
}

/**
 * Valida un perfil contra ATIONet.
 *  - `{ test: true }`  → solo prueba la conexión, no activa.
 *  - sin `test`        → activa: setea la cookie httpOnly de sesión.
 */
export async function POST(request: Request) {
  let body: Partial<AtiConfig> & { test?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cfg = normalizeConfig(body);
  if (!cfg) {
    return Response.json(
      { error: "Faltan campos obligatorios: usuario, contraseña, network id y network name." },
      { status: 400 }
    );
  }

  // Validar credenciales contra ATIONet (hace el login real).
  try {
    await getToken(cfg);
  } catch (err) {
    return Response.json(
      { error: "No se pudo autenticar con ATIONet.", detail: (err as Error).message },
      { status: 401 }
    );
  }

  // Modo "probar conexión": no persistimos nada.
  if (body.test) {
    return Response.json({ ok: true, tested: true });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, encodeConfig(cfg), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });

  return Response.json({ ok: true, active: publicConfig(cfg, "cookie") });
}

/** Limpia la sesión → vuelve al default de entorno. */
export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  const env = getEnvConfig();
  return Response.json({ ok: true, active: env ? publicConfig(env, "env") : null });
}
