"use client";

import { useMemo, useState } from "react";
import { EMPTY_NEED, isComplete, needSummary, toFilters } from "@/lib/need";
import { rank, type Ranked } from "@/lib/score";
import { PROVIDERS, useStore } from "@/lib/store";
import { addWeeks } from "@/lib/dates";
import type { NeedForm, Referral } from "@/lib/types";
import { NeedFormCard } from "./NeedFormCard";
import { ProviderCard } from "./ProviderCard";
import { ReferralPanel, type ExplainState } from "./ReferralPanel";
import { Eyebrow } from "./ui";

export function ReferTab({ onGoWorkspace }: { onGoWorkspace: () => void }) {
  const { state, addReferral } = useStore();
  const [form, setForm] = useState<NeedForm>(EMPTY_NEED);
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, ExplainState>>({});
  const [confirmed, setConfirmed] = useState<Referral | null>(null);
  const [showMore, setShowMore] = useState(false);

  const showResults = searched && isComplete(form);
  const summary = needSummary(form);
  const ranked = useMemo(
    () => (showResults ? rank(PROVIDERS, state.outcomes, "cervical_screening", toFilters(form)) : []),
    [showResults, state.outcomes, form],
  );
  const recommended = ranked.filter((r) => r.stats.recommended).slice(0, 3);
  const flagged = ranked.filter((r) => r.stats.gapFlag);
  const others = ranked.filter((r) => !recommended.includes(r) && !flagged.includes(r));
  const selected = ranked.find((r) => r.provider.id === selectedId) ?? null;

  const step = confirmed ? 4 : selected ? 3 : showResults ? 2 : 1;

  function updateForm(f: NeedForm) {
    setForm(f);
    setConfirmed(null);
  }

  async function explain(r: Ranked) {
    const key = `${r.provider.id}|${summary}`;
    setExplanations((e) => ({ ...e, [key]: "loading" }));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName: r.provider.name,
          stats: {
            outcomes_recorded: r.stats.n,
            screened: r.stats.completed,
            median_days_to_visit: r.stats.medianDays,
            affirming_score_pct: r.stats.affirming == null ? null : Math.round(r.stats.affirming * 100),
            verified: r.stats.verified,
            flagged_patterns: r.stats.patterns.map((p) => p.text),
            affirming_but_low_completion: r.stats.gapFlag,
            languages: r.provider.languages,
            evening_hours: r.provider.eveningHours,
            insurance_accepted: r.provider.insurance,
            sliding_scale: r.provider.slidingScale,
            note: r.provider.note ?? null,
          },
          fitReasons: r.fitReasons,
          need: summary,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not write the script");
      setExplanations((e) => ({ ...e, [key]: json }));
    } catch (err) {
      setExplanations((e) => ({ ...e, [key]: { error: err instanceof Error ? err.message : String(err) } }));
    }
  }

  function choose(r: Ranked) {
    setSelectedId(r.provider.id);
    setConfirmed(null);
    const cur = explanations[`${r.provider.id}|${summary}`];
    if (!cur || (typeof cur === "object" && "error" in cur)) explain(r);
  }

  function confirm(method: Referral["method"], weeks: number) {
    if (!selected) return;
    setConfirmed(
      addReferral({
        providerId: selected.provider.id,
        careType: "cervical_screening",
        checkinDue: addWeeks(weeks),
        method,
        needSummary: summary,
      }),
    );
  }

  function reset() {
    setForm(EMPTY_NEED);
    setSearched(false);
    setSelectedId(null);
    setConfirmed(null);
    setShowMore(false);
  }

  const card = (r: Ranked, i?: number) => (
    <ProviderCard key={r.provider.id} r={r} position={i} selected={selectedId === r.provider.id} onChoose={() => choose(r)} />
  );

  return (
    <div className="space-y-5">
      <Stepper step={step} />
      <NeedFormCard value={form} onChange={updateForm} onSubmit={() => setSearched(true)} searched={searched} />

      {showResults && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-4">
            <div className="px-1">
              <Eyebrow>Choose a provider</Eyebrow>
            </div>

            {recommended.length > 0 ? (
              recommended.map((r, i) => card(r, i + 1))
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
                No verified match yet.
              </p>
            )}

            {flagged.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--bad-ink)]">
                  Not recommended
                </div>
                {flagged.map((r) => card(r))}
              </div>
            )}

            {others.length > 0 && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowMore((s) => !s)}
                  className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  {showMore || recommended.length === 0 ? "▾" : "▸"} Other options ({others.length})
                </button>
                {(showMore || recommended.length === 0) && others.map((r) => card(r))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <ReferralPanel
              r={selected}
              need={summary}
              explanation={selected ? explanations[`${selected.provider.id}|${summary}`] : undefined}
              onRetryExplain={() => selected && explain(selected)}
              onConfirm={confirm}
              confirmed={confirmed}
              onGoWorkspace={onGoWorkspace}
              onNewReferral={reset}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Client's needs", "Choose provider", "Send & schedule follow-up"];
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "now" : "todo";
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                state === "todo" ? "bg-[var(--chip)] text-[var(--muted)]" : state === "done" ? "bg-[var(--complete)] text-white" : "bg-[var(--ink)] text-[var(--card)]"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={state === "todo" ? "text-[var(--muted)]" : "font-medium text-[var(--ink)]"}>{s}</span>
            {n < steps.length && <span className="text-[var(--line)]">—</span>}
          </li>
        );
      })}
    </ol>
  );
}
