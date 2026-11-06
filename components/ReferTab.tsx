"use client";

import { useMemo, useState } from "react";
import { EMPTY_NEED, isComplete, needSummary, toFilters } from "@/lib/need";
import { affirmingEvidence, rank, type Ranked } from "@/lib/score";
import { PROVIDERS, useStore } from "@/lib/store";
import { addWeeks } from "@/lib/dates";
import type { NeedForm, Referral } from "@/lib/types";
import { NeedFormCard } from "./NeedFormCard";
import { ProviderCard } from "./ProviderCard";
import { ReferralPanel, WhyCard, type ExplainState } from "./ReferralPanel";

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
  const exKey = selected ? `${selected.provider.id}|${summary}` : "";
  const ex = explanations[exKey];

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
            affirming_evidence: (() => {
              const ev = affirmingEvidence(state.outcomes.filter((o) => o.providerId === r.provider.id));
              return {
                clients_who_rated_respect: ev.rated,
                rated_respect_4_or_5: ev.respectful,
                had_to_explain_identity: ev.explained,
                misgendered_reports: ev.misgendered,
                client_quotes: ev.quotes,
                listed_as_affirming_in_directories_self_reported: r.provider.directoryAffirming,
              };
            })(),
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
      if (!res.ok) throw new Error(json.error ?? "Couldn't load");
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
    <div className="space-y-6">
      <Stepper step={step} />
      <NeedFormCard value={form} onChange={updateForm} onSubmit={() => setSearched(true)} searched={searched} />

      {showResults && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <Group title="Recommended">
              {recommended.length > 0 ? (
                recommended.map((r, i) => card(r, i + 1))
              ) : (
                <p className="text-[13px] text-[var(--muted)]">No verified match.</p>
              )}
            </Group>

            {flagged.length > 0 && <Group title="Not recommended">{flagged.map((r) => card(r))}</Group>}

            {others.length > 0 && (
              <div className="space-y-2">
                <button onClick={() => setShowMore((s) => !s)} className="text-[13px] font-semibold text-[var(--ink)] hover:opacity-70">
                  Other options <span className="font-normal text-[var(--muted)]">{others.length}</span>{" "}
                  <span className="text-[var(--muted)]">{showMore || recommended.length === 0 ? "▾" : "▸"}</span>
                </button>
                {(showMore || recommended.length === 0) && <div className="space-y-2">{others.map((r) => card(r))}</div>}
              </div>
            )}
          </div>

          <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
            {selected ? (
              <>
                {!confirmed && (
                  <WhyCard
                    r={selected}
                    outcomes={state.outcomes.filter((o) => o.providerId === selected.provider.id)}
                    explanation={ex}
                    onRetry={() => explain(selected)}
                  />
                )}
                <ReferralPanel
                  key={selected.provider.id}
                  r={selected}
                  need={summary}
                  explanation={ex && typeof ex === "object" && "affirming" in ex ? ex : null}
                  onConfirm={confirm}
                  confirmed={confirmed}
                  onGoWorkspace={onGoWorkspace}
                  onNewReferral={reset}
                />
              </>
            ) : (
              <p className="rounded-md border border-dashed border-[var(--line)] p-5 text-[13px] text-[var(--muted)]">Select a provider</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-semibold text-[var(--ink)]">{title}</h2>
      {children}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Needs", "Provider", "Send"];
  return (
    <ol className="flex items-center gap-3 text-[13px]">
      {steps.map((s, i) => {
        const n = i + 1;
        const cls = n < step ? "text-[var(--muted)]" : n === step ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]";
        return (
          <li key={s} className="flex items-center gap-3">
            <span className={cls}>
              {n}. {s}
            </span>
            {n < steps.length && <span className="text-[var(--line)]">/</span>}
          </li>
        );
      })}
    </ol>
  );
}
