"use client";

import type { Ranked } from "@/lib/score";
import type { Explanation } from "@/lib/types";
import { ScoreBar } from "./ScoreBar";

const SOURCE_LABEL = {
  "CMS NPI Registry": "Real provider · CMS NPI Registry",
  fictional: "Fictional demo provider",
  program: "Public program · CDC NBCCEDP",
} as const;

export function ProviderCard({
  r,
  position,
  delta,
  referred,
  explanation,
  explaining,
  onRefer,
  onExplain,
}: {
  r: Ranked;
  position: number;
  delta: { before: number; after: number } | null;
  referred: boolean;
  explanation: Explanation | null;
  explaining: boolean;
  onRefer: () => void;
  onExplain: () => void;
}) {
  const { provider: p, stats: s } = r;
  const hasOutcomes = s.n > 0;
  return (
    <article
      className={`rounded-2xl border bg-[var(--card)] p-4 shadow-sm transition-colors sm:p-5 ${
        s.gapFlag ? "border-[var(--bad)]/60 ring-1 ring-[var(--bad)]/30" : "border-[var(--line)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-semibold text-[var(--card)]">
          {position}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-[var(--ink)]">{p.name}</h3>
            {p.directoryAffirming && (
              <span className="rounded-full bg-[var(--affirm)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--affirm-ink)]">
                🏳️‍🌈 Listed as affirming in directories
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {p.specialty} · {p.address}
            {p.phone ? ` · ${p.phone}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--muted)]">{SOURCE_LABEL[p.source]}</span>
            {hasOutcomes && (
              <span className="rounded-full border border-dashed border-[var(--muted)]/60 px-2 py-0.5 text-[var(--muted)]">
                Simulated outcomes
              </span>
            )}
            {r.fitReasons.map((f) => (
              <span key={f} className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-[var(--ink)]">
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hasOutcomes ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ScoreBar
            label="Affirming experience"
            value={s.affirming}
            detail="Respect, no need to explain identity"
            tone="affirm"
          />
          <div className="relative">
            <ScoreBar
              label="Care completed"
              value={s.completion}
              detail={`${s.completed} of ${s.n} screened${s.medianDays != null ? ` · median ${s.medianDays} days to visit` : ""}`}
              tone={s.completion < 0.5 ? "bad" : "complete"}
            />
            {delta && (
              <span className="absolute -top-1 right-12 animate-pulse rounded-full bg-[var(--bad)] px-2 py-0.5 text-[11px] font-semibold text-white">
                {delta.after < delta.before ? "▼" : "▲"} {Math.round(delta.before * 100)}% → {Math.round(delta.after * 100)}%
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">{p.note ?? "No outcomes yet."}</p>
      )}

      {!s.verified && hasOutcomes && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Unverified: only {s.n} outcome{s.n === 1 ? "" : "s"} so far, so it&apos;s ranked on a neutral prior until 5 come in.
        </p>
      )}

      {(s.gapFlag || s.patterns.length > 0) && (
        <ul className="mt-3 space-y-1.5">
          {s.gapFlag && (
            <li className="rounded-lg bg-[var(--bad)]/10 px-3 py-2 text-sm font-medium text-[var(--bad-ink)]">
              ⚠ Affirming, but clients often don&apos;t receive screening
            </li>
          )}
          {s.patterns.map((pt) => (
            <li key={pt.tag} className="rounded-lg bg-[var(--warn)]/12 px-3 py-1.5 text-xs text-[var(--warn-ink)]">
              Pattern: {pt.text}
            </li>
          ))}
        </ul>
      )}

      {explanation && (
        <div className="mt-3 space-y-2 rounded-xl bg-[var(--chip)] p-3 text-sm text-[var(--ink)]">
          <p>
            <span className="font-semibold">Why: </span>
            {explanation.reason}
          </p>
          <p className="whitespace-pre-line">
            <span className="font-semibold">Booking script: </span>
            {explanation.booking_script}
          </p>
          <p>
            <span className="font-semibold">For the client: </span>
            {explanation.client_explainer}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onRefer}
          disabled={referred}
          className="rounded-full bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--card)] transition hover:opacity-90 disabled:opacity-40"
        >
          {referred ? "Referral logged ✓" : "Log referral"}
        </button>
        <button
          onClick={onExplain}
          disabled={explaining}
          className="rounded-full border border-[var(--line)] px-4 py-1.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--chip)] disabled:opacity-50"
        >
          {explaining ? "Writing…" : explanation ? "Rewrite script" : "Why + booking script"}
        </button>
      </div>
    </article>
  );
}
