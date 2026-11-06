export function ScoreBar({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | null;
  detail: string;
  tone: "affirm" | "complete" | "bad";
}) {
  const pct = value == null ? 0 : Math.round(value * 100);
  const color = tone === "bad" ? "bg-[var(--bad)]" : tone === "affirm" ? "bg-[var(--affirm)]" : "bg-[var(--complete)]";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--ink)]">{label}</span>
        <span className="tabular-nums text-[var(--muted)]">{value == null ? "—" : `${pct}%`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--track)]">
        <div className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-[var(--muted)]">{detail}</div>
    </div>
  );
}
