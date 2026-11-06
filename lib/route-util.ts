import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export async function readText(req: Request, max = 2000): Promise<string | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body" }, { status: 400 });
  }
  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Missing 'text'" }, { status: 400 });
  }
  return text.slice(0, max);
}

export function errorResponse(err: unknown): Response {
  console.error(err);
  if (err instanceof Anthropic.AuthenticationError) {
    return Response.json({ error: "Anthropic API key missing or invalid — set ANTHROPIC_API_KEY in .env.local" }, { status: 500 });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return Response.json({ error: "Rate limited — try again in a moment" }, { status: 429 });
  }
  if (err instanceof Anthropic.APIError) {
    return Response.json({ error: `Claude API error ${err.status}: ${err.message}` }, { status: 502 });
  }
  return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
}
