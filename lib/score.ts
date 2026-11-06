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
  return {
    n,
    completed,
    completion,
    affirming,
    medianDays: median(outcomes.flatMap((o) => (o.daysToAppt != null ? [o.daysToAppt] : []))),
    verified,
    gapFlag: verified && affirming != null && affirming >= 0.75 && completion < 0.5,
    patterns,
  };
}

function fitFor(p: Provider, f: NeedFilters | null): { fit: number; reasons: string[] } {
  if (!f) return { fit: 0, reasons: [] };
  let fit = 0;
  const reasons: string[] = [];
  if (f.insurance !== "unknown") {
    if (p.insurance.includes(f.insurance)) {
      fit += 0.06;
      reasons.push(f.insurance === "uninsured" ? (p.slidingScale ? "free / sliding scale" : "sees uninsured") : `takes ${f.insurance}`);
    } else fit -= 0.15;
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
