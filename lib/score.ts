// Ranking is plain, auditable code. Claude never decides scores.
import { TAG_LABELS, type CareType, type NeedFilters, type Outcome, type Provider, type Tag } from "./types";

export const VERIFIED_MIN = 5;

export interface ProviderStats {
  n: number;
  completed: number;
  completion: number; // smoothed 0–1
  affirming: number | null; // 0–1, null if no respect data
  medianDays: number | null;
  verified: boolean;
  gapFlag: boolean;
  recommended: boolean;
  patterns: { tag: Exclude<Tag, "none">; count: number; text: string }[];
}

export interface Ranked {
  provider: Provider;
  stats: ProviderStats;
  fit: number;
  fitReasons: string[];
  score: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export function statsFor(outcomes: Outcome[]): ProviderStats {
  const n = outcomes.length;
  const completed = outcomes.filter((o) => o.careCompleted).length;
  const completion = (completed + 1) / (n + 2);

  const rated = outcomes.filter((o) => o.respected != null);
  const explainShare = n ? outcomes.filter((o) => o.hadToExplain).length / n : 0;
  const affirming = rated.length
    ? Math.max(0, rated.reduce((a, o) => a + (o.respected as number), 0) / rated.length / 5 - 0.2 * explainShare)
    : null;

  const counts = new Map<Exclude<Tag, "none">, number>();
  for (const o of outcomes) if (o.tag !== "none") counts.set(o.tag, (counts.get(o.tag) ?? 0) + 1);
  const patterns = [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count, text: `${count} of ${n} clients report ${TAG_LABELS[tag]}` }));

  const verified = n >= VERIFIED_MIN;
  const gapFlag = verified && affirming != null && affirming >= 0.75 && completion < 0.5;
  return {
    n,
    completed,
    completion,
    affirming,
    medianDays: median(outcomes.flatMap((o) => (o.daysToAppt != null ? [o.daysToAppt] : []))),
    verified,
    gapFlag,
    // Recommended only when BOTH dimensions are good.
    recommended: verified && !gapFlag && completion >= 0.6 && (affirming ?? 0) >= 0.7,
    patterns,
  };
}

function fitFor(p: Provider, f: NeedFilters | null): { fit: number; reasons: string[] } {
  if (!f) return { fit: 0, reasons: [] };
  let fit = 0;
  const reasons: string[] = [];
  if (f.insurance !== "unknown" && p.insurance.includes(f.insurance)) {
    reasons.push(f.insurance === "uninsured" ? (p.slidingScale ? "free / sliding scale" : "sees uninsured") : f.insurance === "medicaid" ? "takes Medi-Cal" : "takes private insurance");
  }
  if (f.needs_evening) {
    if (p.eveningHours) { fit += 0.04; reasons.push("evening hours"); } else fit -= 0.05;
  }
  if (f.needs_transit && p.transitNote) { fit += 0.02; reasons.push(p.transitNote); }
  const lang = f.language.trim().toLowerCase();
  if (lang && lang !== "english") {
    if (p.languages.some((l) => l.toLowerCase() === lang)) { fit += 0.04; reasons.push(`${f.language} spoken`); } else fit -= 0.05;
  }
  return { fit, reasons };
}

export function rank(providers: Provider[], outcomes: Outcome[], careType: CareType, filters: NeedFilters | null): Ranked[] {
  return providers
    .filter((p) => p.careTypes.includes(careType))
    // Insurance is a hard filter; everything else adjusts fit.
    .filter((p) => !filters || filters.insurance === "unknown" || p.insurance.includes(filters.insurance))
    .map((provider) => {
      const stats = statsFor(outcomes.filter((o) => o.providerId === provider.id && o.careType === careType));
      const { fit, reasons } = fitFor(provider, filters);
      // Unverified providers rank on a neutral prior so they're neither punished nor over-praised.
      const base = stats.verified ? 0.6 * stats.completion + 0.4 * (stats.affirming ?? 0.5) : 0.5;
      return { provider, stats, fit, fitReasons: reasons, score: base + fit };
    })
    .sort((a, b) => b.score - a.score);
}

export function funderSummary(outcomes: Outcome[], providers: Provider[], careType: CareType) {
  const relevant = outcomes.filter((o) => o.careType === careType);
  const completed = relevant.filter((o) => o.careCompleted).length;
  const verified = providers.filter(
    (p) => relevant.filter((o) => o.providerId === p.id).length >= VERIFIED_MIN,
  ).length;
  return {
    referrals: relevant.length,
    completionRate: relevant.length ? completed / relevant.length : 0,
    medianDays: median(relevant.flatMap((o) => (o.daysToAppt != null && o.careCompleted ? [o.daysToAppt] : []))),
    verified,
  };
}

export type ProviderStatus = "recommended" | "flagged" | "unverified" | "mixed";

export function statusOf(s: ProviderStats): ProviderStatus {
  if (s.gapFlag) return "flagged";
  if (!s.verified) return "unverified";
  return s.recommended ? "recommended" : "mixed";
}

export const STATUS_LABEL: Record<ProviderStatus, string> = {
  recommended: "Recommended",
  flagged: "Flagged",
  unverified: "Unverified",
  mixed: "Mixed",
};

export interface AffirmingEvidence {
  n: number;
  rated: number;
  respectful: number; // rated 4–5 of 5
  explained: number; // had to explain or defend identity
  misgendered: number;
  quotes: string[];
}

const TREATMENT = /kind|respect|welcom|comfortable|felt|staff|nice|lovely|warm|rude|explain|misgender|judg|assum|dismiss|lesbian|gay|queer|date women/i;

/** The evidence behind "affirming": what clients actually reported. */
export function affirmingEvidence(outcomes: Outcome[]): AffirmingEvidence {
  const rated = outcomes.filter((o) => o.respected != null);
  const quotes = [...rated]
    .filter((o) => o.note && TREATMENT.test(o.note))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map((o) => o.note)
    .filter((q, i, arr) => arr.indexOf(q) === i)
    .slice(0, 2);
  return {
    n: outcomes.length,
    rated: rated.length,
    respectful: rated.filter((o) => (o.respected as number) >= 4).length,
    explained: outcomes.filter((o) => o.hadToExplain).length,
    misgendered: outcomes.filter((o) => o.tag === "misgendered").length,
    quotes,
  };
}
