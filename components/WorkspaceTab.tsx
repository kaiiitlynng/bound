"use client";

import { useState } from "react";
import { dueLabel, fmtDate, isDue } from "@/lib/dates";
import { providerById, useStore, type Delta } from "@/lib/store";
import type { Referral } from "@/lib/types";
import { CheckinForm } from "./CheckinForm";
import { Button, Pill } from "./ui";

export function WorkspaceTab({ onNewReferral }: { onNewReferral: () => void }) {
  const { state } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<Delta | null>(null);

  const open = state.referrals.filter((r) => r.status === "awaiting").sort((a, b) => a.checkinDue.localeCompare(b.checkinDue));
  const due = open.filter((r) => isDue(r.checkinDue));
  const upcoming = open.filter((r) => !isDue(r.checkinDue));
  const closed = state.referrals.filter((r) => r.status !== "awaiting").sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
  const active = state.referrals.find((r) => r.id === activeId && r.status === "awaiting") ?? null;

  return (
    <div className="space-y-6">
      {toast && <DeltaToast delta={toast} onDone={() => setToast(null)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-8">
          <Button onClick={onNewReferral}>+ New referral</Button>
          <List title="Due" count={due.length} empty="Nothing due">
            {due.map((r) => (
              <Row key={r.id} r={r} active={r.id === activeId} onOpen={() => setActiveId(r.id)} />
            ))}
          </List>
          <List title="Upcoming" count={upcoming.length} empty="None">
            {upcoming.map((r) => (
              <Row key={r.id} r={r} active={r.id === activeId} onOpen={() => setActiveId(r.id)} />
            ))}
          </List>
          <List title="Closed" count={closed.length} empty="None">
            {closed.slice(0, 8).map((r) => {
              const o = state.outcomes.find((x) => x.id === r.outcomeId);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate text-[14px] text-[var(--ink)]">{providerById(r.providerId)?.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {r.status === "no_response" && <Pill tone="warn">No response</Pill>}
                    {r.status === "handoff" && <Pill tone="bad">Handed off</Pill>}
                    {o && <Pill tone={o.careCompleted ? "good" : "bad"}>{o.careCompleted ? "Screened" : "Not screened"}</Pill>}
                    <span className="text-[12px] text-[var(--muted)]">{r.closedAt ? fmtDate(r.closedAt) : ""}</span>
                  </span>
                </li>
              );
            })}
          </List>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {active ? (
            <CheckinForm
              key={active.id}
              referral={active}
              onClose={() => setActiveId(null)}
              onSaved={(d) => {
                setToast(d);
                setActiveId(null);
              }}
            />
          ) : (
            <p className="rounded-md border border-dashed border-[var(--line)] p-5 text-[13px] text-[var(--muted)]">Select a follow-up</p>
          )}
        </div>
      </div>
    </div>
  );
}

function List({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold text-[var(--ink)]">
        {title} <span className="font-normal text-[var(--muted)]">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-[var(--card)]">{children}</ul>
      )}
    </section>
  );
}

function Row({ r, active, onOpen }: { r: Referral; active: boolean; onOpen: () => void }) {
  const d = dueLabel(r.checkinDue);
  return (
    <li>
      <button
        onClick={onOpen}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--subtle)] ${
          active ? "bg-[var(--subtle)]" : ""
        }`}
      >
        <span className="min-w-0">
          <span className="block truncate text-[14px] text-[var(--ink)]">{providerById(r.providerId)?.name}</span>
          <span className="block text-[12px] text-[var(--muted)]">
            Referred {fmtDate(r.createdAt)} · {r.method === "text" ? "Text" : "Call"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Pill tone={d.tone === "overdue" ? "bad" : d.tone === "due" ? "warn" : "neutral"}>{d.text}</Pill>
          <span className="text-[var(--muted)]">›</span>
        </span>
      </button>
    </li>
  );
}

function DeltaToast({ delta, onDone }: { delta: Delta; onDone: () => void }) {
  const p = providerById(delta.providerId);
  const down = delta.after < delta.before;
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--subtle)] px-4 py-2.5 text-[13px]">
      <span className="text-[var(--ink)]">
        {p?.name} · Care completed{" "}
        <span className={`font-medium tabular-nums ${down ? "text-[var(--bad-ink)]" : "text-[var(--complete-ink)]"}`}>
          {Math.round(delta.before * 100)}% → {Math.round(delta.after * 100)}%
        </span>
      </span>
      <button onClick={onDone} className="text-[var(--muted)] hover:text-[var(--ink)]" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
