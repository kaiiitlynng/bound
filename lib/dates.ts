const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days from today until the given date (negative = past). */
export const daysUntil = (iso: string) => Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY);

export const isDue = (iso: string) => daysUntil(iso) <= 0;

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const addWeeks = (weeks: number) => new Date(Date.now() + weeks * 7 * DAY).toISOString();

export function dueLabel(iso: string): { text: string; tone: "overdue" | "due" | "upcoming" } {
  const d = daysUntil(iso);
  if (d < 0) return { text: `Overdue ${-d}d`, tone: "overdue" };
  if (d === 0) return { text: "Today", tone: "due" };
  return { text: fmtDate(iso), tone: "upcoming" };
}
