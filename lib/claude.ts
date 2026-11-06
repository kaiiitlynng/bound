import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { TAGS, type CheckinResult, type Explanation, type NeedFilters } from "./types";

let _client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set: add it to .env.local and restart `npm run dev`");
  }
  return (_client ??= new Anthropic());
}

const FAST = "claude-haiku-5-5";
const WRITER = "claude-sonnet-5-5";

const SAFETY = `You support staff at an LGBTQ community health center who refer clients to care.
Rules:
- Never give medical advice or diagnose. You route people to providers and summarize; clinical questions go to the provider.
- Never invent statistics. Use only numbers you are given.
- Never ask for, repeat, or store client names, dates of birth, phone numbers, or other identifiers.`;

// ---------- 1. intake parsing ----------
const NeedSchema = z.object({
  care_type: z.enum(["cervical_screening", "primary_care"]),
  insurance: z.enum(["uninsured", "medicaid", "private", "unknown"]),
  needs_evening: z.boolean(),
  needs_transit: z.boolean(),
  language: z.string(),
  pii_detected: z.boolean(),
});

export async function parseNeed(text: string): Promise<NeedFilters> {
  const res = await anthropic().messages.parse({
    model: FAST,
    max_tokens: 2000,
    system: `${SAFETY}

Turn the navigator's plain-language description of a client's need into referral filters.
- care_type: "cervical_screening" for Pap / HPV / cervical screening / "overdue"; "primary_care" if they only need a regular doctor.
- insurance: Medi-Cal and Medicaid map to "medicaid"; no insurance maps to "uninsured"; "unknown" if not stated.
- needs_evening: true if they work days or ask for evenings / after work.
- needs_transit: true if they have no car or rely on transit.
- language: the client's preferred language, in English (e.g. "Spanish"); "English" if not stated.
- pii_detected: true if the text contains a person's name, date of birth, phone number, address, or other identifier.`,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(NeedSchema), effort: "low" },
  });
  if (!res.parsed_output) throw new Error(`parseNeed: no parsed output (stop_reason=${res.stop_reason})`);
  return res.parsed_output;
}

// ---------- 2. check-in parsing ----------
const CheckinSchema = z.object({
  got_appt: z.boolean(),
  days_to_appt: z.number().int().nullable(),
  care_completed: z.boolean(),
  respected: z.number().int().min(1).max(5).nullable(),
  had_to_explain: z.boolean(),
  surprise_cost: z.boolean(),
  tag: z.enum(TAGS),
  crisis: z.boolean(),
});

export async function parseCheckin(text: string): Promise<CheckinResult> {
  const res = await anthropic().messages.parse({
    model: FAST,
    max_tokens: 2000,
    system: `${SAFETY}

A client was referred for cervical cancer screening (Pap / HPV test). Convert her check-in reply into an outcome record.
- got_appt: she was seen or has a confirmed appointment.
- days_to_appt: days from referral to the visit if stated or clearly implied, else null.
- care_completed: true ONLY if the Pap/HPV screening was actually done. Being seen without the screening is false.
- respected: 1–5 from her tone about how she was treated; null if she was never seen and says nothing about it.
- had_to_explain: she had to explain or defend her identity or relationships to get care.
- surprise_cost: an unexpected bill or charge.
- tag: the single most important problem, or "none":
  told_no_pap_needed (told she doesn't need a Pap/screening, e.g. because she dates women),
  long_wait, misgendered, insurance_issue, no_callback.
- crisis: true if there is any self-harm, suicidal, abuse, or immediate-danger language. Staff will follow up personally.`,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(CheckinSchema), effort: "low" },
  });
  if (!res.parsed_output) throw new Error(`parseCheckin: no parsed output (stop_reason=${res.stop_reason})`);
  return res.parsed_output;
}

// ---------- 3. explanation + booking script ----------
const ExplainSchema = z.object({
  affirming: z.string(),
  client_explainer: z.string(),
});

export async function explain(input: {
  providerName: string;
  stats: Record<string, unknown>;
  fitReasons: string[];
  need: string;
}): Promise<Explanation> {
  const res = await anthropic().beta.messages.parse({
    model: WRITER,
    max_tokens: 4000,
    // Server-side fallback: if a safety classifier declines, the API retries on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: `${SAFETY}

Write two short pieces for a navigator referring a client for cervical cancer screening:
- affirming: ONE short sentence (under 30 words) on what clients reported about how they were treated, citing only the affirming_evidence counts and quotes. A directory listing is self-reported and is NOT evidence on its own. If fewer than 3 clients rated respect, say the evidence is limited.
- client_explainer: 2–3 warm, plain sentences the client can keep: cervical screening matters for anyone with a cervix regardless of who they date, and if a provider says she doesn't need it, she can say "I'd like the screening recommended by national guidelines for my age." No other medical advice.`,
    messages: [{ role: "user", content: JSON.stringify(input) }],
    output_config: { format: betaZodOutputFormat(ExplainSchema), effort: "low" },
  });
  if (!res.parsed_output) throw new Error(`explain: no parsed output (stop_reason=${res.stop_reason})`);
  return res.parsed_output;
}
