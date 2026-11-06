import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-md border border-[var(--line)] bg-[var(--card)] p-5 ${className}`}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="text-[13px] font-semibold text-[var(--ink)]">{children}</h2>;
}

export function Segmented<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            disabled={o.disabled}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`rounded border px-2.5 py-1 text-[13px] transition-colors ${
              on
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--card)]"
                : "border-[var(--line)] text-[var(--ink)] hover:bg-[var(--subtle)]"
            } disabled:cursor-not-allowed disabled:text-[var(--muted)] disabled:opacity-50 disabled:hover:bg-transparent`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] text-[var(--muted)]">{label}</div>
      {children}
    </div>
  );
}

const TONES = {
  good: "bg-[var(--complete)]/12 text-[var(--complete-ink)]",
  bad: "bg-[var(--bad)]/12 text-[var(--bad-ink)]",
  warn: "bg-[var(--warn)]/15 text-[var(--warn-ink)]",
  neutral: "bg-[var(--chip)] text-[var(--muted)]",
  affirm: "bg-[var(--affirm)]/15 text-[var(--affirm-ink)]",
} as const;

export function Pill({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] ${TONES[tone]}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-[var(--ink)] text-[var(--card)] hover:opacity-85",
    secondary: "border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--subtle)]",
    ghost: "text-[var(--muted)] hover:text-[var(--ink)]",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-3 py-1.5 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export const inputCls =
  "w-full rounded border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--muted)]";
