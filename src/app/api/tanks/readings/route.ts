import { getSites } from "@/lib/ationet/tanks";
import { AtiNetError } from "@/lib/ationet/client";

export async function GET() {
  try {
    const data = await getSites();
    return Response.json(data);
  } catch (err) {
    if (err instanceof AtiNetError) {
      return Response.json({ error: "Ationet API error", detail: err.message }, { status: 502 });
    }
    return Response.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
