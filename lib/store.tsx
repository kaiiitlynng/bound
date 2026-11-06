"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import providersData from "@/data/providers.json";
import outcomesData from "@/data/outcomes.json";
import { statsFor } from "./score";
import type { Outcome, Provider, Referral, ReferralStatus, StaffNote } from "./types";

export const PROVIDERS = providersData as Provider[];
export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id);
const SEED_OUTCOMES = outcomesData as Outcome[];

const KEY = "bound-demo-v1";
const DAY = 86_400_000;

interface State {
  outcomes: Outcome[];
  referrals: Referral[];
  notes: StaffNote[];
}

export interface Delta {
  providerId: string;
  before: number;
  after: number;
}

function seedState(): State {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const ref = (id: string, providerId: string, ago: number, dueIn: number, method: Referral["method"], needSummary: string): Referral => ({
    id, providerId, careType: "cervical_screening", createdAt: iso(now - ago * DAY), checkinDue: iso(now + dueIn * DAY),
    method, needSummary, status: "awaiting",
  });
  return {
    outcomes: SEED_OUTCOMES,
    referrals: [
      ref("ref-seed-1", "fictional-rww", 29, -1, "text", "Medi-Cal · evenings · public transit · English"),
      ref("ref-seed-2", "1588606206", 28, 0, "call", "Uninsured · any time · public transit · Spanish"),
      ref("ref-seed-3", "1417974858", 18, 10, "text", "Medi-Cal · any time · has a car · Spanish"),
    ],
    notes: [
      {
        id: "note-seed-1", providerId: "fictional-rww", createdAt: iso(now - 12 * DAY),
        text: "Very warm front desk, Spanish-speaking staff. Second time I've heard the NP told someone a Pap wasn't needed. Keep an eye on this.",
      },
      {
        id: "note-seed-2", providerId: "program-ewc", createdAt: iso(now - 40 * DAY),
        text: "Call first to confirm eligibility (income + age 21–64). They'll name an enrolled clinic nearby.",
      },
    ],
  };
}

interface Store {
  state: State;
  hydrated: boolean;
  addReferral: (r: Omit<Referral, "id" | "status" | "createdAt">) => Referral;
  recordOutcome: (referralId: string, o: Omit<Outcome, "id" | "providerId" | "careType" | "simulated" | "source" | "date">) => Delta | null;
  closeReferral: (referralId: string, status: Exclude<ReferralStatus, "awaiting" | "closed">) => void;
  makeDue: (referralId: string) => void;
  addNote: (providerId: string, text: string) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ outcomes: SEED_OUTCOMES, referrals: [], notes: [] });
  const [hydrated, setHydrated] = useState(false);

  // Load after mount (localStorage + "now"-relative seed dates aren't available during prerender).
  useEffect(() => {
    let loaded: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = JSON.parse(raw) as State;
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client hydration
    setState(loaded ?? seedState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const now = () => new Date().toISOString();
  const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const store: Store = {
    state,
    hydrated,
    addReferral(r) {
      const referral: Referral = { ...r, id: id("ref"), status: "awaiting", createdAt: now() };
      setState((s) => ({ ...s, referrals: [...s.referrals, referral] }));
      return referral;
    },
    recordOutcome(referralId, o) {
      const ref = state.referrals.find((r) => r.id === referralId);
      if (!ref) return null;
      const outcome: Outcome = {
        ...o, id: id("out"), providerId: ref.providerId, careType: ref.careType, simulated: true, source: "checkin", date: now(),
      };
      const mine = (os: Outcome[]) => os.filter((x) => x.providerId === ref.providerId && x.careType === ref.careType);
      const before = statsFor(mine(state.outcomes)).completion;
      const after = statsFor(mine([...state.outcomes, outcome])).completion;
      setState((s) => ({
        ...s,
        outcomes: [...s.outcomes, outcome],
        referrals: s.referrals.map((r) => (r.id === referralId ? { ...r, status: "closed", outcomeId: outcome.id, closedAt: now() } : r)),
      }));
      return { providerId: ref.providerId, before, after };
    },
    closeReferral(referralId, status) {
      setState((s) => ({
        ...s,
        referrals: s.referrals.map((r) => (r.id === referralId ? { ...r, status, closedAt: now() } : r)),
      }));
    },
    makeDue(referralId) {
      setState((s) => ({
        ...s,
        referrals: s.referrals.map((r) => (r.id === referralId ? { ...r, checkinDue: now() } : r)),
      }));
    },
    addNote(providerId, text) {
      setState((s) => ({ ...s, notes: [...s.notes, { id: id("note"), providerId, text, createdAt: now() }] }));
    },
    reset() {
      setState(seedState());
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
