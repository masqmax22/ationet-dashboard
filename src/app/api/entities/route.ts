import { fetchUserEntities } from "@/lib/ationet/auth";

const DEFAULT_BASE_URL = "https://api.ationet.com";

/**
 * Descubre las redes/compañías a las que tiene acceso un usuario.
 * Body: { username, password, baseUrl? } → { entities: [{Id, Name, Type, RoleName}] }
 * No persiste nada (no setea cookie).
 */
export async function POST(request: Request) {
  let body: { username?: string; password?: string; baseUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  const baseUrl = (body.baseUrl ?? "").trim() || DEFAULT_BASE_URL;

  if (!username || !password) {
    return Response.json({ error: "Usuario y contraseña son obligatorios." }, { status: 400 });
  }

  try {
    const entities = await fetchUserEntities(baseUrl, username, password);
    return Response.json({ entities });
  } catch (err) {
    return Response.json(
      { error: "No se pudieron obtener las redes.", detail: (err as Error).message },
      { status: 401 }
    );
  }
}
