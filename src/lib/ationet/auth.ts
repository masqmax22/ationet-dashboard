import type { AtiTokenResponse } from "./types";
import type { AtiConfig } from "./config";

interface TokenCache {
  token: string;
  expiresAt: number; // Unix ms
}

// Token cache keyed per-client so multiple ATIONet networks can coexist in the
// same Node.js process (the config is chosen per-request via cookie/env).
const cacheMap = new Map<string, TokenCache>();

function cacheKey(c: AtiConfig): string {
  return [c.baseUrl, c.username, c.password, c.networkId, c.networkName, c.entityType].join("|");
}

export async function getToken(config: AtiConfig): Promise<string> {
  const key = cacheKey(config);
  const cached = cacheMap.get(key);
  // Refresh 60 seconds before real expiry as a safety buffer
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }
  const fresh = await fetchFreshToken(config);
  cacheMap.set(key, fresh);
  return fresh.token;
}

export function invalidateToken(config: AtiConfig): void {
  cacheMap.delete(cacheKey(config));
}

async function fetchFreshToken(config: AtiConfig): Promise<TokenCache> {
  const entity = JSON.stringify({
    Id: config.networkId,
    Name: config.networkName,
    Type: config.entityType || "N",
  });

  const body = new URLSearchParams({
    grant_type: "password",
    username: config.username,
    password: config.password,
    entity,
  });

  const res = await fetch(`${config.baseUrl}/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ationet auth failed [${res.status}]: ${text}`);
  }

  const data: AtiTokenResponse = await res.json();

  return {
    token: data.access_token,
    expiresAt: new Date(data[".expires"]).getTime(),
  };
}
