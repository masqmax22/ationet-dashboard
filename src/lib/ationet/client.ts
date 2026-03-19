import { getToken, invalidateToken } from "./auth";

export class AtiNetError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly path: string
  ) {
    super(`Ationet API error ${status} on ${path}`);
    this.name = "AtiNetError";
  }
}

export async function ationetFetch<T>(
  path: string,
  params?: Record<string, string>,
  options?: RequestInit
): Promise<T> {
  const result = await doFetch<T>(path, params, options, false);
  return result;
}

async function doFetch<T>(
  path: string,
  params: Record<string, string> | undefined,
  options: RequestInit | undefined,
  isRetry: boolean
): Promise<T> {
  const token = await getToken();
  const base = process.env.ATIONET_BASE_URL ?? "https://api.ationet.com";

  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const method = options?.method?.toUpperCase() ?? "GET";
  const isBodyRequest = method === "POST" || method === "PUT" || method === "PATCH";

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      // Ationet API only supports gzip/deflate — Node.js fetch sends "br" by default
      // which causes Ationet to throw "Encoding 'br' is not supported".
      "Accept-Encoding": "gzip, deflate",
      // Only send Content-Type on requests that carry a body.
      ...(isBodyRequest ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });

  // If 401 on first attempt, clear cached token and retry once
  if (res.status === 401 && !isRetry) {
    invalidateToken();
    return doFetch<T>(path, params, options, true);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[AtiNet] ${res.status} on ${path}:`, body.slice(0, 500));
    throw new AtiNetError(res.status, body, path);
  }

  return res.json() as Promise<T>;
}
