"use client";

import type { Ranked } from "@/lib/score";
import { ScoreBar } from "./ScoreBar";
import { Button, Pill } from "./ui";

export const SOURCE_LABEL = {
  "CMS NPI Registry": "NPI Registry",
  fictional: "Fictional",
  program: "Public program",
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
      className={`rounded-md border bg-[var(--card)] p-4 transition-colors ${
        selected ? "border-[var(--ink)]" : "border-[var(--line)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {position != null && <span className="text-[13px] tabular-nums text-[var(--muted)]">{position}</span>}
            <h3 className="text-[15px] font-semibold text-[var(--ink)]">{p.name}</h3>
            {p.directoryAffirming && <Pill tone="affirm">Listed as affirming</Pill>}
          </div>
          {r.fitReasons.length > 0 && <p className="mt-1 text-[12px] text-[var(--ink)]/80">{r.fitReasons.join(" · ")}</p>}
        </div>
        <Button variant={selected ? "primary" : "secondary"} onClick={onChoose} className="shrink-0">
          {selected ? "Selected" : "Select"}
        </Button>
      </div>

      {hasOutcomes ? (
        <div className="mt-4 sm:w-1/2">
          <ScoreBar
            label="Care completed"
            value={s.completion}
            detail={`${s.completed}/${s.n} screened${s.medianDays != null ? ` · ${s.medianDays}d median` : ""}`}
            tone={s.completion < 0.5 ? "bad" : "complete"}
          />
        </div>
      ) : (
        p.note && <p className="mt-3 text-[13px] text-[var(--muted)]">{p.note}</p>
      )}

      {(s.gapFlag || s.patterns.length > 0) && (
        <div className="mt-3 space-y-1 text-[12px]">
          {s.gapFlag && <p className="font-medium text-[var(--bad-ink)]">Clients feel respected, but often aren&apos;t screened</p>}
          {s.patterns.map((pt) => (
            <p key={pt.tag} className="text-[var(--warn-ink)]">
              {pt.text}
            </p>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-[var(--muted)]">
        {SOURCE_LABEL[p.source]}
        {hasOutcomes && " · Simulated outcomes"}
        {!s.verified && hasOutcomes && ` · Unverified (${s.n})`}
      </p>
    </article>
  );
}
