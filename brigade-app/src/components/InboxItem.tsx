"use client";

import { useState, useTransition } from "react";
import { changeInquiryStatus } from "@/lib/actions";
import type { Inquiry, InquiryStatus } from "@/lib/types";

const STATUS_FLOW: InquiryStatus[] = [
  "new",
  "quoted",
  "booked",
  "completed",
  "declined",
];

const STATUS_STYLE: Record<InquiryStatus, string> = {
  new: "bg-copper-soft text-copper",
  quoted: "bg-blue-50 text-blue-700",
  booked: "bg-green-50 text-green-700",
  completed: "bg-stone-100 text-stone-600",
  declined: "bg-red-50 text-red-600",
};

export function InboxItem({ inquiry }: { inquiry: Inquiry }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function setStatus(status: InquiryStatus) {
    start(() => changeInquiryStatus(inquiry.id, status));
  }

  const date = new Date(inquiry.eventDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-paper">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[inquiry.status]}`}>
          {inquiry.status}
        </span>
        <span className="font-medium">{inquiry.contactName}</span>
        <span className="text-sm text-stone-500 hidden sm:inline">
          {inquiry.guests} guests · {date}
        </span>
        <span className="ml-auto text-stone-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-stone-100 p-4 space-y-3 text-sm">
          <dl className="grid grid-cols-2 gap-y-1 gap-x-4">
            <Row label="Email" value={inquiry.contactEmail} />
            <Row label="Event date" value={date} />
            <Row label="Location" value={inquiry.location} />
            <Row label="Guests" value={String(inquiry.guests)} />
            {inquiry.budget && <Row label="Budget" value={`£${inquiry.budget}`} />}
            <Row label="Source" value={inquiry.source} />
          </dl>
          {inquiry.message && (
            <p className="text-stone-700 bg-stone-50 rounded-md p-3">
              “{inquiry.message}”
            </p>
          )}
          {inquiry.quote && (
            <div className="rounded-md border border-stone-200 p-3">
              <p className="font-medium mb-1">Quote sent · £{inquiry.quote.total}</p>
              <ul className="text-stone-600">
                {inquiry.quote.lineItems.map((li) => (
                  <li key={li.label} className="flex justify-between">
                    <span>{li.label}</span>
                    <span>£{li.amount}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-stone-500 mt-1">
                Deposit £{inquiry.quote.deposit}
                {inquiry.quote.acceptedAt ? " · accepted" : " · awaiting acceptance"}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-stone-500 self-center">Move to:</span>
            {STATUS_FLOW.filter((s) => s !== inquiry.status).map((s) => (
              <button
                key={s}
                disabled={pending}
                onClick={() => setStatus(s)}
                className="text-xs rounded-md border border-stone-300 px-2.5 py-1 hover:border-copper hover:text-copper disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </>
  );
}
