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
    if (t === "refer" && tab !== "refer") setReferKey((k) => k + 1);
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "workspace", label: "Workspace", badge: dueCount },
    { id: "refer", label: "New referral" },
    { id: "providers", label: "Providers" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
      <header className="flex items-center gap-6 border-b border-[var(--line)] py-4">
        <span className="text-[17px] font-semibold tracking-tight text-[var(--ink)]">bound</span>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-[14px] transition-colors ${
                tab === t.id ? "bg-[var(--chip)] font-medium text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
              {!!t.badge && <span className="text-[12px] font-medium text-[var(--bad-ink)]">{t.badge}</span>}
            </button>
          ))}
        </nav>
        <button
          onClick={() => {
            reset();
            setReferKey((k) => k + 1);
            setTab("workspace");
          }}
          className="shrink-0 text-[12px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Reset
        </button>
      </header>

      <main className="mt-8">
        {!hydrated ? null : tab === "workspace" ? (
          <WorkspaceTab onNewReferral={() => go("refer")} />
        ) : tab === "refer" ? (
          <ReferTab key={referKey} onGoWorkspace={() => go("workspace")} />
        ) : (
          <ProvidersTab />
        )}
      </main>

      <footer className="mt-16 text-[11px] text-[var(--muted)]">Providers from the CMS NPI Registry (plus one fictional). Outcomes and attributes simulated.</footer>
    </div>
  );
}
