import type { AtiTokenResponse } from "./types";

interface TokenCache {
  token: string;
  expiresAt: number; // Unix ms
}

// Module-level singleton — persists across requests in the same Node.js process
let cache: TokenCache | null = null;

export async function getToken(): Promise<string> {
  // Refresh 60 seconds before real expiry as a safety buffer
  if (cache && cache.expiresAt > Date.now() + 60_000) {
    return cache.token;
  }
  cache = await fetchFreshToken();
  return cache.token;
}

export function invalidateToken(): void {
  cache = null;
}

async function fetchFreshToken(): Promise<TokenCache> {
  const { ATIONET_USERNAME, ATIONET_PASSWORD, ATIONET_NETWORK_ID, ATIONET_NETWORK_NAME, ATIONET_ENTITY_TYPE, ATIONET_BASE_URL } = process.env;

  if (!ATIONET_USERNAME || !ATIONET_PASSWORD || !ATIONET_NETWORK_ID || !ATIONET_NETWORK_NAME) {
    throw new Error("Missing Ationet credentials in environment variables");
  }

  const entity = JSON.stringify({
    Id: ATIONET_NETWORK_ID,
    Name: ATIONET_NETWORK_NAME,
    Type: ATIONET_ENTITY_TYPE ?? "N",
  });

  const body = new URLSearchParams({
    grant_type: "password",
    username: ATIONET_USERNAME,
    password: ATIONET_PASSWORD,
    entity,
  });

  const res = await fetch(`${ATIONET_BASE_URL}/Token`, {
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
