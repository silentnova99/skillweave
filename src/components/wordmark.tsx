import { cn } from "@/lib/utils";

export function Wordmark({
  onDark = false,
  className,
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 text-[17px] font-bold tracking-tight",
        className,
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-none bg-brand-gradient text-[11px] font-black text-white">
        SW
      </span>
      <span
        className={
          onDark ? "text-[var(--color-on-ink)]" : "text-[var(--color-fg)]"
        }
      >
        SkillWeave
      </span>
    </span>
  );
}
