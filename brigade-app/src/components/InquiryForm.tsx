"use client";

import { useActionState } from "react";
import { submitInquiry, type ActionResult } from "@/lib/actions";

export function InquiryForm({
  chefSlug,
  chefName,
}: {
  chefSlug: string;
  chefName: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    submitInquiry,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-copper-soft border border-copper/20 p-4 text-sm text-ink">
        <p className="font-medium">Inquiry sent to {chefName}.</p>
        <p className="text-stone-600 mt-1">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="chefSlug" value={chefSlug} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your name" name="contactName" required />
        <Field label="Email" name="contactEmail" type="email" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Event date" name="eventDate" type="date" required />
        <Field label="Guests" name="guests" type="number" defaultValue="8" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Location" name="location" required />
        <Field label="Budget (optional)" name="budget" type="number" />
      </div>
      <label className="block text-sm">
        <span className="text-stone-600">Message</span>
        <textarea
          name="message"
          rows={3}
          placeholder="Tell the chef about your event, dietary needs, the vibe…"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      {state && !state.ok && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? "Sending…" : `Send inquiry to ${chefName}`}
      </button>
      <p className="text-xs text-stone-500 text-center">
        No fees, no commission — you book the chef directly.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-stone-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
