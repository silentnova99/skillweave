"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "light"
  | "outlineLight"
  | "gradient";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] border border-transparent",
  gradient:
    "text-white border border-transparent bg-brand-gradient hover:opacity-90",
  secondary:
    "bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-border)] border border-[var(--color-border)]",
  outline:
    "bg-white text-[var(--color-fg)] hover:bg-[var(--color-surface)] border border-[var(--color-border-strong)]",
  ghost:
    "bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)] border border-transparent",
  danger:
    "bg-[var(--color-danger)] text-white hover:opacity-90 border border-transparent",
  light:
    "bg-white text-[var(--color-fg)] hover:bg-white/90 border border-transparent",
  outlineLight:
    "bg-transparent text-white hover:bg-white/10 border border-white/30",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      onPointerDown,
      children,
      ...props
    },
    ref,
  ) {
    function spawnRipple(event: PointerEvent<HTMLButtonElement>) {
      const el = event.currentTarget;
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ink = document.createElement("span");
      ink.className = "ripple-ink";
      ink.style.width = `${size}px`;
      ink.style.height = `${size}px`;
      ink.style.left = `${event.clientX - rect.left - size / 2}px`;
      ink.style.top = `${event.clientY - rect.top - size / 2}px`;
      el.appendChild(ink);
      window.setTimeout(() => ink.remove(), 620);
    }

    return (
      <button
        ref={ref}
        type={type}
        onPointerDown={(event) => {
          spawnRipple(event);
          onPointerDown?.(event);
        }}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-none font-semibold tracking-wide",
          "transition-[background-color,color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "hover:-translate-y-0.5 active:translate-y-0",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
