"use client";

import { useTransition } from "react";
import Link from "next/link";
import { approveChef, unapproveChef } from "@/lib/actions";
import type { ChefProfile } from "@/lib/types";

export function AdminChefRow({ chef }: { chef: ChefProfile }) {
  const [pending, start] = useTransition();
  const verified = chef.certifications.filter((c) => c.status === "verified").length;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-paper p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/c/${chef.slug}`} className="font-medium hover:text-copper">
            {chef.name}
          </Link>
          <span
            className={`text-xs rounded-full px-2 py-0.5 ${
              chef.approved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {chef.approved ? "live" : "pending"}
          </span>
        </div>
        <p className="text-sm text-stone-500 truncate">
          {chef.city} · {chef.cuisines.join(", ")} · {verified}/4 badges verified
        </p>
      </div>
      {chef.approved ? (
        <button
          disabled={pending}
          onClick={() => start(() => unapproveChef(chef.slug))}
          className="btn btn-outline px-4 py-1.5"
        >
          Unpublish
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => start(() => approveChef(chef.slug))}
          className="btn btn-primary px-4 py-1.5"
        >
          Approve &amp; publish
        </button>
      )}
    </div>
  );
}
