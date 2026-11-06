import { parseCheckin } from "@/lib/claude";
import { errorResponse, readText } from "@/lib/route-util";

export async function POST(req: Request) {
  const text = await readText(req);
  if (text instanceof Response) return text;
  try {
    return Response.json(await parseCheckin(text));
  } catch (err) {
    return errorResponse(err);
  }
}
