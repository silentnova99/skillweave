import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-none border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-[var(--color-fg)]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-[var(--color-fg-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
