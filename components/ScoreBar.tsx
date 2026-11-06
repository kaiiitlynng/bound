export function ScoreBar({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | null;
  detail?: string;
  tone: "affirm" | "complete" | "bad";
}) {
  const pct = value == null ? 0 : Math.round(value * 100);
  const color = tone === "bad" ? "bg-[var(--bad)]" : tone === "affirm" ? "bg-[var(--affirm)]" : "bg-[var(--complete)]";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="tabular-nums text-[var(--ink)]">{value == null ? "—" : `${pct}%`}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-[var(--track)]">
        <div className={`h-full ${color} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      {detail && <div className="mt-1 text-[11px] text-[var(--muted)]">{detail}</div>}
    </div>
  );
}
