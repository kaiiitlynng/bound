"use client";

import { useState } from "react";
import { addWeeks, fmtDate } from "@/lib/dates";
import { affirmingEvidence, type Ranked } from "@/lib/score";
import type { Explanation, Outcome, Referral } from "@/lib/types";
import { Button, Card, Field, Segmented, inputCls } from "./ui";

export type ExplainState = Explanation | "loading" | { error: string } | undefined;

/** The "Why", separate from send/schedule. Affirming is shown with its evidence, not a bare score. */
export function WhyCard({
  r,
  outcomes,
  explanation,
  onRetry,
}: {
  r: Ranked;
  outcomes: Outcome[];
  explanation: ExplainState;
  onRetry: () => void;
}) {
  const ev = affirmingEvidence(outcomes);
  const ex = explanation && typeof explanation === "object" && "affirming" in explanation ? explanation : null;
  const loading = explanation === "loading";
  const error = explanation && typeof explanation === "object" && "error" in explanation ? explanation.error : null;

  return (
    <Card className="bg-[var(--subtle)]">
      <div>
        <div className="text-[12px] text-[var(--muted)]">Why affirming</div>
        {loading && <p className="mt-1 animate-pulse text-[13px] text-[var(--muted)]">…</p>}
        {error && (
          <p className="mt-1 text-[13px] text-[var(--bad-ink)]">
            {error}{" "}
            <button className="underline" onClick={onRetry}>
              Retry
            </button>
          </p>
        )}
        {ex && <p className="mt-1 text-[14px] leading-relaxed text-[var(--ink)]">{ex.affirming}</p>}
        {ev.rated === 0 ? (
          <p className="mt-1 text-[13px] text-[var(--muted)]">No client reports yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-[13px] text-[var(--ink)]">
            <li>
              <span className="tabular-nums">{ev.respectful}/{ev.rated}</span> <span className="text-[var(--muted)]">felt respected (4–5 of 5)</span>
            </li>
            <li>
              <span className="tabular-nums">{ev.explained}/{ev.n}</span> <span className="text-[var(--muted)]">had to explain their identity</span>
            </li>
            {ev.misgendered > 0 && (
              <li>
                <span className="tabular-nums">{ev.misgendered}</span> <span className="text-[var(--muted)]">misgendered</span>
              </li>
            )}
          </ul>
        )}
        {ev.quotes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {ev.quotes.map((q) => (
              <p key={q} className="border-l-2 border-[var(--line)] pl-2.5 text-[13px] text-[var(--muted)]">
                &ldquo;{q}&rdquo;
              </p>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          {r.provider.directoryAffirming ? "Listed as affirming in directories (self-reported). " : ""}
          {ev.n > 0 ? `${ev.n} simulated check-ins.` : ""}
        </p>
      </div>
    </Card>
  );
}

export function ReferralPanel({
  r,
  need,
  explanation,
  onConfirm,
  confirmed,
  onGoWorkspace,
  onNewReferral,
}: {
  r: Ranked;
  need: string;
  explanation: Explanation | null;
  onConfirm: (method: Referral["method"], weeks: number) => void;
  confirmed: Referral | null;
  onGoWorkspace: () => void;
  onNewReferral: () => void;
}) {
  const [method, setMethod] = useState<Referral["method"]>("text");
  const [weeks, setWeeks] = useState(4);
  const p = r.provider;
  const due = addWeeks(weeks);

  if (confirmed) {
    return (
      <Card>
        <h3 className="text-[15px] font-semibold text-[var(--ink)]">Referral logged</h3>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          {confirmed.method === "text" ? "Text" : "Call"} reminder · {fmtDate(confirmed.checkinDue)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onGoWorkspace}>Workspace</Button>
          <Button variant="secondary" onClick={onNewReferral}>
            New referral
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-[15px] font-semibold text-[var(--ink)]">{p.name}</h3>
      <p className="text-[13px] text-[var(--muted)]">
        {p.address}
        {p.phone ? ` · ${p.phone}` : ""}
      </p>

      <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
        <div className="text-[13px] font-semibold text-[var(--ink)]">Email</div>
        <EmailComposer key={`${p.id}-${explanation ? 1 : 0}-${weeks}-${method}`} r={r} need={need} explanation={explanation} due={due} method={method} />
      </div>

      <div className="mt-5 space-y-4 border-t border-[var(--line)] pt-4">
        <div className="text-[13px] font-semibold text-[var(--ink)]">Follow-up</div>
        <Field label="Check-in">
          <Segmented
            value={method}
            onChange={setMethod}
            options={[
              { value: "text", label: "Text" },
              { value: "call", label: "Call" },
            ]}
          />
        </Field>
        <Field label="In">
          <Segmented
            value={String(weeks)}
            onChange={(v) => setWeeks(Number(v))}
            options={[
              { value: "2", label: "2 wk" },
              { value: "4", label: "4 wk" },
              { value: "6", label: "6 wk" },
            ]}
          />
        </Field>
        <Button onClick={() => onConfirm(method, weeks)} className="w-full py-2">
          Log referral · {fmtDate(due)}
        </Button>
      </div>
    </Card>
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
  const [edited, setEdited] = useState<Record<"client" | "provider", string>>({ client: "", provider: "" });

  const templates = {
    client: {
      subject: `Your screening referral: ${p.name}`,
      body: [
        "Hi,",
        "",
        "Here's the provider for your cervical cancer screening (Pap/HPV test):",
        "",
        p.name,
        p.address,
        p.phone ? `Phone: ${p.phone}` : null,
        p.eveningHours ? "Evening appointments available." : null,
        "",
        explanation?.client_explainer ?? null,
        explanation ? "" : null,
        `We'll ${method === "text" ? "text" : "call"} you around ${fmtDate(due)} to see how it went.`,
        "",
        "[Your name], [Center]",
      ],
    },
    provider: {
      subject: "New patient referral: cervical cancer screening",
      body: [
        "Hello,",
        "",
        "I'm referring a new patient for a cervical cancer screening (Pap/HPV test).",
        "",
        `Needs: ${need}.`,
        "",
        "What's the best way to schedule?",
        "",
        "[Your name], [Center], [Phone]",
      ],
    },
  }[to];

  const text = edited[to] || templates.body.filter((l) => l !== null).join("\n");
  const href = `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(templates.subject)}&body=${encodeURIComponent(text)}`;

  return (
    <div className="space-y-2">
      <Segmented
        value={to}
        onChange={setTo}
        options={[
          { value: "client", label: "Client" },
          { value: "provider", label: "Provider" },
        ]}
      />
      <input type="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Email (not saved)" className={inputCls} />
      <textarea
        value={text}
        onChange={(e) => setEdited((b) => ({ ...b, [to]: e.target.value }))}
        rows={7}
        className={`${inputCls} resize-y text-[12px] leading-relaxed`}
      />
      <a
        href={href}
        className="inline-block rounded border border-[var(--line)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--subtle)]"
      >
        Open in Mail
      </a>
    </div>
  );
}
