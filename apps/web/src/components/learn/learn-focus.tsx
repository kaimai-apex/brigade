"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Scrolls to the roadmap when signup sent `?focus=roadmap`. */
export function LearnFocus() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("focus") !== "roadmap") return;
    const node = document.getElementById("roadmap");
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams]);

  return null;
}
