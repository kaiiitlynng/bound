"use client";

import { useState } from "react";
import { dueLabel, fmtDate, isDue } from "@/lib/dates";
import { providerById, useStore, type Delta } from "@/lib/store";
import type { Referral } from "@/lib/types";
import { CheckinForm } from "./CheckinForm";
import { Button, Card, Eyebrow, Pill } from "./ui";

const CLOSED_LABEL = {
  closed: null,
  no_response: { text: "No response", tone: "warn" },
  handoff: { text: "Handed off to staff", tone: "bad" },
} as const;

export function WorkspaceTab({ onNewReferral }: { onNewReferral: () => void }) {
  const { state, makeDue } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<Delta | null>(null);

  const open = state.referrals.filter((r) => r.status === "awaiting").sort((a, b) => a.checkinDue.localeCompare(b.checkinDue));
  const due = open.filter((r) => isDue(r.checkinDue));
  const upcoming = open.filter((r) => !isDue(r.checkinDue));
  const closed = state.referrals.filter((r) => r.status !== "awaiting").sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
  const active = state.referrals.find((r) => r.id === activeId && r.status === "awaiting") ?? null;


  return (
    <div className="space-y-5">
      {toast && <DeltaToast delta={toast} onDone={() => setToast(null)} />}


      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Follow-ups due ({due.length})</Eyebrow>
              <Button variant="secondary" onClick={onNewReferral}>
                + New referral
              </Button>
            </div>
            {due.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Nothing due.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {due.map((r) => (
                  <FollowUp key={r.id} r={r} active={r.id === activeId} onOpen={() => setActiveId(r.id)} />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <Eyebrow>Upcoming ({upcoming.length})</Eyebrow>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">None.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {upcoming.map((r) => (
                  <FollowUp key={r.id} r={r} active={r.id === activeId} onOpen={() => setActiveId(r.id)} onMakeDue={() => makeDue(r.id)} />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <Eyebrow>Recently closed</Eyebrow>
            {closed.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">None yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {closed.slice(0, 8).map((r) => {
                  const o = state.outcomes.find((x) => x.id === r.outcomeId);
                  const special = CLOSED_LABEL[r.status as keyof typeof CLOSED_LABEL];
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <span className="text-[var(--ink)]">{providerById(r.providerId)?.name}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {special ? (
                          <Pill tone={special.tone}>{special.text}</Pill>
                        ) : o ? (
                          <>
                            <Pill tone={o.careCompleted ? "good" : "bad"}>{o.careCompleted ? "Screened" : "Not screened"}</Pill>
                            {o.tag !== "none" && <Pill tone="warn">{o.tag.replaceAll("_", " ")}</Pill>}
                          </>
                        ) : null}
                        <span className="text-xs text-[var(--muted)]">{r.closedAt ? fmtDate(r.closedAt) : ""}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
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
            <Card>
              <Eyebrow>Outcome check-in</Eyebrow>
              <p className="mt-2 text-sm text-[var(--muted)]">Select a follow-up to record its outcome.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FollowUp({ r, active, onOpen, onMakeDue }: { r: Referral; active: boolean; onOpen: () => void; onMakeDue?: () => void }) {
  const p = providerById(r.providerId);
  const d = dueLabel(r.checkinDue);
  return (
    <li className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${active ? "-mx-2 rounded-xl bg-[var(--chip)] px-2" : ""}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--ink)]">{p?.name}</span>
          <Pill tone={d.tone === "overdue" ? "bad" : d.tone === "due" ? "warn" : "neutral"}>{d.text}</Pill>
        </div>
        <div className="mt-0.5 text-xs text-[var(--muted)]">
          Referred {fmtDate(r.createdAt)} · {r.method === "text" ? "📱 text check-in" : "📞 staff call"} · {r.needSummary}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {onMakeDue && (
          <button onClick={onMakeDue} className="text-[11px] text-[var(--muted)] underline decoration-dashed hover:text-[var(--ink)]">
            Demo: make due now
          </button>
        )}
        <Button variant={onMakeDue ? "secondary" : "primary"} onClick={onOpen}>
          {r.method === "call" ? "Log call" : "Record reply"}
        </Button>
      </div>
    </li>
  );
}

function DeltaToast({ delta, onDone }: { delta: Delta; onDone: () => void }) {
  const p = providerById(delta.providerId);
  const down = delta.after < delta.before;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white ${down ? "bg-[var(--bad)]" : "bg-[var(--complete)]"}`}
    >
      <span>
        Outcome saved · {p?.name}: care completed {down ? "▼" : "▲"} {Math.round(delta.before * 100)}% → {Math.round(delta.after * 100)}%
      </span>
      <button onClick={onDone} className="text-white/80 hover:text-white" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
