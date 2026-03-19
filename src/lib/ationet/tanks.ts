import { ationetFetch } from "./client";
import type { AtiSite, AtiPage } from "./types";

/** Returns all sites for this network */
export async function getSites(): Promise<AtiSite[]> {
  const data = await ationetFetch<AtiPage<AtiSite>>("/Sites", {
    pageSize: "200",
  });
  return data.Content ?? [];
}
