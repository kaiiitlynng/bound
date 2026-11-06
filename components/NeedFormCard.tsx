"use client";

import { useState } from "react";
import { answered, fromFilters, isComplete, LANGUAGES, NEED_FIELDS } from "@/lib/need";
import type { NeedFilters, NeedForm } from "@/lib/types";
import { Button, Card, Eyebrow, Field, Segmented } from "./ui";

export function NeedFormCard({
  value,
  onChange,
  onSubmit,
  searched,
}: {
  value: NeedForm;
  onChange: (v: NeedForm) => void;
  onSubmit: () => void;
  searched: boolean;
}) {
  const set = <K extends keyof NeedForm>(k: K, v: NeedForm[K]) => onChange({ ...value, [k]: v });
  const done = answered(value);

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Client&apos;s needs</Eyebrow>
        <span className="text-xs tabular-nums text-[var(--muted)]">
          {done} of {NEED_FIELDS.length} answered
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field label="Care needed">
          <Segmented
            value={value.careType}
            onChange={(v) => set("careType", v)}
            options={[
              { value: "cervical_screening", label: "Cervical screening (Pap/HPV)" },
              { value: "mammography" as never, label: "Mammogram · soon", disabled: true },
              { value: "mental_health" as never, label: "Mental health · soon", disabled: true },
            ]}
          />
        </Field>
        <Field label="Also needs a regular doctor?">
          <Segmented
            value={value.primaryCare}
            onChange={(v) => set("primaryCare", v)}
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No, has one" },
            ]}
          />
        </Field>
        <Field label="Insurance">
          <Segmented
            value={value.insurance}
            onChange={(v) => set("insurance", v)}
            options={[
              { value: "uninsured", label: "Uninsured" },
              { value: "medicaid", label: "Medi-Cal" },
              { value: "private", label: "Private" },
              { value: "unknown", label: "Not sure" },
            ]}
          />
        </Field>
        <Field label="When can they go?">
          <Segmented
            value={value.hours}
            onChange={(v) => set("hours", v)}
            options={[
              { value: "any", label: "Any time" },
              { value: "evenings", label: "Evenings only" },
            ]}
          />
        </Field>
        <Field label="Getting there">
          <Segmented
            value={value.transport}
            onChange={(v) => set("transport", v)}
            options={[
              { value: "car", label: "Has a car" },
              { value: "transit", label: "Public transit" },
              { value: "ride", label: "Needs a ride" },
            ]}
          />
        </Field>
        <Field label="Preferred language">
          <select
            value={value.language ?? ""}
            onChange={(e) => set("language", e.target.value || null)}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] sm:w-60"
          >
            <option value="">Choose…</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
        <Button onClick={onSubmit} disabled={!isComplete(value)}>
          {searched ? "Update matches" : "Find providers"}
        </Button>
      </div>

      <DescribeAssist value={value} onChange={onChange} />
    </Card>
  );
}

/** Optional: staff can type a quick description and Claude pre-fills the form. */
function DescribeAssist({ value, onChange }: { value: NeedForm; onChange: (v: NeedForm) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "warn" | "ok" | "bad"; text: string } | null>(null);

  async function fill() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/parse-need", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not read that");
      const f = json as NeedFilters;
      const next = fromFilters(value, f, text);
      onChange(next);
      setText(""); // never keep the free text
      setMsg(
        f.pii_detected
          ? { tone: "warn", text: "Identifying details detected. Text discarded." }
          : { tone: "ok", text: `Filled ${answered(next)} of ${NEED_FIELDS.length}.` },
      );
    } catch (e) {
      setMsg({ tone: "bad", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--affirm-ink)] hover:underline">
        {open ? "− Hide" : "+ Describe instead"}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text.trim() && !busy && fill()}
            placeholder="e.g. uninsured, works days so evenings, no car, prefers Spanish"
            className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
          />
          <Button variant="secondary" onClick={fill} disabled={busy || !text.trim()}>
            {busy ? "Reading…" : "Fill form"}
          </Button>
        </div>
      )}
      {msg && (
        <p
          className={`mt-2 text-xs ${
            msg.tone === "warn" ? "text-[var(--warn-ink)]" : msg.tone === "bad" ? "text-[var(--bad-ink)]" : "text-[var(--complete-ink)]"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
