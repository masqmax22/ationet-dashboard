"use client";

/** Perfil de cliente (red ATIONet) guardado en el navegador. */
export interface ClientProfile {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  password: string;
  networkId: string;
  networkName: string;
  entityType: string;
}

const STORAGE_KEY = "ationet_client_profiles";

export function loadProfiles(): ClientProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveProfiles(list: ClientProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage no disponible (modo privado, etc.) — ignoramos */
  }
}

export function newProfileId(): string {
  return `cp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function emptyProfile(): ClientProfile {
  return {
    id: newProfileId(),
    name: "",
    baseUrl: "https://api.ationet.com",
    username: "",
    password: "",
    networkId: "",
    networkName: "",
    entityType: "N",
  };
}
