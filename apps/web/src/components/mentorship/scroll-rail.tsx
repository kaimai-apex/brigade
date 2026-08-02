"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroller with edge fade + page-nudge arrows.
 * Arrows hide when there is nothing left to scroll in that direction.
 */
export function ScrollRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 4;
    setEdges({
      start: !overflow || el.scrollLeft < 8,
      end: !overflow || el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  };

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro?.disconnect();
    };
  }, [children]);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div ref={ref} className="mk-rail mk-mask-x">
        {children}
      </div>
      {!edges.start && <RailArrow dir="left" onClick={() => nudge(-1)} />}
      {!edges.end && <RailArrow dir="right" onClick={() => nudge(1)} />}
    </div>
  );
}

function RailArrow({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full",
        "border border-[var(--mk-line)] bg-white shadow-[var(--mk-shadow-lift)] transition hover:scale-105 md:grid",
        dir === "left" ? "-left-3" : "-right-3",
      )}
    >
      <Icon className="size-4 text-[var(--mk-text)]" />
    </button>
  );
}
