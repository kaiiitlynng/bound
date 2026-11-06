"use client";

import { useState } from "react";
import { addWeeks, fmtDate } from "@/lib/dates";
import type { Ranked } from "@/lib/score";
import type { Explanation, Referral } from "@/lib/types";
import { Button, Card, Eyebrow, Segmented } from "./ui";

export type ExplainState = Explanation | "loading" | { error: string } | undefined;

export function ReferralPanel({
  r,
  need,
  explanation,
  onRetryExplain,
  onConfirm,
  confirmed,
  onGoWorkspace,
  onNewReferral,
}: {
  r: Ranked | null;
  need: string;
  explanation: ExplainState;
  onRetryExplain: () => void;
  onConfirm: (method: Referral["method"], weeks: number) => void;
  confirmed: Referral | null;
  onGoWorkspace: () => void;
  onNewReferral: () => void;
}) {
  const [method, setMethod] = useState<Referral["method"]>("text");
  const [weeks, setWeeks] = useState(4);

  if (confirmed) {
    return (
      <Card className="border-[var(--complete)]/50">
        <div className="text-2xl">✓</div>
        <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">Referral logged</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {confirmed.method === "text" ? "Text check-in" : "Follow-up call"} reminder set for{" "}
          <strong className="text-[var(--ink)]">{fmtDate(confirmed.checkinDue)}</strong>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onGoWorkspace}>Go to Workspace</Button>
          <Button variant="secondary" onClick={onNewReferral}>
            Start another referral
          </Button>
        </div>
      </Card>
    );
  }

  if (!r) {
    return (
      <Card>
        <Eyebrow>Send &amp; schedule</Eyebrow>
        <p className="mt-2 text-sm text-[var(--muted)]">Choose a provider.</p>
      </Card>
    );
  }

  const p = r.provider;
  const due = addWeeks(weeks);
  const ex = explanation && typeof explanation === "object" && "reason" in explanation ? explanation : null;

  return (
    <Card>
      <Eyebrow>Send &amp; schedule</Eyebrow>
      <h3 className="mt-1 text-lg font-semibold leading-snug text-[var(--ink)]">{p.name}</h3>
      <p className="text-sm text-[var(--muted)]">
        {p.address}
        {p.phone ? ` · ${p.phone}` : ""}
      </p>

      {/* a. why + script */}
      <SubStep n="a" title="Why + call script">
        {explanation === "loading" && <p className="animate-pulse text-sm text-[var(--muted)]">Writing script…</p>}
        {explanation && typeof explanation === "object" && "error" in explanation && (
          <p className="text-sm text-[var(--bad-ink)]">
            {explanation.error}{" "}
            <button className="underline" onClick={onRetryExplain}>
              Retry
            </button>
          </p>
        )}
        {ex && (
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p>{ex.reason}</p>
            <p className="whitespace-pre-line rounded-xl bg-[var(--chip)] p-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Say on the call</span>
              {ex.booking_script}
            </p>
          </div>
        )}
      </SubStep>

      {/* b. email */}
      <SubStep n="b" title="Email (optional)">
        <EmailComposer key={`${p.id}-${ex ? 1 : 0}-${weeks}-${method}`} r={r} need={need} explanation={ex} due={due} method={method} />
      </SubStep>

      {/* c. log + reminder */}
      <SubStep n="c" title="Log & set follow-up">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-xs text-[var(--muted)]">Check-in</div>
            <Segmented
              value={method}
              onChange={setMethod}
              options={[
                { value: "text", label: "Text (opted in)" },
                { value: "call", label: "Staff call" },
              ]}
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs text-[var(--muted)]">In</div>
            <Segmented
              value={String(weeks)}
              onChange={(v) => setWeeks(Number(v))}
              options={[
                { value: "2", label: "2 weeks" },
                { value: "4", label: "4 weeks" },
                { value: "6", label: "6 weeks" },
              ]}
            />
          </div>
          <Button onClick={() => onConfirm(method, weeks)} className="w-full py-2">
            Log referral · remind me {fmtDate(due)}
          </Button>
        </div>
      </SubStep>
    </Card>
  );
}

function SubStep({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--chip)] text-[11px]">{n}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function EmailComposer({
  r,
  need,
  explanation,
  due,
  method,
}: {
  r: Ranked;
  need: string;
  explanation: Explanation | null;
  due: string;
  method: Referral["method"];
}) {
  const p = r.provider;
  const [to, setTo] = useState<"client" | "provider">("client");
  const [address, setAddress] = useState("");

  const templates = {
    client: {
      subject: `Your screening referral: ${p.name}`,
      body: [
        "Hi,",
        "",
        "Here's the provider we talked about for your cervical cancer screening (Pap/HPV test):",
        "",
        p.name,
        p.address,
        p.phone ? `Phone: ${p.phone}` : null,
        p.eveningHours ? "Evening appointments available." : null,
        "",
        explanation?.client_explainer ?? null,
        explanation ? "" : null,
        `We'll ${method === "text" ? "text you" : "give you a call"} around ${fmtDate(due)} to see how it went. If you have any trouble booking, just reply to this email.`,
        "",
        "Take care,",
        "[Your name], [Center name]",
      ],
    },
    provider: {
      subject: "New patient referral: cervical cancer screening",
      body: [
        "Hello,",
        "",
        "I'm a patient navigator at [Center name], referring a new patient for a cervical cancer screening (Pap/HPV test).",
        "",
        `Needs: ${need}.`,
        "",
        "Could you let me know the best way to schedule, and whether you have availability in the next few weeks?",
        "",
        "Thank you,",
        "[Your name], [Center name], [Phone]",
      ],
    },
  }[to];

  const [body, setBody] = useState<Record<"client" | "provider", string>>({
    client: "",
    provider: "",
  });
  const text = body[to] || templates.body.filter((l) => l !== null).join("\n");
  const href = `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(templates.subject)}&body=${encodeURIComponent(text)}`;

  return (
    <div className="space-y-2">
      <Segmented
        value={to}
        onChange={setTo}
        options={[
          { value: "client", label: "To client" },
          { value: "provider", label: "To provider" },
        ]}
      />
      <input
        type="email"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={to === "client" ? "Client's email (not saved)" : "Provider's referral email"}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
      />
      <textarea
        value={text}
        onChange={(e) => setBody((b) => ({ ...b, [to]: e.target.value }))}
        rows={8}
        className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 text-xs leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--ink)]"
      />
      <a
        href={href}
        className="inline-block rounded-full border border-[var(--line)] px-4 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--chip)]"
      >
        ✉ Open in email app
      </a>
    </div>
  );
}
