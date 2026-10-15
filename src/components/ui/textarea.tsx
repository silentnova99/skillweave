import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-none border bg-white px-3 py-2 text-sm text-[var(--color-fg)]",
          "placeholder:text-[var(--color-fg-subtle)]",
          "focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] focus:outline-none",
          invalid
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-border-strong)]",
          className,
        )}
        {...props}
      />
    );
  },
);
