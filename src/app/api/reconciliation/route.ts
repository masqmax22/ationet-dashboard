import { getLitersWidget, getTransactions } from "@/lib/ationet/transactions";
import { AtiNetError } from "@/lib/ationet/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return Response.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  try {
    const [liters, transactions] = await Promise.all([
      getLitersWidget(),
      getTransactions(dateFrom, dateTo),
    ]);
    return Response.json({ liters, transactions });
  } catch (err) {
    if (err instanceof AtiNetError) {
      return Response.json({ error: "Ationet API error", detail: err.message }, { status: 502 });
    }
    return Response.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
