"use client";

import { useState } from "react";
import type { CheckinResult, Provider, Referral } from "@/lib/types";

const DEMOS = [
  { label: "Told no Pap", text: "yeah got seen tues, everyone was really nice but she said i didn't need a pap since i'm gay??" },
  { label: "Went well", text: "went last week, took about 2 weeks to get in. got my pap done and they were great" },
  { label: "No callback", text: "called twice and nobody ever called me back" },
];

export function CheckinPanel({
  referrals,
  providers,
  onResult,
}: {
  referrals: Referral[];
  providers: Provider[];
  onResult: (referral: Referral, result: CheckinResult, text: string) => void;
}) {
  const [referralId, setReferralId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<CheckinResult | null>(null);

  const nameOf = (id: string) => providers.find((p) => p.id === id)?.name ?? id;
  const selected = referrals.find((r) => r.id === referralId) ?? referrals[referrals.length - 1];

  async function submit() {
    if (!selected || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Check-in failed");
      setLast(json);
      onResult(selected, json, text);
      if (!json.crisis) setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">2 · Client check-in (simulated text)</h2>
      {referrals.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Log a referral on a provider card first. Four weeks later, the client gets an opt-in text.</p>
      ) : (
        <>
          <label className="mt-3 block text-xs text-[var(--muted)]">
            Referral
            <select
              value={selected?.id}
              onChange={(e) => setReferralId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--ink)]"
            >
              {referrals.map((r) => (
                <option key={r.id} value={r.id}>
                  {nameOf(r.providerId)} · cervical screening
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 rounded-xl bg-[var(--chip)] p-3 text-sm text-[var(--ink)]">
            <span className="text-xs text-[var(--muted)]">Bound → client:</span>
            <p className="mt-0.5">Hi! Checking in on the screening referral. Were you able to get seen, and did you get your Pap done? How were you treated?</p>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Client's reply…"
            className="mt-3 w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {DEMOS.map((d) => (
              <button
                key={d.label}
                onClick={() => setText(d.text)}
                className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {d.label}
              </button>
            ))}
            <button
              onClick={submit}
              disabled={busy || !text.trim()}
              className="ml-auto rounded-full bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--card)] disabled:opacity-40"
            >
              {busy ? "Reading reply…" : "Record reply"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-[var(--bad-ink)]">{error}</p>}
          {last?.crisis && (
            <p className="mt-3 rounded-lg bg-[var(--bad)] px-3 py-2 text-sm font-medium text-white">
              Crisis language detected: hand off to staff now. No automated reply was sent and no outcome was recorded.
            </p>
          )}
          {last && !last.crisis && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <span className="text-[var(--muted)]">Claude extracted:</span>
              <Chip ok={last.got_appt}>appointment</Chip>
              <Chip ok={last.care_completed}>Pap done</Chip>
              {last.respected != null && <Chip ok={last.respected >= 4}>respect {last.respected}/5</Chip>}
              <Chip ok={!last.had_to_explain}>{last.had_to_explain ? "had to explain identity" : "no identity explaining"}</Chip>
              {last.tag !== "none" && <Chip ok={false}>{last.tag.replaceAll("_", " ")}</Chip>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-medium ${
        ok ? "bg-[var(--complete)]/15 text-[var(--complete-ink)]" : "bg-[var(--bad)]/12 text-[var(--bad-ink)]"
      }`}
    >
      {ok ? "✓" : "✗"} {children}
    </span>
  );
}
