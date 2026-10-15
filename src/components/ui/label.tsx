import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-[var(--color-fg)] mb-1.5",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-sm text-[var(--color-danger)]" role="alert">
      {children}
    </p>
  );
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-xs text-[var(--color-fg-muted)]">{children}</p>
  );
}
