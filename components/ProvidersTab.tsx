"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/dates";
import { STATUS_LABEL, statsFor, statusOf, type ProviderStatus, type ProviderStats } from "@/lib/score";
import { PROVIDERS, useStore } from "@/lib/store";
import type { Outcome, Provider, StaffNote } from "@/lib/types";
import { SOURCE_LABEL } from "./ProviderCard";
import { ScoreBar } from "./ScoreBar";
import { Button, Card, Pill } from "./ui";

const STATUS_TONE: Record<ProviderStatus, "good" | "bad" | "neutral" | "warn"> = {
  recommended: "good",
  flagged: "bad",
  unverified: "neutral",
  mixed: "warn",
};

type Filter = "all" | ProviderStatus;

export function ProvidersTab() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      PROVIDERS.map((p) => {
        const outcomes = state.outcomes.filter((o) => o.providerId === p.id);
        const stats = statsFor(outcomes);
        return { p, outcomes, stats, status: statusOf(stats), notes: state.notes.filter((n) => n.providerId === p.id) };
      }),
    [state.outcomes, state.notes],
  );

  const needle = q.trim().toLowerCase();
  const visible = rows
    .filter((r) => filter === "all" || r.status === filter)
    .filter(
      (r) =>
        !needle ||
        [r.p.name, r.p.specialty, r.p.address, r.p.languages.join(" "), r.p.id].some((s) => s.toLowerCase().includes(needle)),
    )
    .sort((a, b) => b.stats.completion - a.stats.completion);

  const counts = (s: Filter) => (s === "all" ? rows.length : rows.filter((r) => r.status === s).length);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="w-full rounded border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--muted)] sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["all", "recommended", "flagged", "mixed", "unverified"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-1 text-[13px] ${
                filter === f ? "bg-[var(--chip)] font-medium text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABEL[f]} <span className="text-[var(--muted)]">{counts(f)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--card)]">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_90px_90px_60px] gap-3 border-b border-[var(--line)] px-4 py-2 text-[12px] text-[var(--muted)] md:grid">
          <span>Provider</span>
          <span>Status</span>
          <span className="text-right">Screened</span>
          <span className="text-right">Affirming</span>
          <span className="text-right">n</span>
        </div>
        {visible.length === 0 && <p className="p-4 text-sm text-[var(--muted)]">No providers match.</p>}
        {visible.map((r) => (
          <div key={r.p.id} className="border-b border-[var(--line)] last:border-b-0">
            <button
              onClick={() => setOpenId(openId === r.p.id ? null : r.p.id)}
              className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left hover:bg-[var(--subtle)] md:grid-cols-[minmax(0,2.2fr)_1fr_90px_90px_60px] md:items-center md:gap-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-[var(--ink)]">{r.p.name}</span>
                <span className="block truncate text-[12px] text-[var(--muted)]">{r.p.specialty}</span>
              </span>
              <span>
                <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill>
              </span>
              <span className="text-[13px] tabular-nums text-[var(--ink)] md:text-right">
                <span className="text-[12px] text-[var(--muted)] md:hidden">Screened </span>
                {r.stats.n ? `${r.stats.completed}/${r.stats.n}` : "—"}
              </span>
              <span className="text-[13px] tabular-nums text-[var(--ink)] md:text-right">
                <span className="text-[12px] text-[var(--muted)] md:hidden">Affirming </span>
                {r.stats.affirming == null ? "—" : `${Math.round(r.stats.affirming * 100)}%`}
              </span>
              <span className="hidden text-right text-[13px] tabular-nums text-[var(--muted)] md:block">{r.stats.n}</span>
            </button>
            {openId === r.p.id && <ProviderDetail p={r.p} stats={r.stats} outcomes={r.outcomes} notes={r.notes} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderDetail({ p, stats, outcomes, notes }: { p: Provider; stats: ProviderStats; outcomes: Outcome[]; notes: StaffNote[] }) {
  const { addNote } = useStore();
  const [draft, setDraft] = useState("");

  type Entry = { key: string; date?: string; kind: "staff" | "checkin" | "seed"; text: string; outcome?: Outcome };
  const entries: Entry[] = [
    ...notes.map((n): Entry => ({ key: n.id, date: n.createdAt, kind: "staff", text: n.text })),
    ...outcomes
      .filter((o) => o.note || o.tag !== "none")
      .map((o): Entry => ({ key: o.id, date: o.date, kind: o.source === "checkin" ? "checkin" : "seed", text: o.note, outcome: o })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="grid grid-cols-1 gap-6 border-t border-[var(--line)] bg-[var(--subtle)] px-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <dl className="grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
          <Meta k="Source" v={SOURCE_LABEL[p.source]} />
          {p.source === "CMS NPI Registry" && <Meta k="NPI" v={p.id} />}
          <Meta k="Address" v={p.address} />
          <Meta k="Phone" v={p.phone ?? "—"} />
          <Meta k="Type" v={p.isClinic ? "Clinic" : "Clinician"} />
          <Meta k="Insurance" v={p.insurance.map((i) => (i === "medicaid" ? "Medi-Cal" : i[0].toUpperCase() + i.slice(1))).join(", ")} />
          <Meta k="Sliding scale" v={p.slidingScale ? "Yes" : "No"} />
          <Meta k="Evenings" v={p.eveningHours ? "Yes" : "No"} />
          <Meta k="Languages" v={p.languages.join(", ")} />
          <Meta k="Transit" v={p.transitNote} />
          <Meta k="Directory" v={p.directoryAffirming ? "Listed as affirming" : "—"} />
        </dl>
        {stats.n > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ScoreBar label="Affirming" value={stats.affirming} tone="affirm" />
            <ScoreBar
              label="Care completed"
              value={stats.completion}
              detail={`${stats.completed}/${stats.n} screened${stats.medianDays != null ? ` · ${stats.medianDays}d median` : ""}`}
              tone={stats.completion < 0.5 ? "bad" : "complete"}
            />
          </div>
        )}
        {(stats.gapFlag || stats.patterns.length > 0) && (
          <div className="space-y-1 text-[12px]">
            {stats.gapFlag && <p className="font-medium text-[var(--bad-ink)]">Clients feel respected, but often aren&apos;t screened</p>}
            {stats.patterns.map((pt) => (
              <p key={pt.tag} className="text-[var(--warn-ink)]">
                {pt.text}
              </p>
            ))}
          </div>
        )}
      </div>

      <Card className="!p-4">
        <div className="text-[13px] font-semibold text-[var(--ink)]">Notes <span className="font-normal text-[var(--muted)]">{entries.length}</span></div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                addNote(p.id, draft.trim());
                setDraft("");
              }
            }}
            placeholder="Add a note"
            className="min-w-0 flex-1 rounded border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--muted)]"
          />
          <Button
            variant="secondary"
            disabled={!draft.trim()}
            onClick={() => {
              addNote(p.id, draft.trim());
              setDraft("");
            }}
          >
            Add
          </Button>
        </div>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 && <li className="text-[13px] text-[var(--muted)]">None</li>}
          {entries.map((e) => (
            <li key={e.key} className="border-b border-[var(--line)] pb-2 text-[13px] last:border-b-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <Pill tone={e.kind === "staff" ? "affirm" : "neutral"}>
                  {e.kind === "staff" ? "Staff" : e.kind === "checkin" ? "Check-in" : "Simulated"}
                </Pill>
                {e.outcome && (
                  <Pill tone={e.outcome.careCompleted ? "good" : "bad"}>{e.outcome.careCompleted ? "Screened" : "Not screened"}</Pill>
                )}
                {e.outcome && e.outcome.tag !== "none" && <Pill tone="warn">{e.outcome.tag.replaceAll("_", " ")}</Pill>}
                {e.date && <span>{fmtDate(e.date)}</span>}
              </div>
              {e.text && <p className="text-[var(--ink)]">{e.text}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="min-w-0 break-words text-[var(--ink)]">{v}</dd>
    </>
  );
}
