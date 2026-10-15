import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-none border bg-white px-3 py-2 text-sm text-[var(--color-fg)]",
        "focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] focus:outline-none",
        invalid
          ? "border-[var(--color-danger)]"
          : "border-[var(--color-border-strong)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
