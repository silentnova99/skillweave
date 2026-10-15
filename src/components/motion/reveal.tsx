"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "left" | "right" | "scale";

export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      data-reveal={variant === "up" ? "" : variant}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      className={cn(visible && "is-visible", className)}
    >
      {children}
    </div>
  );
}
