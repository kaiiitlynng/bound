import { explain } from "@/lib/claude";
import { errorResponse } from "@/lib/route-util";

export async function POST(req: Request) {
  let body: { providerName?: unknown; stats?: unknown; fitReasons?: unknown; need?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body" }, { status: 400 });
  }
  if (typeof body.providerName !== "string" || typeof body.stats !== "object" || body.stats === null) {
    return Response.json({ error: "Missing providerName or stats" }, { status: 400 });
  }
  try {
    return Response.json(
      await explain({
        providerName: body.providerName,
        stats: body.stats as Record<string, unknown>,
        fitReasons: Array.isArray(body.fitReasons) ? body.fitReasons.map(String).slice(0, 10) : [],
        need: typeof body.need === "string" ? body.need.slice(0, 500) : "",
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
