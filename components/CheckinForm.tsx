"use client";

import { useState } from "react";
import { fmtDate, isDue } from "@/lib/dates";
import { providerById, useStore, type Delta } from "@/lib/store";
import { TAG_LABELS, TAGS, type CheckinResult, type Referral, type Tag } from "@/lib/types";
import { Button, Card, Segmented, inputCls } from "./ui";

const DEMOS = [
  { label: "No Pap", text: "yeah got seen tues, everyone was really nice but she said i didn't need a pap since i'm gay??" },
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
  const { recordOutcome, closeReferral, makeDue } = useStore();
  const p = providerById(referral.providerId);
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
      if (!res.ok) throw new Error(json.error ?? "Couldn't read reply");
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
      {/* details revealed on click */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[var(--ink)]">{p?.name}</h3>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]" aria-label="Close">
          ✕
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-[var(--muted)]">Referred</dt>
        <dd className="text-[var(--ink)]">{fmtDate(referral.createdAt)}</dd>
        <dt className="text-[var(--muted)]">Check-in</dt>
        <dd className="text-[var(--ink)]">
          {referral.method === "text" ? "Text" : "Call"} · {fmtDate(referral.checkinDue)}
          {!isDue(referral.checkinDue) && (
            <button onClick={() => makeDue(referral.id)} className="ml-2 text-[12px] text-[var(--muted)] underline hover:text-[var(--ink)]">
              Make due (demo)
            </button>
          )}
        </dd>
        <dt className="text-[var(--muted)]">Needs</dt>
        <dd className="text-[var(--ink)]">{referral.needSummary}</dd>
        {p && (
          <>
            <dt className="text-[var(--muted)]">Provider</dt>
            <dd className="text-[var(--ink)]">
              {p.address}
              {p.phone ? ` · ${p.phone}` : ""}
            </dd>
          </>
        )}
      </dl>

      {crisis ? (
        <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-4">
          <p className="rounded bg-[var(--bad)]/12 px-3 py-2 text-[13px] font-medium text-[var(--bad-ink)]">Crisis language. Hand off to staff now.</p>
          <Button
            onClick={() => {
              closeReferral(referral.id, "handoff");
              onClose();
            }}
          >
            Mark handed off
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
            <div className="text-[13px] font-semibold text-[var(--ink)]">Client reply</div>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Paste or summarize" className={`${inputCls} resize-none`} />
            <div className="flex flex-wrap items-center gap-1.5">
              {DEMOS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setReply(d.text)}
                  className="rounded-sm bg-[var(--chip)] px-1.5 py-0.5 text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  {d.label}
                </button>
              ))}
              <Button variant="secondary" onClick={fillFromReply} disabled={busy || !reply.trim()} className="ml-auto">
                {busy ? "…" : "Fill from reply"}
              </Button>
            </div>
            {error && <p className="text-[12px] text-[var(--bad-ink)]">{error}</p>}
          </div>

          <div className="mt-5 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-t border-[var(--line)] pt-4 text-[13px]">
            <Label>Appointment</Label>
            <Segmented value={a.gotAppt} onChange={(v) => set("gotAppt", v)} options={yesNo} />
            {a.gotAppt && (
              <>
                <Label>Days to visit</Label>
                <input type="number" min={0} value={a.daysToAppt} onChange={(e) => set("daysToAppt", e.target.value)} className={`${inputCls} w-20`} />
                <Label>Screened</Label>
                <Segmented value={a.careCompleted} onChange={(v) => set("careCompleted", v)} options={yesNo} />
                <Label>Respect</Label>
                <Segmented
                  value={a.respected == null ? null : String(a.respected)}
                  onChange={(v) => set("respected", Number(v))}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
                />
              </>
            )}
            <Label>Explained identity</Label>
            <Segmented value={a.hadToExplain} onChange={(v) => set("hadToExplain", v)} options={yesNo} />
            <Label>Surprise cost</Label>
            <Segmented value={a.surpriseCost} onChange={(v) => set("surpriseCost", v)} options={yesNo} />
            <Label>Issue</Label>
            <select value={a.tag} onChange={(e) => set("tag", e.target.value as Tag)} className={inputCls}>
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {t === "none" ? "None" : TAG_LABELS[t][0].toUpperCase() + TAG_LABELS[t].slice(1)}
                </option>
              ))}
            </select>
            <Label>Note</Label>
            <input value={a.note} onChange={(e) => set("note", e.target.value)} placeholder="No names" className={inputCls} />
          </div>

          <div className="mt-5 flex gap-2">
            <Button onClick={save} disabled={!canSave}>
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                closeReferral(referral.id, "no_response");
                onClose();
              }}
            >
              No response
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--muted)]">{children}</span>;
}
