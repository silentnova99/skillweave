import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "brand"
  | "teal"
  | "indigo"
  | "success"
  | "warning"
  | "danger"
  | "outline";

const tones: Record<Tone, string> = {
  neutral:
    "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)] border-transparent",
  brand:
    "bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-transparent",
  teal: "bg-[var(--color-teal-soft)] text-[var(--color-teal)] border-transparent",
  indigo: "bg-[#eeecf6] text-[var(--color-indigo)] border-transparent",
  success:
    "bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent",
  warning:
    "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent",
  danger:
    "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent",
  outline:
    "bg-white text-[var(--color-fg-muted)] border-[var(--color-border-strong)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
