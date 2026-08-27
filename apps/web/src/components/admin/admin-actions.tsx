"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-[13px] font-semibold text-[var(--brand-forest)] underline-offset-2 hover:underline disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function CopyEmails({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    await navigator.clipboard.writeText(emails.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (emails.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[13px] font-semibold text-[var(--brand-forest)] underline-offset-2 hover:underline"
    >
      {copied ? "Copied" : "Copy emails"}
    </button>
  );
}
