"use client";

import { useActionState } from "react";
import { joinWaitlist, type ActionResult } from "@/lib/actions";
import { CITIES } from "@/lib/seed";

export function WaitlistForm({
  role = "chef",
  cta,
}: {
  role?: "chef" | "buyer";
  cta?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    joinWaitlist,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-copper-soft border border-copper/20 p-4 text-sm">
        <p className="font-medium text-ink">You&apos;re on the list 🎉</p>
        <p className="text-stone-600 mt-1">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="role" value={role} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder={role === "chef" ? "Your name" : "Your name / org"}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <select name="city" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
        {CITIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? "Joining…" : cta ?? "Join the founding list"}
      </button>
    </form>
  );
}
