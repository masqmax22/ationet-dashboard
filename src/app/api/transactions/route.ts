import { ationetFetch } from "@/lib/ationet/client";
import { AtiNetError } from "@/lib/ationet/client";
import { mapTransaction } from "@/lib/ationet/transactions";
import type { AtiPage, AtiRawTransaction } from "@/lib/ationet/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const dateFrom  = searchParams.get("dateFrom");
  const dateTo    = searchParams.get("dateTo");
  const page      = searchParams.get("page")     ?? "1";
  const pageSize  = searchParams.get("pageSize") ?? "50";
  const siteName  = searchParams.get("siteName");
  const fuelCode  = searchParams.get("fuelCode");
  const authCode  = searchParams.get("authCode");

  // Build params — dates are optional for full listing
  const params: Record<string, string> = {
    page,
    pageSize,
    SortField:     "DateTime",
    SortDirection: "desc",
  };
  if (dateFrom)  params.DateFrom  = dateFrom;
  if (dateTo)    params.DateTo    = dateTo;
  if (siteName)  params.SiteName  = siteName;
  if (fuelCode)  params.FuelCode  = fuelCode;
  if (authCode)  params.AuthorizationCode = authCode;

  try {
    const data = await ationetFetch<AtiPage<AtiRawTransaction>>("/Transactions", params);
    return Response.json({ ...data, Content: (data.Content ?? []).map(mapTransaction) });
  } catch (err) {
    if (err instanceof AtiNetError) {
      return Response.json({ error: "Ationet API error", detail: err.message }, { status: 502 });
    }
    return Response.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
