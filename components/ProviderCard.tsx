"use client";

import type { Ranked } from "@/lib/score";
import { ScoreBar } from "./ScoreBar";
import { Pill } from "./ui";

export const SOURCE_LABEL = {
  "CMS NPI Registry": "Real provider · CMS NPI Registry",
  fictional: "Fictional demo provider",
  program: "Public program · CDC NBCCEDP",
} as const;

export function ProviderCard({
  r,
  position,
  selected,
  onChoose,
}: {
  r: Ranked;
  position?: number;
  selected: boolean;
  onChoose: () => void;
}) {
  const { provider: p, stats: s } = r;
  const hasOutcomes = s.n > 0;
  return (
    <article
      className={`rounded-2xl border bg-[var(--card)] p-4 transition sm:p-5 ${
        selected
          ? "border-[var(--ink)] ring-2 ring-[var(--ink)]/15"
          : s.gapFlag
            ? "border-[var(--bad)]/60"
            : "border-[var(--line)]"
      }`}
    >
      <div className="flex items-start gap-3">
        {position != null && (
          <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-semibold text-[var(--card)]">
            {position}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-[var(--ink)]">{p.name}</h3>
            {p.directoryAffirming && <Pill tone="affirm">🏳️‍🌈 Listed as affirming in directories</Pill>}
          </div>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {p.specialty} · {p.address}
            {p.phone ? ` · ${p.phone}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--muted)]">{SOURCE_LABEL[p.source]}</span>
            {hasOutcomes && (
              <span className="rounded-full border border-dashed border-[var(--muted)]/60 px-2 py-0.5 text-[var(--muted)]">Simulated outcomes</span>
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
          <ScoreBar label="Affirming experience" value={s.affirming} tone="affirm" />
          <ScoreBar
            label="Care completed"
            value={s.completion}
            detail={`${s.completed} of ${s.n} screened${s.medianDays != null ? ` · ${s.medianDays} days median` : ""}`}
            tone={s.completion < 0.5 ? "bad" : "complete"}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">{p.note ?? "No outcomes yet."}</p>
      )}

      {!s.verified && hasOutcomes && (
        <p className="mt-3 text-xs text-[var(--muted)]">Unverified · {s.n} outcome{s.n === 1 ? "" : "s"}</p>
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

      <div className="mt-4">
        <button
          onClick={onChoose}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            selected ? "bg-[var(--complete)] text-white" : "bg-[var(--ink)] text-[var(--card)] hover:opacity-90"
          }`}
        >
          {selected ? "Chosen ✓" : s.gapFlag ? "Choose anyway" : "Choose this provider"}
        </button>
      </div>
    </article>
  );
}
