"use client";

import { useState } from "react";
import { isDue } from "@/lib/dates";
import { StoreProvider, useStore } from "@/lib/store";
import { ProvidersTab } from "@/components/ProvidersTab";
import { ReferTab } from "@/components/ReferTab";
import { WorkspaceTab } from "@/components/WorkspaceTab";

type Tab = "workspace" | "refer" | "providers";

export default function Home() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}

function App() {
  const { state, hydrated, reset } = useStore();
  const [tab, setTab] = useState<Tab>("workspace");
  const [referKey, setReferKey] = useState(0);
  const dueCount = state.referrals.filter((r) => r.status === "awaiting" && isDue(r.checkinDue)).length;

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "workspace", label: "Workspace", badge: dueCount },
    { id: "refer", label: "New referral" },
    { id: "providers", label: "Providers" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
      <header className="flex flex-col gap-4 pt-6 sm:pt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              bound<span className="text-[var(--affirm)]">.</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">Affirming is a promise. We track whether it&apos;s kept.</p>
          </div>
          <button
            onClick={() => {
              reset();
              setReferKey((k) => k + 1);
              go("workspace");
            }}
            className="shrink-0 text-xs text-[var(--muted)] underline decoration-dashed hover:text-[var(--ink)]"
          >
            Reset demo
          </button>
        </div>
        <nav className="flex gap-1 border-b border-[var(--line)]" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === "refer" && tab !== "refer") setReferKey((k) => k + 1);
                go(t.id);
              }}
              aria-current={tab === t.id ? "page" : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.id ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
              {!!t.badge && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--bad)] px-1 text-[11px] font-semibold text-white">{t.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mt-6">
        {!hydrated ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : tab === "workspace" ? (
          <WorkspaceTab
            onNewReferral={() => {
              setReferKey((k) => k + 1);
              go("refer");
            }}
          />
        ) : tab === "refer" ? (
          <ReferTab key={referKey} onGoWorkspace={() => go("workspace")} />
        ) : (
          <ProvidersTab />
        )}
      </main>

      <footer className="mt-12 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
        Providers from the CMS NPI Registry (plus one fictional). Outcomes and provider attributes are simulated.
      </footer>
    </div>
  );
}
