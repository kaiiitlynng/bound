"use client";

import { useMemo, useState } from "react";
import providersData from "@/data/providers.json";
import outcomesData from "@/data/outcomes.json";
import { funderSummary, rank, statsFor, type Ranked } from "@/lib/score";
import type { CareType, CheckinResult, Explanation, NeedFilters, Outcome, Provider, Referral } from "@/lib/types";
import { ProviderCard } from "@/components/ProviderCard";
import { CheckinPanel } from "@/components/CheckinPanel";

const PROVIDERS = providersData as Provider[];
const SEED = outcomesData as Outcome[];

const CARE_TYPES: { value: CareType | "mammography" | "mental_health"; label: string; enabled: boolean }[] = [
  { value: "cervical_screening", label: "Cervical screening (Pap/HPV)", enabled: true },
  { value: "mammography", label: "Mammography (coming soon)", enabled: false },
  { value: "mental_health", label: "Mental health intake (coming soon)", enabled: false },
];

const EXAMPLE = "uninsured, overdue Pap, works days so needs evenings, no car, prefers Spanish";

export default function Home() {
  const careType: CareType = "cervical_screening";
  const [need, setNeed] = useState(EXAMPLE);
  const [filters, setFilters] = useState<NeedFilters | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [piiWarning, setPiiWarning] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>(SEED);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [deltas, setDeltas] = useState<Record<string, { before: number; after: number }>>({});
  const [explanations, setExplanations] = useState<Record<string, Explanation>>({});
  const [explaining, setExplaining] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ranked = useMemo(() => rank(PROVIDERS, outcomes, careType, filters), [outcomes, filters]);
  const report = useMemo(() => funderSummary(outcomes, PROVIDERS, careType), [outcomes]);
  const gaps = ranked.filter((r) => r.stats.gapFlag).length;

  async function findProviders() {
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-need", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: need }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not read that need");
      const f = json as NeedFilters;
      if (f.pii_detected) {
        // Privacy is the architecture: identifying text is discarded, never kept.
        setPiiWarning(true);
        setNeed("");
      } else {
        setPiiWarning(false);
      }
      setFilters(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsing(false);
    }
  }

  function logReferral(providerId: string) {
    setReferrals((rs) => [
      ...rs,
      { id: `ref-${Date.now()}`, providerId, careType, createdAt: new Date().toISOString() },
    ]);
  }

  function recordCheckin(ref: Referral, r: CheckinResult, text: string) {
    if (r.crisis) return; // staff hand-off; nothing automated is recorded
    const before = statsFor(outcomes.filter((o) => o.providerId === ref.providerId && o.careType === careType));
    const outcome: Outcome = {
      id: `checkin-${Date.now()}`,
      providerId: ref.providerId,
      careType,
      gotAppt: r.got_appt,
      daysToAppt: r.days_to_appt,
      careCompleted: r.care_completed,
      respected: r.respected,
      hadToExplain: r.had_to_explain,
      surpriseCost: r.surprise_cost,
      tag: r.tag,
      note: text.slice(0, 280),
      simulated: true,
      source: "checkin",
    };
    const next = [...outcomes, outcome];
    const after = statsFor(next.filter((o) => o.providerId === ref.providerId && o.careType === careType));
    setOutcomes(next);
    setDeltas((d) => ({ ...d, [ref.providerId]: { before: before.completion, after: after.completion } }));
    setTimeout(() => setDeltas((d) => {
      const rest = { ...d };
      delete rest[ref.providerId];
      return rest;
    }), 6000);
  }

  async function getExplanation(r: Ranked) {
    setExplaining(r.provider.id);
    setError(null);
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
          },
          fitReasons: r.fitReasons,
          need: piiWarning ? "" : need,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not write explanation");
      setExplanations((e) => ({ ...e, [r.provider.id]: json }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExplaining(null);
    }
  }

  const reportLine = `Bound referral outcomes: ${Math.round(report.completionRate * 100)}% of ${report.referrals} cervical-screening referrals with a known outcome were completed; median ${report.medianDays ?? "—"} days to care; ${report.verified} providers verified by real client outcomes.`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--ink)]">
            bound<span className="text-[var(--affirm)]">.</span>
          </h1>
          <p className="mt-1 max-w-xl text-[var(--muted)]">
            Affirming is a promise. We track whether it&apos;s kept. Providers ranked by whether queer women actually got
            the care they were referred for.
          </p>
        </div>
        <select
          defaultValue="cervical_screening"
          className="w-full rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] sm:w-auto"
          aria-label="Care type"
        >
          {CARE_TYPES.map((c) => (
            <option key={c.value} value={c.value} disabled={!c.enabled}>
              {c.label}
            </option>
          ))}
        </select>
      </header>

      {/* Funder report strip */}
      <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-5">
        <Stat label="Care completed" value={`${Math.round(report.completionRate * 100)}%`} />
        <Stat label="Outcomes known" value={String(report.referrals)} />
        <Stat label="Median days to care" value={report.medianDays == null ? "—" : String(report.medianDays)} />
        <Stat label="Providers verified" value={String(report.verified)} />
        <div className="col-span-2 flex items-center justify-center bg-[var(--card)] p-3 sm:col-span-1">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reportLine);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* clipboard unavailable */
              }
            }}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--chip)]"
          >
            {copied ? "Copied ✓" : "Copy funder report line"}
          </button>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {/* Intake */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">1 · Describe the need (no names)</h2>
            <textarea
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              rows={2}
              className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              placeholder="e.g. uninsured, overdue Pap, needs evenings, no car"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={findProviders}
                disabled={parsing || !need.trim()}
                className="rounded-full bg-[var(--ink)] px-5 py-2 text-sm font-semibold text-[var(--card)] disabled:opacity-40"
              >
                {parsing ? "Reading…" : "Find providers"}
              </button>
              {filters && (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <FilterChip>{filters.insurance}</FilterChip>
                  {filters.needs_evening && <FilterChip>evenings</FilterChip>}
                  {filters.needs_transit && <FilterChip>transit</FilterChip>}
                  {filters.language && <FilterChip>{filters.language}</FilterChip>}
                </div>
              )}
            </div>
            {piiWarning && (
              <p className="mt-3 rounded-lg bg-[var(--warn)]/12 px-3 py-2 text-sm text-[var(--warn-ink)]">
                That looked like it included identifying details, so the text was cleared and not stored. Describe the need
                without names, birthdays or phone numbers.
              </p>
            )}
            {error && <p className="mt-3 text-sm text-[var(--bad-ink)]">{error}</p>}
          </section>

          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ranked by care completed + affirming</h2>
            {gaps > 0 && <span className="text-xs text-[var(--bad-ink)]">{gaps} affirming-vs-completion gap found</span>}
          </div>
          {ranked.map((r, i) => (
            <ProviderCard
              key={r.provider.id}
              r={r}
              position={i + 1}
              delta={deltas[r.provider.id] ?? null}
              referred={referrals.some((x) => x.providerId === r.provider.id)}
              explanation={explanations[r.provider.id] ?? null}
              explaining={explaining === r.provider.id}
              onRefer={() => logReferral(r.provider.id)}
              onExplain={() => getExplanation(r)}
            />
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <CheckinPanel referrals={referrals} providers={PROVIDERS} onResult={recordCheckin} />
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 text-xs leading-relaxed text-[var(--muted)] sm:p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide">Privacy by design</h2>
            Outcomes are stored per provider, never per client: no names, birthdays, orientation or diagnoses. Check-ins are
            opt-in. Claude routes to care and summarizes; it never gives medical advice, and crisis language goes to staff.
          </section>
        </aside>
      </div>

      <footer className="mt-10 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
        Providers: CMS NPI Registry (real, San Francisco) plus one fictional demo provider and California&apos;s Every Woman Counts
        program. Insurance, hours, language and transit are demo attributes. <strong>All outcomes are simulated</strong>: no one
        collects this data today. That&apos;s the gap Bound fills.
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--card)] p-3 sm:p-4">
      <div className="text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
    </div>
  );
}

function FilterChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-[var(--ink)]">{children}</span>;
}
