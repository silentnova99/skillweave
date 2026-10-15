import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-none border bg-white px-3 py-2 text-sm text-[var(--color-fg)]",
        "placeholder:text-[var(--color-fg-subtle)]",
        "focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] focus:outline-none",
        "disabled:bg-[var(--color-surface-2)] disabled:cursor-not-allowed",
        invalid
          ? "border-[var(--color-danger)]"
          : "border-[var(--color-border-strong)]",
        className,
      )}
      {...props}
    />
  );
});
