"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/dates";
import { providerById, useStore, type Delta } from "@/lib/store";
import { TAG_LABELS, TAGS, type CheckinResult, type Referral, type Tag } from "@/lib/types";
import { Button, Card, Eyebrow, Field, Segmented } from "./ui";

const DEMOS = [
  { label: "Told no Pap", text: "yeah got seen tues, everyone was really nice but she said i didn't need a pap since i'm gay??" },
  { label: "Went well", text: "went last week, took about 2 weeks to get in. got my pap done and they were great" },
  { label: "No callback", text: "called twice and nobody ever called me back" },
];

interface Answers {
  gotAppt: boolean | null;
  daysToAppt: string;
  careCompleted: boolean | null;
  respected: number | null;
  hadToExplain: boolean | null;
  surpriseCost: boolean | null;
  tag: Tag;
  note: string;
}

const EMPTY: Answers = {
  gotAppt: null,
  daysToAppt: "",
  careCompleted: null,
  respected: null,
  hadToExplain: null,
  surpriseCost: null,
  tag: "none",
  note: "",
};

const yesNo = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

export function CheckinForm({ referral, onSaved, onClose }: { referral: Referral; onSaved: (d: Delta) => void; onClose: () => void }) {
  const { recordOutcome, closeReferral } = useStore();
  const provider = providerById(referral.providerId);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [a, setA] = useState<Answers>(EMPTY);
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((x) => ({ ...x, [k]: v }));

  async function fillFromReply() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not read the reply");
      const r = json as CheckinResult;
      if (r.crisis) {
        setCrisis(true);
        setReply("");
        return;
      }
      setA({
        gotAppt: r.got_appt,
        daysToAppt: r.days_to_appt != null ? String(r.days_to_appt) : "",
        careCompleted: r.care_completed,
        respected: r.respected,
        hadToExplain: r.had_to_explain,
        surpriseCost: r.surprise_cost,
        tag: r.tag,
        note: reply.slice(0, 280),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const canSave = a.gotAppt != null && (a.gotAppt === false || a.careCompleted != null);

  function save() {
    if (!canSave) return;
    const delta = recordOutcome(referral.id, {
      gotAppt: !!a.gotAppt,
      daysToAppt: a.gotAppt && a.daysToAppt ? Math.max(0, parseInt(a.daysToAppt, 10) || 0) : null,
      careCompleted: !!a.gotAppt && !!a.careCompleted,
      respected: a.gotAppt ? a.respected : null,
      hadToExplain: !!a.hadToExplain,
      surpriseCost: !!a.surpriseCost,
      tag: a.tag,
      note: a.note.trim(),
    });
    if (delta) onSaved(delta);
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Record outcome</Eyebrow>
          <h3 className="mt-1 font-semibold text-[var(--ink)]">{provider?.name}</h3>
          <p className="text-xs text-[var(--muted)]">
            Referred {fmtDate(referral.createdAt)} · {referral.method === "text" ? "text check-in" : "staff call"}
          </p>
        </div>
        <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]" aria-label="Close">
          ✕
        </button>
      </div>

      {crisis ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-[var(--bad)] px-3 py-3 text-sm font-medium text-white">
            Crisis language detected. Hand off to staff now.
          </p>
          <Button
            onClick={() => {
              closeReferral(referral.id, "handoff");
              onClose();
            }}
          >
            Mark handed off to staff
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-[var(--chip)] p-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder={referral.method === "text" ? "Paste the client's reply…" : "Jot what the client said…"}
              className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--card)] p-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {DEMOS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setReply(d.text)}
                  className="rounded-full border border-dashed border-[var(--muted)]/50 px-2.5 py-0.5 text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Demo: {d.label}
                </button>
              ))}
              <Button variant="secondary" onClick={fillFromReply} disabled={busy || !reply.trim()} className="ml-auto">
                {busy ? "Reading…" : "Fill answers from reply"}
              </Button>
            </div>
            {error && <p className="mt-2 text-xs text-[var(--bad-ink)]">{error}</p>}
          </div>


          <div className="mt-4 space-y-4">
            <Field label="1. Got an appointment?">
              <div className="flex flex-wrap items-center gap-3">
                <Segmented value={a.gotAppt} onChange={(v) => set("gotAppt", v)} options={yesNo} />
                {a.gotAppt && (
                  <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    Days to visit
                    <input
                      type="number"
                      min={0}
                      value={a.daysToAppt}
                      onChange={(e) => set("daysToAppt", e.target.value)}
                      className="w-16 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--ink)]"
                    />
                  </label>
                )}
              </div>
            </Field>
            {a.gotAppt && (
              <>
                <Field label="2. Received the screening (Pap/HPV done)?">
                  <Segmented value={a.careCompleted} onChange={(v) => set("careCompleted", v)} options={yesNo} />
                </Field>
                <Field label="3. Treated with respect?">
                  <Segmented
                    value={a.respected == null ? null : String(a.respected)}
                    onChange={(v) => set("respected", Number(v))}
                    options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
                  />
                </Field>
              </>
            )}
            <Field label="4. Had to explain or defend her identity?">
              <Segmented value={a.hadToExplain} onChange={(v) => set("hadToExplain", v)} options={yesNo} />
            </Field>
            <Field label="5. Any surprise costs?">
              <Segmented value={a.surpriseCost} onChange={(v) => set("surpriseCost", v)} options={yesNo} />
            </Field>
            <Field label="Main problem, if any">
              <select
                value={a.tag}
                onChange={(e) => set("tag", e.target.value as Tag)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                {TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t === "none" ? "None" : TAG_LABELS[t][0].toUpperCase() + TAG_LABELS[t].slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note (no names)">
              <textarea
                value={a.note}
                onChange={(e) => set("note", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--card)] p-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
            <Button onClick={save} disabled={!canSave}>
              Save outcome
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                closeReferral(referral.id, "no_response");
                onClose();
              }}
            >
              Couldn&apos;t reach client
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
