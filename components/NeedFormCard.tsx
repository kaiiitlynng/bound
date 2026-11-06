"use client";

import { useState } from "react";
import { answered, fromFilters, isComplete, LANGUAGES, NEED_FIELDS } from "@/lib/need";
import type { NeedFilters, NeedForm } from "@/lib/types";
import { Button, Card, Field, Segmented, inputCls } from "./ui";

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

  return (
    <Card>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        <Field label="Care">
          <Segmented
            value={value.careType}
            onChange={(v) => set("careType", v)}
            options={[
              { value: "cervical_screening", label: "Cervical screening" },
              { value: "mammography" as never, label: "Mammogram", disabled: true },
              { value: "mental_health" as never, label: "Mental health", disabled: true },
            ]}
          />
        </Field>
        <Field label="Needs a regular doctor">
          <Segmented
            value={value.primaryCare}
            onChange={(v) => set("primaryCare", v)}
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ]}
          />
        </Field>
        <Field label="Insurance">
          <Segmented
            value={value.insurance}
            onChange={(v) => set("insurance", v)}
            options={[
              { value: "uninsured", label: "None" },
              { value: "medicaid", label: "Medi-Cal" },
              { value: "private", label: "Private" },
              { value: "unknown", label: "Unsure" },
            ]}
          />
        </Field>
        <Field label="Availability">
          <Segmented
            value={value.hours}
            onChange={(v) => set("hours", v)}
            options={[
              { value: "any", label: "Any time" },
              { value: "evenings", label: "Evenings" },
            ]}
          />
        </Field>
        <Field label="Transport">
          <Segmented
            value={value.transport}
            onChange={(v) => set("transport", v)}
            options={[
              { value: "car", label: "Car" },
              { value: "transit", label: "Transit" },
              { value: "ride", label: "Needs ride" },
            ]}
          />
        </Field>
        <Field label="Language">
          <select value={value.language ?? ""} onChange={(e) => set("language", e.target.value || null)} className={`${inputCls} sm:w-56`}>
            <option value="">Select</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={onSubmit} disabled={!isComplete(value)}>
          {searched ? "Update" : "Find providers"}
        </Button>
        <span className="text-[12px] tabular-nums text-[var(--muted)]">
          {answered(value)}/{NEED_FIELDS.length}
        </span>
        <DescribeAssist value={value} onChange={onChange} />
      </div>
    </Card>
  );
}

/** Optional: a quick description that Claude turns into form answers. */
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
      if (!res.ok) throw new Error(json.error ?? "Couldn't read that");
      const f = json as NeedFilters;
      const next = fromFilters(value, f, text);
      onChange(next);
      setText(""); // never keep the free text
      setMsg(f.pii_detected ? { tone: "warn", text: "Identifying details removed." } : { tone: "ok", text: `Filled ${answered(next)}/${NEED_FIELDS.length}` });
    } catch (e) {
      setMsg({ tone: "bad", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
      {msg && (
        <span
          className={`text-[12px] ${msg.tone === "warn" ? "text-[var(--warn-ink)]" : msg.tone === "bad" ? "text-[var(--bad-ink)]" : "text-[var(--muted)]"}`}
        >
          {msg.text}
        </span>
      )}
      {open ? (
        <div className="flex w-full gap-2 sm:w-96">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text.trim() && !busy && fill()}
            placeholder="e.g. uninsured, evenings, no car, Spanish"
            className={inputCls}
          />
          <Button variant="secondary" onClick={fill} disabled={busy || !text.trim()}>
            {busy ? "…" : "Fill"}
          </Button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          Describe instead
        </Button>
      )}
    </div>
  );
}
