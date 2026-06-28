import type { Metadata } from "next";
import { getAllChefs, getWaitlist } from "@/lib/store";
import { AdminChefRow } from "@/components/AdminChefRow";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const chefs = await getAllChefs();
  const waitlist = await getWaitlist();
  const pending = chefs.filter((c) => !c.approved);
  const live = chefs.filter((c) => c.approved);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-stone-600 mt-1">
          Approve and verify chefs, and watch the waitlist. {live.length} live ·{" "}
          {pending.length} pending review.
        </p>
      </header>

      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Pending review</h2>
          <div className="space-y-2">
            {pending.map((c) => (
              <AdminChefRow key={c.id} chef={c} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Live chefs</h2>
        <div className="space-y-2">
          {live.map((c) => (
            <AdminChefRow key={c.id} chef={c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Waitlist ({waitlist.length})
        </h2>
        <div className="rounded-xl border border-stone-200 bg-paper divide-y divide-stone-100">
          {waitlist.map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-3 text-sm">
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  w.role === "chef" ? "bg-copper-soft text-copper" : "bg-blue-50 text-blue-700"
                }`}
              >
                {w.role}
              </span>
              <span className="font-medium">{w.name}</span>
              <span className="text-stone-500">{w.email}</span>
              <span className="ml-auto text-stone-400">{w.city}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
