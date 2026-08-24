"use client";

import { useEffect, useState } from "react";

/** Viewport-pinned cue so the journal is obvious before anyone thinks to scroll. */
export function HeroScrollHint() {
  const [away, setAway] = useState(false);

  useEffect(() => {
    const onScroll = () => setAway(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href="#free-resources"
      className={`hero-scroll-hint ${away ? "is-away" : ""}`}
      aria-hidden={away || undefined}
      tabIndex={away ? -1 : 0}
    >
      <span className="hero-scroll-hint-label">Eight free guides</span>
      <span className="hero-scroll-hint-chevron" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 6.25 8 10.75l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </a>
  );
}
