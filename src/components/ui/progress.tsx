import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div
        className="h-full rounded-full bg-[var(--color-brand)] transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
