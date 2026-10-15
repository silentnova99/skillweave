import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  info: "border-[var(--color-border)] bg-[var(--color-brand-soft)] text-[var(--color-fg)]",
  success:
    "border-[color-mix(in_srgb,var(--color-success)_30%,white)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning:
    "border-[color-mix(in_srgb,var(--color-warning)_30%,white)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  danger:
    "border-[color-mix(in_srgb,var(--color-danger)_30%,white)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
};

export function Alert({
  tone = "info",
  title,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; title?: string }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-none border px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
      {...props}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}
